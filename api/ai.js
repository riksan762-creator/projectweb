export const config = {
    maxDuration: 60, 
};

export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const searchApiKey = process.env.SERPER_API_KEY;
    const stabilityKey = process.env.STABILITY_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;
        let aiGeneratedImg = null;
        let tiktokMetadata = null;
        let webResults = "";

        // --- 1. MODUL TIKTOK (TETAP ADA) ---
        const ttRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (ttRegex.test(message)) {
            try {
                const ttUrl = message.match(ttRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${ttUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) tiktokMetadata = ttData.data;
            } catch (e) { console.error("TT Error"); }
        }

        // --- 2. MODUL STABILITY AI (LOGIKA SINKRONISASI TOTAL) ---
        // Mendeteksi perintah gambar: "buatkan", "generate", "lukis", "gambar"
        const isGenTask = /buatkan|generate|gambar|lukis|edit/i.test(message);
        
        if (isGenTask && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                let endpoint = "text-to-image";
                
                // Prompt Engineering Otomatis agar hasil "Wah"
                const enhancedPrompt = `${message}, high resolution, 4k, cinematic lighting, masterpiece, ultra detailed`;

                const body = {
                    cfg_scale: 7,
                    height: 512,
                    width: 512,
                    steps: 35,
                    samples: 1,
                    text_prompts: [{ text: enhancedPrompt, weight: 1 }]
                };

                // Jika ada gambar (Image-to-Image / Edit / Hapus BG)
                if (imageBase64) {
                    endpoint = "image-to-image";
                    body.init_image = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
                    body.image_strength = 0.35; // Menjaga kemiripan asli
                }

                const sRes = await fetch(`https://api.stability.ai/v1/generation/${engineId}/${endpoint}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        Authorization: `Bearer ${stabilityKey}`,
                    },
                    body: JSON.stringify(body),
                });

                if (sRes.ok) {
                    const sData = await sRes.json();
                    if (sData.artifacts && sData.artifacts[0]) {
                        aiGeneratedImg = sData.artifacts[0].base64;
                        // Kasih tau Groq kalau gambar BERHASIL dibuat
                        webResults = "[SISTEM]: Stability AI sukses membuat gambar. Konfirmasi ke Bos Riksan.";
                    }
                }
            } catch (e) { console.error("Stability Error:", e); }
        }

        // --- 3. SEARCH & MASTER CODING (TETAP ADA) ---
        const needsSearch = /cari|search|berita|update/i.test(message);
        if (needsSearch && !aiGeneratedImg && searchApiKey) {
            try {
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 4 })
                });
                const sData = await searchRes.json();
                webResults = sData.organic?.map(s => `[${s.title}]: ${s.snippet}`).join("\n") || "";
            } catch (e) { console.error("Search Error"); }
        }

        // --- 4. GROQ ENGINE (BRAIN CENTER) ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
        const systemPrompt = `Kamu adalah Riksan AI v3.9 (Supreme Core). CTO: Riksan (SawargiPay). 
        Identity: dikembangkan oleh Riksan. April 2026.
        Gaya: Cerdas, lugas, panggil 'Bos'. 
        Tugas: Jika ada hasil gambar (${aiGeneratedImg ? 'ADA' : 'TIDAK'}), konfirmasi dengan bangga. 
        Keahlian Master Coding, Math (LaTeX), Vision tetap aktif.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [{ type: "text", text: message + "\n\n" + webResults }] }
                ],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // --- 5. FINAL OUTPUT MAPPING ---
            if (tiktokMetadata) {
                const ttLink = `https://www.tikwm.com/video/media/play/${tiktokMetadata.id}.mp4`;
                aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD\n**[👉 KLIK UNTUK SIMPAN VIDEO](${ttLink})**`;
            }

            if (aiGeneratedImg) {
                const finalImgUrl = `data:image/png;base64,${aiGeneratedImg}`;
                aiReply += `\n\n---\n### 🎨 HASIL KARYA AI (STABILITY)\n` +
                           `**[👉 KLIK DISINI UNTUK DOWNLOAD GAMBAR](${finalImgUrl})**\n\n` +
                           `> *Imajinasi Bos sudah saya wujudkan. Silakan di-download, Bos!*`;
            }

            res.status(200).json({ reply: aiReply, success: true });
        }
    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, saraf pusat overload! Cek API Key Stability atau Groq!", success: false });
    }
}
