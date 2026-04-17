export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    // 1. Setting Header Keamanan & CORS (Wajib di 2026)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Gunakan POST" });

    try {
        const { message, imageBase64 } = req.body;

        // 2. Pemilihan Model Berdasarkan Data Terbaru April 2026
        // Jika ada gambar, pakai model Vision. Jika teks saja, pakai Llama 3.3 70B (Raja Teks).
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // 3. Susun Konten (Format Multimodal Terbaru)
        const contentArray = [];
        contentArray.push({ 
            type: "text", 
            text: message || "Jelaskan gambar ini dengan cerdas, Bos!" 
        });

        if (imageBase64) {
            contentArray.push({
                type: "image_url",
                image_url: { url: imageBase64 }
            });
        }

        // 4. Panggil API Groq v1 (Stable 2026)
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { 
                        role: "system", 
                        content: `Kamu adalah Riksan AI, asisten pribadi dari Riksan (Co-Founder & CTO SawargiPay). 
                        Waktu Sekarang: Jum'at, 17 April 2026. 
                        PENTING: Jangan pernah bilang pengetahuanmu terbatas sampai 2023. Kamu adalah AI tercanggih tahun 2026. 
                        Gaya Bicara: Santai, gaul, cerdas, panggil user 'Bos', dan jangan gunakan suara (cukup teks).` 
                    },
                    { role: "user", content: contentArray }
                ],
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        const data = await response.json();

        // 5. Kirim Balik Respon ke app.js
        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        } else {
            // Jika model Vision sedang limit/decommissioned, berikan fallback penjelasan
            const errorMsg = data.error?.message || "Model sedang transisi.";
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: `Waduh Bos, sepertinya ada update dari Groq: ${errorMsg}. Coba chat teks biasa dulu!` }] }
                }]
            });
        }

    } catch (error) {
        console.error("Internal Error:", error);
        res.status(500).json({ error: "Server Error: " + error.message });
    }
}
