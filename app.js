const input = document.getElementById("input");
const chat = document.getElementById("chat");
const fileInput = document.getElementById("file-input");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
let selectedImageBase64 = null;

// Fungsi untuk pratinjau gambar
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            selectedImageBase64 = ev.target.result;
            imagePreview.src = selectedImageBase64;
            imagePreviewContainer.classList.remove("image-preview-hidden");
        };
        reader.readAsDataURL(file);
    }
});

function clearImage() {
    selectedImageBase64 = null;
    fileInput.value = "";
    imagePreviewContainer.classList.add("image-preview-hidden");
}

async function askAI() {
    const text = input.value.trim();
    if (!text && !selectedImageBase64) return;

    // Tampilkan pesan user ke layar
    let userMsgHTML = `<div class="message user-message"><div class="message-content">`;
    if (text) userMsgHTML += `<p>${text}</p>`;
    if (selectedImageBase64) userMsgHTML += `<img src="${selectedImageBase64}" style="max-width:100%; border-radius:8px; margin-top:5px;">`;
    userMsgHTML += `</div></div>`;
    
    chat.innerHTML += userMsgHTML;
    chat.scrollTop = chat.scrollHeight;

    const currentImg = selectedImageBase64;
    input.value = "";
    clearImage();

    try {
        const tempId = "ai-" + Date.now();
        chat.innerHTML += `<div id="${tempId}" class="message ai-message"><div class="message-content">Riksan AI sedang berpikir...</div></div>`;
        chat.scrollTop = chat.scrollHeight;

        const formData = new URLSearchParams();
        formData.append("message", text);
        if (currentImg) formData.append("image", currentImg);

        const res = await fetch("/api/ai", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        const aiDiv = document.getElementById(tempId).querySelector(".message-content");

        if (data.candidates && data.candidates[0].content) {
            aiDiv.innerText = data.candidates[0].content.parts[0].text;
        } else {
            const errMsg = data.error ? data.error.message : "Gagal koneksi API.";
            aiDiv.innerHTML = `<span style="color:red">Error: ${errMsg}</span>`;
        }
    } catch (e) {
        console.error(e);
    }
    chat.scrollTop = chat.scrollHeight;
}

function handleKeyPress(e) { if (e.key === 'Enter') askAI(); }
