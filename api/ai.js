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
        
        const now = new Date();
        const dateString = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' });
        const timeString = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

        let searchContext = "";
        let tiktokInfo = null;

        const apiTasks = [];

        // --- TIKTOK AUTO-DOWNLOAD ENGINE ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            apiTasks.push((async () => {
                try {
                    const ttUrl = message.match(tiktokRegex)[0];
                    const ttRes = await fetch(`https://www.tikwm.com/api/?url=${ttUrl}`);
                    const ttData = await ttRes.json();
                    if (ttData.code === 0) {
                        // Gunakan endpoint 'play' karena ini paling stabil untuk trigger download
                        const videoUrl = ttData.data.play;
                        tiktokInfo = {
                            title: ttData.data.title,
                            // Pastikan link absolut agar tidak 'Situs tidak terjangkau'
                            dlLink: videoUrl.startsWith('http') ? videoUrl : `https://www.tikwm.com${videoUrl}`
                        };
                    }
                } catch (e) { console.error("TikTok Engine Error"); }
            })());
        }

        // --- SEARCH ENGINE ---
        const isSearch = /hari|tanggal|berita|siapa|apa|kenapa|cek|cari/i.test(message);
        if (isSearch && SERPER_API_KEY) {
            apiTasks.push((async () => {
                try {
                    const sRes = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                        body: JSON.stringify({ q: `${message} ${dateString}`, gl: "id", hl: "id", num: 3 })
                    });
                    const sData = await sRes.json();
                    searchContext = sData.organic?.map(o => o.snippet).join("\n") || "";
                } catch (e) { console.error("Search Error"); }
            })());
        }

        await Promise.all(apiTasks);

        // --- SYSTEM PROMPT SESUAI PERMINTAAN BOS ---
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
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
                temperature: 0.2
            })
        });

        const data = await groqRes.json();
        let aiReply = data.choices[0]?.message?.content || "Siap Bos!";

        // --- OUTPUT FINAL (DOWNLOAD TRIGGER) ---
        if (tiktokInfo) {
            aiReply += `\n\n---\n### 📥 TIKTOK DOWNLOAD\n**Judul:** ${tiktokInfo.title || "Video Tanpa Judul"}\n\n**[👉 KLIK UNTUK DOWNLOAD OTOMATIS](${tiktokInfo.dlLink})**\n\n> *Note: Link ini langsung mendownload file .mp4 ke galeri/file manager Bos.*`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Sirkuit overload, Bos!", success: false });
    }
}
