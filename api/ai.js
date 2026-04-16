export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: "API Key missing!" } });

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const buffer = Buffer.concat(chunks);
    const bodyStr = buffer.toString('utf-8');
    const params = new URLSearchParams(bodyStr);
    
    const userMessage = params.get('message') || "";
    const base64Image = params.get('image') || null;

    // SYSTEM INSTRUCTION: Mengunci identitas agar tidak melantur ke bahasa Inggris/topik lain
    const systemInstruction = "Kamu adalah Riksan AI, asisten pribadi yang ramah dan cerdas buatan Riksan. Kamu HARUS menjawab dalam Bahasa Indonesia yang santai tapi sopan. Jika ada gambar yang dikirim, jelaskan isinya dengan detail dan nyambung dengan pertanyaan user.";

    const promptParts = [
      { text: `${systemInstruction}\n\nUser: ${userMessage}` }
    ];

    if (base64Image) {
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];
      promptParts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    // Menggunakan Endpoint v1beta sesuai dokumentasi Gemini 3 Flash Preview
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey 
      },
      body: JSON.stringify({
        contents: [{ parts: promptParts }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: { message: "Backend Error: " + error.message } });
  }
}
