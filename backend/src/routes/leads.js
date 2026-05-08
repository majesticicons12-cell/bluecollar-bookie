const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const supabase = require('../config/database');

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search, limit } = req.query;
    let query = supabase
      .from('leads')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    if (limit) query = query.limit(parseInt(limit));

    const { data: leads, error } = await query;

    if (error) throw error;
    res.json(leads || []);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ lead });
  } catch (error) {
    res.status(404).json({ error: 'Lead not found' });
  }
});

router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/:id/update-status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ lead: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

module.exports = router;
