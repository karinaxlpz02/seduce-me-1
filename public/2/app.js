import { alternativesFor, nextAssociation, matchCase } from './words.js?v=7';

await document.fonts.ready;

const revealDelay = 1000;

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

    const cloud = document.createElement('span');
    cloud.className = 'word-dots';
    cloud.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 7; i++) cloud.append(document.createElement('i'));
    word.append(reserve, visible, cloud);

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
      visible.textContent = replacement;
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
