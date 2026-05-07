const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');

router.get('/', async (req, res) => {
    try {
        const products = await Product.find({}).select('slug images image updatedAt');

        // Base URL of the frontend
        const baseUrl = 'https://www.shophub.pro';
        const backendBaseUrl = 'https://backendshophub-production.up.railway.app';

        let xmlText = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xmlText += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

        // Add static core routes
        const staticRoutes = [
            { path: '/', priority: '1.0' },
            { path: '/products', priority: '0.9' },
            { path: '/categories', priority: '0.8' },
            { path: '/deals', priority: '0.8' },
            { path: '/mazhar.devx', priority: '0.9' }
        ];

        staticRoutes.forEach(route => {
            xmlText += `  <url>\n`;
            xmlText += `    <loc>${baseUrl}${route.path}</loc>\n`;
            xmlText += `    <priority>${route.priority}</priority>\n`;
            xmlText += `  </url>\n`;
        });

        // Add dynamically generated product URLs
        products.forEach(product => {
            xmlText += `  <url>\n`;
            xmlText += `    <loc>${baseUrl}/product/${product._id}</loc>\n`;

            if (product.updatedAt) {
                xmlText += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
            }

            // Include ALL images for Google Image indexing
            const allImages = [];
            if (product.image && product.image !== "default.jpg") {
                allImages.push(product.image);
            }
            if (product.images && product.images.length > 0) {
                product.images.forEach(img => {
                    if (img !== "default.jpg" && !allImages.includes(img)) {
                        allImages.push(img);
                    }
                });
            }

            allImages.forEach(img => {
                // Ensure proper absolute URL forming
                let imgUrl = img;
                if (!imgUrl.startsWith('http')) {
                    if (imgUrl.startsWith('/')) {
                        imgUrl = `${backendBaseUrl}${imgUrl}`;
                    } else {
                        imgUrl = `${backendBaseUrl}/img/users/${imgUrl}`; // default fallback if needed
                    }
                }

                xmlText += `    <image:image>\n`;
                xmlText += `      <image:loc>${imgUrl}</image:loc>\n`;
                xmlText += `    </image:image>\n`;
            });

            xmlText += `    <priority>0.8</priority>\n`;
            xmlText += `  </url>\n`;
        });

        xmlText += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.status(200).send(xmlText);

    } catch (error) {
        console.error("Sitemap generation error:", error);
        res.status(500).json({ status: 'error', message: 'Failed to generate sitemap' });
    }
});

module.exports = router;
