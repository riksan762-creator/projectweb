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
        let aiGeneratedImg = null;

        const apiTasks = [];

        // --- 1. TIKTOK ENGINE V5.2 (STABLE LINK) ---
        const tiktokRegex = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\/]+/i;
        if (tiktokRegex.test(message)) {
            apiTasks.push((async () => {
                try {
                    const ttUrl = message.match(tiktokRegex)[0];
                    const ttRes = await fetch(`https://www.tikwm.com/api/?url=${ttUrl}`);
                    const ttData = await ttRes.json();
                    if (ttData.code === 0) {
                        // Paksa link menggunakan domain TikWM yang valid dan endpoint video langsung
                        const videoPath = ttData.data.play; 
                        const cleanLink = videoPath.startsWith('http') ? videoPath : `https://www.tikwm.com${videoPath}`;
                        
                        tiktokInfo = {
                            title: ttData.data.title || "Video TikTok",
                            dlLink: cleanLink
                        };
                    }
                } catch (e) { console.error("TikTok Fail"); }
            })());
        }

        // --- 2. SEARCH ENGINE ---
        if (/hari|tanggal|berita|cari|siapa|apa/i.test(message) && SERPER_API_KEY) {
            apiTasks.push((async () => {
                try {
                    const sRes = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                        body: JSON.stringify({ q: `${message} ${dateString}`, gl: "id", hl: "id", num: 3 })
                    });
                    const sData = await sRes.json();
                    searchContext = sData.organic?.map(o => o.snippet).join("\n") || "";
                } catch (e) { console.error("Search Fail"); }
            })());
        }

        await Promise.all(apiTasks);

        // --- 3. SYSTEM PROMPT (SUPREME NEURAL) ---
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
        let aiReply = data.choices[0]?.message?.content || "Siap, Bos!";

        // --- 4. FINAL OUTPUT (FIXED TIKTOK) ---
        if (tiktokInfo) {
            aiReply += `\n\n---\n### 📥 DOWNLOAD VIDEO\n**Judul:** ${tiktokInfo.title}\n\n**[👉 SIMPAN KE GALERI](${tiktokInfo.dlLink})**\n\n> **Tips Bos:** Jika di Safari cuma muter videonya, **Tahan tombolnya** lalu pilih **"Download Linked File"**.`;
        }

        res.status(200).json({ reply: aiReply, success: true });

    } catch (error) {
        res.status(500).json({ reply: "Sirkuit overload, Bos!", success: false });
    }
}
