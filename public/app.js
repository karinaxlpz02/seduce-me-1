const $ = id => document.getElementById(id);
// For GitHub Pages, set this to the HTTPS address of your hosted server.
const API = window.SLOW_FLIRT_API || '';
let state;
function showError(message) {
  $('error').textContent = message || '';
  $('error').hidden = !message;
}
function render(next) {
  const previousCount = state?.messages.length || 0;
  state = next;
  $('toggle').textContent = state.running ? 'Pause' : 'Continue';
  $('toggle').setAttribute('aria-pressed', String(state.running));
  $('toggle').disabled = state.complete;
  $('toggle').title = state.complete ? 'Conversation complete' : '';
  showError(state.error);
  $('conversation').replaceChildren(...state.messages.map(message => {
    const article = document.createElement('article');
    article.className = `bubble ${message.speaker === 'Claude' ? 'claude' : 'chat'}`;
    const label = document.createElement('div');
    label.className = 'label'; label.textContent = message.speaker === 'Claude' ? 'Claude' : 'Chat';
    const p = document.createElement('p'); p.textContent = message.text;
    article.append(label, p); return article;
  }));
  if (state.messages.length > previousCount) window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
}
const events = new EventSource(`${API}/api/events`);
events.onmessage = event => render(JSON.parse(event.data));
events.onerror = () => { $('toggle').disabled = true; $('toggle').title = 'Conversation server offline'; };
$('toggle').onclick = async () => {
  const token = sessionStorage.getItem('controlToken') || prompt('Enter the site owner’s control password:');
  if (!token) return;
  sessionStorage.setItem('controlToken', token); $('toggle').disabled = true;
  try {
    const response = await fetch(`${API}/api/control`, {method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({running:!state.running})});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    render(body);
  } catch (error) { showError(error.message); $('toggle').disabled = false; }
};
