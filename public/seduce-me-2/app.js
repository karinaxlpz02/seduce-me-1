import { alternativesFor, matchCase } from './words.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    let index = alternatives.indexOf(token.toLowerCase());
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
        const rotate = (index % 2 ? -1 : 1) * 12;
        const falling = reducedMotion.matches
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: `translateY(100px) rotate(${rotate}deg)`, opacity: 0 }];
        const fall = visible.animate(falling, { duration: 700, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
        await fall.finished;
        index = (index + 1) % alternatives.length;
        const replacement = matchCase(alternatives[index], token);
        visible.textContent = replacement;
        word.setAttribute('aria-label', replacement);
        // Cancel the falling transform while keeping the replacement invisible.
        visible.style.opacity = '0';
        fall.cancel();
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
