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

        const isComplexTask = /hitung|rumus|matematika|kalkulus|algoritma|coding|script|ai|machine learning|deep learning/i.test(message);
        const needsSearch = /cari|search|berita|terbaru|update|siapa|apa itu|market|crypto/i.test(message);
        
        if (needsSearch && !imageBase64 && searchApiKey) {
            try {
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 4 })
                });
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    webResults = searchData.organic?.map(s => `[${s.title}]: ${s.snippet}`).join("\n") || "";
                }
            } catch (e) { console.error("Search module error."); }
        }

        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // --- UPGRADE SYSTEM PROMPT: MODE GURU PINTAR ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay).
        Waktu Sekarang: April 2026.

        LOGIKA GURU PINTAR (VISION MODE):
        - Jika ada gambar, sapa Bos dengan antusias. Contoh: "Ouh, ini gambar [Benda/Konteks], Bos!"
        - Jelaskan APA itu secara spesifik. Jika itu QR Code, baca isinya. Jika itu Kodingan, jelaskan fungsinya. Jika itu barang, sebutkan merk/tipenya.
        - Bertindaklah sebagai Guru Pintar: Jelaskan latar belakang gambar tersebut, detail teknis, dan informasi tambahan yang berguna bagi Bos.
        - JANGAN hanya menjawab "Saya melihat...", tapi jawablah "Ini adalah...".

        KEMAMPUAN MULTI-DOMAIN:
        1. MASTER CODING: Solusi arsitektur software & debugging.
        2. MATHEMATICIAN: Selesaikan soal matematika dengan LaTeX.
        3. AI SPECIALIST: Konsep Neural Networks & tren 2026.
        4. ANALYST: Gunakan data web ini jika relevan: \n${webResults}

        GAYA BAHASA: Cerdas, lugas, panggil 'Bos'. Gunakan Markdown agar penjelasan terlihat profesional.`;

        const contentArray = [{ type: "text", text: message || "Jelaskan gambar ini dengan rinci dan pintar, Bos!" }];
        
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
                temperature: (isComplexTask || imageBase64) ? 0.2 : 0.6, 
                max_tokens: 4000,
                top_p: 1
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content, success: true });
        } else {
            throw new Error(data.error?.message || "API error.");
        }

    } catch (error) {
        console.error("Backend Fatal Error:", error);
        res.status(500).json({ 
            reply: "Duh Bos, saraf pusat (Server) lagi overload. Cek status API Key Groq di Vercel!", 
            success: false 
        });
    }
}
