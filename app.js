const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');

let currentImageBase64 = null;

// --- KONFIGURASI MARKED (Biar Coding & Logika Rapi) ---
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

// --- FUNGSI TAMPIL PESAN (PRO LOOK) ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 ${role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`;
    
    let html = "";
    if (role === 'user') {
        html = `
            <div class="bg-[#5436da] text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-xl border border-white/10">
                ${imageUrl ? `<img src="${imageUrl}" class="w-64 h-auto rounded-xl mb-3 border border-white/20 shadow-md">` : ''}
                <div class="text-[16px] leading-relaxed">${text}</div>
            </div>`;
    } else {
        html = `
            <div class="flex gap-4 max-w-[95%] w-full">
                <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-[#10a37f] to-[#0d8a6a] flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10">
                    <i class="fas fa-bolt text-[14px] text-white"></i>
                </div>
                <div class="bg-[#2f2f2f] text-[#ececec] p-5 rounded-2xl rounded-tl-none shadow-xl border border-white/5 w-full overflow-hidden">
                    <div class="prose prose-invert max-w-none text-[15px] leading-7">
                        ${marked.parse(text)}
                    </div>
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });

    // Aktifkan Highlight.js buat blok kode yang baru muncul
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

// --- LOGIKA KIRIM DATA (STABIL & SMART) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    appendMessage('user', text || "Coba analisis ini secara teknis, Bos.", imgToSend);
    
    // Reset Tanpa Nge-zoom/Gerak
    userInput.value = '';
    userInput.rows = 1;
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;
    fileInput.value = "";

    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex items-center gap-3 text-slate-500 text-xs ml-14 mb-8 font-mono';
    loader.innerHTML = `<div class="w-2 h-2 bg-[#10a37f] rounded-full animate-ping"></div> Menganalisis Logika & Gambar...`;
    chatArea.appendChild(loader);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text, 
                imageBase64: imgToSend // Sinkron dengan api/ai.js Bos
            })
        });
        
        const data = await res.json();
        document.getElementById(loaderId).remove();

        // Ambil respon AI (Flexibel formatnya)
        const aiResponse = data.reply || (data.candidates && data.candidates[0].content.parts[0].text);

        if (aiResponse) {
            appendMessage('ai', aiResponse);
            
            // TTS (Speech) - Hanya baca teks penjelas, jangan baca kodingannya
            const speechText = aiResponse.replace(/```[\s\S]*?```/g, " [kode terlampir] ");
            if (speechText.length < 400) {
                const speak = new SpeechSynthesisUtterance(speechText);
                speak.lang = 'id-ID';
                window.speechSynthesis.speak(speak);
            }
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Aduh Bos, sistem Vision/Logic lagi overload. Cek kuota API atau redeploy!');
    }
});

// --- HANDLING GAMBAR ---
cameraBtn.addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            previewImg.src = currentImageBase64;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});
removeImg.addEventListener('click', () => {
    currentImageBase64 = null;
    imagePreview.classList.add('hidden');
});

// Auto-resize Textarea (Biar Stabil)
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});
