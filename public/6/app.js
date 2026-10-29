import { BrowserWhisper } from "browser-whisper";
import { notes as fallbackNotes } from "./notes.js";

const channelUrl = "https://api.are.na/v3/channels/notes-on-are-na-about-desire/contents";
const modelName = "whisper-tiny";
const modelSize = "about 120 MB";
const ortVersion = "1.22.0";
const vadVersion = "0.0.30";
const homeView = document.querySelector("#home-view");
const archiveView = document.querySelector("#archive-view");
const aboutView = document.querySelector("#about-view");
const archive = document.querySelector("#archive");
const archiveCount = document.querySelector("#archive-count");
const collectionScroll = document.querySelector("#collection-scroll");
const collectionScene = document.querySelector("#collection-scene");
const globe = document.querySelector("#globe");
const edgeNotes = document.querySelector("#edge-notes");
const particleCanvas = document.querySelector("#globe-particles");
const particleContext = particleCanvas.getContext("2d");
const connectionNote = document.querySelector("#connection-note");
const shareDialog = document.querySelector("#share-dialog");
const status = document.querySelector("#record-status");
const transcript = document.querySelector("#transcript");
const shareMessage = document.querySelector("#share-message");
const startButton = document.querySelector("#record-start");
const stopButton = document.querySelector("#record-stop");
const copyButton = document.querySelector("#publish");
const voiceSelect = document.querySelector("#voice-select");
const rateControl = document.querySelector("#rate");
const nowSpeaking = document.querySelector("#now-speaking");

let archiveItems = [];
let archiveLoaded = false;
let globeParticles = [];
let particlesCaptured = false;
let globeProgress = 0;
let globeRotationX = -9;
let globeRotationY = -18;
let dragPoint = null;
let particleFrame = 0;
let particleRatio = 1;
let currentView = (location.hash === "#archive" ? "archive-view" : location.hash === "#about" ? "about-view" : "home-view");
let whisper = createWhisper();
let micVAD;
let prepared = false;
let listening = false;
let processing = false;
let utteranceNumber = 0;
const utteranceQueue = [];
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let liveTranscriptBase = "";

function createWhisper() {
  return new BrowserWhisper({ model: modelName, quantization: "hybrid" });
}

function setStatus(message, speaking = false) {
  status.textContent = message;
  status.classList.toggle("is-recording", speaking);
}

function textFor(item) {
  return item.text || item.content?.plain || item.content?.markdown || item.title || "";
}

function renderArchive(items) {
  archiveItems = items.filter(item => textFor(item).trim());
  const featured = [
    "chronically online",
    "our aliveness is our erotic nature",
    "i kiss you friendly",
    "having a lover is making a quilt",
    "my first kiss",
    "i made us back into strangers",
    "careful, you're losing yourself again",
    "your erotic field carries memory"
  ];
  archiveItems.sort((left, right) => {
    const leftText = textFor(left).trim().toLowerCase();
    const rightText = textFor(right).trim().toLowerCase();
    const leftRank = featured.findIndex(prefix => leftText.startsWith(prefix));
    const rightRank = featured.findIndex(prefix => rightText.startsWith(prefix));
    return (leftRank < 0 ? featured.length : leftRank) - (rightRank < 0 ? featured.length : rightRank);
  });
  archive.replaceChildren();
  globe.replaceChildren();
  edgeNotes.replaceChildren();
  if (!archiveItems.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "The archive is waiting for its first line.";
    archive.append(empty);
  }
  archiveItems.forEach((item, index) => {
    const text = textFor(item).trim();
    const card = document.createElement("button");
    card.type = "button";
    card.className = "desire-card";
    card.setAttribute("aria-pressed", "false");
    const content = document.createElement("span");
    content.textContent = text;
    card.append(content);
    card.setAttribute("aria-label", `Listen to note ${index + 1}: ${text}`);
    card.addEventListener("click", () => speak(text, card));
    archive.append(card);

    if (index < 54) {
      const count = Math.min(54, archiveItems.length);
      const latitude = Math.acos(1 - 2 * (index + .5) / count) * 180 / Math.PI - 90;
      const longitude = index * 137.508;
      const globeNote = document.createElement("button");
      globeNote.type = "button";
      globeNote.className = "globe-note";
      globeNote.style.setProperty("--latitude", `${latitude}deg`);
      globeNote.style.setProperty("--longitude", `${longitude}deg`);
      globeNote.style.setProperty("--tilt", `${((index * 29) % 17) - 8}deg`);
      globeNote.setAttribute("aria-label", `Listen to note ${index + 1}: ${text}`);
      const excerpt = text.length > 118 ? `${text.slice(0, 115).trimEnd()}…` : text;
      globeNote.textContent = excerpt;
      globeNote.addEventListener("click", () => speak(text, globeNote));
      globe.append(globeNote);
    }

    if (index < 4) {
      const edgeNote = document.createElement("span");
      edgeNote.className = `edge-note edge-note-${index % 4}`;
      edgeNote.textContent = text.length > 90 ? `${text.slice(0, 87).trimEnd()}…` : text;
      edgeNotes.append(edgeNote);
    }
  });
  archiveCount.textContent = archiveItems.length;
  archive.setAttribute("aria-busy", "false");
  particlesCaptured = false;
  globeParticles = [];
  updateCollectionScene();
}

async function loadArchive() {
  if (archiveLoaded) return;
  archiveLoaded = true;
  try {
    const items = [];
    let page = 1;
    while (page && page <= 10) {
      const url = new URL(channelUrl);
      url.searchParams.set("per", "100");
      url.searchParams.set("page", String(page));
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Are.na returned ${response.status}`);
      const result = await response.json();
      for (const block of result.data || []) {
        if (block.type !== "Text") continue;
        const text = block.content?.plain || block.content?.markdown || "";
        if (text.trim()) items.push({ id: block.id, text, author: block.user?.name || "notes on desire", user: block.user });
      }
      page = result.meta?.next_page || null;
    }
    renderArchive(items);
    connectionNote.textContent = `Live speech recognition in supported browsers · on-device Whisper fallback (${modelName}, ${modelSize}).`;
  } catch {
    const previewNotes = [
      "Chronically online.",
      "I kiss you friendly,",
      "Having a lover is making a quilt out of many small closed-door rituals until the blanket is so big you can sleep under it every night",
      ...fallbackNotes
    ];
    renderArchive(previewNotes.map((text, index) => ({ text, author: "notes on desire", id: `local-${index}` })));
    connectionNote.textContent = "Showing the saved notes preview. The full Are.na archive could not be reached.";
  }
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  const selected = voiceSelect.value;
  voiceSelect.replaceChildren(new Option("System voice", ""));
  voices.forEach((voice, index) => voiceSelect.add(new Option(`${voice.name} · ${voice.lang}`, String(index))));
  if (selected) voiceSelect.value = selected;
}

function speak(text, card) {
  if (!("speechSynthesis" in window)) {
    nowSpeaking.textContent = "Speech playback is unavailable in this browser.";
    return;
  }
  speechSynthesis.cancel();
  document.querySelector('[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-pressed", "true");
  const utterance = new SpeechSynthesisUtterance(text);
  const voiceIndex = Number(voiceSelect.value);
  if (voiceSelect.value && speechSynthesis.getVoices()[voiceIndex]) utterance.voice = speechSynthesis.getVoices()[voiceIndex];
  utterance.rate = Number(rateControl.value);
  nowSpeaking.textContent = `speaking · ${text}`;
  utterance.onend = () => {
    card.setAttribute("aria-pressed", "false");
    nowSpeaking.textContent = "choose a line to hear it";
  };
  speechSynthesis.speak(utterance);
}

async function prepareModel() {
  setStatus(`Downloading ${modelName} model (${modelSize})…`);
  startButton.disabled = true;
  try {
    await whisper.downloadModel({
      model: modelName,
      quantization: "hybrid",
      onProgress: event => {
        if (event.stage === "loading") setStatus(`Preparing ${modelName} · ${Math.round(event.progress * 100)}%`);
      }
    });
    prepared = true;
    setStatus("Whisper is ready. Starting your microphone…");
    return true;
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "The Whisper model could not be prepared.");
    startButton.disabled = false;
    return false;
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.vad?.MicVAD) {
    setStatus("Microphone transcription is unavailable in this browser.");
    return;
  }
  startButton.disabled = true;
  shareMessage.textContent = "";
  try {
    if (SpeechRecognition) {
      if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = document.documentElement.lang || "en-US";
        recognition.onresult = event => {
          const finalParts = [];
          const interimParts = [];
          for (let index = 0; index < event.results.length; index += 1) {
            const part = event.results[index][0]?.transcript?.trim();
            if (!part) continue;
            (event.results[index].isFinal ? finalParts : interimParts).push(part);
          }
          const finalText = finalParts.join(" ");
          const interimText = interimParts.join(" ");
          transcript.value = [liveTranscriptBase, finalText, interimText].filter(Boolean).join(" ");
          copyButton.disabled = !transcript.value.trim();
          if (interimText) setStatus("Listening · words appear as you speak", true);
          else if (finalText) shareMessage.textContent = "Your words are appearing live. You can edit or copy them.";
        };
        recognition.onerror = event => {
          if (event.error !== "aborted" && event.error !== "no-speech") {
            setStatus(`Live transcription error: ${event.error}. Try again or use a supported browser.`);
          }
        };
        recognition.onend = () => {
          if (!listening) return;
          try {
            recognition.start();
          } catch {
            setStatus("Listening · words appear as you speak", true);
          }
        };
      }
      liveTranscriptBase = transcript.value.trim();
      listening = true;
      recognition.start();
      startButton.disabled = true;
      stopButton.disabled = false;
      setStatus("Listening · words appear as you speak", true);
      return;
    }
    if (!prepared && !(await prepareModel())) return;
    if (!micVAD) {
      micVAD = await window.vad.MicVAD.new({
        onSpeechStart: () => setStatus("Listening · speak and pause to see each phrase", true),
        onSpeechEnd: handleSpeechEnd,
        onnxWASMBasePath: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist/`,
        baseAssetPath: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${vadVersion}/dist/`,
        model: "v5",
        positiveSpeechThreshold: .35,
        negativeSpeechThreshold: .2,
        redemptionMs: 300,
        preSpeechPadMs: 160,
        minSpeechMs: 120
      });
    }
    micVAD.start();
    listening = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    setStatus("Listening · pause between phrases to see the transcript", true);
  } catch (error) {
    listening = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    setStatus(error instanceof Error ? error.message : "Could not start the microphone.");
  }
}

function handleSpeechEnd(audio) {
  utteranceQueue.push({ id: ++utteranceNumber, audio });
  if (listening) setStatus("Listening · transcribing your last phrase…", true);
  void processUtterances();
}

async function processUtterances() {
  if (processing) return;
  processing = true;
  try {
    while (utteranceQueue.length) {
      const item = utteranceQueue.shift();
      if (!item) continue;
      const segments = await whisper.transcribePCM(item.audio).collect();
      const text = segments.map(segment => segment.text.trim()).filter(Boolean).join(" ").trim();
      if (text) {
        transcript.value = `${transcript.value.trim()}${transcript.value.trim() ? " " : ""}${text}`;
        copyButton.disabled = false;
        shareMessage.textContent = "Your words are transcribed on this device.";
      }
      setStatus(listening ? "Listening · pause between phrases to see the transcript" : "Recording finished. Your transcript is ready.", listening);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not transcribe that phrase.", listening);
  } finally {
    processing = false;
  }
}

function stopRecording() {
  if (recognition && listening) recognition.stop();
  micVAD?.pause();
  listening = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  setStatus("Recording finished. Your transcript is ready.");
  if (transcript.value.trim()) copyButton.disabled = false;
  void processUtterances();
}

async function copyTranscript() {
  if (!transcript.value.trim()) return;
  try {
    await navigator.clipboard.writeText(transcript.value.trim());
    shareMessage.textContent = "Copied to clipboard. It has not been sent to Are.na.";
  } catch {
    transcript.focus();
    transcript.select();
    shareMessage.textContent = "Select and copy your transcript. It has not been sent to Are.na.";
  }
}

function showView(viewId, pushHistory = true) {
  currentView = viewId;
  homeView.hidden = viewId !== "home-view";
  archiveView.hidden = viewId !== "archive-view";
  aboutView.hidden = viewId !== "about-view";
  if (pushHistory) {
    const route = viewId.replace("-view", "");
    history.pushState({ viewId }, "", `#${route}`);
  }
  window.scrollTo(0, 0);
  updateCollectionScene();
  if (viewId === "archive-view") void loadArchive();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resizeParticleCanvas() {
  particleRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  particleCanvas.width = Math.round(window.innerWidth * particleRatio);
  particleCanvas.height = Math.round(window.innerHeight * particleRatio);
  particleCanvas.style.width = `${window.innerWidth}px`;
  particleCanvas.style.height = `${window.innerHeight}px`;
  drawGlobeParticles();
}

function captureGlobeParticles() {
  particlesCaptured = true;
  globeParticles = [];
  const labels = [...globe.querySelectorAll(".globe-note")].slice(0, 54);
  labels.forEach((label, labelIndex) => {
    const bounds = label.getBoundingClientRect();
    if (bounds.width < 3 || bounds.height < 3) return;

    const style = getComputedStyle(label);
    const fontSize = parseFloat(style.fontSize) || 12;
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.25;
    const maskWidth = Math.max(1, Math.ceil(Math.min(label.offsetWidth || 200, 360)));
    const mask = document.createElement("canvas");
    const maskContext = mask.getContext("2d", { willReadFrequently: true });
    mask.width = maskWidth;
    mask.height = Math.ceil(Math.max(fontSize * 2, label.scrollHeight || lineHeight * 3));
    maskContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    maskContext.textBaseline = "top";
    maskContext.fillStyle = "#ff2eab";
    const lines = [];
    let line = "";
    for (const word of label.textContent.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && maskContext.measureText(next).width > maskWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    lines.slice(0, Math.floor(mask.height / lineHeight)).forEach((text, index) => {
      maskContext.fillText(text, 0, index * lineHeight, maskWidth);
    });

    const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
    const candidates = [];
    for (let y = 0; y < mask.height; y += 2) {
      for (let x = 0; x < mask.width; x += 2) {
        if (pixels[(y * mask.width + x) * 4 + 3] > 48) candidates.push({ x, y });
      }
    }
    const stride = Math.max(1, Math.ceil(candidates.length / 24));
    const scaleX = bounds.width / mask.width;
    const scaleY = bounds.height / mask.height;
    for (let i = 0; i < candidates.length; i += stride) {
      const point = candidates[i];
      const x = bounds.left + point.x * scaleX;
      const y = bounds.top + point.y * scaleY;
      const angle = Math.atan2(y - innerHeight / 2, x - innerWidth / 2);
      const seed = (labelIndex * 97 + point.x * 13 + point.y * 31) % 127;
      globeParticles.push({
        x, y,
        vx: Math.cos(angle + (seed % 17 - 8) * .025) * (50 + seed * 1.45),
        vy: Math.sin(angle + (seed % 17 - 8) * .025) * (50 + seed * 1.45),
        size: .7 + (seed % 7) * .13
      });
    }
  });
}

function drawGlobeParticles() {
  particleContext.setTransform(particleRatio, 0, 0, particleRatio, 0, 0);
  particleContext.clearRect(0, 0, innerWidth, innerHeight);
  if (!globeParticles.length || globeProgress <= .05) return;
  const progress = clamp((globeProgress - .05) / .83, 0, 1);
  const opacity = Math.sin(progress * Math.PI) * .82;
  particleContext.fillStyle = `rgba(255,46,171,${opacity})`;
  for (const particle of globeParticles) {
    particleContext.fillRect(
      particle.x + particle.vx * progress,
      particle.y + particle.vy * progress,
      particle.size,
      particle.size
    );
  }
}

function updateCollectionScene() {
  const bounds = collectionScroll.getBoundingClientRect();
  const availableScroll = Math.max(1, collectionScroll.offsetHeight - innerHeight);
  globeProgress = clamp(-bounds.top / availableScroll, 0, 1);
  collectionScene.style.setProperty("--scroll-progress", globeProgress.toFixed(4));
  collectionScene.style.setProperty("--globe-opacity", String(1 - clamp(globeProgress / .68, 0, 1)));
  const edgePresence = .2 + Math.sin(globeProgress * Math.PI) * .65;
  collectionScene.style.setProperty("--edge-opacity", String(edgePresence * clamp((1 - globeProgress) / .18, 0, 1)));
  collectionScene.style.setProperty("--hint-opacity", String(1 - clamp(globeProgress / .22, 0, 1)));
  const automaticTurn = performance.now() * .0025 * (1 - globeProgress);
  globe.style.transform = `rotateX(${globeRotationX + globeProgress * 24}deg) rotateY(${globeRotationY + automaticTurn + globeProgress * 46}deg) scale(${1 + globeProgress * .45})`;
  if (globeProgress > .025 && !particlesCaptured && globe.children.length) captureGlobeParticles();
  drawGlobeParticles();
  if (globeProgress > .02 && globeProgress < .99 && !particleFrame) {
    const animate = () => {
      drawGlobeParticles();
      particleFrame = globeProgress > .02 && globeProgress < .99 ? requestAnimationFrame(animate) : 0;
    };
    particleFrame = requestAnimationFrame(animate);
  }
}

const globeSpace = document.querySelector("#globe-space");
globeSpace.addEventListener("pointerdown", event => {
  dragPoint = { x: event.clientX, y: event.clientY, moved: false };
  globeSpace.setPointerCapture(event.pointerId);
});
globeSpace.addEventListener("pointermove", event => {
  if (!dragPoint) return;
  const dx = event.clientX - dragPoint.x;
  const dy = event.clientY - dragPoint.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) dragPoint.moved = true;
  globeRotationY += dx * .34;
  globeRotationX -= dy * .28;
  dragPoint.x = event.clientX;
  dragPoint.y = event.clientY;
  updateCollectionScene();
});
globeSpace.addEventListener("pointerup", () => {
  if (dragPoint?.moved) {
    globe.dataset.dragged = "true";
    setTimeout(() => { delete globe.dataset.dragged; }, 100);
  }
  dragPoint = null;
});
globe.addEventListener("click", event => {
  if (globe.dataset.dragged) event.stopImmediatePropagation();
}, true);
window.addEventListener("scroll", updateCollectionScene, { passive: true });
window.addEventListener("resize", () => {
  resizeParticleCanvas();
  updateCollectionScene();
});
resizeParticleCanvas();

history.replaceState({ viewId: currentView }, "", location.href);
document.querySelector("#enter-archive").addEventListener("click", () => showView("archive-view"));
document.querySelector("#collection-trigger").addEventListener("click", () => showView("archive-view"));
document.querySelector("#about-trigger").addEventListener("click", () => {
  showView(currentView === "about-view" ? "home-view" : "about-view");
});
window.addEventListener("popstate", event => showView(event.state?.viewId || "home-view", false));
document.querySelector("#share-trigger").addEventListener("click", () => shareDialog.showModal());
document.querySelector("#close-share").addEventListener("click", () => shareDialog.close());
startButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
copyButton.addEventListener("click", copyTranscript);
voiceSelect.addEventListener("change", () => speechSynthesis.cancel());
shareDialog.addEventListener("close", () => {
  if (listening) stopRecording();
});
window.addEventListener("beforeunload", () => {
  micVAD?.destroy?.();
  whisper.dispose();
});
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.addEventListener("voiceschanged", loadVoices);
}
if (currentView !== "home-view") void loadArchive();
