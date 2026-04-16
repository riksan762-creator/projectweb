export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Cek apakah Key sudah ada
  if (!apiKey) {
    return res.status(500).json({ error: { message: "GEMINI_API_KEY tidak ditemukan di Environment Variables!" } });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: req.body.message }] }]
      })
    });

    const data = await response.json();

    // Kalau Google kirim error (misal key salah atau limit habis)
    if (data.error) {
      return res.status(400).json({ error: { message: data.error.message } });
    }

    // Kirim hasil bersih ke frontend
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: "Koneksi ke Google AI gagal: " + error.message } });
  }
}
