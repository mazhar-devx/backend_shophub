const Product = require('../models/productModel');
const Video = require('../models/videoModel');
const User = require('../models/userModel');

// ─────────────────────────────────────────────────────────
// STOCK VIDEOS — category-matched high-quality loops
// ─────────────────────────────────────────────────────────
const STOCK_VIDEOS = {
  electronics: [
    "https://assets.mixkit.co/videos/preview/mixkit-holding-a-smart-phone-with-a-green-screen-34376-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-typing-on-a-laptop-keyboard-40546-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-hands-adjusting-headphones-on-neck-41617-large.mp4"
  ],
  fashion: [
    "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-fashion-shoot-40409-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-woman-wearing-a-silk-scarf-41618-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-shopping-bags-in-the-city-34289-large.mp4"
  ],
  shoes: [
    "https://assets.mixkit.co/videos/preview/mixkit-person-tying-running-shoes-before-a-workout-34279-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-person-walking-in-white-sneakers-40012-large.mp4"
  ],
  watches: [
    "https://assets.mixkit.co/videos/preview/mixkit-checking-the-time-on-a-wrist-watch-41616-large.mp4"
  ],
  home: [
    "https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-into-a-cup-41619-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-cooking-fresh-vegetables-in-a-pan-40548-large.mp4"
  ],
  beauty: [
    "https://assets.mixkit.co/videos/preview/mixkit-applying-makeup-to-a-womans-face-41620-large.mp4"
  ],
  toys: [
    "https://assets.mixkit.co/videos/preview/mixkit-unpacking-a-received-parcel-40549-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-handholding-creditcard-paying-online-40547-large.mp4"
  ],
  general: [
    "https://assets.mixkit.co/videos/preview/mixkit-handholding-creditcard-paying-online-40547-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-unpacking-a-received-parcel-40549-large.mp4"
  ]
};

// ─────────────────────────────────────────────────────────
// FALLBACK IMAGES — curated product photography by category
// (used when all live searches fail)
// ─────────────────────────────────────────────────────────
const FALLBACK_IMAGES_BY_CATEGORY = {
  electronics: [
    "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=1080&auto=format&fit=crop&q=80"
  ],
  fashion: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1080&auto=format&fit=crop&q=80"
  ],
  shoes: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1080&auto=format&fit=crop&q=80"
  ],
  watches: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1461141346587-763ab02bced9?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1619134778706-7015533a6150?w=1080&auto=format&fit=crop&q=80"
  ],
  home: [
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1080&auto=format&fit=crop&q=80"
  ],
  beauty: [
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1583241800698-e8ab01c26eed?w=1080&auto=format&fit=crop&q=80"
  ],
  toys: [
    "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=1080&auto=format&fit=crop&q=80"
  ],
  general: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1080&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1080&auto=format&fit=crop&q=80"
  ]
};

// ─────────────────────────────────────────────────────────
// Build a product-photography-focused search query
// (forces search to return product shots, not lifestyle images)
// ─────────────────────────────────────────────────────────
const buildProductQuery = (name, category) => {
  const productSuffixes = {
    electronics: 'product photography studio white background',
    fashion: 'clothing flat lay product shot clean background',
    shoes: 'sneakers product shot clean background isolated',
    watches: 'luxury watch product photography isolated dark background',
    home: 'home appliance product shot clean background studio',
    beauty: 'cosmetics skincare product photography white background',
    toys: 'toy product photography white background studio'
  };
  const suffix = productSuffixes[category] || 'product photography white background isolated';
  return `${name} ${suffix}`;
};

// ─────────────────────────────────────────────────────────
// Groq API caller
// ─────────────────────────────────────────────────────────
const callGroq = async (systemPrompt, userPrompt) => {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.85,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Groq API error");
  }
  return data.choices[0].message.content;
};

// ─────────────────────────────────────────────────────────
// Image search — Unsplash with product-focused query
// ─────────────────────────────────────────────────────────
const searchUnsplashImages = async (query) => {
  try {
    const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=8&orientation=squarish`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'ShopHub/1.0' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results
        .filter(img => img.urls && img.urls.regular)
        .map(img => img.urls.regular);
    }
    return [];
  } catch (err) {
    console.error('[AutoGenerator] Unsplash fetch failed:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────────
// Main product generation function
// ─────────────────────────────────────────────────────────
const { logEvent } = require('./logger');

const generateSingleProduct = async () => {
  try {
    await logEvent('info', 'Starting AI automatic product generation...');

    // 1. Get default admin user to act as vendor
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      await logEvent('error', 'Auto-generation aborted: No admin user found in database.');
      return null;
    }

    // 2. Fetch existing products to avoid duplicating names
    const existing = await Product.find().select('name');
    const existingNames = existing.map(p => p.name);

    // 3. Determine if we are generating a simple or expensive product
    const isExpensive = Math.random() > 0.5;

    const systemPrompt = `You are a creative e-commerce product manager. Generate a brand new, highly realistic, unique product for a premium Pakistan-based shopping marketplace called "ShopHub".
    
    CRITICAL RULES:
    1. DO NOT reuse any names from this list of already existing products:
       ${JSON.stringify(existingNames.slice(-50))}
    2. Respond ONLY with a raw, valid JSON object. No other text or markdown.
    3. Make descriptions ultra-SEO-optimized, unique, human-written, engaging, and rich with keywords. Do NOT copy copyrighted material. Include technical specifications.
    4. Set "isExpensive" to: ${isExpensive}.
       - If isExpensive is true, set the price in PKR between 15,000 and 250,000 (premium luxury goods).
       - If isExpensive is false, set the price in PKR between 400 and 8,000 (affordable daily goods).
    5. Choose one of these categories: "electronics", "fashion", "shoes", "watches", "home", "beauty", "toys".
    6. Include specifications (weight in g, dimensions in cm) and shipping details.
    7. The "name" field must be a SHORT, CATCHY product name (2-4 words max, like a real product: "AirPods Pro", "Nike Air Max", "Samsung Galaxy").
    
    JSON format:
    {
      "name": "Short Product Name",
      "brand": "Brand Name",
      "description": "Rich 200-300 word SEO description...",
      "price": number,
      "category": "category",
      "stock": number,
      "discountPercentage": number (0-30),
      "shippingCost": number,
      "isExpensive": boolean,
      "specifications": {
        "dimensions": { "length": number, "width": number, "height": number, "unit": "cm" },
        "weight": { "value": number, "unit": "g" }
      },
      "tags": ["tag1", "tag2", "tag3", "seo-keyword"...]
    }`;

    const userPrompt = `Generate a new product. Ensure the name is unique and catchy (2-4 words). Make the SEO description extremely strong, at least 200 words.`;
    
    const groqResponse = await callGroq(systemPrompt, userPrompt);
    const productData = JSON.parse(groqResponse);

    await logEvent('info', `AI generated metadata for: "${productData.name}" (${productData.price} PKR)`);

    // 4. Fetch matching product images using product-photography-focused queries
    const cat = (productData.category || 'general').toLowerCase();
    
    // Tier 1: search by product name + photography suffix
    const productQuery = buildProductQuery(productData.name, cat);
    let images = await searchUnsplashImages(productQuery);
    
    // Tier 2: fallback to category + product photography suffix
    if (images.length < 2) {
      const categoryQuery = buildProductQuery(productData.category, cat);
      const moreImages = await searchUnsplashImages(categoryQuery);
      images = [...images, ...moreImages];
    }
    
    // Tier 3: use curated category-specific fallback images (actual product photos)
    if (images.length === 0) {
      const fallbackKey = cat.includes('elect') ? 'electronics'
        : cat.includes('fash') || cat.includes('cloth') ? 'fashion'
        : cat.includes('shoe') || cat.includes('sneaker') ? 'shoes'
        : cat.includes('watch') ? 'watches'
        : cat.includes('home') || cat.includes('kitchen') ? 'home'
        : cat.includes('beaut') || cat.includes('cosm') ? 'beauty'
        : cat.includes('toy') ? 'toys'
        : 'general';
      images = FALLBACK_IMAGES_BY_CATEGORY[fallbackKey] || FALLBACK_IMAGES_BY_CATEGORY.general;
    }

    productData.image = images[0];
    productData.images = images.slice(0, 4);

    // 5. Select a video based on category
    let videoList = STOCK_VIDEOS.general;
    if (cat.includes('elect')) videoList = STOCK_VIDEOS.electronics;
    else if (cat.includes('fash') || cat.includes('cloth')) videoList = STOCK_VIDEOS.fashion;
    else if (cat.includes('shoe') || cat.includes('sneaker')) videoList = STOCK_VIDEOS.shoes;
    else if (cat.includes('watch')) videoList = STOCK_VIDEOS.watches;
    else if (cat.includes('home') || cat.includes('kitchen')) videoList = STOCK_VIDEOS.home;
    else if (cat.includes('beaut') || cat.includes('cosm')) videoList = STOCK_VIDEOS.beauty;
    else if (cat.includes('toy')) videoList = STOCK_VIDEOS.toys;

    // Pick random video from list
    const mappedVideo = videoList[Math.floor(Math.random() * videoList.length)];
    productData.video = mappedVideo;
    productData.posterType = 'video';

    // 6. Assign vendor admin
    productData.vendor = admin._id;
    productData.currency = 'PKR';

    // 7. Save Product
    const newProduct = await Product.create(productData);
    await logEvent('success', `Product successfully created: "${newProduct.name}" (ID: ${newProduct._id})`);

    // 8. Create corresponding Watch Me video entry
    const finalTags = Array.from(new Set([
      newProduct.category,
      newProduct.brand,
      ...(newProduct.tags || []),
      'trending', 'shopping', 'viral', 'deals'
    ])).slice(0, 10);

    const newVideo = await Video.create({
      user: admin._id,
      videoUrl: mappedVideo,
      thumbnailUrl: newProduct.image,
      name: newProduct.name,
      description: newProduct.description.substring(0, 480),
      tags: finalTags,
      productLink: `/product/${newProduct.slug || newProduct._id}`
    });

    await logEvent('success', `WatchMe video feed entry created: "${newVideo.name}" (ID: ${newVideo._id})`);

    return { product: newProduct, video: newVideo };
  } catch (err) {
    await logEvent('error', `Error in generateSingleProduct: ${err.message}`);
    return null;
  }
};

// ─────────────────────────────────────────────────────────
// Hourly scheduler
// ─────────────────────────────────────────────────────────
let autoGenInterval = null;

const startAutoProductGeneration = () => {
  if (autoGenInterval) {
    console.log('[AutoGenerator] Scheduler is already running.');
    return;
  }

  console.log('[AutoGenerator] Initializing scheduler... (adding 1 or 2 products every 1 hour)');

  // Run every 1 hour (3600000 ms)
  autoGenInterval = setInterval(async () => {
    try {
      console.log('[AutoGenerator] Running hourly generation job...');
      const count = Math.random() > 0.5 ? 2 : 1;
      
      for (let i = 0; i < count; i++) {
        console.log(`[AutoGenerator] Generating product ${i + 1} of ${count}...`);
        await generateSingleProduct();
      }
    } catch (err) {
      console.error('[AutoGenerator] Interval job execution failed:', err.message);
    }
  }, 60 * 60 * 1000);
};

module.exports = {
  generateSingleProduct,
  startAutoProductGeneration
};
