let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksan_pro_db')) || {};

const DOM = {
    chatContainer: document.getElementById('chat-container'),
    userInput: document.getElementById('user-input'),
    sidebar: document.getElementById('sidebar'),
    historyList: document.getElementById('history-list')
};

document.addEventListener('DOMContentLoaded', () => {
    // Toggle Sidebar Professional
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        DOM.sidebar.classList.toggle(window.innerWidth <= 768 ? 'active' : 'hidden');
    });

    initApp();
});

function initApp() {
    renderHistory();
    const ids = Object.keys(chatHistory);
    (ids.length > 0) ? loadChat(ids.sort().pop()) : showWelcome();
}

function showWelcome() {
    DOM.chatContainer.innerHTML = `
        <div class="welcome-section">
            <div class="ai-badge">AI CORE v3.3</div>
            <h1>Apa yang bisa saya bantu hari ini?</h1>
        </div>`;
}

async function sendMessage() {
    const msg = DOM.userInput.value.trim();
    if (!msg) return;

    if (document.querySelector('.welcome-section')) DOM.chatContainer.innerHTML = '';

    appendMessage('user', msg);
    DOM.userInput.value = '';
    
    const loadId = addLoading();

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await response.json();
        
        document.getElementById(loadId).remove();
        appendMessage('ai', data.reply);
        saveChat(currentChatId, msg, data.reply);
    } catch (e) {
        document.getElementById(loadId).innerHTML = `<div class="error">Gagal memproses permintaan.</div>`;
    }
}

function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `message-row ${role}-row fade-up`;
    
    const avatar = role === 'user' ? 
        '<div class="avatar user">R</div>' : 
        '<div class="avatar ai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/></svg></div>';

    row.innerHTML = `
        <div class="msg-inner">
            ${avatar}
            <div class="content">${text.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    
    DOM.chatContainer.appendChild(row);
    DOM.chatContainer.scrollTo({ top: DOM.chatContainer.scrollHeight, behavior: 'smooth' });
}

function addLoading() {
    const id = 'l-' + Date.now();
    const row = document.createElement('div');
    row.id = id;
    row.className = 'message-row ai-row fade-up';
    row.innerHTML = `
        <div class="msg-inner">
            <div class="avatar ai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/></svg></div>
            <div class="content thinking">Sedang berpikir...</div>
        </div>
    `;
    DOM.chatContainer.appendChild(row);
    return id;
}

function saveChat(id, u, a) {
    if (!chatHistory[id]) chatHistory[id] = { title: u.substring(0, 30), chats: [] };
    chatHistory[id].chats.push({ user: u, ai: a });
    localStorage.setItem('riksan_pro_db', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    DOM.historyList.innerHTML = '';
    Object.keys(chatHistory).sort().reverse().forEach(id => {
        const item = document.createElement('div');
        item.className = `history-item ${id == currentChatId ? 'active' : ''}`;
        item.innerText = chatHistory[id].title;
        item.onclick = () => loadChat(id);
        DOM.historyList.appendChild(item);
    });
}

function loadChat(id) {
    currentChatId = id;
    DOM.chatContainer.innerHTML = '';
    chatHistory[id].chats.forEach(c => {
        appendMessage('user', c.user);
        appendMessage('ai', c.ai);
    });
    renderHistory();
}
