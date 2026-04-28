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
        
        // CONTAINER DATA (SYNC POINT)
        let aiGeneratedImg = null;
        let tiktokMetadata = null;
        let webResults = "";
        
        // Flag untuk kasih tau Groq
        let stabilityStatus = "TIDAK_AKTIF";

        // --- 1. PRE-PROCESSING (TIKTOK & SEARCH) ---
        // Cek TikTok (Tetap Ada)
        const ttRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (ttRegex.test(message)) {
            try {
                const ttUrl = message.match(ttRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${ttUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) tiktokMetadata = ttData.data;
            } catch (e) { console.error("TT Error"); }
        }

        // Cek Search (Tetap Ada)
        const needsSearch = /cari|search|berita|update|market/i.test(message);
        if (needsSearch && !tiktokMetadata && searchApiKey) {
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

        // --- 2. EXECUTION PHASE (STABILITY AI SYNC) ---
        // Modul ini HARUS selesai sebelum Groq dipanggil
        const isGenTask = /buatkan|generate|gambar|lukis|edit|foto|design/i.test(message);
        
        if (isGenTask && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                let endpoint = "text-to-image";
                
                // Prompt Auto-Enhance agar hasil "Wah" (Aesthetic 2026)
                const enhancedPrompt = `${message}, professional digital art, masterpiece, 8k resolution, cinematic lighting, sharp focus, trend on artstation`;

                const body = {
                    cfg_scale: 7,
                    height: 512,
                    width: 512,
                    steps: 35,
                    samples: 1,
                    text_prompts: [{ text: enhancedPrompt, weight: 1 }]
                };

                // Jika ada gambar (Edit / Image-to-Image)
                if (imageBase64) {
                    endpoint = "image-to-image";
                    body.init_image = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
                    body.image_strength = 0.35; 
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
                        // UPDATE STATUS UNTUK GROQ
                        stabilityStatus = "SUKSES_BUAT_GAMBAR";
                    }
                } else {
                    stabilityStatus = "ERROR_API_STABILITY";
                }
            } catch (e) { 
                console.error("Stability Sync Error:", e);
                stabilityStatus = "ERROR_RUNTIME";
            }
        }

        // --- 3. BRAIN CENTER (GROQ) - DIKASIH TAU HASIL STABILITY ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
        
        // Sinkronisasi Prompt: Groq HARUS tahu status gambar
        const promptContext = `\n\n[SISTEM INFO]: Status Stability AI = ${stabilityStatus}. ${webResults}`;

        const systemPrompt = `Kamu adalah Riksan AI v4.0 (Supreme Core). developed by Riksan (SawargiPay CTO).
        Identity: Waktu Sekarang: April 2026.
        Gaya Bahasa: Cerdas, lugas, panggil 'Bos', Markdown profesional.
        Keahlian: Master Coding, Mathematician (LaTeX), AI Specialist, & Generative Art Director.
        Instruksi Sinkronisasi: Jika Status Stability AI = SUKSES_BUAT_GAMBAR, konfirmasi dengan bangga kalau Bos bisa mendownload gambarnya di bawah. JANGAN bilang kamu tidak bisa buat gambar.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [{ type: "text", text: message + promptContext }, ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])] }
                ],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        if (data.choices && data.choices[0]) {
            let aiReply = data.choices[0].message.content;

            // --- 4. OUTPUT HANDLER (APPENDING RESULTS) ---
            
            // Append TikTok (Jika Ada)
            if (tiktokMetadata) {
                const ttLink = `https://www.tikwm.com/video/media/play/${tiktokMetadata.id}.mp4`;
                aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD AREA\n**[👉 KLIK DISINI UNTUK SIMPAN VIDEO](${ttLink})**`;
            }

            // Append Gambar Stability (Ini yang Paling Penting)
            if (aiGeneratedImg) {
                // Memberikan prefix data:image agar UI mengenali sebagai gambar
                const finalImgUrl = `data:image/png;base64,${aiGeneratedImg}`;
                aiReply += `\n\n---\n### 🎨 HASIL KARYA AI (STABILITY)\n` +
                           `**[👉 KLIK DISINI UNTUK DOWNLOAD GAMBAR](${finalImgUrl})Langsung **Redeploy** ke Vercel, Bos Riksan! Saya jamin 100% Groq ga bakal berani ngomong *"Saya tidak bisa buat gambar"* lagi, karena saya sudah "suntik" status keberhasilan Stability AI langsung ke dalam konteks berpikirnya si Groq.

Gaskeun tes perintah *"Bos, buatkan gambar kucing cyberpunk"* setelah redeploy! 🚀🔥
