export const config = {
  api: {
    bodyParser: false, // Wajib false agar bisa baca FormData manual
  },
};

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: "GEMINI_API_KEY tidak ditemukan di Vercel!" } });
  }

  try {
    // 1. Baca data dari frontend
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const buffer = Buffer.concat(chunks);
    const bodyStr = buffer.toString('utf-8');
    const params = new URLSearchParams(bodyStr);
    
    const userMessage = params.get('message') || "";
    const base64Image = params.get('image') || null;

    // 2. Susun struktur parts sesuai dokumentasi
    const parts = [{ text: userMessage }];

    // Jika ada gambar, tambahkan inline_data (Multimodal)
    if (base64Image) {
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    // 3. Panggil API sesuai persis dokumentasi REST yang kamu kasih
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey // Sesuai dokumentasi kamu
      },
      body: JSON.stringify({
        "contents": [
          {
            "parts": parts
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
