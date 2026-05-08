const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const supabase = require('../config/database');

router.get('/', authenticate, async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: true });

    if (error) throw error;
    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { lead_id, client_name, client_phone, service_type, address, date, time, notes } = req.body;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([{
        user_id: req.user.id,
        lead_id,
        client_name,
        client_phone,
        service_type,
        address,
        date,
        time,
        notes,
        status: 'booked'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ appointment });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ appointment: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

module.exports = router;
