/**
 * Riksan AI - Core v5.0 (Visual Command Center)
 * Author: Riksan (CTO SawargiPay)
 */

// ... (Inisialisasi variabel tetap sama seperti sebelumnya) ...

function appendMessage(role, text, imageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-10 ${role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-6 duration-700`;
    
    let html = "";
    if (role === 'user') {
        // Tampilan Chat User (Blue Premium)
        html = `
            <div class="flex flex-col items-end max-w-[85%]">
                <div class="bg-gradient-to-br from-[#5436da] to-[#4c31c4] text-white p-5 rounded-2xl rounded-tr-none shadow-2xl border border-white/10 ring-1 ring-white/5">
                    ${imageUrl ? `<div class="mb-4 overflow-hidden rounded-xl border border-white/20 shadow-inner">
                        <img src="${imageUrl}" class="w-full max-h-80 object-cover hover:scale-105 transition-transform duration-500">
                    </div>` : ''}
                    <div class="text-[16px] leading-relaxed font-medium">${text || "Tolong deteksi gambar ini, Bos!"}</div>
                </div>
                <span class="text-[9px] text-slate-500 mt-2 font-mono uppercase tracking-widest">Sent to Core</span>
            </div>`;
    } else {
        // Tampilan Chat AI (Dark Enterprise)
        const uniqueId = 'ai-' + Date.now();
        html = `
            <div class="flex gap-4 max-w-[95%] w-full group">
                <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#10a37f] to-[#0d8a6a] flex-shrink-0 flex items-center justify-center shadow-xl border border-white/10 group-hover:rotate-12 transition-all duration-500">
                    <i class="fas fa-brain text-[18px] text-white"></i>
                </div>
                <div class="bg-[#1a1a1a] text-[#ececec] p-7 rounded-2xl rounded-tl-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/5 w-full max-w-4xl backdrop-blur-md">
                    <div id="${uniqueId}" class="prose prose-invert prose-emerald max-w-none text-[15px] leading-8 font-sans antialiased">
                        ${marked.parse(text)}
                    </div>
                    
                    <div class="mt-6 pt-5 border-t border-white/5 flex flex-wrap justify-between items-center gap-4">
                        <div class="flex items-center gap-3">
                            <div class="flex gap-1">
                                <span class="w-1.5 h-1.5 bg-[#10a37f] rounded-full animate-pulse"></span>
                                <span class="w-1.5 h-1.5 bg-[#10a37f] rounded-full animate-pulse [animation-delay:0.2s]"></span>
                            </div>
                            <span class="text-[10px] uppercase tracking-[0.4em] font-black text-[#10a37f] italic">Supreme Core v5.0</span>
                        </div>
                        <div class="flex gap-4">
                            <button onclick="window.print()" class="text-[10px] text-slate-500 hover:text-white transition-colors"><i class="fas fa-print mr-1"></i> SAVE PDF</button>
                            <span class="text-[10px] font-mono text-slate-600 tracking-tighter">${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// --- CORE HANDLER: SINKRONISASI VISION & GENERATION ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text && !currentImageBase64) return;

    const imgToSend = currentImageBase64;
    appendMessage('user', text, imgToSend);
    
    // Reset UI
    userInput.value = '';
    userInput.style.height = '50px';
    imagePreview.classList.add('hidden');
    currentImageBase64 = null;
    fileInput.value = "";

    // Neural Loader
    const loader = document.createElement('div');
    loader.className = 'flex items-center gap-4 ml-16 mb-10 text-slate-400';
    loader.innerHTML = `
        <div class="relative w-5 h-5">
            <div class="absolute inset-0 border-2 border-[#10a37f]/20 rounded-full"></div>
            <div class="absolute inset-0 border-2 border-[#10a37f] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <span class="text-[10px] tracking-[0.3em] uppercase font-bold text-[#10a37f] animate-pulse">Neural Syncing...</span>`;
    chatArea.appendChild(loader);

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text, 
                imageBase64: imgToSend // Mengirim gambar untuk dideteksi Vision
            })
        });
        
        const result = await response.json();
        loader.remove();

        if (result.success) {
            // Menampilkan jawaban teks (bisa berisi deteksi gambar atau link gambar AI)
            appendMessage('ai', result.reply);
        } else {
            throw new Error(result.reply);
        }
    } catch (err) {
        if (loader) loader.remove();
        appendMessage('ai', '### ⚠️ SYSTEM FAILURE\nBos, sepertinya API Key atau koneksi Vercel lagi bermasalah. Cek dashboard sekarang!');
    }
});

// --- CAMERA & FILE SYNC ---
cameraBtn.addEventListener('click', (e) => { 
    e.preventDefault(); 
    fileInput.click(); 
});

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) { // Limit 4MB
            alert("Bos, file kegedean! Maksimal 4MB biar ga lambat.");
            return;
        }
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

removeImg.addEventListener('click', () => {
    currentImageBase64 = null;
    imagePreview.classList.add('hidden');
    fileInput.value = "";
});

// Keyboard Layout Fix (Mobile)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'auto' });
    });
}
