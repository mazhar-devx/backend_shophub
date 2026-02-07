const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
    hero: {
        title: {
            type: String,
            default: 'Experience Sound Like Never Before'
        },
        subtitle: {
            type: String,
            default: 'Immerse yourself in premium audio quality.'
        },
        price: {
            type: String, // String to allow 'Starting at $299' etc
            default: '$299'
        },
        image: {
            type: String,
            default: '' // Default image URL or empty
        },
        buttonText: {
            type: String,
            default: 'Shop Now'
        },
        buttonLink: {
            type: String,
            default: '/products'
        }
    },
    flashSale: {
        active: { type: Boolean, default: true },
        title: { type: String, default: 'Premium Headphones' },
        subtitle: { type: String, default: 'Immerse yourself in pure sound...' },
        price: { type: Number, default: 199.99 },
        originalPrice: { type: Number, default: 399.99 },
        image: { type: String, default: '' },
        endTime: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // Default 24h from now
    }
}, { timestamps: true });

// We only want one document, so we can make it a singleton conceptually
const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

module.exports = SiteSettings;
