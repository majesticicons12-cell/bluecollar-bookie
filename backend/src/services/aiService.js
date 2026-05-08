const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

const systemPrompt = `You are an AI receptionist for a contracting business. Your job is to:
1. Greet the client professionally
2. Ask about their problem/service needed
3. Get their location/address
4. Find their preferred date and time
5. Confirm all details before ending

Be friendly, professional, and concise. Always respond in short WhatsApp-friendly messages.

When you have all details (service type, address, preferred time), respond with:
BOOKING_READY: {"service": "...", "address": "...", "date": "...", "time": "...", "urgency": "low/medium/high"}`;

async function generateAIResponse(conversationHistory, userMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await axios.post(
      GROQ_BASE_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 200,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    return "Thanks for reaching out! A team member will get back to you shortly.";
  }
}

function extractBookingDetails(aiResponse) {
  if (aiResponse.includes('BOOKING_READY:')) {
    try {
      const jsonStr = aiResponse.split('BOOKING_READY:')[1].trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  }
  return null;
}

module.exports = { generateAIResponse, extractBookingDetails };
