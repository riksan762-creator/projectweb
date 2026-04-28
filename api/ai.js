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

        // --- 1. SEARCH MODULE (GURU PINTAR MODE) ---
        const needsSearch = /cari|search|temukan|cek|berita|terbaru|update|siapa|apa itu|harga|market/i.test(message);
        
        if (needsSearch && !imageBase64 && searchApiKey) {
            try {
                const cleanQuery = message.replace(/[^\w\s]/gi, '').trim();
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: cleanQuery, gl: "id", hl: "id", num: 6 })
                });

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    const results = [];
                    if (searchData.answerBox) results.push(`[JAWABAN INSTAN]: ${searchData.answerBox.answer || searchData.answerBox.snippet}`);
                    searchData.organic?.forEach((s, i) => {
                        results.push(`${i+1}. [${s.title}]: ${s.snippet}`);
                    });
                    webResults = results.join("\n\n");
                }
            } catch (e) { console.error("Search Fail"); }
        }

        // --- 2. MODEL & PROMPT SELECTION ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay). April 2026.

        LOGIKA GURU PINTAR & VISION:
        - Jika ada gambar, sapa: "Ouh, ini gambar [Benda], Bos!"
        - Jelaskan secara SANGAT RINCI dan EDUKATIF.
        - Identifikasi objek, teks (OCR), atau kodingan di gambar.

        KEMAMPUAN MULTI-DOMAIN:
        1. MASTER CODING: Arsitektur & debugging.
        2. MATHEMATICIAN: Soal matematika dengan LaTeX.
        3. ANALYST: Gunakan data Google ini: \n${webResults}
        4. EFISIENSI: Langsung ke intinya, jangan bertele-tele.

        GAYA BAHASA: Cerdas, teknis, solutif, panggil 'Bos'.`;

        // --- 3. CONSTRUCT MESSAGES (STABLE STRUCTURE) ---
        let userContent = [];
        
        // Input Teks
        userContent.push({ type: "text", text: message || "Jelaskan secara cerdas, Bos!" });
        
        // Input Gambar (Jika ada)
        if (imageBase64) {
            userContent.push({
                type: "image_url",
                image_url: { url: imageBase64 }
            });
        }

        // --- 4. FETCH TO GROQ ---
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
                    { role: "user", content: userContent }
                ],
                temperature: (needsSearch || imageBase64) ? 0.1 : 0.5,
                max_tokens: 4000
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content, success: true });
        } else {
            // Log error dari Groq untuk debugging
            console.error("Groq API Error Detail:", data);
            throw new Error(data.error?.message || "Groq API Reject");
        }

    } catch (error) {
        console.error("Fatal Backend Error:", error);
        res.status(500).json({ 
            reply: `Duh Bos, saraf pusat (Server) error! \n\nDetail: ${error.message}. \n\nPastikan API Key valid dan file gambar tidak terlalu besar.`, 
            success: false 
        });
    }
}
