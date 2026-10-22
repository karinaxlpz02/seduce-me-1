const stream = document.querySelector("#word-stream");
const textureFilters = document.querySelector("#texture-filters");
const displacementMaps = new WeakMap();
const noiseThresholds = new WeakMap();
const svgNamespace = "http://www.w3.org/2000/svg";

// Text blocks from the linked Are.na channel.
const notes = [
  "there are parts of me that only exist because i met you",
  "how do you become a home for people? how do you put them at ease, make them feel at home in the strangest of circumstances",
  "heartbreak expands your capacity to love",
  "the consequences of feeling things so deeply",
  "get lost in tiny worlds",
  "habibi everything okay",
  "i hate that i still dream about you",
  "i made us back into strangers because it was the only way i could heal",
  "don't let it consume you, let it guide you",
  "we were meant to love each other, just not forever",
  "how much is your attention worth?",
  "my first kiss, my first friend, my first pet, my first love, my first teacher",
  "i wanted to prove to you i could be loved",
  "careful, you're losing yourself again",
  "if you ever loved me, never tell me",
  "to expect instant responses from anyone is to hope for them to never be absorbed in their own present. Could any hope be less loving?",
  "discipline as love letter to future self",
  "our aliveness is our erotic nature",
  "my desire is safe. My desire is sacred. My desire is a gift.",
  "no person, place or thing is my protection and safety—only love itself",
  "venus in her highest octave",
  "the softening of the karmic knot",
  "your erotic field carries memory, intention, ancestral echoes, and creative power"
].filter(note => note.trim().split(/\s+/).length >= 5);

const maxRows = 10;
const characterDelay = 60;
const maximumDisplacement = 40.8;
let previousNote = -1;

function updateTexture() {
  const now = performance.now();
  for (const line of stream.querySelectorAll(".note-line[data-born]")) {
    const age = Math.min((now - Number(line.dataset.born)) / 7000, 1);
    const map = displacementMaps.get(line);
    map.setAttribute("scale", (maximumDisplacement * age).toFixed(2));
    noiseThresholds.get(line).setAttribute("intercept", (-.1 - age * 10.1).toFixed(2));
  }
}

function createLineFilter(line) {
  const id = `texture-line-${createLineFilter.nextId++}`;
  const filter = document.createElementNS(svgNamespace, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-100%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "300%");
  filter.setAttribute("filterUnits", "objectBoundingBox");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const turbulence = document.createElementNS(svgNamespace, "feTurbulence");
  turbulence.setAttribute("type", "fractalNoise");
  turbulence.setAttribute("baseFrequency", "0.25 0.25");
  turbulence.setAttribute("numOctaves", "3");
  turbulence.setAttribute("seed", "2718");
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
  line.dataset.filterId = id;
  line.dataset.born = performance.now();
  line.style.filter = `url(#${id})`;
  displacementMaps.set(line, displacement);
  noiseThresholds.set(line, alpha);
}

createLineFilter.nextId = 0;

function wordsPerLine(note) {
  const words = note.trim().split(/\s+/);
  const lineCount = Math.max(1, Math.floor(words.length / 5));
  const baseSize = Math.floor(words.length / lineCount);
  const extraWords = words.length % lineCount;
  const lines = [];
  let offset = 0;

  for (let line = 0; line < lineCount; line++) {
    const length = baseSize + (line < extraWords ? 1 : 0);
    lines.push(words.slice(offset, offset + length).join(" "));
    offset += length;
  }
  return lines;
}

function keepLatestRows() {
  stream.scrollTop = stream.scrollHeight;
  while (stream.childElementCount > maxRows) {
    const oldest = stream.firstElementChild;
    textureFilters.querySelector(`#${oldest.dataset.filterId}`)?.remove();
    oldest.remove();
  }
  stream.scrollTop = stream.scrollHeight;
}

function addLine() {
  const line = document.createElement("div");
  line.className = "note-line";
  createLineFilter(line);
  stream.append(line);
  keepLatestRows();
  return line;
}

function appendLetters(line, text) {
  for (const character of text) {
    if (character === " ") {
      line.append(document.createTextNode(" "));
      continue;
    }
    const letter = document.createElement("span");
    letter.className = "letter";
    letter.textContent = character;
    line.append(letter);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeLine(text) {
  const line = addLine();
  for (const character of text) {
    appendLetters(line, character);
    keepLatestRows();
    await wait(characterDelay);
  }
  await wait(180);
}

async function writeNote(note) {
  const lines = wordsPerLine(note);
  for (const line of lines) await writeLine(line);

  const ornament = addLine();
  ornament.classList.add("passage-break");
  ornament.append(document.createTextNode("⚜"));
  keepLatestRows();
  await wait(1100);
}

async function run() {
  while (true) {
    let index = Math.floor(Math.random() * notes.length);
    if (notes.length > 1 && index === previousNote) index = (index + 1) % notes.length;
    previousNote = index;
    await writeNote(notes[index]);
  }
}

if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const staticText = notes.slice(0, maxRows - 1);
  for (const note of staticText) {
    const line = addLine();
    appendLetters(line, note);
  }
  const ornament = addLine();
  ornament.classList.add("passage-break");
  ornament.textContent = "⚜";
} else {
  run();
}

updateTexture();
setInterval(updateTexture, 100);
