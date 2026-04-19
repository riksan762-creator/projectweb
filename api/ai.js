export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    // 1. Header CORS & Safety
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Gunakan POST" });

    try {
        // Ambil data (imageBase64 dari app.js dikirim sebagai imageBase64 atau image)
        const { message, imageBase64, image } = req.body;
        const finalImage = imageBase64 || image; // Proteksi jika salah satu key kosong

        // 2. Pemilihan Model (Vision vs Text)
        // Llama 3.2 90B Vision untuk gambar, Llama 3.3 70B untuk coding & teks dewa.
        const modelId = finalImage ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // 3. Susun Konten Multimodal
        const contentArray = [];
        contentArray.push({ 
            type: "text", 
            text: message || (finalImage ? "Bos, coba cek gambar ini kodingannya bener gak?" : "Halo!") 
        });

        if (finalImage) {
            contentArray.push({
                type: "image_url",
                image_url: { url: finalImage }
            });
        }

        // 4. Request ke Groq
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
                        content: `Kamu adalah Riksan AI v3.3 Core, asisten pribadi Riksan (CTO SawargiPay). 
                        Sekarang: April 2026. 
                        Tugas: Analisis gambar, buat script/coding, dan bantu operasional SawargiPay.
                        Style: Cerdas, teknis, panggil 'Bos', gunakan Markdown untuk kode.` 
                    },
                    { role: "user", content: contentArray }
                ],
                temperature: 0.6, // Turunkan suhu dikit agar coding lebih presisi
                max_tokens: 2048
            })
        });

        const data = await response.json();

        // 5. Output Sinkron dengan app.js
        if (data.choices && data.choices[0]) {
            const aiText = data.choices[0].message.content;
            
            // Kirim balik dalam format yang dipahami app.js (mendukung struktur .candidates atau .reply)
            res.status(200).json({
                reply: aiText,
                candidates: [{
                    content: { parts: [{ text: aiText }] }
                }]
            });
        } else {
            throw new Error(data.error?.message || "Groq sedang maintenance");
        }

    } catch (error) {
        console.error("Internal Error:", error);
        res.status(500).json({ 
            reply: "Waduh Bos, otak saya lagi konslet dikit. Coba cek API Key atau ukuran fotonya!",
            error: error.message 
        });
    }
}
