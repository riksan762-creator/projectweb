const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const micBtn = document.getElementById('micBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const removeImg = document.getElementById('removeImg');

let currentImageBase64 = null; // Menyimpan data gambar sementara

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// --- FITUR KAMERA & UPLOAD GAMBAR ---
cameraBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        // Cek ukuran file (jangan terlalu besar, misal max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("File terlalu besar, Bos! Maksimal 2MB ya.");
            this.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageBase64 = e.target.result; // Simpan Base64
            previewImg.src = currentImageBase64;
            imagePreview.classList.remove('hidden'); // Tampilkan preview
        }
        reader.readAsDataURL(file);
    }
});

removeImg.addEventListener('click', () => {
    fileInput.value = "";
    currentImageBase64 = null;
    imagePreview.classList.add('hidden');
});

// --- FITUR SUARA (SPEECH TO TEXT) ---
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

// --- FUNGSI TAMPIL PESAN DI LAYAR ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 message-in ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    let contentHtml = "";
    if (role === 'user') {
        contentHtml = `<div class="user-bubble max-w-[85%] text-[15px]">`;
        if (imageUrl) {
            contentHtml += `<img src="${imageUrl}" class="w-40 h-40 object-cover rounded-lg mb-2 border border-white/10">`;
        }
        contentHtml += `${text}</div>`;
    } else {
        contentHtml += `
            <div class="flex gap-4 max-w-full">
                <div class="w-8 h-8 rounded-full bg-[#2f2f2f] flex-shrink-0 flex items-center justify-center border border-white/5 shadow-lg">
                    <i class="fas fa-robot text-[12px] text-slate-400"></i>
                </div>
                <div class="ai-bubble text-[15px] leading-relaxed text-[#ececec]">${text}</div>
            </div>`;
    }
    
    wrapper.innerHTML = contentHtml;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// --- FUNGSI KIRIM PESAN (SUBMIT) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    // Kirim jika ada teks ATAU ada gambar
    if (!text && !currentImageBase64) return;

    // Tampilkan pesan user (termasuk gambar jika ada)
    appendMessage('user', text || "(Mengirim gambar)", currentImageBase64);
    
    // Reset input
    const imageToSend = currentImageBase64; // Simpan untuk dikirim
    userInput.value = '';
    userInput.style.height = 'auto';
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;
    fileInput.value = "";

    // Indikator Loading
    const loadingId = 'loader-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'text-slate-500 text-xs animate-pulse ml-12 mb-8';
    loadingDiv.innerText = 'Riksan AI sedang menganalisis...';
    chatArea.appendChild(loadingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
        console.log("Mengirim data ke API...");

        // Kirim data sebagai JSON (Teks + Gambar Base64)
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text || "Apa yang ada di gambar ini?", // Default teks jika kosong
                imageBase64: imageToSend 
            })
        });
        
        const data = await res.json();
        
        // Hapus loading
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiText = data.candidates[0].content.parts[0].text;
            appendMessage('ai', aiText);
            
            // Suara Balasan (Text to Speech - Opsional)
            // window.speechSynthesis.cancel(); // Matikan suara sebelumnya
            // const speech = new SpeechSynthesisUtterance(aiText);
            // speech.lang = 'id-ID';
            // window.speechSynthesis.speak(speech);
        } else {
            appendMessage('ai', 'Maaf bos, respon AI kosong. Cek API Key di Vercel.');
        }
    } catch (err) {
        console.error("Error Detail:", err);
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        appendMessage('ai', 'Error: Gagal terhubung ke server. Pastikan re-deploy di Vercel.');
    }
});
