/* app.js */
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const fileInput = document.getElementById("file-input");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const cameraBtn = document.getElementById("camera-btn");
const cameraModal = document.getElementById("camera-modal");
const webcam = document.getElementById("webcam");
const canvas = document.getElementById("canvas");

let selectedImageBase64 = null; // Menyimpan data gambar sementara
let webcamStream = null;

// --- Bagian 1: Logika Kamera (Capture) ---

cameraBtn.addEventListener('click', async () => {
    try {
        // Minta izin kamera
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        webcam.srcObject = webcamStream;
        cameraModal.classList.remove("modal-hidden");
    } catch (err) {
        console.error("Gagal akses kamera:", err);
        alert("Gagal mengakses kamera. Pastikan kamu memberi izin.");
    }
});

function closeCamera() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop()); // Matikan kamera
    }
    cameraModal.classList.add("modal-hidden");
}

function takePicture() {
    // Gambar bingkai video ke kanvas
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    canvas.getContext('2d').drawImage(webcam, 0, 0);

    // Ubah kanvas jadi data Base64
    selectedImageBase64 = canvas.toDataURL('image/jpeg');
    
    // Tampilkan pratinjau
    imagePreview.src = selectedImageBase64;
    imagePreviewContainer.classList.remove("image-preview-hidden");

    closeCamera(); // Tutup modal setelah ambil foto
}


// --- Bagian 2: Logika Upload File (Paperclip) ---

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedImageBase64 = event.target.result; // Data Base64
            imagePreview.src = selectedImageBase64;
            imagePreviewContainer.classList.remove("image-preview-hidden");
        };
        reader.readAsDataURL(file); // Baca file sebagai Base64
    } else {
        alert("Harap pilih file gambar.");
    }
});

function clearImage() {
    selectedImageBase64 = null;
    fileInput.value = ""; // Reset input file
    imagePreview.src = "";
    imagePreviewContainer.classList.add("image-preview-hidden");
}


// --- Bagian 3: Logika Kirim Pesan & AI ---

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        askAI();
    }
}

async function askAI() {
    const text = input.value.trim();
    if (!text && !selectedImageBase64) return; // Harus ada teks atau gambar

    // --- Tampilkan pesan Kamu (User) di layar ---
    let userMessageHTML = `<div class="message user-message"><div class="message-content">`;
    if (text) userMessageHTML += `<p>${text}</p>`;
    if (selectedImageBase64) {
        userMessageHTML += `<img src="${selectedImageBase64}" alt="Foto terkirim">`;
    }
    userMessageHTML += `</div></div>`;
    
    chat.innerHTML += userMessageHTML;
    chat.scrollTop = chat.scrollHeight; // Scroll otomatis

    // Bersihkan input
    input.value = "";
    const currentBase64ToSend = selectedImageBase64; // Ambil data untuk dikirim
    clearImage(); // Bersihkan pratinjau

    try {
        // Tampilkan 'sedang berpikir'
        const thinkingId = Date.now();
        chat.innerHTML += `<div id="ai-${thinkingId}" class="message ai-message"><div class="message-content">...</div></div>`;
        chat.scrollTop = chat.scrollHeight;

        // --- PENGIRIMAN DATA BARU: Gunakan FormData (PENTING!) ---
        const formData = new FormData();
        formData.append("message", text);
        if (currentBase64ToSend) {
            formData.append("image", currentBase64ToSend); // Kirim gambar Base64
        }

        const res = await fetch("/api/ai", {
            method: "POST",
            // Jangan pasang Content-Type header! Browser akan setel otomatis FormData
            body: formData
        });

        const data = await res.json();
        const aiThinkingDiv = document.getElementById(`ai-${thinkingId}`).querySelector('.message-content');

        // Cek struktur data Gemini terbaru
        if (data && data.candidates && data.candidates[0].content) {
            let aiText = data.candidates[0].content.parts[0].text;
            aiThinkingDiv.innerText = aiText; // Ganti '...' dengan jawaban asli
        } else {
            let errorDetail = data.error ? data.error.message : "Gagal memproses jawaban.";
            aiThinkingDiv.innerHTML = `<span style="color: #ff5252;"><b>AI Error:</b> ${errorDetail}</span>`;
        }
    } catch (err) {
        console.error(err);
        chat.innerHTML += `<div class="message ai-message"><div class="message-content" style="color: #ff5252;">Masalah koneksi backend.</div></div>`;
    }

    chat.scrollTop = chat.scrollHeight;
}
