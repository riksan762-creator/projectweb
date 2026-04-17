export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const newsKey = "a95a35f976764546ac12cee7f1978ae8";

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
        
        // --- LOGIKA PAKSA AMBIL BERITA (TANPA IF) ---
        let beritaTerkini = "Sistem sedang mencari...";
        try {
            const newsResponse = await fetch(`https://newsapi.org/v2/top-headlines?country=id&apiKey=${newsKey}`);
            const newsData = await newsResponse.json();
            if (newsData.articles && newsData.articles.length > 0) {
                beritaTerkini = newsData.articles.slice(0, 5).map((a, i) => `${i+1}. ${a.title}`).join("\n");
            } else {
                beritaTerkini = "Tidak ada berita viral saat ini di Indonesia.";
            }
        } catch (e) {
            beritaTerkini = "Gagal terhubung ke pusat berita.";
        }

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
                        content: `Kamu adalah Riksan AI (Turbo Search). Owner: Riksan (CTO SawargiPay). 
                        DATA REAL-TIME (WAJIB DIGUNAKAN):
                        - Waktu: ${waktuIndo}
                        - Berita Indonesia Hari Ini: ${beritaTerkini}

                        INSTRUKSI:
                        1. Jangan pernah bilang kamu tidak tahu berita. Data berita ada di atas!
                        2. Jika Bos tanya berita, bacakan list berita di atas dengan gaya keren.
                        3. Jika Bos tanya jam, gunakan data waktu di atas.
                        4. Jawab dengan gaya asisten premium dan panggil 'Bos'.` 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.6 // Suhu diturunkan biar lebih fokus ke data
            })
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(200).json({ reply: "Duh Bos, server lagi pusing: " + error.message });
    }
}
