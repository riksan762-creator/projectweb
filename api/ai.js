export const config = {
    maxDuration: 60, 
};

export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const searchApiKey = process.env.SERPER_API_KEY;
    const stabilityKey = process.env.STABILITY_API_KEY;

    // Standard Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;
        let contextData = "";
        let tiktokInfo = null;
        let aiGeneratedImg = null;
        let visualAnalysis = "";

        // --- 1. MODUL TIKTOK MASTER (DIRECT DOWNLOAD LOGIC) ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) {
                    tiktokInfo = ttData.data;
                    // Berikan info ke AI tentang video ini
                    contextData += `\n[TIKTOK]: ${tiktokInfo.title} by ${tiktokInfo.author.nickname}`;
                }
            } catch (e) { console.error("TikTok Error"); }
        }

        // --- 2. MODUL VISION (ANALISIS GAMBAR) ---
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
                                { type: "text", text: "Identifikasi gambar ini secara teknis dan estetis untuk modifikasi." },
                                { type: "image_url", image_url: { url: imageBase64 } }
                            ]
                        }]
                    })
                });
                const vData = await visionRes.json();
                visualAnalysis = vData.choices[0].message.content;
            } catch (e) { console.error("Vision Error"); }
        }

        // --- 3. MODUL STABILITY AI (SMART GENERATOR) ---
        const isVisualReq = /buat|gambar|foto|design|edit|visual|logo|render/i.test(message);
        if (isVisualReq && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                const endpoint = imageBase64 ? "image-to-image" : "text-to-image";
                const body = {
                    cfg_scale: 7,
                    height: 512,
                    width: 512,
                    steps: 30,
                    text_prompts: [{ text: `${message}, ${visualAnalysis}, high resolution, cinematic`, weight: 1 }],
                };
                if (imageBase64) {
                    body.init_image = imageBase64.split(',')[1] || imageBase64;
                    body.image_strength = 0.45;
                }
                const sRes = await fetch(`https://api.stability.ai/v1/generation/${engineId}/${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${stabilityKey}` },
                    body: JSON.stringify(body),
                });
                if (sRes.ok) {
                    const sData = await sRes.json();
                    aiGeneratedImg = sData.artifacts[0].base64;
                }
            } catch (e) { console.error("Stability Error"); }
        }

        // --- 4. MODUL FINANCE & SEARCH (GLOBAL MARKET DATA) ---
        const isFinance = /saham|crypto|investasi|market|ekonomi|forex|harga/i.test(message);
        if ((isFinance || /cari|info/i.test(message)) && searchApiKey) {
            try {
                const sRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 4 })
                });
                const sData = await sRes.json();
                contextData += "\n[MARKET DATA]: " + sData.organic?.map(s => s.snippet).join(" ");
            } catch (e) { console.error("Search Error"); }
        }

        // --- 5. GROQ AI SUPREME CORE ---
        const systemPrompt = `Kamu adalah Riksan AI v3.9. CTO: Riksan.
        Identity: Supreme AI Master Coding, Global Finance Expert, & Creative Specialist.
        Keahlian Khusus: 
        1. Financial Advisor: Analisis pasar modal, crypto, forex, dan strategi investasi global.
        2. Master Coding: Menulis kode bersih, efisien, dan debugging.
        3. Visual Analyst: Mengerti seni dan modifikasi gambar.
        Gaya: Cerdas, panggil 'Bos', profesional, gunakan Markdown & LaTeX.
        Data Konteks: ${contextData} ${visualAnalysis}`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        let aiReply = data.choices[0].message.content;

        // --- FINAL PACKAGING (LINK & MEDIA) ---
        
        // 📥 TikTok Section
        if (tiktokInfo) {
            const videoUrl = tiktokInfo.play; // Direct Link for Download
            aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD CENTER\n**Video berhasil ditemukan, Bos!**\n- **Judul**: ${tiktokInfo.title}\n- **Creator**: @${tiktokInfo.author.nickname}\n\n**[👉 KLIK DISINI UNTUK DOWNLOAD KE GALERI](${videoUrl})**\n> *Gunakan link di atas pada Safari/Chrome, lalu pilih "Simpan Video".*`;
        }

        // 🎨 Stability AI Section
        if (aiGeneratedImg) {
            aiReply += `\n\n---\n### 🎨 HASIL VISUAL AI\n![Result](data:image/png;base64,${aiGeneratedImg})\n\n**[👉 DOWNLOAD GAMBAR (PNG)](data:image/png;base64,${aiGeneratedImg})**`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Sistem mengalami anomali, Bos!", success: false });
    }
}
