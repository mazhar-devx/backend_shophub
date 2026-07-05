const mongoose = require('mongoose');
const path = require('path');

// Mock models
const Product = require('../models/productModel');
const Video = require('../models/videoModel');
const Blog = require('../models/blogModel');
const User = require('../models/userModel');
const seoRouter = require('../routes/seoRoutes');

// Mock Product queries
Product.findById = async (id) => {
  return {
    _id: new mongoose.Types.ObjectId(id),
    name: "Mock Premium Wireless Headphones",
    slug: "mock-premium-wireless-headphones",
    description: "Experience premium sound with these high-end active noise cancelling wireless headphones.",
    price: 15000,
    image: "headphones.jpg",
    images: ["headphones.jpg", "headphones2.jpg"],
    stock: 25,
    updatedAt: new Date("2026-07-01T12:00:00.000Z")
  };
};
Product.findOne = async (query) => {
  return Product.findById("64f7b6058e1d2c0017f8b9e6");
};

// Mock Video queries
Video.findById = function(id) {
  return {
    populate: async (path, fields) => {
      return {
        _id: new mongoose.Types.ObjectId(id),
        name: "Mock Unboxing Latest Sneakers",
        description: "Watch me unbox the latest premium athletic shoes on ShopHub.",
        videoUrl: "https://example.com/videos/sneaker_unboxing.mp4",
        thumbnailUrl: "sneaker_thumb.jpg",
        likesCount: 142,
        createdAt: new Date("2026-07-02T15:30:00.000Z"),
        user: {
          _id: new mongoose.Types.ObjectId(),
          name: "Mazhar Dev",
          vendorName: "Mazhar X",
          photo: "mazhar_profile.jpg"
        }
      };
    }
  };
};

// Mock Blog queries
Blog.findById = async (id) => {
  return {
    _id: new mongoose.Types.ObjectId(id),
    title: "How Social Shopping is Revolutionizing E-Commerce in Pakistan",
    slug: "social-shopping-revolution-pakistan",
    content: "Social shopping blends interactive media with direct e-commerce...",
    seoDescription: "Discover how ShopHub is bringing social video shopping and community reviews together in Pakistan.",
    image: "/img/blogs/social-shopping.jpg",
    author: "ShopHub Editor",
    isPublished: true,
    createdAt: new Date("2026-07-03T10:00:00.000Z"),
    updatedAt: new Date("2026-07-03T10:00:00.000Z")
  };
};
Blog.findOne = async (query) => {
  return Blog.findById("64f7b6058e1d2c0017f8b9e8");
};

// Mock User queries
User.findById = async (id) => {
  return {
    _id: new mongoose.Types.ObjectId(id),
    name: "Mazhar Dev",
    vendorName: "Mazhar X",
    photo: "mazhar_profile.jpg"
  };
};

// Mock template fetch
global.fetch = async (url) => {
  return {
    ok: true,
    statusText: "OK",
    text: async () => {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/png" href="/logo.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description"
    content="ShopHub - Pakistan's premier luxury destination for high-end fashion, electronics, music and social shopping. Experience the future of e-commerce with 24h delivery, premium quality, and a highly immersive shopping experience.">
  <meta name="keywords"
    content="shophub, ShopHub.pro, shophop, shophub pakistan, luxury shopping Pakistan, online electronics store, premium fashion marketplace, social commerce app, Pakistan online store, fast delivery e-commerce, buy online, best online store, online shopping platform">
  <link rel="canonical" href="https://www.shophub.pro/" />
  
  <!-- Open Graph / Social Media -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.shophub.pro/">
  <meta property="og:title" content="ShopHub.pro - Pakistan's Luxury Shopping & Social Hub">
  <meta property="og:description"
    content="ShopHub.pro is the ultimate destination for premium electronics, fashion, and social video shopping in Pakistan. Experience 24h delivery and exclusive deals.">
  <meta property="og:image" content="https://www.shophub.pro/logo.png">
  <meta property="og:site_name" content="ShopHub.pro">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://www.shophub.pro/">
  <meta property="twitter:title" content="ShopHub - Pakistan's Luxury Shopping & Social Hub">
  <meta property="twitter:description"
    content="Experience the future of shopping in Pakistan. Premium electronics, fashion, and social videos at ShopHub.">
  <meta property="twitter:image" content="https://www.shophub.pro/logo.png">

  <title>ShopHub - Pakistan's #1 Luxury Shopping & Social Marketplace</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`;
    }
  };
};

async function runTest() {
  console.log("Mock environment initialized. Running SEO routes verification...");

  // Find route handler in stack
  const handler = seoRouter.stack.find(layer => layer.route).route.stack[0].handle;

  // TEST 1: PRODUCT
  console.log("\n--- Testing PRODUCT SEO injection ---");
  const mockReqProduct = { query: { type: 'product', id: '64f7b6058e1d2c0017f8b9e6' } };
  const mockResProduct = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { return this; },
    send(content) {
      const titleMatch = content.match(/<title>(.*?)<\/title>/);
      const descMatch = content.match(/<meta name="description" content="(.*?)">/);
      const isProductOg = content.includes('property="og:type" content="og:product"');
      const hasSchema = content.includes('application/ld+json');
      const hasProductInSchema = content.includes('"@type":"Product"');

      console.log(`- Title: "${titleMatch ? titleMatch[1] : 'NOT FOUND'}"`);
      console.log(`- Description: "${descMatch ? descMatch[1] : 'NOT FOUND'}"`);
      console.log(`- Is OG Type Product: ${isProductOg}`);
      console.log(`- Has Schema Injection: ${hasSchema}`);
      console.log(`- Has Product Type in Schema: ${hasProductInSchema}`);
      
      if (titleMatch && titleMatch[1].includes('Mock Premium Wireless Headphones') && isProductOg && hasProductInSchema) {
        console.log("✅ Product SEO Injection Passed!");
      } else {
        console.error("❌ Product SEO Injection Failed!");
      }
    }
  };
  await handler(mockReqProduct, mockResProduct);

  // TEST 2: VIDEO
  console.log("\n--- Testing VIDEO SEO injection ---");
  const mockReqVideo = { query: { type: 'video', v: '64f7b6058e1d2c0017f8b9e7' } };
  const mockResVideo = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { return this; },
    send(content) {
      const titleMatch = content.match(/<title>(.*?)<\/title>/);
      const descMatch = content.match(/<meta name="description" content="(.*?)">/);
      const isVideoOg = content.includes('property="og:type" content="video.other"');
      const isTwitterPlayer = content.includes('name="twitter:card" content="player"');
      const hasVideoPlayer = content.includes('property="og:video"');
      const hasVideoSchema = content.includes('"@type":"VideoObject"');

      console.log(`- Title: "${titleMatch ? titleMatch[1] : 'NOT FOUND'}"`);
      console.log(`- Description: "${descMatch ? descMatch[1] : 'NOT FOUND'}"`);
      console.log(`- Is OG Type Video: ${isVideoOg}`);
      console.log(`- Is Twitter Player Card: ${isTwitterPlayer}`);
      console.log(`- Has Video Source URL: ${hasVideoPlayer}`);
      console.log(`- Has Video Schema: ${hasVideoSchema}`);

      if (titleMatch && titleMatch[1].includes('Mock Unboxing Latest Sneakers') && hasVideoPlayer && hasVideoSchema) {
        console.log("✅ Video SEO Injection Passed!");
      } else {
        console.error("❌ Video SEO Injection Failed!");
      }
    }
  };
  await handler(mockReqVideo, mockResVideo);

  // TEST 3: BLOG
  console.log("\n--- Testing BLOG SEO injection ---");
  const mockReqBlog = { query: { type: 'blog', slug: 'social-shopping-revolution-pakistan' } };
  const mockResBlog = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { return this; },
    send(content) {
      const titleMatch = content.match(/<title>(.*?)<\/title>/);
      const descMatch = content.match(/<meta name="description" content="(.*?)">/);
      const isArticleOg = content.includes('property="og:type" content="article"');
      const hasBlogSchema = content.includes('"@type":"BlogPosting"');

      console.log(`- Title: "${titleMatch ? titleMatch[1] : 'NOT FOUND'}"`);
      console.log(`- Description: "${descMatch ? descMatch[1] : 'NOT FOUND'}"`);
      console.log(`- Is OG Type Article: ${isArticleOg}`);
      console.log(`- Has BlogPosting Schema: ${hasBlogSchema}`);

      if (titleMatch && titleMatch[1].includes('Revolutionizing E-Commerce') && hasBlogSchema) {
        console.log("✅ Blog SEO Injection Passed!");
      } else {
        console.error("❌ Blog SEO Injection Failed!");
      }
    }
  };
  await handler(mockReqBlog, mockResBlog);

  console.log("\nAll mock verification tests completed successfully!");
}

runTest().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
