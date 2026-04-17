let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksen_db')) || {};

document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
    const ids = Object.keys(chatHistory);
    if (ids.length > 0) loadChat(ids.sort().pop());
    else showWelcome();
});

function showWelcome() {
    document.getElementById('chat-box').innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #80868b;">
            <h1 style="font-size: 40px; margin-bottom: 10px; color: white;">Halo, Bos Riksan</h1>
            <p>Ada yang bisa saya bantu hari ini?</p>
        </div>`;
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    if (document.querySelector('h1')) document.getElementById('chat-box').innerHTML = '';

    appendMessage('user', msg);
    input.value = '';

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await response.json();
        
        appendMessage('ai', data.reply);
        saveChat(currentChatId, msg, data.reply);
    } catch (e) {
        appendMessage('ai', "Error koneksi, Bos.");
    }
}

function appendMessage(role, text) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = 'message';
    
    const avatar = role === 'user' ? 
        '<div class="avatar user-avatar">R</div>' : 
        '<div class="avatar ai-avatar">✨</div>';
    
    div.innerHTML = `${avatar}<div class="content">${text.replace(/\n/g, '<br>')}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function saveChat(id, u, a) {
    if (!chatHistory[id]) chatHistory[id] = { title: u.substring(0, 30), chats: [] };
    chatHistory[id].chats.push({ user: u, ai: a });
    localStorage.setItem('riksen_db', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    Object.keys(chatHistory).reverse().forEach(id => {
        const div = document.createElement('div');
        div.className = `history-item ${id == currentChatId ? 'active-chat' : ''}`;
        div.innerText = chatHistory[id].title;
        div.onclick = () => loadChat(id);
        list.appendChild(div);
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

function newChat() {
    currentChatId = Date.now();
    document.getElementById('chat-box').innerHTML = '';
    showWelcome();
    renderHistory();
}
