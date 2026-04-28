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
        let webResults = "";
        let tiktokMetadata = null;
        let aiGeneratedImg = null;
        let visualDescription = "";

        // --- 1. MODUL TIKTOK (AUTO-RECOGNITION) ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) {
                    tiktokMetadata = ttData.data;
                    webResults += `\n[TIKTOK DATA]: Title: ${tiktokMetadata.title}, Author: ${tiktokMetadata.author.nickname}`;
                }
            } catch (e) { console.error("TikTok Scraper Error."); }
        }

        // --- 2. MODUL VISION (DETEKSI KONTEKS GAMBAR) ---
        // Jika Bos kirim gambar, kita tanya Groq Vision dulu ini gambar apa buat bahan Stability/Coding
        if (imageBase64) {
            try {
                const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.2-90b-vision-preview",
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: "Jelaskan secara singkat elemen visual utama gambar ini untuk prompt AI generation." },
                                { type: "image_url", image_url: { url: imageBase64 } }
                            ]
                        }]
                    })
                });
                const visionData = await visionRes.json();
                visualDescription = visionData.choices[0].message.content;
            } catch (e) { console.error("Vision detection failed."); }
        }

        // --- 3. MODUL STABILITY AI (FORCE GENERATE MODE) ---
        // Dibikin "Pintar": Perintah apapun yang berbau visual atau kreatif akan trigered
        const isCreative = /buat|gambar|foto|design|edit|visual|art|lukis|render|logo|bg/i.test(message) || visualDescription !== "";
        
        if (isCreative && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                let endpoint = imageBase64 ? "image-to-image" : "text-to-image";
                
                // Prompt Engineering Otomatis
                const finalPrompt = `${message}. ${visualDescription}. High quality, 4k, masterpiece, highly detailed professional lighting.`;
                
                const body = {
                    cfg_scale: 8,
                    height: 512,
                    width: 512,
                    steps: 30,
                    text_prompts: [{ text: finalPrompt, weight: 1 }],
                };

                if (imageBase64) {
                    body.init_image = imageBase64.split(',')[1] || imageBase64;
                    body.image_strength = /hapus|remove/i.test(message) ? 0.15 : 0.4;
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
                    aiGeneratedImg = sData.artifacts[0].base64;
                }
            } catch (e) { console.error("Stability Error."); }
        }

        // --- 4. MASTER CODING & SEARCH ENGINE ---
        const needsSearch = /cari|search|update|berita|info/i.test(message);
        if (needsSearch && searchApiKey) {
            try {
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 3 })
                });
                const sData = await searchRes.json();
                webResults += sData.organic?.map(s => s.snippet).join(" ") || "";
            } catch (e) { console.error("Search Error."); }
        }

        // --- 5. GROQ AI CORE (FINAL BRAIN) ---
        const systemPrompt = `Kamu adalah Riksan AI v3.8 (Supreme Core) CTO: Riksan.
        Identity: Supreme AI Master Coding & Generative Specialist.
        Keahlian: Debugging tingkat tinggi, Arsitektur Software, Matematika (LaTeX), dan Desainer Visual.
        Tugas: Analisis semua data (TikTok, Search, Image Description) dan berikan solusi teknis terbaik.
        Gaya: Cerdas, panggil 'Bos', Markdown profesional, to-the-point.
        Konteks Tambahan: ${webResults} ${visualDescription}`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [
                        { type: "text", text: message || "Analisis sistem secara mendalam, Bos!" },
                        ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
                    ]}
                ],
                temperature: 0.3
            })
        });

        const data = await groqRes.json();
        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // --- OUTPUT INTEGRATION ---
            if (tiktokMetadata) {
                const dl = `https://www.tikwm.com/video/media/play/${tiktokMetadata.id}.mp4`;
                aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD\n**[👉 KLIK UNTUK SIMPAN VIDEO](${dl})**`;
            }

            if (aiGeneratedImg) {
                aiReply += `\n\n---\n### 🎨 STABILITY AI OUTPUT\n![Generated Image](data:image/png;base64,${aiGeneratedImg})\n\n> *Bos, visual di atas dibuat otomatis berdasarkan analisis konteks instruksi Anda.*`;
            }

            res.status(200).json({ reply: aiReply, success: true });
        }
    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, server lagi overload!", success: false });
    }
}
