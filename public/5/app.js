const stream = document.querySelector("#word-stream");
const scatter = document.querySelector("#scatter");
const scatterContext = scatter.getContext("2d");
const letterFlecks = new WeakMap();

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
const maximumScatter = 24;
let previousNote = -1;
let pixelRatio = 1;

function makeFlecks(letter) {
  let seed = Math.floor(Number(letter.dataset.born) * 1000) + letter.dataset.letter.codePointAt(0);
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 28 }, () => ({
    x: random(),
    y: random(),
    scatterX: random() * 2 - 1,
    scatterY: random() * 2 - 1,
    size: .35 + random() * 1.35,
    length: .5 + random() * 4,
    angle: random() * Math.PI * 2,
    reveal: random()
  }));
}

function resizeScatter() {
  pixelRatio = Math.min(devicePixelRatio || 1, 2);
  scatter.width = Math.round(innerWidth * pixelRatio);
  scatter.height = Math.round(innerHeight * pixelRatio);
  scatter.style.width = `${innerWidth}px`;
  scatter.style.height = `${innerHeight}px`;
  scatterContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function updateTexture() {
  const now = performance.now();
  scatterContext.clearRect(0, 0, innerWidth, innerHeight);

  for (const letter of stream.querySelectorAll(".letter[data-born]")) {
    const age = Math.min((now - Number(letter.dataset.born)) / 9000, 1);
    letter.style.setProperty("--texture-level", age.toFixed(2));
    if (age < .08) continue;

    const rect = letter.getBoundingClientRect();
    const flecks = letterFlecks.get(letter) || [];
    const spread = maximumScatter * age;
    scatterContext.fillStyle = `rgba(12, 12, 14, ${Math.min(.82, age * .88)})`;
    scatterContext.strokeStyle = `rgba(12, 12, 14, ${Math.min(.72, age * .76)})`;

    for (const fleck of flecks) {
      if (age < fleck.reveal) continue;
      const x = rect.left + fleck.x * rect.width + fleck.scatterX * spread;
      const y = rect.top + fleck.y * rect.height + fleck.scatterY * spread;
      if (fleck.length < 1.3) {
        scatterContext.fillRect(x, y, fleck.size, fleck.size);
      } else {
        scatterContext.lineWidth = fleck.size;
        scatterContext.beginPath();
        scatterContext.moveTo(x, y);
        scatterContext.lineTo(x + Math.cos(fleck.angle) * fleck.length, y + Math.sin(fleck.angle) * fleck.length);
        scatterContext.stroke();
      }
    }
  }
}

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
  while (stream.childElementCount > maxRows) stream.firstElementChild.remove();
  stream.scrollTop = stream.scrollHeight;
}

function addLine(text) {
  const line = document.createElement("div");
  line.className = "note-line";
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
    letter.dataset.letter = character;
    letter.dataset.born = performance.now();
    letter.style.setProperty("--grain-x", `${Math.random() * 128}px`);
    letter.style.setProperty("--grain-y", `${Math.random() * 128}px`);
    letterFlecks.set(letter, makeFlecks(letter));
    line.append(letter);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeLine(text) {
  const line = addLine(text);
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

  const ornament = addLine("⚜");
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
    const line = addLine(note);
    appendLetters(line, note);
  }
  const ornament = addLine("⚜");
  ornament.classList.add("passage-break");
  ornament.textContent = "⚜";
} else {
  run();
}

resizeScatter();
updateTexture();
addEventListener("resize", resizeScatter);
setInterval(updateTexture, 50);
