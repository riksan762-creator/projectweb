/**
 * Riksan AI - Core v4.5 (Supreme Sync Edition)
 * Author: Riksan (CTO SawargiPay)
 * Stability, Vision, & Multi-Domain Integration
 */

const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');

let currentImageBase64 = null;

// --- 1. HIGH-TECH RENDERER (LATEX & CODE) ---
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// --- 2. UI MESSAGE DISPATCHER ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 ${role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`;
    
    let html = "";
    if (role === 'user') {
        html = `
            <div class="bg-[#5436da] text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-xl border border-white/10">
                ${imageUrl ? `<img src="${imageUrl}" class="w-full max-w-sm h-auto rounded-xl mb-3 border border-white/20 shadow-md">` : ''}
                <div class="text-[16px] leading-relaxed font-sans">${text}</div>
            </div>`;
    } else {
        html = `
            <div class="flex gap-3 max-w-[95%] w-full">
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10">
                    <i class="fas fa-robot text-[14px] text-white"></i>
                </div>
                <div class="bg-[#2f2f2f] text-[#ececec] p-5 rounded-2xl rounded-tl-none shadow-2xl border border-white/5 w-full overflow-hidden">
                    <div class="prose prose-invert max-w-none text-[15px] leading-7 font-sans">
                        ${marked.parse(text)}
                    </div>
                    <div class="mt-4 pt-3 border-t border-white/5 flex justify-between items-center opacity-40">
                        <span class="text-[8px] uppercase tracking-[0.3em] font-bold italic">Riksan Supreme v4.5</span>
                        <span class="text-[8px] font-mono tracking-tighter">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    
    // Auto-highlight code blocks
    document.querySelectorAll('pre code').forEach((block) => { 
        if (!block.dataset.highlighted) {
            hljs.highlightElement(block);
            block.dataset.highlighted = "yes";
        }
    });
}

// --- 3. CORE LOGIC (INTELLIGENT SINKRONISASI) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    appendMessage('user', text || "Menganalisis permintaan visual...", imgToSend);
    
    // UI Reset
    userInput.value = '';
    userInput.style.height = '48px'; 
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;
    fileInput.value = "";

    // Loader Intelligence (Lebih detail)
    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex flex-col gap-1 ml-12 mb-8 animate-pulse';
    loader.innerHTML = `
        <div class="flex items-center gap-2 text-slate-500 text-[9px] font-mono tracking-widest uppercase">
            <div class="w-1.5 h-1.5 bg-[#10a37f] rounded-full"></div>
            <span>Syncing Brain & Stability AI...</span>
        </div>`;
    chatArea.appendChild(loader);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                imageBase64: imgToSend 
            })
        });
        
        const data = await res.json();
        document.getElementById(loaderId).remove();

        if (data.success && data.reply) {
            appendMessage('ai', data.reply);
        } else {
            throw new Error(data.reply || "Gagal sinkronisasi data.");
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', `**[SYSTEM ERROR]**\nDuh Bos, saraf pusat overload! \n- Cek logs Vercel\n- Pastikan API Key (Groq, Serper, Stability) aktif.\n- Error: ${err.message}`);
    }
});

// --- 4. HARD-STABILIZER (UX OPTIMIZATION) ---
// Auto-resize textarea yang lebih smooth
userInput.addEventListener('input', function() {
    this.style.height = '48px';
    const newHeight = Math.min(this.scrollHeight, 160);
    this.style.height = newHeight + 'px';
    this.style.overflowY = this.scrollHeight > 160 ? 'auto' : 'hidden';
});

// Multimedia Handler (Vision & Camera)
cameraBtn.addEventListener('click', (e) => { 
    e.preventDefault(); 
    fileInput.click(); 
});

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        // Cek ukuran file (max 4MB biar ga lambat)
        if (file.size > 4 * 1024 * 1024) {
            alert("Bos, ukuran file kegedean. Maksimal 4MB ya!");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            previewImg.src = currentImageBase64;
            imagePreview.classList.remove('hidden');
            chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
        };
        reader.readAsDataURL(file);
    }
});

removeImg.addEventListener('click', (e) => {
    e.preventDefault();
    currentImageBase64 = null;
    imagePreview.classList.add('hidden');
    fileInput.value = "";
});

// Keyboard & Viewport Fix for Mobile
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
    });
}

// Anti-Zoom & Double-Tap Fix
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

window.onload = () => userInput.focus();
