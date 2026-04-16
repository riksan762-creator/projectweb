async function askAI() {
    let input = document.getElementById("input");
    let chat = document.getElementById("chat");

    let text = input.value.trim();
    if (!text) return;

    // Tampilkan pesan kamu di layar
    chat.innerHTML += `<p style="margin-bottom: 10px;"><b>Kamu:</b> ${text}</p>`;
    input.value = "";

    // Scroll ke bawah otomatis
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
        console.log("Respon Gemini:", data);

        // Cek apakah ada jawaban dari Gemini
        if (data && data.candidates && data.candidates[0].content) {
            let aiText = data.candidates[0].content.parts[0].text;
            chat.innerHTML += `<p style="margin-bottom: 10px;"><b>AI:</b> ${aiText}</p>`;
        } else {
            // Jika API Key bermasalah atau limit habis
            let errorMsg = data.error ? data.error.message : "Gagal mendapatkan respon dari AI.";
            chat.innerHTML += `<p style="color: red; margin-bottom: 10px;"><b>AI:</b> Error: ${errorMsg}</p>`;
        }
    } catch (err) {
        console.error(err);
        chat.innerHTML += `<p style="color: red; margin-bottom: 10px;"><b>AI:</b> Terjadi kesalahan teknis.</p>`;
    }

    // Scroll ke bawah lagi setelah AI jawab
    chat.scrollTop = chat.scrollHeight;
}
