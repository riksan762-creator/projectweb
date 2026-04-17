export default async function handler(req, res) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { message } = req.body;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI, asisten pribadi cerdas milik Riksan (CTO SawargiPay). Jawab dengan singkat, padat, dan profesional. Gunakan Markdown untuk format teks agar rapi." 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.6
            })
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ reply: "Duh Bos, Groq lagi sibuk. Coba lagi ya!" });
    }
}
