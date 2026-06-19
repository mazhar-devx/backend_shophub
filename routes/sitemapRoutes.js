const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Video = require('../models/videoModel');
const Blog = require('../models/blogModel');

router.get('/', async (req, res) => {
    try {
        const products = await Product.find({}).select('slug images image updatedAt name description price');
        const videos = await Video.find({}).select('name description videoUrl thumbnailUrl createdAt updatedAt user').populate('user', 'name vendorName photo');
        const blogs = await Blog.find({ isPublished: true }).select('slug title updatedAt image');

        const baseUrl = 'https://www.shophub.pro';
        const backendBaseUrl = 'https://backend-shophub.vercel.app';

        let xmlText = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xmlText += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" \n`;
        xmlText += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" \n`;
        xmlText += `        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

        const staticRoutes = [
            { path: '/', priority: '1.0', changefreq: 'daily' },
            { path: '/products', priority: '0.9', changefreq: 'daily' },
            { path: '/categories', priority: '0.8', changefreq: 'weekly' },
            { path: '/deals', priority: '0.9', changefreq: 'daily' },
            { path: '/watch-me', priority: '1.0', changefreq: 'always' },
            { path: '/mazhar.devx', priority: '0.9', changefreq: 'daily' },
            { path: '/privacy-policy', priority: '0.3', changefreq: 'monthly' },
            { path: '/terms-of-service', priority: '0.3', changefreq: 'monthly' },
            { path: '/return-policy', priority: '0.5', changefreq: 'monthly' },
            { path: '/about-us', priority: '0.5', changefreq: 'monthly' }
        ];

        staticRoutes.forEach(route => {
            xmlText += `  <url>\n`;
            xmlText += `    <loc>${baseUrl}${route.path}</loc>\n`;
            xmlText += `    <changefreq>${route.changefreq}</changefreq>\n`;
            xmlText += `    <priority>${route.priority}</priority>\n`;
            xmlText += `  </url>\n`;
        });

        // Products
        products.forEach(product => {
            xmlText += `  <url>\n`;
            const productIdentifier = product.slug ? product.slug : product._id;
            xmlText += `    <loc>${baseUrl}/product/${productIdentifier}</loc>\n`;
            if (product.updatedAt) xmlText += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
            
            const allImages = [];
            if (product.image && product.image !== "default.jpg") allImages.push(product.image);
            if (product.images?.length > 0) {
                product.images.forEach(img => {
                    if (img !== "default.jpg" && !allImages.includes(img)) allImages.push(img);
                });
            }

            allImages.forEach(img => {
                let imgUrl = img.startsWith('http') ? img : (img.startsWith('/') ? `${backendBaseUrl}${img}` : `${backendBaseUrl}/img/users/${img}`);
                xmlText += `    <image:image>\n`;
                xmlText += `      <image:loc>${imgUrl}</image:loc>\n`;
                xmlText += `      <image:title>${product.name}</image:title>\n`;
                xmlText += `    </image:image>\n`;
            });

            xmlText += `    <changefreq>daily</changefreq>\n`;
            xmlText += `    <priority>0.9</priority>\n`;
            xmlText += `  </url>\n`;
        });

        // Videos
        videos.forEach(video => {
            xmlText += `  <url>\n`;
            xmlText += `    <loc>${baseUrl}/watch-me?v=${video._id}</loc>\n`;
            xmlText += `    <video:video>\n`;
            xmlText += `      <video:thumbnail_loc>${video.thumbnailUrl ? (video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `${backendBaseUrl}/uploads/${video.thumbnailUrl}`) : (video.videoUrl.startsWith('http') ? video.videoUrl : `${backendBaseUrl}/uploads/${video.videoUrl}`)}</video:thumbnail_loc>\n`;
            xmlText += `      <video:title>${video.name}</video:title>\n`;
            xmlText += `      <video:description>${video.description || 'Watch premium videos on ShopHub.pro'}</video:description>\n`;
            xmlText += `      <video:content_loc>${video.videoUrl.startsWith('http') ? video.videoUrl : `${backendBaseUrl}/uploads/${video.videoUrl}`}</video:content_loc>\n`;
            xmlText += `      <video:publication_date>${(video.createdAt || new Date()).toISOString()}</video:publication_date>\n`;
            xmlText += `    </video:video>\n`;
            xmlText += `    <changefreq>weekly</changefreq>\n`;
            xmlText += `    <priority>0.8</priority>\n`;
            xmlText += `  </url>\n`;
        });

        // Blogs
        blogs.forEach(blog => {
            xmlText += `  <url>\n`;
            const blogIdentifier = blog.slug ? blog.slug : blog._id;
            xmlText += `    <loc>${baseUrl}/blog/${blogIdentifier}</loc>\n`;
            if (blog.updatedAt) xmlText += `    <lastmod>${blog.updatedAt.toISOString()}</lastmod>\n`;
            if (blog.image) {
                let imgUrl = blog.image.startsWith('http') ? blog.image : `${backendBaseUrl}${blog.image}`;
                xmlText += `    <image:image>\n`;
                xmlText += `      <image:loc>${imgUrl}</image:loc>\n`;
                xmlText += `      <image:title>${blog.title}</image:title>\n`;
                xmlText += `    </image:image>\n`;
            }
            xmlText += `    <changefreq>weekly</changefreq>\n`;
            xmlText += `    <priority>0.7</priority>\n`;
            xmlText += `  </url>\n`;
        });

        xmlText += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.status(200).send(xmlText);

    } catch (error) {
        console.error("Sitemap error:", error);
        res.status(500).json({ status: 'error' });
    }
});

module.exports = router;
