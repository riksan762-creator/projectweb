export default async function handler(req, res) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // Ambil 'message' untuk pesan baru, dan 'history' untuk ingatan masa lalu
        const { message, history = [] } = req.body;

        // Susun pesan untuk Groq: System + History + Message terbaru
        const messages = [
            { 
                role: "system", 
                content: `Anda adalah Riksan AI Core v3.3, AI Agent premium milik Riksan (Co-Founder & CTO SawargiPay). 
                Karakter: Cerdas, teknis, profesional, dan memiliki ingatan yang kuat. 
                Tugas: Membantu Riksan dalam urusan teknologi, bisnis SawargiPay, dan percakapan harian secara produktif. 
                Format: Selalu gunakan Markdown agar tampilan chat di web terlihat mewah.` 
            },
            ...history, // Ini yang bikin AI nyambung (ingat obrolan sebelumnya)
            { role: "user", content: message }
        ];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: messages,
                temperature: 0.6,
                max_tokens: 2048, // Lebih besar agar jawaban teknis tidak terpotong
                top_p: 1
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content });
        } else {
            throw new Error("Invalid response from Groq");
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ reply: "Aduh Bos, sistem otaknya lagi overheat. Coba tanya lagi ya!" });
    }
}
