const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const micBtn = document.getElementById('micBtn');
const cameraBtn = document.getElementById('cameraBtn');
const fileInput = document.getElementById('fileInput');

let isVoiceOutputEnabled = true;

// --- FITUR SUARA (SPEECH TO TEXT) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';

    micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.classList.add('mic-active');
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        micBtn.classList.remove('mic-active');
    };

    recognition.onerror = () => micBtn.classList.remove('mic-active');
}

// --- FITUR SUARA (TEXT TO SPEECH) ---
function speak(text) {
    if (!isVoiceOutputEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

// --- FITUR KAMERA ---
cameraBtn.addEventListener('click', () => {
    fileInput.click(); // Cara termudah untuk semua perangkat: upload/kamera
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        alert('Foto "' + file.name + '" terpilih. Groq akan memproses teksnya.');
    }
});

// --- CHAT LOGIC ---
function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} message-in mb-6`;
    
    msgDiv.innerHTML = `
        <div class="${role === 'user' ? 'user-bubble rounded-tr-none' : 'ai-bubble rounded-tl-none'} max-w-[85%] p-4 rounded-2xl border-white/5">
            <p class="text-sm leading-relaxed">${text}</p>
        </div>
    `;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    
    if (role === 'ai') speak(text);
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = userInput.value.trim();
    if (!msg) return;

    appendMessage('user', msg);
    userInput.value = '';

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ message: msg })
        });
        const data = await res.json();
        
        if (data.candidates) {
            appendMessage('ai', data.candidates[0].content.parts[0].text);
        }
    } catch (err) {
        appendMessage('ai', 'Error koneksi, Bos.');
    }
});
