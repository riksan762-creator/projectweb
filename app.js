let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksan_pro_db')) || {};

const DOM = {
    chatContainer: document.getElementById('chat-container'),
    userInput: document.getElementById('user-input'),
    sidebar: document.getElementById('sidebar'),
    historyList: document.getElementById('history-list'),
    sendBtn: document.getElementById('send-btn') // Pastikan ada ID ini di tombol kirim Bos
};

document.addEventListener('DOMContentLoaded', () => {
    // Toggle Sidebar Professional
    const toggleBtn = document.getElementById('toggle-sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            DOM.sidebar.classList.toggle(window.innerWidth <= 768 ? 'active' : 'hidden');
        });
    }

    // Input Enter Key Support
    DOM.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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
        <div class="welcome-section fade-up">
            <div class="ai-badge">AI CORE v3.3 ONLINE</div>
            <h1>Apa yang bisa saya bantu hari ini?</h1>
        </div>`;
}

async function sendMessage() {
    const msg = DOM.userInput.value.trim();
    if (!msg) return;

    // Bersihkan welcome screen
    if (document.querySelector('.welcome-section')) DOM.chatContainer.innerHTML = '';

    // Ambil history chat saat ini untuk dikirim ke API (Biar AI Nyambung)
    const currentMemory = chatHistory[currentChatId]?.chats || [];
    const formattedHistory = currentMemory.map(chat => ([
        { role: "user", content: chat.user },
        { role: "assistant", content: chat.ai }
    ])).flat();

    appendMessage('user', msg);
    DOM.userInput.value = '';
    
    const loadId = addLoading();

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: msg,
                history: formattedHistory // Mengirim ingatan ke API
            })
        });

        const data = await response.json();
        
        const loader = document.getElementById(loadId);
        if (loader) loader.remove();

        if (data.reply) {
            appendMessage('ai', data.reply);
            saveChat(currentChatId, msg, data.reply);
        } else {
            throw new Error("No reply");
        }

    } catch (e) {
        const loader = document.getElementById(loadId);
        if (loader) {
            loader.innerHTML = `<div class="msg-inner"><div class="content error">Koneksi Core terputus. Silakan coba lagi, Bos.</div></div>`;
        }
    }
}

function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `message-row ${role}-row fade-up`;
    
    const avatar = role === 'user' ? 
        '<div class="avatar user">R</div>' : 
        `<div class="avatar ai">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/>
            </svg>
        </div>`;

    // Render markdown sederhana (line break)
    const formattedText = text.replace(/\n/g, '<br>');

    row.innerHTML = `
        <div class="msg-inner">
            ${avatar}
            <div class="content">${formattedText}</div>
        </div>
    `;
    
    DOM.chatContainer.appendChild(row);
    scrollToBottom();
}

function addLoading() {
    const id = 'l-' + Date.now();
    const row = document.createElement('div');
    row.id = id;
    row.className = 'message-row ai-row fade-up';
    row.innerHTML = `
        <div class="msg-inner">
            <div class="avatar ai anim-pulse">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/>
                </svg>
            </div>
            <div class="content thinking">Sedang berpikir...</div>
        </div>
    `;
    DOM.chatContainer.appendChild(row);
    scrollToBottom();
    return id;
}

function scrollToBottom() {
    DOM.chatContainer.scrollTo({
        top: DOM.chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

function saveChat(id, u, a) {
    if (!chatHistory[id]) {
        chatHistory[id] = { title: u.substring(0, 30), chats: [] };
    }
    chatHistory[id].chats.push({ user: u, ai: a });
    localStorage.setItem('riksan_pro_db', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    DOM.historyList.innerHTML = '';
    const sortedIds = Object.keys(chatHistory).sort().reverse();
    
    sortedIds.forEach(id => {
        const item = document.createElement('div');
        item.className = `history-item ${id == currentChatId ? 'active' : ''}`;
        item.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px; opacity:0.6;">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>${chatHistory[id].title}</span>
        `;
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
}

function newChat() {
    currentChatId = Date.now();
    showWelcome();
    renderHistory();
    if (window.innerWidth <= 768) DOM.sidebar.classList.remove('active');
}
