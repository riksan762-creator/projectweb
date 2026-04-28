export const config = {
    maxDuration: 60, 
};

export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const searchApiKey = process.env.SERPER_API_KEY;
    const removeBgKey = process.env.REMOVE_BG_API_KEY; // Tambahkan key ini di Environment Variables Vercel

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;
        let webResults = "";
        let tiktokMetadata = null;
        let processedImage = null; // Container hasil remove background

        // --- 1. MODUL REMOVE BACKGROUND (FITUR BARU) ---
        const isRemoveBgTask = /hapus bg|bersihkan|remove bg|background/i.test(message);
        if (isRemoveBgTask && imageBase64 && removeBgKey) {
            try {
                // Membersihkan prefix base64 jika ada
                const pureBase64 = imageBase64.split(',')[1] || imageBase64;
                
                const rbRes = await fetch("https://api.remove.bg/v1.0/removebg", {
                    method: "POST",
                    headers: { "X-Api-Key": removeBgKey, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image_file_b64: pureBase64,
                        size: "auto",
                        format: "png"
                    })
                });

                if (rbRes.ok) {
                    const buffer = await rbRes.arrayBuffer();
                    processedImage = Buffer.from(buffer).toString('base64');
                }
            } catch (e) { console.error("Remove.bg Error."); }
        }

        // --- 2. MODUL TIKTOK (TETAP ADA) ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) {
                    tiktokMetadata = ttData.data;
                    webResults = `[TIKTOK]: ${tiktokMetadata.title} by ${tiktokMetadata.author.nickname}`;
                }
            } catch (e) { console.error("TikTok Scraper Error."); }
        }

        // --- 3. MODUL SEARCH & COMPLEX TASK (TETAP ADA) ---
        const isComplexTask = /hitung|rumus|matematika|kalkulus|algoritma|coding|script/i.test(message);
        const needsSearch = /cari|search|berita|terbaru|update/i.test(message);
        
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

        // --- 4. SYSTEM PROMPT (SUPREME CORE) ---
        const systemPrompt = `Kamu adalah Riksan AI v3.5 (Supreme Core). Dev: Riksan (CTO SawargiPay).
        Identity: April 2026.
        Logika Guru Pintar & Master Coding tetap aktif. 
        Jika gambar diproses (Remove BG), sapa Bos dan beritahu hasilnya sudah siap.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [{ type: "text", text: message || "Analisis ini, Bos." }, ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])] }
                ],
                temperature: 0.2,
                max_tokens: 3000
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // Output khusus TikTok (Force Download)
            if (tiktokMetadata) {
                const dl = `https://www.tikwm.com/video/media/play/${tiktokMetadata.id}.mp4`;
                aiReply += `\n\n### 📥 DOWNLOAD TIKTOK\n**[👉 SIMPAN KE GALERI](${dl})**`;
            }

            // Output khusus Remove.bg (Tampilkan Tombol Download Hasil)
            if (processedImage) {
                aiReply += `\n\n### 🖼️ HASIL PENGHAPUSAN BG\n`;
                aiReply += `**[👉 DOWNLOAD HASIL TRANSPARAN](data:image/png;base64,${processedImage})**\n`;
                aiReply += `\n> Background sudah bersih, Bos! Tinggal pakai buat jualan di SawargiPay.`;
            }

            res.status(200).json({ reply: aiReply, success: true });
        } else {
            throw new Error("API error.");
        }

    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, server lagi pusing!", success: false });
    }
}
