const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const micBtn = document.getElementById('micBtn');

// Fungsi untuk nambahin chat ke layar
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

// Fungsi kirim pesan
async function handleSubmit(e) {
    if (e) e.preventDefault();
    
    const message = userInput.value.trim();
    if (!message) return;

    // Tampilkan pesan user
    appendMessage('user', message);
    userInput.value = '';

    // Indikator Loading
    const loadingId = 'loader-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'flex justify-start mb-6';
    loadingDiv.innerHTML = `<div class="ai-bubble p-4 rounded-2xl text-xs text-slate-500 italic">Riksan AI sedang mengetik...</div>`;
    chatArea.appendChild(loadingDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    try {
        console.log("Mengirim pesan ke API:", message);

        // Kita kirim pakai format JSON (lebih modern dan stabil)
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message }) // Kirim pesan sebagai JSON
        });

        const data = await response.json();
        console.log("Respon dari API:", data);

        // Hapus loading
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            appendMessage('ai', data.candidates[0].content.parts[0].text);
        } else {
            appendMessage('ai', "Waduh, respon AI kosong euy. Cek API Key!");
        }
    } catch (error) {
        console.error("Error Detail:", error);
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        appendMessage('ai', "Gagal terhubung ke server. Coba cek koneksi atau re-deploy di Vercel.");
    }
}

// Pasang Event Listener
chatForm.addEventListener('submit', handleSubmit);

// Fitur Mic (Opsional, tapi biar keren tetap saya pasang)
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
        handleSubmit();
    };
    recognition.onerror = () => micBtn.classList.remove('mic-active');
}
