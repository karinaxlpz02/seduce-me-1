import { alternativesFor, relatedWordsFor, nextAssociation, matchCase } from './words.js?v=1';

await document.fonts.ready;

const revealDelay = 500;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const networkLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
networkLayer.classList.add('network-layer');
networkLayer.setAttribute('aria-hidden', 'true');
document.body.append(networkLayer);
let activeWord;

function markerCenter(word) {
  const rect = word.querySelector('.word-marker').getBoundingClientRect();
  return [rect.left + rect.width / 2, rect.top + rect.height / 2];
}

function drawConnections(word) {
  networkLayer.replaceChildren();
  if (!word || word.classList.contains('revealed')) return;

  const [sourceX, sourceY] = markerCenter(word);
  const related = new Set(relatedWordsFor(word.dataset.word));
  for (const term of related) {
    const target = [...document.querySelectorAll('.word')].find(candidate =>
      candidate !== word && candidate.dataset.word === term && !candidate.classList.contains('revealed')
    );
    if (!target) continue;
    const [targetX, targetY] = markerCenter(target);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(sourceX));
    line.setAttribute('y1', String(sourceY));
    line.setAttribute('x2', String(targetX));
    line.setAttribute('y2', String(targetY));
    networkLayer.append(line);
  }
}

window.addEventListener('scroll', () => drawConnections(activeWord), { passive: true });
window.addEventListener('resize', () => drawConnections(activeWord));

for (const paragraph of document.querySelectorAll('#text p')) {
  const tokens = paragraph.textContent.split(/([\p{L}]+(?:[’'\-][\p{L}]+)*)/u);
  const candidates = tokens.flatMap((token, index) => alternativesFor(token) ? [index] : []);
  const randomizedIndex = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : -1;

  paragraph.replaceChildren(...tokens.map((token, index) => {
    const alternatives = alternativesFor(token);
    if (!alternatives) return document.createTextNode(token);

    // A single associated word in each paragraph varies on every page entry.
    if (index === randomizedIndex) {
      const choices = alternatives.filter(choice => choice !== token.toLowerCase());
      if (choices.length) {
        const variation = choices[Math.floor(Math.random() * choices.length)];
        return document.createTextNode(matchCase(variation, token));
      }
    }

    const word = document.createElement('span');
    word.className = 'word';
    word.dataset.word = token.toLowerCase();
    word.tabIndex = 0;
    word.setAttribute('role', 'button');
    word.setAttribute('aria-label', 'Hidden word. Move the pointer here for half a second to reveal its next association.');

    const reserve = document.createElement('span');
    reserve.className = 'reserve';
    reserve.setAttribute('aria-hidden', 'true');
    reserve.textContent = token;

    const visible = document.createElement('span');
    visible.className = 'visible';
    visible.textContent = token;
    visible.setAttribute('aria-hidden', 'true');

    const marker = document.createElement('span');
    marker.className = 'word-marker';
    marker.setAttribute('aria-hidden', 'true');
    for (let dot = 0; dot < 3; dot++) marker.append(document.createElement('i'));

    word.append(reserve, visible, marker);

    const history = [token.toLowerCase()];
    let timer;
    let moving = false;
    let lastPoint;

    function hide() {
      clearTimeout(timer);
      timer = undefined;
      moving = false;
      lastPoint = undefined;
      word.classList.remove('revealed');
    }

    function revealNext() {
      timer = undefined;
      if (!moving) return;
      const current = visible.textContent;
      const next = nextAssociation(current, history);
      history.push(next.toLowerCase());
      if (history.length > 6) history.shift();
      const replacement = matchCase(next, token);
      word.dataset.word = replacement.toLowerCase();
      reserve.textContent = replacement;
      visible.replaceChildren(...Array.from(replacement, (character, letterIndex) => {
        const letter = document.createElement('span');
        letter.className = 'sprinkle-letter';
        letter.textContent = character;
        const x = `${(Math.random() - .5) * 22}px`;
        const y = `${-8 - Math.random() * 16}px`;
        letter.animate([
          { opacity: 0, transform: `translate(${x}, ${y}) scale(.65)`, filter: 'blur(3px)' },
          { opacity: 1, transform: 'translate(0, 0) scale(1)', filter: 'blur(0)' }
        ], { duration: reducedMotion.matches ? 0 : 420, delay: reducedMotion.matches ? 0 : letterIndex * 26, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' });
        return letter;
      }));
      word.setAttribute('aria-label', replacement);
      word.classList.add('revealed');
      drawConnections(word);
    }

    function startTimer() {
      if (moving && !timer && !word.classList.contains('revealed')) timer = window.setTimeout(revealNext, revealDelay);
    }

    word.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const point = `${event.clientX},${event.clientY}`;
      if (point === lastPoint) return;
      lastPoint = point;
      moving = true;
      startTimer();
    });
    word.addEventListener('pointerenter', () => { activeWord = word; drawConnections(word); });
    word.addEventListener('pointerleave', () => { hide(); activeWord = undefined; networkLayer.replaceChildren(); });
    word.addEventListener('focus', () => { activeWord = word; drawConnections(word); moving = true; startTimer(); });
    word.addEventListener('blur', () => { hide(); activeWord = undefined; networkLayer.replaceChildren(); });
    word.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (word.classList.contains('revealed')) hide();
        else { moving = true; startTimer(); }
      }
    });
    return word;
  }));
}
