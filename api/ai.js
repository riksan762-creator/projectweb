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
        let globalContext = "";
        let tiktokInfo = null;
        let aiGeneratedImg = null;

        // --- 1. UNIVERSAL SEARCH ENGINE (Cari Apa Saja!) ---
        // Sistem otomatis mencari jika ada pertanyaan yang butuh info update/fakta eksternal
        const looksLikeQuestion = /apa|siapa|kapan|dimana|kenapa|bagaimana|cari|berita|info|harga|tutorial/i.test(message);
        
        if (looksLikeQuestion && searchApiKey) {
            try {
                const sRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 5 })
                });
                const sData = await sRes.json();
                // Gabungkan hasil organik dan knowledge graph untuk jawaban lebih "pintar"
                globalContext = sData.organic?.map(s => `[Source: ${s.title}]: ${s.snippet}`).join("\n") || "";
                if (sData.answerBox) globalContext += `\n[Direct Answer]: ${sData.answerBox.answer || sData.answerBox.snippet}`;
            } catch (e) { console.error("Universal Search Error"); }
        }

        // --- 2. TIKTOK DOWNLOADER MASTER ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            try {
                const tiktokUrl = message.match(tiktokRegex)[0];
                const ttRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`);
                const ttData = await ttRes.json();
                if (ttData.code === 0) {
                    tiktokInfo = ttData.data;
                    globalContext += `\n[TIKTOK DETECTED]: ${tiktokInfo.title}`;
                }
            } catch (e) { console.error("TikTok Error"); }
        }

        // --- 3. STABILITY AI (GENERATE APA SAJA) ---
        const isVisual = /buat|gambar|foto|desain|render|visual|logo/i.test(message);
        if (isVisual && stabilityKey) {
            try {
                const engineId = 'stable-diffusion-v1-6';
                const endpoint = imageBase64 ? "image-to-image" : "text-to-image";
                const body = {
                    cfg_scale: 7, height: 512, width: 512, steps: 30,
                    text_prompts: [{ text: `${message}, ultra high quality, detailed, 4k`, weight: 1 }],
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
            } catch (e) { console.error("Stability AI Error"); }
        }

        // --- 4. GROQ AI SUPREME BRAIN ---
        const systemPrompt = `Kamu adalah Riksan AI v4.0. CTO: Riksan (SawargiPay).
        Identity: Supreme AI Master Coding, Global Finance Expert, & Universal Knowledge Specialist.
        Tugas: Kamu bisa menjawab APAPUN. Gunakan data pencarian yang disediakan untuk menjawab pertanyaan random dari Bos.
        Keahlian: Coding, Matematika (LaTeX), Analisis Pasar, Sejarah, Sains, hingga Gosip Populer.
        Gaya: Cerdas, panggil 'Bos', profesional, gunakan Markdown rapi.
        Data Pencarian Real-time: ${globalContext}`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                temperature: 0.3
            })
        });

        const data = await groqRes.json();
        let aiReply = data.choices[0].message.content;

        // --- 5. FINAL PACKAGING (OUTPUT RAPI) ---

        // TikTok Output
        if (tiktokInfo) {
            aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOADER\n- **Judul**: ${tiktokInfo.title}\n- **Creator**: @${tiktokInfo.author.nickname}\n\n**[👉 KLIK DISINI UNTUK DOWNLOAD/SIMPAN](${tiktokInfo.play})**\n> *Bos bisa buka link ini di Chrome/Safari lalu tahan video untuk simpan ke galeri.*`;
        }

        // Stability AI Output
        if (aiGeneratedImg) {
            aiReply += `\n\n---\n### 🎨 AI VISUAL RESULT\n![Result](data:image/png;base64,${aiGeneratedImg})\n\n**[👉 SIMPAN GAMBAR KE GALERI](data:image/png;base64,${aiGeneratedImg})**`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, koneksi otak saya lagi terganggu!", success: false });
    }
}
