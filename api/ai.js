export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;

        // Jika ada gambar, kita coba pakai model vision terbaru yang biasanya masih aktif
        // Jika llama-3.2-11b-vision-preview mati, kita pakai model fallback
        const modelToUse = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        let payload;
        if (imageBase64) {
            // Format Multimodal (Teks + Gambar)
            payload = {
                model: modelToUse,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: message || "Jelaskan gambar ini, Bos!" },
                            { type: "image_url", image_url: { url: imageBase64 } }
                        ]
                    }
                ]
            };
        } else {
            // Format Teks Biasa
            payload = {
                model: modelToUse,
                messages: [{ role: "user", content: message }]
            };
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        } else {
            // Jika Vision Groq benar-benar mati total di akun kamu, kita kasih pesan yang jelas
            const errorInfo = data.error?.message || "Model vision sedang maintenance.";
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: `Waduh Bos, fitur gambar Groq bilang: ${errorInfo}. Coba kirim teks aja dulu ya!` }] }
                }]
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
