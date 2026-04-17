export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const newsKey = "a95a35f976764546ac12cee7f1978ae8"; // API Key Berita Bos

    // 1. LOGIKA WAKTU REAL-TIME (WIB)
    const sekarang = new Date();
    const waktuIndo = sekarang.toLocaleString('id-ID', { 
        timeZone: 'Asia/Jakarta', 
        dateStyle: 'full', 
        timeStyle: 'short' 
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;
        let beritaTerkini = "Tidak ada data berita spesifik.";

        // 2. OTOMATIS AMBIL BERITA JIKA DITANYA
        const kataKunciBerita = ["berita", "hari ini", "hot", "info", "kejadian", "update"];
        if (kataKunciBerita.some(kata => message.toLowerCase().includes(kata))) {
            try {
                const newsResponse = await fetch(`https://newsapi.org/v2/top-headlines?country=id&apiKey=${newsKey}`);
                const newsData = await newsResponse.json();
                if (newsData.articles && newsData.articles.length > 0) {
                    beritaTerkini = newsData.articles.slice(0, 5).map((a, i) => `${i+1}. ${a.title}`).join("\n");
                }
            } catch (e) {
                beritaTerkini = "Sistem berita sedang sibuk, Bos.";
            }
        }

        // 3. KIRIM KE GROQ DENGAN "SUNTIKAN" DATA TERBARU
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { 
                        role: "system", 
                        content: `Kamu adalah Riksan AI v2.0 (Smart Engine). 
                        Owner: Riksan (CTO SawargiPay). 
                        WAKTU SEKARANG: ${waktuIndo}. 
                        BERITA TERBARU HARI INI:
                        ${beritaTerkini}

                        TUGAS KAMU:
                        - Jawab pertanyaan Bos dengan data waktu dan berita di atas jika relevan.
                        - Jika ditanya jam/tanggal, jawab dengan sangat akurat.
                        - Jawab dengan gaya asisten premium, cerdas, santai, dan panggil 'Bos'.` 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(200).json({ reply: "Duh Bos, otak saya lagi konslet: " + error.message });
    }
}
