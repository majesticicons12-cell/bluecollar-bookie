const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACplaceholder';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'placeholder';

let client = null;

function getClient() {
  if (!client && accountSid.startsWith('AC') && accountSid.length > 15) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

async function sendSMS(to, fromNumber, body) {
  const twilioClient = getClient();
  if (!twilioClient) {
    console.warn('Twilio not configured. SMS would be sent to:', to, 'from:', fromNumber);
    return { sid: 'placeholder' };
  }
  try {
    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to
    });
    console.log('SMS sent:', message.sid, 'from:', fromNumber);
    return message;
  } catch (error) {
    console.error('SMS Error:', error.message);
    throw error;
  }
}

function generateTwiml(message) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.say(message);
  response.hangup();
  return response.toString();
}

function detectMissedCall(event) {
  const callStatus = event.CallStatus;
  const direction = event.Direction;

  if (direction === 'inbound' && callStatus === 'no-answer') {
    return true;
  }

  if (direction === 'inbound' && callStatus === 'busy') {
    return true;
  }

  if (direction === 'inbound' && callStatus === 'completed') {
    const duration = parseInt(event.CallDuration) || 0;
    if (duration === 0) {
      return true;
    }
  }

  return false;
}

async function buyTwilioNumber(phoneNumber, contractorName) {
  const twilioClient = getClient();
  if (!twilioClient) {
    console.warn('Twilio not configured. Cannot buy number.');
    return null;
  }
  try {
    const areaCode = phoneNumber.substring(0, 3);
    const numbers = await twilioClient.availablePhoneNumbers('US')
      .local
      .list({ areaCode, limit: 1 });

    let availableNumber;
    if (numbers.length > 0) {
      availableNumber = numbers[0];
    } else {
      const numbersAny = await twilioClient.availablePhoneNumbers('US')
        .local
        .list({ limit: 1 });
      if (numbersAny.length === 0) return null;
      availableNumber = numbersAny[0];
    }

    const purchased = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: availableNumber.phoneNumber,
      friendlyName: `${contractorName} - BlueCollar Bookie`,
      voiceUrl: `${process.env.FRONTEND_URL}/api/twilio/webhook`,
      statusCallback: `${process.env.FRONTEND_URL}/api/twilio/status`
    });

    console.log('Purchased number:', purchased.phoneNumber);
    return purchased.phoneNumber;
  } catch (error) {
    console.error('Buy Number Error:', error.message);
    return null;
  }
}

async function releaseTwilioNumber(phoneNumber) {
  const twilioClient = getClient();
  if (!twilioClient) return;
  try {
    const numbers = await twilioClient.incomingPhoneNumbers.list({ phoneNumber, limit: 1 });
    if (numbers.length > 0) {
      await twilioClient.incomingPhoneNumbers(numbers[0].sid).remove();
      console.log('Released number:', phoneNumber);
    }
  } catch (error) {
    console.error('Release Number Error:', error.message);
  }
}

module.exports = { getClient, sendSMS, generateTwiml, detectMissedCall, buyTwilioNumber, releaseTwilioNumber };
