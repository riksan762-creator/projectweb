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

        // --- 1. SEARCH MODULE (GURU PINTAR) ---
        const needsSearch = /cari|search|temukan|cek|berita|terbaru|update|siapa|apa itu|harga/i.test(message);
        
        if (needsSearch && !imageBase64 && searchApiKey) {
            try {
                const cleanQuery = message.replace(/[^\w\s]/gi, '').trim();
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: cleanQuery, gl: "id", hl: "id", num: 5 })
                });
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    webResults = searchData.organic?.map((s, i) => `${i+1}. [${s.title}]: ${s.snippet}`).join("\n") || "";
                }
            } catch (e) { console.error("Search Fail"); }
        }

        // --- 2. SELEKSI MODEL ---
        // Jika ada gambar wajib pakai 11b-vision atau 90b-vision
        const modelId = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay). April 2026.
        
        LOGIKA GURU PINTAR & VISION:
        - Jika ada gambar, sapa antusias: "Ouh, ini gambar [Benda], Bos!"
        - Jelaskan secara SANGAT RINCI dan EDUKATIF (seperti guru pintar).
        - Identifikasi objek, teks (OCR), atau kodingan di gambar tersebut.

        KEMAMPUAN MULTI-DOMAIN:
        1. MASTER CODING: Solusi arsitektur & debugging kelas berat.
        2. MATHEMATICIAN: Selesaikan soal matematika dengan LaTeX.
        3. ANALYST: Gunakan data Google Search ini: \n${webResults}
        4. EFISIENSI: Berikan jawaban langsung ke intinya.

        GAYA BAHASA: Cerdas, teknis, solutif, panggil 'Bos'.`;

        // --- 3. FORMAT PAYLOAD (VERSI PALING STABIL) ---
        const messages = [
            { role: "system", content: systemPrompt }
        ];

        if (imageBase64) {
            messages.push({
                role: "user",
                content: [
                    { type: "text", text: message || "Jelaskan gambar ini dengan pintar, Bos!" },
                    { type: "image_url", image_url: { url: imageBase64 } }
                ]
            });
        } else {
            messages.push({
                role: "user",
                content: message
            });
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
                messages: messages,
                temperature: (needsSearch || imageBase64) ? 0.1 : 0.6,
                max_tokens: 3000
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content, success: true });
        } else {
            // Ini akan muncul di logs Vercel kalau API Key ditolak
            console.error("Groq Reject:", data);
            throw new Error(data.error?.message || "Groq Error");
        }

    } catch (error) {
        console.error("Fatal Error:", error);
        res.status(500).json({ 
            reply: "Duh Bos, saraf pusat error! " + (error.message.includes("401") ? "API Key Bos salah/expired." : "Server lagi sesak napas."), 
            success: false 
        });
    }
}
