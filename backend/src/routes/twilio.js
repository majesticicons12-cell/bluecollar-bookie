const express = require('express');
const router = express.Router();
const { detectMissedCall, generateTwiml, sendSMS } = require('../services/twilioService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const supabase = require('../config/database');

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    console.log('Twilio webhook received:', event.CallSid, event.CallStatus);

    const dialedNumber = event.To;

    if (!dialedNumber) {
      res.set('Content-Type', 'text/xml');
      res.send(generateTwiml('Thank you for calling. Please leave a message.'));
      return;
    }

    const cleanDialed = dialedNumber.replace(/[^0-9+]/g, '');

    const { data: contractor } = await supabase
      .from('users')
      .select('*')
      .eq('twilio_number', cleanDialed)
      .single();

    if (!contractor) {
      console.warn('No contractor found for number:', cleanDialed);
      res.set('Content-Type', 'text/xml');
      res.send(generateTwiml('Thank you for calling. Please leave a message.'));
      return;
    }

    if (detectMissedCall(event)) {
      const callerNumber = event.From;
      console.log('Missed call detected for:', contractor.business_name, 'from:', callerNumber);

      const welcomeMsg = `Hi! Thanks for calling ${contractor.business_name}. I noticed you tried reaching us. How can we help you today?`;

      await sendWhatsAppMessage(callerNumber, welcomeMsg);

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert([{
          user_id: contractor.id,
          phone: callerNumber,
          name: null,
          service_type: null,
          address: null,
          status: 'contacted',
          source: 'missed_call'
        }])
        .select()
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
      }

      const contractorNotification = `Missed call from ${callerNumber}. AI has sent them a WhatsApp message. You'll be notified when details are captured.`;

      await sendWhatsAppMessage(contractor.phone, contractorNotification);
    }

    res.set('Content-Type', 'text/xml');
    res.send(generateTwiml('Thank you for calling. Please leave a message and we will get back to you shortly.'));
  } catch (error) {
    console.error('Twilio webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(generateTwiml('Thank you for calling. Please leave a message.'));
  }
});

router.post('/status', async (req, res) => {
  const { CallSid, CallStatus, Duration, To, From } = req.body;
  console.log('Call status update:', { CallSid, CallStatus, Duration, To, From });
  res.status(200).send('OK');
});

router.post('/test-greeting', async (req, res) => {
  try {
    const twiml = generateTwiml(
      'This is a test call from BlueCollar Bookie. If you are hearing this, your call forwarding is working correctly. Your AI receptionist is ready to go.'
    );
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Test greeting error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(generateTwiml('Test call received.'));
  }
});

module.exports = router;
