async function askAI() {
    let input = document.getElementById("input");
    let chat = document.getElementById("chat");

    let text = input.value.trim();
    if (!text) return;

    // Tampilkan pesan kamu
    chat.innerHTML += `<p style="margin-bottom: 10px;"><b>Kamu:</b> ${text}</p>`;
    input.value = "";

    // Scroll otomatis ke bawah
    chat.scrollTop = chat.scrollHeight;

    try {
        let res = await fetch("/api/ai", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        });

        let data = await res.json();

        // Cek struktur data Gemini: candidates -> content -> parts -> text
        if (data && data.candidates && data.candidates[0].content) {
            let aiText = data.candidates[0].content.parts[0].text;
            chat.innerHTML += `<p style="margin-bottom: 10px;"><b>AI:</b> ${aiText}</p>`;
        } else {
            // Tampilkan pesan error jika ada masalah API
            let errorDetail = data.error ? data.error.message : "Gagal memproses jawaban.";
            chat.innerHTML += `<p style="color: red; margin-bottom: 10px;"><b>AI Error:</b> ${errorDetail}</p>`;
        }
    } catch (err) {
        chat.innerHTML += `<p style="color: red; margin-bottom: 10px;"><b>AI Error:</b> Masalah koneksi backend.</p>`;
    }

    // Scroll otomatis lagi setelah AI jawab
    chat.scrollTop = chat.scrollHeight;
}
