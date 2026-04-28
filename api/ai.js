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
        let searchContext = "";
        let tiktokInfo = null;
        let aiGeneratedImg = null;
        let stabilityStatus = "idle";

        // --- 1. DETECTOR ENGINE (SMART TRIGGER) ---
        const isVisualTask = /buat|gambar|foto|desain|render|logo|lukis|generate/i.test(message);
        const isTikTokTask = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i.test(message);
        // Search otomatis aktif jika ada pertanyaan fakta atau instruksi 'cari'
        const isSearchTask = /apa|siapa|kapan|dimana|kenapa|bagaimana|berita|info|cek|cari|search|update/i.test(message);

        const tasks = [];

        // --- 2. MULTI-THREADING SYNC (SEARCH & MEDIA) ---
        
        // A. Google Search Sync (Serper)
        if (isSearchTask && SERPER_API_KEY) {
            tasks.push((async () => {
                try {
                    const sRes = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                        body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 5 })
                    });
                    const sData = await sRes.json();
                    
                    const news = sData.news?.map(n => `[NEWS]: ${n.title} - ${n.snippet}`).join("\n") || "";
                    const web = sData.organic?.map(o => `${o.snippet}`).join("\n") || "";
                    const answer = sData.answerBox?.answer || sData.answerBox?.snippet || "";
                    
                    searchContext = `[REAL-TIME DATA APRIL 2026]:\n${answer}\n${news}\n${web}`;
                } catch (e) { console.error("Search module sync failed."); }
            })());
        }

        // B. TikTok Downloader Sync
        if (isTikTokTask) {
            tasks.push((async () => {
                try {
                    const ttUrl = message.match(/https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i)[0];
                    const ttRes = await fetch(`https://www.tikwm.com/api/?url=${ttUrl}`);
                    const ttData = await ttRes.json();
                    if (ttData.code === 0) tiktokInfo = ttData.data;
                } catch (e) { console.error("TikTok module sync failed."); }
            })());
        }

        // C. Stability AI Sync
        if (isVisualTask && STABILITY_API_KEY) {
            tasks.push((async () => {
                try {
                    const endpoint = imageBase64 ? "image-to-image" : "text-to-image";
                    const body = {
                        cfg_scale: 7, height: 512, width: 512, steps: 30, samples: 1,
                        text_prompts: [{ text: `${message}, masterpiece, ultra high quality, detailed`, weight: 1 }]
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

        // TUNGGU SEMUA ASISTEN SELESAI BEKERJA
        await Promise.all(tasks);

        // --- 3. GROQ SUPREME BRAIN (LLAMA 3.3) ---
        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
        
        // SINKRONISASI CONTEXT KE PESAN USER
        const enrichedUserMessage = `
        Konteks Pencarian Terkini: ${searchContext}
        Status Gambar: ${stabilityStatus === 'success' ? 'Sudah Dibuat' : 'Tidak Ada'}
        
        Instruksi User: ${message}
        `;

        const systemPrompt = `Kamu adalah Riksan AI v4.6 (Supreme Neural). Dikembangkan oleh Riksan (CTO SawargiPay).
        Identity: Master Coding, Math Specialist (LaTeX), & News Aggregator. 
        Tugas: Jawab instruksi Bos secara cerdas menggunakan data pencarian yang tersedia. 
        JANGAN bilang "berdasarkan pencarian saya", sampaikan secara alami seolah kamu maha tahu.
        Jika status gambar 'Sudah Dibuat', beritahu Bos bahwa gambarnya sudah muncul di bawah.
        Panggil 'Bos', gunakan bahasa cerdas dan profesional.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: enrichedUserMessage }
                ],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        let aiReply = data.choices[0]?.message?.content || "Duh Bos, saraf pusat overload!";

        // --- 4. PACKAGING OUTPUT ---
        
        // Tambahkan Link TikTok
        if (tiktokInfo) {
            aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD\n**[👉 KLIK DISINI UNTUK DOWNLOAD VIDEO](${tiktokInfo.play})**\n> *Creator: @${tiktokInfo.author.nickname}*`;
        }

        // Tambahkan Gambar AI
        if (aiGeneratedImg) {
            const base64Url = `data:image/png;base64,${aiGeneratedImg}`;
            aiReply += `\n\n---\n### 🎨 HASIL KARYA AI\n![Result](${base64Url})\n\n**[👉 DOWNLOAD GAMBAR](${base64Url})**`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, server sedang dalam maintenance/overload!", success: false });
    }
}
