const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const stream = document.querySelector("#word-stream");

// Words are sampled from the channel's text blocks; repeats are part of the loop.
const notes = [
  "there are parts of me that only exist because i met you",
  "how do you become a home for people how do you put them at ease make them feel at home in the strangest of circumstances",
  "heartbreak expands your capacity to love",
  "the consequences of feeling things so deeply",
  "get lost in tiny worlds",
  "habibi everything okay",
  "i hate that i still dream about you",
  "i made us back into strangers because it was the only way i could heal",
  "don't let it consume you let it guide you",
  "we were meant to love each other just not forever",
  "how much is your attention worth",
  "my first kiss my first friend my first pet my first love my first teacher",
  "i wanted to prove to you i could be loved",
  "careful you're losing yourself again",
  "if you ever loved me never tell me",
  "to expect instant responses from anyone is to hope for them to never be absorbed in their own present could any hope be less loving",
  "discipline as love letter to future self",
  "our aliveness is our erotic nature",
  "my desire is safe my desire is sacred my desire is a gift",
  "no person place or thing is my protection and safety only love itself",
  "venus in her highest octave",
  "the softening of the karmic knot",
  "your erotic field carries memory intention ancestral echoes and creative power"
];
const words = notes.join(" ").toLowerCase().match(/[\p{L}\p{N}’'-]+/gu);
const rows = [];
const maxRows = 10;
const motionDuration = 1450;
const motionEasing = "cubic-bezier(.4, 0, .2, 1)";

function addWord() {
  const word = words[Math.floor(Math.random() * words.length)];
  const row = document.createElement("div");
  row.className = "word-row";
  row.textContent = word;
  row.setAttribute("aria-hidden", "true");

  const wasFull = rows.length === maxRows;
  const exiting = wasFull ? rows.shift() : null;
  if (exiting) {
    exiting.animate([
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { transform: "translateY(-100%) scale(0)", opacity: 0 }
    ], { duration: motionDuration, easing: motionEasing, fill: "forwards" });
    setTimeout(() => exiting.remove(), motionDuration);
  }

  rows.forEach((existing, index) => {
    const oldIndex = wasFull ? index + 1 : index;
    const oldSlot = wasFull ? oldIndex : maxRows - (rows.length + 1) + oldIndex + 1;
    const newSlot = maxRows - (rows.length + 1) + index;
    existing.animate([
      { transform: `translateY(${oldSlot * 100}%) scale(1)`, opacity: 1 },
      { transform: `translateY(${newSlot * 100}%) scale(1)`, opacity: 1 }
    ], { duration: motionDuration, easing: motionEasing, fill: "forwards" });
  });

  stream.append(row);
  const index = maxRows - (rows.length + 1) + rows.length;
  row.animate([
    { transform: `translateY(${(index + 1) * 100}%) scale(0)`, opacity: 0 },
    { transform: `translateY(${index * 100}%) scale(1)`, opacity: 1 }
  ], { duration: motionDuration, easing: motionEasing, fill: "forwards" });
  rows.push(row);
}

if (reduceMotion.matches) {
  for (let i = 0; i < maxRows; i++) {
    const row = document.createElement("div");
    row.className = "word-row";
    row.textContent = words[Math.floor(Math.random() * words.length)];
    row.style.transform = `translateY(${i * 100}%)`;
    stream.append(row);
  }
} else {
  addWord();
  const ticker = setInterval(addWord, 1700);
}
