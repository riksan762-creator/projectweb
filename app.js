/**
 * Riksan AI - Core v3.3 (Modular Intelligence)
 * Author: Riksan (CTO SawargiPay)
 * Update: April 2026 - Global Context & Advanced Trading/Coding
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

// --- DYNAMIC MARKED CONFIG ---
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

// --- SMART MESSAGE DISPATCHER ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 ${role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`;
    
    let html = "";
    if (role === 'user') {
        html = `
            <div class="bg-[#5436da] text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-xl border border-white/5">
                ${imageUrl ? `<img src="${imageUrl}" class="w-72 h-auto rounded-xl mb-3 border border-white/20 shadow-md">` : ''}
                <div class="text-[16px] leading-relaxed">${text}</div>
            </div>`;
    } else {
        html = `
            <div class="flex gap-4 max-w-[95%] w-full">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10 ring-2 ring-white/5">
                    <i class="fas fa-microchip text-[16px] text-white"></i>
                </div>
                <div class="bg-[#2f2f2f] text-[#ececec] p-6 rounded-2xl rounded-tl-none shadow-2xl border border-white/5 w-full overflow-hidden">
                    <div class="prose prose-invert max-w-none text-[15px] leading-7 font-sans">
                        ${marked.parse(text)}
                    </div>
                    <div class="mt-4 pt-3 border-t border-white/5 flex justify-between items-center opacity-50">
                        <span class="text-[9px] uppercase tracking-[0.2em] font-black italic">Riksan Core Engine v3.3</span>
                        <span class="text-[9px] font-mono">${new Date().toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    document.querySelectorAll('pre code').forEach((block) => { hljs.highlightElement(block); });
}

// --- CORE LOGIC (SMART CONTEXT) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    appendMessage('user', text || "Analisis secara teknis.", imgToSend);
    
    userInput.value = '';
    userInput.style.height = '48px'; 
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;

    // --- SMART CONTEXT INJECTION ---
    // AI diberitahu waktu sekarang & instruksi modularitas agar otak tidak campur aduk
    const now = new Date();
    const contextHeader = `[SYSTEM_CONTEXT: TANGGAL ${now.toLocaleDateString()} | JAM ${now.toLocaleTimeString()}]
[INSTRUCTION: Jawab secara spesifik sesuai domain pertanyaan (Trading/Coding/Bisnis). JANGAN campur aduk gaya bahasa.]`;

    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex items-center gap-3 text-slate-500 text-[10px] ml-14 mb-8 font-mono tracking-widest uppercase';
    loader.innerHTML = `<span class="animate-pulse">Processing Request...</span>`;
    chatArea.appendChild(loader);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: `${contextHeader}\n\nUSER_QUERY: ${text}`,
                imageBase64: imgToSend 
            })
        });
        
        const data = await res.json();
        document.getElementById(loaderId).remove();

        let aiResponse = data.reply || (data.candidates && data.candidates[0].content.parts[0].text);

        if (aiResponse) {
            // Self-branding if missing
            if (!aiResponse.toLowerCase().includes("riksan")) {
                aiResponse += "\n\n---\n*Verified Intelligence by Riksan Core*";
            }
            appendMessage('ai', aiResponse);
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Error Sistem! Cek koneksi API Bos Riksan.');
    }
});

// --- ANTI-ZOOM & STABILIZER (HARD FIX) ---
userInput.style.fontSize = '16px'; 
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
    });
}

userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    this.style.overflowY = this.scrollHeight > 160 ? 'auto' : 'hidden';
});

// Multimedia
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
removeImg.addEventListener('click', () => { currentImageBase64 = null; imagePreview.classList.add('hidden'); });
document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
