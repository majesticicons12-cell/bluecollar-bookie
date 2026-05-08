const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { buyTwilioNumber, generateTwiml } = require('../services/twilioService');
const supabase = require('../config/database');

const INSTRUCTIONS = {
  verizon: {
    android: {
      title: 'Verizon + Android',
      steps: [
        { text: 'Open your Phone app', icon: '📱' },
        { text: 'Tap the 3 dots (⋮) in the top right corner', icon: '⋮' },
        { text: 'Tap "Settings"', icon: '⚙️' },
        { text: 'Tap "Calling accounts"', icon: '📞' },
        { text: 'Tap "Call forwarding"', icon: '↪️' },
        { text: 'Select "Always forward" or "Forward when unanswered"', icon: '📋' },
        { text: `Enter your BlueCollar number: {NUMBER}`, icon: '🔢' },
        { text: 'Tap "Turn on" or "Enable"', icon: '✅' },
        { text: 'You should see a confirmation message', icon: '✔️' }
      ]
    },
    iphone: {
      title: 'Verizon + iPhone',
      steps: [
        { text: 'Open Settings on your iPhone', icon: '⚙️' },
        { text: 'Scroll down and tap "Phone"', icon: '📱' },
        { text: 'Tap "Call Forwarding"', icon: '↪️' },
        { text: 'Toggle Call Forwarding ON', icon: '🔘' },
        { text: `Enter your BlueCollar number: {NUMBER}`, icon: '🔢' },
        { text: 'Tap "Back" to save', icon: '✅' },
        { text: 'You should see the forwarding icon at the top', icon: '✔️' }
      ]
    },
    app: {
      title: 'Via My Verizon App',
      steps: [
        { text: 'Open the My Verizon app', icon: '📱' },
        { text: 'Tap "Account" at the bottom', icon: '👤' },
        { text: 'Tap "Your line settings"', icon: '⚙️' },
        { text: 'Tap "Call forwarding"', icon: '↪️' },
        { text: 'Toggle forwarding ON', icon: '🔘' },
        { text: `Enter your BlueCollar number: {NUMBER}`, icon: '🔢' },
        { text: 'Save and confirm', icon: '✅' }
      ]
    }
  },
  att: {
    android: {
      title: 'AT&T + Android',
      steps: [
        { text: 'Open your Phone app', icon: '📱' },
        { text: 'Tap the 3 dots (⋮) in the top right', icon: '⋮' },
        { text: 'Tap "Settings"', icon: '⚙️' },
        { text: 'Tap "Calling accounts" or "Supplementary services"', icon: '📞' },
        { text: 'Tap "Call forwarding"', icon: '↪️' },
        { text: 'Select "Forward when unanswered"', icon: '📋' },
        { text: `Enter your BlueCollar number: {NUMBER}`, icon: '🔢' },
        { text: 'Tap "Update" or "Enable"', icon: '✅' }
      ]
    },
    iphone: {
      title: 'AT&T + iPhone',
      steps: [
        { text: 'Open Settings', icon: '⚙️' },
        { text: 'Scroll down and tap "Phone"', icon: '📱' },
        { text: 'Tap "Call Forwarding"', icon: '↪️' },
        { text: 'Toggle Call Forwarding ON', icon: '🔘' },
        { text: `Enter your BlueCollar number: {NUMBER}`, icon: '🔢' },
        { text: 'Tap "Back" to save', icon: '✅' }
      ]
    },
    app: {
      title: 'Via myAT&T App',
      steps: [
        { text: 'Open the myAT&T app', icon: '📱' },
        { text: 'Tap your profile icon', icon: '👤' },
        { text: 'Tap your line/number', icon: '📞' },
        { text: 'Scroll to "Call forwarding"', icon: '↪️' },
        { text: 'Toggle ON and enter your BlueCollar number', icon: '🔢' },
        { text: 'Save changes', icon: '✅' }
      ]
    }
  },
  tmobile: {
    android: {
      title: 'T-Mobile + Android',
      steps: [
        { text: 'Open your Phone app', icon: '📱' },
        { text: 'Tap the 3 dots (⋮) → Settings', icon: '⚙️' },
        { text: 'Tap "Calling accounts"', icon: '📞' },
        { text: 'Tap "Call forwarding"', icon: '↪️' },
        { text: 'Select "Forward when unanswered"', icon: '📋' },
        { text: `Enter your BlueCollar number: {NUMBER}`, icon: '🔢' },
        { text: 'Tap "Enable"', icon: '✅' }
      ]
    },
    iphone: {
      title: 'T-Mobile + iPhone',
      steps: [
        { text: 'Open Settings', icon: '⚙️' },
        { text: 'Tap "Phone"', icon: '📱' },
        { text: 'Tap "Call Forwarding"', icon: '↪️' },
        { text: 'Toggle ON', icon: '🔘' },
        { text: `Enter your BlueCollar number: {NUMBER}`, icon: '🔢' },
        { text: 'Tap "Back" to save', icon: '✅' }
      ]
    },
    app: {
      title: 'Via T-Mobile App',
      steps: [
        { text: 'Open the T-Mobile app', icon: '📱' },
        { text: 'Tap your line at the top', icon: '👤' },
        { text: 'Scroll to "Features" or "Settings"', icon: '⚙️' },
        { text: 'Tap "Call forwarding"', icon: '↪️' },
        { text: 'Toggle ON and enter your BlueCollar number', icon: '🔢' },
        { text: 'Save', icon: '✅' }
      ]
    }
  },
  other: {
    dial: {
      title: 'Universal Method (All Phones)',
      steps: [
        { text: 'Open your Phone app and go to the dialer', icon: '📱' },
        { text: `Dial: *61*{NUMBER}#`, icon: '🔢' },
        { text: 'Press the call button', icon: '📞' },
        { text: 'Wait for confirmation message on screen', icon: '⏳' },
        { text: 'You should see "Call forwarding activated"', icon: '✅' },
        { text: 'To test: have someone call your business number', icon: '🧪' }
      ]
    },
    cancel: {
      title: 'To Cancel Forwarding',
      steps: [
        { text: 'Open your Phone app dialer', icon: '📱' },
        { text: 'Dial: ##002#', icon: '🔢' },
        { text: 'Press the call button', icon: '📞' },
        { text: 'Wait for "All call forwarding deactivated"', icon: '✅' }
      ]
    }
  }
};

router.post('/assign', authenticate, async (req, res) => {
  try {
    const { areaCode } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twilio_number_assigned) {
      return res.status(200).json({
        message: 'Number already assigned',
        number: user.twilio_number
      });
    }

    const code = areaCode || '212';
    const businessName = user.business_name || user.name;

    const purchasedNumber = await buyTwilioNumber(code, businessName);

    if (!purchasedNumber) {
      return res.status(500).json({
        error: 'Failed to purchase Twilio number. Please try again or contact support.'
      });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        twilio_number: purchasedNumber,
        twilio_number_assigned: true,
        setup_status: 'needs_forwarding'
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Number assigned successfully',
      number: updatedUser.twilio_number
    });
  } catch (error) {
    console.error('Assign number error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign number' });
  }
});

router.get('/info', authenticate, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('twilio_number, twilio_number_assigned, business_name, phone, setup_status')
      .eq('id', req.user.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      number: user.twilio_number,
      assigned: user.twilio_number_assigned,
      businessName: user.business_name,
      userPhone: user.phone,
      setupStatus: user.setup_status || 'not_started',
      instructions: !user.twilio_number
        ? 'No number assigned yet. Click "Assign Number" to get started.'
        : `Forward calls from your business number to: ${user.twilio_number}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch number info' });
  }
});

router.get('/instructions', authenticate, async (req, res) => {
  try {
    const { carrier, method } = req.query;

    if (!carrier) {
      return res.status(400).json({ error: 'Carrier is required (verizon, att, tmobile, other)' });
    }

    const carrierData = INSTRUCTIONS[carrier.toLowerCase()];
    if (!carrierData) {
      return res.status(400).json({ error: 'Unknown carrier' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('twilio_number')
      .eq('id', req.user.id)
      .single();

    const number = user?.twilio_number || '+1-555-XXX-XXXX';

    let instructions;
    if (method && carrierData[method]) {
      instructions = carrierData[method];
    } else if (carrierData.android) {
      instructions = carrierData;
    } else {
      instructions = carrierData;
    }

    const formattedSteps = instructions ? Object.values(instructions).map(section => ({
      title: section.title,
      steps: section.steps.map(step => ({
        text: step.text.replace('{NUMBER}', number),
        icon: step.icon
      }))
    })) : [];

    res.json({
      instructions: formattedSteps,
      twilioNumber: number
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructions' });
  }
});

router.post('/test-call', authenticate, async (req, res) => {
  try {
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !accountSid.startsWith('AC')) {
      return res.status(500).json({ error: 'Twilio not configured' });
    }

    const client = twilio(accountSid, authToken);

    const { data: user } = await supabase
      .from('users')
      .select('twilio_number, phone')
      .eq('id', req.user.id)
      .single();

    if (!user || !user.twilio_number) {
      return res.status(400).json({ error: 'No Twilio number assigned' });
    }

    const call = await client.calls.create({
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/twilio/test-greeting`,
      to: user.twilio_number,
      from: user.twilio_number
    });

    await supabase
      .from('users')
      .update({ setup_status: 'testing' })
      .eq('id', req.user.id);

    res.json({
      message: 'Test call initiated. Check if your phone rings.',
      callSid: call.sid,
      twilioNumber: user.twilio_number
    });
  } catch (error) {
    console.error('Test call error:', error);
    res.status(500).json({ error: 'Failed to initiate test call' });
  }
});

router.post('/test-confirm', authenticate, async (req, res) => {
  try {
    const { success } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('twilio_number')
      .eq('id', req.user.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (success) {
      await supabase
        .from('users')
        .update({ setup_status: 'complete', setup_completed_at: new Date().toISOString() })
        .eq('id', req.user.id);

      res.json({
        message: 'Setup complete! You are ready to receive leads.',
        status: 'complete'
      });
    } else {
      await supabase
        .from('users')
        .update({ setup_status: 'needs_forwarding' })
        .eq('id', req.user.id);

      res.json({
        message: 'Setup not confirmed. Please check your call forwarding and try again.',
        status: 'needs_forwarding',
        troubleshooting: [
          'Make sure you entered the correct Twilio number',
          'Try the dial code method: *61*{NUMBER}#',
          'Check if your carrier requires activation for call forwarding',
          'Try restarting your phone and testing again'
        ].map(t => t.replace('{NUMBER}', user.twilio_number || 'your number'))
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm test' });
  }
});

router.get('/status', authenticate, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('twilio_number, twilio_number_assigned, setup_status, setup_completed_at')
      .eq('id', req.user.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const statusMap = {
      not_started: {
        label: 'Not Started',
        nextStep: 'Assign a Twilio number',
        complete: false
      },
      number_assigned: {
        label: 'Number Assigned',
        nextStep: 'Set up call forwarding',
        complete: false
      },
      needs_forwarding: {
        label: 'Setup Required',
        nextStep: 'Configure call forwarding on your phone',
        complete: false
      },
      testing: {
        label: 'Testing',
        nextStep: 'Verify test call was received',
        complete: false
      },
      complete: {
        label: 'Ready to Go',
        nextStep: null,
        complete: true
      }
    };

    const status = statusMap[user.setup_status] || statusMap.not_started;

    res.json({
      status: status.label,
      nextStep: status.nextStep,
      complete: status.complete,
      number: user.twilio_number,
      assigned: user.twilio_number_assigned,
      completedAt: user.setup_completed_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setup status' });
  }
});

module.exports = router;
