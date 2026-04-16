export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: { message: "GEMINI_API_KEY tidak ditemukan di Environment Variables Vercel!" } 
    });
  }

  try {
    // Menggunakan API v1 dan model gemini-pro agar kompatibel
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: req.body.message }]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: { message: data.error.message } });
    }

    // Kirim data utuh ke frontend
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: "Gagal menyambung ke server Google: " + error.message } });
  }
}
