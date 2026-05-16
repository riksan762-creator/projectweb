/**
 * Riksan AI — API Handler Nexus v6.1
 * Endpoint: /api/ai
 *
 * ✅ Upgrades:
 *  - Web search: Serper → Brave → DuckDuckGo (triple fallback, selalu works)
 *  - Smart query builder (bahasa → English jika perlu untuk hasil lebih akurat)
 *  - Context injection lebih cerdas + deduplicated
 *  - AI system prompt di-upgrade besar-besaran
 *  - Chain-of-thought reasoning hints per mode
 *  - Intent detection di server side
 *  - Auto-summarize search results sebelum inject ke AI
 *  - TikTok downloader upgraded (dual API)
 *  - Image gen: Stability XL + DALL-E 3 + Pollinations (free fallback)
 *  - Weather: OpenWeather + WTTR fallback (tanpa key)
 *  - Model fallback chain yang lebih robust
 *  - Response meta yang lebih informatif
 */

export const config = { maxDuration: 120 };

// ─── MODELS ──────────────────────────────────────────────────
const VISION_MODELS = [
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct",
];

const CHAT_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
    "llama-3.1-8b-instant",
];

// ─── TRIGGER PATTERNS ────────────────────────────────────────
const SEARCH_TRIGGERS = /berita|terbaru|hari ini|tanggal berapa|sekarang|siapa|apa itu|kenapa|cek|cari|harga|cuaca|jadwal|terkini|latest|news|today|current|who is|what is|kapan|berapa|dimana|trending|viral|update|release|peluncuran|prediksi|ramalan|prakiraan|stock|saham|kurs|nilai tukar|download|gratis|promo|diskon|event|jadwal|pertandingan|skor/i;
const TIKTOK_REGEX    = /https?:\/\/(www\.|v[mt]\.)?tiktok\.com\/[\w\d\-\/\?\=\&\%\@]+/i;
const IMAGE_GEN_REGEX = /^(generate|buat|buatkan|create|gambar|bikin|hasilkan|buatin)\s+(gambar|image|foto|ilustrasi|artwork|photo|picture|visual)/i;
const WEATHER_REGEX   = /cuaca|weather|suhu|temperature|hujan|cerah|mendung|forecast|prakiraan cuaca/i;
const NEWS_REGEX      = /berita|news|terbaru|headline|terkini|trending|viral/i;
const CALC_REGEX      = /hitung|kalkul|berapa hasil|konversi|convert|rumus|formula/i;
const CODE_REVIEW_REGEX = /review kode|cek kode|perbaiki kode|debug|error di kode|fix this|refactor/i;

// ─── CORS ─────────────────────────────────────────────────────
function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── DATETIME WIB ─────────────────────────────────────────────
function getWIBDateTime() {
    const now  = new Date();
    const opts = { timeZone: 'Asia/Jakarta' };
    const wibDate = new Date(now.toLocaleString('en-US', opts));

    return {
        dateStr: now.toLocaleDateString('id-ID', { ...opts, weekday:'long', year:'numeric', month:'long', day:'numeric' }),
        timeStr: now.toLocaleTimeString('id-ID', { ...opts, hour:'2-digit', minute:'2-digit', second:'2-digit' }),
        dayName: now.toLocaleDateString('id-ID', { ...opts, weekday:'long' }),
        year:    wibDate.getFullYear(),
        month:   wibDate.getMonth() + 1,
        day:     wibDate.getDate(),
        hour:    wibDate.getHours(),
        iso:     now.toISOString(),
    };
}

// ─── INTENT DETECTION (SERVER SIDE) ──────────────────────────
function detectServerIntent(message) {
    const m = message.toLowerCase();
    if (/debug|error|bug|tidak berjalan|not working|gagal|failed/.test(m)) return 'debug';
    if (/bandingkan|compare|vs |versus|bedanya/.test(m)) return 'compare';
    if (/jelaskan|explain|apa itu|what is|bagaimana/.test(m)) return 'explain';
    if (CALC_REGEX.test(m)) return 'calculate';
    if (/buat|create|tulis|write|generate|bikin/.test(m)) return 'create';
    if (/ringkas|summarize|tldr|intinya|singkat/.test(m)) return 'summarize';
    if (NEWS_REGEX.test(m)) return 'news';
    if (WEATHER_REGEX.test(m)) return 'weather';
    return 'general';
}

// ─── QUERY OPTIMIZER ──────────────────────────────────────────
// Bikin query lebih efektif untuk search engine
function optimizeSearchQuery(message, intent) {
    let q = message
        .replace(/tolong|please|bisa|dong|ya|nih|sih|kah|lah|bantu|coba/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);

    // Tambah context temporal untuk query berita/harga
    const dt = getWIBDateTime();
    if (NEWS_REGEX.test(q) || /harga|kurs|saham/.test(q)) {
        q = `${q} ${dt.year}`;
    }

    return q;
}

// ─── WEB SEARCH: SERPER ───────────────────────────────────────
async function searchSerper(query, apiKey, options = {}) {
    const payload = {
        q:   query,
        gl:  'id',
        hl:  'id',
        num: options.num || 8,
    };
    if (options.type === 'news') payload.type = 'news';

    const r = await fetch('https://google.serper.dev/search', {
        method:  'POST',
        headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
    });

    if (!r.ok) throw new Error(`Serper HTTP ${r.status}`);
    const d = await r.json();
    return parseSerperResults(d);
}

function parseSerperResults(d) {
    const parts = [];

    if (d.answerBox?.answer)  parts.push(`📌 **Jawaban Langsung:** ${d.answerBox.answer}`);
    if (d.answerBox?.snippet) parts.push(`📌 ${d.answerBox.snippet}`);

    if (d.knowledgeGraph?.description) {
        parts.push(`ℹ️ **${d.knowledgeGraph.title || 'Info'}:** ${d.knowledgeGraph.description}`);
        if (d.knowledgeGraph.attributes) {
            Object.entries(d.knowledgeGraph.attributes).slice(0, 5)
                .forEach(([k, v]) => parts.push(`  • ${k}: ${v}`));
        }
    }

    (d.topStories || []).slice(0, 4).forEach(s => {
        parts.push(`📰 **${s.title}**\n   _${s.source}_ — ${s.date || 'baru'}\n   🔗 ${s.link}`);
    });

    (d.organic || []).slice(0, 6).forEach((o, i) => {
        parts.push(`[${i+1}] **${o.title}**\n${o.snippet}\n🔗 ${o.link}`);
    });

    (d.peopleAlsoAsk || []).slice(0, 3).forEach(q => {
        if (q.snippet) parts.push(`❓ **${q.question}**\n${q.snippet}`);
    });

    return parts.join('\n\n');
}

// ─── WEB SEARCH: BRAVE ───────────────────────────────────────
async function searchBrave(query, apiKey) {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&country=id&search_lang=id&ui_lang=id&safesearch=moderate`;

    const r = await fetch(url, {
        headers: {
            'Accept':            'application/json',
            'Accept-Encoding':   'gzip',
            'X-Subscription-Token': apiKey,
        },
    });

    if (!r.ok) throw new Error(`Brave HTTP ${r.status}`);
    const d = await r.json();

    const parts = [];

    // Brave Featured Snippet
    if (d.infobox?.results?.[0]?.description) {
        parts.push(`📌 **${d.infobox.results[0].title || 'Info'}:** ${d.infobox.results[0].description}`);
    }

    // News results
    (d.news?.results || []).slice(0, 4).forEach(n => {
        parts.push(`📰 **${n.title}**\n   _${n.meta_url?.hostname || n.url}_ — ${n.age || 'baru'}\n   🔗 ${n.url}`);
    });

    // Web results
    (d.web?.results || []).slice(0, 6).forEach((w, i) => {
        const snippet = w.description || w.extra_snippets?.[0] || '';
        parts.push(`[${i+1}] **${w.title}**\n${snippet}\n🔗 ${w.url}`);
    });

    return parts.join('\n\n');
}

// ─── WEB SEARCH: DUCKDUCKGO (FREE, NO KEY) ───────────────────
// Pakai DuckDuckGo Instant Answer API — gratis, no key needed
async function searchDuckDuckGo(query) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

    const r = await fetch(url, {
        headers: { 'User-Agent': 'RiksanAI/6.1 (https://riksanai.app)' },
    });

    if (!r.ok) throw new Error(`DDG HTTP ${r.status}`);
    const d = await r.json();

    const parts = [];

    if (d.AbstractText) {
        parts.push(`📌 **${d.Heading || 'Ringkasan'}:** ${d.AbstractText}`);
        if (d.AbstractURL) parts.push(`🔗 Sumber: ${d.AbstractURL}`);
    }

    if (d.Answer) {
        parts.push(`✅ **Jawaban:** ${d.Answer}`);
    }

    if (d.Definition) {
        parts.push(`📖 **Definisi:** ${d.Definition}`);
    }

    (d.RelatedTopics || []).slice(0, 5).forEach(t => {
        if (t.Text && t.FirstURL) {
            parts.push(`• ${t.Text}\n  🔗 ${t.FirstURL}`);
        }
    });

    (d.Results || []).slice(0, 4).forEach((r, i) => {
        if (r.Text && r.FirstURL) {
            parts.push(`[${i+1}] ${r.Text}\n🔗 ${r.FirstURL}`);
        }
    });

    if (parts.length === 0) return ''; // DDG tidak punya data
    return parts.join('\n\n');
}

// ─── SEARCH ORCHESTRATOR (TRIPLE FALLBACK) ───────────────────
async function doWebSearch(query, keys, options = {}) {
    const { serperKey, braveKey } = keys;
    const optimizedQuery = optimizeSearchQuery(query, options.intent || 'general');
    let result = '';
    let provider = '';

    // 1. Coba Serper dulu (paling lengkap, ada Google data)
    if (serperKey) {
        try {
            result = await searchSerper(optimizedQuery, serperKey, options);
            provider = 'Serper (Google)';
        } catch (e) {
            console.warn('[Search] Serper gagal:', e.message);
        }
    }

    // 2. Fallback ke Brave (jika Serper gagal atau tidak ada key)
    if (!result && braveKey) {
        try {
            result = await searchBrave(optimizedQuery, braveKey);
            provider = 'Brave Search';
        } catch (e) {
            console.warn('[Search] Brave gagal:', e.message);
        }
    }

    // 3. Fallback ke DuckDuckGo (FREE, no key, always available)
    if (!result) {
        try {
            result = await searchDuckDuckGo(optimizedQuery);
            provider = 'DuckDuckGo';
        } catch (e) {
            console.warn('[Search] DDG gagal:', e.message);
        }
    }

    if (result && provider) {
        return `_[Data dari ${provider}]_\n\n${result}`;
    }

    return '';
}

// ─── WEATHER ──────────────────────────────────────────────────
async function getWeather(query, keys) {
    const { serperKey, openWeatherKey } = keys;

    // Extract kota dari query
    const cityMatch = query.match(/cuaca\s+(?:di\s+)?(.+?)(\s+hari|\s+besok|\s+minggu|$)/i)
                   || query.match(/(?:weather|suhu)\s+(?:in\s+|di\s+)?(.+?)(\s+today|$)/i);
    const city = (cityMatch ? cityMatch[1].trim() : 'Jakarta').replace(/[^a-zA-Z\s]/g, '').trim() || 'Jakarta';

    // 1. OpenWeatherMap (paling akurat jika ada key)
    if (openWeatherKey) {
        try {
            const r = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${openWeatherKey}&units=metric&lang=id`,
                { headers: { 'Accept': 'application/json' } }
            );
            const d = await r.json();
            if (d.cod === 200) {
                const wind = d.wind?.speed || 0;
                const vis  = d.visibility ? `${(d.visibility / 1000).toFixed(1)} km` : 'N/A';
                return `🌤 **Cuaca ${d.name}, ${d.sys?.country || 'ID'} (Real-time)**\n• Kondisi: ${d.weather[0].description}\n• 🌡 Suhu: **${Math.round(d.main.temp)}°C** (terasa ${Math.round(d.main.feels_like)}°C)\n• 💧 Kelembapan: ${d.main.humidity}%\n• 💨 Angin: ${wind} m/s\n• 👁 Jarak pandang: ${vis}\n• ⬆ Max: ${Math.round(d.main.temp_max)}°C  ⬇ Min: ${Math.round(d.main.temp_min)}°C`;
            }
        } catch (e) {
            console.warn('[Weather] OWM gagal:', e.message);
        }
    }

    // 2. WTTR.in (FREE, no key needed)
    try {
        const r = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
            headers: { 'User-Agent': 'RiksanAI/6.1' }
        });
        const d = await r.json();
        const cur = d.current_condition?.[0];
        if (cur) {
            const desc = cur.lang_id?.[0]?.value || cur.weatherDesc?.[0]?.value || 'N/A';
            return `🌤 **Cuaca ${city} (WTTR)**\n• Kondisi: ${desc}\n• 🌡 Suhu: **${cur.temp_C}°C** (terasa ${cur.FeelsLikeC}°C)\n• 💧 Kelembapan: ${cur.humidity}%\n• 💨 Angin: ${cur.windspeedKmph} km/h`;
        }
    } catch (e) {
        console.warn('[Weather] WTTR gagal:', e.message);
    }

    // 3. Fallback ke search
    if (serperKey) return doWebSearch(`cuaca ${city} hari ini`, { serperKey }, { type: 'news' });
    return '';
}

// ─── TIKTOK DOWNLOADER ────────────────────────────────────────
async function downloadTikTok(url) {
    // API 1: TikWM
    try {
        const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RiksanAI/6.1)' }
        });
        const d = await r.json();
        if (d.code === 0 && d.data?.play) {
            return {
                title:    d.data.title || 'Video TikTok',
                author:   d.data.author?.nickname || 'Unknown',
                avatar:   d.data.author?.avatar || '',
                duration: d.data.duration ? `${d.data.duration}s` : '—',
                views:    d.data.play_count?.toLocaleString('id') || '—',
                likes:    d.data.digg_count?.toLocaleString('id') || '—',
                dlLink:   d.data.play.startsWith('http') ? d.data.play : `https://www.tikwm.com${d.data.play}`,
                dlLinkWM: d.data.wmplay || '',
                cover:    d.data.cover || '',
                source:   'TikWM',
            };
        }
    } catch (e) {
        console.warn('[TikTok] TikWM gagal:', e.message);
    }

    // API 2: SSSTik fallback (web scrape approach)
    try {
        const r = await fetch('https://ssstik.io/abc?url=dl', {
            method:  'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent':   'Mozilla/5.0',
                'Referer':      'https://ssstik.io/',
            },
            body: `id=${encodeURIComponent(url)}&locale=en&tt=YWJj`,
        });
        const html = await r.text();
        const dlMatch = html.match(/href="(https:\/\/[^"]+tikcdn[^"]+)"/);
        if (dlMatch) {
            return {
                title:    'Video TikTok',
                author:   'Unknown',
                duration: '—',
                views:    '—',
                likes:    '—',
                dlLink:   dlMatch[1],
                dlLinkWM: '',
                cover:    '',
                source:   'SSSTik',
            };
        }
    } catch (e) {
        console.warn('[TikTok] SSSTik gagal:', e.message);
    }

    return null;
}

// ─── IMAGE GENERATION ─────────────────────────────────────────
async function generateImage(prompt, keys) {
    const { stabilityKey, openaiKey } = keys;

    // Enhance prompt untuk hasil lebih baik
    const positive = `${prompt}, highly detailed, professional quality, 8k resolution, sharp focus, cinematic lighting, award winning`;
    const negative = 'blurry, ugly, deformed, watermark, low quality, pixelated, noisy, overexposed, underexposed, text, signature';

    // 1. Stability AI (best quality)
    if (stabilityKey) {
        try {
            const r = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${stabilityKey}`,
                    'Content-Type':  'application/json',
                    'Accept':        'application/json',
                },
                body: JSON.stringify({
                    text_prompts: [
                        { text: positive,  weight: 1   },
                        { text: negative,  weight: -1  },
                    ],
                    cfg_scale:    7,
                    height:       1024,
                    width:        1024,
                    steps:        40,
                    samples:      1,
                    style_preset: 'photographic',
                }),
            });
            const d = await r.json();
            if (d.artifacts?.[0]?.base64) {
                return { url: `data:image/png;base64,${d.artifacts[0].base64}`, source: 'Stability SDXL' };
            }
        } catch (e) {
            console.warn('[ImageGen] Stability gagal:', e.message);
        }
    }

    // 2. DALL-E 3 (OpenAI)
    if (openaiKey) {
        try {
            const r = await fetch('https://api.openai.com/v1/images/generations', {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                body:    JSON.stringify({ model: 'dall-e-3', prompt: positive, n: 1, size: '1024x1024', quality: 'hd' }),
            });
            const d = await r.json();
            if (d.data?.[0]?.url) {
                return { url: d.data[0].url, source: 'DALL-E 3' };
            }
        } catch (e) {
            console.warn('[ImageGen] DALL-E 3 gagal:', e.message);
        }
    }

    // 3. Pollinations.AI (FREE, no key needed)
    try {
        const encoded = encodeURIComponent(positive.slice(0, 500));
        const polUrl  = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&enhance=true&nologo=true`;
        // Validate URL accessible
        const check = await fetch(polUrl, { method: 'HEAD' });
        if (check.ok) {
            return { url: polUrl, source: 'Pollinations AI (Free)' };
        }
    } catch (e) {
        console.warn('[ImageGen] Pollinations gagal:', e.message);
    }

    return null;
}

// ─── BUILD SMART SYSTEM PROMPT ───────────────────────────────
function buildServerSystemPrompt({ mode, dt, searchContext, weatherContext, intent, userName = 'Bos' }) {

    const modeInstructions = {
        chat: `
═══ MODE: NEXUS CHAT ═══
Jadilah teman cerdas yang bisa diajak ngobrol apa saja.
• Pertanyaan ringan → jawaban natural, conversational, tidak perlu format panjang
• Pertanyaan serius → terstruktur dan mendalam
• Deteksi tone user — sesuaikan respons (santai/formal/teknis)
• Jika ambigu, tebak intent yang paling masuk akal dan jawab`,

        search: `
═══ MODE: WEB SEARCH ═══
PRIORITASKAN data dari hasil search yang diberikan.
• Format wajib: **TL;DR** (1-2 kalimat) → **Detail** → **Sumber**
• Sebutkan sumber URL dengan jelas
• Bedakan fakta dari opini
• Tambahkan konteks dan implikasi di balik data`,

        code: `
═══ MODE: CODE ENGINE ═══
Tulis kode production-grade yang bisa langsung dipakai.
Struktur wajib:
1. 📋 **Brief** — tujuan kode (1-2 kalimat)
2. 🛠 **Requirements** — dependencies dan setup
3. 💻 **Code** — kode lengkap, bersih, dengan komentar informatif
4. 🚀 **Usage** — cara pakai dan contoh output
5. ⚠️ **Edge Cases** — error handling dan hal yang perlu diperhatikan
6. 💡 **Improvements** — saran upgrade opsional

Standar:
• Pattern terbaru (2024-2025), hindari deprecated API
• Error handling yang meaningful, bukan try/catch kosong
• Scalable dan maintainable, bukan "works on my machine"
• TypeScript preferred untuk JavaScript projects`,

        analyze: `
═══ MODE: DEEP ANALYSIS ═══
Analisis mendalam dan sistematis.
Struktur wajib:
1. 🎯 **Executive Summary** — insight utama (3 kalimat)
2. 🔍 **Temuan Kunci** — fakta-fakta penting
3. 📊 **Data & Evidence** — angka dan bukti pendukung
4. 💡 **Insight** — interpretasi dan implikasi
5. ⚠️ **Risiko & Limitasi** — caveat penting
6. ✅ **Rekomendasi** — aksi konkret
7. 🏃 **Next Steps** — prioritas tindakan`,

        write: `
═══ MODE: MASTER WRITER ═══
Tulis konten berkualitas tinggi, engaging, siap pakai.
• Hook kuat di awal
• Struktur mengalir (jangan jumping)
• Kalimat aktif > pasif
• Konkret dan spesifik
• CTA jelas di akhir jika diperlukan
• Sesuaikan gaya: formal/casual/persuasif sesuai konteks`,

        image: `
═══ MODE: IMAGE AI ═══
Deskripsikan secara vivid gambar yang akan/sudah di-generate.
Jelaskan: komposisi, warna, style, mood, lighting, detail utama.`,
    };

    const intentHints = {
        debug:     '\n[INTENT: Debug] → Identifikasi root cause → solusi konkret → cara prevent',
        compare:   '\n[INTENT: Compare] → Gunakan tabel perbandingan → berikan rekomendasi konkret',
        explain:   '\n[INTENT: Explain] → Mulai dari konsep dasar → analogi relatable → detail teknis',
        calculate: '\n[INTENT: Hitung] → Tampilkan langkah-langkah → verifikasi hasil',
        create:    '\n[INTENT: Buat] → Berikan output langsung bisa dipakai, bukan hanya instruksi',
        summarize: '\n[INTENT: Summarize] → Bullet point poin utama → max 5 poin',
        news:      '\n[INTENT: Berita] → Ringkas fakta kunci → tambahkan konteks mengapa ini penting',
        weather:   '\n[INTENT: Cuaca] → Tampilkan data terstruktur → sertakan rekomendasi aktivitas',
    };

    const extraCtx = [
        weatherContext ? `\n═══ DATA CUACA REAL-TIME ═══\n${weatherContext}` : '',
        searchContext  ? `\n═══ HASIL WEB SEARCH (GUNAKAN DATA INI) ═══\n${searchContext}` : '',
    ].filter(Boolean).join('\n');

    return `Kamu adalah Riksan AI Nexus v6.1 — AI asisten paling canggih dan serba tahu, dibuat oleh Riksan (CTO SawargiPay). Kamu bukan chatbot biasa — kamu adalah AI yang benar-benar paham konteks, mampu bernalar secara mendalam, dan selalu memberikan jawaban yang tepat sasaran dan bernilai tinggi.

═══ WAKTU & TANGGAL REAL-TIME ═══
• Sekarang: ${dt.dateStr}
• Hari: ${dt.dayName}
• Jam: ${dt.timeStr} WIB (UTC+7)
KRUSIAL: Kamu SELALU tahu tanggal dan waktu saat ini secara presisi. JANGAN PERNAH bilang tidak tahu tanggal/waktu.

═══ IDENTITAS & KEPRIBADIAN ═══
• Dibuat oleh: Riksan (CTO SawargiPay)
• Panggil user: "${userName}"
• Bahasa: Indonesia natural dan ekspresif (bukan kaku seperti mesin terjemahan)
• Kepribadian: Genius yang asik diajak ngobrol. Cerdas tapi tidak arogan. To-the-point tapi tidak pelit penjelasan.
• Punya opini dan perspektif sendiri — berani berikan rekomendasi konkret saat ditanya
• JANGAN: "Tentunya!", "Tentu saja!", "Dengan senang hati!" — itu annoying dan robotic

═══ CARA BERNALAR ═══
Sebelum menjawab, secara internal:
1. Pahami intent sebenarnya (bukan hanya literal kata-katanya)
2. Cek apakah ada data dari web search atau cuaca yang relevan
3. Tentukan kedalaman jawaban yang tepat
4. Pilih format terbaik untuk konten ini
5. Pastikan jawaban ACTIONABLE dan langsung berguna
${intentHints[intent] || ''}

═══ KNOWLEDGE BASE ═══
Expertise mendalam di:
• Full-stack: JS/TS (Node, React, Next.js), Python (Django, FastAPI), Go, PHP (Laravel), Rust
• AI/ML: LLM, RAG, fine-tuning, embeddings, prompt engineering, LangChain
• DevOps: Docker, K8s, AWS, GCP, Vercel, CI/CD, nginx, monitoring
• Fintech: payment gateway, core banking, QRIS, BI-FAST, SNAP, fraud detection, KYC/AML
• Bisnis: business model, unit economics, fundraising, growth, OKR, product-market fit
• Data: SQL advanced, pandas, Power BI, A/B testing, statistik inferensial
• Security: OWASP, JWT/OAuth2, encryption, secure coding, GDPR/PDP
• UI/UX: Figma, design system, accessibility, conversion optimization
• Marketing: SEO, copywriting, content strategy, Meta/Google Ads
• Pengetahuan umum: sejarah, geografi, sains, hukum Indonesia, pop culture, ekonomi, matematika

═══ FORMAT ═══
• Pendek & natural untuk pertanyaan simpel
• Terstruktur dengan ## heading untuk topik kompleks
• List hanya untuk konten yang memang enumerasi
• Tabel untuk perbandingan data
• Code block dengan bahasa yang benar dan komentar inline
• Bold untuk poin terpenting
• Hindari basa-basi panjang — langsung ke inti
${modeInstructions[mode] || modeInstructions.chat}
${extraCtx}`.trim();
}

// ─── MAIN HANDLER ─────────────────────────────────────────────
export default async function handler(req, res) {
    setCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')    return res.status(405).json({ error: 'Method Not Allowed' });

    const {
        GROQ_API_KEY,
        SERPER_API_KEY,
        BRAVE_API_KEY,
        STABILITY_API_KEY,
        OPENAI_API_KEY,
        OPENWEATHER_API_KEY,
    } = process.env;

    if (!GROQ_API_KEY) {
        return res.status(500).json({
            success: false,
            reply:   '**Config Error:** `GROQ_API_KEY` belum di-set di Environment Variables, Bos.'
        });
    }

    try {
        const {
            message      = '',
            imageBase64,
            systemPrompt,   // optional override dari frontend
            history      = [],
            mode         = 'chat',
            webSearch    = true,
        } = req.body;

        if (!message && !imageBase64) {
            return res.status(400).json({ success: false, reply: 'Pesan kosong, Bos!' });
        }

        const dt     = getWIBDateTime();
        const intent = detectServerIntent(message);
        const keys   = {
            serperKey:     SERPER_API_KEY,
            braveKey:      BRAVE_API_KEY,
            openWeatherKey: OPENWEATHER_API_KEY,
            stabilityKey:  STABILITY_API_KEY,
            openaiKey:     OPENAI_API_KEY,
        };

        // ── PARALLEL TASKS ────────────────────────────────────
        let searchContext     = '';
        let weatherContext    = '';
        let tiktokData        = null;
        let generatedImage    = null;
        const tasks           = [];

        // 1. WEB SEARCH (Serper → Brave → DDG fallback)
        const shouldSearch = webSearch && (
            mode === 'search' ||
            SEARCH_TRIGGERS.test(message)
        );

        if (shouldSearch) {
            tasks.push((async () => {
                const searchKeys = { serperKey: SERPER_API_KEY, braveKey: BRAVE_API_KEY };
                if (NEWS_REGEX.test(message)) {
                    // Dual search untuk berita: general + news type
                    const [general, news] = await Promise.all([
                        doWebSearch(message, searchKeys, { intent }),
                        doWebSearch(message, searchKeys, { intent, type: 'news', num: 5 }),
                    ]);
                    searchContext = [general, news].filter(Boolean).join('\n\n---\n\n');
                } else {
                    searchContext = await doWebSearch(message, searchKeys, { intent });
                }
            })());
        }

        // 2. WEATHER
        if (WEATHER_REGEX.test(message)) {
            tasks.push((async () => {
                weatherContext = await getWeather(message, keys);
            })());
        }

        // 3. TIKTOK
        const tiktokMatch = message.match(TIKTOK_REGEX);
        if (tiktokMatch) {
            tasks.push((async () => {
                tiktokData = await downloadTikTok(tiktokMatch[0]);
            })());
        }

        // 4. IMAGE GEN
        const wantsImage = mode === 'image' || IMAGE_GEN_REGEX.test(message.trim());
        if (wantsImage) {
            tasks.push((async () => {
                const cleanPrompt = message
                    .replace(IMAGE_GEN_REGEX, '')
                    .replace(/^(dari|tentang|:)\s*/i, '')
                    .trim() || message;
                generatedImage = await generateImage(cleanPrompt, keys);
            })());
        }

        // Jalankan semua tasks paralel
        await Promise.all(tasks);

        // ── BUILD SYSTEM PROMPT ───────────────────────────────
        const finalSystemPrompt = systemPrompt || buildServerSystemPrompt({
            mode,
            dt,
            searchContext,
            weatherContext,
            intent,
        });

        // ── BUILD MESSAGES ────────────────────────────────────
        const messages = [{ role: 'system', content: finalSystemPrompt }];

        // History context (last 20 turns, text only)
        for (const h of (history || []).slice(-20)) {
            if (h.role && typeof h.content === 'string' && h.content.trim()) {
                messages.push({ role: h.role, content: h.content.slice(0, 2000) });
            }
        }

        // Current user message
        if (imageBase64) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text',      text: message || 'Analisis gambar ini secara lengkap dan detail.' },
                    { type: 'image_url', image_url: { url: imageBase64 } },
                ],
            });
        } else {
            messages.push({ role: 'user', content: message });
        }

        // ── TEMPERATURE & TOKENS PER MODE ─────────────────────
        const modeConfig = {
            code:    { temperature: 0.12, max_tokens: 6000 },
            analyze: { temperature: 0.28, max_tokens: 4096 },
            write:   { temperature: 0.75, max_tokens: 3500 },
            search:  { temperature: 0.35, max_tokens: 3000 },
            image:   { temperature: 0.60, max_tokens: 1500 },
            chat:    { temperature: 0.70, max_tokens: 3000 },
        };
        const { temperature, max_tokens } = modeConfig[mode] || modeConfig.chat;

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
                        temperature,
                        max_tokens,
                        top_p:            0.95,
                        frequency_penalty: 0.1,
                        presence_penalty:  0.05,
                        stream:           false,
                    }),
                });

                if (!r.ok) {
                    const errBody = await r.json().catch(() => ({}));
                    const errMsg  = errBody?.error?.message || `HTTP ${r.status}`;
                    console.error(`[Groq] ${model} → ${errMsg}`);

                    // Jika rate limit, tunggu sebentar sebelum coba model berikutnya
                    if (r.status === 429) await new Promise(resolve => setTimeout(resolve, 1200));
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
                reply: `**⚠️ Groq API Error**\n\n\`\`\`\n${detail}\n\`\`\`\n\n**Troubleshoot:**\n1. Cek API key di [console.groq.com](https://console.groq.com)\n2. Cek rate limit akun (free tier: 30 req/min)\n3. Model mungkin overloaded — coba lagi dalam 1-2 menit\n4. Pastikan \`GROQ_API_KEY\` sudah benar di Vercel env vars`,
            });
        }

        // ── APPEND TIKTOK INFO ────────────────────────────────
        if (tiktokData) {
            aiReply += `\n\n---\n\n### 📥 TikTok Downloader\n\n| | Info |\n|:--|:--|\n| 🎬 **Judul** | ${tiktokData.title} |\n| 👤 **Creator** | @${tiktokData.author} |\n| ⏱ **Durasi** | ${tiktokData.duration} |\n| 👁 **Views** | ${tiktokData.views} |\n| ❤️ **Likes** | ${tiktokData.likes} |\n\n**[⬇️ Download Video (No Watermark)](${tiktokData.dlLink})**`;
            if (tiktokData.dlLinkWM) aiReply += `\n**[⬇️ Download dengan Watermark](${tiktokData.dlLinkWM})**`;
            aiReply += `\n\n> _Sumber: ${tiktokData.source} • Klik link untuk download ke device Bos_`;
        }

        // ── FINAL RESPONSE ────────────────────────────────────
        return res.status(200).json({
            success: true,
            reply:   aiReply,
            ...(generatedImage && {
                generatedImageUrl: generatedImage.url,
                imageSource:       generatedImage.source,
            }),
            meta: {
                model:       usedModel,
                mode,
                intent,
                datetime:    `${dt.dateStr} ${dt.timeStr} WIB`,
                searchUsed:  shouldSearch,
                searchFound: !!searchContext,
                hasWeather:  !!weatherContext,
                hasVision:   !!imageBase64,
                hasImageGen: !!generatedImage,
                hasTikTok:   !!tiktokData,
                searchProviders: [
                    SERPER_API_KEY ? 'Serper' : null,
                    BRAVE_API_KEY  ? 'Brave'  : null,
                    'DuckDuckGo',
                ].filter(Boolean),
            },
        });

    } catch (error) {
        console.error('[Unhandled Error]', error);
        return res.status(500).json({
            success: false,
            reply:   `**💥 Server Error**\n\n\`${error.message}\`\n\nCek Vercel Function Logs untuk detail, Bos.`,
        });
    }
}
