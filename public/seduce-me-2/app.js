import { alternativesFor, nextAssociation, matchCase } from './words.js?v=4';

await document.fonts.ready;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const floor = document.createElement('div');
floor.className = 'letter-floor';
floor.setAttribute('aria-hidden', 'true');
document.body.append(floor);
let landedCount = 0;

function dropLetters(source) {
  const text = source.firstChild;
  const font = getComputedStyle(source);
  return Promise.all(Array.from(source.textContent).map((character, i) => {
    const range = document.createRange();
    const offset = Array.from(source.textContent).slice(0, i).join('').length;
    range.setStart(text, offset);
    range.setEnd(text, offset + character.length);
    const rect = range.getBoundingClientRect();
    const letter = document.createElement('span');
    letter.className = 'fallen-letter';
    letter.textContent = character;
    letter.style.font = font.font;
    letter.style.letterSpacing = font.letterSpacing;
    letter.style.left = `${rect.left}px`;
    letter.style.top = `${rect.top}px`;
    floor.append(letter);
    const drift = (Math.random() - .5) * 200;
    const targetX = Math.max(4, Math.min(window.innerWidth - rect.width - 4, rect.left + drift));
    const pileHeight = (landedCount++ % 5) * 5;
    const targetY = Math.max(0, window.innerHeight - rect.height - pileHeight - 4);
    const rotation = (Math.random() - .5) * 75;
    const animation = letter.animate([
      { transform: 'translate(0, 0) rotate(0deg)' },
      { transform: `translate(${targetX - rect.left}px, ${targetY - rect.top}px) rotate(${rotation}deg)` }
    ], {duration: reducedMotion.matches ? 0 : 1100 + Math.random() * 600, delay: reducedMotion.matches ? 0 : i * 35, easing: 'cubic-bezier(.42,0,1,1)', fill: 'forwards'});
    return animation.finished.then(() => {
      // Anchor landed letters to the screen floor, even while the page scrolls.
      letter.style.left = `${targetX / window.innerWidth * 100}%`;
      letter.style.top = 'auto';
      letter.style.bottom = `${pileHeight + 4}px`;
      letter.style.transform = `rotate(${rotation}deg)`;
      animation.cancel();
    });
  }));
}
for (const paragraph of document.querySelectorAll('#text p')) {
  const tokens = paragraph.textContent.split(/([\p{L}]+(?:[’'][\p{L}]+)*)/u);
  paragraph.replaceChildren(...tokens.map(token => {
    const alternatives = alternativesFor(token);
    if (!alternatives) return document.createTextNode(token);
    const word = document.createElement('span');
    word.className = 'word';
    word.tabIndex = 0;
    word.setAttribute('role', 'button');
    word.setAttribute('aria-label', token);
    const reserve = document.createElement('span');
    reserve.className = 'reserve';
    reserve.setAttribute('aria-hidden', 'true');
    const visible = document.createElement('span');
    visible.className = 'visible';
    visible.textContent = token;
    word.append(reserve, visible);
    const history = [token.toLowerCase()];
    let busy = false;
    // Reserve the widest association so the word returns to the same location.
    reserve.textContent = token;
    requestAnimationFrame(() => {
      let widest = token;
      let width = 0;
      for (const alternative of alternatives) {
        reserve.textContent = matchCase(alternative, token);
        const measured = reserve.getBoundingClientRect().width;
        if (measured > width) { width = measured; widest = reserve.textContent; }
      }
      reserve.textContent = widest;
    });

    async function transform() {
      if (busy) return;
      busy = true;
      try {
        const falling = dropLetters(visible);
        visible.style.visibility = 'hidden';
        await falling;
        const next = nextAssociation(visible.textContent, history);
        history.push(next.toLowerCase());
        if (history.length > 6) history.shift();
        const replacement = matchCase(next, token);
        // Keep room for a new association reached beyond the original word's group.
        if (replacement.length > reserve.textContent.length) reserve.textContent = replacement;
        visible.textContent = replacement;
        word.setAttribute('aria-label', replacement);
        visible.style.opacity = '0';
        visible.style.visibility = '';
        const returning = visible.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 2400, delay: 450, easing: 'ease-in-out', fill: 'forwards' });
        await returning.finished;
        visible.style.opacity = '';
        returning.cancel();
      } finally { busy = false; }
    }
    word.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') transform(); });
    word.addEventListener('click', transform);
    word.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); transform(); }
    });
    return word;
  }));
}
