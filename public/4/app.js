const stream = document.querySelector("#word-stream");

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
let previousNote = -1;
let rowCount = 0;

function keepLatestRows() {
  while (stream.childElementCount > maxRows) stream.firstElementChild.remove();
}

function addNoteRow(side) {
  const row = document.createElement("div");
  row.className = `note-row ${side}`;
  const leftOrnament = document.createElement("span");
  leftOrnament.className = "ornament";
  leftOrnament.textContent = "⚜";
  const text = document.createElement("span");
  text.className = "note-text";
  const rightOrnament = leftOrnament.cloneNode(true);
  row.append(leftOrnament, text, rightOrnament);
  stream.append(row);
  keepLatestRows();
  return text;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeNote(note) {
  const side = rowCount++ % 2 === 0 ? "left" : "right";
  const text = addNoteRow(side);
  for (const character of note) {
    if (character === " ") {
      text.append(document.createTextNode(" "));
    } else {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = character;
      text.append(letter);
    }
    await wait(characterDelay);
  }
  await wait(900);
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
  notes.slice(0, maxRows).forEach((note, index) => {
    const text = addNoteRow(index % 2 === 0 ? "left" : "right");
    text.textContent = note;
  });
} else {
  run();
}
