// ... (Deklarasi variabel di atas tetap sama seperti kode Bos) ...

// --- LOGIKA PESAN KE LAYAR (DIPERTARJAM) ---
function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-8 message-in ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    
    // Fungsi untuk memformat kode (Simple Syntax Highlighting)
    const formatContent = (content) => {
        if (content.includes('```')) {
            // Jika ada blok kode, ubah jadi tag <pre>
            return content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<div class="code-container my-2">
                            <div class="code-header flex justify-between px-3 py-1 bg-[#1e1e1e] text-[10px] text-gray-400 rounded-t-md">
                                <span>${lang || 'script'}</span>
                                <span class="cursor-pointer hover:text-white" onclick="copyCode(this)">Copy</span>
                            </div>
                            <pre class="bg-[#0d0d0d] p-4 rounded-b-md overflow-x-auto text-green-400 font-mono text-xs"><code>${code.trim()}</code></pre>
                        </div>`;
            });
        }
        return content.replace(/\n/g, '<br>');
    };

    let html = "";
    if (role === 'user') {
        html = `<div class="user-bubble max-w-[85%] text-[15px] bg-[#5436da] p-3 rounded-2xl rounded-tr-none shadow-lg">`;
        if (imageUrl) html += `<img src="${imageUrl}" class="w-64 h-auto rounded-lg mb-2 border border-white/10 shadow-md">`;
        html += `<span>${text || ""}</span></div>`;
    } else {
        html = `
            <div class="flex gap-4 max-w-[90%]">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10a37f] to-[#0d8a6a] flex-shrink-0 flex items-center justify-center shadow-lg">
                    <i class="fas fa-bolt text-[12px] text-white"></i>
                </div>
                <div class="ai-bubble text-[15px] leading-relaxed text-[#ececec] bg-[#2f2f2f] p-4 rounded-2xl rounded-tl-none shadow-md">
                    ${formatContent(text)}
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// Fitur Copy Code untuk hasil script AI
window.copyCode = (el) => {
    const code = el.parentElement.nextElementSibling.innerText;
    navigator.clipboard.writeText(code);
    el.innerText = "Copied!";
    setTimeout(() => el.innerText = "Copy", 2000);
};

// --- LOGIKA KIRIM DATA (LEBIH PINTAR) ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    // Simpan image & text untuk dikirim
    const imgToSend = currentImageBase64; 
    const promptText = text;

    appendMessage('user', promptText, imgToSend);
    
    // UI Reset
    userInput.value = '';
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;
    fileInput.value = "";

    const loaderId = 'ld-' + Date.now();
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'flex items-center gap-2 text-slate-500 text-xs ml-12 mb-8';
    loader.innerHTML = `<div class="dot-typing"></div> <span>Riksan AI sedang menganalisis...</span>`;
    chatArea.appendChild(loader);

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: promptText || "Jelaskan gambar ini secara detail dan berikan analisis teknisnya.", 
                image: imgToSend, // Kirim Base64 utuh
                isVision: !!imgToSend // Flag buat API tahu kalau ada gambar
            })
        });
        
        const data = await res.json();
        document.getElementById(loaderId).remove();

        // Logika penanganan respons yang lebih fleksibel (Groq atau Gemini)
        const aiResponse = data.reply || data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (aiResponse) {
            appendMessage('ai', aiResponse);
            
            // TTS hanya jika teks tidak terlalu panjang (biar nggak berisik kalau coding)
            if (aiResponse.length < 300) {
                const speak = new SpeechSynthesisUtterance(aiResponse.replace(/```[\s\S]*?```/g, '')); // Hilangkan kode saat bicara
                speak.lang = 'id-ID';
                window.speechSynthesis.speak(speak);
            }
        }
    } catch (err) {
        if(document.getElementById(loaderId)) document.getElementById(loaderId).remove();
        appendMessage('ai', 'Aduh Bos, sistem Vision lagi overheat. Cek koneksi atau limit API Bos.');
    }
});

// ... (Fitur Mic & Camera tetap sama) ...
