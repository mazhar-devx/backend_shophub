const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
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

// Canonical static routes (no trailing slashes, clean indexable pages)
const staticRoutes = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: '/products', priority: '0.9', changefreq: 'daily' },
  { path: '/categories', priority: '0.9', changefreq: 'weekly' },
  { path: '/deals', priority: '0.9', changefreq: 'daily' },
  { path: '/watch-me', priority: '0.8', changefreq: 'daily' },
  { path: '/blog', priority: '0.8', changefreq: 'daily' },
  { path: '/about-us', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact-us', priority: '0.6', changefreq: 'monthly' },
  { path: '/help-center', priority: '0.6', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.4', changefreq: 'monthly' },
  { path: '/terms-of-service', priority: '0.4', changefreq: 'monthly' },
  { path: '/return-policy', priority: '0.6', changefreq: 'monthly' },
  { path: '/shipping-returns', priority: '0.6', changefreq: 'monthly' },
  { path: '/payment-methods', priority: '0.6', changefreq: 'monthly' },
  { path: '/warranty', priority: '0.6', changefreq: 'monthly' },
  { path: '/size-guide', priority: '0.4', changefreq: 'monthly' },
];

// Main sitemap index — lists clean sub-sitemaps
router.get('/index.xml', async (req, res) => {
  try {
    const productCount = await Product.countDocuments({});
    const productPages = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <sitemap><loc>${baseUrl}/sitemap-static.xml</loc></sitemap>\n`;

    for (let i = 1; i <= productPages; i++) {
      xml += `  <sitemap><loc>${baseUrl}/sitemap-products-${i}.xml</loc></sitemap>\n`;
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
    staticRoutes.forEach(route => {
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

const CURATED_BUYING_GUIDES = [
  { slug: 'pakistan-online-shopping-safety-guide', title: 'The Ultimate Guide to Safe Online Shopping in Pakistan', date: '2026-03-15T10:00:00.000Z' },
  { slug: 'best-smartwatches-under-10000-pakistan', title: 'Best Smartwatches & Fitness Trackers Under PKR 10,000 in Pakistan', date: '2026-03-20T10:00:00.000Z' },
  { slug: 'budget-gaming-peripherals-pakistan-guide', title: 'Budget Gaming Setup in Pakistan Under PKR 15,000', date: '2026-03-25T10:00:00.000Z' },
  { slug: 'pta-mobile-verification-imei-tax-guide', title: 'PTA Mobile Verification & IMEI Check Guide', date: '2026-04-02T10:00:00.000Z' },
  { slug: 'pakistan-summer-winter-fabric-lifestyle-guide', title: 'Men & Women Fashion & Fabric Guide Pakistan', date: '2026-04-10T10:00:00.000Z' }
];

router.get('/blogs.xml', async (req, res) => {
  try {
    // Only index verified editorial guides, not thin automated product clones
    const blogs = await Blog.find({ 
      isPublished: true, 
      category: { $ne: 'Product Spotlight' }
    }).select('slug title updatedAt image');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Curated high-value buying guides
    CURATED_BUYING_GUIDES.forEach(g => {
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + '/blog/' + g.slug)}</loc>\n`;
      xml += `    <lastmod>${g.date}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    // 2. Database editorial articles
    blogs.forEach(blog => {
      const id = blog.slug || blog._id;
      // Skip if already in curated list
      if (CURATED_BUYING_GUIDES.some(g => g.slug === id)) return;
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + '/blog/' + id)}</loc>\n`;
      if (blog.updatedAt) xml += `    <lastmod>${blog.updatedAt.toISOString()}</lastmod>\n`;
      const imgUrl = resolveImageUrl(blog.image);
      if (imgUrl) {
        xml += `    <image:image><image:loc>${escapeXml(imgUrl)}</image:loc><image:title>${escapeXml(blog.title)}</image:title></image:image>\n`;
      }
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

// Single combined sitemap /sitemap.xml
router.get('/', async (req, res) => {
  try {
    const productCount = await Product.countDocuments({});

    // For larger catalogs (>1000 items), serve the sitemap index
    if (productCount > 1000) {
      const productPages = Math.ceil(productCount / PRODUCTS_PER_SITEMAP);
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <sitemap><loc>${baseUrl}/sitemap-static.xml</loc></sitemap>\n`;
      for (let i = 1; i <= productPages; i++) {
        xml += `  <sitemap><loc>${baseUrl}/sitemap-products-${i}.xml</loc></sitemap>\n`;
      }
      xml += `  <sitemap><loc>${baseUrl}/sitemap-blogs.xml</loc></sitemap>\n`;
      xml += `</sitemapindex>`;
      res.header('Content-Type', 'application/xml');
      return res.send(xml);
    }

    // Standard combined sitemap (contains only verified, canonical 200 OK URLs)
    const products = await Product.find({}).select('slug images image updatedAt name');
    const blogs = await Blog.find({ 
      isPublished: true, 
      category: { $ne: 'Product Spotlight' } 
    }).select('slug title updatedAt image');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    staticRoutes.forEach(route => {
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + route.path)}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
    });

    products.forEach(p => { xml += buildProductUrlEntry(p); });

    // Curated high-value buying guides
    CURATED_BUYING_GUIDES.forEach(g => {
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + '/blog/' + g.slug)}</loc>\n`;
      xml += `    <lastmod>${g.date}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    blogs.forEach(blog => {
      const id = blog.slug || blog._id;
      if (CURATED_BUYING_GUIDES.some(g => g.slug === id)) return;
      xml += `  <url>\n    <loc>${escapeXml(baseUrl + '/blog/' + id)}</loc>\n`;
      if (blog.updatedAt) xml += `    <lastmod>${blog.updatedAt.toISOString()}</lastmod>\n`;
      const imgUrl = resolveImageUrl(blog.image);
      if (imgUrl) {
        xml += `    <image:image><image:loc>${escapeXml(imgUrl)}</image:loc><image:title>${escapeXml(blog.title)}</image:title></image:image>\n`;
      }
      xml += `    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
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
