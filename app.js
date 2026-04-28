/**
 * Riksan AI - Core v3.3 (Ultimate Sync Edition)
 * Author: Riksan (CTO SawargiPay)
 * Features: Modular Brain, Web Search Sync, Vision Pro & Auto-Stabilizer
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

// --- PRE-SYNC: CONFIG MARKED (Support High-Tech Render) ---
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

// --- UI DISPATCHER (PREMIUM LOOK) ---
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
                        <span class="text-[8px] uppercase tracking-[0.3em] font-bold italic">Riksan Intelligence System</span>
                        <span class="text-[8px] font-mono tracking-tighter">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    document.querySelectorAll('pre code').forEach((block) => { hljs.highlightElement(block); });
}

// --- CORE DISPATCHER (SINKRONISASI API) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    appendMessage('user', text || "Tolong analisis data ini secara profesional.", imgToSend);
    
    // UI Reset & Stabilize
    userInput.value = '';
    userInput.style.height = '48px'; 
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;
    fileInput.value = "";

    // Loader Intelligence
    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex items-center gap-3 text-slate-500 text-[10px] ml-12 mb-8 font-mono tracking-widest uppercase italic';
    loader.innerHTML = `
        <div class="w-2 h-2 bg-[#10a37f] rounded-full animate-ping"></div>
        <span>Syncing with Riksan Core...</span>`;
    chatArea.appendChild(loader);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text, // Backend akan handle system context
                imageBase64: imgToSend 
            })
        });
        
        const data = await res.json();
        document.getElementById(loaderId).remove();

        if (data.success && data.reply) {
            appendMessage('ai', data.reply);
        } else {
            throw new Error(data.reply || "Gagal sinkron.");
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Duh Bos, saraf pusat (Server) lagi overload. Cek logs Vercel atau API Key!');
    }
});

// --- HARD-STABILIZER (ANTI-ZOOM & LAYOUT FIX) ---
userInput.style.fontSize = '16px'; // Prevent iOS auto-zoom
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        // Menjaga chat tetap di posisi terbawah saat keyboard HP muncul
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
    });
}

// Smart Auto-Resize Textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    const scrollHeight = this.scrollHeight;
    this.style.height = (scrollHeight > 160 ? 160 : scrollHeight) + 'px';
    this.style.overflowY = scrollHeight > 160 ? 'auto' : 'hidden';
});

// --- MULTIMEDIA SYNC (VISION READY) ---
cameraBtn.addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
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

// Prevent Double-Tap Zoom on Mobile
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// Focus on Load
window.onload = () => userInput.focus();
