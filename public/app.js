const $ = id => document.getElementById(id);
// For GitHub Pages, set this to the HTTPS address of your hosted server.
const API = window.SLOW_FLIRT_API || '';
let state;
function render(next) {
  state = next;
  $('connection').textContent = 'CONNECTED';
  $('progress').textContent = `${state.replies} / 6 replies`;
  $('status').textContent = state.complete ? 'A quiet goodbye.' : state.running ? 'Let it linger.' : 'Paused';
  $('toggle').textContent = state.complete ? 'Complete' : state.running ? 'Pause' : 'Continue ↗';
  $('toggle').disabled = state.complete;
  $('error').textContent = state.error || '';
  const area = $('conversation');
  if (state.messages.length) {
    area.replaceChildren(...state.messages.map(message => {
      const article = document.createElement('article'); article.className = `note ${message.speaker.toLowerCase()}`;
      const label = document.createElement('div'); label.className = 'label'; label.textContent = message.speaker.toUpperCase();
      const time = document.createElement('time'); time.dateTime = new Date(message.at).toISOString(); time.textContent = new Date(message.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      label.append(time); const p = document.createElement('p'); p.textContent = message.text; article.append(label,p); return article;
    }));
  }
  tick();
}
function tick() {
  if (!state) return;
  const seconds = Math.max(0,Math.ceil((state.running ? state.nextAt-Date.now() : state.remaining)/1000));
  $('countdown').textContent = state.complete ? 'Six replies. Thank you for staying.' : state.busy ? 'Claude is composing a reply…' : state.running ? `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} until the next message` : 'The conversation resumes when you do.';
}
const events = new EventSource(`${API}/api/events`);
events.onmessage = event => render(JSON.parse(event.data));
events.onerror = () => { $('connection').textContent = 'OFFLINE'; $('toggle').disabled = true; $('error').textContent = 'The conversation server is offline. Reconnecting automatically.'; };
$('toggle').onclick = async () => {
  const token = sessionStorage.getItem('controlToken') || prompt('Enter the site owner’s control password:');
  if (!token) return;
  sessionStorage.setItem('controlToken', token); $('toggle').disabled = true;
  try {
    const response = await fetch(`${API}/api/control`, {method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({running:!state.running})});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    render(body);
  } catch (error) { $('error').textContent = error.message; $('toggle').disabled = false; }
};
setInterval(tick,1000);
