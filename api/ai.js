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

        // --- 1. MODUL TIKTOK (MASTER MODE) ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) {
                    tiktokMetadata = ttData.data;
                    webResults = `[DATA TIKTOK DETECTED]\nJudul: ${tiktokMetadata.title}\nCreator: ${tiktokMetadata.author.nickname}`;
                }
            } catch (e) { console.error("TikTok Scraper Error."); }
        }

        // --- 2. MODUL STABILITY AI (GENERATE & REMOVE BG) ---
        // Logika: Jika ada kata 'hapus bg' atau 'generate/buatkan'
        const isStabilityTask = /buatkan|gambar|generate|hapus bg|remove bg|edit|lukis/i.test(message);
        if (isStabilityTask && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                let endpoint = "text-to-image";
                const body = {
                    cfg_scale: 7,
                    height: 512,
                    width: 512,
                    steps: 30,
                    samples: 1,
                    text_prompts: []
                };

                // Jika user ingin hapus background lewat Stability (Image-to-Image)
                if (/hapus bg|remove bg|bersihkan/i.test(message) && imageBase64) {
                    endpoint = "image-to-image";
                    body.text_prompts.push({ text: "subject with white background, high quality, clean cut", weight: 1 });
                    body.init_image = imageBase64.split(',')[1] || imageBase64;
                    body.image_strength = 0.35; 
                } else {
                    // Mode Generate atau Edit biasa
                    body.text_prompts.push({ text: message, weight: 1 });
                    if (imageBase64) {
                        endpoint = "image-to-image";
                        body.init_image = imageBase64.split(',')[1] || imageBase64;
                        body.image_strength = 0.4;
                    }
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
            } catch (e) { console.error("Stability AI Error."); }
        }

        // --- 3. KEMAMPUAN SEARCH & CODING (TETAP ADA) ---
        const needsSearch = /cari|search|berita|update|market|crypto/i.test(message);
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

        // --- 4. GROQ AI ENGINE (SINKRONISASI) ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
        const systemPrompt = `Kamu adalah Riksan AI v3.8 (Supreme Core). CTO: Riksan (SawargiPay). 
        Identity: dikembangkan oleh Riksan. April 2026.
        Keahlian: Master Coding, Mathematician (LaTeX), dan AI Generative Specialist.
        Gaya Bahasa: Cerdas, panggil 'Bos', Markdown profesional.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [{ type: "text", text: message || "Analisis secara teknis, Bos!" }, ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])] }
                ],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // --- APPENDING MULTI-OUTPUTS ---
            if (tiktokMetadata) {
                const dl = `https://www.tikwm.com/video/media/play/${tiktokMetadata.id}.mp4`;
                aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD\n**[👉 KLIK DISINI UNTUK SIMPAN](${dl})**`;
            }

            if (aiGeneratedImg) {
                aiReply += `\n\n---\n### 🎨 STABILITY AI RESULT\n**[👉 DOWNLOAD HASIL GAMBAR](data:image/png;base64,${aiGeneratedImg})**\n`;
                aiReply += `\n> *Hasil pemrosesan gambar Stability AI sudah siap, Bos!*`;
            }

            res.status(200).json({ reply: aiReply, success: true });
        }
    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, saraf pusat overload!", success: false });
    }
}
