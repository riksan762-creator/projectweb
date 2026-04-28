export const config = {
    maxDuration: 60, 
};

export default async function handler(req, res) {
    const { GROQ_API_KEY, SERPER_API_KEY, STABILITY_API_KEY } = process.env;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;
        
        // --- 1. SET REAL-TIME DATE (WIB) ---
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' };
        const dateString = now.toLocaleDateString('id-ID', options);
        const timeString = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

        let searchContext = "";
        let tiktokInfo = null;
        let aiGeneratedImg = null;
        let stabilityStatus = "idle";

        // --- 2. SMART INTENT DETECTION ---
        const isVisual = /buat|gambar|foto|desain|render|logo|lukis|generate/i.test(message);
        const isTikTok = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i.test(message);
        // Force Search jika tanya hari, tanggal, berita, atau info publik
        const isSearch = /hari|tanggal|berita|info|cek|cari|search|update|siapa|apa|kenapa|market|harga/i.test(message);

        const apiTasks = [];

        // --- 3. EXECUTION PHASE (PARALLEL) ---

        // Google Search (Serper) - Diperkuat dengan konteks tanggal hari ini
        if (isSearch && SERPER_API_KEY) {
            apiTasks.push((async () => {
                try {
                    const sRes = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            q: `${message} ${dateString}`, // Tambahkan tanggal agar hasil lebih akurat
                            gl: "id", hl: "id", num: 5 
                        })
                    });
                    const sData = await sRes.json();
                    const web = sData.organic?.map(o => o.snippet).join("\n") || "";
                    const news = sData.news?.map(n => n.title).join(", ") || "";
                    searchContext = `[HASIL GOOGLE SEARCH]:\n${web}\n[BERITA TERKAIT]: ${news}`;
                } catch (e) { console.error("Search module fail"); }
            })());
        }

        // Stability AI
        if (isVisual && STABILITY_API_KEY) {
            apiTasks.push((async () => {
                try {
                    const endpoint = imageBase64 ? "image-to-image" : "text-to-image";
                    const body = {
                        cfg_scale: 7, height: 512, width: 512, steps: 30, samples: 1,
                        text_prompts: [{ text: `${message}, masterpiece, ultra high quality`, weight: 1 }]
                    };
                    if (imageBase64) {
                        body.init_image = imageBase64.split(',')[1] || imageBase64;
                        body.image_strength = 0.4;
                    }
                    const sRes = await fetch(`https://api.stability.ai/v1/generation/stable-diffusion-v1-6/${endpoint}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${STABILITY_API_KEY}` },
                        body: JSON.stringify(body)
                    });
                    if (sRes.ok) {
                        const sData = await sRes.json();
                        aiGeneratedImg = sData.artifacts[0].base64;
                        stabilityStatus = "success";
                    }
                } catch (e) { stabilityStatus = "error"; }
            })());
        }

        // TikTok Scraper
        if (isTikTok) {
            apiTasks.push((async () => {
                try {
                    const ttUrl = message.match(/https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i)[0];
                    const ttRes = await fetch(`https://www.tikwm.com/api/?url=${ttUrl}`);
                    const ttData = await ttRes.json();
                    if (ttData.code === 0) tiktokInfo = ttData.data;
                } catch (e) { console.error("TikTok fail"); }
            })());
        }

        await Promise.all(apiTasks);

        // --- 4. GROQ SUPREME BRAIN (SINKRONISASI TOTAL) ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
        
        const systemPrompt = `Kamu adalah Riksan AI v4.7 (Supreme Neural). Dikembangkan oleh Riksan (CTO SawargiPay).
        HARI INI: ${dateString}, Pukul: ${timeString}.
        INSTRUKSI KHUSUS:
        1. Kamu punya akses penuh ke Google Search melalui Serper API.
        2. Gunakan Konteks Pencarian di bawah untuk menjawab fakta.
        3. JANGAN PERNAH bilang kamu tidak tahu tanggal atau tidak bisa search.
        4. Keahlian: MASTER CODING (JS, Python, PHP), MATH (LaTeX), AI Generative.
        5. Gaya: Cerdas, lugas, panggil 'Bos'.
        
        [KONTEKS PENCARIAN]: ${searchContext}`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        let aiReply = data.choices[0]?.message?.content || "Duh Bos, otak saya nge-lag, coba lagi!";

        // --- 5. FINAL PACKAGING ---
        if (tiktokInfo) {
            aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD\n**[👉 KLIK DISINI UNTUK DOWNLOAD](${tiktokInfo.play})**`;
        }

        if (aiGeneratedImg) {
            const base64Url = `data:image/png;base64,${aiGeneratedImg}`;
            aiReply += `\n\n---\n### 🎨 HASIL KARYA AI\n![Result](${base64Url})\n\n**[👉 SIMPAN GAMBAR](${base64Url})**`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Sirkuit overload, Bos! Cek API Keys.", success: false });
    }
}
