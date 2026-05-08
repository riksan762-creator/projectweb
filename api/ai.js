/**
 * Riksan AI — API Handler Supreme v5.1
 * Author: Riksan (CTO SawargiPay)
 * Endpoint: /api/ai
 * Fix v5.1: Groq vision model + message format yang benar
 */

export const config = {
    maxDuration: 90,
};

// ─── MODELS ──────────────────────────────────────────────────
// Vision models (support image input) di Groq
const GROQ_VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
];

// Chat / coding models (lebih kuat untuk text)
const GROQ_CHAT_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
];

// ─── REGEX ───────────────────────────────────────────────────
const SEARCH_TRIGGERS  = /berita|terbaru|hari ini|tanggal|sekarang|siapa|apa itu|kenapa|cek|cari|harga|cuaca|jadwal|terkini|latest|news|today|current|who is|what is/i;
const TIKTOK_REGEX     = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\-\/\?\=\&\%]+/i;
const IMAGE_GEN_REGEX  = /^(generate|buat|buatkan|create|gambar|bikin)\s+(gambar|image|foto|ilustrasi|artwork|photo)/i;

// ─── CORS ────────────────────────────────────────────────────
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

    const { GROQ_API_KEY, SERPER_API_KEY, STABILITY_API_KEY, OPENAI_API_KEY } = process.env;

    if (!GROQ_API_KEY) {
        return res.status(500).json({
            success: false,
            reply: "**Config Error:** `GROQ_API_KEY` belum di-set di Vercel Environment Variables, Bos."
        });
    }

    try {
        const {
            message     = "",
            imageBase64,
            systemPrompt,
            history     = [],
            mode        = "chat",
        } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ success: false, reply: "Pesan kosong, Bos!" });
        }

        // ── DATETIME WIB ─────────────────────────────────────
        const now = new Date();
        const dateString = now.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'Asia/Jakarta'
        });
        const timeString = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

        // ── PARALLEL SIDE TASKS ───────────────────────────────
        let searchContext     = "";
        let tiktokInfo        = null;
        let generatedImageUrl = null;
        const tasks           = [];

        // 1. WEB SEARCH
        if (SERPER_API_KEY && SEARCH_TRIGGERS.test(message)) {
            tasks.push((async () => {
                try {
                    const r = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                        body: JSON.stringify({ q: `${message} ${dateString}`, gl: "id", hl: "id", num: 5 })
                    });
                    const d = await r.json();
                    const parts = [];
                    if (d.answerBox?.answer)           parts.push(`Jawaban Langsung: ${d.answerBox.answer}`);
                    if (d.knowledgeGraph?.description) parts.push(`Info: ${d.knowledgeGraph.description}`);
                    (d.organic || []).forEach((o, i)   => parts.push(`[${i+1}] ${o.title}: ${o.snippet}`));
                    searchContext = parts.join("\n\n");
                } catch (e) { console.error("Search error:", e.message); }
            })());
        }

        // 2. TIKTOK DOWNLOADER
        if (TIKTOK_REGEX.test(message)) {
            tasks.push((async () => {
                try {
                    const url = message.match(TIKTOK_REGEX)[0];
                    const r   = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    const d = await r.json();
                    if (d.code === 0 && d.data) {
                        const play = d.data.play || d.data.wmplay || "";
                        tiktokInfo = {
                            title:    d.data.title || "Video TikTok",
                            author:   d.data.author?.nickname || "Unknown",
                            duration: d.data.duration ? `${d.data.duration}s` : "-",
                            dlLink:   play.startsWith('http') ? play : `https://www.tikwm.com${play}`,
                        };
                    }
                } catch (e) { console.error("TikTok error:", e.message); }
            })());
        }

        // 3. IMAGE GENERATION
        const wantsImage = mode === "image" || IMAGE_GEN_REGEX.test(message.trim());
        if (wantsImage && (STABILITY_API_KEY || OPENAI_API_KEY)) {
            tasks.push((async () => {
                try {
                    const prompt = message
                        .replace(IMAGE_GEN_REGEX, '')
                        .replace(/^(dari|tentang|:)\s*/i, '')
                        .trim() || message;

                    if (STABILITY_API_KEY) {
                        const r = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${STABILITY_API_KEY}`,
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({
                                text_prompts: [
                                    { text: prompt, weight: 1 },
                                    { text: "blurry, ugly, deformed, watermark, low quality", weight: -1 }
                                ],
                                cfg_scale: 7, height: 1024, width: 1024, steps: 30, samples: 1,
                            })
                        });
                        const d = await r.json();
                        if (d.artifacts?.[0]?.base64) {
                            generatedImageUrl = `data:image/png;base64,${d.artifacts[0].base64}`;
                        }
                    } else if (OPENAI_API_KEY) {
                        const r = await fetch("https://api.openai.com/v1/images/generations", {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" })
                        });
                        const d = await r.json();
                        if (d.data?.[0]?.url) generatedImageUrl = d.data[0].url;
                    }
                } catch (e) { console.error("Image gen error:", e.message); }
            })());
        }

        await Promise.all(tasks);

        // ── BUILD SYSTEM PROMPT ───────────────────────────────
        const sysPrompt = systemPrompt || buildSystemPrompt({ dateString, timeString, searchContext, mode });

        // ── BUILD MESSAGES ARRAY ──────────────────────────────
        const messages = [{ role: "system", content: sysPrompt }];

        // History (max 16 turn, text-only — jangan kirim gambar lama)
        for (const h of (history || []).slice(-16)) {
            if (h.role && typeof h.content === "string" && h.content.trim()) {
                messages.push({ role: h.role, content: h.content });
            }
        }

        // Pesan user sekarang — dengan atau tanpa gambar
        if (imageBase64) {
            // FORMAT GROQ VISION YANG BENAR (v5.1 fix):
            // 1. text type DULU, baru image_url
            // 2. TIDAK ada field "detail" (Groq tidak support)
            // 3. imageBase64 harus berupa full data URI: "data:image/jpeg;base64,..."
            messages.push({
                role: "user",
                content: [
                    {
                        type: "text",
                        text: message || "Analisis gambar ini secara lengkap dan detail."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageBase64
                        }
                    }
                ]
            });
        } else {
            messages.push({ role: "user", content: message });
        }

        // ── CALL GROQ — AUTO FALLBACK ─────────────────────────
        // Vision butuh model khusus, chat biasa pakai model berbeda
        const modelList = imageBase64 ? GROQ_VISION_MODELS : GROQ_CHAT_MODELS;
        let aiReply     = null;
        let lastError   = null;

        for (const model of modelList) {
            try {
                const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature: mode === 'code' ? 0.1 : 0.7,
                        max_tokens:  mode === 'code' ? 4096 : 2048,
                    })
                });

                if (!r.ok) {
                    const errBody = await r.json().catch(() => ({}));
                    const errMsg  = errBody?.error?.message || `HTTP ${r.status}`;
                    console.error(`[Groq] ${model} => ${errMsg}`);
                    throw new Error(errMsg);
                }

                const data = await r.json();
                const content = data.choices?.[0]?.message?.content?.trim();
                if (content) {
                    aiReply = content;
                    break; // sukses
                }
            } catch (e) {
                lastError = e;
                continue; // coba model berikutnya
            }
        }

        // Kalau semua model gagal, tampilkan error spesifik
        if (!aiReply) {
            const detail = lastError?.message || "Semua model Groq gagal merespons";
            return res.status(500).json({
                success: false,
                reply: `**Groq API Error**\n\n\`\`\`\n${detail}\n\`\`\`\n\n**Cek:**\n- Model vision aktif di akun Groq Bos?\n- API key masih valid?\n- Rate limit?\n\n[Console Groq](https://console.groq.com)`
            });
        }

        // ── TIKTOK BLOCK ──────────────────────────────────────
        if (tiktokInfo) {
            aiReply += [
                "\n\n---",
                "### 📥 TikTok Download Ready",
                "",
                `| | |`,
                `|---|---|`,
                `| 🎬 Judul | ${tiktokInfo.title} |`,
                `| 👤 Creator | @${tiktokInfo.author} |`,
                `| ⏱ Durasi | ${tiktokInfo.duration} |`,
                "",
                `**[⬇️ Download Video](${tiktokInfo.dlLink})**`,
                "",
                "> *Link langsung download .mp4 ke device Bos*"
            ].join("\n");
        }

        // ── RESPONSE ──────────────────────────────────────────
        return res.status(200).json({
            success: true,
            reply: aiReply,
            ...(generatedImageUrl && { generatedImageUrl }),
            meta: {
                model:       modelList[0],
                hasSearch:   !!searchContext,
                hasVision:   !!imageBase64,
                hasImageGen: !!generatedImageUrl,
                hasTikTok:   !!tiktokInfo,
            }
        });

    } catch (error) {
        console.error("Unhandled error:", error);
        return res.status(500).json({
            success: false,
            reply: `**Server Error**\n\n\`${error.message}\`\n\nCek Vercel Function Logs, Bos.`
        });
    }
}

// ─── SYSTEM PROMPT BUILDER ────────────────────────────────────
function buildSystemPrompt({ dateString, timeString, searchContext, mode }) {
    const modeGuide = {
        code:    "MODE CODING: Tulis kode clean, production-ready. Wajib ada penjelasan + cara setup.",
        analyze: "MODE ANALISIS: Berikan analisis mendalam, terstruktur, dan actionable.",
        write:   "MODE MENULIS: Buat konten engaging, original, dan berkualitas tinggi.",
        image:   "MODE IMAGE: Deskripsikan gambar hasil generate secara detail.",
        chat:    "MODE CHAT: Jawab natural, cerdas, dan helpful.",
    };

    return `Kamu adalah Riksan AI Supreme v5.1, asisten AI canggih buatan Riksan (CTO SawargiPay).

WAKTU SEKARANG: ${dateString}, pukul ${timeString} WIB.

KEAHLIAN: Full-stack dev (JS/TS/Python/PHP/Go/Rust), computer vision, image generation, web search real-time, data analysis, content writing, matematika.

ATURAN:
- Bahasa Indonesia kecuali diminta lain
- Panggil user "Bos"
- Format Markdown rapi, emoji secukupnya
- JANGAN bilang tidak tahu waktu/tanggal — kamu tahu
- Kalau ada hasil web search, gunakan sebagai referensi fakta

${modeGuide[mode] || modeGuide.chat}
${searchContext ? `\nHASIL WEB SEARCH:\n${searchContext}` : ""}`.trim();
}
