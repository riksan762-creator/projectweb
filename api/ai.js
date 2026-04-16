export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: "GEMINI_API_KEY tidak ditemukan!" } });
  }

  try {
    // Kita pakai v1 (Bukan Beta) tapi modelnya harus gemini-1.5-flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
      // Menampilkan error asli dari Google kalau gagal lagi
      return res.status(400).json({ error: { message: data.error.message } });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: "Gagal menyambung: " + error.message } });
  }
}
