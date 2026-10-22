import { notes } from "./notes.js";

const stream = document.querySelector("#word-stream");
const flow = document.querySelector("#note-flow");
const canvas = document.querySelector("#particle-layer");
const context = canvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const relatedWords = /^(?:desire|desires|desired|desiring|love|loves|loved|loving|lover|lovers|beloved|erotic|erotica|intimacy|intimate|passion|passionate|longing|yearn|yearning|crave|craving|heart|heartbreak|kiss|kisses|affection|tenderness|pleasure|sensual|sensuality|lust|care|devotion|adore|adored|adoration|romance|romantic|touch|aliveness)[’']?$/i;
const dissolveAfter = 5000;
const particleLifespan = 9000;
const characterStagger = 420;
const particleGroups = new Set();
let nextNote = 0;
let pixelRatio = 1;

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(window.innerWidth * pixelRatio);
  canvas.height = Math.round(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

function makeWord(word) {
  const cleanWord = word.replace(/^[^\p{L}]+|[^\p{L}'’]+$/gu, "");
  const linked = relatedWords.test(cleanWord);
  const element = document.createElement(linked ? "a" : "span");
  element.className = linked ? "word-link" : "word";
  if (linked) element.href = `./love/?word=${encodeURIComponent(cleanWord.toLowerCase())}`;
  return element;
}

function buildText(note, text) {
  for (const part of text.split(/(\s+)/)) {
    if (/^\s+$/.test(part)) {
      note.append(document.createTextNode(part));
      continue;
    }
    const word = makeWord(part);
    note.append(word);
    for (const character of part) {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = character;
      word.append(letter);
    }
  }
}

function createParticles(letter) {
  const bounds = letter.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;

  const mask = document.createElement("canvas");
  mask.width = Math.max(1, Math.ceil(bounds.width));
  mask.height = Math.max(1, Math.ceil(bounds.height));
  const maskContext = mask.getContext("2d", { willReadFrequently: true });
  maskContext.fillStyle = "#111";
  maskContext.textBaseline = "alphabetic";

  const style = getComputedStyle(letter);
  maskContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  maskContext.fillText(letter.textContent, 0, bounds.height * .82);

  const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
  const candidates = [];
  for (let y = 0; y < mask.height; y += 2) {
    for (let x = 0; x < mask.width; x += 2) {
      if (pixels[(y * mask.width + x) * 4 + 3] > 48) candidates.push({ x, y });
    }
  }

  if (!candidates.length) candidates.push({ x: bounds.width / 2, y: bounds.height / 2 });

  const count = Math.min(candidates.length, 120);
  const stride = Math.max(1, Math.ceil(candidates.length / count));
  const particles = candidates.filter((_, index) => index % stride === 0).slice(0, count).map((point, index) => {
    const seed = (letter.textContent.codePointAt(0) * 31 + index * 67 + point.x * 17 + point.y * 13) % 997;
    const variation = (seed % 31 - 15) / 100;
    const angle = Math.atan2(point.y - bounds.height / 2, point.x - bounds.width / 2) + variation;
    const speed = 14 + (seed * 37 % 100) / 100 * 32;
    return {
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 10,
      size: .55 + (seed * 13 % 100) / 100 * .6,
      phase: (seed % 360) * Math.PI / 180,
      drift: .7 + (seed % 10) / 10
    };
  });

  return { letter, particles, started: performance.now() };
}

function startDisintegration(letter) {
  const group = createParticles(letter);
  letter.classList.add("disintegrating");
  if (group) particleGroups.add(group);
  letter.dataset.particles = "started";
}

function paintParticles(now) {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const group of particleGroups) {
    const age = now - group.started;
    const progress = Math.min(age / particleLifespan, 1);
    const bounds = group.letter.getBoundingClientRect();
    const left = bounds.left;
    const top = bounds.top;
    const spread = Math.min(age / 2600, 1);
    const opacity = Math.min(age / 1500, 1) * Math.pow(1 - progress, 1.5);

    for (const particle of group.particles) {
      const flutterX = Math.sin(age * .0012 + particle.phase) * particle.drift * spread * 5;
      const flutterY = Math.cos(age * .001 + particle.phase) * particle.drift * spread * 4;
      const x = left + particle.x + particle.vx * age * .001 + flutterX;
      const y = top + particle.y + particle.vy * age * .001 + flutterY;
      context.fillStyle = `rgba(17,17,17,${opacity})`;
      context.fillRect(x, y, particle.size, particle.size);
    }

    if (progress >= 1) {
      group.letter.classList.remove("disintegrating");
      group.letter.classList.add("disintegrated");
      particleGroups.delete(group);
    }
  }

  requestAnimationFrame(paintParticles);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeNote(text) {
  const note = document.createElement("span");
  note.className = "note";
  flow.append(note);

  for (const part of text.split(/(\s+)/)) {
    if (/^\s+$/.test(part)) {
      note.append(document.createTextNode(part));
      continue;
    }

    const word = makeWord(part);
    note.append(word);
    for (const character of part) {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = character;
      word.append(letter);
      stream.scrollTop = stream.scrollHeight;
      await wait(reducedMotion ? 0 : 28);
    }
  }

  note.dataset.born = performance.now();
  note._letters = [...note.querySelectorAll(".letter")];
  const star = document.createElement("span");
  star.className = "note-star";
  star.setAttribute("aria-hidden", "true");
  star.textContent = " ✶ ";
  flow.append(star);
  stream.scrollTop = stream.scrollHeight;
  await wait(reducedMotion ? 0 : 220);
}

function updateNotes() {
  const now = performance.now();
  for (const note of flow.querySelectorAll(".note[data-born]")) {
    const elapsed = now - Number(note.dataset.born) - dissolveAfter;
    note._letters?.forEach((letter, index) => {
      if (elapsed >= index * characterStagger && !letter.dataset.particles) startDisintegration(letter);
    });
  }
  const streamTop = stream.getBoundingClientRect().top;
  for (const note of flow.querySelectorAll(".note[data-born]")) {
    const allDissolved = note._letters?.every(letter => letter.classList.contains("disintegrated"));
    if (allDissolved && note.getBoundingClientRect().bottom < streamTop - 120) {
      const separator = note.nextElementSibling;
      if (separator?.classList.contains("note-star")) separator.remove();
      note.remove();
    }
  }
  requestAnimationFrame(updateNotes);
}

async function run() {
  while (true) {
    await writeNote(notes[nextNote]);
    nextNote = (nextNote + 1) % notes.length;
  }
}

function showStaticNotes() {
  notes.forEach((text, index) => {
    const note = document.createElement("span");
    note.className = "note";
    buildText(note, text);
    flow.append(note);
    if (index < notes.length - 1) {
      const star = document.createElement("span");
      star.className = "note-star";
      star.textContent = " ✶ ";
      flow.append(star);
    }
  });
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(updateNotes);
requestAnimationFrame(paintParticles);

if (reducedMotion) showStaticNotes();
else run();
