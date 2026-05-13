const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config({ path: 'config.env' });

const callGroq = async (messages) => {
    try {
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
            console.error("Groq Error Data:", data);
            throw new Error(data.error?.message || "Groq API error");
        }
        return data.choices[0].message.content;
    } catch (err) {
        console.error("Fetch Error:", err.message);
        throw err;
    }
};

const test = async () => {
    console.log("Testing Groq with key:", process.env.GROQ_API_KEY ? "PRESENT" : "MISSING");
    try {
        const reply = await callGroq([{ role: "user", content: "Hi" }]);
        console.log("Reply:", reply);
    } catch (e) {
        console.log("Test Failed");
    }
};

test();
