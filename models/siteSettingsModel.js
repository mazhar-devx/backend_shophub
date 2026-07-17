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
            type: String,
            default: '$299'
        },
        image: {
            type: String,
            default: ''
        },
        images: {
            type: [String],
            default: []
        },
        video: {
            type: String,
            default: ''
        },
        productUrl: {
            type: String,
            default: ''
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
        productUrl: { type: String, default: '' },
        endTime: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
    }
    ,
    // AI Auto Product Generation control
    autoProductGeneration: {
        enabled: { type: Boolean, default: false },
        intervalHours: { type: Number, default: 1 }
    }
}, { timestamps: true });

// We only want one document, so we can make it a singleton conceptually
const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

module.exports = SiteSettings;
