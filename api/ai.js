export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: "API Key belum dipasang di Vercel!" } });
  }

  try {
    // Sesuai dokumentasi terbaru: pakai v1beta dan model gemini-3-flash-preview
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey // Cara kirim key terbaru sesuai doc kamu
      },
      body: JSON.stringify({
        "contents": [
          {
            "parts": [
              {
                "text": req.body.message
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: { message: data.error.message } });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: "Koneksi gagal: " + error.message } });
  }
}
