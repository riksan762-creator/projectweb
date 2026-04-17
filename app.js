let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksen_db_v2')) || {};

document.addEventListener('DOMContentLoaded', () => {
    // Tombol Menu / Ellipsis Toggle
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    menuBtn.addEventListener('click', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.toggle('hidden');
        } else {
            sidebar.classList.toggle('active');
        }
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
    const box = document.getElementById('chat-box');
    box.innerHTML = `<div class="welcome-screen"><h1>Halo, ada yang bisa saya bantu?</h1></div>`;
}

function newChat() {
    currentChatId = Date.now();
    document.getElementById('chat-box').innerHTML = '';
    document.getElementById('user-input').value = '';
    showWelcome();
    renderHistory();
    // Tutup sidebar di mobile jika klik new chat
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('active');
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    if (document.querySelector('.welcome-screen')) {
        document.getElementById('chat-box').innerHTML = '';
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
        document.getElementById(loadId).innerText = "Gagal memuat respon.";
    }
}

function appendMessage(role, text) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `message ${role}-msg`;
    
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
    localStorage.setItem('riksen_db_v2', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    Object.keys(chatHistory).sort().reverse().forEach(id => {
        const div = document.createElement('div');
        div.className = `history-item ${id == currentChatId ? 'active-history' : ''}`;
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
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('active');
}

function addLoading() {
    const id = 'l-' + Date.now();
    const box = document.getElementById('chat-box');
    box.innerHTML += `<div id="${id}" class="message"><div class="avatar ai-avatar">✨</div><div class="content italic text-gray-500">Mengetik...</div></div>`;
    box.scrollTop = box.scrollHeight;
    return id;
}
