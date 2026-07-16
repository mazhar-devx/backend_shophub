const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Video = require('../models/videoModel');
const Blog = require('../models/blogModel');

const baseUrl = 'https://www.shophub.pro';
const backendBaseUrl = 'https://backend-shophub.vercel.app';
const PRODUCTS_PER_SITEMAP = 5000;

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveImageUrl(img) {
  if (!img || img === 'default.jpg') return null;
  if (img.startsWith('http')) return img;
  if (img.startsWith('/')) return `${backendBaseUrl}${img}`;
  return `${backendBaseUrl}/img/users/${img}`;
}

function buildProductUrlEntry(product) {
  const productIdentifier = product.slug || product._id;
  let entry = `  <url>\n`;
  entry += `    <loc>${escapeXml(baseUrl + '/product/' + productIdentifier)}</loc>\n`;
  if (product.updatedAt) entry += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;

  const allImages = [];
  if (product.image && product.image !== 'default.jpg') allImages.push(product.image);
  if (product.images?.length) {
    product.images.forEach(img => {
      if (img && img !== 'default.jpg' && !allImages.includes(img)) allImages.push(img);
    });
  }

  allImages.forEach(img => {
    const imgUrl = resolveImageUrl(img);
    if (!imgUrl) return;
    entry += `    <image:image>\n`;
    entry += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
    entry += `      <image:title>${escapeXml(product.name)}</image:title>\n`;
    entry += `      <image:caption>${escapeXml(product.name)} - Buy online at ShopHub Pakistan</image:caption>\n`;
    entry += `    </image:image>\n`;
  });

  entry += `    <changefreq>daily</changefreq>\n`;
  entry += `    <priority>0.9</priority>\n`;
  entry += `  </url>\n`;
  return entry;
}

function buildVideoUrlEntry(video) {
  if (!video.videoUrl) return '';
  let entry = `  <url>\n`;
  entry += `    <loc>${escapeXml(baseUrl + '/watch-me?v=' + video._id)}</loc>\n`;
  if (video.updatedAt || video.createdAt) {
    entry += `    <lastmod>${(video.updatedAt || video.createdAt).toISOString()}</lastmod>\n`;
  }
  entry += `    <video:video>\n`;

  const thumbLoc = resolveImageUrl(video.thumbnailUrl) || resolveImageUrl(video.videoUrl);
  const contentLoc = resolveImageUrl(video.videoUrl);

  if (thumbLoc) entry += `      <video:thumbnail_loc>${escapeXml(thumbLoc)}</video:thumbnail_loc>\n`;
  entry += `      <video:title>${escapeXml(video.name)}</video:title>\n`;
  entry += `      <video:description>${escapeXml(video.description || 'Watch premium product videos on ShopHub.pro')}</video:description>\n`;
  if (contentLoc) entry += `      <video:content_loc>${escapeXml(contentLoc)}</video:content_loc>\n`;
  entry += `      <video:publication_date>${(video.createdAt || new Date()).toISOString()}</video:publication_date>\n`;
  entry += `      <video:family_friendly>yes</video:family_friendly>\n`;
  entry += `      <video:requires_subscription>no</video:requires_subscription>\n`;
  entry += `      <video:live>no</video:live>\n`;
  entry += `    </video:video>\n`;
  entry += `    <changefreq>weekly</changefreq>\n`;
  entry += `    <priority>0.8</priority>\n`;
  entry += `  </url>\n`;
  return entry;
}

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/products', priority: '0.9', changefreq: 'daily' },
  { path: '/categories', priority: '0.8', changefreq: 'weekly' },
  { path: '/deals', priority: '0.9', changefreq: 'daily' },
  { path: '/watch-me', priority: '1.0', changefreq: 'always' },
  { path: '/blog', priority: '0.8', changefreq: 'daily' },
  { path: '/about-us', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact-us', priority: '0.5', changefreq: 'monthly' },
  { path: '/help-center', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'monthly' },
  { path: '/terms-of-service', priority: '0.3', changefreq: 'monthly' },
  { path: '/return-policy', priority: '0.5', changefreq: 'monthly' },
  { path: '/shipping-returns', priority: '0.5', changefreq: 'monthly' },
  { path: '/size-guide', priority: '0.4', changefreq: 'monthly' },
];

const categoryRoutes = ['electronics', 'fashion', 'shoes', 'watches', 'home', 'beauty', 'toys'].map(cat => ({
  path: `/products?category=${cat}`,
  priority: '0.85',
  changefreq: 'daily'
}));

// Main sitemap index — lists all sub-sitemaps
router.get('/index.xml', async (req, res) => {
  try {
    const productCount = await Product.countDocuments({});
    const videoCount = await Video.countDocuments({});
    const productPages = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));
    const videoPages = Math.max(1, Math.ceil(videoCount / PRODUCTS_PER_SITEMAP));

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    xml += `  <sitemap><loc>${baseUrl}/sitemap-static.xml</loc></sitemap>\n`;

    for (let i = 1; i <= productPages; i++) {
      xml += `  <sitemap><loc>${baseUrl}/sitemap-products-${i}.xml</loc></sitemap>\n`;
    }
    for (let i = 1; i <= videoPages; i++) {
      xml += `  <sitemap><loc>${baseUrl}/sitemap-videos-${i}.xml</loc></sitemap>\n`;
    }
    xml += `  <sitemap><loc>${baseUrl}/sitemap-blogs.xml</loc></sitemap>\n`;
    xml += `</sitemapindex>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap index error:', error);
    res.status(500).json({ status: 'error' });
  }
});

router.get('/static.xml', async (req, res) => {
  try {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    [...staticRoutes, ...categoryRoutes].forEach(route => {
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + route.path)}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

router.get('/products-:page.xml', async (req, res) => {
  try {
    const page = parseInt(req.params.page, 10) || 1;
    const skip = (page - 1) * PRODUCTS_PER_SITEMAP;
    const products = await Product.find({})
      .select('slug images image updatedAt name')
      .sort('-updatedAt')
      .skip(skip)
      .limit(PRODUCTS_PER_SITEMAP);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    products.forEach(p => { xml += buildProductUrlEntry(p); });
    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

router.get('/videos-:page.xml', async (req, res) => {
  try {
    const page = parseInt(req.params.page, 10) || 1;
    const skip = (page - 1) * PRODUCTS_PER_SITEMAP;
    const videos = await Video.find({})
      .select('name description videoUrl thumbnailUrl createdAt updatedAt')
      .sort('-createdAt')
      .skip(skip)
      .limit(PRODUCTS_PER_SITEMAP);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;
    videos.forEach(v => { xml += buildVideoUrlEntry(v); });
    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

router.get('/blogs.xml', async (req, res) => {
  try {
    const blogs = await Blog.find({ isPublished: true }).select('slug title updatedAt image');
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    blogs.forEach(blog => {
      const id = blog.slug || blog._id;
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + '/blog/' + id)}</loc>\n`;
      if (blog.updatedAt) xml += `    <lastmod>${blog.updatedAt.toISOString()}</lastmod>\n`;
      const imgUrl = resolveImageUrl(blog.image);
      if (imgUrl) {
        xml += `    <image:image><image:loc>${escapeXml(imgUrl)}</image:loc><image:title>${escapeXml(blog.title)}</image:title></image:image>\n`;
      }
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

// Legacy combined sitemap (redirects to index for crawlers that hit /sitemap.xml)
router.get('/', async (req, res) => {
  try {
    const productCount = await Product.countDocuments({});

    // For large catalogs, serve sitemap index
    if (productCount > 1000) {
      const productPages = Math.ceil(productCount / PRODUCTS_PER_SITEMAP);
      const videoCount = await Video.countDocuments({});
      const videoPages = Math.ceil(videoCount / PRODUCTS_PER_SITEMAP) || 1;

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <sitemap><loc>${baseUrl}/sitemap-static.xml</loc></sitemap>\n`;
      for (let i = 1; i <= productPages; i++) {
        xml += `  <sitemap><loc>${baseUrl}/sitemap-products-${i}.xml</loc></sitemap>\n`;
      }
      for (let i = 1; i <= videoPages; i++) {
        xml += `  <sitemap><loc>${baseUrl}/sitemap-videos-${i}.xml</loc></sitemap>\n`;
      }
      xml += `  <sitemap><loc>${baseUrl}/sitemap-blogs.xml</loc></sitemap>\n`;
      xml += `</sitemapindex>`;
      res.header('Content-Type', 'application/xml');
      return res.send(xml);
    }

    // Small catalog: single combined sitemap
    const products = await Product.find({}).select('slug images image updatedAt name');
    const videos = await Video.find({}).select('name description videoUrl thumbnailUrl createdAt updatedAt');
    const blogs = await Blog.find({ isPublished: true }).select('slug title updatedAt image');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

    [...staticRoutes, ...categoryRoutes].forEach(route => {
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + route.path)}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
    });
    products.forEach(p => { xml += buildProductUrlEntry(p); });
    videos.forEach(v => { xml += buildVideoUrlEntry(v); });
    blogs.forEach(blog => {
      const id = blog.slug || blog._id;
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + '/blog/' + id)}</loc>\n`;
      if (blog.updatedAt) xml += `    <lastmod>${blog.updatedAt.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).json({ status: 'error' });
  }
});

module.exports = router;
