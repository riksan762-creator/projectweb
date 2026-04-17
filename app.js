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

// --- EFEK KETIK (TYPING EFFECT) ---
function typeWriter(element, text, speed = 10) {
    let i = 0;
    element.innerHTML = "";
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            chatArea.scrollTo({ top: chatArea.scrollHeight });
            setTimeout(type, speed);
        }
    }
    type();
}

// --- RENDER PESAN ---
function appendMessage(role, text, imageUrl = null, isNewAI = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 message-in ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    let html = "";
    if (role === 'user') {
        html = `<div class="user-bubble max-w-[85%] text-[15px] shadow-sm">`;
        if (imageUrl) html += `<img src="${imageUrl}" class="w-48 h-48 object-cover rounded-xl mb-3 border border-white/10 shadow-lg">`;
        html += `${text}</div>`;
        wrapper.innerHTML = html;
    } else {
        const uniqueId = 'ai-' + Date.now();
        html = `
            <div class="flex gap-4 max-w-[90%]">
                <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1e1e1e] to-[#2f2f2f] flex-shrink-0 flex items-center justify-center border border-white/10 shadow-md">
                    <i class="fas fa-bolt text-[14px] text-yellow-500"></i>
                </div>
                <div id="${uniqueId}" class="ai-bubble text-[15px] leading-relaxed text-[#ececec] pt-1"></div>
            </div>`;
        wrapper.innerHTML = html;
        chatArea.appendChild(wrapper);
        
        const aiContainer = document.getElementById(uniqueId);
        if (isNewAI) {
            typeWriter(aiContainer, text);
        } else {
            aiContainer.innerText = text;
        }
        return; // Keluar karena sudah append di dalam
    }
    
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// --- LOGIKA GAMBAR ---
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
        userInput.placeholder = "Mendengarkan Bos...";
    });
    rec.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        micBtn.classList.remove('mic-active');
        userInput.placeholder = "Tanya Riksan AI...";
        chatForm.dispatchEvent(new Event('submit'));
    };
    rec.onerror = () => {
        micBtn.classList.remove('mic-active');
        userInput.placeholder = "Tanya Riksan AI...";
    };
}

// --- SUBMIT KE GROQ ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    appendMessage('user', text || "Analisis data...", currentImageBase64);
    
    const imgToSend = currentImageBase64;
    userInput.value = '';
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;

    // Loading State yang lebih keren
    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex gap-2 items-center text-slate-500 text-xs ml-14 mb-8';
    loader.innerHTML = `<div class="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce"></div> Riksan AI sedang memproses...`;
    chatArea.appendChild(loader);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }) // Groq Free biasanya belum support image via API fetch biasa tanpa library
        });
        
        const data = await res.json();
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();

        if (data.reply) {
            appendMessage('ai', data.reply, null, true); // true untuk efek mengetik
        } else {
            appendMessage('ai', 'Maaf Bos, Groq lagi sibuk. Coba lagi bentar!');
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Koneksi error, pastikan API Key Groq sudah benar di Vercel.');
    }
});
