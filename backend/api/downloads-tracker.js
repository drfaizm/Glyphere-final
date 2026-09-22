const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_DOWNLOADS = parseInt(process.env.MAX_DOWNLOADS || '3', 10);
const EXPIRY_HOURS = parseInt(process.env.DOWNLOAD_EXPIRY_HOURS || '24', 10);
const INITIAL_GRACE_PERIOD_SECONDS = parseInt(process.env.INITIAL_GRACE_PERIOD_SECONDS || (EXPIRY_HOURS * 3600).toString(), 10); // 3 minutes after creation for initial landing redirect

function getRegistryPath() {
  const dirs = [
    path.resolve(__dirname, '..', 'data'),
    path.resolve(process.cwd(), 'backend', 'data'),
    path.resolve(process.cwd(), 'data'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
    }
    if (fs.existsSync(d)) {
      return path.join(d, 'downloads_registry.json');
    }
  }
  return path.resolve(__dirname, '..', 'data', 'downloads_registry.json');
}

function readRegistry() {
  const regPath = getRegistryPath();
  if (!fs.existsSync(regPath)) return {};
  try {
    const raw = fs.readFileSync(regPath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    console.error('Error reading downloads registry:', e);
    return {};
  }
}

function writeRegistry(data) {
  const regPath = getRegistryPath();
  try {
    const dir = path.dirname(regPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(regPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing downloads registry:', e);
  }
}

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '***@***.com';
  }
  const [local, domain] = email.split('@');
  let maskedLocal = local;
  if (local.length <= 2) {
    maskedLocal = local[0] + '*';
  } else {
    maskedLocal = local[0] + '*'.repeat(Math.min(5, local.length - 2)) + local[local.length - 1];
  }

  const domainParts = domain.split('.');
  const maskedDomainName = domainParts[0].length <= 2
    ? domainParts[0][0] + '*'
    : domainParts[0][0] + '***' + (domainParts[0].length > 4 ? domainParts[0].slice(-1) : '');
  const tld = domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomainName}.${tld}`;
}

/**
 * Retrieve or initialize download tracker record for a verified Stripe checkout session
 */
function getOrInitSession(sessionId, sessionData = {}) {
  const registry = readRegistry();
  const now = Math.floor(Date.now() / 1000);

  if (!registry[sessionId]) {
    const createdSec = sessionData.created || now;
    const customerEmail = (
      sessionData.customer_details?.email ||
      sessionData.customer_email ||
      ''
    ).toLowerCase().trim();

    registry[sessionId] = {
      sessionId,
      createdAt: createdSec,
      expiresAt: createdSec + (EXPIRY_HOURS * 3600),
      customerEmail,
      downloadCount: 0,
      maxDownloads: MAX_DOWNLOADS,
      token: crypto.randomBytes(32).toString('hex'),
      downloads: [],
      verifiedEmails: customerEmail ? [customerEmail] : []
    };
    writeRegistry(registry);
  } else {
    // If customerEmail was missing initially, update it
    const email = (
      sessionData.customer_details?.email ||
      sessionData.customer_email ||
      ''
    ).toLowerCase().trim();
    if (email && !registry[sessionId].customerEmail) {
      registry[sessionId].customerEmail = email;
      writeRegistry(registry);
    }
  }

  return registry[sessionId];
}

/**
 * Verify user access to order downloads
 */
function verifySessionAccess(sessionId, providedToken, verifyEmail, sessionData = {}) {
  const record = getOrInitSession(sessionId, sessionData);
  const now = Math.floor(Date.now() / 1000);

  const isExpired = now > record.expiresAt;
  const isExhausted = record.downloadCount >= record.maxDownloads;
  const downloadsRemaining = Math.max(0, record.maxDownloads - record.downloadCount);
  const maskedEmail = maskEmail(record.customerEmail);

  if (isExpired) {
    return {
      authorized: false,
      isExpired: true,
      isExhausted,
      downloadsRemaining: 0,
      maxDownloads: record.maxDownloads,
      expiresAt: record.expiresAt,
      maskedEmail,
      error: 'This download link has expired (valid for 24 hours after purchase).'
    };
  }

  // Check 1: Valid token provided
  if (providedToken && providedToken === record.token) {
    return {
      authorized: true,
      isExpired: false,
      isExhausted,
      downloadsRemaining,
      maxDownloads: record.maxDownloads,
      expiresAt: record.expiresAt,
      maskedEmail,
      token: record.token
    };
  }

  // Check 2: Email verification attempted
  if (verifyEmail) {
    const normalizedInput = verifyEmail.toLowerCase().trim();
    if (record.customerEmail && normalizedInput === record.customerEmail) {
      return {
        authorized: true,
        isExpired: false,
        isExhausted,
        downloadsRemaining,
        maxDownloads: record.maxDownloads,
        expiresAt: record.expiresAt,
        maskedEmail,
        token: record.token,
        message: 'Device verified successfully.'
      };
    } else {
      return {
        authorized: false,
        isLocked: true,
        isExpired: false,
        isExhausted,
        downloadsRemaining,
        maxDownloads: record.maxDownloads,
        expiresAt: record.expiresAt,
        maskedEmail,
        error: 'The email address entered does not match the purchaser records for this order.'
      };
    }
  }

  // Check 3: Direct authorized access for verified paid Stripe session within 24 hours
  const isPaidSession = (sessionData.payment_status === 'paid');
  if (isPaidSession) {
    return {
      authorized: true,
      isInitialLanding: true,
      isExpired: false,
      isExhausted,
      downloadsRemaining,
      maxDownloads: record.maxDownloads,
      expiresAt: record.expiresAt,
      maskedEmail,
      token: record.token
    };
  }

  // Check 4: Initial direct landing grace period
  const isInitialLanding = (now - record.createdAt) <= INITIAL_GRACE_PERIOD_SECONDS;
  if (isInitialLanding) {
    return {
      authorized: true,
      isInitialLanding: true,
      isExpired: false,
      isExhausted,
      downloadsRemaining,
      maxDownloads: record.maxDownloads,
      expiresAt: record.expiresAt,
      maskedEmail,
      token: record.token
    };
  }

  // Otherwise: Lock access and request purchaser email confirmation
  return {
    authorized: false,
    isLocked: true,
    isExpired: false,
    isExhausted,
    downloadsRemaining,
    maxDownloads: record.maxDownloads,
    expiresAt: record.expiresAt,
    maskedEmail,
    error: 'Security verification required: please confirm your billing email to unlock downloads on this device.'
  };
}

/**
 * Record a downloaded font package
 */
function recordDownload(sessionId, providedToken, fontSlug, clientIp = '') {
  const registry = readRegistry();
  const record = registry[sessionId];
  const now = Math.floor(Date.now() / 1000);

  if (!record) {
    return { allowed: false, status: 404, error: 'Order session not found in registry.' };
  }

  if (now > record.expiresAt) {
    return { allowed: false, status: 403, error: 'This download link expired 24 hours after purchase.' };
  }

  if (record.token && (!providedToken || providedToken !== record.token)) {
    return { allowed: false, status: 403, error: 'Unauthorized download request. Invalid or missing security token.' };
  }

  if (record.downloadCount >= record.maxDownloads) {
    return {
      allowed: false,
      status: 403,
      error: `Download limit reached. You have completed the maximum allowed ${record.maxDownloads} downloads for this purchase.`
    };
  }

  record.downloadCount += 1;
  record.downloads.push({
    font: fontSlug,
    time: now,
    ip: clientIp || ''
  });

  writeRegistry(registry);

  return {
    allowed: true,
    downloadCount: record.downloadCount,
    maxDownloads: record.maxDownloads,
    downloadsRemaining: Math.max(0, record.maxDownloads - record.downloadCount)
  };
}

module.exports = {
  MAX_DOWNLOADS,
  EXPIRY_HOURS,
  maskEmail,
  getOrInitSession,
  verifySessionAccess,
  recordDownload,
};
