const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const micBtn = document.getElementById('micBtn'); // Pastikan ada tombol ID micBtn di HTML
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');

let currentImageBase64 = null;

// Fungsi Tampilkan Pesan
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-6 ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    let content = role === 'user' ? 
        `<div class="bg-blue-600 text-white p-3 rounded-2xl max-w-[80%] shadow-lg">
            ${imageUrl ? `<img src="${imageUrl}" class="w-48 rounded-lg mb-2 border border-white/20">` : ''}
            <p class="text-sm">${text}</p>
        </div>` :
        `<div class="flex gap-3 max-w-[85%]">
            <div class="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-bold border border-gray-600">AI</div>
            <div class="bg-gray-800 text-gray-100 p-3 rounded-2xl shadow-md border border-gray-700">
                <p class="text-sm leading-relaxed">${text}</p>
            </div>
        </div>`;
    
    wrapper.innerHTML = content;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// Fitur Suara Ke Teks (Otomatis Kirim)
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
    const rec = new Recognition();
    rec.lang = 'id-ID';
    
    micBtn.addEventListener('click', () => {
        rec.start();
        micBtn.classList.add('bg-red-500', 'animate-pulse');
    });

    rec.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        micBtn.classList.remove('bg-red-500', 'animate-pulse');
        // LANGSUNG KIRIM OTOMATIS
        chatForm.dispatchEvent(new Event('submit'));
    };

    rec.onerror = () => micBtn.classList.remove('bg-red-500', 'animate-pulse');
}

// Kamera & Gambar
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

// Submit Chat
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    appendMessage('user', text || "Menganalisis gambar...", currentImageBase64);
    
    const tempImg = currentImageBase64;
    userInput.value = '';
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, imageBase64: tempImg })
        });
        
        const data = await res.json();
        if (data.candidates) {
            // Tampilkan teks saja (Bisu total)
            appendMessage('ai', data.candidates[0].content.parts[0].text);
        }
    } catch (err) {
        appendMessage('ai', 'Error koneksi, Bos!');
    }
});
