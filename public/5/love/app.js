import { notes } from "../notes.js";

const output = document.querySelector("#love-note");
const characterDelay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 125;
const selectedWord = new URLSearchParams(location.search).get("word")?.toLocaleLowerCase();
const matchingNotes = selectedWord
  ? notes.filter(note => note.split(/\s+/).some(word => {
      const cleanWord = word.replace(/^[^\p{L}]+|[^\p{L}'’]+$/gu, "").toLocaleLowerCase();
      return cleanWord === selectedWord;
    }))
  : notes;
const noteWords = matchingNotes.map(note => note.trim().split(/\s+/));
let noteIndex = 0;
let wordIndex = 0;

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
    const words = noteWords[noteIndex];
    await showNote(words[wordIndex]);
    wordIndex += 1;
    if (wordIndex >= words.length) {
      wordIndex = 0;
      noteIndex = (noteIndex + 1) % noteWords.length;
    }
  }
}

play();
