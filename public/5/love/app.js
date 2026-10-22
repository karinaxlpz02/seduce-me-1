import { notes } from "../notes.js";

const output = document.querySelector("#love-note");
const characterDelay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 125;
const words = notes.flatMap(note => note.trim().split(/\s+/));
let nextWord = 0;

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
  await wait(850);
  output.classList.add("leaving");
  await wait(620);
}

async function play() {
  while (true) {
    await showNote(words[nextWord]);
    nextWord = (nextWord + 1) % words.length;
  }
}

play();
