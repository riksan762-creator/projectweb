let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksen_chats')) || {};

document.addEventListener('DOMContentLoaded', () => {
    const ids = Object.keys(chatHistory);
    if (ids.length > 0) loadChat(ids.sort().pop()); else showWelcome();
    renderHistory();
});

function showWelcome() {
    document.getElementById('chat-box').innerHTML = `
        <div class="h-full flex flex-col items-center justify-center space-y-4 pt-20">
            <h1 class="text-5xl font-medium bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">Halo, Bos Riksan</h1>
            <p class="text-gray-500 text-xl">Ada yang bisa saya bantu hari ini?</p>
        </div>`;
}

function newChat() {
    currentChatId = Date.now();
    document.getElementById('chat-box').innerHTML = '';
    showWelcome();
    renderHistory();
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    if (document.querySelector('.text-transparent')) document.getElementById('chat-box').innerHTML = '';
    
    appendMessage('user', msg);
    input.value = '';
    const loadId = addLoading();

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        document.getElementById(loadId).remove();
        appendMessage('ai', data.reply);
        saveChat(currentChatId, msg, data.reply);
    } catch (e) {
        document.getElementById(loadId).innerHTML = "Error koneksi server.";
    }
}

function appendMessage(role, text) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = 'message';
    const avatar = role === 'user' ? '<div class="avatar user-avatar">R</div>' : '<div class="avatar ai-avatar">✨</div>';
    div.innerHTML = `${avatar}<div>${text.replace(/\n/g, '<br>')}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function saveChat(id, u, a) {
    if (!chatHistory[id]) chatHistory[id] = { title: u.substring(0, 25) + "...", chats: [] };
    chatHistory[id].chats.push({ user: u, ai: a });
    localStorage.setItem('riksen_chats', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    const term = document.getElementById('search-history').value.toLowerCase();
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    Object.keys(chatHistory).reverse().forEach(id => {
        if (chatHistory[id].title.toLowerCase().includes(term)) {
            const div = document.createElement('div');
            div.className = `history-item ${id == currentChatId ? 'active-chat' : ''}`;
            div.innerText = `💬 ${chatHistory[id].title}`;
            div.onclick = () => loadChat(id);
            list.appendChild(div);
        }
    });
}

function filterHistory() { renderHistory(); }

function loadChat(id) {
    currentChatId = id;
    document.getElementById('chat-box').innerHTML = '';
    chatHistory[id].chats.forEach(c => { appendMessage('user', c.user); appendMessage('ai', c.ai); });
    renderHistory();
}

function addLoading() {
    const id = 'l-' + Date.now();
    const box = document.getElementById('chat-box');
    box.innerHTML += `<div id="${id}" class="message"><div class="avatar ai-avatar animate-spin">✨</div><div class="text-gray-600">Mencari data Bloomberg...</div></div>`;
    return id;
}
