export const config = {
    maxDuration: 60, 
};

export default async function handler(req, res) {
    const apiKey = process.env.GROQ_API_KEY;
    const searchApiKey = process.env.SERPER_API_KEY;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    try {
        const { message, imageBase64 } = req.body;
        let webResults = "";

        // --- BRAIN SELECTION: MATEMATIKA, AI, & CODING ---
        const isComplexTask = /hitung|rumus|matematika|algoritma|coding|script|ai|machine learning|deep learning/i.test(message);
        
        // --- WEB SEARCH SYNC ---
        const needsSearch = /cari|search|berita|terbaru|update|siapa|apa itu/i.test(message);
        if (needsSearch && !imageBase64 && searchApiKey) {
            try {
                const searchRes = await fetch("https://google.serper.dev/search", {
                    method: "POST",
                    headers: { "X-API-KEY": searchApiKey, "Content-Type": "application/json" },
                    body: JSON.stringify({ q: message, gl: "id", hl: "id", num: 4 })
                });
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    webResults = searchData.organic?.map(s => `[${s.title}]: ${s.snippet}`).join("\n") || "";
                }
            } catch (e) { console.error("Search Fail"); }
        }

        const modelId = imageBase64 ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";

        // --- SYSTEM PROMPT: THE SUPREME INTELLIGENCE ---
        const systemPrompt = `Kamu adalah Riksan AI v3.3 (Supreme Core).
        Owner: Riksan (CTO SawargiPay).
        Waktu Sekarang: April 2026.

        KEMAMPUAN MULTI-DOMAIN:
        1. MASTER CODING: Berikan solusi arsitektur software, debugging kelas berat, dan optimasi script (JavaScript, Python, Go, dll).
        2. MATHEMATICIAN: Selesaikan soal matematika (Kalkulus, Linear Algebra, Diskrit) dengan langkah-langkah sistematis.
        3. AI SPECIALIST: Jelaskan konsep Neural Networks, LLM, Training Data, dan perkembangan AI terbaru 2026.
        4. ANALYST: Gunakan data web berikut jika relevan: ${webResults}
        5. VISION: Jelaskan gambar/foto secara teknis jika ada.

        GAYA BAHASA: Sangat cerdas, teknis, solutif, panggil 'Bos'. Gunakan LaTeX untuk rumus matematika agar rapi.`;

        const contentArray = [{ type: "text", text: message || "Analisis secara mendalam." }];
        if (imageBase64) {
            contentArray.push({ type: "image_url", image_url: { url: imageBase64 } });
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: contentArray }
                ],
                temperature: isComplexTask ? 0.2 : 0.6, // Sangat rendah buat itung-itungan biar presisi
                max_tokens: 4000,
                top_p: 1
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            res.status(200).json({ reply: data.choices[0].message.content, success: true });
        } else {
            throw new Error("API Limit reached.");
        }

    } catch (error) {
        res.status(500).json({ 
            reply: "Duh Bos, jalur logika sedang overload. Cek limit API atau koneksi!", 
            success: false 
        });
    }
}
