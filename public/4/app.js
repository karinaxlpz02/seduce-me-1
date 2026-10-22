const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const phrase = document.querySelector("#phrase");

const phraseText = phrase.textContent;
phrase.replaceChildren(...[...phraseText].map((character, index) => {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  if (character === " ") {
    span.className = "space";
  } else {
    span.className = "letter";
    span.textContent = character;
    span.style.setProperty("--delay", `${index * .11}s`);
  }
  return span;
}));

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
