document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatBox = document.getElementById('chat-box');

  let apiKey = sessionStorage.getItem('APP_API_KEY');
  if (!apiKey) {
    apiKey = prompt("Please enter the Server API Key to connect:");
    if (apiKey) sessionStorage.setItem('APP_API_KEY', apiKey);
  }

  let googleRefreshToken = sessionStorage.getItem('GOOGLE_REFRESH_TOKEN');
  if (!googleRefreshToken) {
    googleRefreshToken = prompt("Please enter your Google Calendar Refresh Token (Optional but required for calendar access):");
    if (googleRefreshToken) sessionStorage.setItem('GOOGLE_REFRESH_TOKEN', googleRefreshToken);
  }

  const generatedSessionId = 'session-' + Math.random().toString(36).substr(2, 9);

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // Append user message
    appendMessage(text, 'user');
    chatInput.value = '';

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey || ''
        },
        body: JSON.stringify({ 
          message: text, 
          sessionId: generatedSessionId,
          refreshToken: googleRefreshToken || ''
        })
      });

      const data = await res.json();
      removeTypingIndicator(typingId);

      if (data.error) {
        appendMessage('Error: ' + data.error, 'bot');
      } else {
        appendMessage(data.response, 'bot');
      }

    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessage('Connection error...', 'bot');
    }
  });

  function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.textContent = text;
    
    msgDiv.appendChild(bubble);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'bot');
    msgDiv.id = id;
    
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble', 'typing-indicator');
    
    bubble.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    
    msgDiv.appendChild(bubble);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) {
      el.remove();
    }
  }
});
