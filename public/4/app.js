const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d", { alpha: false });
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
const motionDuration = 820;

function addWord() {
  const word = words[Math.floor(Math.random() * words.length)];
  const row = document.createElement("div");
  row.className = "word-row";
  row.textContent = word;
  row.setAttribute("aria-hidden", "true");

  const wasFull = rows.length === 5;
  const exiting = wasFull ? rows.shift() : null;
  if (exiting) {
    exiting.animate([
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { transform: "translateY(-100%) scale(0)", opacity: 0 }
    ], { duration: motionDuration, easing: "cubic-bezier(.22,.72,.22,1)", fill: "forwards" });
    setTimeout(() => exiting.remove(), motionDuration);
  }

  rows.forEach((existing, index) => {
    const oldIndex = wasFull ? index + 1 : index;
    const oldSlot = wasFull ? oldIndex : 5 - (rows.length + 1) + oldIndex + 1;
    const newSlot = 5 - (rows.length + 1) + index;
    existing.animate([
      { transform: `translateY(${oldSlot * 100}%) scale(1)`, opacity: 1 },
      { transform: `translateY(${newSlot * 100}%) scale(1)`, opacity: 1 }
    ], { duration: motionDuration, easing: "cubic-bezier(.22,.72,.22,1)", fill: "forwards" });
  });

  stream.append(row);
  const index = 5 - (rows.length + 1) + rows.length;
  row.animate([
    { transform: `translateY(${(index + 1) * 100}%) scale(0)`, opacity: 0 },
    { transform: `translateY(${index * 100}%) scale(1)`, opacity: 1 }
  ], { duration: motionDuration, easing: "cubic-bezier(.22,.72,.22,1)", fill: "forwards" });
  rows.push(row);
}

if (reduceMotion.matches) {
  for (let i = 0; i < 5; i++) {
    const row = document.createElement("div");
    row.className = "word-row";
    row.textContent = words[Math.floor(Math.random() * words.length)];
    row.style.transform = `translateY(${i * 100}%)`;
    stream.append(row);
  }
} else {
  addWord();
  const ticker = setInterval(addWord, 1000);
}

let width = 0;
let height = 0;
let pixelRatio = 1;
let frame = 0;
let texture;
let textureCtx;

function makeTexture() {
  const size = 180;
  texture = document.createElement("canvas");
  texture.width = texture.height = size;
  textureCtx = texture.getContext("2d");

  textureCtx.fillStyle = "#e9eff2";
  textureCtx.fillRect(0, 0, size, size);

  // A fine diagonal weave, like pale cloth seen close up.
  for (let i = -size; i < size * 2; i += 4) {
    textureCtx.strokeStyle = i % 8 === 0 ? "rgb(94 118 132 / 8%)" : "rgb(255 255 255 / 24%)";
    textureCtx.lineWidth = 1;
    textureCtx.beginPath();
    textureCtx.moveTo(i, 0);
    textureCtx.lineTo(i - size, size);
    textureCtx.stroke();
  }

  // Small irregular fibers soften the repeated thread pattern.
  let seed = 41;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 1500; i++) {
    const x = random() * size;
    const y = random() * size;
    const light = random() > .48;
    textureCtx.fillStyle = light ? "rgb(255 255 255 / 18%)" : "rgb(71 95 110 / 10%)";
    textureCtx.fillRect(x, y, 1, 1);
  }
}

function resize() {
  pixelRatio = Math.min(devicePixelRatio || 1, 2);
  width = innerWidth;
  height = innerHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  makeTexture();
}

function draw(time = 0) {
  ctx.clearRect(0, 0, width, height);
  const drift = reduceMotion.matches ? 0 : time * .008;
  const pattern = ctx.createPattern(texture, "repeat");
  ctx.save();
  ctx.translate((drift % 16) - 8, (drift * .38 % 16) - 8);
  ctx.fillStyle = pattern;
  ctx.fillRect(-20, -20, width + 40, height + 40);
  ctx.restore();

  if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
}

resize();
draw();
if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
addEventListener("resize", resize);
reduceMotion.addEventListener("change", () => {
  cancelAnimationFrame(frame);
  draw();
  if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
});
