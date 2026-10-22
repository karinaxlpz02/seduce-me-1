const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

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

function stitch(x, y, scale, rotation, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.strokeStyle = `rgb(38 49 57 / ${alpha})`;
  ctx.lineWidth = 1.25;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-3, -3); ctx.lineTo(3, 3);
  ctx.moveTo(3, -3); ctx.lineTo(-3, 3);
  ctx.moveTo(0, -4.4); ctx.lineTo(0, 4.4);
  ctx.moveTo(-4.4, 0); ctx.lineTo(4.4, 0);
  ctx.stroke();
  ctx.restore();
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

  const cx = width / 2;
  const cy = height / 2;
  const pulse = reduceMotion.matches ? 0 : Math.sin(time * .0013);
  const turn = reduceMotion.matches ? 0 : Math.sin(time * .00042) * .035;
  const offset = 17 + pulse * 1.2;
  stitch(cx - offset, cy - offset, 1 + pulse * .045, turn, .7);
  stitch(cx + offset, cy - offset, 1 - pulse * .04, -turn, .62);
  stitch(cx - offset, cy + offset, 1 - pulse * .035, -turn, .62);
  stitch(cx + offset, cy + offset, 1 + pulse * .04, turn, .7);
  ctx.fillStyle = "rgb(38 49 57 / 42%)";
  ctx.beginPath();
  ctx.arc(cx + Math.sin(time * .00065) * 1.6, cy + Math.cos(time * .0008) * 1.2, 1.2, 0, Math.PI * 2);
  ctx.fill();

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
