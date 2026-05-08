const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { createCheckout, verifyWebhookSignature, parseWebhookEvent } = require('../services/lemonsqueezyService');
const { buyTwilioNumber } = require('../services/twilioService');
const supabase = require('../config/database');

router.post('/create-checkout', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { url } = await createCheckout(plan, user.email, req.user.id);
    res.json({ url });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const payload = req.body;

    if (!verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = parseWebhookEvent(payload);
    console.log('Lemon Squeezy event:', event.event, 'user:', event.userId);

    switch (event.event) {
      case 'order_created':
      case 'subscription_created': {
        if (event.userId) {
          await supabase
            .from('users')
            .update({
              plan: event.plan,
              subscription_status: 'active',
              lemon_squeezy_subscription_id: event.subscriptionId
            })
            .eq('id', event.userId);

          const { data: user } = await supabase
            .from('users')
            .select('business_name, twilio_number_assigned')
            .eq('id', event.userId)
            .single();

          if (user && !user.twilio_number_assigned) {
            const purchasedNumber = await buyTwilioNumber(
              '212',
              user.business_name || 'Business'
            );
            if (purchasedNumber) {
              await supabase
                .from('users')
                .update({
                  twilio_number: purchasedNumber,
                  twilio_number_assigned: true,
                  setup_status: 'needs_forwarding'
                })
                .eq('id', event.userId);
            }
          }
        }
        break;
      }

      case 'subscription_updated':
      case 'subscription_cancelled':
        if (event.userId) {
          await supabase
            .from('users')
            .update({
              subscription_status: event.status === 'cancelled' ? 'cancelled' : event.status
            })
            .eq('id', event.userId);
        }
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ received: true });
  }
});

module.exports = router;
