const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Stripe = require('stripe');

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
    .replace(/—.*$/, '') // remove license suffix like ' — Desktop License'
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Serverless handler for secure font downloads
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { session_id, font, all } = req.query || {};

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id parameter.' });
  }

  const packagesDir = getPackagesDir();
  const manifestPath = path.join(packagesDir, 'manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e) {}
  }

  let authorizedFonts = [];
  let isDemoSession = (session_id === 'demo' || session_id === 'test');

  if (isDemoSession) {
    // For local testing & UI preview
    authorizedFonts = Object.keys(manifest);
  } else {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe configuration missing on server.' });
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items']
      });

      if (session.payment_status !== 'paid') {
        return res.status(403).json({
          error: 'Payment not completed for this session.',
          payment_status: session.payment_status
        });
      }

      const lineItems = session.line_items?.data || [];
      authorizedFonts = lineItems.map(li => slugify(li.description));
    } catch (err) {
      console.error('Stripe verification failed in download-font:', err);
      return res.status(403).json({ error: 'Invalid or expired checkout session.' });
    }
  }

  // Handle "Download All" request
  if (all === '1' || font === 'all') {
    if (authorizedFonts.length === 1) {
      // Single item: serve that directly
      const targetSlug = matchSlug(authorizedFonts[0], manifest);
      if (targetSlug && manifest[targetSlug]) {
        return streamZipFile(res, path.join(packagesDir, manifest[targetSlug].zipName), `${targetSlug}-glyphere-package.zip`);
      }
    }

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

      return streamZipFile(res, bundleZipPath, bundleName, true);
    } catch (err) {
      console.error('Bundle creation error:', err);
      return res.status(500).json({ error: 'Failed to create bundle archive.' });
    }
  }

  // Single font download
  const requestedSlug = slugify(font);
  const matchedSlug = matchSlug(requestedSlug, manifest);

  if (!matchedSlug || !manifest[matchedSlug]) {
    return res.status(404).json({ error: `Font package for '${font}' not found.` });
  }

  // Verify that the requested font was paid for in this session
  if (!isDemoSession) {
    const isAuthorized = authorizedFonts.some(af => af === matchedSlug || matchedSlug.includes(af) || af.includes(matchedSlug));
    if (!isAuthorized) {
      return res.status(403).json({ error: `Font '${font}' was not included in this checkout session.` });
    }
  }

  const zipFile = path.join(packagesDir, manifest[matchedSlug].zipName);
  if (!fs.existsSync(zipFile)) {
    return res.status(404).json({ error: 'Font package archive file missing on server.' });
  }

  const downloadFilename = `${manifest[matchedSlug].displayName.replace(/\s+/g, '_')}_Glyphere_Package.zip`;
  return streamZipFile(res, zipFile, downloadFilename);
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
    'Cache-Control': 'no-store, no-cache, must-revalidate',
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
