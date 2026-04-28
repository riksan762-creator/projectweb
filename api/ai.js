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

        // --- BRAIN DISPATCHER: SEARCH LOGIC UPGRADED ---
        // Menambahkan trigger kata perintah yang lebih luas
        const needsSearch = /cari|search|temukan|cek|berita|terbaru|update|siapa|apa itu|market|crypto|harga|perbandingan/i.test(message);
        
        if (needsSearch && !imageBase64 && searchApiKey) {
            try {
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { 
                        "X-API-KEY": searchApiKey, 
                        "Content-Type": "application/json" 
                    },
                    body: JSON.stringify({ 
                        q: message, 
                        gl: "id", 
                        hl: "id", 
                        num: 8, // Ambil 8 data teratas untuk akurasi maksimal
                        autocorrect: true,
                        page: 1
                    })
                });

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    // Gabungkan Organic Results, Knowledge Graph, dan Answer Box jika ada
                    const results = [];
                    if (searchData.answerBox) results.push(`[JAWABAN LANGSUNG]: ${searchData.answerBox.answer || searchData.answerBox.snippet}`);
                    
                    searchData.organic?.forEach((s, i) => {
                        results.push(`${i+1}. [${s.title}]: ${s.snippet}`);
                    });
                    
                    webResults = results.join("\n\n");
                }
            } catch (e) {
                console.error("Search module error.");
            }
        }

        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // --- SYSTEM PROMPT: MODE SUPREME ANALYST ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay). April 2026.

        LOGIKA SEARCH AKURAT & EFISIEN:
        - Gunakan data web terbaru ini sebagai referensi utama: \n${webResults}
        - JANGAN mengarang data jika ada hasil search. Prioritaskan fakta dari hasil pencarian tersebut.
        - Jika Bos minta "Carikan", berikan perbandingan atau rangkuman yang sangat padat dan efisien (to-the-point).
        - Sertakan sumber jika informasi tersebut sangat krusial.

        LOGIKA GURU PINTAR (VISION MODE):
        - Jika ada gambar, sapa "Ouh, ini gambar [Benda/Konteks], Bos!"
        - Jelaskan secara detail, edukatif, dan teknis apa yang terlihat (OCR, Objek, Kode, Chart).

        KEMAMPUAN: Master Coding, Mathematician (LaTeX), AI Specialist.
        GAYA BAHASA: Cerdas, teknis, lugas, panggil 'Bos'.`;

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
                    { role: "user", content: [{ type: "text", text: message || "Jelaskan secara cerdas, Bos!" }] }
                ],
                // Temperature rendah untuk pencarian agar data akurat (faktual)
                temperature: (needsSearch || imageBase64) ? 0.2 : 0.6, 
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
            reply: "Duh Bos, saraf pusat (Server) lagi overload. Cek status SERPER_API_KEY dan GROQ_API_KEY di Vercel!", 
            success: false 
        });
    }
}
