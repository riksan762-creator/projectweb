export default async function handler(req, res) {
  // Ambil API Key dari Environment Variable Vercel
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: "GEMINI_API_KEY belum dipasang di Vercel!" } });
  }

  try {
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
    
    // Kirim hasil ke frontend
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: { message: "Gagal menyambung ke Google AI" } });
  }
}
