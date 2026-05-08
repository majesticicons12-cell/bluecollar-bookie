const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const supabase = require('../config/database');

router.get('/', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    const { count: qualifiedLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('status', 'qualified');

    const { count: todayAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('date', today);

    const { count: upcomingAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('date', today)
      .eq('status', 'booked');

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: upcoming } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('date', today)
      .eq('status', 'booked')
      .order('date', { ascending: true })
      .limit(5);

    res.json({
      stats: {
        totalLeads: totalLeads || 0,
        qualifiedLeads: qualifiedLeads || 0,
        todayAppointments: todayAppointments || 0,
        upcomingAppointments: upcomingAppointments || 0
      },
      recentLeads: recentLeads || [],
      upcomingAppointments: upcoming || []
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, business_name, plan, twilio_number, twilio_number_assigned, setup_status, setup_completed_at, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
