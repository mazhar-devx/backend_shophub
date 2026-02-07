const SiteSettings = require('../models/siteSettingsModel');
const catchAsync = require('../utils/catchAsync');

exports.getSettings = catchAsync(async (req, res, next) => {
    let settings = await SiteSettings.findOne();
    if (!settings) {
        // Create default if not exists
        settings = await SiteSettings.create({});
    }

    res.status(200).json({
        status: 'success',
        data: {
            settings
        }
    });
});

exports.updateSettings = catchAsync(async (req, res, next) => {
    // Handle file uploads
    if (req.files) {
        if (req.files.heroImage) {
            if (!req.body.hero) req.body.hero = {};
            req.body.hero.image = `/uploads/${req.files.heroImage[0].filename}`;
        }
        if (req.files.flashSaleImage) {
            if (!req.body.flashSale) req.body.flashSale = {};
            req.body.flashSale.image = `/uploads/${req.files.flashSaleImage[0].filename}`;
        }
    }

    // Parse nested objects if they came as strings (multipart/form-data often sends objects as strings)
    if (typeof req.body.hero === 'string') {
        try { req.body.hero = JSON.parse(req.body.hero); } catch (e) { }
    }
    if (typeof req.body.flashSale === 'string') {
        try { req.body.flashSale = JSON.parse(req.body.flashSale); } catch (e) { }
    }

    // Merging file paths back into the parsed objects if needed
    // The parsing above might overwrite the image path we just set if the stringified JSON didn't include it or had old one
    // So we should re-apply the image path
    if (req.files) {
        if (req.files.heroImage && typeof req.body.hero === 'object') {
            req.body.hero.image = `/uploads/${req.files.heroImage[0].filename}`;
        }
        if (req.files.flashSaleImage && typeof req.body.flashSale === 'object') {
            req.body.flashSale.image = `/uploads/${req.files.flashSaleImage[0].filename}`;
        }
    }

    let settings = await SiteSettings.findOne();
    if (!settings) {
        settings = await SiteSettings.create(req.body);
    } else {
        settings = await SiteSettings.findByIdAndUpdate(settings._id, req.body, {
            new: true,
            runValidators: true
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            settings
        }
    });
});
