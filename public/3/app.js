import { alternativesFor, relatedWordsFor, nextAssociation, matchCase } from './words.js?v=1';

await document.fonts.ready;

const revealDelay = 1000;
const leaveDelay = 260;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const networkLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
networkLayer.classList.add('network-layer');
networkLayer.setAttribute('aria-hidden', 'true');
document.body.append(networkLayer);
let activeWord;
let connections = [];

function markerCenter(word) {
  const rect = word.querySelector('.word-marker').getBoundingClientRect();
  return [rect.left + rect.width / 2, rect.top + rect.height / 2];
}

function drawConnections() {
  networkLayer.replaceChildren();
  for (const [source, target] of connections) {
    if (source === activeWord || target === activeWord || source.classList.contains('revealed') || target.classList.contains('revealed')) continue;
    const [sourceX, sourceY] = markerCenter(source);
    const [targetX, targetY] = markerCenter(target);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(sourceX));
    line.setAttribute('y1', String(sourceY));
    line.setAttribute('x2', String(targetX));
    line.setAttribute('y2', String(targetY));
    networkLayer.append(line);
  }
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
    word.setAttribute('aria-label', 'Hidden word. Hover here for one second to reveal its next association.');

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
      }, 720);
    }

    function beginHover() {
      clearTimeout(leaveTimer);
      clearTimeout(restoreTimer);
      word.classList.remove('leaving');
      marker.querySelectorAll('.extra-dot').forEach(point => point.remove());
      for (let dot = 0; dot < 6; dot++) {
        const point = document.createElement('i');
        point.className = 'extra-dot';
        point.style.setProperty('--dot-index', dot);
        point.style.setProperty('--dx', `${(dot - 2.5) * 8}px`);
        point.style.setProperty('--dy', `${-8 - (dot % 3) * 7}px`);
        point.style.animationDelay = `${dot * 55}ms`;
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
        activeWord = undefined;
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
      word.dataset.word = replacement.toLowerCase();
      reserve.textContent = replacement;
      sprinkleAnimations = [];
      visible.replaceChildren(...Array.from(replacement, (character, letterIndex) => {
        const letter = document.createElement('span');
        letter.className = 'sprinkle-letter';
        letter.textContent = character;
        const x = `${(Math.random() - .5) * 22}px`;
        const y = `${-8 - Math.random() * 16}px`;
        const animation = letter.animate([
          { opacity: 0, transform: `translate(${x}, ${y}) scale(.65)`, filter: 'blur(3px)' },
          { opacity: 1, transform: 'translate(0, 0) scale(1)', filter: 'blur(0)' }
        ], { duration: reducedMotion.matches ? 0 : 820, delay: reducedMotion.matches ? 0 : letterIndex * 42, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' });
        sprinkleAnimations.push(animation);
        return letter;
      }));
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
    return word;
  }));
}

buildConnections();
drawConnections();
