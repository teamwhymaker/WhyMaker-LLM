const chatListEl = document.getElementById('chat-list');
const chatWindowEl = document.getElementById('chat-window');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat');

let chats = [];
let currentChatId = null;

function renderChatList() {
  chatListEl.innerHTML = '';
  chats.forEach(chat => {
    const li = document.createElement('li');
    li.textContent = chat.title || 'Untitled Chat';
    if (chat.id === currentChatId) li.classList.add('active');
    li.onclick = () => selectChat(chat.id);
    chatListEl.appendChild(li);
  });
}

function selectChat(id) {
  currentChatId = id;
  renderChatList();
  renderChatWindow();
}

function renderChatWindow() {
  chatWindowEl.innerHTML = '';
  if (!currentChatId) return;
  const chat = chats.find(c => c.id === currentChatId);
  chat.messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'message ' + msg.role;
    div.textContent = msg.text;
    chatWindowEl.appendChild(div);
  });
  chatWindowEl.scrollTop = chatWindowEl.scrollHeight;
}

function createNewChat() {
  const id = Date.now().toString();
  chats.push({ id, title: 'New Chat', messages: [] });
  currentChatId = id;
  renderChatList();
  renderChatWindow();
}

function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  const chat = chats.find(c => c.id === currentChatId);
  chat.messages.push({ role: 'user', text });
  renderChatWindow();
  inputEl.value = '';
  // Placeholder bot response
  setTimeout(() => {
    chat.messages.push({ role: 'bot', text: 'This is a placeholder response.' });
    renderChatWindow();
  }, 500);
}

newChatBtn.onclick = createNewChat;
sendBtn.onclick = sendMessage;
inputEl.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});

// Initialize with one chat
createNewChat(); 