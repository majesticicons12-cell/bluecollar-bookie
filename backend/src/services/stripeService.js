const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'placeholder-key');

const PRICE_MAP = {
  basic: process.env.STRIPE_PRICE_BASIC || 'price_placeholder_basic',
  pro: process.env.STRIPE_PRICE_PRO || 'price_placeholder_pro',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_placeholder_premium',
};

async function createSubscription(customerEmail, plan, userId) {
  try {
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customer;
    
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: { userId }
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: PRICE_MAP[plan],
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?status=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?status=cancelled`,
      metadata: {
        userId,
        plan
      }
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Stripe Error:', error.message);
    throw error;
  }
}

async function handleWebhook(payload, signature) {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object);
    case 'invoice.payment_succeeded':
      return handlePaymentSucceeded(event.data.object);
    case 'customer.subscription.deleted':
      return handleSubscriptionCancelled(event.data.object);
    default:
      console.log('Unhandled event:', event.type);
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Subscription created:', {
    userId: session.metadata.userId,
    plan: session.metadata.plan,
    customerId: session.customer
  });
  return session;
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for customer:', invoice.customer);
  return invoice;
}

async function handleSubscriptionCancelled(subscription) {
  console.log('Subscription cancelled:', subscription.id);
  return subscription;
}

module.exports = { createSubscription, handleWebhook };
