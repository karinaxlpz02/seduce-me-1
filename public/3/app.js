import { alternativesFor, relatedWordsFor, nextAssociation, matchCase } from './words.js?v=1';

await document.fonts.ready;

const revealDelay = 1500;
const leaveDelay = 260;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const networkLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
networkLayer.classList.add('network-layer');
networkLayer.setAttribute('aria-hidden', 'true');
document.body.append(networkLayer);
let activeWord;
let connections = [];
const connectionLines = new Map();

function markerCenter(word) {
  const rect = word.querySelector('.word-marker').getBoundingClientRect();
  return [rect.left + rect.width / 2, rect.top + rect.height / 2];
}

function drawConnections() {
  connections.forEach(([source, target], index) => {
    let line = connectionLines.get(index);
    if (!line) {
      line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      connectionLines.set(index, line);
      networkLayer.append(line);
    }
    const [sourceX, sourceY] = markerCenter(source);
    const [targetX, targetY] = markerCenter(target);
    const origin = activeWord ? markerCenter(activeWord) : undefined;
    const collapsed = activeWord && (source === activeWord || target === activeWord);
    const coords = collapsed ? [origin[0], origin[1], origin[0], origin[1]] : [sourceX, sourceY, targetX, targetY];
    line.style.opacity = source.classList.contains('revealed') || target.classList.contains('revealed') ? '0' : '';
    animateLine(line, coords);
  });
}

function animateLine(line, target) {
  const keys = ['x1', 'y1', 'x2', 'y2'];
  if (!line.hasAttribute('x1')) {
    keys.forEach((key, index) => line.setAttribute(key, String(target[index])));
    return;
  }
  const start = keys.map(key => Number(line.getAttribute(key) ?? target[keys.indexOf(key)]));
  if (start.every((value, index) => Math.abs(value - target[index]) < .5)) return;
  if (line._frame) cancelAnimationFrame(line._frame);
  const began = performance.now();
  const duration = reducedMotion.matches ? 0 : 520;
  const tick = now => {
    const t = duration ? Math.min(1, (now - began) / duration) : 1;
    const eased = 1 - Math.pow(1 - t, 3);
    keys.forEach((key, index) => line.setAttribute(key, String(start[index] + (target[index] - start[index]) * eased)));
    if (t < 1) line._frame = requestAnimationFrame(tick);
    else line._frame = undefined;
  };
  line._frame = requestAnimationFrame(tick);
}

function buildConnections() {
  const words = [...document.querySelectorAll('.word')];
  const edges = new Set();
  connections = [];
  for (const word of words) {
    const related = new Set(relatedWordsFor(word.dataset.word));
    const target = words.find(candidate => candidate !== word && related.has(candidate.dataset.word));
    const fallback = words[(words.indexOf(word) + 1) % words.length];
    const other = target || fallback;
    if (!other || other === word) continue;
    const a = words.indexOf(word);
    const b = words.indexOf(other);
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (edges.has(key)) continue;
    edges.add(key);
    connections.push([word, other]);
  }
}

window.addEventListener('scroll', drawConnections, { passive: true });
window.addEventListener('resize', drawConnections);

let wordCount = 0;
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
    word.setAttribute('aria-label', 'Hidden word. Hover here for one and a half seconds to reveal its next association.');

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
    const rhythms = [
      { duration: 1.02, step: .16 },
      { duration: 1.28, step: .2 },
      { duration: 1.48, step: .24 },
      { duration: 1.16, step: .13 }
    ];
    const rhythm = rhythms[wordCount++ % rhythms.length];
    for (let dot = 0; dot < 3; dot++) {
      const point = document.createElement('i');
      point.style.animationDuration = `${rhythm.duration}s`;
      point.style.animationDelay = `${dot * rhythm.step}s`;
      marker.append(point);
    }

    word.append(reserve, visible, marker);

    const history = [token.toLowerCase()];
    let timer;
    let leaveTimer;
    let restoreTimer;
    let sprinkleAnimations = [];
    let moving = false;
    let lastPoint;

    function hide() {
      clearTimeout(timer);
      timer = undefined;
      moving = false;
      lastPoint = undefined;
      if (word.classList.contains('revealed')) {
        for (const animation of sprinkleAnimations) {
          try { animation.reverse(); } catch { animation.cancel(); }
        }
      }
      word.classList.remove('revealed', 'hovering');
      word.classList.add('leaving');
      clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        word.classList.remove('leaving');
        marker.querySelectorAll('.extra-dot').forEach(point => point.remove());
      }, 1250);
    }

    function beginHover() {
      clearTimeout(leaveTimer);
      clearTimeout(restoreTimer);
      word.classList.remove('leaving');
      marker.querySelectorAll('.extra-dot').forEach(point => point.remove());
      for (let dot = 0; dot < 24; dot++) {
        const point = document.createElement('i');
        point.className = 'extra-dot';
        point.style.setProperty('--dot-index', dot);
        const angle = (Math.PI * 2 * dot) / 24;
        const radius = 14 + (dot % 4) * 7;
        point.style.setProperty('--dx', `${Math.cos(angle) * radius}px`);
        point.style.setProperty('--dy', `${Math.sin(angle) * radius * .7}px`);
        point.style.animationDelay = `${dot * 28}ms`;
        marker.append(point);
      }
      activeWord = word;
      word.classList.add('hovering');
      drawConnections();
      moving = true;
      startTimer();
    }

    function endHover() {
      clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => {
        hide();
        if (activeWord === word) activeWord = undefined;
        drawConnections();
      }, leaveDelay);
    }

    function revealNext() {
      timer = undefined;
      if (!moving) return;
      const current = visible.textContent;
      const next = nextAssociation(current, history);
      history.push(next.toLowerCase());
      if (history.length > 6) history.shift();
      const replacement = matchCase(next, token);
      const oldWidth = word.getBoundingClientRect().width;
      word.dataset.word = replacement.toLowerCase();
      reserve.textContent = replacement;
      sprinkleAnimations = [];
      visible.replaceChildren(...Array.from(replacement, (character, letterIndex) => {
        const letter = document.createElement('span');
        letter.className = 'sprinkle-letter';
        letter.textContent = character;
        const x = `${(Math.random() - .5) * 10}px`;
        const y = `${-4 - Math.random() * 6}px`;
        const animation = letter.animate([
          { opacity: 0, transform: `translate(${x}, ${y}) scale(.94)`, filter: 'blur(1px)' },
          { opacity: 1, transform: 'translate(0, 0) scale(1)', filter: 'blur(0)' }
        ], { duration: reducedMotion.matches ? 0 : 1450, delay: reducedMotion.matches ? 0 : letterIndex * 28, easing: 'cubic-bezier(.33,1,.68,1)', fill: 'both' });
        sprinkleAnimations.push(animation);
        return letter;
      }));
      word.style.width = 'max-content';
      const revealedWidth = word.getBoundingClientRect().width;
      word.style.width = `${oldWidth}px`;
      void word.offsetWidth;
      requestAnimationFrame(() => { word.style.width = `${revealedWidth}px`; });
      word.setAttribute('aria-label', replacement);
      word.classList.add('revealed');
      drawConnections();
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
    word.addEventListener('pointerenter', beginHover);
    word.addEventListener('pointerleave', endHover);
    word.addEventListener('focus', beginHover);
    word.addEventListener('blur', endHover);
    word.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (word.classList.contains('revealed')) hide();
        else { moving = true; startTimer(); }
      }
    });
    word.addEventListener('transitionend', event => {
      if (event.propertyName === 'width') drawConnections();
    });
    return word;
  }));
}

buildConnections();
drawConnections();
