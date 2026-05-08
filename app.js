/**
 * Riksan AI — Supreme v5.0
 * Author: Riksan (CTO SawargiPay)
 * Full-stack AI: Chat · Image Gen · Vision · Code · Analysis
 */

// ─── DOM REFS ───────────────────────────────────────────────
const chatForm     = document.getElementById('chatForm');
const userInput    = document.getElementById('userInput');
const chatArea     = document.getElementById('chatArea');
const fileInput    = document.getElementById('fileInput');
const cameraBtn    = document.getElementById('cameraBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg   = document.getElementById('previewImg');
const removeImg    = document.getElementById('removeImg');
const sendBtn      = document.getElementById('sendBtn');
const welcome      = document.getElementById('welcome');

// ─── STATE ──────────────────────────────────────────────────
let currentImageBase64 = null;
let currentMode = 'chat';
let conversationHistory = [];
let isGenerating = false;

// ─── MARKED CONFIG ──────────────────────────────────────────
marked.setOptions({
    highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// Custom renderer untuk code blocks (tambahkan header + copy button)
const renderer = new marked.Renderer();
renderer.code = (code, language) => {
    const lang = language || 'text';
    const highlighted = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value;
    
    const id = 'code-' + Math.random().toString(36).substr(2, 8);
    return `
        <div class="code-block-wrap">
            <div class="code-header">
                <span>${lang.toUpperCase()}</span>
                <button class="copy-btn" onclick="copyCode('${id}')">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <pre><code id="${id}" class="hljs language-${lang}">${highlighted}</code></pre>
        </div>`;
};
marked.setOptions({ renderer });

// ─── COPY CODE ───────────────────────────────────────────────
window.copyCode = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
        const btn = el.closest('.code-block-wrap').querySelector('.copy-btn');
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.color = 'var(--accent2)';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
            btn.style.color = '';
        }, 2000);
    });
};

// ─── MODE SETTER ─────────────────────────────────────────────
window.setMode = (mode, el) => {
    currentMode = mode;
    document.querySelectorAll('.mode-chip').forEach(c => {
        c.classList.remove('active', 'img-mode');
    });
    el.classList.add('active');
    if (mode === 'image') el.classList.add('img-mode');

    const placeholders = {
        chat:    'Tanya apa aja ke Riksan AI...',
        image:   'Deskripsikan gambar yang mau di-generate... (misal: kota cyberpunk malam hari)',
        code:    'Minta Riksan nulisin kode... (misal: REST API dengan auth)',
        analyze: 'Upload gambar lalu tanya, atau paste data untuk dianalisis...',
        write:   'Minta Riksan nulisin konten... (artikel, email, caption, dll)',
    };
    userInput.placeholder = placeholders[mode] || 'Ketik pesan...';
    userInput.focus();
};

// Quick action buttons
window.setQuick = (text) => {
    userInput.value = text;
    userInput.dispatchEvent(new Event('input'));
    userInput.focus();
    
    // Auto-detect mode dari quick text
    if (text.toLowerCase().includes('gambar') || text.toLowerCase().includes('generate')) {
        const chip = document.querySelector('[data-mode="image"]');
        if (chip) setMode('image', chip);
    } else if (text.toLowerCase().includes('kode') || text.toLowerCase().includes('api') || text.toLowerCase().includes('coding')) {
        const chip = document.querySelector('[data-mode="code"]');
        if (chip) setMode('code', chip);
    }
};

// ─── APPEND MESSAGE ──────────────────────────────────────────
function appendMessage(role, content, extra = {}) {
    if (welcome && !welcome.classList.contains('hidden')) {
        welcome.classList.add('hidden');
    }

    const wrap = document.createElement('div');
    wrap.className = `msg-wrap ${role}`;

    if (role === 'user') {
        wrap.innerHTML = `
            <div class="user-bubble">
                ${extra.imageUrl ? `<img src="${extra.imageUrl}" alt="Uploaded image"/>` : ''}
                <div>${escapeHtml(content) || '<em style="color:var(--text-dim)">Analisis gambar ini...</em>'}</div>
            </div>`;
    } else {
        const parsedContent = parseAIContent(content, extra);
        wrap.innerHTML = `
            <div class="ai-row">
                <div class="ai-avatar">🤖</div>
                <div class="ai-bubble">
                    <div class="prose">${parsedContent}</div>
                    <div class="ai-meta">
                        <span>Riksan Supreme v5.0</span>
                        <span>${new Date().toLocaleTimeString('id-ID')}</span>
                    </div>
                </div>
            </div>`;
    }

    chatArea.appendChild(wrap);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });

    // Highlight code blocks
    wrap.querySelectorAll('pre code:not(.hljs)').forEach(block => {
        hljs.highlightElement(block);
    });

    return wrap;
}

// Parse AI content — handle generated images
function parseAIContent(content, extra) {
    if (extra.generatedImageUrl) {
        return `
            <p>${marked.parse(content)}</p>
            <img src="${extra.generatedImageUrl}" class="generated-img" alt="Generated image"/>
            <div style="margin-top:8px;">
                <a href="${extra.generatedImageUrl}" download="riksan-ai-generated.png" 
                   style="font-size:11px;color:var(--accent2);font-family:var(--font-code);">
                   ⬇ Download Gambar
                </a>
            </div>`;
    }
    if (typeof content === 'string') {
        return marked.parse(content);
    }
    return content;
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
        <div class="loader-avatar">🤖</div>
        <div class="loader-body">
            <div class="thinking-dots">
                <span></span><span></span><span></span>
            </div>
            <div class="thinking-text" id="loaderText">${text}</div>
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

// ─── BUILD SYSTEM PROMPT ─────────────────────────────────────
function buildSystemPrompt(mode) {
    const base = `Kamu adalah Riksan AI, asisten AI super canggih buatan Riksan (CTO SawargiPay). 
Kamu sangat pintar, ramah, dan selalu memberikan jawaban terbaik dalam Bahasa Indonesia (kecuali diminta pakai bahasa lain).
Kamu ahli di: programming, data science, business, creative writing, matematika, sains, dan semua bidang lainnya.
Selalu gunakan format Markdown yang rapi. Gunakan emoji secukupnya agar lebih hidup.
Kalau jawaban panjang, bagi dalam section yang jelas dengan heading.`;

    const modes = {
        chat:    `${base}\nJawab dengan natural dan helpful seperti teman yang cerdas.`,
        code:    `${base}\nFokus pada solusi coding yang clean, efisien, dan production-ready. Selalu sertakan penjelasan kode, best practices, dan error handling. Suggest teknologi terbaik untuk kasus yang diminta.`,
        analyze: `${base}\nAnalisis secara mendalam dan sistematis. Berikan insight yang actionable. Kalau ada data visual, deskripsikan dengan detail.`,
        write:   `${base}\nBuat konten yang engaging, original, dan sesuai konteks. Gunakan gaya bahasa yang tepat sesuai jenis konten yang diminta.`,
        image:   `${base}\nKamu akan membantu generate gambar. Konfirmasi deskripsi gambar yang akan dibuat dengan jelas.`,
    };
    return modes[mode] || base;
}

// ─── DETECT IMAGE GENERATION INTENT ─────────────────────────
function isImageGenRequest(text) {
    if (currentMode === 'image') return true;
    const keywords = [
        'generate gambar', 'buat gambar', 'buatkan gambar', 'create image',
        'generate image', 'gambarkan', 'bikin gambar', 'ilustrasi dari',
        'visualisasikan', 'foto dari', 'lukisan', 'artwork',
        'image of', 'picture of', 'draw me', 'generate a photo',
    ];
    const lc = text.toLowerCase();
    return keywords.some(k => lc.includes(k));
}

// ─── BUILD ENHANCED PROMPT ───────────────────────────────────
function buildEnhancedPrompt(userText, mode) {
    if (mode === 'code') {
        return `${userText}\n\nTolong berikan:\n1. Kode lengkap yang siap pakai\n2. Penjelasan setiap bagian penting\n3. Cara instalasi/setup jika diperlukan\n4. Contoh penggunaan\n5. Tips optimasi & best practices`;
    }
    if (mode === 'analyze') {
        return `${userText}\n\nBerikan analisis mendalam yang mencakup:\n1. Summary utama\n2. Temuan penting\n3. Insight & rekomendasi\n4. Langkah selanjutnya`;
    }
    if (mode === 'write') {
        return `${userText}\n\nBuat konten yang:\n- Engaging dan original\n- Struktur jelas\n- Tone sesuai konteks\n- Siap pakai`;
    }
    return userText;
}

// ─── MAIN SUBMIT HANDLER ─────────────────────────────────────
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isGenerating) return;

    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    const modeSnapshot = currentMode;

    // Append user message
    appendMessage('user', text, { imageUrl: imgToSend });

    // Add to history (text only for history)
    if (text) conversationHistory.push({ role: 'user', content: text });

    // Reset UI
    userInput.value = '';
    userInput.style.height = 'auto';
    imagePreview.classList.remove('show');
    currentImageBase64 = null;
    fileInput.value = '';

    // Disable send
    isGenerating = true;
    sendBtn.disabled = true;

    // Check if image generation request
    const wantsImage = isImageGenRequest(text);

    if (wantsImage && !imgToSend) {
        // IMAGE GENERATION FLOW
        const loader = showLoader('Generating gambar...');
        updateLoaderText('Syncing ke Stability AI / DALL-E...');

        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
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
            // Fallback: coba via chat dengan penjelasan
            const fallback = await callChatAPI(
                `User ingin generate gambar dengan prompt: "${text}". Karena image generation API tidak tersedia, jelaskan cara terbaik membuat gambar ini menggunakan tools lain, dan deskripsikan secara detail bagaimana gambar itu seharusnya terlihat.`,
                null, 'chat'
            );
            appendMessage('ai', fallback || `❌ Maaf, image generation API belum tersedia. Error: ${err.message}\n\nPastikan endpoint \`/api/generate-image\` sudah disetup dengan Stability AI atau DALL-E.`);
        }
    } else {
        // CHAT / VISION FLOW
        const loaderTexts = {
            chat:    'Berpikir...',
            code:    'Menulis kode terbaik...',
            analyze: 'Menganalisis dengan cermat...',
            write:   'Merangkai kata-kata...',
            image:   'Memproses...',
        };
        const loader = showLoader(loaderTexts[modeSnapshot] || 'Memproses...');

        try {
            const enhancedText = buildEnhancedPrompt(text, modeSnapshot);
            const reply = await callChatAPI(enhancedText, imgToSend, modeSnapshot);
            removeLoader();

            if (reply) {
                appendMessage('ai', reply);
                conversationHistory.push({ role: 'assistant', content: reply });
                // Keep history manageable (last 20 turns)
                if (conversationHistory.length > 40) {
                    conversationHistory = conversationHistory.slice(-40);
                }
            } else {
                throw new Error('Empty response dari API');
            }
        } catch (err) {
            removeLoader();
            appendMessage('ai', buildErrorMessage(err));
        }
    }

    isGenerating = false;
    sendBtn.disabled = false;
    userInput.focus();
});

// ─── CALL CHAT API ───────────────────────────────────────────
async function callChatAPI(text, imageBase64, mode) {
    const systemPrompt = buildSystemPrompt(mode);

    // Build messages with history
    const messages = [];
    
    // Add previous history (max 10 turns for context)
    const recentHistory = conversationHistory.slice(-20);
    for (const h of recentHistory) {
        if (h.role !== 'user' || h.content !== text) { // avoid duplicate
            messages.push(h);
        }
    }

    // Build current user message
    if (imageBase64) {
        // Vision mode
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: { url: imageBase64 }
                },
                { type: 'text', text: text || 'Analisis gambar ini secara detail.' }
            ]
        });
    } else {
        messages.push({ role: 'user', content: text });
    }

    const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: text,
            imageBase64,
            systemPrompt,
            history: conversationHistory.slice(-20),
            mode,
        })
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.success && data.reply) return data.reply;
    if (data.reply) throw new Error(data.reply);
    throw new Error('No reply from server');
}

// ─── ERROR MESSAGE BUILDER ───────────────────────────────────
function buildErrorMessage(err) {
    return `**⚠️ Terjadi Error**

${err.message}

**Checklist:**
- ✅ Cek Vercel logs untuk detail error
- ✅ Pastikan API key (Groq/OpenAI/Stability) sudah di-set di environment variables
- ✅ Cek endpoint \`/api/ai\` sudah ada di backend
- ✅ Untuk image generation, cek endpoint \`/api/generate-image\`

*Kalau masih error, screenshot ini dan kirim ke tim DevOps* 🔧`;
}

// ─── TEXTAREA AUTO-RESIZE ────────────────────────────────────
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    const newHeight = Math.min(this.scrollHeight, 160);
    this.style.height = newHeight + 'px';
    this.style.overflowY = this.scrollHeight > 160 ? 'auto' : 'hidden';
});

// Enter to submit, Shift+Enter for newline
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

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Hanya file gambar yang diterima (JPG, PNG, WebP, GIF)');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file max 5MB. Compress dulu ya!');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        previewImg.src = currentImageBase64;
        imagePreview.classList.add('show');
        cameraBtn.classList.add('image-mode');
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });

        // Auto-switch ke analyze mode kalau sedang di chat
        if (currentMode === 'chat') {
            const chip = document.querySelector('[data-mode="analyze"]');
            if (chip) setMode('analyze', chip);
        }
        userInput.focus();
    };
    reader.readAsDataURL(file);
});

removeImg.addEventListener('click', (e) => {
    e.preventDefault();
    currentImageBase64 = null;
    imagePreview.classList.remove('show');
    fileInput.value = '';
    cameraBtn.classList.remove('image-mode');
    
    // Reset mode back to chat if was in analyze
    if (currentMode === 'analyze') {
        const chip = document.querySelector('[data-mode="chat"]');
        if (chip) setMode('chat', chip);
    }
});

// ─── PASTE IMAGE FROM CLIPBOARD ──────────────────────────────
document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
                currentImageBase64 = ev.target.result;
                previewImg.src = currentImageBase64;
                imagePreview.classList.add('show');
                cameraBtn.classList.add('image-mode');

                // Auto-switch ke analyze mode
                if (currentMode === 'chat') {
                    const chip = document.querySelector('[data-mode="analyze"]');
                    if (chip) setMode('analyze', chip);
                }
                chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
            };
            reader.readAsDataURL(file);
            break;
        }
    }
});

// ─── DRAG & DROP IMAGE ───────────────────────────────────────
const appEl = document.getElementById('app');

appEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    appEl.style.outline = '2px solid var(--accent)';
});

appEl.addEventListener('dragleave', () => {
    appEl.style.outline = '';
});

appEl.addEventListener('drop', (e) => {
    e.preventDefault();
    appEl.style.outline = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            currentImageBase64 = ev.target.result;
            previewImg.src = currentImageBase64;
            imagePreview.classList.add('show');
            cameraBtn.classList.add('image-mode');

            if (currentMode === 'chat') {
                const chip = document.querySelector('[data-mode="analyze"]');
                if (chip) setMode('analyze', chip);
            }
        };
        reader.readAsDataURL(file);
    }
});

// ─── MOBILE VIEWPORT FIX ─────────────────────────────────────
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
    });
}

// ─── ANTI-ZOOM MOBILE ────────────────────────────────────────
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// ─── INIT ─────────────────────────────────────────────────────
window.addEventListener('load', () => {
    userInput.focus();
    console.log('%c🤖 Riksan AI Supreme v5.0', 'color:#7c6aff;font-weight:bold;font-size:16px');
    console.log('%cAll systems online. Multi-modal AI ready.', 'color:#00e5a0;font-size:12px');
});
