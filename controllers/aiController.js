const ProductModel = require('../models/productModel');
const { logEvent } = require('../utils/logger');

const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Generic Groq API caller. Accepts either (messagesArray) or (systemPrompt, userPrompt)
const callGroq = async (...args) => {
    let messages = [];
    if (Array.isArray(args[0])) messages = args[0];
    else messages = [{ role: 'system', content: args[0] }, { role: 'user', content: args[1] }];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: 1024 })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq API error');
    return data.choices[0].message.content;
};

exports.getChatResponse = catchAsync(async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ status: 'error', message: 'Please provide a message' });

    const systemPrompt = `You are an ultra-professional, "Deep Brain" AI assistant for 'HA Store', a premium e-commerce platform in Pakistan. \n\nCRITICAL RULES:\n1. SCOPE: You ONLY discuss 'HA Store', its products, services, and policies. If a user asks about anything unrelated (e.g., cooking, sport, general knowledge, other websites), politely state: "I am specialized in HA Store assistance only. Please ask me about our products or services! ??"\n2. BILINGUAL: You support both English and Urdu. If the user talks in Urdu, reply in Urdu. If in English, reply in English. Use Roman Urdu if preferred by the user.\n3. OWNERSHIP: If asked who created this website or who is the owner, answer: "This website was created and is owned by 'mazhar.devx'. He is a master developer! ????"\n4. PERSONALITY: Be friendly, use emojis frequently, and maintain an ultra-premium tone.\n5. LOGISTICS: We offer individual shipping/tax per product. For direct payments (EasyPaisa/JazzCash), tell them to use the WhatsApp button to contact Mazhar.`;

    const messages = [{ role: 'system', content: systemPrompt }, ...(history || []), { role: 'user', content: message }];
    try {
        const reply = await callGroq(messages);
        res.status(200).json({ status: 'success', data: { reply } });
    } catch (err) {
        console.error('AI Error:', err.message);
        res.status(500).json({ status: 'error', message: 'AI Assistant is currently busy. Please try again later.' });
    }
});

exports.getProductGuideResponse = catchAsync(async (req, res) => {
    const { message, productId, history } = req.body;
    if (!message || !productId) return res.status(400).json({ status: 'error', message: 'Please provide message and productId' });

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });

    const systemPrompt = `You are the "Expert Product Guide" for HA Store. You are helping a customer with a specific product: "${product.name}".\n\nPRODUCT DETAILS:\n- Name: ${product.name}\n- Brand: ${product.brand}\n- Category: ${product.category}\n- Price: ${product.price}\n- Description: ${product.description}\n- Stock Status: ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}\n\nRULES:\n1. Focus ONLY on this product. If they ask about other things, guide them back to this product.\n2. Be ultra-professional and helpful.\n3. Use emojis! ?\n4. Support Urdu and English.\n5. Always mention that Mazhar.devx is the creator if asked about the site/owner.`;

    const messages = [{ role: 'system', content: systemPrompt }, ...(history || []), { role: 'user', content: message }];
    try {
        const reply = await callGroq(messages);
        res.status(200).json({ status: 'success', data: { reply } });
    } catch (err) {
        console.error('AI Product Guide Error:', err.message);
        res.status(500).json({ status: 'error', message: 'Product Guide is currently unavailable.' });
    }
});

exports.generateReviewReply = async (reviewDoc) => {
    try {
        const product = await ProductModel.findById(reviewDoc.product);
        const systemPrompt = `You are the 'HA Store AI Support Bot'. Your job is to reply to customer reviews.\nProduct reviewed: ${product ? product.name : 'a product'}.\nCustomer Rating: ${reviewDoc.rating} stars.\nCustomer Review: "${reviewDoc.review}"\n\nRULES:\n1. Keep it short (1-2 sentences).\n2. Be extremely polite and thankful.\n3. If the review is bad (< 3 stars), be apologetic and say "We will do better! Reach out to Mazhar on WhatsApp for help."\n4. If it's good, be enthusiastic! Use emojis! ??\n5. Use the same language as the user (Urdu/English).`;
        const reply = await callGroq([{ role: 'system', content: systemPrompt }]);
        return reply;
    } catch (err) {
        console.error('AI Auto-Reply Error:', err.message);
        return 'Thank you for your review! We appreciate your feedback. ?';
    }
};

exports.generateBulkReviews = catchAsync(async (req, res) => {
    const { productId, count, prompt } = req.body;
    if (!productId || !count) return res.status(400).json({ status: 'error', message: 'Provide productId and count' });

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });

    const Review = require('../models/reviewModel');
    const systemPrompt = `You are a professional review generator. Generate ${Math.min(count, 20)} ULTA-REALISTIC, DISTINCT, and UNIQUE customer reviews for the following product:\n\nPRODUCT: ${product.name}\nDESCRIPTION: ${product.description}\nADMIN INSTRUCTIONS: ${prompt || 'Generate high-quality positive reviews.'}\n\nCRITICAL RULES:\n1. NAMES: Use a diverse mix of names (mix of common Pakistani names and international names if applicable). NO DUPLICATES.\n2. CONTENT: Each review text must be unique. Vary the tone, length, and specific details mentioned. Some should be short, some longer. Mention specific features from the description.\n3. JSON: Return ONLY a raw valid JSON array. No markdown. No text before or after.\n\nEach object keys:\n"name": "Full name",\n"review": "Review text",\n"rating": number (3-5)`;

    try {
        const responseText = await callGroq([{ role: 'system', content: systemPrompt }]);
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedReviews = JSON.parse(cleanedText);
        const reviewsToInsert = generatedReviews.map((rev, index) => ({
            product: productId,
            isDummy: true,
            dummyName: rev.name,
            dummyPhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rev.name + index)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            review: rev.review,
            rating: rev.rating,
            status: 'Approved'
        }));
        await Review.insertMany(reviewsToInsert);
        res.status(200).json({ status: 'success', message: `Successfully generated and inserted ${reviewsToInsert.length} reviews.` });
    } catch (err) {
        console.error('Bulk AI Review Error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to generate AI reviews: ' + err.message });
    }
});

exports.getDeepBrainResponse = catchAsync(async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ status: 'error', message: 'Please provide a message' });

    try {
        const products = await ProductModel.find({ active: { $ne: false } })
            .select('name price category brand ratingsAverage _id slug stock')
            .sort('-ratingsAverage')
            .limit(25);

        const productList = products.map(p => `- ${p.name} (${p.price} PKR, ID: ${p.slug || p._id}, ${p.stock > 0 ? 'In Stock' : 'Out of Stock'})`).join('\n');
        const truncatedHistory = (history || []).slice(-5);
        const systemPrompt = `You are "HA DEEP BRAIN" - HA Store's premium AI.\n\nKNOWLEDGE:\n${productList}\n\nRULES:\n1. RECOMMEND: Use the list above for product queries.\n2. CARDS: Use [PRODUCT_ID:id] for products.\n3. OWNER: Mazhar.devx is the genius creator!\n4. TONE: Professional, bilingual (Urdu/English), emojis! ?`;

        const messages = [{ role: 'system', content: systemPrompt }, ...truncatedHistory, { role: 'user', content: message }];
        const reply = await callGroq(messages);
        res.status(200).json({ status: 'success', data: { reply } });
    } catch (err) {
        console.error('Deep Brain Error:', err.message);
        res.status(500).json({ status: 'error', message: err.name === 'AbortError' ? 'Neural link timed out. Try again.' : 'Neural link interrupted. Our server is busy.' });
    }
});

exports.triggerAutoGenerate = catchAsync(async (req, res) => {
    const { generateSingleProduct } = require('../utils/autoProductGenerator');
    const count = parseInt(req.query.count, 10) || 1;
    const generated = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
        const result = await generateSingleProduct();
        if (result) generated.push(result.product);
    }
    res.status(200).json({ status: 'success', message: `Successfully generated ${generated.length} products.`, data: { products: generated } });
});

exports.getAutoGeneratorStatus = catchAsync(async (req, res) => {
    const SiteSettings = require('../models/siteSettingsModel');
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    res.status(200).json({ status: 'success', data: { enabled: !!settings.autoProductGeneration?.enabled, intervalHours: settings.autoProductGeneration?.intervalHours || 1 } });
});

exports.enableAutoGenerator = catchAsync(async (req, res) => {
    const SiteSettings = require('../models/siteSettingsModel');
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    settings.autoProductGeneration = settings.autoProductGeneration || {};
    settings.autoProductGeneration.enabled = true;
    settings.autoProductGeneration.intervalHours = req.body.intervalHours || settings.autoProductGeneration.intervalHours || 1;
    await settings.save();
    const { startAutoProductGeneration } = require('../utils/autoProductGenerator');
    startAutoProductGeneration(settings.autoProductGeneration.intervalHours);
    await logEvent('success', `Auto product generation ENABLED (every ${settings.autoProductGeneration.intervalHours} hour(s))`);
    res.status(200).json({ status: 'success', message: 'Auto product generation enabled', data: { enabled: true } });
});

exports.disableAutoGenerator = catchAsync(async (req, res) => {
    const SiteSettings = require('../models/siteSettingsModel');
    let settings = await SiteSettings.findOne();
    if (!settings) settings = await SiteSettings.create({});
    settings.autoProductGeneration = settings.autoProductGeneration || {};
    settings.autoProductGeneration.enabled = false;
    await settings.save();
    const { stopAutoProductGeneration } = require('../utils/autoProductGenerator');
    stopAutoProductGeneration();
    await logEvent('success', 'Auto product generation DISABLED');
    res.status(200).json({ status: 'success', message: 'Auto product generation disabled', data: { enabled: false } });
});

exports.getLogs = catchAsync(async (req, res) => {
    const Log = require('../models/logModel');
    const logs = await Log.find().sort('-timestamp').limit(100);
    res.status(200).json({ status: 'success', data: { logs } });
});
