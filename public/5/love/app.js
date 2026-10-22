import { notes } from "../notes.js";

const output = document.querySelector("#love-note");
const characterDelay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 55;
const words = notes.flatMap(note => note.trim().split(/\s+/));
let previous = -1;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showNote(text) {
  output.classList.remove("leaving");
  output.replaceChildren();
  for (const character of text) {
    const letter = document.createElement("span");
    letter.className = "love-letter";
    letter.textContent = character;
    output.append(letter);
    if (characterDelay) await wait(characterDelay);
  }
  await wait(520);
  output.classList.add("leaving");
  await wait(320);
}

async function play() {
  while (true) {
    let index = Math.floor(Math.random() * words.length);
    if (words.length > 1 && index === previous) index = (index + 1) % words.length;
    previous = index;
    await showNote(words[index]);
  }
}

play();
