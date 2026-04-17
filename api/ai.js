export default async function handler(req, res) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const NEWS_API_KEY = "a95a35f976764546ac12cee7f1978ae8"; 

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        let beritaBloomberg = "Data pasar global sedang diperbarui...";

        // Ambil Berita Bloomberg
        try {
            const newsRes = await fetch(`https://newsapi.org/v2/top-headlines?sources=bloomberg&apiKey=${NEWS_API_KEY}`);
            const newsData = await newsRes.json();
            if (newsData.articles) {
                beritaBloomberg = newsData.articles.slice(0, 5).map(a => a.title).join("\n");
            }
        } catch (e) { console.error("News Error"); }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: `Kamu adalah Riksan AI (Business Expert). Owner: Riksan (CTO SawargiPay). Headline Bloomberg: ${beritaBloomberg}. Jawab dengan gaya asisten premium, panggil 'Bos'.` },
                    { role: "user", content: message }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ reply: "Koneksi terputus, Bos. Coba lagi." });
    }
}
