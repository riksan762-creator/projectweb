export const config = {
    maxDuration: 60, 
};

export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const searchApiKey = process.env.SERPER_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;
        let webResults = "";

        // --- 1. SEARCH MODULE DENGAN PROTEKSI ---
        const needsSearch = /cari|search|temukan|cek|berita|terbaru|update|siapa|apa itu|harga|market/i.test(message);
        
        if (needsSearch && !imageBase64 && searchApiKey) {
            try {
                // Bersihkan query dari instruksi tambahan agar Serper enteng
                const query = message.split(' ').slice(0, 10).join(' '); 
                
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: query, gl: "id", hl: "id", num: 4 }),
                    signal: AbortSignal.timeout(5000) // Maksimal nunggu Google 5 detik
                });

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    webResults = searchData.organic?.map(s => `[${s.title}]: ${s.snippet}`).join("\n") || "";
                }
            } catch (e) {
                console.log("Search skipped or timeout.");
                webResults = "Gagal mengambil data real-time, gunakan basis data internal.";
            }
        }

        // --- 2. SELEKSI MODEL (STABLE VERSION) ---
        // Llama-3.2-11b jauh lebih stabil buat Vercel daripada 90b
        const modelId = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay). April 2026.

        KEMAMPUAN:
        - VISION: Jika ada gambar, sapa "Ouh, ini gambar [Benda], Bos!" dan jelaskan detail sebagai Guru Pintar.
        - MASTER CODING: Solusi arsitektur & debugging.
        - MATHEMATICIAN: LaTeX mode.
        - ANALYST: Gunakan data ini: ${webResults}

        GAYA: Cerdas, teknis, panggil 'Bos'. Jawab efisien.`;

        // --- 3. CONSTRUCT MESSAGES ---
        const content = [];
        content.push({ type: "text", text: message || "Jelaskan dengan pintar, Bos." });
        if (imageBase64) {
            content.push({ type: "image_url", image_url: { url: imageBase64 } });
        }

        // --- 4. FETCH KE GROQ ---
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
                    { role: "user", content: content }
                ],
                temperature: 0.2, // Rendah biar gak halusinasi
                max_tokens: 2500
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content, success: true });
        } else {
            throw new Error(data.error?.message || "Groq Error");
        }

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ 
            reply: "Duh Bos, saraf pusat (Server) overload lagi. Coba kirim ulang pesan Bos tanpa gambar kalau mau search, atau tunggu 10 detik!", 
            success: false 
        });
    }
}
