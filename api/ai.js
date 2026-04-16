export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "API Key belum ada di Vercel!" } });

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const buffer = Buffer.concat(chunks);
    const bodyStr = buffer.toString('utf-8');
    const params = new URLSearchParams(bodyStr);
    
    const userMessage = params.get('message') || "";
    const base64Image = params.get('image') || null;

    // Instruksi agar AI tetap di jalurnya
    const systemInstruction = "Kamu adalah Riksan AI, asisten pribadi ramah buatan Riksan. Jawab dalam Bahasa Indonesia.";

    const promptParts = [{ text: `${systemInstruction}\n\nUser: ${userMessage}` }];

    if (base64Image) {
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];
      promptParts.push({
        inline_data: { mime_type: mimeType, data: base64Data }
      });
    }

    // PAKAI ALAMAT INI (Jalur paling stabil untuk REST API)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey // Mengirim key lewat Header sesuai doc REST
      },
      body: JSON.stringify({
        contents: [{ parts: promptParts }]
      })
    });

    const data = await response.json();

    // Jika Google kasih error (seperti model not found), kita tampilkan pesannya
    if (data.error) {
      return res.status(400).json({ error: { message: data.error.message } });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: "Masalah koneksi: " + error.message } });
  }
}
