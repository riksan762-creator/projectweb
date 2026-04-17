export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Ambil data pesan dari body (Format JSON)
        let userMessage = "";
        
        // Cek apakah data masuk sebagai JSON atau Form
        if (typeof req.body === 'string') {
            const parsed = JSON.parse(req.body);
            userMessage = parsed.message;
        } else if (req.body && req.body.message) {
            userMessage = req.body.message;
        }

        if (!userMessage) {
            return res.status(400).json({ error: "Pesan kosong euy!" });
        }

        // Panggil Groq API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Kamu adalah Riksan AI, asisten ramah." },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await response.json();

        // Kirim balik ke frontend dengan format yang diinginkan app.js
        res.status(200).json({
            candidates: [{
                content: { parts: [{ text: data.choices[0].message.content }] }
            }]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
