export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: "GEMINI_API_KEY tidak ditemukan di Vercel!" } });
  }

  try {
    // Kita pakai v1beta karena gemini-1.5-flash seringkali belum stabil di v1 untuk semua region
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
      // Jika masih gagal, kita akan lempar pesan error aslinya agar jelas
      return res.status(data.error.code || 400).json({ error: { message: data.error.message } });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: "Gagal menyambung ke API: " + error.message } });
  }
}
