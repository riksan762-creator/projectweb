export default async function handler(req, res) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!apiKey) {
        return res.status(200).json({ reply: "Bos, API Key belum dipasang di Vercel!" });
    }

    try {
        const { message } = req.body;

        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI (DeepSeek V3.2). Pemilik: Riksan (CTO SawargiPay). Jawab santai, cerdas, panggil 'Bos'. JANGAN PAKAI SUARA." 
                    },
                    { role: "user", content: message }
                ],
                max_tokens: 2048,
                stream: false
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(200).json({ reply: `DeepSeek Error: ${data.error.message}` });
        }

        if (data.choices && data.choices[0]) {
            // KIRIM SEBAGAI 'reply'
            res.status(200).json({ reply: data.choices[0].message.content });
        } else {
            res.status(200).json({ reply: "Respon kosong. Cek saldo DeepSeek, Bos!" });
        }

    } catch (error) {
        res.status(500).json({ reply: "Error: " + error.message });
    }
}
