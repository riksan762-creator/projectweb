let currentChatId = Date.now();
let chatHistory = JSON.parse(localStorage.getItem('riksan_db')) || {};

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;

    // Remove welcome screen
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.remove();

    appendMessage('user', msg);
    input.value = '';

    const history = (chatHistory[currentChatId]?.chats || []).map(c => ([
        { role: 'user', content: c.user },
        { role: 'assistant', content: c.ai }
    ])).flat();

    const loadId = addLoading();

    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, history: history })
        });
        const data = await res.json();
        
        document.getElementById(loadId).remove();
        appendMessage('ai', data.reply);
        saveChat(currentChatId, msg, data.reply);
    } catch (err) {
        document.getElementById(loadId).innerHTML = "Error koneksi, Bos.";
    }
}

function appendMessage(role, text) {
    const container = document.getElementById('chat-container');
    const div = document.createElement('div');
    div.className = `message-row ${role}-row`;
    
    const avatar = role === 'user' ? 
        '<div class="avatar user">R</div>' : 
        '<div class="avatar ai">✨</div>';

    div.innerHTML = `
        <div class="msg-inner">
            ${avatar}
            <div class="content">${text.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addLoading() {
    const id = 'l-' + Date.now();
    const container = document.getElementById('chat-container');
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message-row ai-row';
    div.innerHTML = `<div class="msg-inner"><div class="avatar ai">✨</div><div class="content">...</div></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function saveChat(id, u, a) {
    if (!chatHistory[id]) chatHistory[id] = { title: u.substring(0, 30), chats: [] };
    chatHistory[id].chats.push({ user: u, ai: a });
    localStorage.setItem('riksan_db', JSON.stringify(chatHistory));
}

function newChat() {
    location.reload(); // Cara paling bersih untuk reset state
}
