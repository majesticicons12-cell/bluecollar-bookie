const express = require('express');
const router = express.Router();
const { sendWhatsAppMessage, verifyWebhook } = require('../services/whatsappService');
const { generateAIResponse, extractBookingDetails } = require('../services/aiService');
const supabase = require('../config/database');

router.get('/webhook', (req, res) => {
  const result = verifyWebhook(req);
  if (result.verified) {
    return res.status(200).send(result.challenge);
  }
  res.status(403).send('Verification failed');
});

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (event.object !== 'whatsapp_business_account') {
      return res.status(200).send('OK');
    }

    const entry = event.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      return res.status(200).send('OK');
    }

    const messages = value.messages;
    const contacts = value.contacts;

    if (!messages || messages.length === 0) {
      return res.status(200).send('OK');
    }

    const msg = messages[0];
    const phoneNumber = contacts?.[0]?.wa_id || msg.from;
    const userMessage = msg.text?.body;

    if (!userMessage || !phoneNumber) {
      return res.status(200).send('OK');
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', cleanNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lead) {
      console.log('No lead found for phone:', cleanNumber);
      return res.status(200).send('OK');
    }

    const { data: conversationHistory } = await supabase
      .from('messages')
      .select('role, content')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true })
      .limit(20);

    const aiResponse = await generateAIResponse(conversationHistory || [], userMessage);

    await supabase.from('messages').insert([{
      lead_id: lead.id,
      role: 'assistant',
      content: aiResponse
    }]);

    await sendWhatsAppMessage(phoneNumber, aiResponse);

    const bookingDetails = extractBookingDetails(aiResponse);
    if (bookingDetails) {
      const contactName = contacts?.[0]?.profile?.name || 'Unknown';
      const { phone: normalizedPhone } = await supabase
        .from('leads')
        .select('phone')
        .eq('id', lead.id)
        .single();

      await supabase
        .from('leads')
        .update({
          name: contactName,
          service_type: bookingDetails.service,
          address: bookingDetails.address,
          preferred_date: bookingDetails.date,
          preferred_time: bookingDetails.time,
          urgency: bookingDetails.urgency,
          status: 'qualified'
        })
        .eq('id', lead.id);

      const { data: appointment } = await supabase
        .from('appointments')
        .insert([{
          lead_id: lead.id,
          user_id: lead.user_id,
          client_name: contactName,
          client_phone: cleanNumber,
          service_type: bookingDetails.service,
          address: bookingDetails.address,
          date: bookingDetails.date,
          time: bookingDetails.time,
          status: 'booked'
        }])
        .select()
        .single();

      const { data: contractor } = await supabase
        .from('users')
        .select('*')
        .eq('id', lead.user_id)
        .single();

      if (contractor) {
        const notificationMsg = `New Appointment Booked!\n\n` +
          `Client: ${appointment.client_name}\n` +
          `Service: ${appointment.service_type}\n` +
          `Address: ${appointment.address}\n` +
          `Date: ${appointment.date}\n` +
          `Time: ${appointment.time}\n\n` +
          `Check your dashboard for details.`;

        await sendWhatsAppMessage(contractor.phone, notificationMsg);
      }
    } else {
      await supabase
        .from('leads')
        .update({ status: 'in_progress' })
        .eq('id', lead.id);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(200).send('OK');
  }
});

module.exports = router;
