const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { createSubscription, handleWebhook } = require('../services/stripeService');
const { buyTwilioNumber } = require('../services/twilioService');
const supabase = require('../config/database');

router.post('/create-subscription', authenticate, async (req, res) => {
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

    const { sessionId, url } = await createSubscription(user.email, plan, req.user.id);
    res.json({ sessionId, url });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = await handleWebhook(req.body, sig);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const areaCode = session.metadata.areaCode || '212';

      const { data: user } = await supabase
        .from('users')
        .select('business_name, twilio_number_assigned')
        .eq('id', userId)
        .single();

      if (user && !user.twilio_number_assigned) {
        const businessName = user.business_name || 'Business';
        const purchasedNumber = await buyTwilioNumber(areaCode, businessName);

        if (purchasedNumber) {
          await supabase
            .from('users')
            .update({
              twilio_number: purchasedNumber,
              twilio_number_assigned: true,
              subscription_status: 'active',
              setup_status: 'needs_forwarding'
            })
            .eq('id', userId);

          console.log('Auto-assigned Twilio number:', purchasedNumber, 'to user:', userId);
        } else {
          console.error('Failed to auto-assign Twilio number for user:', userId);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

module.exports = router;
