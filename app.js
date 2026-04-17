const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const micBtn = document.getElementById('micBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Fitur Kamera & Upload
cameraBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
});

removeImg.addEventListener('click', () => {
    fileInput.value = "";
    imagePreview.classList.add('hidden');
});

// Fitur Suara (Speech to Text)
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
        userInput.dispatchEvent(new Event('input')); // trigger resize
    };
    rec.onerror = () => micBtn.classList.remove('mic-active');
}

// Tambah Pesan ke UI
function appendMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 message-in ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    if (role === 'user') {
        wrapper.innerHTML = `<div class="user-bubble max-w-[85%] text-[15px]">${text}</div>`;
    } else {
        wrapper.innerHTML = `
            <div class="flex gap-4 max-w-full">
                <div class="w-8 h-8 rounded-full bg-[#2f2f2f] flex-shrink-0 flex items-center justify-center border border-white/5">
                    <i class="fas fa-robot text-[12px] text-slate-400"></i>
                </div>
                <div class="ai-bubble text-[15px] leading-relaxed">${text}</div>
            </div>`;
    }
    
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// Kirim ke API
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';
    imagePreview.classList.add('hidden');

    // Loading State
    const loading = document.createElement('div');
    loading.className = 'text-slate-500 text-xs animate-pulse ml-12 mb-8';
    loading.innerText = 'Riksan AI sedang berpikir...';
    chatArea.appendChild(loading);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        const data = await res.json();
        loading.remove();

        if (data.candidates) {
            const aiText = data.candidates[0].content.parts[0].text;
            appendMessage('ai', aiText);
            
            // Suara Balasan (Text to Speech)
            const speech = new SpeechSynthesisUtterance(aiText);
            speech.lang = 'id-ID';
            window.speechSynthesis.speak(speech);
        }
    } catch (err) {
        loading.remove();
        appendMessage('ai', 'Error: Gagal terhubung ke server.');
    }
});
