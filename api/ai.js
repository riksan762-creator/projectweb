export default async function handler(req, res) {
    // 1. Ambil API Key dari Vercel Environment Variables
    const apiKey = process.env.GROQ_API_KEY;

    // Setting Header agar tidak diblokir browser (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Gunakan POST" });

    if (!apiKey) {
        return res.status(200).json({ 
            candidates: [{ content: { parts: [{ text: "Waduh Bos, GROQ_API_KEY belum dipasang di Vercel euy!" }] } }] 
        });
    }

    try {
        // 2. Baca data dari app.js
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { message, imageBase64 } = body;

        // 3. Susun konten untuk model Vision
        const userContent = [];
        userContent.push({ type: "text", text: message || "Apa yang ada di gambar ini?" });

        if (imageBase64) {
            userContent.push({
                type: "image_url",
                image_url: { url: imageBase64 }
            });
        }

        // 4. Panggil API Groq (Pakai model 11B Vision yang paling stabil)
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.2-11b-vision-preview",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI, asisten pintar buatan Riksan. Kamu bisa melihat gambar dan bicara dalam Bahasa Indonesia yang santai tapi profesional." 
                    },
                    { role: "user", content: userContent }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        const data = await response.json();

        // 5. Kirim balik hasil ke Frontend
        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        } else {
            console.error("Groq Error:", data);
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: "Maaf Bos, Groq lagi pening. Coba lagi ya!" }] }
                }]
            });
        }

    } catch (error) {
        console.error("Server Crash:", error);
        res.status(500).json({ error: "Server Error: " + error.message });
    }
}
