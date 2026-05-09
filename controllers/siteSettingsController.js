const SiteSettings = require('../models/siteSettingsModel');
const catchAsync = require('../utils/catchAsync');

exports.getSettings = catchAsync(async (req, res, next) => {
    // Ensure we always get/create the SAME document. 
    // findOneAndUpdate with upsert=true and an empty filter {} is the safest way to ensure a singleton.
    let settings = await SiteSettings.findOneAndUpdate({}, {}, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
    });

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
        if (!req.body.hero) req.body.hero = {};
        if (!req.body.flashSale) req.body.flashSale = {};

        if (req.files.heroImage) {
            req.body.hero.image = req.files.heroImage[0].path;
        }
        if (req.files.heroImages) {
            req.body.hero.images = req.files.heroImages.map(file => file.path);
        }
        if (req.files.heroVideo) {
            req.body.hero.video = req.files.heroVideo[0].path;
        }
        if (req.files.flashSaleImage) {
            req.body.flashSale.image = req.files.flashSaleImage[0].path;
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
    if (req.files) {
        if (req.files.heroImage && typeof req.body.hero === 'object') {
            req.body.hero.image = req.files.heroImage[0].path;
        }
        if (req.files.heroImages && typeof req.body.hero === 'object') {
            req.body.hero.images = req.files.heroImages.map(file => file.path);
        }
        if (req.files.heroVideo && typeof req.body.hero === 'object') {
            req.body.hero.video = req.files.heroVideo[0].path;
        }
        if (req.files.flashSaleImage && typeof req.body.flashSale === 'object') {
            req.body.flashSale.image = req.files.flashSaleImage[0].path;
        }
    }

    // Update the singleton document
    const settings = await SiteSettings.findOneAndUpdate({}, req.body, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
    });

    res.status(200).json({
        status: 'success',
        data: {
            settings
        }
    });
});
