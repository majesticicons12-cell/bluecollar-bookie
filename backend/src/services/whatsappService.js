const axios = require('axios');

const META_VERSION = 'v18.0';
const PHONE_ID = process.env.META_WHATSAPP_PHONE_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const BASE_URL = `https://graph.facebook.com/${META_VERSION}/${PHONE_ID}/messages`;

async function sendWhatsAppMessage(to, body) {
  try {
    const cleanNumber = to.replace(/[^0-9]/g, '');
    if (!cleanNumber.startsWith('1')) {
      const prepared = '1' + cleanNumber.replace(/^1/, '');
    }

    const response = await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanNumber,
        type: 'text',
        text: { body }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('WhatsApp sent to:', cleanNumber);
    return response.data;
  } catch (error) {
    console.error('WhatsApp Error:', error.response?.data || error.message);
    throw error;
  }
}

async function sendTemplateMessage(to, templateName, params = {}) {
  try {
    const cleanNumber = to.replace(/[^0-9]/g, '');

    const components = [{
      type: 'body',
      parameters: Object.entries(params).map(([key, value]) => ({
        type: 'text',
        text: value
      }))
    }];

    const response = await axios.post(
      BASE_URL,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanNumber,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Template Error:', error.response?.data || error.message);
    throw error;
  }
}

function verifyWebhook(req) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return { verified: true, challenge };
  }
  return { verified: false };
}

module.exports = { sendWhatsAppMessage, sendTemplateMessage, verifyWebhook };
