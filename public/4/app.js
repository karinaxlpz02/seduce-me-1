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

function textStar(x, y, time, label, index) {
  const radius = Math.min(46, Math.max(20, width * .045), height * .055);
  const phase = time * .00065 + index * 1.7;
  const pulse = reduceMotion.matches ? 0 : Math.sin(phase);
  const sway = reduceMotion.matches ? 0 : Math.sin(phase * .7) * .04;
  const rotation = reduceMotion.matches ? 0 : Math.sin(phase * .55) * .055;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1 + pulse * .025, 1 - pulse * .02);

  // Four embroidered rays frame a small window for the moving letters.
  ctx.strokeStyle = "rgb(38 49 57 / 58%)";
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -radius); ctx.quadraticCurveTo(3, -5, radius, 0);
  ctx.quadraticCurveTo(4, 3, 0, radius);
  ctx.quadraticCurveTo(-3, 5, -radius, 0);
  ctx.quadraticCurveTo(-4, -3, 0, -radius);
  ctx.stroke();

  ctx.beginPath();
  const windowRadius = radius * .66;
  ctx.arc(0, 0, windowRadius + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgb(233 239 242 / 94%)";
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, windowRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgb(38 49 57 / 82%)";
  const fontSize = radius * .36;
  ctx.font = `${fontSize}px "Serifbabe SIGMA Test", Georgia, serif`;
  const rows = label.split("|");
  rows.forEach((row, rowIndex) => {
    const yOffset = (rowIndex - (rows.length - 1) / 2) * fontSize * .92;
    const xOffset = reduceMotion.matches ? 0 : Math.sin(phase + rowIndex) * radius * .12;
    ctx.save();
    ctx.translate(xOffset, yOffset + pulse * radius * .055);
    ctx.rotate(sway);
    ctx.fillText(row, 0, 0);
    ctx.restore();
  });
  ctx.restore();

  // Tiny center stitch echoes the moving point in the reference.
  ctx.fillStyle = `rgb(38 49 57 / ${.32 + Math.abs(pulse) * .2})`;
  ctx.beginPath();
  ctx.arc(Math.sin(phase) * 1.5, Math.cos(phase * .8) * 1.5, 1.1, 0, Math.PI * 2);
  ctx.fill();
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
  const radius = Math.min(46, Math.max(20, width * .045), height * .055);
  const offset = radius * 1.42;
  const labels = ["I|want", "to|feel", "some|thing", "real"];
  textStar(cx - offset, cy - offset, time, labels[0], 0);
  textStar(cx + offset, cy - offset, time, labels[1], 1);
  textStar(cx - offset, cy + offset, time, labels[2], 2);
  textStar(cx + offset, cy + offset, time, labels[3], 3);

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
