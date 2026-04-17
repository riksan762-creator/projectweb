export default async function handler(req, res) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    // Header Keamanan & CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;

        // URL sesuai curl yang Bos kirim
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // DeepSeek-V3.2
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI. Pemilik: Riksan (CTO SawargiPay). Jawab dengan cerdas, santai, panggil 'Bos'. Gunakan data terbaru 2026. JANGAN PAKAI SUARA." 
                    },
                    { role: "user", content: message }
                ],
                stream: false
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ text: data.choices[0].message.content });
        } else {
            res.status(500).json({ error: "Respon DeepSeek kosong, Bos!" });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
