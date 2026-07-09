const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Product = require('../models/productModel');
const Video = require('../models/videoModel');
const Blog = require('../models/blogModel');
const User = require('../models/userModel');

// In-memory cache for the index.html template
let cachedHtml = null;
let cacheTime = 0;

// Helper to escape HTML characters
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to strip HTML tags for clean text content
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

// Function to fetch the production index.html template
const getIndexTemplate = async () => {
  const now = Date.now();
  // Cache the template for 10 minutes to minimize network requests
  if (cachedHtml && (now - cacheTime < 10 * 60 * 1000)) {
    return cachedHtml;
  }
  
  try {
    const response = await fetch('https://www.shophub.pro/index.html');
    if (!response.ok) {
      throw new Error(`Failed to fetch index.html: ${response.statusText}`);
    }
    cachedHtml = await response.text();
    cacheTime = now;
    return cachedHtml;
  } catch (error) {
    console.error("Error fetching index.html template:", error);
    if (cachedHtml) return cachedHtml; // Fallback to expired cache if fetch fails
    // Ultimate fallback if no template has ever been cached
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>ShopHub</title></head><body><div id="root"></div></body></html>`;
  }
};

router.get('/', async (req, res) => {
  const { type, id, slug } = req.query;
  const baseUrl = 'https://www.shophub.pro';
  const backendBaseUrl = 'https://backend-shophub.vercel.app';

  // Default SEO Values
  let title = "ShopHub - Pakistan's #1 Luxury Shopping & Social Marketplace";
  let description = "ShopHub is your premium destination for high-end fashion, electronics, and immersive social shopping. Experience the future of e-commerce in Pakistan.";
  let image = `${baseUrl}/logo.png`;
  let url = baseUrl;
  let pageType = 'website';
  let twitterCard = 'summary_large_image';
  let videoUrl = null;
  const schemas = [];

  try {
    const templateHtml = await getIndexTemplate();
    let queryId = id || slug;

    if (type === 'product' && queryId) {
      let product = null;
      if (mongoose.Types.ObjectId.isValid(queryId)) {
        product = await Product.findById(queryId);
      }
      if (!product) {
        product = await Product.findOne({ slug: queryId });
      }

      if (product) {
        // Amazon-style keyword-focused Title
        title = `Buy ${product.name} Online at Best Price in Pakistan | ShopHub`;
        
        // Amazon-style high-CTR Meta Description
        const finalPrice = product.discountPercentage > 0 
          ? product.price * (1 - product.discountPercentage / 100) 
          : product.price;
        description = `Shop online for ${product.name} in Pakistan. Brand: ${product.brand || 'ShopHub'}. Category: ${product.category}. Price: PKR ${finalPrice}. ${product.description.substring(0, 120)}... Enjoy 24h delivery, premium quality, and secure checkout.`;
        
        url = `${baseUrl}/product/${product.slug || product._id}`;
        
        let pImage = product.image;
        if (pImage && pImage !== 'default.jpg') {
          image = pImage.startsWith('http') 
            ? pImage 
            : (pImage.startsWith('/') ? `${backendBaseUrl}${pImage}` : `${backendBaseUrl}/img/users/${pImage}`);
        }
        pageType = 'og:product';

        // Add ultra-rich Amazon-level Product Schema
        const productSchemaJson = {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "image": [image],
          "description": product.description.substring(0, 300),
          "sku": product._id.toString(),
          "mpn": product._id.toString(),
          "brand": {
            "@type": "Brand",
            "name": product.brand || "ShopHub"
          },
          "category": product.category,
          "offers": {
            "@type": "Offer",
            "url": url,
            "priceCurrency": product.currency || "PKR",
            "price": finalPrice,
            "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
          }
        };

        if (product.ratingsQuantity > 0) {
          productSchemaJson.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": product.ratingsAverage,
            "reviewCount": product.ratingsQuantity,
            "bestRating": 5,
            "worstRating": 1
          };
        }

        schemas.push(productSchemaJson);
      }
    } else if (type === 'video') {
      const videoId = req.query.v || queryId;
      let video = null;
      if (videoId && mongoose.Types.ObjectId.isValid(videoId)) {
        video = await Video.findById(videoId).populate('user', 'name vendorName photo');
      }

      if (video) {
        title = `Watch ${video.name} - Dynamic Video Shopping & Reviews | ShopHub`;
        description = `Watch real-time short videos, unboxing clips, and expert reviews for ${video.name} on ShopHub.pro. Created by ${video.user ? (video.user.vendorName || video.user.name) : 'ShopHub'}. Watch now & purchase instantly!`;
        url = `${baseUrl}/watch-me?v=${video._id}`;
        
        let vThumbnail = video.thumbnailUrl;
        let vUrl = video.videoUrl;
        
        if (vThumbnail) {
          image = vThumbnail.startsWith('http') ? vThumbnail : `${backendBaseUrl}/uploads/${vThumbnail}`;
        }
        
        if (vUrl) {
          videoUrl = vUrl.startsWith('http') ? vUrl : `${backendBaseUrl}/uploads/${vUrl}`;
          if (!vThumbnail) {
            // Fallback image if thumbnail is absent but video url exists
            image = videoUrl;
          }
        }
        
        pageType = 'video.other';
        twitterCard = 'player';

        // Add VideoObject Structured Data schema
        schemas.push({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          "name": video.name,
          "description": description,
          "thumbnailUrl": image,
          "uploadDate": video.createdAt || new Date().toISOString(),
          "contentUrl": videoUrl,
          "embedUrl": url,
          "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": { "@type": "LikeAction" },
            "userInteractionCount": video.likesCount || 0
          }
        });
      } else {
        // Fallback for general Watch Me page
        title = "Watch Me - Social Short Video Shopping | ShopHub";
        description = "Experience immersive video shopping in Pakistan. Watch product reviews, styling tips, and purchase instantly on ShopHub.";
        url = `${baseUrl}/watch-me`;
      }
    } else if (type === 'blog' && queryId) {
      let blog = null;
      if (mongoose.Types.ObjectId.isValid(queryId)) {
        blog = await Blog.findById(queryId);
      }
      if (!blog) {
        blog = await Blog.findOne({ slug: queryId });
      }

      if (blog && blog.isPublished) {
        title = `${blog.title} | ShopHub Blog`;
        description = blog.seoDescription || blog.content.substring(0, 160);
        url = `${baseUrl}/blog/${blog.slug || blog._id}`;
        
        let bImage = blog.image;
        if (bImage) {
          image = bImage.startsWith('http') ? bImage : `${backendBaseUrl}${bImage}`;
        }
        pageType = 'article';

        // Add BlogPosting Structured Data schema
        schemas.push({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": blog.title,
          "image": image,
          "datePublished": blog.createdAt || new Date().toISOString(),
          "dateModified": blog.updatedAt || new Date().toISOString(),
          "author": {
            "@type": "Person",
            "name": blog.author || "ShopHub Admin"
          },
          "description": description
        });
      }
    } else if (type === 'creator' && queryId) {
      let creator = null;
      if (mongoose.Types.ObjectId.isValid(queryId)) {
        creator = await User.findById(queryId);
      }

      if (creator) {
        const cName = creator.vendorName || creator.name;
        title = `${cName} on ShopHub - Profile and Videos`;
        description = `Check out products, short videos, and fashion styles from ${cName} on ShopHub.pro.`;
        url = `${baseUrl}/creator/${creator._id}`;
        
        let cPhoto = creator.photo;
        if (cPhoto) {
          image = cPhoto.startsWith('http') 
            ? cPhoto 
            : (cPhoto.startsWith('/') ? `${backendBaseUrl}${cPhoto}` : `${backendBaseUrl}/img/users/${cPhoto}`);
        }
        pageType = 'profile';

        // Profile Schema
        schemas.push({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "mainEntity": {
            "@type": "Person",
            "name": cName,
            "image": image,
            "identifier": creator._id.toString()
          }
        });
      }
    }

    // Clean existing meta/title/canonical/og/twitter tags from template
    let cleanedHtml = templateHtml
      .replace(/<title>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\s+[^>]*name="description"[^>]*>/gi, '')
      .replace(/<meta\s+[^>]*name="keywords"[^>]*>/gi, '')
      .replace(/<link\s+[^>]*rel="canonical"[^>]*>/gi, '')
      .replace(/<meta\s+[^>]*property="og:(title|description|url|image|type|site_name)"[^>]*>/gi, '')
      .replace(/<meta\s+[^>]*property="twitter:(card|title|description|url|image)"[^>]*>/gi, '');

    // Construct fresh SEO tags
    let seoTags = `
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(url)}">
  <meta property="og:type" content="${escapeHtml(pageType)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="ShopHub">
  <meta name="twitter:card" content="${escapeHtml(twitterCard)}">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
`;

    // Inject video player open graph properties if it is a video page
    if (videoUrl) {
      seoTags += `  <meta property="og:video" content="${escapeHtml(videoUrl)}" />
  <meta property="og:video:secure_url" content="${escapeHtml(videoUrl)}" />
  <meta property="og:video:type" content="video/mp4" />
  <meta property="og:video:width" content="1080" />
  <meta property="og:video:height" content="1920" />
  <meta name="twitter:player" content="${escapeHtml(url)}" />
  <meta name="twitter:player:width" content="1080" />
  <meta name="twitter:player:height" content="1920" />
`;
    }

    // Inject structured JSON-LD schemas
    if (schemas.length > 0) {
      schemas.forEach(s => {
        seoTags += `  <script type="application/ld+json">${JSON.stringify(s)}</script>\n`;
      });
    }

    // Construct pre-rendered HTML content for crawler indexing
    let bodyContent = '';
    if (type === 'product' && product) {
      bodyContent = `
    <article style="padding: 20px; max-width: 800px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
      <h1>${escapeHtml(product.name)}</h1>
      <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" style="max-width: 400px; width: 100%; height: auto; border-radius: 8px;" />
      <p><strong>Category:</strong> ${escapeHtml(product.category || '')}</p>
      <p><strong>Price:</strong> PKR ${escapeHtml(product.price)}</p>
      <p><strong>Availability:</strong> ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
      <div>
        <h2>Product Details</h2>
        <p>${escapeHtml(product.description)}</p>
      </div>
    </article>`;
    } else if (type === 'video' && video) {
      bodyContent = `
    <article style="padding: 20px; max-width: 800px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
      <h1>${escapeHtml(video.name)}</h1>
      <p><strong>Creator:</strong> ${escapeHtml(video.user ? (video.user.vendorName || video.user.name) : 'ShopHub Creator')}</p>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(video.name)}" style="max-width: 400px; width: 100%; height: auto; border-radius: 8px;" />` : ''}
      <div>
        <h2>Video Description</h2>
        <p>${escapeHtml(description)}</p>
      </div>
    </article>`;
    } else if (type === 'blog' && blog) {
      const cleanContent = stripHtml(blog.content);
      bodyContent = `
    <article style="padding: 20px; max-width: 800px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
      <h1>${escapeHtml(blog.title)}</h1>
      <p><strong>Published:</strong> ${blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : ''}</p>
      <p><strong>Author:</strong> ${escapeHtml(blog.author || 'ShopHub')}</p>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(blog.title)}" style="max-width: 600px; width: 100%; height: auto; border-radius: 8px;" />` : ''}
      <div>
        <h2>Article Content</h2>
        <p>${escapeHtml(cleanContent.substring(0, 1500))}...</p>
      </div>
    </article>`;
    } else if (type === 'creator' && creator) {
      const cName = creator.vendorName || creator.name;
      bodyContent = `
    <article style="padding: 20px; max-width: 800px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
      <h1>${escapeHtml(cName)}</h1>
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(cName)}" style="width: 150px; height: 150px; border-radius: 50%;" />` : ''}
      <p>Welcome to ${escapeHtml(cName)}'s profile page on ShopHub. Explore premium products, dynamic short videos, and fashion reviews.</p>
    </article>`;
    }

    // Insert new tags right after <head> tag
    let finalHtml = cleanedHtml.replace(/<head>/i, `<head>\n${seoTags}`);

    // Inject body content inside <div id="root"></div> for indexing/AdSense bots
    if (bodyContent) {
      finalHtml = finalHtml.replace(/<div id="root"><\/div>/i, `<div id="root">${bodyContent}</div>`);
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(finalHtml);

  } catch (error) {
    console.error("SEO Renderer execution error:", error);
    // Secure fallback: return the original index.html if template fetching or parsing errors occur
    try {
      const templateHtml = await getIndexTemplate();
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(templateHtml);
    } catch (fallbackError) {
      return res.status(500).send("Internal Server Error");
    }
  }
});

module.exports = router;
