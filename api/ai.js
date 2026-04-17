export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "GROQ_API_KEY missing!" } });

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const buffer = Buffer.concat(chunks);
    const bodyStr = buffer.toString('utf-8');
    const params = new URLSearchParams(bodyStr);
    
    const userMessage = params.get('message') || "";

    // Groq Chat Completion (Llama 3.3 70B)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Kamu adalah Riksan AI, asisten pribadi ramah buatan Riksan. Jawab dalam Bahasa Indonesia yang santai."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: { message: data.error.message } });
    }

    // Menyamakan format output agar frontend (app.js) tidak perlu diubah
    const formattedResponse = {
      candidates: [{
        content: {
          parts: [{ text: data.choices[0].message.content }]
        }
      }]
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    res.status(500).json({ error: { message: "Groq Error: " + error.message } });
  }
}
