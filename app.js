let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksan_pro_db')) || {};

const DOM = {
    sidebar: document.getElementById('sidebar'),
    chatContainer: document.getElementById('chat-container'),
    userInput: document.getElementById('user-input'),
    historyList: document.getElementById('history-list'),
    menuBtn: document.getElementById('toggle-sidebar'),
    closeBtn: document.getElementById('close-sidebar')
};

document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners
    if (DOM.menuBtn) {
        DOM.menuBtn.addEventListener('click', () => {
            const isMobile = window.innerWidth <= 768;
            DOM.sidebar.classList.toggle(isMobile ? 'active' : 'hidden');
        });
    }

    if (DOM.closeBtn) {
        DOM.closeBtn.addEventListener('click', () => DOM.sidebar.classList.remove('active'));
    }

    initApp();
});

function initApp() {
    renderHistory();
    const ids = Object.keys(chatHistory);
    (ids.length > 0) ? loadChat(ids.sort().pop()) : showWelcome();
}

function showWelcome() {
    DOM.chatContainer.innerHTML = `
        <div class="welcome-msg">
            <div class="welcome-icon">✨</div>
            <h1>Ada yang bisa saya bantu?</h1>
        </div>`;
}

async function sendMessage() {
    const msg = DOM.userInput.value.trim();
    if (!msg) return;

    // Bersihkan layar dari welcome screen
    if (document.querySelector('.welcome-msg')) DOM.chatContainer.innerHTML = '';

    appendMessage('user', msg);
    DOM.userInput.value = '';
    
    const loadId = addLoading();

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        removeLoader(loadId);
        appendMessage('ai', data.reply);
        saveChat(currentChatId, msg, data.reply);
    } catch (e) {
        removeLoader(loadId);
        appendMessage('ai', "Maaf, sistem sedang mengalami kendala teknis. Silakan coba sesaat lagi.");
    }
}

function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `message-row ${role}-row fade-in`;
    
    const avatar = role === 'user' ? 
        '<div class="avatar avatar-user">R</div>' : 
        `<div class="avatar avatar-ai">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/>
            </svg>
        </div>`;

    row.innerHTML = `
        ${avatar}
        <div class="message-content">${text.replace(/\n/g, '<br>')}</div>
    `;
    
    DOM.chatContainer.appendChild(row);
    scrollToBottom();
}

function addLoading() {
    const id = 'load-' + Date.now();
    const row = document.createElement('div');
    row.id = id;
    row.className = 'message-row ai-row fade-in';
    row.innerHTML = `
        <div class="avatar avatar-ai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/></svg></div>
        <div class="message-content thinking">Sedang berpikir...</div>
    `;
    DOM.chatContainer.appendChild(row);
    scrollToBottom();
    return id;
}

function removeLoader(id) {
    const loader = document.getElementById(id);
    if (loader) loader.remove();
}

function scrollToBottom() {
    DOM.chatContainer.scrollTo({
        top: DOM.chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// History Logic
function saveChat(id, u, a) {
    if (!chatHistory[id]) chatHistory[id] = { title: u.substring(0, 30), chats: [] };
    chatHistory[id].chats.push({ user: u, ai: a });
    localStorage.setItem('riksan_pro_db', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    if (!DOM.historyList) return;
    DOM.historyList.innerHTML = '';
    Object.keys(chatHistory).sort().reverse().forEach(id => {
        const item = document.createElement('div');
        item.className = `history-item ${id == currentChatId ? 'active-item' : ''}`;
        item.innerHTML = `<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span> ${chatHistory[id].title}`;
        item.onclick = () => loadChat(id);
        DOM.historyList.appendChild(item);
    });
}

function loadChat(id) {
    currentChatId = id;
    DOM.chatContainer.innerHTML = '';
    if (chatHistory[id]) {
        chatHistory[id].chats.forEach(c => {
            appendMessage('user', c.user);
            appendMessage('ai', c.ai);
        });
    }
    renderHistory();
    if (window.innerWidth <= 768) DOM.sidebar.classList.remove('active');
}

function newChat() {
    currentChatId = Date.now();
    showWelcome();
    renderHistory();
}
