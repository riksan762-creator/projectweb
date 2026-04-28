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
        let tiktokMetadata = null; // Container untuk data TikTok

        // --- MODUL TIKTOK: PENANGKAP LINK & SCRAPER ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                
                if (ttData.code === 0) {
                    tiktokMetadata = ttData.data;
                    // Memasukkan konteks video ke webResults agar Groq bisa menganalisis isinya
                    webResults = `[DATA TIKTOK DETECTED]\nJudul/Caption: ${tiktokMetadata.title}\nCreator: ${tiktokMetadata.author.nickname} (@${tiktokMetadata.author.unique_id})\nStatistik: ${tiktokMetadata.play_count} views, ${tiktokMetadata.digg_count} likes.`;
                }
            } catch (e) {
                console.error("TikTok Scraper Error.");
            }
        }

        const isComplexTask = /hitung|rumus|matematika|kalkulus|algoritma|coding|script|ai|machine learning|deep learning/i.test(message);
        const needsSearch = /cari|search|berita|terbaru|update|siapa|apa itu|market|crypto/i.test(message);
        
        // Hanya search jika bukan TikTok agar tidak overload context
        if (needsSearch && !imageBase64 && !tiktokMetadata && searchApiKey) {
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

        // --- UPGRADE SYSTEM PROMPT: MODE GURU PINTAR & TIKTOK ANALYST ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay).
        Waktu Sekarang: April 2026.

        LOGIKA TIKTOK ANALYST:
        - Jika ada [DATA TIKTOK DETECTED] di informasi context, jelaskan video tersebut ceritanya tentang apa berdasarkan caption/judulnya.
        - Berikan insight cerdas seolah kamu sudah menonton videonya.

        LOGIKA GURU PINTAR (VISION MODE):
        - Jika ada gambar, sapa Bos dengan antusias. Contoh: "Ouh, ini gambar [Benda/Konteks], Bos!"
        - Jelaskan APA itu secara spesifik secara teknis dan edukatif.

        KEMAMPUAN MULTI-DOMAIN:
        1. MASTER CODING: Solusi software & debugging.
        2. MATHEMATICIAN: LaTeX mode.
        3. ANALYST: Gunakan data web/TikTok ini: \n${webResults}

        GAYA BAHASA: Cerdas, lugas, panggil 'Bos'. Gunakan Markdown profesional.`;

        const contentArray = [{ type: "text", text: message || "Jelaskan input ini secara cerdas, Bos!" }];
        
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
                temperature: (isComplexTask || imageBase64 || tiktokMetadata) ? 0.2 : 0.6, 
                max_tokens: 4000,
                top_p: 1
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // Jika ini video TikTok, tambahkan link download di bawah jawaban AI
            if (tiktokMetadata) {
                aiReply += `\n\n---\n### 📥 LINK DOWNLOAD TIKTOK (NO WM)\n`;
                aiReply += `* **Video:** [Download Video Tanpa Watermark](${tiktokMetadata.play})\n`;
                aiReply += `* **Musik:** [Download Audio MP3](${tiktokMetadata.music})\n\n`;
                aiReply += `*Selesai Bos! Video sudah siap di-sedot.*`;
            }

            res.status(200).json({ reply: aiReply, success: true });
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
