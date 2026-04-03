// Only initialize Stripe if STRIPE_SECRET_KEY is set
let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
    console.warn('⚠️  STRIPE_SECRET_KEY not set - Stripe payments will be disabled');
}

module.exports = stripe;