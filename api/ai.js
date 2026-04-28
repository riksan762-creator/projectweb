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
        let deepSearchContext = "";
        let tiktokInfo = null;
        let aiGeneratedImg = null;

        // --- 1. NEURAL SEARCH ENGINE (SMART NEWS & WEB AGGREGATOR) ---
        // Pemicu lebih cerdas: Jika menanyakan fakta, berita, atau hal random yang butuh update
        const needsRealTime = /apa|siapa|kapan|dimana|kenapa|bagaimana|berita|info|terjadi|update|cek|hari ini|minggu ini/i.test(message);
        
        if (needsRealTime && searchApiKey) {
            try {
                // Menggunakan Serper dengan parameter lebih luas (gl: id, hl: id agar berita lokal Indonesia kuat)
                const sRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        q: message, 
                        gl: "id", 
                        hl: "id", 
                        num: 6, // Ambil lebih banyak sumber agar jawaban lebih kaya
                        autocorrect: true 
                    })
                });
                const sData = await sRes.json();
                
                // Gabungkan Berita (News), Hasil Organik, dan Sitelinks
                const organicResults = sData.organic?.map(s => `[BERITA/SUMBER]: ${s.title} | Link: ${s.link} | Konten: ${s.snippet}`).join("\n\n") || "";
                const topStories = sData.news?.map(n => `[BREAKING NEWS]: ${n.title} (${n.date}) - ${n.snippet}`).join("\n") || "";
                
                deepSearchContext = `DATA TERBARU APRIL 2026:\n${topStories}\n${organicResults}`;
                
                if (sData.answerBox) {
                    deepSearchContext += `\n[FAKTA INSTAN]: ${sData.answerBox.answer || sData.answerBox.snippet}`;
                }
            } catch (e) { console.error("Search module error."); }
        }

        // --- 2. TIKTOK MASTER DOWNLOADER ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) {
                    tiktokInfo = ttData.data;
                    deepSearchContext += `\n[TIKTOK INFO]: Video dari ${tiktokInfo.author.nickname} sedang dianalisis.`;
                }
            } catch (e) { console.error("TikTok Scraper error."); }
        }

        // --- 3. STABILITY AI (CREATIVE ENGINE) ---
        const isVisual = /buat|gambar|foto|desain|render|logo|lukis/i.test(message);
        if (isVisual && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                const endpoint = imageBase64 ? "image-to-image" : "text-to-image";
                const body = {
                    cfg_scale: 8, height: 512, width: 512, steps: 35,
                    text_prompts: [{ text: `${message}, professional, high detail, masterpiece`, weight: 1 }],
                };
                if (imageBase64) {
                    body.init_image = imageBase64.split(',')[1] || imageBase64;
                    body.image_strength = 0.4;
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
            } catch (e) { console.error("Stability error."); }
        }

        // --- 4. GROQ AI SUPREME BRAIN (LLAMA 3.3) ---
        const systemPrompt = `Kamu adalah Riksan AI v4.1 (Neural-Link). CTO: Riksan.
        Identity: Supreme AI Master Coding, Global Finance Advisor, & News Aggregator Specialist.
        April 2026 Context: Gunakan data pencarian terbaru untuk menjawab secara cerdas dan akurat.
        Tugas: Jika ada data pencarian, jangan jawab "berdasarkan pencarian saya", tapi langsung jelaskan faktanya seolah kamu tahu segalanya.
        Keahlian: Coding, Ekonomi Global, Sejarah, Sains, dan Analisis Berita Random.
        Gaya: Cerdas, panggil 'Bos', profesional, gunakan Markdown & LaTeX.
        Konteks Pencarian Aktif: ${deepSearchContext}`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                temperature: 0.25
            })
        });

        const data = await groqRes.json();
        let aiReply = data.choices[0]?.message?.content || "Sirkuit otak saya agak panas, coba lagi Bos!";

        // --- 5. FINAL PACKAGING (LINK & MEDIA RAPI) ---

        // TikTok Downloader Link
        if (tiktokInfo) {
            aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD CENTER\n**[👉 KLIK DISINI UNTUK SIMPAN VIDEO](${tiktokInfo.play})**\n> *Judul: ${tiktokInfo.title} | Creator: @${tiktokInfo.author.nickname}*`;
        }

        // Stability AI Output
        if (aiGeneratedImg) {
            aiReply += `\n\n---\n### 🎨 AI GENERATED IMAGE\n![Result](data:image/png;base64,${aiGeneratedImg})\n\n**[👉 SIMPAN KE GALERI](data:image/png;base64,${aiGeneratedImg})**`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, server overload!", success: false });
    }
}
