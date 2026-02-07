const express = require('express');
const siteSettingsController = require('../controllers/siteSettingsController');
const authController = require('../controllers/authController');

const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', siteSettingsController.getSettings);

router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.patch('/',
    upload.fields([
        { name: 'heroImage', maxCount: 1 },
        { name: 'flashSaleImage', maxCount: 1 }
    ]),
    siteSettingsController.updateSettings
);

module.exports = router;
