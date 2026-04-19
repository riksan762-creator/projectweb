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

// --- FUNGSI PARSER KODE (Biar Pintar Coding) ---
function formatResponse(text) {
    // Deteksi blok kode ``` ... ```
    return text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<div class="bg-[#1e1e1e] rounded-lg my-4 overflow-hidden border border-white/10">
            <div class="flex justify-between items-center px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400">
                <span>${lang || 'code'}</span>
                <button onclick="navigator.clipboard.writeText(\`${code.trim().replace(/`/g, '\\`')}\`)" class="hover:text-white">Copy</button>
            </div>
            <pre class="p-4 overflow-x-auto text-sm text-green-400 font-mono"><code>${code.trim()}</code></pre>
        </div>`;
    })
    .replace(/\n/g, '<br>'); // Handle baris baru
}

// --- LOGIKA PESAN KE LAYAR ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 animate-in fade-in duration-300 ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    let html = "";
    if (role === 'user') {
        html = `<div class="bg-[#5436da] text-white p-3 rounded-2xl rounded-tr-none max-w-[85%] text-[15px] shadow-lg">`;
        if (imageUrl) html += `<img src="${imageUrl}" class="w-64 rounded-lg mb-2 border border-white/20 shadow-md">`;
        html += `<span>${text}</span></div>`;
    } else {
        html = `
            <div class="flex gap-4 max-w-[90%]">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10a37f] to-[#0d8a6a] flex-shrink-0 flex items-center justify-center border border-white/5 shadow-md">
                    <i class="fas fa-robot text-[12px] text-white"></i>
                </div>
                <div class="bg-[#2f2f2f] text-[#ececec] p-4 rounded-2xl rounded-tl-none text-[15px] leading-relaxed shadow-md">
                    ${formatResponse(text)}
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// --- FITUR GAMBAR/KAMERA ---
cameraBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
            alert("Kegedean Bos! Maksimal 4MB biar kenceng.");
            return;
        }
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
    fileInput.value = "";
    imagePreview.classList.add('hidden');
});

// --- KIRIM DATA KE API (FIXED BUG) ---
async function handleChat(e) {
    if (e) e.preventDefault();
    
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    
    // UI Update
    appendMessage('user', text || "Menganalisis file ini...", imgToSend);
    
    // Reset State
    userInput.value = '';
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;
    fileInput.value = "";

    // Loading Animation
    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex items-center gap-2 text-slate-500 text-xs ml-12 mb-8 italic';
    loader.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Riksan AI sedang berpikir...`;
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

        // Ambil respon dari format mana saja (Flexible)
        const aiResponse = data.reply || (data.candidates && data.candidates[0].content.parts[0].text);

        if (aiResponse) {
            appendMessage('ai', aiResponse);
            
            // TTS (Speech) - Hanya baca teks, jangan baca kode
            const cleanText = aiResponse.replace(/```[\s\S]*?```/g, " [kode script] ");
            if (cleanText.length < 500) {
                const speak = new SpeechSynthesisUtterance(cleanText);
                speak.lang = 'id-ID';
                window.speechSynthesis.speak(speak);
            }
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Waduh Bos, sepertinya server lagi sibuk. Coba kirim ulang ya!');
        console.error(err);
    }
}

// Pasang event submit
chatForm.addEventListener('submit', handleChat);

// Fitur Mic tetap sama
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.lang = 'id-ID';
    micBtn.addEventListener('click', () => {
        rec.start();
        micBtn.classList.add('animate-pulse', 'text-red-500');
    });
    rec.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        micBtn.classList.remove('animate-pulse', 'text-red-500');
    };
    rec.onerror = () => micBtn.classList.remove('animate-pulse', 'text-red-500');
}
