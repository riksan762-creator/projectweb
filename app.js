const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatArea = document.getElementById('chatArea');
const micBtn = document.getElementById('micBtn'); // Pastikan ID di HTML: micBtn

// 1. Fungsi Tampilkan Chat
function appendMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full mb-4 ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    wrapper.innerHTML = `
        <div class="${role === 'user' ? 'bg-blue-600' : 'bg-gray-800'} text-white p-3 rounded-2xl max-w-[85%] shadow-md">
            <p class="text-sm">${text}</p>
        </div>`;
    chatArea.appendChild(wrapper);
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// 2. Fitur Mic (Ngomong -> Teks -> Kirim)
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
    const rec = new Recognition();
    rec.lang = 'id-ID';
    
    micBtn.addEventListener('click', () => {
        rec.start();
        micBtn.classList.add('bg-red-500', 'animate-pulse');
    });

    rec.onresult = (e) => {
        const hasilSuara = e.results[0][0].transcript;
        userInput.value = hasilSuara;
        micBtn.classList.remove('bg-red-500', 'animate-pulse');
        
        // OTOMATIS KIRIM
        chatForm.dispatchEvent(new Event('submit'));
    };
    
    rec.onerror = () => micBtn.classList.remove('bg-red-500', 'animate-pulse');
}

// 3. Submit Chat (Tanpa Fitur Suara Keluar)
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = userInput.value.trim();
    if (!msg) return;

    appendMessage('user', msg);
    userInput.value = '';

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        if (data.candidates) {
            // Cukup tampilkan teks, tidak ada perintah .speak()
            appendMessage('ai', data.candidates[0].content.parts[0].text);
        }
    } catch (err) {
        appendMessage('ai', 'Error koneksi ke Groq API, Bos.');
    }
});
