const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
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

    // Construct context for the store assistant
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
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Groq API error");
        }

        res.status(200).json({
            status: 'success',
            data: {
                reply: data.choices[0].message.content
            }
        });
    } catch (err) {
        console.error("AI Error:", err.message, err.response?.data);
        res.status(500).json({
            status: 'error',
            message: 'AI Assistant is currently busy. Please try again later.'
        });
    }
});
