const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Stripe = require('stripe');
const { verifySessionAccess, maskEmail, MAX_DOWNLOADS, EXPIRY_HOURS } = require('./downloads-tracker');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

/**
 * Serverless handler to retrieve Stripe Checkout Session details with access limitations
 */
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Order-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const queryParams = req.query || {};
  const bodyParams = req.body || {};

  const sessionId = queryParams.session_id || bodyParams.session_id;
  const token = queryParams.token || bodyParams.token || req.headers['x-order-token'] || '';
  const verifyEmail = queryParams.verify_email || bodyParams.verify_email || '';

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id parameter.' });
  }

  // Handle local demo/test preview WITHOUT providing real download access
  if (sessionId === 'demo' || sessionId === 'test') {
    return res.status(200).json({
      id: 'demo',
      is_demo: true,
      is_locked: false,
      is_expired: false,
      is_exhausted: false,
      customer_email: 'demo@glyphere.com',
      customer_name: 'Glyphere Previewer',
      amount_total: '120.00',
      currency: 'USD',
      payment_status: 'paid',
      downloads_remaining: 3,
      max_downloads: 3,
      expires_at: Math.floor(Date.now() / 1000) + (24 * 3600),
      items: [
        {
          description: 'Midnight Citadel — Desktop License',
          font_name: 'Midnight Citadel',
          license_type: 'Desktop License',
          font_slug: 'midnight-citadel',
          download_url: null, // Disabled in demo
          amount_total: '60.00',
          quantity: 1
        },
        {
          description: 'Turbo Block — Desktop + Web License',
          font_name: 'Turbo Block',
          license_type: 'Desktop + Web License',
          font_slug: 'turbo-block',
          download_url: null, // Disabled in demo
          amount_total: '60.00',
          quantity: 1
        }
      ],
      download_all_url: null, // Disabled in demo
      created: Math.floor(Date.now() / 1000)
    });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe configuration missing on server.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer_details']
    });

    if (!session || !session.id) {
      return res.status(404).json({ error: 'Order session not found.' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(403).json({
        error: 'Payment has not been completed for this checkout session.',
        payment_status: session.payment_status
      });
    }

    // Verify session access & quota
    const authResult = verifySessionAccess(sessionId, token, verifyEmail, session);

    // If session is expired
    if (authResult.isExpired) {
      return res.status(200).json({
        id: session.id,
        is_expired: true,
        is_locked: false,
        is_exhausted: authResult.isExhausted,
        downloads_remaining: 0,
        max_downloads: authResult.maxDownloads,
        expires_at: authResult.expiresAt,
        error: authResult.error || 'This download link expired 24 hours after purchase.'
      });
    }

    // If access is locked (new device / unrecognized visitor without token)
    if (!authResult.authorized || authResult.isLocked) {
      return res.status(200).json({
        id: session.id,
        is_locked: true,
        is_expired: false,
        is_exhausted: authResult.isExhausted,
        masked_email: authResult.maskedEmail,
        customer_name: 'Valued Typographer',
        amount_total: (session.amount_total / 100).toFixed(2),
        currency: (session.currency || 'usd').toUpperCase(),
        payment_status: session.payment_status,
        downloads_remaining: authResult.downloadsRemaining,
        max_downloads: authResult.maxDownloads,
        expires_at: authResult.expiresAt,
        error: authResult.error || 'Security verification required: please confirm the purchaser billing email to unlock downloads on this device.'
      });
    }

    // Authorized access: Generate secure, signed download URLs with token
    let items = (session.line_items?.data || []).map(li => {
      const desc = li.description || li.price?.product?.name || li.price?.nickname || 'Typeface License';
      const parts = desc.split(/\s*[\u2014\u2013\-]\s*/);
      const fontName = parts[0] ? parts[0].trim() : desc;
      let license = parts[1] ? parts[1].trim() : 'Commercial Authorization';
      if (!license.toLowerCase().includes('license') && !license.toLowerCase().includes('authorization')) {
        license += ' License';
      }
      const fontSlug = fontName
        .toLowerCase()
        .replace(/^\d+[\.\s]+/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      return {
        description: desc,
        font_name: fontName,
        license_type: license,
        font_slug: fontSlug,
        download_url: `/api/download-font?session_id=${session.id}&font=${encodeURIComponent(fontSlug)}&token=${encodeURIComponent(authResult.token)}`,
        amount_total: ((li.amount_total || 0) / 100).toFixed(2),
        quantity: li.quantity || 1,
      };
    });

    if (items.length === 0) {
      const fallbackName = session.metadata?.fontName || session.metadata?.product_name || 'Glyphere Typeface';
      const fallbackSlug = fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      items.push({
        description: `${fallbackName} — Commercial License`,
        font_name: fallbackName,
        license_type: 'Commercial License',
        font_slug: fallbackSlug || 'glyphere-typeface',
        download_url: `/api/download-font?session_id=${session.id}&font=${encodeURIComponent(fallbackSlug || 'glyphere-typeface')}&token=${encodeURIComponent(authResult.token)}`,
        amount_total: ((session.amount_total || 0) / 100).toFixed(2),
        quantity: 1,
      });
    }

    return res.status(200).json({
      id: session.id,
      is_locked: false,
      is_expired: false,
      is_exhausted: authResult.isExhausted,
      token: authResult.token,
      customer_email: session.customer_details?.email || session.customer_email || 'Customer',
      customer_name: session.customer_details?.name || 'Valued Typographer',
      amount_total: (session.amount_total / 100).toFixed(2),
      currency: (session.currency || 'usd').toUpperCase(),
      payment_status: session.payment_status,
      downloads_remaining: authResult.downloadsRemaining,
      max_downloads: authResult.maxDownloads,
      expires_at: authResult.expiresAt,
      items,
      download_all_url: `/api/download-font?session_id=${session.id}&all=1&token=${encodeURIComponent(authResult.token)}`,
      created: session.created,
    });
  } catch (err) {
    console.error('Error retrieving Stripe session:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve session.' });
  }
};
