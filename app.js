const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const micBtn = document.getElementById('micBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');

let currentImageBase64 = null;

// --- RENDER PESAN ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 message-in ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    let html = "";
    if (role === 'user') {
        html = `<div class="user-bubble max-w-[85%] text-[15px]">`;
        if (imageUrl) html += `<img src="${imageUrl}" class="w-48 h-48 object-cover rounded-lg mb-2 border border-white/10 shadow-lg">`;
        html += `${text}</div>`;
    } else {
        html = `
            <div class="flex gap-4 max-w-full">
                <div class="w-8 h-8 rounded-full bg-[#2f2f2f] flex-shrink-0 flex items-center justify-center border border-white/5 shadow-md">
                    <i class="fas fa-robot text-[12px] text-slate-400"></i>
                </div>
                <div class="ai-bubble text-[15px] leading-relaxed text-[#ececec]">${text}</div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// --- GAMBAR/KAMERA ---
cameraBtn.addEventListener('click', () => fileInput.click());
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

// --- MIC (NGOMONG LANGSUNG KIRIM) ---
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
    const rec = new Recognition();
    rec.lang = 'id-ID';
    micBtn.addEventListener('click', () => {
        rec.start();
        micBtn.classList.add('mic-active');
    });
    rec.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        micBtn.classList.remove('mic-active');
        chatForm.dispatchEvent(new Event('submit')); // AUTO KIRIM
    };
    rec.onerror = () => micBtn.classList.remove('mic-active');
}

// --- SUBMIT ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    appendMessage('user', text || "Analisis gambar...", currentImageBase64);
    
    const imgToSend = currentImageBase64;
    userInput.value = '';
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;

    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'text-slate-500 text-xs animate-pulse ml-12 mb-8';
    loader.innerText = 'Riksan AI sedang berpikir...';
    chatArea.appendChild(loader);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, imageBase64: imgToSend })
        });
        
        const data = await res.json();
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();

        // AMBIL 'reply' SESUAI BACKEND
        if (data.reply) {
            appendMessage('ai', data.reply);
        } else {
            appendMessage('ai', 'Error: Gagal ambil respon, Bos.');
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Koneksi error, coba redeploy Vercel.');
    }
});
