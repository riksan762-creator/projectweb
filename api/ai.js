export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Gunakan POST" });

    try {
        const { message, image, isVision } = req.body; // Sesuaikan dengan key dari app.js

        // Pilih Model: Vision untuk gambar, Versatile untuk teks berat/coding
        const modelId = isVision ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // Susun payload sesuai standar OpenAI/Groq Multimodal
        const contentArray = [];
        contentArray.push({ 
            type: "text", 
            text: message || (isVision ? "Analisis gambar ini secara mendalam, Bos!" : "Halo Riksan AI!") 
        });

        if (image) {
            contentArray.push({
                type: "image_url",
                image_url: { url: image } // Base64 dari frontend
            });
        }

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
                        content: `Kamu adalah Riksan AI v3.3 Core, asisten CTO SawargiPay. 
                        Waktu: 19 April 2026. 
                        Keahlian: Coding (Fullstack), Keamanan Jaringan, dan Vision Analysis.
                        Instruksi: Jika user minta script, berikan kode yang clean dalam markdown. 
                        Gaya: Profesional tapi santai, panggil user 'Bos'.` 
                    },
                    { role: "user", content: contentArray }
                ],
                temperature: 0.6, // Suhu rendah agar coding lebih akurat
                max_tokens: 2048
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            const aiReply = data.choices[0].message.content;
            
            // Format response agar app.js bisa langsung eksekusi TTS & Markdown
            res.status(200).json({
                reply: aiReply,
                modelUsed: modelId
            });
        } else {
            throw new Error(data.error?.message || "Groq API tidak merespon");
        }

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ reply: "Aduh Bos, otak AI saya lagi 'loading' kelamaan. Coba cek API Key di Vercel atau kecilin ukuran gambarnya!" });
    }
}
