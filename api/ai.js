export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    // 1. Headers & CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;

        // Pemilihan Model: Vision untuk gambar, Versatile untuk kodingan berat
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // Susun Konten Multimodal
        const contentArray = [];
        
        // Tambahkan instruksi spesifik agar output kodenya rapi
        const systemPrompt = `Kamu adalah Riksan AI v3.3 Core (CTO Mode). 
        Sekarang: April 2026. 
        Keahlian: Fullstack Coding, Matematika Diskrit, & Vision Analysis.
        Instruksi: 
        1. Gunakan Markdown LENGKAP untuk kode (contoh: \`\`\`javascript).
        2. Jika ada rumus matematika, gunakan format yang jelas.
        3. Gaya bicara: Cerdas, teknis, panggil 'Bos'.
        4. JANGAN potong jawaban (max_tokens tinggi).`;

        contentArray.push({ 
            type: "text", 
            text: message || "Analisis secara mendalam, Bos!" 
        });

        if (imageBase64) {
            contentArray.push({
                type: "image_url",
                image_url: { url: imageBase64 }
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
                    { role: "system", content: systemPrompt },
                    { role: "user", content: contentArray }
                ],
                temperature: 0.5, // Lebih rendah agar kodingan & logika matematikanya presisi
                max_tokens: 3000, // Ditingkatkan agar script panjang tidak terpotong
                top_p: 1
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            const aiText = data.choices[0].message.content;
            
            // Format response yang diharapkan app.js
            res.status(200).json({
                reply: aiText,
                success: true
            });
        } else {
            throw new Error(data.error?.message || "Gagal mendapatkan respon dari AI");
        }

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ 
            reply: "Waduh Bos, ada masalah di 'otak' server. Cek logs Vercel atau API Key!",
            success: false 
        });
    }
}
