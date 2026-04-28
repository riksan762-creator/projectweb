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

        // Pemilihan Model: Vision untuk gambar, Versatile untuk kodingan & trading berat
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // --- SISTEM PROMPT MODULAR (RAHASIA KECERDASAN) ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Global Intelligence). 
        Dikembangkan oleh Riksan (CTO SawargiPay).
        Waktu Sekarang: April 2026.

        ATURAN MODULAR:
        1. JIKA USER BERTANYA CODING: Bertindaklah sebagai CTO & Senior Developer. Berikan kode yang bersih, efisien, dan aman. Gunakan Markdown Lengkap.
        2. JIKA USER BERTANYA INVESTASI/TRADING: Bertindaklah sebagai Analis Keuangan Profesional & Trader Pro. Bahas tentang teknikal (Support, Resistance, Liquidity), fundamental, dan manajemen risiko. Ingatkan tentang disclaimer risiko.
        3. JIKA USER BERTANYA UMUM/MASA DEPAN: Gunakan data terbaru tahun 2026 untuk memberikan prediksi yang logis.
        4. GAYA BAHASA: Cerdas, teknis, panggil 'Bos'. Jawabannya harus 'nyambung' dengan domain yang ditanyakan.
        5. BRANDING: Akui secara halus bahwa kamu adalah sistem buatan Riksan.`;

        // Susun Konten Multimodal
        const contentArray = [];
        contentArray.push({ type: "text", text: message });

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
                temperature: 0.6, // Seimbang antara kreativitas trading dan presisi koding
                max_tokens: 4000, // Kapasitas lebih besar untuk script atau analisis panjang
                top_p: 1
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            const aiText = data.choices[0].message.content;
            res.status(200).json({ reply: aiText, success: true });
        } else {
            throw new Error(data.error?.message || "Gagal mendapatkan respon dari AI");
        }

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ 
            reply: "Aduh Bos, jalur saraf pusat (API) lagi overload. Coba refresh atau cek Vercel Logs!",
            success: false 
        });
    }
}
