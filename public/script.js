async function sendMessage() {
    const inputField = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const message = inputField.value.trim();

    if (!message) return;

    // Tampilkan pesan pengguna di chat
    const userBubble = document.createElement('div');
    userBubble.className = 'flex justify-end';
    userBubble.innerHTML = `<div class="bg-gray-900 text-white p-3 rounded-xl max-w-[80%] text-sm">${escapeHTML(message)}</div>`;
    chatContainer.appendChild(userBubble);

    inputField.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Membuat elemen kosong untuk menampung balasan bot (mendukung streaming / teks bertahap)
    const botBubbleContainer = document.createElement('div');
    botBubbleContainer.className = 'flex justify-start';
    const botBubbleContent = document.createElement('div');
    botBubbleContent.className = 'bg-gray-200 text-gray-800 p-3 rounded-xl max-w-[80%] text-sm whitespace-pre-wrap';
    botBubbleContainer.appendChild(botBubbleContent);
    chatContainer.appendChild(botBubbleContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // Mengirim request ke backend Express.js (menyesuaikan format array messages di index.js)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: "user", content: message }]
            })
        });

        if (!response.ok) {
            botBubbleContent.textContent = "Maaf, terjadi kesalahan pada server.";
            return;
        }

        // Menangani respons streaming dari backend (SSE - Server Sent Events)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botReply = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data:")) {
                    const dataStr = trimmed.slice(5).trim();
                    if (dataStr === "[DONE]") break;

                    try {
                        const parsed = JSON.parse(dataStr);
                        if (typeof parsed === "string") {
                            botReply += parsed;
                            botBubbleContent.textContent = botReply;
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    } catch (e) {
                        // Abaikan jika chunk bukan JSON utuh
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
        botBubbleContent.textContent = "Gagal terhubung ke server.";
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}