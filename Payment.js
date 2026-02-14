import Stripe from 'stripe';
const stripe = new Stripe('sk_live_your_stripe_secret_key');

// To'lov sessiyasi yaratish
app.post('/create-payment', async (req, res) => {
  const { userId, plan } = req.body;
  
  // Planlar: 1 oy, 6 oy, 12 oy
  const plans = {
    monthly: { price: 1000, name: 'Monthly Premium' },  // $10
    yearly: { price: 10000, name: 'Yearly Premium' }    // $100
  };
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: plans[plan].name },
        unit_amount: plans[plan].price,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: 'https://your-site.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://your-site.com/cancel',
    metadata: { userId, plan }
  });
  
  res.json({ sessionId: session.id });
});

// To'lov holatini tekshirish
app.get('/check-payment/:sessionId', async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
  
  if (session.payment_status === 'paid') {
    // User ni premium qilish
    await User.findByIdAndUpdate(session.metadata.userId, { 
      premium: true,
      premiumUntil: new Date(Date.now() + 30*24*60*60*1000) // 30 kun
    });
    res.json({ status: 'paid' });
  } else {
    res.json({ status: 'unpaid' });
  }
});