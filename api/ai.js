export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message, imageBase64 } = req.body;

        // Gunakan groq/compound untuk browsing internet (Real-time 2026)
        // Jika ada gambar, pakai llama-3.2-90b-vision-preview
        const modelTarget = imageBase64 ? "llama-3.2-90b-vision-preview" : "groq/compound";

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
                        content: `Kamu adalah Riksan AI v2.0 (April 2026). 
                        Pemilikmu: Riksan (CTO SawargiPay).
                        Tugas: Gunakan kemampuan browsing untuk info terbaru. 
                        JANGAN PERNAH bilang data terbatas sampai 2023. 
                        Gaya: Santai, cerdas, panggil 'Bos'. Jawab HANYA teks.` 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.3
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        } else {
            res.status(200).json({
                candidates: [{ content: { parts: [{ text: "Gagal ambil data terbaru, Bos. Coba lagi!" }] } }]
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
