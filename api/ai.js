// api/ai.js (Khusus Vercel)

export const config = {
  api: {
    bodyParser: false, // Matikan bodyParser bawaan agar kita bisa baca FormData manual
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "API Key tidak ditemukan!" } });

  // Karena we matikan bodyParser, kita butuh cara manual baca data FormData.
  // Ini kode tambahan khusus Vercel untuk parse Base64 image dan text.
  let message = "";
  let base64Image = null;

  try {
    // Fungsi pembantu untuk membaca stream data dari Vercel request
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const bodyStr = buffer.toString('utf-8');

    // Karena we pakai FormData di frontend, format datanya multipart. Parse manual:
    const params = new URLSearchParams(bodyStr);
    message = params.get('message') || "";
    base64Image = params.get('image') || null;

    // Persiapan data untuk Gemini Multimodal
    const promptParts = [{ text: message }];

    if (base64Image) {
      // Ambil data Base64 bersih (tanpa 'data:image/jpeg;base64,')
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      promptParts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    // Panggil Gemini 3 Flash dengan data Multimodal
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: promptParts
        }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: { message: data.error.message } });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Gagal parse/kirim:", error);
        res.status(500).json({ error: { message: "Masalah teknis di backend: " + error.message } });
    }
}
