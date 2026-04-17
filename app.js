const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const micBtn = document.getElementById('micBtn');

// --- FUNGSI UTAMA KIRIM PESAN ---
async function sendMessage(e) {
    if (e) e.preventDefault();
    
    const message = userInput.value.trim();
    if (!message) return;

    // Tampilkan pesan user di layar
    appendMessage('user', message);
    userInput.value = '';

    // Buat element loading
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'flex justify-start mb-6 message-in';
    loadingDiv.innerHTML = `<div class="ai-bubble p-4 rounded-2xl text-xs text-slate-500 italic"><i class="fas fa-circle-notch animate-spin mr-2"></i>Riksan AI sedang memproses...</div>`;
    chatArea.appendChild(loadingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ message: message })
        });

        const data = await response.json();
        
        // Hapus loading
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            appendMessage('ai', data.candidates[0].content.parts[0].text);
        } else {
            appendMessage('ai', "Waduh, servernya lagi sibuk euy. Coba lagi ya!");
        }
    } catch (error) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        appendMessage('ai', "Koneksi terputus. Coba cek internet kamu, Bos.");
        console.error("Error:", error);
    }
}

// --- FUNGSI TAMPIL PESAN ---
function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} message-in mb-6`;
    
    const bubbleClass = role === 'user' ? 'user-bubble rounded-tr-none' : 'ai-bubble rounded-tl-none';
    
    msgDiv.innerHTML = `
        <div class="${bubbleClass} max-w-[85%] p-4 rounded-2xl border border-white/5">
            <p class="text-sm md:text-base leading-relaxed text-white">${text}</p>
        </div>
    `;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Event Listeners
chatForm.addEventListener('submit', sendMessage);

// --- FITUR VOICE (SPEECH TO TEXT) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.classList.add('mic-active');
    });
    recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
        micBtn.classList.remove('mic-active');
        sendMessage(); // Langsung kirim setelah bicara
    };
    recognition.onerror = () => micBtn.classList.remove('mic-active');
}
