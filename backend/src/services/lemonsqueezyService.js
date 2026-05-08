const axios = require('axios');

const API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const BASE_URL = 'https://api.lemonsqueezy.com/v1';

const PRODUCTS = {
  basic: process.env.LEMONSQUEEZY_PRODUCT_BASIC_ID,
  pro: process.env.LEMONSQUEEZY_PRODUCT_PRO_ID,
  premium: process.env.LEMONSQUEEZY_PRODUCT_PREMIUM_ID
};

async function createCheckout(plan, userEmail, userId) {
  try {
    const variantId = PRODUCTS[plan];
    if (!variantId) throw new Error(`Unknown plan: ${plan}`);

    const response = await axios.post(
      `${BASE_URL}/checkouts`,
      {
        data: {
          type: 'checkouts',
          attributes: {
            store_id: parseInt(STORE_ID),
            variant_id: parseInt(variantId),
            custom_price: null,
            product_options: {
              enabled_variants: [parseInt(variantId)]
            },
            checkout_data: {
              email: userEmail,
              custom: {
                user_id: String(userId),
                plan
              }
            },
            expires_at: null,
            preview: false,
            test_mode: false
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    const checkoutUrl = response.data.data.attributes.url;
    return { url: checkoutUrl, id: response.data.data.id };
  } catch (error) {
    console.error('Lemon Squeezy Error:', error.response?.data || error.message);
    throw error;
  }
}

function verifyWebhookSignature(payload, signature) {
  try {
    const crypto = require('crypto');
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret || secret === 'placeholder') {
      return true;
    }
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(JSON.stringify(payload)).digest('hex');
    return digest === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

function parseWebhookEvent(payload) {
  const eventName = payload.meta?.event_name;
  const customData = payload.meta?.custom_data || {};
  const attributes = payload.data?.attributes || {};

  return {
    event: eventName,
    userId: customData.user_id,
    plan: customData.plan,
    email: attributes.user_email || payload.data?.attributes?.customer_email,
    subscriptionId: String(payload.data?.id || ''),
    status: attributes.status,
    variantId: attributes.variant_id,
    productId: attributes.product_id
  };
}

module.exports = { createCheckout, verifyWebhookSignature, parseWebhookEvent };
