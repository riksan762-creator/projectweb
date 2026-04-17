export default async function handler(req, res) {
    // 1. Ambil API Key dari Environment Variable Vercel
    const apiKey = process.env.GROQ_API_KEY;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // 2. Ambil data dari app.js (support JSON)
        const { message, imageBase64 } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ error: "Pesan kosong euy!" });
        }

        // 3. Tentukan model (Gunakan llama-3.3-70b untuk kualitas terbaik)
        const modelName = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

        // 4. Susun Payload sesuai dokumentasi Groq
        const content = [];
        content.push({ type: "text", text: message || "Jelaskan gambar ini." });
        
        if (imageBase64) {
            content.push({
                type: "image_url",
                image_url: { url: imageBase64 }
            });
        }

        // 5. Eksekusi Fetch ke Groq
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI, asisten pribadi Riksan (CTO SawargiPay). Jawablah dengan cerdas, solutif, dan gaya bahasa profesional yang ramah." 
                    },
                    { role: "user", content: content }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();

        // 6. Format Respon yang Dibutuhkan app.js kamu
        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        } else {
            // Jika ada error dari Groq (Misal: API Key Salah/Limit)
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: `Error: ${data.error?.message || "Gagal mendapatkan respon."}` }] }
                }]
            });
        }

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error: " + error.message });
    }
}
