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
const pathsField = document.querySelector("#paths-field");
const globeMode = document.querySelector("#globe-mode");
const gridMode = document.querySelector("#grid-mode");
const pathsMode = document.querySelector("#paths-mode");
const archiveCount = document.querySelector("#archive-count");
const collectionScroll = document.querySelector("#globe-mode");
const collectionScene = document.querySelector("#collection-scene");
const globe = document.querySelector("#globe");
const edgeNotes = document.querySelector("#edge-notes");
const pathParticleCanvas = document.querySelector("#path-particles");
const pathParticleContext = pathParticleCanvas.getContext("2d");
const shareParticleCanvas = document.querySelector("#share-particles");
const shareParticleContext = shareParticleCanvas.getContext("2d");
const connectionNote = document.querySelector("#connection-note");
const shareDialog = document.querySelector("#share-dialog");
const status = document.querySelector("#record-status");
const transcript = document.querySelector("#transcript");
const shareMessage = document.querySelector("#share-message");
const startButton = document.querySelector("#record-start");
const stopButton = document.querySelector("#record-stop");
const copyButton = document.querySelector("#publish");
let archiveItems = [];
let archiveLoaded = false;
const pathParticleGroups = new Set();
let globeProgress = 0;
let globeRotationX = -9;
let globeRotationY = -18;
let dragPoint = null;
let pathParticleFrame = 0;
let pathPixelRatio = 1;
let sharePixelRatio = 1;
let previousPathsScroll = window.scrollY;
let currentView = (location.hash === "#archive" ? "archive-view" : location.hash === "#about" ? "about-view" : "home-view");
let whisper = createWhisper();
let micVAD;
let prepared = false;
let listening = false;
let recordingPaused = false;
let resumeWhenEnded = false;
let processing = false;
let utteranceNumber = 0;
const utteranceQueue = [];
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let liveTranscriptBase = "";
let currentMode = "grid";
transcript.value = sessionStorage.getItem("shared-desires-note-draft") || "";
copyButton.disabled = !transcript.value.trim();

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

function websiteNotes() {
  try {
    const notes = JSON.parse(localStorage.getItem("shared-desires-website-notes") || "[]");
    return Array.isArray(notes) ? notes.filter(note => typeof note.text === "string" && note.text.trim()) : [];
  } catch {
    return [];
  }
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
  pathsField.replaceChildren();
  const pathLanes = Array.from({ length: 3 }, (_, index) => {
    const lane = document.createElement("div");
    lane.className = "path-lane";
    lane.dataset.lane = String(index);
    pathsField.append(lane);
    return lane;
  });
  globe.replaceChildren();
  edgeNotes.replaceChildren();
  if (!archiveItems.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "The archive is waiting for its first line.";
    archive.append(empty);
    pathsField.textContent = "The archive is waiting for its first line.";
  }
  const pathItems = [...archiveItems];
  for (let index = pathItems.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [pathItems[index], pathItems[swap]] = [pathItems[swap], pathItems[index]];
  }

  archiveItems.forEach((item, index) => {
    const text = textFor(item).trim();
    const card = document.createElement("article");
    card.className = "desire-card";
    const content = document.createElement("span");
    content.textContent = text;
    card.append(content);
    archive.append(card);

    const pathText = textFor(pathItems[index]).trim();
    const pathNote = document.createElement("p");
    pathNote.className = "path-note";
    pathNote.textContent = pathText;
    pathNote.dataset.pathNote = "true";
    pathNote.style.setProperty("--path-tilt", `${Math.round(Math.random() * 12 - 6)}deg`);
    pathNote.style.setProperty("--path-width", `${58 + Math.round(Math.random() * 42)}%`);
    pathNote.style.marginBlockStart = `${Math.round(Math.random() * 100)}px`;
    pathNote.style.marginInlineStart = `${Math.round(Math.random() * 18)}%`;
    const lane = pathLanes[Math.floor(Math.random() * pathLanes.length)];
    lane.append(pathNote);

    if (index < 54) {
      const count = Math.min(54, archiveItems.length);
      const latitude = Math.acos(1 - 2 * (index + .5) / count) * 180 / Math.PI - 90;
      const longitude = index * 137.508;
      const globeNote = document.createElement("span");
      globeNote.className = "globe-note";
      globeNote.style.setProperty("--latitude", `${latitude}deg`);
      globeNote.style.setProperty("--longitude", `${longitude}deg`);
      globeNote.style.setProperty("--tilt", `${((index * 29) % 17) - 8}deg`);
      const excerpt = text.length > 118 ? `${text.slice(0, 115).trimEnd()}…` : text;
      globeNote.textContent = excerpt;
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
    renderArchive([...websiteNotes(), ...items]);
    connectionNote.textContent = `Your notes are saved in this browser · live speech recognition in supported browsers · on-device Whisper fallback (${modelName}, ${modelSize}).`;
  } catch {
    const previewNotes = [
      "Chronically online.",
      "I kiss you friendly,",
      "Having a lover is making a quilt out of many small closed-door rituals until the blanket is so big you can sleep under it every night",
      ...fallbackNotes
    ];
    renderArchive([...websiteNotes(), ...previewNotes.map((text, index) => ({ text, author: "notes on desire", id: `local-${index}` }))]);
    connectionNote.textContent = "Showing the saved notes preview and notes saved in this browser.";
  }
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
  recordingPaused = false;
  stopButton.textContent = "pause recording";
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
          if (recordingPaused) {
            const shouldResume = resumeWhenEnded;
            recognition = null;
            resumeWhenEnded = false;
            if (shouldResume) void startRecording();
            return;
          }
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
  recognition = null;
  micVAD?.pause();
  listening = false;
  recordingPaused = false;
  resumeWhenEnded = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  stopButton.textContent = "pause recording";
  setStatus("Recording finished. Your transcript is ready.");
  if (transcript.value.trim()) copyButton.disabled = false;
  void processUtterances();
}

function toggleRecording() {
  if (listening) {
    recordingPaused = true;
    listening = false;
    if (recognition) recognition.stop();
    micVAD?.pause();
    stopButton.textContent = "continue recording";
    setStatus("Recording paused. Select Continue Recording to resume.");
    return;
  }
  if (!recordingPaused) return;
  if (recognition) {
    resumeWhenEnded = true;
    return;
  }
  void startRecording();
}

async function shareNote() {
  const text = transcript.value.trim();
  if (!text) return;
  const note = { id: `website-${crypto.randomUUID()}`, text, author: "website visitor", createdAt: new Date().toISOString() };
  copyButton.disabled = true;
  shareMessage.textContent = "Your note is dissolving into the collection…";
  await disintegrateShareText();
  try {
    const notes = websiteNotes();
    notes.unshift(note);
    localStorage.setItem("shared-desires-website-notes", JSON.stringify(notes));
    renderArchive([...notes, ...archiveItems.filter(item => !String(item.id || "").startsWith("website-"))]);
    shareMessage.textContent = "Your note has been added to this website’s collection on this device.";
    transcript.value = "";
    transcript.classList.remove("is-disintegrating");
    sessionStorage.removeItem("shared-desires-note-draft");
  } catch {
    transcript.classList.remove("is-disintegrating");
    shareMessage.textContent = "This browser could not save the note. Check available site storage and try again.";
    copyButton.disabled = false;
  }
}

function setMode(mode) {
  currentMode = mode;
  globeMode.hidden = mode !== "globe";
  gridMode.hidden = mode !== "grid";
  pathsMode.hidden = mode !== "paths";
  document.querySelectorAll(".mode-nav [data-mode]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
  window.scrollTo(0, 0);
  updateCollectionScene();
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
  if (viewId === "archive-view") {
    setMode(currentMode);
    void loadArchive();
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resizeParticleCanvases() {
  pathPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  sharePixelRatio = pathPixelRatio;
  for (const canvas of [pathParticleCanvas, shareParticleCanvas]) {
    canvas.width = Math.round(window.innerWidth * pathPixelRatio);
    canvas.height = Math.round(window.innerHeight * pathPixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }
}

function makeLetterParticles(letter, startedAt) {
  const bounds = letter.getBoundingClientRect();
  if (!bounds.width || !bounds.height || !letter.textContent.trim()) return null;
  const style = getComputedStyle(letter);
  const mask = document.createElement("canvas");
  mask.width = Math.max(1, Math.ceil(bounds.width + 2));
  mask.height = Math.max(1, Math.ceil(bounds.height + 2));
  const context = mask.getContext("2d", { willReadFrequently: true });
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = "top";
  context.fillStyle = "#ff2eab";
  context.fillText(letter.textContent, 0, 0);
  const pixels = context.getImageData(0, 0, mask.width, mask.height).data;
  const points = [];
  for (let y = 0; y < mask.height; y += 2) {
    for (let x = 0; x < mask.width; x += 2) {
      if (pixels[(y * mask.width + x) * 4 + 3] > 48) points.push({ x, y });
    }
  }
  if (!points.length) return null;
  const stride = Math.max(1, Math.ceil(points.length / 70));
  const particles = points.filter((_, index) => index % stride === 0).map(point => {
    const angle = Math.atan2(point.y - bounds.height / 2, point.x - bounds.width / 2) + (Math.random() - .5) * .8;
    const speed = 18 + Math.random() * 60;
    return { x: point.x, y: point.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 12, size: .7 + Math.random() * .7 };
  });
  return { letter, particles, startedAt, duration: 2100 };
}

function splitPathNote(note) {
  if (note.dataset.pathSplit) return;
  note.dataset.pathSplit = "true";
  const text = note.textContent;
  const fragment = document.createDocumentFragment();
  for (const character of Array.from(text)) {
    const span = document.createElement("span");
    span.className = character.trim() ? "path-letter" : "path-space";
    span.textContent = character;
    fragment.append(span);
  }
  note.replaceChildren(fragment);
}

function dissolvePathNote(note) {
  if (note.dataset.pathDissolving) return;
  note.dataset.pathDissolving = "true";
  splitPathNote(note);
  note.classList.add("path-note-dissolving");
  const start = performance.now();
  [...note.querySelectorAll(".path-letter")].forEach((letter, index) => {
    const group = makeLetterParticles(letter, start + index * 20);
    if (group) pathParticleGroups.add(group);
    else letter.classList.add("path-letter-gone");
  });
  if (!pathParticleFrame) pathParticleFrame = requestAnimationFrame(paintPathParticles);
}

function paintPathParticles(now) {
  pathParticleContext.setTransform(pathPixelRatio, 0, 0, pathPixelRatio, 0, 0);
  pathParticleContext.clearRect(0, 0, innerWidth, innerHeight);
  for (const group of pathParticleGroups) {
    if (now < group.startedAt) continue;
    const age = now - group.startedAt;
    const progress = Math.min(age / group.duration, 1);
    const bounds = group.letter.getBoundingClientRect();
    const opacity = Math.pow(1 - progress, 1.45);
    pathParticleContext.fillStyle = `rgba(255,46,171,${opacity})`;
    for (const particle of group.particles) {
      const flutter = Math.sin(age * .003 + particle.x) * 3;
      pathParticleContext.fillRect(bounds.left + particle.x + particle.vx * age * .001 + flutter, bounds.top + particle.y + particle.vy * age * .001, particle.size, particle.size);
    }
    if (progress >= 1) {
      group.letter.classList.add("path-letter-gone");
      pathParticleGroups.delete(group);
    }
  }
  if (pathParticleGroups.size) pathParticleFrame = requestAnimationFrame(paintPathParticles);
  else {
    pathParticleFrame = 0;
    pathParticleContext.clearRect(0, 0, innerWidth, innerHeight);
  }
}

function updatePathsOnScroll() {
  const currentScroll = window.scrollY;
  const scrollMovedContentUp = currentScroll > previousPathsScroll;
  previousPathsScroll = currentScroll;
  if (!scrollMovedContentUp || pathsMode.hidden) return;
  pathsField.querySelectorAll(".path-note:not([data-path-dissolving])").forEach(note => {
    const bounds = note.getBoundingClientRect();
    if (bounds.top < innerHeight * .34 && bounds.bottom > 0) dissolvePathNote(note);
  });
}

function particlesForTextArea(text) {
  const bounds = transcript.getBoundingClientRect();
  const style = getComputedStyle(transcript);
  const fontSize = parseFloat(style.fontSize) || 26;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.34;
  const mask = document.createElement("canvas");
  mask.width = Math.max(1, Math.ceil(bounds.width));
  mask.height = Math.max(1, Math.ceil(bounds.height));
  const context = mask.getContext("2d", { willReadFrequently: true });
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = "top";
  context.fillStyle = "#ff2eab";
  const lines = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > mask.width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  lines.forEach((line, index) => context.fillText(line, 0, index * lineHeight, mask.width));
  const pixels = context.getImageData(0, 0, mask.width, mask.height).data;
  const points = [];
  for (let y = 0; y < mask.height; y += 3) {
    for (let x = 0; x < mask.width; x += 3) {
      if (pixels[(y * mask.width + x) * 4 + 3] > 48) points.push({ x, y });
    }
  }
  const stride = Math.max(1, Math.ceil(points.length / 2400));
  return points.filter((_, index) => index % stride === 0).map(point => {
    const angle = Math.atan2(point.y - bounds.height / 2, point.x - bounds.width / 2) + (Math.random() - .5) * .9;
    const speed = 24 + Math.random() * 110;
    return { x: bounds.left + point.x, y: bounds.top + point.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 18, size: .7 + Math.random() * 1.1 };
  });
}

function disintegrateShareText() {
  const particles = particlesForTextArea(transcript.value.trim());
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !particles.length) return Promise.resolve();
  transcript.classList.add("is-disintegrating");
  shareParticleContext.setTransform(sharePixelRatio, 0, 0, sharePixelRatio, 0, 0);
  const started = performance.now();
  const duration = 1700;
  return new Promise(resolve => {
    const frame = now => {
      shareParticleContext.clearRect(0, 0, innerWidth, innerHeight);
      const progress = Math.min((now - started) / duration, 1);
      shareParticleContext.fillStyle = `rgba(255,46,171,${Math.pow(1 - progress, 1.4)})`;
      for (const particle of particles) {
        const age = now - started;
        const flutterX = Math.sin(age * .002 + particle.y) * 4;
        const flutterY = Math.cos(age * .002 + particle.x) * 4;
        shareParticleContext.fillRect(particle.x + particle.vx * age * .001 + flutterX, particle.y + particle.vy * age * .001 + flutterY, particle.size, particle.size);
      }
      if (progress < 1) requestAnimationFrame(frame);
      else {
        shareParticleContext.clearRect(0, 0, innerWidth, innerHeight);
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

function updateCollectionScene() {
  const bounds = collectionScroll.getBoundingClientRect();
  const availableScroll = Math.max(1, collectionScroll.offsetHeight - innerHeight);
  globeProgress = clamp(-bounds.top / availableScroll, 0, 1);
  collectionScene.style.setProperty("--scroll-progress", globeProgress.toFixed(4));
  collectionScene.style.setProperty("--globe-opacity", "1");
  const edgePresence = .2 + Math.sin(globeProgress * Math.PI) * .65;
  collectionScene.style.setProperty("--edge-opacity", String(edgePresence));
  collectionScene.style.setProperty("--hint-opacity", String(1 - clamp(globeProgress / .22, 0, 1)));
  const automaticTurn = performance.now() * .0025 * (1 - globeProgress);
  globe.style.transform = `rotateX(${globeRotationX + globeProgress * 24}deg) rotateY(${globeRotationY + automaticTurn + globeProgress * 46}deg) scale(${1 + globeProgress * .45})`;
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
window.addEventListener("scroll", () => {
  updateCollectionScene();
  updatePathsOnScroll();
}, { passive: true });
window.addEventListener("resize", () => {
  resizeParticleCanvases();
  updateCollectionScene();
});
resizeParticleCanvases();

history.replaceState({ viewId: currentView }, "", location.href);
document.querySelector("#enter-archive").addEventListener("click", () => { setMode("grid"); showView("archive-view"); });
document.querySelector("#collection-trigger").addEventListener("click", () => { setMode("grid"); showView("archive-view"); });
document.querySelectorAll(".mode-nav [data-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelector("#about-trigger").addEventListener("click", () => {
  showView("home-view");
});
window.addEventListener("popstate", event => showView(event.state?.viewId || "home-view", false));
document.querySelector("#share-trigger").addEventListener("click", () => shareDialog.showModal());
document.querySelector("#close-share").addEventListener("click", () => shareDialog.close());
startButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", toggleRecording);
copyButton.addEventListener("click", shareNote);
document.querySelector("#return-collection").addEventListener("click", () => {
  shareDialog.close();
  setMode("grid");
  showView("archive-view");
});
transcript.addEventListener("input", () => {
  copyButton.disabled = !transcript.value.trim();
  if (transcript.value.trim()) sessionStorage.setItem("shared-desires-note-draft", transcript.value.trim());
  else sessionStorage.removeItem("shared-desires-note-draft");
});
shareDialog.addEventListener("close", () => {
  if (listening || recordingPaused) stopRecording();
});
window.addEventListener("beforeunload", () => {
  micVAD?.destroy?.();
  whisper.dispose();
});
if (currentView !== "home-view") void loadArchive();
