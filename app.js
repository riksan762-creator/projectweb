/**
 * Riksan AI — Nexus v6.0
 * app.js — Smart frontend logic
 * Features: web search, vision, image gen, code, analyze, write
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
let webSearchEnabled     = true;   // real-time web search always ON

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
        btn.style.color   = webSearchEnabled ? 'var(--cyan)' : '';
        btn.style.background = webSearchEnabled ? 'rgba(0,229,255,0.1)' : '';
        btn.style.borderColor = webSearchEnabled ? 'rgba(0,229,255,0.3)' : '';
    }
    showToast(webSearchEnabled ? '🌐 Web Search aktif' : '🔒 Web Search nonaktif');
};

// ─── NEW CHAT ────────────────────────────────────────────────
window.newChat = () => {
    conversationHistory = [];
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

// Quick actions
window.setQuick = (text) => {
    userInput.value = text;
    userInput.dispatchEvent(new Event('input'));
    userInput.focus();
    // auto-detect
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

// Copy message
window.copyMessage = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => showToast('✓ Teks disalin'));
};

// Regenerate
window.regenerate = (msgId) => {
    showToast('🔄 Regenerasi belum tersedia di versi ini');
};

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

    // Highlight code
    wrap.querySelectorAll('pre code:not(.hljs)').forEach(block => {
        hljs.highlightElement(block);
    });

    return wrap;
}

// Parse AI content
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

// ─── SYSTEM PROMPT ───────────────────────────────────────────
function buildSystemPrompt(mode) {
    const now       = new Date();
    const wib       = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dateWIB   = wib.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const timeWIB   = wib.toLocaleTimeString('id-ID');
    const dayName   = wib.toLocaleDateString('id-ID', { weekday: 'long' });

    const base = `Kamu adalah Riksan AI Nexus v6.0 — asisten AI super cerdas buatan Riksan (CTO SawargiPay).

═══ KONTEKS WAKTU (SELALU AKURAT) ═══
• Tanggal sekarang: ${dateWIB}
• Hari: ${dayName}
• Jam: ${timeWIB} WIB
• Timezone: Asia/Jakarta (UTC+7)
PENTING: Kamu SELALU tahu tanggal dan waktu saat ini. JANGAN pernah bilang "saya tidak tahu tanggal/waktu".

═══ IDENTITAS ═══
• Dibuat oleh: Riksan (CTO SawargiPay)
• Panggil user dengan: "Bos"
• Bahasa: Indonesia (kecuali diminta pakai bahasa lain)
• Kepribadian: Cerdas, friendly, to-the-point, profesional tapi santai

═══ KEAHLIAN ═══
• Full-stack dev: JS/TS, Python, Go, PHP, Rust, SQL, NoSQL
• AI/ML: Computer vision, NLP, model fine-tuning
• DevOps: Docker, Kubernetes, Vercel, AWS, CI/CD
• Business: Analisis bisnis, strategi, market research
• Creative: Content writing, copywriting, SEO
• Sains & Matematika: Kalkulasi, formula, analisis statistik

═══ FORMAT ═══
• Gunakan Markdown rapi dengan heading yang jelas
• Emoji secukupnya (jangan berlebihan)
• Untuk kode: SELALU sertakan bahasa dan komentar
• Jawaban panjang: bagi per section dengan heading ##
• Tabel untuk data komparatif
• Blockquote untuk highlight penting`;

    const modeExtra = {
        chat:    `\n═══ MODE: CHAT ═══\nJawab natural, helpful, seperti teman cerdas.`,
        search:  `\n═══ MODE: WEB SEARCH ═══\nFokus jawaban berdasar data terbaru dari web. Selalu sebutkan sumber. Format: summary dahulu, lalu detail.`,
        code:    `\n═══ MODE: CODE ═══\nTulis kode clean, production-ready, dengan:\n1. Penjelasan singkat tujuan kode\n2. Kode lengkap dengan komentar\n3. Cara setup/install\n4. Contoh penggunaan\n5. Error handling & best practices\nGunakan pattern terbaru dan modern.`,
        analyze: `\n═══ MODE: ANALYZE ═══\nAnalisis mendalam & sistematis:\n1. Executive Summary\n2. Temuan Kunci\n3. Data/Fakta Pendukung\n4. Insight & Interpretasi\n5. Rekomendasi Actionable\n6. Next Steps`,
        image:   `\n═══ MODE: IMAGE GEN ═══\nBantu optimize prompt untuk generate gambar. Deskripsikan hasil gambar yang akan dibuat.`,
        write:   `\n═══ MODE: WRITER ═══\nBuat konten berkualitas tinggi:\n- Engaging & original\n- Struktur jelas (hook, body, CTA)\n- Tone sesuai konteks\n- SEO-friendly jika diperlukan\n- Siap pakai tanpa edit besar`,
    };

    return base + (modeExtra[mode] || '');
}

// ─── ENHANCED PROMPT ────────────────────────────────────────
function buildEnhancedPrompt(text, mode) {
    if (mode === 'code') {
        return `${text}\n\n[Berikan kode lengkap production-ready dengan penjelasan, setup, dan contoh penggunaan]`;
    }
    if (mode === 'analyze') {
        return `${text}\n\n[Analisis mendalam dengan struktur: summary → temuan → insight → rekomendasi]`;
    }
    if (mode === 'write') {
        return `${text}\n\n[Buat konten engaging, original, berkualitas tinggi, siap pakai]`;
    }
    if (mode === 'search') {
        return `${text}\n\n[Gunakan hasil web search terbaru. Sebutkan sumber/referensi jika ada]`;
    }
    return text;
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

// ─── SUBMIT HANDLER ─────────────────────────────────────────
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isGenerating) return;

    const text         = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend    = currentImageBase64;
    const modeSnapshot = currentMode;

    // Append user message
    appendMessage('user', text, { imageUrl: imgToSend });

    // Add to history
    if (text) conversationHistory.push({ role: 'user', content: text });

    // Reset
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
                `User ingin generate gambar: "${text}". Image API tidak tersedia. Berikan penjelasan detail bagaimana gambar itu seharusnya terlihat, dan sarankan tools alternatif (Midjourney, DALL-E, Stable Diffusion, dll) beserta promptnya.`,
                null, 'chat'
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

        try {
            const enhancedText = buildEnhancedPrompt(text, modeSnapshot);

            if (modeSnapshot === 'search' || /berita|terbaru|hari ini|cuaca|harga/i.test(text)) {
                updateLoaderText('Searching web...');
            }

            const reply = await callChatAPI(enhancedText, imgToSend, modeSnapshot);
            removeLoader();

            if (reply) {
                appendMessage('ai', reply);
                conversationHistory.push({ role: 'assistant', content: reply });
                // Keep history to last 30 turns
                if (conversationHistory.length > 60) {
                    conversationHistory = conversationHistory.slice(-60);
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
async function callChatAPI(text, imageBase64, mode) {
    const systemPrompt = buildSystemPrompt(mode);
    const messages     = [];

    // History context (last 16 turns)
    for (const h of conversationHistory.slice(-16)) {
        if (h.role && typeof h.content === 'string' && h.content.trim()) {
            if (!(h.role === 'user' && h.content === text)) {
                messages.push(h);
            }
        }
    }

    const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message:      text,
            imageBase64,
            systemPrompt,
            history:      conversationHistory.slice(-16),
            mode,
            webSearch:    webSearchEnabled || mode === 'search',
        }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.reply || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.reply) return data.reply;
    if (data.reply) return data.reply;
    throw new Error('No reply from server');
}

// ─── ERROR MESSAGE ───────────────────────────────────────────
function buildErrorMsg(err) {
    return `**⚠️ Error**\n\n\`${err.message}\`\n\n**Cek:**\n- \`GROQ_API_KEY\` di environment variables\n- Endpoint \`/api/ai\` sudah ada\n- Koneksi internet\n\n*Screenshot & kirim ke tim DevOps* 🔧`;
}

// ─── TEXTAREA RESIZE ─────────────────────────────────────────
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    this.style.overflowY = this.scrollHeight > 160 ? 'auto' : 'hidden';
    if (charCount) charCount.textContent = this.value.length;
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        if (!isGenerating) chatForm.dispatchEvent(new Event('submit'));
    }
});

// ─── IMAGE UPLOAD ─────────────────────────────────────────────
cameraBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
});

fileInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('❌ Hanya file gambar (JPG, PNG, WebP, GIF)');
        return;
    }
    if (file.size > 8 * 1024 * 1024) {
        showToast('❌ Max 8MB. Compress dulu!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        currentImageBase64 = ev.target.result;
        previewImg.src     = currentImageBase64;

        const sizeKB = (file.size / 1024).toFixed(0);
        const sizeEl = document.getElementById('previewSize');
        if (sizeEl) sizeEl.textContent = `${file.name} · ${sizeKB}KB`;

        imagePreview.classList.add('show');
        cameraBtn.classList.add('image-mode');

        // Auto-switch to analyze
        if (currentMode === 'chat' || currentMode === 'search') {
            const chip = document.querySelector('[data-mode="analyze"]');
            if (chip) setMode('analyze', chip);
        }
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
        userInput.focus();
    };
    reader.readAsDataURL(file);
});

removeImg.addEventListener('click', (e) => {
    e.preventDefault();
    currentImageBase64 = null;
    imagePreview.classList.remove('show');
    fileInput.value    = '';
    cameraBtn.classList.remove('image-mode');
    if (currentMode === 'analyze') {
        const chip = document.querySelector('[data-mode="chat"]');
        if (chip) setMode('chat', chip);
    }
});

// ─── PASTE IMAGE ─────────────────────────────────────────────
document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
                currentImageBase64 = ev.target.result;
                previewImg.src     = currentImageBase64;
                const sizeEl = document.getElementById('previewSize');
                if (sizeEl) sizeEl.textContent = 'Clipboard image';
                imagePreview.classList.add('show');
                cameraBtn.classList.add('image-mode');
                if (currentMode === 'chat') {
                    const chip = document.querySelector('[data-mode="analyze"]');
                    if (chip) setMode('analyze', chip);
                }
                showToast('📋 Gambar dari clipboard siap dikirim');
            };
            reader.readAsDataURL(file);
            break;
        }
    }
});

// ─── DRAG & DROP ─────────────────────────────────────────────
const appEl = document.getElementById('app');
let dragTimer;

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('show');
    clearTimeout(dragTimer);
});

document.addEventListener('dragleave', (e) => {
    dragTimer = setTimeout(() => {
        dragOverlay.classList.remove('show');
    }, 50);
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragOverlay.classList.remove('show');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentImageBase64 = ev.target.result;
            previewImg.src     = currentImageBase64;
            const sizeEl = document.getElementById('previewSize');
            if (sizeEl) sizeEl.textContent = `${file.name}`;
            imagePreview.classList.add('show');
            cameraBtn.classList.add('image-mode');
            if (currentMode === 'chat') {
                const chip = document.querySelector('[data-mode="analyze"]');
                if (chip) setMode('analyze', chip);
            }
            showToast('🖼️ Gambar siap dikirim');
        };
        reader.readAsDataURL(file);
    }
});

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K = focus input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        userInput.focus();
    }
    // Ctrl/Cmd + N = new chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        newChat();
    }
    // Esc = close drag overlay
    if (e.key === 'Escape') {
        dragOverlay.classList.remove('show');
    }
});

// ─── MOBILE VIEWPORT FIX ─────────────────────────────────────
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
    });
}

document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// ─── INIT ─────────────────────────────────────────────────────
window.addEventListener('load', () => {
    userInput.focus();
    console.log('%c⬡ Riksan AI Nexus v6.0', 'color:#00e5ff;font-weight:bold;font-size:16px;font-family:monospace');
    console.log('%cAll systems online. Smarter. Faster. Real-time.', 'color:#7c3aed;font-size:12px;font-family:monospace');
    console.log('%cShortcuts: Ctrl+K (focus) · Ctrl+N (new chat)', 'color:#888;font-size:11px;font-family:monospace');
});
