export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                // Tetap pakai model dewa biar kenceng
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { 
                        role: "system", 
                        content: "Hari ini adalah Jumat, 17 April 2026. Kamu adalah Riksan AI v2.0 yang ditenagai oleh Groq Llama 3.3. Pemilik: Riksan (CTO SawargiPay). Jawab dengan gaya asisten digital premium, cerdas, santai, dan panggil 'Bos'. Kamu tahu sekarang tahun 2026." 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content });
        } else {
            res.status(200).json({ reply: "Aduh Bos, respon Groq kosong nih." });
        }

    } catch (error) {
        res.status(200).json({ reply: "Ada kendala teknis, Bos: " + error.message });
    }
}
