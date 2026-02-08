const express = require('express');
const stripe = require('../config/stripe');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// Create a payment intent
router.post('/create-payment-intent', catchAsync(async (req, res, next) => {
  const { amount, currency = 'usd', description = 'E-commerce Purchase' } = req.body;

  try {
    if (!stripe) {
      return res.status(503).send({
        status: 'error',
        error: 'Stripe payments are not configured on the server. Please set STRIPE_SECRET_KEY in config.env.'
      });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency: currency,
      description: description,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
      status: 'success'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send({
      error: error.message,
      status: 'error'
    });
  }
}));

module.exports = router;
