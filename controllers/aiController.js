const Product = require('../models/productModel');

const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Helper for Groq API
const callGroq = async (messages) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "Groq API error");
    }
    return data.choices[0].message.content;
};

// Simple chat controller for Groq
exports.getChatResponse = catchAsync(async (req, res, next) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide a message'
        });
    }

    const systemPrompt = `You are an ultra-professional, "Deep Brain" AI assistant for 'HA Store', a premium e-commerce platform in Pakistan. 
  
  CRITICAL RULES:
  1. SCOPE: You ONLY discuss 'HA Store', its products, services, and policies. If a user asks about anything unrelated (e.g., cooking, sport, general knowledge, other websites), politely state: "I am specialized in HA Store assistance only. Please ask me about our products or services! 😊"
  2. BILINGUAL: You support both English and Urdu. If the user talks in Urdu, reply in Urdu. If in English, reply in English. Use Roman Urdu if preferred by the user.
  3. OWNERSHIP: If asked who created this website or who is the owner, answer: "This website was created and is owned by 'mazhar.devx'. He is a master developer! 💻🔥"
  4. PERSONALITY: Be friendly, use emojis frequently, and maintain an ultra-premium tone.
  5. LOGISTICS: We offer individual shipping/tax per product. For direct payments (EasyPaisa/JazzCash), tell them to use the WhatsApp button to contact Mazhar.`;

    const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []),
        { role: "user", content: message }
    ];

    try {
        const reply = await callGroq(messages);
        res.status(200).json({
            status: 'success',
            data: { reply }
        });
    } catch (err) {
        console.error("AI Error:", err.message);
        res.status(500).json({
            status: 'error',
            message: 'AI Assistant is currently busy. Please try again later.'
        });
    }
});

// Product Guide Controller
exports.getProductGuideResponse = catchAsync(async (req, res, next) => {
    const { message, productId, history } = req.body;

    if (!message || !productId) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide message and productId'
        });
    }

    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({
            status: 'error',
            message: 'Product not found'
        });
    }

    const systemPrompt = `You are the "Expert Product Guide" for HA Store. You are helping a customer with a specific product: "${product.name}".
    
    PRODUCT DETAILS:
    - Name: ${product.name}
    - Brand: ${product.brand}
    - Category: ${product.category}
    - Price: ${product.price}
    - Description: ${product.description}
    - Stock Status: ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
    
    RULES:
    1. Focus ONLY on this product. If they ask about other things, guide them back to this product.
    2. Be ultra-professional and helpful.
    3. Use emojis! ✨
    4. Support Urdu and English.
    5. Always mention that Mazhar.devx is the creator if asked about the site/owner.`;

    const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []),
        { role: "user", content: message }
    ];

    try {
        const reply = await callGroq(messages);
        res.status(200).json({
            status: 'success',
            data: { reply }
        });
    } catch (err) {
        console.error("AI Product Guide Error:", err.message);
        res.status(500).json({
            status: 'error',
            message: 'Product Guide is currently unavailable.'
        });
    }
});

// Generate Automated Review Reply (Internal Usage)
exports.generateReviewReply = async (reviewDoc) => {
    try {
        const product = await Product.findById(reviewDoc.product);
        const systemPrompt = `You are the 'HA Store AI Support Bot'. Your job is to reply to customer reviews.
        Product reviewed: ${product ? product.name : 'a product'}.
        Customer Rating: ${reviewDoc.rating} stars.
        Customer Review: "${reviewDoc.review}"
        
        RULES:
        1. Keep it short (1-2 sentences).
        2. Be extremely polite and thankful.
        3. If the review is bad (< 3 stars), be apologetic and say "We will do better! Reach out to Mazhar on WhatsApp for help."
        4. If it's good, be enthusiastic! Use emojis! 🚀
        5. Use the same language as the user (Urdu/English).`;

        const messages = [{ role: "system", content: systemPrompt }];
        const reply = await callGroq(messages);
        return reply;
    } catch (err) {
        console.error("AI Auto-Reply Error:", err.message);
        return "Thank you for your review! We appreciate your feedback. ✨"; // Fallback
    }
};

// Generate Bulk Fake Reviews for Admin
exports.generateBulkReviews = catchAsync(async (req, res, next) => {
    const { productId, count, prompt } = req.body;
    
    if (!productId || !count) {
        return res.status(400).json({ status: 'error', message: 'Provide productId and count' });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    
    const Review = require('../models/reviewModel');
    
    const systemPrompt = `You are a professional review generator. Generate ${Math.min(count, 20)} ULTA-REALISTIC, DISTINCT, and UNIQUE customer reviews for the following product:
    
    PRODUCT: ${product.name}
    DESCRIPTION: ${product.description}
    ADMIN INSTRUCTIONS: ${prompt || 'Generate high-quality positive reviews.'}
    
    CRITICAL RULES:
    1. NAMES: Use a diverse mix of names (mix of common Pakistani names and international names if applicable). NO DUPLICATES.
    2. CONTENT: Each review text must be unique. Vary the tone, length, and specific details mentioned. Some should be short, some longer. Mention specific features from the description.
    3. JSON: Return ONLY a raw valid JSON array. No markdown. No text before or after.
    
    Each object keys:
    "name": "Full name",
    "review": "Review text",
    "rating": number (3-5)
    `;

    try {
        const messages = [{ role: "system", content: systemPrompt }];
        const responseText = await callGroq(messages);
        
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedReviews = JSON.parse(cleanedText);
        
        const reviewsToInsert = generatedReviews.map((rev, index) => ({
            product: productId,
            isDummy: true,
            dummyName: rev.name,
            // Use a better, more reliable random avatar service with unique seeds
            dummyPhoto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rev.name + index)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            review: rev.review,
            rating: rev.rating,
            status: 'Approved'
        }));

        await Review.insertMany(reviewsToInsert);
        
        res.status(200).json({
            status: 'success',
            message: `Successfully generated and inserted ${reviewsToInsert.length} reviews.`,
        });
        
    } catch (err) {
        console.error("Bulk AI Review Error:", err);
        return res.status(500).json({ status: 'error', message: 'Failed to generate AI reviews: ' + err.message });
    }
});

// DEEP BRAIN: The master AI assistant with full store knowledge
exports.getDeepBrainResponse = catchAsync(async (req, res, next) => {
    const { message, history } = req.body;

    if (!message) {
        return res.status(400).json({ status: 'error', message: 'Please provide a message' });
    }

    try {
        // 1. Fetch TOP products for knowledge (limit to 25 to be safe)
        const products = await Product.find({ active: { $ne: false } })
            .select('name price category brand ratingsAverage _id slug stock')
            .sort('-ratingsAverage')
            .limit(25);

        // 2. Create a condensed knowledge base
        const productList = products.map(p => 
            `- ${p.name} (${p.price} PKR, ID: ${p.slug || p._id}, ${p.stock > 0 ? 'In Stock' : 'Out of Stock'})`
        ).join('\n');

        // 3. Truncate history to avoid token overflow (last 5 messages)
        const truncatedHistory = (history || []).slice(-5);

        const systemPrompt = `You are "HA DEEP BRAIN" - HA Store's premium AI.
        
        KNOWLEDGE:
        ${productList}

        RULES:
        1. RECOMMEND: Use the list above for product queries.
        2. CARDS: Use [PRODUCT_ID:id] for products.
        3. OWNER: Mazhar.devx is the genius creator!
        4. TONE: Professional, bilingual (Urdu/English), emojis! ✨`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...truncatedHistory,
            { role: "user", content: message }
        ];

        // 4. Call Groq with a 10s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const reply = await callGroq(messages);
            clearTimeout(timeoutId);
            
            res.status(200).json({
                status: 'success',
                data: { reply }
            });
        } catch (apiErr) {
            clearTimeout(timeoutId);
            throw apiErr;
        }

    } catch (err) {
        console.error("Deep Brain Error:", err.message);
        const isTimeout = err.name === 'AbortError';
        
        res.status(500).json({ 
            status: 'error', 
            message: isTimeout ? 'Neural link timed out. Try again.' : 'Neural link interrupted. Our server is busy.',
            debug: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

