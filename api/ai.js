export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message, imageBase64 } = req.body;

        // Berdasarkan dokumen: llama-3.3-70b-versatile adalah model utama
        // Jika ada gambar, pakai model vision
        const modelTarget = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelTarget,
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI (CTO SawargiPay). Hari ini 17 April 2026. Gunakan analisis cerdas. Jawab santai, panggil 'Bos', dan jangan pakai suara." 
                    },
                    { role: "user", content: message }
                ],
                // Fitur baru di dokumen: Citation diaktifkan agar lebih akurat
                citation_options: "enabled", 
                temperature: 0.7,
                max_completion_tokens: 1024
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
