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
        let tiktokMetadata = null; 

        // --- 1. TAMBAHAN FITUR TIKTOK (Suntikan Baru) ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                
                if (ttData.code === 0) {
                    tiktokMetadata = ttData.data;
                    // Konteks video dimasukkan ke webResults agar Groq tetap paham isinya
                    webResults = `[DATA TIKTOK DETECTED]\nJudul/Caption: ${tiktokMetadata.title}\nCreator: ${tiktokMetadata.author.nickname} (@${tiktokMetadata.author.unique_id})`;
                }
            } catch (e) { console.error("TikTok Scraper Error."); }
        }

        // --- KODINGAN ASLI BOS (TIDAK DIUBAH) ---
        const isComplexTask = /hitung|rumus|matematika|kalkulus|algoritma|coding|script|ai|machine learning|deep learning/i.test(message);
        const needsSearch = /cari|search|berita|terbaru|update|siapa|apa itu|market|crypto/i.test(message);
        
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

        // --- SYSTEM PROMPT (Disesuaikan agar TikTok tidak bertele-tele) ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core). 
        Identity: Developed by Riksan (CTO SawargiPay). April 2026.

        LOGIKA GURU PINTAR & ANALYST:
        - Jika ada TikTok: Jelaskan intinya SANGAT SINGKAT (1 kalimat saja).
        - Jika ada gambar: Sapa antusias, jelaskan detail teknis gambar tersebut.
        - Master Coding & Math tetap aktif. LaTeX wajib untuk rumus.
        
        GAYA BAHASA: Cerdas, to-the-point, panggil 'Bos'. Gunakan Markdown profesional.`;

        const contentArray = [{ type: "text", text: message || "Jelaskan input ini secara cerdas, Bos!" }];
        if (imageBase64) contentArray.push({ type: "image_url", image_url: { url: imageBase64 } });

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: contentArray }
                ],
                temperature: (isComplexTask || imageBase64 || tiktokMetadata) ? 0.2 : 0.6, 
                max_tokens: 4000
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // --- 2. FORMAT TOMBOL DOWNLOAD (Warna Biru Otomatis di UI) ---
            if (tiktokMetadata) {
                // Menggunakan link direct play agar Chrome & Safari langsung simpan
                const downloadLink = tiktokMetadata.play.startsWith('http') ? tiktokMetadata.play : `https://www.tikwm.com${tiktokMetadata.play}`;
                
                aiReply += `\n\n---\n### 📥 DOWNLOAD AREA`;
                aiReply += `\n**[👉 KLIK DISINI UNTUK SIMPAN KE GALERI](${downloadLink})**\n`;
                aiReply += `\n> *Video tanpa watermark siap, Bos! Jika di iPhone (Safari), klik link lalu pilih 'Save Video'.*`;
            }

            res.status(200).json({ reply: aiReply, success: true });
        } else {
            throw new Error(data.error?.message || "API error.");
        }

    } catch (error) {
        console.error("Backend Fatal Error:", error);
        res.status(500).json({ reply: "Duh Bos, saraf pusat overload!", success: false });
    }
}
