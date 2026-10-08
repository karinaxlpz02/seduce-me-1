import { alternativesFor, relatedWordsFor, nextAssociation, matchCase } from './words.js?v=1';

await document.fonts.ready;

const revealDelay = 500;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

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
    const markerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    markerSvg.setAttribute('viewBox', '0 0 24 20');
    markerSvg.innerHTML = '<path d="M12 3 4 16h16L12 3Z" />';
    marker.append(markerSvg);
    for (let dot = 0; dot < 3; dot++) marker.append(document.createElement('i'));

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
    for (let i = 0; i < 6; i++) {
      const node = document.createElement('span');
      node.className = 'map-word';
      node.style.setProperty('--node-x', `${positions[i][0] / 260 * 100}%`);
      node.style.setProperty('--node-y', `${positions[i][1]}px`);
      map.append(node);
    }
    word.append(reserve, visible, marker, map);

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
      const related = relatedWordsFor(replacement);
      map.querySelectorAll('.map-word').forEach((node, nodeIndex) => { node.textContent = related[nodeIndex] || ''; });
      word.setAttribute('aria-label', replacement);
      word.classList.add('revealed');
    }

    function startTimer() {
      if (moving && !timer && !word.classList.contains('revealed')) timer = window.setTimeout(revealNext, revealDelay);
    }

    const initialRelated = relatedWordsFor(token);
    map.querySelectorAll('.map-word').forEach((node, nodeIndex) => { node.textContent = initialRelated[nodeIndex] || ''; });

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
