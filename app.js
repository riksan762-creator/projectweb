document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatArea = document.getElementById('chatArea');
    const micBtn = document.getElementById('micBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const fileInput = document.getElementById('fileInput');
    
    let voiceEnabled = true;

    // Fungsi Tambah Pesan ke UI
    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} message-anim mb-6`;
        
        msgDiv.innerHTML = `
            <div class="${role === 'user' ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 text-slate-100'} max-w-[85%] p-4 rounded-[1.5rem] ${role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}">
                <p class="text-sm md:text-base leading-relaxed">${text}</p>
            </div>
        `;
        
        chatArea.appendChild(msgDiv);
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });

        if (role === 'ai' && voiceEnabled) {
            speakText(text);
        }
    }

    // Fungsi Kirim ke API Vercel
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        userInput.value = '';

        const loadingId = 'load-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.className = 'flex justify-start mb-6';
        loadingDiv.innerHTML = `<div class="bg-white/5 p-3 rounded-xl text-[10px] uppercase text-slate-500 italic"><i class="fas fa-circle-notch animate-spin mr-2"></i>Processing...</div>`;
        chatArea.appendChild(loadingDiv);

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ message: text })
            });

            const data = await response.json();
            document.getElementById(loadingId).remove();

            if (data.candidates) {
                appendMessage('ai', data.candidates[0].content.parts[0].text);
            }
        } catch (err) {
            if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            appendMessage('ai', "Gagal menghubungi server.");
        }
    });

    // Fitur Voice to Text (Mikrofon)
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang = 'id-ID';
        
        micBtn.onclick = () => {
            recognition.start();
            micBtn.classList.add('mic-active');
        };

        recognition.onresult = (e) => {
            userInput.value = e.results[0][0].transcript;
            micBtn.classList.remove('mic-active');
            chatForm.dispatchEvent(new Event('submit'));
        };
        
        recognition.onend = () => micBtn.classList.remove('mic-active');
    }

    // Fitur Text to Speech (Suara AI)
    function speakText(text) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'id-ID';
        window.speechSynthesis.speak(msg);
    }

    // Kamera & Input File
    cameraBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => {
        if (fileInput.files.length > 0) {
            appendMessage('ai', `File "${fileInput.files[0].name}" terdeteksi.`);
        }
    };
});
