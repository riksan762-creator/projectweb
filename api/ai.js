export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!apiKey) {
        return res.status(200).json({ reply: "Bos, API Key Groq belum dipasang di Vercel!" });
    }

    try {
        const { message } = req.body;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                // Model Llama 3.3 70B: Paling pintar dan setara ChatGPT-4o
                model: "llama-3.3-70b-versatile",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI (Llama 3.3 Engine). Pemilik: Riksan (CTO SawargiPay). Jawab dengan gaya asisten profesional tapi santai, panggil 'Bos'. Berikan jawaban yang cerdas ala ChatGPT." 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content });
        } else {
            res.status(200).json({ reply: "Duh Bos, Groq lagi pusing. Coba lagi ya!" });
        }

    } catch (error) {
        res.status(500).json({ reply: "Error Groq: " + error.message });
    }
}
