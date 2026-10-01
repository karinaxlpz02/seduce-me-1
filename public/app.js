import { messages } from './messages.js';
const conversation = document.getElementById('conversation');
const toggle = document.getElementById('toggle');
const delay = 30_000;
const storageKey = 'chat-claude-letters-v1';
let shown = 0, remaining = 0, running = false, nextAt = null, timer;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Number.isInteger(saved.shown) && saved.shown >= 0 && saved.shown <= messages.length) {
    shown = saved.shown;
    remaining = Number.isFinite(saved.remaining) ? Math.max(0, Math.min(delay, saved.remaining)) : delay;
  }
} catch {}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({shown, remaining: running ? Math.max(0, nextAt - Date.now()) : remaining})); } catch {}
}
function append(message) {
  const bubble = document.createElement('article');
  bubble.className = `bubble ${message.speaker === 'Claude' ? 'claude' : 'chat'}`;
  const label = document.createElement('div'); label.className = 'label'; label.textContent = message.speaker;
  const text = document.createElement('p'); text.textContent = message.text;
  bubble.append(label, text); conversation.append(bubble);
}
function updateButton() {
  toggle.textContent = running ? 'Pause' : 'Continue';
  toggle.setAttribute('aria-pressed', String(running));
  toggle.disabled = shown === messages.length;
  toggle.title = toggle.disabled ? 'Conversation complete' : '';
}
function reveal() {
  if (!running || shown === messages.length) return;
  append(messages[shown++]);
  window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'});
  remaining = delay;
  if (shown === messages.length) { running = false; nextAt = null; }
  else { nextAt = Date.now() + remaining; timer = setTimeout(reveal, remaining); }
  save(); updateButton();
}
messages.slice(0, shown).forEach(append);
updateButton();
toggle.addEventListener('click', () => {
  if (shown === messages.length) return;
  if (running) {
    remaining = Math.max(0, nextAt - Date.now()); running = false; clearTimeout(timer); nextAt = null;
  } else {
    running = true; nextAt = Date.now() + remaining; timer = setTimeout(reveal, remaining);
  }
  save(); updateButton();
});
window.addEventListener('pagehide', save);
