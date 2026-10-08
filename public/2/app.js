import { alternativesFor, relatedWordsFor, nextAssociation, matchCase } from './words.js?v=8';

await document.fonts.ready;

const revealDelay = 500;

for (const paragraph of document.querySelectorAll('#text p:not(.interaction-hint)')) {
  const tokens = paragraph.textContent.split(/([\p{L}]+(?:[’'\-][\p{L}]+)*)/u);
  paragraph.replaceChildren(...tokens.map(token => {
    const alternatives = alternativesFor(token);
    if (!alternatives) return document.createTextNode(token);

    const word = document.createElement('span');
    word.className = 'word';
    word.tabIndex = 0;
    word.setAttribute('role', 'button');
    word.setAttribute('aria-label', `Hidden word: ${token}. Hover while moving for one second to reveal.`);

    const reserve = document.createElement('span');
    reserve.className = 'reserve';
    reserve.setAttribute('aria-hidden', 'true');
    reserve.textContent = token;

    const visible = document.createElement('span');
    visible.className = 'visible';
    visible.textContent = token;

    const map = document.createElement('span');
    map.className = 'word-map';
    map.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 260 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    const positions = [[34, 16], [130, 16], [226, 16], [34, 54], [130, 54], [226, 54]];
    for (const [x, y] of positions) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '130');
      line.setAttribute('y1', '98');
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(y));
      svg.append(line);
    }
    map.append(svg);
    const related = relatedWordsFor(token);
    for (let i = 0; i < 6; i++) {
      const node = document.createElement('span');
      node.className = 'map-word';
      node.style.setProperty('--node-x', `${positions[i][0] / 260 * 100}%`);
      node.style.setProperty('--node-y', `${positions[i][1]}px`);
      node.textContent = related[i] || '';
      map.append(node);
    }
    const hub = document.createElement('i');
    hub.className = 'map-hub';
    map.append(hub);
    word.append(reserve, visible, map);

    const history = [token.toLowerCase()];
    let timer;
    let busy = false;
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
      if (!moving || busy) return;
      busy = true;
      const next = nextAssociation(visible.textContent, history);
      history.push(next.toLowerCase());
      if (history.length > 6) history.shift();
      const replacement = matchCase(next, token);
      reserve.textContent = replacement;
      visible.replaceChildren(...Array.from(replacement, (character, index) => {
        const letter = document.createElement('span');
        letter.className = 'sprinkle-letter';
        letter.textContent = character;
        const x = `${(Math.random() - .5) * 24}px`;
        const y = `${-10 - Math.random() * 18}px`;
        letter.animate([
          { opacity: 0, transform: `translate(${x}, ${y}) scale(.65)`, filter: 'blur(3px)' },
          { opacity: 1, transform: 'translate(0, 0) scale(1)', filter: 'blur(0)' }
        ], { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 440, delay: index * 28, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' });
        return letter;
      }));
      const nextWords = relatedWordsFor(replacement);
      map.querySelectorAll('.map-word').forEach((node, index) => { node.textContent = nextWords[index] || ''; });
      word.setAttribute('aria-label', replacement);
      word.classList.add('revealed');
      window.setTimeout(() => { busy = false; }, 450);
    }

    function startTimer() {
      if (!moving || timer || word.classList.contains('revealed')) return;
      timer = window.setTimeout(revealNext, revealDelay);
    }

    word.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const point = `${event.clientX},${event.clientY}`;
      if (point === lastPoint) return;
      lastPoint = point;
      moving = true;
      startTimer();
    });
    word.addEventListener('pointerleave', hide);
    word.addEventListener('focus', () => { moving = true; startTimer(); });
    word.addEventListener('blur', hide);
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
