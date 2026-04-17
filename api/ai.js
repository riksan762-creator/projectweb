export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    // Header wajib 2026 agar tidak kena blokir CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message, imageBase64 } = req.body;

        // Validasi API Key
        if (!apiKey) {
            return res.status(200).json({
                candidates: [{ content: { parts: [{ text: "Waduh Bos, API Key Groq belum dipasang di Vercel!" }] } }]
            });
        }

        // --- PEMILIHAN MODEL 2026 ---
        // Jika ada gambar, kita coba pakai model vision yang masih tersedia.
        // Jika teks saja, pakai Llama 3.3 70B (Terbaik di kelasnya).
        let modelId = "llama-3.3-70b-versatile"; 
        let contentArray = [];

        // 1. Masukkan Teks
        contentArray.push({
            type: "text",
            text: message || "Jelaskan apa yang kamu lihat di gambar ini."
        });

        // 2. Masukkan Gambar jika ada (Format API 2026)
        if (imageBase64) {
            modelId = "llama-3.2-90b-vision-preview"; // Menggunakan versi 90B yang lebih stabil di 2026
            contentArray.push({
                type: "image_url",
                image_url: { url: imageBase64 }
            });
        }

        // --- FETCH KE ENDPOINT GROQ V1 ---
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
                        content: "Kamu adalah Riksan AI, asisten cerdas buatan Riksan. Kamu sangat ahli dalam menganalisis data dan gambar. Jawab dengan gaya santai tapi berkelas." 
                    },
                    { role: "user", content: contentArray }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();

        // --- HANDLING RESPON ---
        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        } else {
            // Jika model Vision sedang gangguan/decommissioned lagi
            const errorMsg = data.error?.message || "Terjadi kesalahan pada model API.";
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: `Gagal respon: ${errorMsg}` }] }
                }]
            });
        }

    } catch (error) {
        res.status(500).json({ error: "Server Error: " + error.message });
    }
}
