const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('⚠️ Warning: STRIPE_SECRET_KEY is not defined in environment variables or backend/.env');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

/**
 * Serverless handler to create a Stripe Checkout Session
 */
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!stripe) {
    return res.status(500).json({
      error: 'Stripe is not configured. Missing STRIPE_SECRET_KEY in server environment.'
    });
  }

  try {
    const { items, appliedDiscount, couponCode } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Please add items to checkout.' });
    }

    // Determine site origin and base path for redirects
    let origin = 'https://glyphere.com';
    let basePrefix = '';
    if (req.headers.origin) {
      origin = req.headers.origin;
    }
    if (req.headers.referer) {
      try {
        const refUrl = new URL(req.headers.referer);
        if (!req.headers.origin) origin = refUrl.origin;
        if (refUrl.pathname.startsWith('/main-website')) {
          basePrefix = '/main-website';
        }
      } catch (e) {}
    }

    // Build Stripe line items
    const line_items = items.map(item => {
      const rawName = item.name || 'Glyphere Typeface';
      // Clean up any duplicated license strings in the title
      const cleanName = rawName.replace(/(\s*\((Desktop|Web|Commercial)(\s+License)?\))+/gi, '').trim();
      const license = item.license || 'Desktop';
      const unitAmount = Math.max(50, Math.round(Number(item.price || 0) * 100)); // Minimum $0.50 in cents

      const productData = {
        name: `${cleanName} — ${license.includes('License') ? license : license + ' License'}`,
        description: `Glyphere Bespoke Digital Typeface license with immediate commercial authorization (${license}).`,
        metadata: {
          fontId: String(item.id || ''),
          fontName: cleanName,
          license: license,
        }
      };

      if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
        productData.images = [item.image];
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: productData,
          unit_amount: unitAmount,
        },
        quantity: Math.max(1, parseInt(item.qty || 1, 10)),
      };
    });

    // Create session parameters
    const sessionParams = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${origin}${basePrefix}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${basePrefix}/cart.html`,
      metadata: {
        itemCount: String(items.length),
        couponUsed: couponCode || 'NONE',
        fonts: items.map(i => `${i.name} (${i.license || 'Desktop'})`).slice(0, 5).join(', '),
      },
    };

    // Apply coupon if user used GLYPH20 or GOLD10 in cart
    if (appliedDiscount && Number(appliedDiscount) > 0) {
      const percentOff = Math.min(100, Math.round(Number(appliedDiscount) * 100));
      const coupon = await stripe.coupons.create({
        name: couponCode ? `Coupon (${couponCode})` : `${percentOff}% Cart Discount`,
        percent_off: percentOff,
        duration: 'once',
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    } else {
      // Allow customer to input promo code directly on Stripe checkout page
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id
    });
  } catch (err) {
    console.error('Error creating Stripe checkout session:', err);
    return res.status(500).json({
      error: err.message || 'Failed to initialize checkout session.'
    });
  }
};
