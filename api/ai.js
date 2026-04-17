export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;

    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Pesan kosong, Bos!" });
        }

        // PAKAI MODEL TERBAIK DARI DAFTAR KAMU
        // Llama 3.3 70B Versatile adalah yang paling stabil & pintar saat ini
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Riksan AI, asisten pribadi Riksan. Gunakan bahasa Indonesia yang keren dan cerdas." 
                    },
                    { role: "user", content: message }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: data.choices[0].message.content }] }
                }]
            });
        } else {
            res.status(200).json({
                candidates: [{
                    content: { parts: [{ text: "Waduh, ada kendala koneksi ke Groq. Cek log Vercel ya!" }] }
                }]
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
