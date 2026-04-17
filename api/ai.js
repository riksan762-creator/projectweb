export default async function handler(req, res) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!apiKey) {
        return res.status(500).json({ error: "API Key tidak terbaca di Vercel, Bos!" });
    }

    try {
        const { message } = req.body;

        // Menggunakan /v1 sesuai dokumentasi agar kompatibel sempurna
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // DeepSeek-V3.2 (Cepat & Non-thinking)
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI (DeepSeek Engine V3.2). Pemilik: Riksan (CTO SawargiPay). Jawab santai, cerdas, panggil 'Bos'. JANGAN PAKAI SUARA." 
                    },
                    { role: "user", content: message }
                ],
                // Context limit 128K, tapi kita batasi output agar hemat saldo
                max_tokens: 4096, 
                stream: false
            })
        });

        const data = await response.json();

        // Cek jika ada error dari pihak DeepSeek (seperti saldo habis/key salah)
        if (data.error) {
            return res.status(401).json({ error: `DeepSeek Error: ${data.error.message}` });
        }

        res.status(200).json({ text: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ error: "Gagal terhubung ke DeepSeek: " + error.message });
    }
}
