export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const searchApiKey = process.env.SERPER_API_KEY;

    // 1. Headers & CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;
        let webResults = "";

        // --- SMART SEARCH DISPATCHER ---
        // Deteksi apakah butuh data real-time 2026
        const needsSearch = /cari|search|berita|terbaru|harga|update|siapa|apa itu|market|crypto|saham/i.test(message);
        
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
                        num: 5 // Ambil 5 hasil biar lebih lengkap
                    })
                });

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    webResults = searchData.organic?.map(s => `[${s.title}]: ${s.snippet}`).join("\n\n") || "";
                    console.log("Search synced successfully.");
                }
            } catch (e) {
                console.error("Search module error, switching to internal brain.");
            }
        }

        // --- MODEL SELECTION (VISION VS VERSATILE) ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // --- SYSTEM PROMPT (CTO & ANALYST MODE) ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 Pro. 
        Identity: Developed by Riksan (CTO SawargiPay).
        Current Date: ${new Date().toLocaleDateString('id-ID')} (April 2026).

        CORE INSTRUCTIONS:
        1. VISION MODE: Jika ada input gambar, lakukan analisis objek, deteksi teks (OCR), dan konteks teknis secara mendalam. Jangan menebak, jelaskan apa yang terlihat.
        2. SEARCH MODE: Jika tersedia data web berikut, gunakan sebagai referensi utama: \n${webResults}
        3. MODULAR LOGIC: 
           - Pertanyaan Trading/Investasi: Gunakan analisis teknikal & fundamental.
           - Pertanyaan Coding: Berikan solusi arsitektur & kodingan bersih.
        4. GAYA BAHASA: Cerdas, lugas, panggil 'Bos'. Berikan jawaban yang 'Human-Like' tapi teknis.`;

        // Prepare Payload
        const contentArray = [{ type: "text", text: message || "Analisis ini, Bos." }];

        if (imageBase64) {
            contentArray.push({
                type: "image_url",
                image_url: { url: imageBase64 }
            });
        }

        // --- GROQ API SYNC ---
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
                temperature: 0.5, // Menjaga akurasi data trading & koding
                max_tokens: 4000,
                top_p: 0.9
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({ 
                reply: data.choices[0].message.content, 
                success: true 
            });
        } else {
            throw new Error(data.error?.message || "Groq API returned empty.");
        }

    } catch (error) {
        console.error("Fatal Backend Error:", error);
        res.status(500).json({ 
            reply: "Waduh Bos, saraf pusat (Groq/Serper) lagi overload. Cek API Key atau redeploy di Vercel!", 
            success: false 
        });
    }
}
