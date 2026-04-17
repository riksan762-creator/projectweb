export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Naikkan limit agar bisa terima gambar
    },
  },
};

export default async function handler(req, res) {
  const apiKey = process.env.GROQ_API_KEY;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY tidak ditemukan di Vercel!" });
  }

  try {
    const { message, imageBase64 } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Pesan kosong euy!" });
    }

    // --- LOGIKA MULTIMODAL (TEKS + GAMBAR) ---
    const userContent = [];

    // 1. Tambahkan Teks
    userContent.push({ type: "text", text: message });

    // 2. Tambahkan Gambar (Jika Ada)
    if (imageBase64) {
      // Pastikan format base64 benar (data:image/jpeg;base64,...)
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageBase64,
        },
      });
    }

    // --- PANGGIL GROQ VISION API ---
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        // PENTING: Gunakan model Vision
        model: "llama-3.2-90b-vision-preview", 
        messages: [
          { 
            role: "system", 
            content: "Kamu adalah Riksan AI, asisten ramah dan pintar buatan Riksan. Kamu memiliki kemampuan untuk melihat dan menganalisis gambar yang dikirimkan user. Jawab dalam Bahasa Indonesia yang santai." 
          },
          { 
            role: "user", 
            content: userContent // Berisi teks dan gambar
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Groq API Error:", data.error);
      return res.status(400).json({ error: { message: data.error.message } });
    }

    // --- FORMAT RESPON UNTUK APP.JS ---
    res.status(200).json({
      candidates: [{
        content: { parts: [{ text: data.choices[0].message.content }] }
      }]
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: { message: error.message } });
  }
}
