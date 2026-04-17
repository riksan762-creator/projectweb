let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksan_pro_db')) || {};

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-sidebar');
    const closeBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');

    // Toggle Sidebar yang lebih smooth
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.toggle('hidden');
            } else {
                sidebar.classList.add('active');
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    initApp();
});

function initApp() {
    renderHistory();
    const ids = Object.keys(chatHistory);
    if (ids.length > 0) {
        // Sortir ID agar yang paling baru yang muncul
        loadChat(ids.sort((a, b) => a - b).pop());
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
    const container = document.getElementById('chat-container');
    container.innerHTML = '';
    document.getElementById('user-input').value = '';
    showWelcome();
    renderHistory();
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('active');
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    // Hapus welcome message saat chat pertama dimulai
    const welcome = document.querySelector('.welcome-msg');
    if (welcome) welcome.remove();

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
        
        // Hapus indikator loading sebelum memunculkan jawaban
        const loader = document.getElementById(loadId);
        if (loader) loader.remove();

        appendMessage('ai', data.reply);
        saveChat(currentChatId, msg, data.reply);
    } catch (e) {
        const loader = document.getElementById(loadId);
        if (loader) {
            loader.querySelector('.message-content').innerText = "Gagal terhubung ke server. Coba cek koneksi Anda.";
            loader.querySelector('.message-content').style.color = "#ff4a4a";
        }
    }
}

function appendMessage(role, text) {
    const container = document.getElementById('chat-container');
    const row = document.createElement('div');
    row.className = `message-row ${role}-row`;
    
    const avatar = role === 'user' ? 
        '<div class="avatar avatar-user">R</div>' : 
        '<div class="avatar avatar-ai"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/></svg></div>';

    // Gunakan textContent untuk keamanan, lalu ubah \n jadi <br>
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = text.replace(/\n/g, '<br>');

    row.innerHTML = avatar;
    row.appendChild(contentDiv);
    
    container.appendChild(row);
    
    // Auto scroll ke paling bawah setiap ada pesan baru
    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });
}

function saveChat(id, userMsg, aiMsg) {
    if (!chatHistory[id]) {
        // Ambil judul dari pesan pertama user
        const title = userMsg.length > 25 ? userMsg.substring(0, 25) + '...' : userMsg;
        chatHistory[id] = { title: title, chats: [] };
    }
    chatHistory[id].chats.push({ user: userMsg, ai: aiMsg });
    localStorage.setItem('riksan_pro_db', JSON.stringify(chatHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';
    
    // Urutkan history dari yang terbaru di paling atas
    Object.keys(chatHistory).sort((a, b) => b - a).forEach(id => {
        const div = document.createElement('div');
        div.className = `history-item ${id == currentChatId ? 'active-item' : ''}`;
        div.innerText = chatHistory[id].title;
        div.onclick = () => loadChat(id);
        list.appendChild(div);
    });
}

function loadChat(id) {
    currentChatId = id;
    const container = document.getElementById('chat-container');
    container.innerHTML = '';
    
    if (chatHistory[id]) {
        chatHistory[id].chats.forEach(c => {
            appendMessage('user', c.user);
            appendMessage('ai', c.ai);
        });
    }
    
    renderHistory();
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('active');
    }
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
