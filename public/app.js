const bubbles = [...document.querySelectorAll('#conversation .bubble')];
let shown = 1;
function reveal() {
  if (shown >= bubbles.length) return;
  const bubble = bubbles[shown++];
  bubble.hidden = false;
  bubble.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (shown < bubbles.length) setTimeout(reveal, 5000);
}
if (shown < bubbles.length) setTimeout(reveal, 5000);
