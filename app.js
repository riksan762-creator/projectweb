let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksen_local_db')) || {};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderHistory();
    const ids = Object.keys(chatHistory);
    if (ids.length > 0) {
        // Load chat terakhir
        loadChat(ids.sort().pop());
    } else {
        showWelcome();
    }
}

function showWelcome() {
    document.getElementById('chat-box').innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-center; gap: 10px;">
            <h1 style="font-size: 40px; font-weight: 500; color: white;">Halo Bos Riksan</h1>
            <p style="color: #80868b; font-size: 18px;">Sebaiknya kita mulai dari mana?</p>
        </div>`;
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    // Bersihkan welcome screen saat mulai chat
    if (document.querySelector('h1')) {
        document.getElementById('chat-box').innerHTML = '';
    }

    appendMessage('user', msg);
    input.value = '';

    const loadingId = addLoadingBubble();

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await response.json();
        
        document.getElementById(loadingId).remove();
        appendMessage('ai', data.reply);
        saveToHistory(currentChatId, msg, data.reply);

    } catch (err) {
        document.getElementById(loadingId).innerHTML = "Koneksi ke server pusat terganggu, Bos.";
    }
}

function appendMessage(role, text) {
    const chatBox = document.getElementById('chat-box');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    
    // Icon Style ala Gemini/ChatGPT
    const icon = role === 'user' ? 
        '<div class="message-icon user-icon">R</div>' : 
        '<div class="message-icon ai-icon">✨</div>';

    msgDiv.innerHTML = `
        ${icon}
        <div class="content pt-1">
            ${text.replace(/\n/g, '<br>')}
        </div>
    `;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function saveToHistory(id, userMsg, aiMsg) {
    if (!chatHistory[id]) {
        // Ambil 4 kata pertama sebagai judul history
        const title = userMsg.split(' ').slice(0, 4).join(' ') + '...';
        chatHistory[id] = { title: title, chats: [] };
    }
    chatHistory[id].chats.push({ user: userMsg, ai: aiMsg });
    localStorage.setItem('riksen_local_db', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    // Urutkan dari yang terbaru (ID terbesar)
    Object.keys(chatHistory).sort().reverse().forEach(id => {
        const isActive = id == currentChatId;
        const item = document.createElement('div');
        item.className = `history-item p-3 ${isActive ? 'active-chat' : ''}`;
        item.innerHTML = `💬 ${chatHistory[id].title}`;
        item.onclick = () => loadChat(id);
        list.appendChild(item);
    });
}

function loadChat(id) {
    currentChatId = id;
    document.getElementById('chat-box').innerHTML = '';
    chatHistory[id].chats.forEach(c => {
        appendMessage('user', c.user);
        appendMessage('ai', c.ai);
    });
    renderHistory();
}

function addLoadingBubble() {
    const id = 'load-' + Date.now();
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML += `<div id="${id}" class="message items-center gap-4"><div class="message-icon ai-icon animate-spin">✨</div><div class="text-gray-500 italic text-sm">Berpikir...</div></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function newChat() {
    currentChatId = Date.now();
    document.getElementById('chat-box').innerHTML = '';
    showWelcome();
    renderHistory();
}
