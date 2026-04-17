let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksan_pro_db')) || {};

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-sidebar');
    const closeBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');

    toggleBtn.addEventListener('click', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.toggle('hidden');
        } else {
            sidebar.classList.add('active');
        }
    });

    closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });

    initApp();
});

function initApp() {
    renderHistory();
    const ids = Object.keys(chatHistory);
    if (ids.length > 0) {
        loadChat(ids.sort().pop());
    } else {
        showWelcome();
    }
}

function showWelcome() {
    const container = document.getElementById('chat-container');
    container.innerHTML = `<div class="welcome-msg"><h1>Ada yang bisa saya bantu?</h1></div>`;
}

function newChat() {
    currentChatId = Date.now();
    document.getElementById('chat-container').innerHTML = '';
    document.getElementById('user-input').value = '';
    showWelcome();
    renderHistory();
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('active');
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    if (document.querySelector('.welcome-msg')) {
        document.getElementById('chat-container').innerHTML = '';
    }

    appendMessage('user', msg);
    input.value = '';

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
        document.getElementById(loadId).querySelector('.message-content').innerText = "Gagal terhubung ke server.";
    }
}

function appendMessage(role, text) {
    const container = document.getElementById('chat-container');
    const row = document.createElement('div');
    row.className = `message-row ${role}-row`;
    
    // Ikon sangat minimalis, tidak pakai emoji aneh-aneh
    const avatar = role === 'user' ? 
        '<div class="avatar avatar-user">R</div>' : 
        '<div class="avatar avatar-ai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/></svg></div>';

    // Memastikan baris baru pada teks dirender dengan benar
    const formattedText = text.replace(/\n/g, '<br>');

    row.innerHTML = `
        ${avatar}
        <div class="message-content">${formattedText}</div>
    `;
    
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
}

function saveChat(id, userMsg, aiMsg) {
    if (!chatHistory[id]) chatHistory[id] = { title: userMsg.substring(0, 25) + '...', chats: [] };
    chatHistory[id].chats.push({ user: userMsg, ai: aiMsg });
    localStorage.setItem('riksan_pro_db', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    Object.keys(chatHistory).sort().reverse().forEach(id => {
        const div = document.createElement('div');
        div.className = `history-item ${id == currentChatId ? 'active-item' : ''}`;
        div.innerText = chatHistory[id].title;
        div.onclick = () => loadChat(id);
        list.appendChild(div);
    });
}

function loadChat(id) {
    currentChatId = id;
    document.getElementById('chat-container').innerHTML = '';
    chatHistory[id].chats.forEach(c => {
        appendMessage('user', c.user);
        appendMessage('ai', c.ai);
    });
    renderHistory();
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('active');
}

function addLoading() {
    const id = 'load-' + Date.now();
    const container = document.getElementById('chat-container');
    const row = document.createElement('div');
    row.id = id;
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="avatar avatar-ai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/></svg></div>
        <div class="message-content" style="color: #b4b4b4;">Menganalisis...</div>
    `;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return id;
}
