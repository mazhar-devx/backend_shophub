const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');

// Ensure env is loaded
dotenv.config({ path: path.join(__dirname, '../config.env') });

console.log('Cloudinary Config Loading...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Present' : 'MISSING');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Present' : 'MISSING');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
