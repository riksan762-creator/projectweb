/**
 * Riksan AI — API Handler Nexus v6.0
 * Endpoint: /api/ai
 * Upgrades: Smarter web search, real-time datetime, better prompting,
 *           news search, weather, TikTok, image gen, auto model fallback
 */

export const config = { maxDuration: 120 };

// ─── MODEL LISTS ─────────────────────────────────────────────
const VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
];

const CHAT_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
    "llama-3.1-8b-instant",
];

// ─── REGEXES ─────────────────────────────────────────────────
const SEARCH_TRIGGERS = /berita|terbaru|hari ini|tanggal|sekarang|siapa|apa itu|kenapa|cek|cari|harga|cuaca|jadwal|terkini|latest|news|today|current|who is|what is|kapan|berapa|dimana|trending|viral|update|release|peluncuran|prediksi|ramalan|prakiraan|stock|saham|kurs|nilai tukar/i;
const TIKTOK_REGEX    = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\-\/\?\=\&\%]+/i;
const IMAGE_GEN_REGEX = /^(generate|buat|buatkan|create|gambar|bikin|hasilkan)\s+(gambar|image|foto|ilustrasi|artwork|photo|picture|visual)/i;
const WEATHER_REGEX   = /cuaca|weather|suhu|temperature|hujan|cerah|mendung|forecast|prakiraan cuaca/i;
const NEWS_REGEX      = /berita|news|terbaru|headline|terkini|trending|viral/i;

// ─── CORS ─────────────────────────────────────────────────────
function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── GET REAL DATETIME WIB ───────────────────────────────────
function getWIBDateTime() {
    const now  = new Date();
    const opts = { timeZone: 'Asia/Jakarta' };

    const dateStr = now.toLocaleDateString('id-ID', {
        ...opts, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('id-ID', {
        ...opts, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const dayName = now.toLocaleDateString('id-ID', { ...opts, weekday: 'long' });
    const year    = new Date(now.toLocaleString('en-US', opts)).getFullYear();
    const month   = new Date(now.toLocaleString('en-US', opts)).getMonth() + 1;
    const day     = new Date(now.toLocaleString('en-US', opts)).getDate();

    return { dateStr, timeStr, dayName, year, month, day, iso: now.toISOString() };
}

// ─── WEB SEARCH (SERPER) ─────────────────────────────────────
async function doWebSearch(query, apiKey, extra = {}) {
    try {
        const payload = {
            q:   query,
            gl:  'id',
            hl:  'id',
            num: extra.num || 6,
        };
        if (extra.type === 'news') payload.type = 'news';

        const r = await fetch('https://google.serper.dev/search', {
            method:  'POST',
            headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });

        const d = await r.json();
        const parts = [];

        if (d.answerBox?.answer)           parts.push(`📌 Jawaban Langsung: ${d.answerBox.answer}`);
        if (d.answerBox?.snippet)          parts.push(`📌 ${d.answerBox.snippet}`);
        if (d.knowledgeGraph?.description) parts.push(`ℹ️ ${d.knowledgeGraph.description}`);
        if (d.knowledgeGraph?.attributes)  {
            const attrs = Object.entries(d.knowledgeGraph.attributes).slice(0, 4);
            attrs.forEach(([k, v]) => parts.push(`• ${k}: ${v}`));
        }

        (d.organic || []).slice(0, 5).forEach((o, i) => {
            parts.push(`[${i+1}] **${o.title}**\n${o.snippet}\n🔗 ${o.link}`);
        });

        (d.topStories || []).slice(0, 3).forEach(s => {
            parts.push(`📰 ${s.title} — ${s.source} (${s.date || 'baru'})\n🔗 ${s.link}`);
        });

        (d.peopleAlsoAsk || []).slice(0, 2).forEach(q => {
            if (q.snippet) parts.push(`❓ ${q.question}: ${q.snippet}`);
        });

        return parts.join('\n\n');
    } catch (e) {
        console.error('[Search]', e.message);
        return '';
    }
}

// ─── WEATHER (OpenWeather or Serper fallback) ─────────────────
async function getWeather(query, serperKey, weatherKey) {
    if (weatherKey) {
        // Extract city from query
        const cityMatch = query.match(/cuaca\s+(.+?)(\s+hari|\s+besok|$)/i);
        const city      = cityMatch ? cityMatch[1].trim() : 'Jakarta';
        try {
            const r = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherKey}&units=metric&lang=id`
            );
            const d = await r.json();
            if (d.cod === 200) {
                return `🌤 **Cuaca ${d.name}:**\n• Kondisi: ${d.weather[0].description}\n• Suhu: ${d.main.temp}°C (feels like ${d.main.feels_like}°C)\n• Kelembapan: ${d.main.humidity}%\n• Kecepatan angin: ${d.wind.speed} m/s`;
            }
        } catch (e) {}
    }
    // Fallback ke serper
    if (serperKey) return doWebSearch(`cuaca ${query}`, serperKey);
    return '';
}

// ─── MAIN HANDLER ─────────────────────────────────────────────
export default async function handler(req, res) {
    setCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')    return res.status(405).json({ error: 'Method Not Allowed' });

    const {
        GROQ_API_KEY,
        SERPER_API_KEY,
        STABILITY_API_KEY,
        OPENAI_API_KEY,
        OPENWEATHER_API_KEY,
    } = process.env;

    if (!GROQ_API_KEY) {
        return res.status(500).json({
            success: false,
            reply:   '**Config Error:** `GROQ_API_KEY` belum di-set di Vercel Environment Variables, Bos.'
        });
    }

    try {
        const {
            message      = '',
            imageBase64,
            systemPrompt,
            history      = [],
            mode         = 'chat',
            webSearch    = true,
        } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ success: false, reply: 'Pesan kosong, Bos!' });
        }

        // ── GET REAL DATETIME ─────────────────────────────────
        const dt = getWIBDateTime();

        // ── PARALLEL TASKS ────────────────────────────────────
        let searchContext     = '';
        let weatherContext    = '';
        let tiktokInfo        = null;
        let generatedImageUrl = null;
        const tasks           = [];

        // 1. WEB SEARCH — trigger on keywords or search mode
        const shouldSearch = webSearch && SERPER_API_KEY && (
            mode === 'search' ||
            SEARCH_TRIGGERS.test(message)
        );

        if (shouldSearch) {
            tasks.push((async () => {
                // If news query, do extra news search
                if (NEWS_REGEX.test(message)) {
                    const [general, news] = await Promise.all([
                        doWebSearch(message, SERPER_API_KEY),
                        doWebSearch(message, SERPER_API_KEY, { type: 'news', num: 5 }),
                    ]);
                    searchContext = [general, news].filter(Boolean).join('\n\n---\n\n');
                } else {
                    searchContext = await doWebSearch(`${message}`, SERPER_API_KEY);
                }
            })());
        }

        // 2. WEATHER
        if (WEATHER_REGEX.test(message)) {
            tasks.push((async () => {
                weatherContext = await getWeather(message, SERPER_API_KEY, OPENWEATHER_API_KEY);
            })());
        }

        // 3. TIKTOK DOWNLOADER
        if (TIKTOK_REGEX.test(message)) {
            tasks.push((async () => {
                try {
                    const url = message.match(TIKTOK_REGEX)[0];
                    const r   = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    const d = await r.json();
                    if (d.code === 0 && d.data) {
                        const play = d.data.play || d.data.wmplay || '';
                        tiktokInfo = {
                            title:    d.data.title || 'Video TikTok',
                            author:   d.data.author?.nickname || 'Unknown',
                            duration: d.data.duration ? `${d.data.duration}s` : '—',
                            dlLink:   play.startsWith('http') ? play : `https://www.tikwm.com${play}`,
                            cover:    d.data.cover || '',
                        };
                    }
                } catch (e) { console.error('[TikTok]', e.message); }
            })());
        }

        // 4. IMAGE GENERATION
        const wantsImage = mode === 'image' || IMAGE_GEN_REGEX.test(message.trim());
        if (wantsImage && (STABILITY_API_KEY || OPENAI_API_KEY)) {
            tasks.push((async () => {
                try {
                    const cleanPrompt = message
                        .replace(IMAGE_GEN_REGEX, '')
                        .replace(/^(dari|tentang|:)\s*/i, '')
                        .trim() || message;

                    // Enhanced prompt for better results
                    const enhancedPrompt = `${cleanPrompt}, highly detailed, professional quality, 8k resolution, sharp focus`;

                    if (STABILITY_API_KEY) {
                        const r = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
                            method:  'POST',
                            headers: {
                                'Authorization': `Bearer ${STABILITY_API_KEY}`,
                                'Content-Type':  'application/json',
                                'Accept':        'application/json',
                            },
                            body: JSON.stringify({
                                text_prompts: [
                                    { text: enhancedPrompt, weight: 1 },
                                    { text: 'blurry, ugly, deformed, watermark, low quality, pixelated, noisy', weight: -1 },
                                ],
                                cfg_scale: 7, height: 1024, width: 1024, steps: 35, samples: 1,
                                style_preset: 'photographic',
                            }),
                        });
                        const d = await r.json();
                        if (d.artifacts?.[0]?.base64) {
                            generatedImageUrl = `data:image/png;base64,${d.artifacts[0].base64}`;
                        }
                    } else if (OPENAI_API_KEY) {
                        const r = await fetch('https://api.openai.com/v1/images/generations', {
                            method:  'POST',
                            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                            body:    JSON.stringify({ model: 'dall-e-3', prompt: enhancedPrompt, n: 1, size: '1024x1024', quality: 'hd' }),
                        });
                        const d = await r.json();
                        if (d.data?.[0]?.url) generatedImageUrl = d.data[0].url;
                    }
                } catch (e) { console.error('[ImageGen]', e.message); }
            })());
        }

        // Run all parallel tasks
        await Promise.all(tasks);

        // ── BUILD SYSTEM PROMPT ───────────────────────────────
        const modeGuide = {
            chat:    'MODE CHAT: Jawab natural, cerdas, helpful. Seperti teman terpintar.',
            search:  'MODE WEB SEARCH: PRIORITASKAN hasil web search di atas. Format: summary → detail → sumber.',
            code:    'MODE CODING: Tulis kode clean, production-ready. Selalu ada: penjelasan, kode lengkap, setup, contoh, best practices.',
            analyze: 'MODE ANALISIS: Analisis mendalam. Format: Executive Summary → Temuan → Insight → Rekomendasi → Next Steps.',
            write:   'MODE WRITER: Konten engaging, original, berkualitas. Hook kuat, body solid, CTA jelas.',
            image:   'MODE IMAGE GEN: Deskripsikan hasil gambar yang akan/sudah di-generate. Jelaskan detail visual.',
        };

        const extraContext = [
            weatherContext   ? `\n🌤 DATA CUACA:\n${weatherContext}`            : '',
            searchContext    ? `\n🔍 HASIL WEB SEARCH (GUNAKAN INI):\n${searchContext}` : '',
        ].filter(Boolean).join('\n');

        const sysPrompt = systemPrompt || `Kamu adalah Riksan AI Nexus v6.0, asisten AI super cerdas buatan Riksan (CTO SawargiPay).

═══ WAKTU REAL-TIME ═══
Tanggal: ${dt.dateStr}
Hari: ${dt.dayName}
Jam: ${dt.timeStr} WIB
INSTRUKSI: Kamu SELALU TAHU tanggal & waktu persis. JANGAN PERNAH bilang tidak tahu tanggal/waktu saat ini.

═══ IDENTITAS ═══
• Panggil user: "Bos"
• Bahasa: Indonesia (kecuali diminta lain)
• Gaya: Cerdas, friendly, profesional tapi santai
• Selalu berikan nilai nyata, bukan jawaban generik

═══ FORMAT ═══
• Markdown rapi, heading ##, bullet points
• Emoji secukupnya (tidak berlebihan)
• Tabel untuk perbandingan data
• Code block dengan bahasa yang benar
• Blockquote untuk highlight penting
• Jawaban panjang = section jelas
• Jawaban pendek = langsung to the point

${modeGuide[mode] || modeGuide.chat}
${extraContext}`.trim();

        // ── BUILD MESSAGES ────────────────────────────────────
        const messages = [{ role: 'system', content: sysPrompt }];

        // History (last 14 turns, text only — no old images)
        for (const h of (history || []).slice(-14)) {
            if (h.role && typeof h.content === 'string' && h.content.trim()) {
                messages.push({ role: h.role, content: h.content });
            }
        }

        // Current message
        if (imageBase64) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: message || 'Analisis gambar ini secara lengkap dan detail.' },
                    { type: 'image_url', image_url: { url: imageBase64 } },
                ],
            });
        } else {
            messages.push({ role: 'user', content: message });
        }

        // ── CALL GROQ WITH FALLBACK ───────────────────────────
        const modelList = imageBase64 ? VISION_MODELS : CHAT_MODELS;
        let   aiReply   = null;
        let   usedModel = null;
        let   lastError = null;

        for (const model of modelList) {
            try {
                const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method:  'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type':  'application/json',
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature: mode === 'code' ? 0.15 : mode === 'analyze' ? 0.3 : 0.72,
                        max_tokens:  mode === 'code' ? 6000 : mode === 'analyze' ? 4096 : 3000,
                        top_p:       0.95,
                        stream:      false,
                    }),
                });

                if (!r.ok) {
                    const errBody = await r.json().catch(() => ({}));
                    const errMsg  = errBody?.error?.message || `HTTP ${r.status}`;
                    console.error(`[Groq] ${model} → ${errMsg}`);
                    lastError = new Error(errMsg);
                    continue;
                }

                const data    = await r.json();
                const content = data.choices?.[0]?.message?.content?.trim();
                if (content) {
                    aiReply   = content;
                    usedModel = model;
                    break;
                }
            } catch (e) {
                lastError = e;
                console.error(`[Groq] ${model} exception:`, e.message);
                continue;
            }
        }

        if (!aiReply) {
            const detail = lastError?.message || 'Semua model Groq gagal merespons';
            return res.status(500).json({
                success: false,
                reply: `**Groq API Error**\n\n\`\`\`\n${detail}\n\`\`\`\n\n**Troubleshoot:**\n- Cek API key masih valid di [console.groq.com](https://console.groq.com)\n- Cek rate limit akun Groq Bos\n- Model mungkin sedang down, coba lagi dalam 1 menit`,
            });
        }

        // ── TIKTOK APPEND ─────────────────────────────────────
        if (tiktokInfo) {
            aiReply += `\n\n---\n\n### 📥 TikTok Download\n\n| Field | Info |\n|---|---|\n| 🎬 Judul | ${tiktokInfo.title} |\n| 👤 Creator | @${tiktokInfo.author} |\n| ⏱ Durasi | ${tiktokInfo.duration} |\n\n**[⬇️ Download Video (No Watermark)](${tiktokInfo.dlLink})**\n\n> *Klik link di atas untuk download langsung ke device Bos*`;
        }

        // ── RESPONSE ──────────────────────────────────────────
        return res.status(200).json({
            success: true,
            reply:   aiReply,
            ...(generatedImageUrl && { generatedImageUrl }),
            meta: {
                model:       usedModel,
                mode,
                datetime:    `${dt.dateStr} ${dt.timeStr} WIB`,
                hasSearch:   !!searchContext,
                hasWeather:  !!weatherContext,
                hasVision:   !!imageBase64,
                hasImageGen: !!generatedImageUrl,
                hasTikTok:   !!tiktokInfo,
                searchUsed:  shouldSearch,
            },
        });

    } catch (error) {
        console.error('[Unhandled]', error);
        return res.status(500).json({
            success: false,
            reply:   `**Server Error**\n\n\`${error.message}\`\n\nCek Vercel Function Logs, Bos.`,
        });
    }
}
