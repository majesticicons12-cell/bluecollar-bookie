require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const twilioRoutes = require('./routes/twilio');
const whatsappRoutes = require('./routes/whatsapp');
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const appointmentRoutes = require('./routes/appointments');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const numberRoutes = require('./routes/numbers');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    try {
      if (data) req.body = JSON.parse(data);
      else req.body = {};
    } catch (e) {
      req.body = {};
    }
    next();
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.SUPABASE_URL,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      meta: !!process.env.META_ACCESS_TOKEN,
      groq: !!process.env.GROQ_API_KEY,
      lemon: !!process.env.LEMONSQUEEZY_API_KEY,
      jwt: !!process.env.JWT_SECRET
    }
  });
});

app.all('/api/debug/test', async (req, res) => {
  try {
    const { data, error } = await require('./config/database')
      .from('users')
      .select('id')
      .limit(1);
    res.json({ success: !error, data, error: error?.message || null, body: req.body, method: req.method, contentType: req.headers['content-type'] });
  } catch (e) {
    res.json({ success: false, error: e.message, body: req.body });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/numbers', numberRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
