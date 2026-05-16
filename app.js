/**
 * Riksan AI — Nexus v6.1
 * app.js — Smart frontend logic (enhanced AI intelligence)
 * Features: web search, vision, image gen, code, analyze, write
 * Improvements: smarter system prompt, deep context, intent detection, memory
 */

// ─── DOM REFS ────────────────────────────────────────────────
const chatForm      = document.getElementById('chatForm');
const userInput     = document.getElementById('userInput');
const chatArea      = document.getElementById('chatArea');
const fileInput     = document.getElementById('fileInput');
const cameraBtn     = document.getElementById('cameraBtn');
const imagePreview  = document.getElementById('imagePreview');
const previewImg    = document.getElementById('previewImg');
const removeImg     = document.getElementById('removeImg');
const sendBtn       = document.getElementById('sendBtn');
const welcome       = document.getElementById('welcome');
const charCount     = document.getElementById('charCount');
const dragOverlay   = document.getElementById('dragOverlay');

// ─── STATE ───────────────────────────────────────────────────
let currentImageBase64   = null;
let currentMode          = 'chat';
let conversationHistory  = [];
let isGenerating         = false;
let webSearchEnabled     = true;
let userProfile          = {
    name: null,
    preferredLanguage: 'id',
    topicsDiscussed: [],
    lastContext: null,
};

// ─── MARKED CONFIG ───────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });

const renderer = new marked.Renderer();
renderer.code = (code, language) => {
    const lang   = (language || 'text').toLowerCase();
    const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value;

    const id = 'c' + Math.random().toString(36).substr(2, 9);
    return `<div class="code-block-wrap">
        <div class="code-header">
            <span class="code-lang">${lang.toUpperCase()}</span>
            <button class="copy-btn" id="btn-${id}" onclick="copyCode('${id}','btn-${id}')">
                <i class="fas fa-copy"></i>&nbsp;Copy
            </button>
        </div>
        <pre><code id="${id}" class="hljs language-${lang}">${highlighted}</code></pre>
    </div>`;
};
marked.setOptions({ renderer });

// ─── COPY CODE ───────────────────────────────────────────────
window.copyCode = (codeId, btnId) => {
    const el  = document.getElementById(codeId);
    const btn = document.getElementById(btnId);
    if (!el || !btn) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i>&nbsp;Copied!';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<i class="fas fa-copy"></i>&nbsp;Copy';
        }, 2000);
    });
};

// ─── TOGGLE WEB SEARCH ───────────────────────────────────────
window.toggleWebSearch = () => {
    webSearchEnabled = !webSearchEnabled;
    const btn = document.querySelector('.hdr-btn [class*="globe"]')?.closest('.hdr-btn');
    if (btn) {
        btn.style.color      = webSearchEnabled ? 'var(--cyan)' : '';
        btn.style.background = webSearchEnabled ? 'rgba(0,229,255,0.1)' : '';
        btn.style.borderColor = webSearchEnabled ? 'rgba(0,229,255,0.3)' : '';
    }
    showToast(webSearchEnabled ? '🌐 Web Search aktif' : '🔒 Web Search nonaktif');
};

// ─── NEW CHAT ────────────────────────────────────────────────
window.newChat = () => {
    conversationHistory = [];
    userProfile.topicsDiscussed = [];
    userProfile.lastContext = null;
    chatArea.innerHTML  = '';
    chatArea.appendChild(welcome);
    welcome.classList.remove('hidden');
    userInput.value = '';
    userInput.style.height = 'auto';
    if (charCount) charCount.textContent = '0';
    currentImageBase64 = null;
    imagePreview.classList.remove('show');
    cameraBtn.classList.remove('image-mode');
};

// ─── CLEAR CHAT ──────────────────────────────────────────────
window.clearChat = () => {
    if (!confirm('Hapus semua riwayat chat?')) return;
    newChat();
};

// ─── TOAST NOTIFICATION ──────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.style.cssText = `
        position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
        background:var(--bg3); border:1px solid var(--border2);
        color:var(--text); padding:8px 18px; border-radius:100px;
        font-size:12px; font-family:var(--font-mono); z-index:999;
        box-shadow:0 4px 20px rgba(0,0,0,0.5);
        animation:fadeIn 0.2s both;
        letter-spacing:0.04em;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ─── MODE SETTER ─────────────────────────────────────────────
window.setMode = (mode, el) => {
    currentMode = mode;
    document.querySelectorAll('.mode-chip').forEach(c => {
        c.classList.remove('active', 'img-mode', 'code-mode');
    });
    if (el) {
        el.classList.add('active');
        if (mode === 'image') el.classList.add('img-mode');
        if (mode === 'code')  el.classList.add('code-mode');
    }

    const placeholders = {
        chat:    'Tanya apa aja ke Riksan AI...',
        search:  'Cari info terbaru, berita, data real-time...',
        image:   'Deskripsikan gambar yang mau di-generate...',
        code:    'Minta Riksan nulisin kode production-ready...',
        analyze: 'Upload gambar atau paste data untuk dianalisis...',
        write:   'Minta Riksan nulisin konten, artikel, email...',
    };
    userInput.placeholder = placeholders[mode] || 'Ketik pesan...';
    userInput.focus();
};

window.setQuick = (text) => {
    userInput.value = text;
    userInput.dispatchEvent(new Event('input'));
    userInput.focus();
    if (/gambar|image|generate|buat foto/i.test(text)) {
        const chip = document.querySelector('[data-mode="image"]');
        if (chip) setMode('image', chip);
    } else if (/kode|api|coding|fungsi|function|script/i.test(text)) {
        const chip = document.querySelector('[data-mode="code"]');
        if (chip) setMode('code', chip);
    } else if (/berita|terbaru|hari ini|cari|cuaca|harga/i.test(text)) {
        const chip = document.querySelector('[data-mode="search"]');
        if (chip) setMode('search', chip);
    }
};

window.copyMessage = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => showToast('✓ Teks disalin'));
};

window.regenerate = (msgId) => {
    showToast('🔄 Regenerasi belum tersedia di versi ini');
};

// ─── USER PROFILE TRACKING ──────────────────────────────────
function updateUserProfile(text) {
    // Detect nama user
    const namaMatch = text.match(/(?:nama (?:aku|saya|gue|gw)|panggil (?:aku|saya|gue|gw)|aku (?:adalah|namanya)|i(?:'m| am)) ([A-Z][a-z]+)/i);
    if (namaMatch) userProfile.name = namaMatch[1];

    // Track topik yang dibahas (max 10 topik terakhir)
    const topics = detectTopics(text);
    userProfile.topicsDiscussed = [...new Set([...topics, ...userProfile.topicsDiscussed])].slice(0, 10);

    // Simpan last context
    userProfile.lastContext = text.slice(0, 200);
}

function detectTopics(text) {
    const topicMap = {
        'programming':    /\b(code|kode|coding|javascript|python|php|typescript|react|node|api|backend|frontend|database|sql|docker|github)\b/i,
        'business':       /\b(bisnis|startup|revenue|profit|investor|saham|modal|growth|marketing|brand|sales)\b/i,
        'finance':        /\b(harga|kurs|crypto|bitcoin|saham|investasi|tabungan|pajak|fintech|payment|transfer)\b/i,
        'tech_news':      /\b(ai|artificial intelligence|chatgpt|openai|google|apple|meta|microsoft|teknologi terbaru)\b/i,
        'health':         /\b(kesehatan|diet|olahraga|dokter|penyakit|vitamin|medis|wellness)\b/i,
        'creative':       /\b(desain|design|gambar|foto|video|musik|konten|artikel|copywriting|branding)\b/i,
        'data_science':   /\b(data|analisis|statistik|machine learning|model|dataset|visualisasi|excel|pandas)\b/i,
        'devops':         /\b(server|deploy|cloud|aws|vercel|kubernetes|nginx|ci\/cd|monitoring|hosting)\b/i,
    };

    return Object.entries(topicMap)
        .filter(([, rx]) => rx.test(text))
        .map(([topic]) => topic);
}

// ─── INTENT DETECTION ────────────────────────────────────────
function detectIntent(text) {
    const intents = {
        explain:    /\b(jelaskan|explain|apa itu|what is|kenapa|why|bagaimana cara|how to|cara|maksudnya|artinya)\b/i,
        compare:    /\b(bandingkan|compare|vs|versus|bedanya|perbedaan|mana yang lebih|which is better)\b/i,
        list:       /\b(sebutkan|list|kasih|berikan|contoh|rekomendasikan|apa saja|macam-macam)\b/i,
        debug:      /\b(error|bug|masalah|problem|tidak bisa|gagal|failed|fix|perbaiki|kenapa tidak|why not working)\b/i,
        create:     /\b(buat|buatkan|create|tulis|write|generate|bikin|design|rancang|develop)\b/i,
        optimize:   /\b(optimize|optimasi|improve|tingkatkan|lebih cepat|faster|lebih baik|efisien)\b/i,
        summarize:  /\b(ringkas|summarize|summary|singkat|tldr|tl;dr|intinya|poin utama)\b/i,
        translate:  /\b(terjemahkan|translate|alih bahasa|in english|dalam bahasa)\b/i,
        calculate:  /\b(hitung|calculate|berapa|total|hasil|nilai|konversi|convert)\b/i,
        roleplay:   /\b(pura-pura|pretend|roleplai|jadilah|act as|berperan sebagai|simulasi)\b/i,
    };

    return Object.entries(intents)
        .filter(([, rx]) => rx.test(text))
        .map(([intent]) => intent);
}

// ─── APPEND MESSAGE ──────────────────────────────────────────
function appendMessage(role, content, extra = {}) {
    if (welcome && !welcome.classList.contains('hidden')) {
        welcome.classList.add('hidden');
    }

    const wrap = document.createElement('div');
    wrap.className = `msg-wrap ${role}`;

    const now    = new Date();
    const timeWIB = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour:'2-digit', minute:'2-digit' });
    const msgId   = 'msg-' + Date.now();

    if (role === 'user') {
        wrap.innerHTML = `
            <div class="user-bubble">
                ${extra.imageUrl ? `<img src="${extra.imageUrl}" alt="Gambar dikirim"/>` : ''}
                <div>${escapeHtml(content) || '<em style="color:var(--text3)">Analisis gambar ini...</em>'}</div>
            </div>`;
    } else {
        const parsedContent = parseAIContent(content, extra);
        const modeBadge = {
            chat: 'Nexus Chat', search: 'Web Search',
            code: 'Code Mode', image: 'Image AI',
            analyze: 'Analysis', write: 'Writer',
        }[currentMode] || 'Riksan AI';

        wrap.innerHTML = `
            <div class="ai-row">
                <div class="ai-avatar">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round"/>
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round" opacity="0.5"/>
                    </svg>
                </div>
                <div class="ai-bubble">
                    <div class="prose" id="${msgId}">${parsedContent}</div>
                    <div class="msg-footer">
                        <div class="msg-footer-left">
                            <span class="msg-badge">${modeBadge}</span>
                            <span class="msg-time">${timeWIB} WIB</span>
                        </div>
                        <div class="msg-actions">
                            <button class="act-btn" title="Salin" onclick="copyMessage('${msgId}')">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="act-btn" title="Regenerate" onclick="regenerate('${msgId}')">
                                <i class="fas fa-rotate-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    chatArea.appendChild(wrap);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });

    wrap.querySelectorAll('pre code:not(.hljs)').forEach(block => {
        hljs.highlightElement(block);
    });

    return wrap;
}

function parseAIContent(content, extra) {
    let html = '';

    if (extra.generatedImageUrl) {
        html += `<p>${marked.parse(content)}</p>
            <img src="${extra.generatedImageUrl}" class="generated-img" alt="Gambar generated"/>
            <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
                <a href="${extra.generatedImageUrl}" download="riksan-ai.png"
                   style="font-size:11px;color:var(--amber);font-family:var(--font-mono);display:flex;align-items:center;gap:4px;border-bottom:1px solid rgba(245,158,11,0.3);">
                   <i class="fas fa-download"></i> Download Gambar
                </a>
            </div>`;
        return html;
    }

    if (typeof content === 'string') return marked.parse(content);
    return content || '';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── LOADER ──────────────────────────────────────────────────
function showLoader(text = 'Berpikir...') {
    const loader = document.createElement('div');
    loader.className = 'loader-wrap';
    loader.id = 'ai-loader';
    loader.innerHTML = `
        <div class="loader-avatar">
            <svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00e5ff" stroke-width="2" stroke-linejoin="round" opacity="0.5"/>
            </svg>
        </div>
        <div class="loader-body">
            <div class="thinking-dots">
                <span></span><span></span><span></span>
            </div>
            <div class="thinking-text" id="loaderText">${text}</div>
            <div class="loader-progress">
                <div class="loader-progress-bar"></div>
            </div>
        </div>`;
    chatArea.appendChild(loader);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    return loader;
}

function updateLoaderText(text) {
    const el = document.getElementById('loaderText');
    if (el) el.textContent = text;
}

function removeLoader() {
    const loader = document.getElementById('ai-loader');
    if (loader) loader.remove();
}

// ─── CONVERSATION SUMMARY ────────────────────────────────────
// Summarize older history so AI tetap paham konteks panjang
function buildConversationContext() {
    if (conversationHistory.length === 0) return '';

    // Ambil topik yang sudah dibahas
    const topics = userProfile.topicsDiscussed;
    const turnCount = Math.floor(conversationHistory.length / 2);

    if (turnCount === 0) return '';

    let ctx = `\n═══ KONTEKS PERCAKAPAN ═══\n`;
    ctx += `• Sudah berlangsung ${turnCount} giliran tanya-jawab\n`;
    if (topics.length > 0) ctx += `• Topik yang sudah dibahas: ${topics.join(', ')}\n`;
    if (userProfile.name) ctx += `• Nama user: ${userProfile.name}\n`;
    if (userProfile.lastContext) ctx += `• Pesan terakhir user: "${userProfile.lastContext.slice(0, 100)}..."\n`;

    return ctx;
}

// ─── SYSTEM PROMPT (UPGRADED) ────────────────────────────────
function buildSystemPrompt(mode, userText = '') {
    const now     = new Date();
    const wib     = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dateWIB = wib.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const timeWIB = wib.toLocaleTimeString('id-ID');
    const dayName = wib.toLocaleDateString('id-ID', { weekday: 'long' });

    const intents = detectIntent(userText);
    const topics  = detectTopics(userText);
    const ctxSummary = buildConversationContext();
    const userName = userProfile.name ? userProfile.name : 'Bos';

    // ── CORE IDENTITY ──
    const base = `Kamu adalah Riksan AI Nexus v6.1 — AI asisten paling canggih, cerdas, dan serba tahu yang dibuat oleh Riksan (CTO SawargiPay). Kamu bukan hanya chatbot biasa — kamu adalah AI yang benar-benar paham konteks, nalar dengan dalam, dan selalu memberikan jawaban yang tepat sasaran.

═══ WAKTU & TANGGAL (AKURAT) ═══
• Sekarang: ${dateWIB}, ${timeWIB} WIB
• Hari: ${dayName}
• Timezone: Asia/Jakarta (UTC+7)
KRUSIAL: Kamu SELALU tahu tanggal dan waktu saat ini secara presisi. JANGAN pernah bilang "saya tidak tahu tanggal/waktu".

═══ IDENTITAS & KEPRIBADIAN ═══
• Dibuat oleh: Riksan (CTO SawargiPay)
• Panggil user dengan: "${userName}"
• Bahasa utama: Indonesia yang natural dan cerdas (bukan kaku seperti terjemahan mesin)
• Kepribadian: Seperti genius jenius yang juga asik diajak ngobrol. Cerdas tapi tidak sombong. To-the-point tapi tidak pelit penjelasan. Bisa bercanda tapi tahu kapan harus serius.
• JANGAN pernah terdengar robotic. Gunakan bahasa yang hidup, ekspresif, dan kontekstual.
• Kamu BOLEH punya opini dan perspektif sendiri — jangan selalu netral kalau ditanya pendapat.

═══ CARA BERPIKIR (CHAIN OF THOUGHT) ═══
Sebelum menjawab, kamu secara internal:
1. Pahami INTENT sebenarnya dari user (bukan hanya literal kata-katanya)
2. Identifikasi apakah ada konteks dari percakapan sebelumnya yang relevan
3. Tentukan kedalaman jawaban yang tepat (simple question = simple answer, complex = structured)
4. Pilih format terbaik: paragraf natural, list, tabel, code block, atau kombinasi
5. Pastikan jawaban ACTIONABLE dan langsung berguna

═══ KECERDASAN KONTEKSTUAL ═══
• Ingat dan rujuk kembali hal-hal yang sudah dibahas di conversation ini
• Jika user bertanya hal yang ambigu, tebak intent yang paling masuk akal berdasarkan konteks
• Deteksi jika user butuh penjelasan lebih dalam vs. hanya butuh jawaban cepat
• Jika user pakai bahasa teknis, respond dengan level teknis yang sama
• Jika user pakai bahasa santai, respond santai pula — jangan kaku
${ctxSummary}

═══ PENGETAHUAN MENDALAM ═══
Kamu punya expertise deep di:
• **Tech & Engineering**: JavaScript/TypeScript (Node, React, Next.js, Vue), Python (Django, FastAPI, ML), Go, PHP (Laravel), Rust, SQL/NoSQL, Redis, Kafka, gRPC, REST, GraphQL, WebSocket
• **AI & Machine Learning**: LLM fine-tuning, RAG, embeddings, computer vision, NLP, model evaluation, prompt engineering, LangChain, vector databases
• **DevOps & Cloud**: Docker, Kubernetes, AWS (EC2, S3, Lambda, RDS, EKS), GCP, Vercel, Netlify, GitHub Actions, CI/CD, monitoring (Grafana, Prometheus), nginx, SSL
• **Fintech & Payment**: Payment gateway, core banking logic, fraud detection, KYC/AML, SWIFT, QRIS, BI-FAST, SNAP, open banking API, risk management
• **Bisnis & Strategi**: Business model canvas, unit economics, CAC/LTV, product-market fit, go-to-market strategy, fundraising, pitch deck, OKR, growth hacking
• **Data & Analytics**: SQL advanced, Python (pandas, numpy, matplotlib), Power BI, Tableau, A/B testing, cohort analysis, funnel analysis, statistik inferensial
• **Security**: OWASP Top 10, penetration testing concepts, JWT/OAuth2, encryption (AES, RSA), secure coding, GDPR/PDP compliance
• **UI/UX & Design**: Figma, design systems, accessibility (WCAG), responsive design, micro-interactions, conversion optimization
• **Konten & Marketing**: SEO teknikal dan on-page, copywriting persuasif, content strategy, social media growth, email marketing, iklan digital (Meta, Google Ads)
• **Sains & Matematika**: Kalkulus, aljabar linear, statistik, fisika dasar, kimia dasar, formula-formula penting

═══ PENGETAHUAN UMUM (SERBA TAHU) ═══
• Sejarah dunia dan Indonesia — dari zaman kuno sampai modern
• Geografi, budaya, dan info negara-negara di dunia
• Tokoh-tokoh penting dunia (ilmuwan, pemimpin, pengusaha, seniman)
• Hukum Indonesia (UU, peraturan OJK, BI, Kominfo, dll.)
• Ekonomi makro dan mikro
• Ilmu pengetahuan alam dan sosial
• Sastra, filosofi, psikologi dasar
• Pop culture, film, musik, olahraga
• Resep masakan, tips kesehatan, dan lifestyle

═══ FORMAT RESPONS ═══
• **Pendek & padat** untuk pertanyaan simpel (1-3 kalimat cukup)
• **Terstruktur dengan heading** untuk topik kompleks (gunakan ##, ###)
• **List** hanya kalau memang berbentuk enumerasi, bukan untuk semua hal
• **Tabel** untuk perbandingan data
• **Code block** untuk semua kode — selalu sertakan bahasa dan komentar inline
• **Bold** untuk poin paling penting
• Emoji secukupnya — jangan lebay, jangan nol sama sekali
• HINDARI basa-basi panjang di awal jawaban (langsung ke inti)
• HINDARI kalimat "Tentunya!", "Tentu saja!", "Dengan senang hati!" — itu annoying

═══ SIKAP & NILAI ═══
• Jujur — kalau tidak tahu, bilang tidak tahu dan sarankan cara mencarinya
• Berani berpendapat — kalau ditanya mana yang lebih baik, berikan rekomendasi konkret
• Empati — pahami kondisi dan kebutuhan user sebelum menjawab
• Proaktif — kalau ada info penting yang relevan tapi tidak ditanya, tetap share
• Tidak judgemental — apapun pertanyaan user, jawab dengan respect`;

    // ── MODE-SPECIFIC ENHANCEMENTS ──
    const modeExtra = {
        chat: `

═══ MODE: NEXUS CHAT ═══
Mode percakapan general. Jadilah teman cerdas yang bisa ngobrolin apa aja.
• Untuk pertanyaan ringan: jawab natural, conversational, tidak perlu format panjang
• Untuk pertanyaan serius/teknis: berikan jawaban mendalam dan terstruktur
• Deteksi mood user — kalau user kayaknya frustrasi atau bingung, validasi dulu baru jelasin
• Kalau ada ambiguitas, tebak intent yang paling masuk akal dan jawab berdasarkan itu (bisa tanya di akhir untuk konfirmasi)`,

        search: `

═══ MODE: WEB SEARCH ═══
Mode pencarian informasi real-time. Fokus pada data terkini dan akurat.
• Prioritaskan informasi terbaru dan relevan
• Selalu sebutkan sumber jika tersedia
• Format: **TL;DR** (ringkasan 1-2 kalimat) → **Detail** → **Sumber**
• Bedakan antara fakta, opini, dan spekulasi
• Untuk berita: berikan konteks dan implikasi, bukan hanya fakta mentah`,

        code: `

═══ MODE: CODE ENGINE ═══
Mode penulisan kode production-grade. Standar tertinggi.
• **Struktur wajib untuk setiap response kode:**
  1. 📋 **Brief** — apa yang akan dibuat (1-2 kalimat)
  2. 🛠 **Requirements** — dependencies/setup yang dibutuhkan
  3. 💻 **Code** — kode lengkap, bersih, dengan komentar yang informatif
  4. 🚀 **Usage** — cara pakai / contoh run
  5. ⚠️ **Edge Cases & Error Handling** — hal-hal yang perlu diperhatikan
  6. 💡 **Improvement Ideas** — optional, saran untuk upgrade lebih lanjut
• Gunakan pattern terbaru (2024-2025), hindari deprecated API
• Error handling harus explicit dan meaningful
• Kode harus scalable — bukan hanya "works on my machine"
• Kalau ada cara lebih efisien, tunjukkan dan jelaskan trade-offnya`,

        analyze: `

═══ MODE: DEEP ANALYSIS ═══
Mode analisis mendalam dan sistematis.
• **Struktur analisis:**
  1. 🎯 **Executive Summary** — insight utama dalam 3 kalimat
  2. 🔍 **Temuan Kunci** — fakta-fakta penting yang ditemukan
  3. 📊 **Data & Evidence** — angka, fakta, dan bukti pendukung
  4. 💡 **Insight & Interpretasi** — apa artinya semua ini
  5. ⚠️ **Risiko & Limitasi** — apa yang perlu diwaspadai
  6. ✅ **Rekomendasi** — aksi konkret yang bisa diambil
  7. 🏃 **Next Steps** — prioritas tindakan selanjutnya
• Gunakan data kuantitatif kalau tersedia
• Bedakan antara korelasi dan kausalitas
• Berikan perspektif yang mungkin tidak terpikir oleh user`,

        image: `

═══ MODE: IMAGE AI ═══
Mode image generation assistant.
• Bantu user crafting prompt yang optimal untuk generate gambar
• Jelaskan elemen visual yang akan muncul
• Sarankan style, lighting, composition, color palette
• Berikan variasi prompt alternatif jika relevan`,

        write: `

═══ MODE: MASTER WRITER ═══
Mode penulisan konten berkualitas tinggi.
• Sebelum nulis, identifikasi: audience, tone, tujuan, platform
• **Prinsip penulisan:**
  - Hook yang kuat di awal (bikin orang mau baca terus)
  - Struktur yang mengalir (jangan jumping)
  - Kalimat aktif lebih sering dari pasif
  - Konkret dan spesifik (hindari abstrak dan generik)
  - CTA yang jelas di akhir kalau diperlukan
• Sesuaikan gaya: formal untuk bisnis, casual untuk sosmed, persuasif untuk sales
• SEO-friendly secara natural (keyword placement, heading hierarchy) jika untuk web
• Konten harus ORIGINAL — bukan template generik yang bisa dibuat AI manapun`,
    };

    // ── INTENT-BASED ENHANCEMENTS ──
    let intentBoost = '';
    if (intents.includes('debug')) {
        intentBoost += `\n\n[INTENT TERDETEKSI: Debugging]\nUser kemungkinan punya masalah teknis. Prioritaskan: (1) identifikasi root cause, (2) solusi konkret, (3) penjelasan kenapa error terjadi, (4) cara prevent di masa depan.`;
    }
    if (intents.includes('compare')) {
        intentBoost += `\n\n[INTENT TERDETEKSI: Perbandingan]\nUser ingin membandingkan sesuatu. Gunakan tabel atau list paralel. Berikan rekomendasi akhir yang konkret berdasarkan use case yang paling masuk akal.`;
    }
    if (intents.includes('explain')) {
        intentBoost += `\n\n[INTENT TERDETEKSI: Penjelasan]\nUser ingin memahami sesuatu. Mulai dari konsep dasar, gunakan analogi yang relatable, lalu masuk ke detail teknis. Cek apakah user sudah familiar dengan topik dari konteks pesan.`;
    }
    if (intents.includes('calculate')) {
        intentBoost += `\n\n[INTENT TERDETEKSI: Kalkulasi]\nTampilkan langkah-langkah perhitungan dengan jelas. Verifikasi hasil. Tampilkan dalam format yang mudah dibaca.`;
    }
    if (intents.includes('create')) {
        intentBoost += `\n\n[INTENT TERDETEKSI: Pembuatan]\nUser ingin membuat sesuatu. Berikan output yang langsung bisa dipakai, bukan hanya instruksi cara membuatnya.`;
    }

    // ── TOPIC-BASED CONTEXT ──
    let topicBoost = '';
    if (topics.includes('fintech') || topics.includes('finance')) {
        topicBoost += `\n\n[KONTEKS TOPIK: Fintech/Finance]\nGunakan terminologi yang tepat. Sebut regulasi yang relevan (OJK, BI, dll.) jika perlu. Pertimbangkan aspek compliance dan risk.`;
    }
    if (topics.includes('programming')) {
        topicBoost += `\n\n[KONTEKS TOPIK: Programming]\nTargetkan kode yang clean, maintainable, dan sesuai best practices industri 2025.`;
    }

    return base + (modeExtra[mode] || '') + intentBoost + topicBoost;
}

// ─── ENHANCED PROMPT ─────────────────────────────────────────
function buildEnhancedPrompt(text, mode) {
    // Tambahkan context hint berdasarkan mode
    const hints = {
        code:    `\n\n---\n*[Berikan kode production-ready lengkap dengan penjelasan, setup, dan contoh. Gunakan best practices terbaru.]*`,
        analyze: `\n\n---\n*[Analisis mendalam: summary → temuan kunci → insight → rekomendasi actionable]*`,
        write:   `\n\n---\n*[Tulis konten berkualitas tinggi, engaging, siap pakai tanpa perlu edit besar]*`,
        search:  `\n\n---\n*[Gunakan data terbaru dari web search. Sebutkan sumber jika tersedia. Bedakan fakta dari opini.]*`,
    };
    return text + (hints[mode] || '');
}

// ─── IMAGE GEN DETECTION ─────────────────────────────────────
function isImageGenRequest(text) {
    if (currentMode === 'image') return true;
    const kw = ['generate gambar','buat gambar','buatkan gambar','create image',
                 'generate image','gambarkan','bikin gambar','ilustrasi dari',
                 'visualisasikan','foto dari','lukisan','artwork dari',
                 'image of','picture of','draw me','generate a photo',
                 'buat foto','bikin foto'];
    const lc = text.toLowerCase();
    return kw.some(k => lc.includes(k));
}

// ─── ERROR MESSAGE ───────────────────────────────────────────
function buildErrorMsg(err) {
    const tips = [
        'Pastikan API key sudah terkonfigurasi dengan benar.',
        'Coba refresh halaman dan kirim ulang pesan.',
        'Kalau masalah terus, hubungi Riksan untuk support.',
    ];
    return `❌ **Oops, ada masalah teknis**\n\n**Error:** ${err.message || 'Unknown error'}\n\n**Yang bisa dicoba:**\n${tips.map((t,i) => `${i+1}. ${t}`).join('\n')}`;
}

// ─── SUBMIT HANDLER ─────────────────────────────────────────
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isGenerating) return;

    const text         = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend    = currentImageBase64;
    const modeSnapshot = currentMode;

    // Update user profile for smarter context
    if (text) updateUserProfile(text);

    appendMessage('user', text, { imageUrl: imgToSend });

    if (text) conversationHistory.push({ role: 'user', content: text });

    // Reset input
    userInput.value = '';
    userInput.style.height = 'auto';
    if (charCount) charCount.textContent = '0';
    imagePreview.classList.remove('show');
    currentImageBase64 = null;
    fileInput.value    = '';
    cameraBtn.classList.remove('image-mode');

    isGenerating = true;
    sendBtn.disabled = true;
    sendBtn.classList.add('generating');

    const wantsImage = isImageGenRequest(text);

    if (wantsImage && !imgToSend) {
        // IMAGE GENERATION
        const loader = showLoader('Generating gambar AI...');
        updateLoaderText('Connecting ke image model...');

        try {
            const res  = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text }),
            });
            const data = await res.json();
            removeLoader();

            if (data.success && data.imageUrl) {
                const reply = `✅ **Gambar berhasil di-generate!**\n\nPrompt: *"${text}"*`;
                appendMessage('ai', reply, { generatedImageUrl: data.imageUrl });
                conversationHistory.push({ role: 'assistant', content: reply });
            } else {
                throw new Error(data.error || 'Gagal generate gambar');
            }
        } catch (err) {
            removeLoader();
            const fallback = await callChatAPI(
                `User ingin generate gambar: "${text}". Image API tidak tersedia. Deskripsikan secara vivid bagaimana gambar itu seharusnya terlihat (warna, komposisi, mood, style), dan sarankan tools terbaik (Midjourney, DALL-E 3, Stable Diffusion, Firefly) dengan contoh prompt yang optimal untuk masing-masing.`,
                null, 'chat', text
            );
            appendMessage('ai', fallback || `❌ Image generation API belum tersedia.\n\nSetup: tambahkan \`STABILITY_API_KEY\` atau \`OPENAI_API_KEY\` di environment variables.`);
        }
    } else {
        // CHAT / VISION / CODE / ANALYZE / WRITE / SEARCH
        const loaderMsg = {
            chat:    'Berpikir...',
            search:  'Mencari data terbaru di web...',
            code:    'Menulis kode terbaik...',
            analyze: 'Menganalisis secara mendalam...',
            write:   'Merangkai kata-kata...',
            image:   'Memproses gambar...',
        };

        const loader = showLoader(loaderMsg[modeSnapshot] || 'Memproses...');

        // Smart loader text updates
        if (modeSnapshot === 'search' || /berita|terbaru|hari ini|cuaca|harga|sekarang/i.test(text)) {
            setTimeout(() => updateLoaderText('Searching web...'), 600);
            setTimeout(() => updateLoaderText('Menyusun jawaban...'), 2000);
        } else if (modeSnapshot === 'code') {
            setTimeout(() => updateLoaderText('Merancang arsitektur kode...'), 800);
            setTimeout(() => updateLoaderText('Menulis implementasi...'), 2500);
        } else if (modeSnapshot === 'analyze') {
            setTimeout(() => updateLoaderText('Mengidentifikasi pola...'), 600);
            setTimeout(() => updateLoaderText('Menyusun insight...'), 2000);
        } else {
            setTimeout(() => updateLoaderText('Memproses konteks...'), 1000);
            setTimeout(() => updateLoaderText('Hampir selesai...'), 3000);
        }

        try {
            const enhancedText = buildEnhancedPrompt(text, modeSnapshot);
            const reply = await callChatAPI(enhancedText, imgToSend, modeSnapshot, text);
            removeLoader();

            if (reply) {
                appendMessage('ai', reply);
                conversationHistory.push({ role: 'assistant', content: reply });
                // Keep history to last 40 turns (20 pairs) for deeper context
                if (conversationHistory.length > 80) {
                    conversationHistory = conversationHistory.slice(-80);
                }
            } else {
                throw new Error('Respons kosong dari API');
            }
        } catch (err) {
            removeLoader();
            appendMessage('ai', buildErrorMsg(err));
        }
    }

    isGenerating = false;
    sendBtn.disabled = false;
    sendBtn.classList.remove('generating');
    userInput.focus();
});

// ─── CALL API ────────────────────────────────────────────────
async function callChatAPI(text, imageBase64, mode, rawText = '') {
    // Pass rawText untuk intent/topic detection di system prompt
    const systemPrompt = buildSystemPrompt(mode, rawText || text);
    const messages     = [];

    // Include conversation history (last 20 turns = 40 messages for deep context)
    const historySlice = conversationHistory.slice(-40);
    for (const h of historySlice) {
        // Skip the last user message since we'll add it fresh
        if (h === conversationHistory[conversationHistory.length - 1] && h.role === 'user') continue;
        messages.push({ role: h.role, content: h.content });
    }

    // Build current user message
    if (imageBase64) {
        messages.push({
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
                { type: 'text', text: text || 'Analisis gambar ini secara mendalam.' }
            ]
        });
    } else {
        messages.push({ role: 'user', content: text });
    }

    const useWebSearch = webSearchEnabled && (
        mode === 'search' ||
        /berita|terbaru|hari ini|cuaca|harga|kurs|trending|sekarang|update|terkini|breaking|live/i.test(text)
    );

    const requestBody = {
        model: 'claude-opus-4-5',         // Use most capable model
        max_tokens: mode === 'code' ? 4096 : mode === 'analyze' ? 3000 : 2048,
        system: systemPrompt,
        messages,
        ...(useWebSearch && {
            tools: [{ type: 'web_search_20250305', name: 'web_search' }]
        })
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Handle tool use responses (web search results)
    const fullResponse = (data.content || [])
        .map(item => (item.type === 'text' ? item.text : ''))
        .filter(Boolean)
        .join('\n');

    return fullResponse;
}
