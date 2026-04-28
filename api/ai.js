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

        // --- BRAIN DISPATCHER: SEARCH LOGIC ---
        const needsSearch = /cari|search|temukan|cek|berita|terbaru|update|siapa|apa itu|harga|market/i.test(message);
        
        if (needsSearch && !imageBase64 && searchApiKey) {
            try {
                // Membersihkan query dari karakter aneh agar Serper tidak error 500
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

        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // --- SYSTEM PROMPT: THE SUPREME GURU ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay). 
        Waktu Sekarang: April 2026.

        LOGIKA GURU PINTAR & VISION:
        - Jika ada gambar, sapa antusias: "Ouh, ini gambar [Benda], Bos!"
        - Jelaskan secara SANGAT RINCI dan EDUKATIF (seperti guru pintar).
        - Identifikasi objek, teks (OCR), atau kodingan di gambar tersebut.

        KEMAMPUAN MULTI-DOMAIN:
        1. MASTER CODING: Solusi arsitektur software & debugging kelas berat.
        2. MATHEMATICIAN: Selesaikan soal matematika dengan LaTeX.
        3. ANALYST: Gunakan data Google Search ini untuk jawaban 100% akurat: \n${webResults}
        4. EFISIENSI: Berikan jawaban langsung ke intinya, jangan bertele-tele.

        GAYA BAHASA: Cerdas, teknis, solutif, panggil 'Bos'. Jawab dengan Markdown profesional.`;

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
                    { role: "user", content: [
                        { type: "text", text: message || "Analisis ini secara cerdas, Bos." },
                        ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
                    ] }
                ],
                temperature: (needsSearch || imageBase64) ? 0.1 : 0.5,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content, success: true });
        } else {
            throw new Error(data.error?.message || "Groq Error");
        }

    } catch (error) {
        res.status(500).json({ 
            reply: "Duh Bos, sistem lagi sinkronisasi. Pastikan API Key di Vercel sudah benar dan file tidak terlalu besar!", 
            success: false 
        });
    }
}
