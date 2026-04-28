/**
 * Riksan AI - Core v3.3 (Global Intelligence)
 * Developed by: Riksan (CTO SawargiPay)
 * Final Upgrade: April 2026
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

// --- KONFIGURASI MARKED (Biar Analisis Market & Coding Rapi) ---
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

// --- FUNGSI TAMPIL PESAN (PREMIUM TECH UI) ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 ${role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-3 duration-500`;
    
    let html = "";
    if (role === 'user') {
        html = `
            <div class="bg-[#5436da] text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-2xl border border-white/10">
                ${imageUrl ? `<img src="${imageUrl}" class="w-72 h-auto rounded-xl mb-3 border border-white/20 shadow-lg">` : ''}
                <div class="text-[16px] leading-relaxed font-sans">${text}</div>
            </div>`;
    } else {
        html = `
            <div class="flex gap-4 max-w-[95%] w-full">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10 ring-2 ring-white/5">
                    <i class="fas fa-brain text-[16px] text-white"></i>
                </div>
                <div class="bg-[#2f2f2f] text-[#ececec] p-6 rounded-2xl rounded-tl-none shadow-2xl border border-white/5 w-full overflow-hidden">
                    <div class="prose prose-invert max-w-none text-[15px] leading-7 font-sans">
                        ${marked.parse(text)}
                    </div>
                    <div class="mt-4 pt-3 border-t border-white/5 flex justify-between items-center opacity-60">
                        <span class="text-[9px] uppercase tracking-widest font-bold">Riksan Intelligence System v3.3</span>
                        <span class="text-[9px] px-2 py-1 rounded bg-[#1e1e1e] border border-white/5">Real-time Analysis: ${new Date().getFullYear()}</span>
                    </div>
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });

    document.querySelectorAll('pre code').forEach((block) => { hljs.highlightElement(block); });
}

// --- LOGIKA KIRIM DATA (ULTRA SMART CORE) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    appendMessage('user', text || "Analisis secara mendalam, Bos.", imgToSend);
    
    // Reset Input & Stabilize
    userInput.value = '';
    userInput.style.height = '48px'; 
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;

    // Get Current Context (Biar AI tau Zaman Sekarang)
    const timeContext = `Waktu Sekarang: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Jam: ${new Date().toLocaleTimeString()}.`;

    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex items-center gap-3 text-slate-500 text-[11px] ml-14 mb-8 italic tracking-widest font-mono';
    loader.innerHTML = `<div class="w-1.5 h-1.5 bg-[#10a37f] rounded-full animate-ping"></div> R-AI ANALYZING MARKET & DATA...`;
    chatArea.appendChild(loader);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: `${timeContext}\nUser Request: ${text}`, // Kirim Waktu & Pesan
                imageBase64: imgToSend 
            })
        });
        
        const data = await res.json();
        document.getElementById(loaderId).remove();

        let aiResponse = data.reply || (data.candidates && data.candidates[0].content.parts[0].text);

        if (aiResponse) {
            // Self-Recognition Branding
            if (!aiResponse.toLowerCase().includes("riksan")) {
                aiResponse += "\n\n--- \n*Analisis ini disediakan oleh Riksan AI (Global Edition).*";
            }
            
            appendMessage('ai', aiResponse);
            
            // TTS Cerdas
            const speechText = aiResponse.replace(/```[\s\S]*?```/g, " [data teknis terlampir] ");
            if (speechText.length < 400) {
                const speak = new SpeechSynthesisUtterance(speechText);
                speak.lang = 'id-ID';
                window.speechSynthesis.speak(speak);
            }
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Koneksi Global terganggu, Bos. Pastikan sistem Riksan dideploy dengan benar!');
    }
});

// --- ANTI-ZOOM & STABILIZER ---
userInput.style.fontSize = '16px'; 
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
    });
}

// Auto-resize Textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    const newHeight = Math.min(this.scrollHeight, 160);
    this.style.height = newHeight + 'px';
    this.style.overflowY = this.scrollHeight > 160 ? 'auto' : 'hidden';
});

// Multimedia Handling
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
removeImg.addEventListener('click', (e) => { e.preventDefault(); currentImageBase64 = null; imagePreview.classList.add('hidden'); });

// Anti Double-Tap Zoom
document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
