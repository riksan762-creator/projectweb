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

        // --- 1. MODUL TIKTOK (FORCE DOWNLOAD MODE) ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) {
                    tiktokMetadata = ttData.data;
                    webResults = `[TIKTOK DETECTED]: ${tiktokMetadata.title}`;
                }
            } catch (e) { console.error("TT Error"); }
        }

        // --- 2. MODUL STABILITY AI (GENERATE & EDIT PHOTO) ---
        const isStabilityTask = /buatkan|generate|gambar|hapus bg|edit|lukis|bersihkan/i.test(message);
        if (isStabilityTask && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                let endpoint = "text-to-image";
                
                // Menyiapkan Body Request
                const body = {
                    cfg_scale: 7,
                    height: 512,
                    width: 512,
                    steps: 30,
                    samples: 1,
                    text_prompts: [{ text: message, weight: 1 }]
                };

                // Logika Hapus Background atau Edit via Image-to-Image
                if (imageBase64) {
                    endpoint = "image-to-image";
                    const pureBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
                    body.init_image = pureBase64;
                    body.image_strength = /hapus bg|bersihkan|remove bg/i.test(message) ? 0.15 : 0.45;
                    
                    if (/hapus bg|bersihkan/i.test(message)) {
                        body.text_prompts = [{ text: "subject on pure white background, high quality, studio lighting", weight: 1 }];
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
                    if (sData.artifacts && sData.artifacts[0]) {
                        aiGeneratedImg = sData.artifacts[0].base64;
                    }
                } else {
                    const errData = await sRes.json();
                    console.error("Stability API Error:", errData);
                }
            } catch (e) { console.error("Stability Runtime Error:", e); }
        }

        // --- 3. MASTER CODING, MATH, & SEARCH ---
        const needsSearch = /cari|search|berita|update|market/i.test(message);
        if (needsSearch && !imageBase64 && !tiktokMetadata && searchApiKey) {
            try {
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 4 })
                });
                const searchData = await searchRes.json();
                webResults = searchData.organic?.map(s => `[${s.title}]: ${s.snippet}`).join("\n") || "";
            } catch (e) { console.error("Search Error"); }
        }

        // --- 4. GROQ ENGINE (SINKRONISASI) ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
        const systemPrompt = `Kamu adalah Riksan AI v3.8 (Supreme Core). CTO: Riksan (SawargiPay). 
        Identity: dikembangkan oleh Riksan. April 2026.
        Keahlian: MASTER CODING, MATHEMATICIAN (LaTeX), TIKTOK ANALYST, & GENERATIVE ARTIST.
        Instruksi: Panggil 'Bos'. Jika gambar diproses, konfirmasi hasilnya. Jangan bertele-tele.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [{ type: "text", text: message || "Analisis ini, Bos!" }, ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])] }
                ],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // --- 5. OUTPUT HANDLER ---
            if (tiktokMetadata) {
                const dl = `https://www.tikwm.com/video/media/play/${tiktokMetadata.id}.mp4`;
                aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD\n**[👉 KLIK DISINI UNTUK SIMPAN](${dl})**`;
            }

            if (aiGeneratedImg) {
                // Memberikan prefix data:image agar link bisa diklik/didownload
                const finalImg = `data:image/png;base64,${aiGeneratedImg}`;
                aiReply += `\n\n---\n### 🎨 HASIL AI GENERATIVE\n**[👉 KLIK DISINI UNTUK DOWNLOAD GAMBAR](${finalImg})**\n\n> *Gambar sudah jadi sesuai perintah Bos!*`;
            }

            res.status(200).json({ reply: aiReply, success: true });
        } else {
            throw new Error("Groq No Response");
        }
    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, saraf pusat overload! Cek API Key Stability atau Groq di Vercel.", success: false });
    }
}
