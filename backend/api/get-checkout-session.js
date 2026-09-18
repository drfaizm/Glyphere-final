const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

/**
 * Serverless handler to retrieve Stripe Checkout Session details
 */
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured on server.' });
  }

  const { session_id } = req.query || {};
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id parameter.' });
  }

  // Handle local demo/test preview without hitting Stripe API
  if (session_id === 'demo' || session_id === 'test') {
    return res.status(200).json({
      id: 'demo',
      customer_email: 'customer@glyphere.com',
      customer_name: 'Valued Typographer',
      amount_total: '120.00',
      currency: 'USD',
      payment_status: 'paid',
      items: [
        {
          description: 'Midnight Citadel — Desktop License',
          font_name: 'Midnight Citadel',
          license_type: 'Desktop License',
          font_slug: 'midnight-citadel',
          download_url: '/api/download-font?session_id=demo&font=midnight-citadel',
          amount_total: '60.00',
          quantity: 1
        },
        {
          description: 'Turbo Block — Desktop + Web License',
          font_name: 'Turbo Block',
          license_type: 'Desktop + Web License',
          font_slug: 'turbo-block',
          download_url: '/api/download-font?session_id=demo&font=turbo-block',
          amount_total: '60.00',
          quantity: 1
        }
      ],
      download_all_url: '/api/download-font?session_id=demo&all=1',
      created: Math.floor(Date.now() / 1000)
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'customer_details']
    });

    const items = (session.line_items?.data || []).map(li => {
      const desc = li.description || 'Typeface License';
      const parts = desc.split('—');
      const fontName = parts[0] ? parts[0].trim() : desc;
      const license = parts[1] ? parts[1].trim() : 'Commercial Authorization';
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
        download_url: `/api/download-font?session_id=${session.id}&font=${encodeURIComponent(fontSlug)}`,
        amount_total: (li.amount_total / 100).toFixed(2),
        quantity: li.quantity,
      };
    });

    return res.status(200).json({
      id: session.id,
      customer_email: session.customer_details?.email || session.customer_email || 'Customer',
      customer_name: session.customer_details?.name || 'Valued Typographer',
      amount_total: (session.amount_total / 100).toFixed(2),
      currency: (session.currency || 'usd').toUpperCase(),
      payment_status: session.payment_status,
      items,
      download_all_url: `/api/download-font?session_id=${session.id}&all=1`,
      created: session.created,
    });
  } catch (err) {
    console.error('Error retrieving Stripe session:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve session.' });
  }
};
