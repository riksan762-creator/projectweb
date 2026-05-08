/**
 * Riksan AI — API Handler Supreme v5.0
 * Author: Riksan (CTO SawargiPay)
 * Endpoint: /api/ai
 * Features: Chat · Vision · Web Search · TikTok DL · Image Gen · History
 */

export const config = {
    maxDuration: 90,
};

// ─── CONSTANTS ───────────────────────────────────────────────
const GROQ_MODELS = [
    "meta-llama/llama-4-maverick-17b-128e-instruct", // Primary — vision capable
    "llama-3.3-70b-versatile",                         // Fallback 1
    "llama-3.1-8b-instant",                            // Fallback 2 (fast)
];

const SEARCH_TRIGGERS = /berita|terbaru|hari ini|tanggal|sekarang|siapa|apa itu|kenapa|cek|cari|harga|cuaca|jadwal|terkini|latest|news|today|current|who is|what is/i;

const TIKTOK_REGEX = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\-\/\?\=\&\%]+/i;

// ─── CORS HELPER ─────────────────────────────────────────────
function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─── MAIN HANDLER ────────────────────────────────────────────
export default async function handler(req, res) {
    setCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

    const {
        GROQ_API_KEY,
        SERPER_API_KEY,
        STABILITY_API_KEY,
        OPENAI_API_KEY,
    } = process.env;

    try {
        const { message = "", imageBase64, systemPrompt, history = [], mode = "chat" } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ success: false, reply: "Pesan kosong, Bos!" });
        }

        // ── DATETIME ──────────────────────────────────────────
        const now = new Date();
        const dateString = now.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Asia/Jakarta'
        });
        const timeString = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

        // ── PARALLEL TASKS ────────────────────────────────────
        let searchContext = "";
        let tiktokInfo = null;
        let generatedImageUrl = null;

        const tasks = [];

        // 1. WEB SEARCH
        const needsSearch = SEARCH_TRIGGERS.test(message) || mode === "analyze";
        if (needsSearch && SERPER_API_KEY) {
            tasks.push((async () => {
                try {
                    const sRes = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: {
                            "X-API-KEY": SERPER_API_KEY,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            q: `${message} ${dateString}`,
                            gl: "id", hl: "id", num: 5
                        })
                    });
                    const sData = await sRes.json();
                    const results = sData.organic || [];

                    // Extract judul + snippet untuk konteks lebih kaya
                    searchContext = results.map((o, i) =>
                        `[${i + 1}] ${o.title}\n${o.snippet}`
                    ).join("\n\n");

                    // Tambahkan answer box jika ada
                    if (sData.answerBox?.answer) {
                        searchContext = `📌 Answer: ${sData.answerBox.answer}\n\n` + searchContext;
                    }
                    if (sData.knowledgeGraph?.description) {
                        searchContext = `📚 Knowledge: ${sData.knowledgeGraph.description}\n\n` + searchContext;
                    }
                } catch (e) {
                    console.error("Search error:", e.message);
                }
            })());
        }

        // 2. TIKTOK DOWNLOADER
        if (TIKTOK_REGEX.test(message)) {
            tasks.push((async () => {
                try {
                    const ttUrl = message.match(TIKTOK_REGEX)[0];

                    // Coba tikwm dulu
                    const ttRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(ttUrl)}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    const ttData = await ttRes.json();

                    if (ttData.code === 0 && ttData.data) {
                        const d = ttData.data;
                        const videoUrl = d.play || d.wmplay || "";
                        tiktokInfo = {
                            title: d.title || "Video TikTok",
                            author: d.author?.nickname || "Unknown",
                            duration: d.duration ? `${d.duration}s` : "-",
                            dlLink: videoUrl.startsWith('http') ? videoUrl : `https://www.tikwm.com${videoUrl}`,
                            dlNoWm: d.play?.startsWith('http') ? d.play : null,
                            cover: d.cover || null,
                        };
                    }
                } catch (e) {
                    console.error("TikTok error:", e.message);
                }
            })());
        }

        // 3. IMAGE GENERATION (jika mode image atau keyword match)
        const imageKeywords = /^(generate|buat|buatkan|create|gambar|bikin)\s+(gambar|image|foto|ilustrasi|artwork|photo)/i;
        const wantsImage = mode === "image" || imageKeywords.test(message.trim());

        if (wantsImage && (STABILITY_API_KEY || OPENAI_API_KEY)) {
            tasks.push((async () => {
                try {
                    // Extract prompt bersih
                    const imgPrompt = message
                        .replace(/^(generate|buat|buatkan|create|bikin)\s+(gambar|image|foto|ilustrasi|artwork|photo)\s*(dari|tentang|:)?\s*/i, '')
                        .trim() || message;

                    if (STABILITY_API_KEY) {
                        // Stability AI — SDXL
                        const sRes = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${STABILITY_API_KEY}`,
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({
                                text_prompts: [
                                    { text: imgPrompt, weight: 1 },
                                    { text: "blurry, ugly, deformed, watermark, low quality", weight: -1 }
                                ],
                                cfg_scale: 7,
                                height: 1024,
                                width: 1024,
                                steps: 30,
                                samples: 1,
                            })
                        });
                        const sData = await sRes.json();
                        if (sData.artifacts?.[0]?.base64) {
                            generatedImageUrl = `data:image/png;base64,${sData.artifacts[0].base64}`;
                        }
                    } else if (OPENAI_API_KEY) {
                        // DALL-E 3 fallback
                        const dRes = await fetch("https://api.openai.com/v1/images/generations", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                model: "dall-e-3",
                                prompt: imgPrompt,
                                n: 1, size: "1024x1024",
                                quality: "standard"
                            })
                        });
                        const dData = await dRes.json();
                        if (dData.data?.[0]?.url) {
                            generatedImageUrl = dData.data[0].url;
                        }
                    }
                } catch (e) {
                    console.error("Image gen error:", e.message);
                }
            })());
        }

        // Run all tasks in parallel
        await Promise.all(tasks);

        // ── BUILD SYSTEM PROMPT ───────────────────────────────
        const finalSystemPrompt = systemPrompt || buildDefaultSystemPrompt({
            dateString, timeString, searchContext, mode
        });

        // ── BUILD MESSAGES ────────────────────────────────────
        const messages = [
            { role: "system", content: finalSystemPrompt }
        ];

        // Add conversation history (max 16 turns)
        const recentHistory = (history || []).slice(-16);
        for (const h of recentHistory) {
            if (h.role && h.content) {
                messages.push({ role: h.role, content: h.content });
            }
        }

        // Add current user message (with vision support)
        if (imageBase64) {
            messages.push({
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: imageBase64,
                            detail: "high"
                        }
                    },
                    {
                        type: "text",
                        text: message || "Analisis gambar ini secara lengkap dan detail. Jelaskan semua yang kamu lihat."
                    }
                ]
            });
        } else {
            messages.push({ role: "user", content: message });
        }

        // ── CALL GROQ WITH AUTO-FALLBACK ──────────────────────
        let aiReply = null;
        let lastError = null;

        // Pilih model: vision model untuk gambar, model terbaik untuk yang lain
        const modelList = imageBase64
            ? [GROQ_MODELS[0], GROQ_MODELS[1]] // vision models first
            : GROQ_MODELS;

        for (const model of modelList) {
            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature: mode === 'code' ? 0.1 : 0.7,
                        max_tokens: mode === 'code' ? 4096 : 2048,
                        top_p: 0.9,
                    })
                });

                if (!groqRes.ok) {
                    const errBody = await groqRes.json().catch(() => ({}));
                    throw new Error(errBody.error?.message || `HTTP ${groqRes.status}`);
                }

                const data = await groqRes.json();
                aiReply = data.choices?.[0]?.message?.content;
                if (aiReply) break; // success, stop trying

            } catch (e) {
                lastError = e;
                console.error(`Model ${model} failed:`, e.message);
                continue; // try next model
            }
        }

        if (!aiReply) {
            throw new Error(lastError?.message || "Semua model gagal merespons.");
        }

        // ── APPEND TIKTOK INFO ────────────────────────────────
        if (tiktokInfo) {
            aiReply += buildTikTokBlock(tiktokInfo);
        }

        // ── RESPOND ───────────────────────────────────────────
        return res.status(200).json({
            success: true,
            reply: aiReply,
            ...(generatedImageUrl && { generatedImageUrl }),
            meta: {
                model: GROQ_MODELS[0],
                hasSearch: !!searchContext,
                hasVision: !!imageBase64,
                hasImageGen: !!generatedImageUrl,
                hasTikTok: !!tiktokInfo,
                timestamp: now.toISOString(),
            }
        });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({
            success: false,
            reply: `**Server Error**\n\n\`${error.message}\`\n\nCek Vercel logs untuk detail, Bos.`
        });
    }
}

// ─── BUILD DEFAULT SYSTEM PROMPT ─────────────────────────────
function buildDefaultSystemPrompt({ dateString, timeString, searchContext, mode }) {
    const modeInstructions = {
        code:    "Kamu dalam MODE CODING. Tulis kode yang clean, production-ready, dan selalu sertakan penjelasan + best practices.",
        analyze: "Kamu dalam MODE ANALISIS. Berikan analisis mendalam, struktural, dan actionable.",
        write:   "Kamu dalam MODE MENULIS. Hasilkan konten yang engaging, original, dan berkualitas tinggi.",
        image:   "Kamu dalam MODE IMAGE. Konfirmasi gambar yang sudah di-generate dan jelaskan detail hasilnya.",
        chat:    "Kamu dalam MODE CHAT. Jawab dengan natural, cerdas, dan helpful.",
    };

    return `Kamu adalah Riksan AI Supreme v5.0, asisten AI paling canggih yang dibuat oleh Riksan (CTO SawargiPay).

📅 WAKTU SEKARANG: ${dateString}, Pukul ${timeString} WIB.

🧠 KEMAMPUAN KAMU:
- Master coding: JavaScript, TypeScript, Python, PHP, Go, Rust, SQL, dan semua bahasa populer
- Analisis gambar dengan detail tinggi (computer vision)
- Generate gambar dengan Stability AI & DALL-E
- Akses web search real-time via Serper API  
- Download video TikTok otomatis
- Matematika & LaTeX rendering
- Analisis data & business intelligence
- Nulis konten: artikel, copywriting, email, script

📌 ATURAN RESPONS:
1. Bahasa Indonesia kecuali diminta lain
2. Panggil user "Bos"
3. Format Markdown yang rapi dengan emoji secukupnya
4. JANGAN bilang "tidak tahu tanggal" atau "tidak bisa search" — kamu bisa
5. Jawaban coding wajib lengkap: kode + penjelasan + cara pakai
6. Kalau ada konteks pencarian, gunakan sebagai referensi fakta terkini

${modeInstructions[mode] || modeInstructions.chat}

${searchContext ? `🔍 KONTEKS WEB SEARCH TERKINI:\n${searchContext}` : ""}`.trim();
}

// ─── BUILD TIKTOK RESPONSE BLOCK ─────────────────────────────
function buildTikTokBlock(info) {
    return `

---
### 📥 TikTok Download Ready

| Info | Detail |
|------|--------|
| 🎬 Judul | ${info.title} |
| 👤 Creator | @${info.author} |
| ⏱ Durasi | ${info.duration} |

${info.dlNoWm
    ? `**[⬇️ Download Tanpa Watermark](${info.dlNoWm})**`
    : `**[⬇️ Download Video](${info.dlLink})**`
}

> *Link langsung download .mp4 ke device Bos*`;
}
