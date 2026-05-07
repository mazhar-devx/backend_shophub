const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'shophub_products', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'],
        resource_type: 'auto'
        // transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // REMOVED to allow full quality
    }
});

// File filter (Images & Videos)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image or video! Please upload only images or videos.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        // fileSize: 50 * 1024 * 1024 // Temporarily disabled to find source of 10MB limit
    }
});

module.exports = upload;
