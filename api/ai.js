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
        
        // --- 1. REAL-TIME CLOCK (WIB) ---
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' };
        const dateString = now.toLocaleDateString('id-ID', options);
        const timeString = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

        let searchContext = "";
        let tiktokInfo = null;
        let aiGeneratedImg = null;

        const apiTasks = [];

        // --- 2. TIKTOK & SEARCH DETECTION ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            apiTasks.push((async () => {
                try {
                    const ttUrl = message.match(tiktokRegex)[0];
                    const ttRes = await fetch(`https://www.tikwm.com/api/?url=${ttUrl}`);
                    const ttData = await ttRes.json();
                    if (ttData.code === 0) {
                        tiktokInfo = { title: ttData.data.title, dlLink: ttData.data.hdplay || ttData.data.play };
                    }
                } catch (e) { console.error("TikTok Fail"); }
            })());
        }

        const isSearch = /hari|tanggal|berita|info|cek|cari|search|siapa|apa|kenapa|market|harga/i.test(message);
        if (isSearch && SERPER_API_KEY) {
            apiTasks.push((async () => {
                try {
                    const sRes = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                        body: JSON.stringify({ q: `${message} ${dateString}`, gl: "id", hl: "id", num: 5 })
                    });
                    const sData = await sRes.json();
                    searchContext = sData.organic?.map(o => o.snippet).join("\n") || "";
                } catch (e) { console.error("Search Fail"); }
            })());
        }

        // --- 3. STABILITY AI ---
        const isVisual = /buat|gambar|foto|desain|generate/i.test(message);
        if (isVisual && STABILITY_API_KEY) {
            apiTasks.push((async () => {
                try {
                    const endpoint = imageBase64 ? "image-to-image" : "text-to-image";
                    const body = {
                        cfg_scale: 7, height: 512, width: 512, steps: 30, samples: 1,
                        text_prompts: [{ text: `${message}, masterpiece, high quality`, weight: 1 }]
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
                    }
                } catch (e) { console.error("Stability Fail"); }
            })());
        }

        await Promise.all(apiTasks);

        // --- 4. GROQ SUPREME BRAIN (DENGAN SYSTEM PROMPT BOS) ---
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
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        let aiReply = data.choices[0]?.message?.content || "Duh Bos, otak saya nge-lag!";

        // --- 5. FINAL PACKAGING ---
        if (tiktokInfo) {
            const finalUrl = `https://www.tikwm.com${tiktokInfo.dlLink}`;
            aiReply += `\n\n---\n**📥 TIKTOK DOWNLOADER**\n**Judul:** ${tiktokInfo.title || "Video TikTok"}\n\n**[👉 KLIK UNTUK SIMPAN KE GALERI](${finalUrl})**`;
        }

        if (aiGeneratedImg) {
            const base64Url = `data:image/png;base64,${aiGeneratedImg}`;
            aiReply += `\n\n---\n**🎨 HASIL KARYA AI**\n![Result](${base64Url})\n\n**[👉 DOWNLOAD GAMBAR](${base64Url})**`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Sirkuit overload, Bos!", success: false });
    }
}
