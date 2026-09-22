const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Stripe = require('stripe');
const { recordDownload, getOrInitSession } = require('./downloads-tracker');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Helper to resolve packages directory inside backend/commercial-vault/packages
function getPackagesDir() {
  const dirs = [
    path.resolve(__dirname, '..', 'commercial-vault', 'packages'),
    path.resolve(__dirname, '..', '..', 'commercial-vault', 'packages'),
    path.resolve(process.cwd(), 'backend', 'commercial-vault', 'packages'),
    path.resolve(process.cwd(), 'commercial-vault', 'packages'),
  ];
  for (const d of dirs) {
    if (fs.existsSync(d)) return d;
  }
  return dirs[0];
}

// Helper to normalize font names to slugs
function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/^\d+[\.\s]+/, '')
    .replace(/\s*[\u2014\u2013\-]\s*(Commercial|Desktop|Web|App|Studio|License).*$/i, '')
    .replace(/\s*[\u2014\u2013\-].*$/, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Serverless handler for secure font downloads with hard download limits & token security
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Order-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { session_id, font, all, token } = req.query || {};
  const providedToken = token || req.headers['x-order-token'] || '';
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id parameter.' });
  }

  // Strictly block demo/test from downloading real commercial font packages
  if (session_id === 'demo' || session_id === 'test') {
    return res.status(403).json({
      error: 'Demo font downloads are disabled. A verified commercial license purchase is required.'
    });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe configuration missing on server.' });
  }

  const packagesDir = getPackagesDir();
  const manifestPath = path.join(packagesDir, 'manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e) {}
  }

  let session;
  let authorizedFonts = [];

  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'customer_details']
    });

    if (!session || !session.id) {
      return res.status(404).json({ error: 'Order session not found.' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(403).json({
        error: 'Payment not completed for this session.',
        payment_status: session.payment_status
      });
    }

    const lineItems = session.line_items?.data || [];
    authorizedFonts = lineItems.map(li => slugify(li.description || li.price?.product?.name || li.price?.nickname || ''));
    if (authorizedFonts.length === 0 && session.metadata) {
      const fallback = session.metadata.fontName || session.metadata.product_name || '';
      if (fallback) authorizedFonts.push(slugify(fallback));
    }
  } catch (err) {
    console.error('Stripe verification failed in download-font:', err);
    return res.status(403).json({ error: 'Invalid or expired checkout session.' });
  }

  // Initialize/ensure session is tracked
  getOrInitSession(session_id, session);

  // Validate Font / Request Authorization BEFORE burning a download attempt
  const isDownloadAll = (all === '1' || font === 'all');
  let targetZipFile = null;
  let targetDownloadFilename = null;
  let autoDelete = false;

  if (isDownloadAll) {
    if (authorizedFonts.length === 1) {
      const targetSlug = matchSlug(authorizedFonts[0], manifest);
      if (targetSlug && manifest[targetSlug]) {
        targetZipFile = path.join(packagesDir, manifest[targetSlug].zipName);
        targetDownloadFilename = `${targetSlug}-glyphere-package.zip`;
      }
    } else {
      // Multiple items: bundle into a master archive
      try {
        const bundleName = `Glyphere_Order_${session_id.slice(-8)}.zip`;
        const tempBundleDir = path.join(packagesDir, `temp_bundle_${Date.now()}`);
        fs.mkdirSync(tempBundleDir, { recursive: true });

        const filesToBundle = [];
        for (const authFont of authorizedFonts) {
          const matched = matchSlug(authFont, manifest);
          if (matched && manifest[matched]) {
            const srcZip = path.join(packagesDir, manifest[matched].zipName);
            if (fs.existsSync(srcZip)) {
              const destZip = path.join(tempBundleDir, manifest[matched].zipName);
              fs.copyFileSync(srcZip, destZip);
              filesToBundle.push(manifest[matched].zipName);
            }
          }
        }

        if (filesToBundle.length === 0) {
          fs.rmSync(tempBundleDir, { recursive: true, force: true });
          return res.status(404).json({ error: 'No font packages found for this order.' });
        }

        const bundleZipPath = path.join(packagesDir, bundleName);
        if (fs.existsSync(bundleZipPath)) fs.unlinkSync(bundleZipPath);

        execSync(`cd "${tempBundleDir}" && zip -q -r "${bundleZipPath}" ./*`);
        fs.rmSync(tempBundleDir, { recursive: true, force: true });

        targetZipFile = bundleZipPath;
        targetDownloadFilename = bundleName;
        autoDelete = true;
      } catch (err) {
        console.error('Bundle creation error:', err);
        return res.status(500).json({ error: 'Failed to create bundle archive.' });
      }
    }
  } else {
    // Single font download
    const requestedSlug = slugify(font);
    const matchedSlug = matchSlug(requestedSlug, manifest);

    if (!matchedSlug || !manifest[matchedSlug]) {
      return res.status(404).json({ error: `Font package for '${font}' not found.` });
    }

    const isAuthorized = authorizedFonts.some(af => af === matchedSlug || matchedSlug.includes(af) || af.includes(matchedSlug));
    if (!isAuthorized) {
      return res.status(403).json({ error: `Font '${font}' was not included in this checkout session.` });
    }

    const zipFile = path.join(packagesDir, manifest[matchedSlug].zipName);
    if (!fs.existsSync(zipFile)) {
      return res.status(404).json({ error: 'Font package archive file missing on server.' });
    }

    targetZipFile = zipFile;
    targetDownloadFilename = `${manifest[matchedSlug].displayName.replace(/\s+/g, '_')}_Glyphere_Package.zip`;
  }

  if (!targetZipFile || !fs.existsSync(targetZipFile)) {
    return res.status(404).json({ error: 'Requested font archive is unavailable.' });
  }

  // Check Download Quota & Token, and Record Download
  const downloadResult = recordDownload(session_id, providedToken, isDownloadAll ? 'ALL_FONTS' : font, clientIp);
  if (!downloadResult.allowed) {
    if (autoDelete && fs.existsSync(targetZipFile)) {
      try { fs.unlinkSync(targetZipFile); } catch (e) {}
    }
    return res.status(downloadResult.status || 403).json({
      error: downloadResult.error,
      limit_reached: downloadResult.status === 403 && downloadResult.error.includes('limit reached')
    });
  }

  // Stream ZIP file
  res.setHeader('X-Downloads-Remaining', String(downloadResult.downloadsRemaining));
  return streamZipFile(res, targetZipFile, targetDownloadFilename, autoDelete);
};

// Helper to match requested slug against manifest keys
function matchSlug(slug, manifest) {
  if (manifest[slug]) return slug;
  const clean = slug.replace(/[^a-z0-9]/g, '');
  for (const key of Object.keys(manifest)) {
    const keyClean = key.replace(/[^a-z0-9]/g, '');
    if (keyClean === clean || keyClean.includes(clean) || clean.includes(keyClean)) {
      return key;
    }
  }
  return null;
}

// Stream zip file with appropriate headers
function streamZipFile(res, filePath, filename, autoDelete = false) {
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('end', () => {
    if (autoDelete) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  });
}
