import { notes } from "./notes.js";

const stream = document.querySelector("#word-stream");
const flow = document.querySelector("#note-flow");
const textureFilters = document.querySelector("#texture-filters");
const displacementMaps = new WeakMap();
const noiseThresholds = new WeakMap();
const svgNamespace = "http://www.w3.org/2000/svg";
const relatedWords = /^(?:desire|desires|desired|desiring|love|loves|loved|loving|lover|lovers|beloved|erotic|erotica|intimacy|intimate|passion|passionate|longing|yearn|yearning|crave|craving|heart|heartbreak|kiss|kisses|affection|tenderness|pleasure|sensual|sensuality|lust|care|devotion|desire's|love's)[’']?$/i;
const maxDisintegrationAge = 18000;
const maximumDisplacement = 40.8;
let previousNote = -1;

function createNoteFilter(note) {
  const id = `texture-note-${createNoteFilter.nextId++}`;
  const filter = document.createElementNS(svgNamespace, "filter");
  filter.id = id;
  filter.setAttribute("x", "-30%");
  filter.setAttribute("y", "-60%");
  filter.setAttribute("width", "160%");
  filter.setAttribute("height", "220%");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const turbulence = document.createElementNS(svgNamespace, "feTurbulence");
  turbulence.setAttribute("type", "fractalNoise");
  turbulence.setAttribute("baseFrequency", "0.25 0.25");
  turbulence.setAttribute("numOctaves", "3");
  turbulence.setAttribute("seed", String(2718 + createNoteFilter.nextId));
  turbulence.setAttribute("result", "texture-noise");

  const displacement = document.createElementNS(svgNamespace, "feDisplacementMap");
  displacement.setAttribute("in", "SourceGraphic");
  displacement.setAttribute("in2", "texture-noise");
  displacement.setAttribute("scale", "0");
  displacement.setAttribute("xChannelSelector", "R");
  displacement.setAttribute("yChannelSelector", "G");
  displacement.setAttribute("result", "displaced-text");

  const grayscale = document.createElementNS(svgNamespace, "feColorMatrix");
  grayscale.setAttribute("in", "texture-noise");
  grayscale.setAttribute("type", "matrix");
  grayscale.setAttribute("values", "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .333 .333 .333 0 0");
  grayscale.setAttribute("result", "grain-alpha");

  const transfer = document.createElementNS(svgNamespace, "feComponentTransfer");
  transfer.setAttribute("in", "grain-alpha");
  transfer.setAttribute("result", "disintegrate-mask");
  const alpha = document.createElementNS(svgNamespace, "feFuncA");
  alpha.setAttribute("type", "linear");
  alpha.setAttribute("slope", "12");
  alpha.setAttribute("intercept", "-0.1");
  transfer.append(alpha);

  const fragment = document.createElementNS(svgNamespace, "feComposite");
  fragment.setAttribute("in", "displaced-text");
  fragment.setAttribute("in2", "disintegrate-mask");
  fragment.setAttribute("operator", "in");

  filter.append(turbulence, displacement, grayscale, transfer, fragment);
  textureFilters.append(filter);
  note.dataset.filterId = id;
  note.style.filter = `url(#${id})`;
  displacementMaps.set(note, displacement);
  noiseThresholds.set(note, alpha);
}

createNoteFilter.nextId = 0;

function updateTexture() {
  const now = performance.now();
  for (const note of flow.querySelectorAll(".note[data-born]")) {
    const age = Math.min((now - Number(note.dataset.born)) / maxDisintegrationAge, 1);
    displacementMaps.get(note).setAttribute("scale", (maximumDisplacement * age).toFixed(2));
    noiseThresholds.get(note).setAttribute("intercept", (-.1 - age * 10.1).toFixed(2));
  }
}

function pruneScrolledNotes() {
  const cutoff = stream.scrollTop - 120;
  for (const note of flow.querySelectorAll(".note[data-filter-id]")) {
    if (note.offsetTop + note.offsetHeight < cutoff) {
      textureFilters.querySelector(`#${note.dataset.filterId}`)?.remove();
      note.remove();
    }
  }
}

function makeWord(word) {
  const target = relatedWords.test(word.replace(/^[^\p{L}]+|[^\p{L}'’]+$/gu, ""));
  const container = target ? document.createElement("a") : document.createElement("span");
  container.className = target ? "word-link" : "word";
  if (target) container.href = "./love/";
  return container;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeNote(text) {
  const note = document.createElement("span");
  note.className = "note";
  createNoteFilter(note);
  flow.append(note);
  const words = text.split(/(\s+)/);

  for (const part of words) {
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
      await wait(28);
    }
  }

  note.dataset.born = performance.now();
  const star = document.createElement("span");
  star.className = "note-star";
  star.setAttribute("aria-hidden", "true");
  star.textContent = " ✶ ";
  flow.append(star);
  stream.scrollTop = stream.scrollHeight;
  pruneScrolledNotes();
  await wait(220);
}

async function run() {
  while (true) {
    let index = Math.floor(Math.random() * notes.length);
    if (notes.length > 1 && index === previousNote) index = (index + 1) % notes.length;
    previousNote = index;
    await writeNote(notes[index]);
  }
}

stream.addEventListener("scroll", pruneScrolledNotes, { passive: true });
updateTexture();
setInterval(updateTexture, 120);

if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  flow.textContent = notes.join(" ✶ ");
} else {
  run();
}
