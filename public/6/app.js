import { notes as fallbackNotes } from "./notes.js";
import { API_BASE } from "./api-config.js";

const api = path => `${API_BASE.replace(/\/$/, "")}/api/desire${path}`;

const intro = document.querySelector("#intro");
const archiveView = document.querySelector("#archive-view");
const archive = document.querySelector("#archive");
const archiveCount = document.querySelector("#archive-count");
const connectionNote = document.querySelector("#connection-note");
const shareDialog = document.querySelector("#share-dialog");
const status = document.querySelector("#record-status");
const transcript = document.querySelector("#transcript");
const shareMessage = document.querySelector("#share-message");
const startButton = document.querySelector("#record-start");
const stopButton = document.querySelector("#record-stop");
const publishButton = document.querySelector("#publish");
const voiceSelect = document.querySelector("#voice-select");
const rateControl = document.querySelector("#rate");
const nowSpeaking = document.querySelector("#now-speaking");

let archiveItems = [];
let mediaRecorder;
let microphone;
let transcriptionQueue = Promise.resolve();
let isRecording = false;
let segmentTimer;
let transcriptionAvailable = false;
let voiceStatusMessage = "The voice archive service isn’t connected to this page yet.";

function setStatus(message, recording = false) {
  status.textContent = message;
  status.classList.toggle("is-recording", recording);
}

function textFor(item) {
  return item.text || item.content?.plain || item.content?.markdown || item.title || "";
}

function renderArchive(items) {
  archiveItems = items.filter(item => textFor(item).trim());
  archive.replaceChildren();
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
    const meta = document.createElement("span");
    meta.className = "card-meta";
    const author = item.user?.name || item.author || "desire archive";
    const byline = document.createElement("span");
    byline.textContent = author;
    const listen = document.createElement("span");
    listen.className = "listen-icon";
    listen.setAttribute("aria-hidden", "true");
    listen.textContent = "↗";
    meta.append(byline, listen);
    card.append(content, meta);
    card.setAttribute("aria-label", `Listen to note ${index + 1}: ${text}`);
    card.addEventListener("click", () => speak(text, card));
    archive.append(card);
  });
  archiveCount.textContent = archiveItems.length;
  archive.setAttribute("aria-busy", "false");
}

async function loadArchive() {
  try {
    const response = await fetch(api("/archive"));
    if (!response.ok) throw new Error("Archive service unavailable");
    const data = await response.json();
    renderArchive(data.items || []);
  } catch {
    renderArchive(fallbackNotes.map((text, index) => ({ text, author: "notes on desire", id: `local-${index}` })));
    const hint = document.createElement("p");
    hint.className = "empty-state";
    hint.textContent = "Showing a small preview. Connect the archive service to load all Are.na notes and share new ones.";
    archive.append(hint);
  }
}

async function loadVoiceStatus() {
  try {
    const response = await fetch(api("/status"));
    if (!response.ok) throw new Error("Voice service status unavailable");
    const result = await response.json();
    transcriptionAvailable = Boolean(result.transcription);
    if (!transcriptionAvailable) {
      voiceStatusMessage = "Voice transcription isn’t connected yet. The archive service needs a Whishper endpoint.";
      connectionNote.textContent = voiceStatusMessage;
    } else if (!result.sharing) {
      voiceStatusMessage = "Whishper is connected, but Are.na write access isn’t configured yet.";
      connectionNote.textContent = voiceStatusMessage;
    } else {
      voiceStatusMessage = "Voice transcription and sharing are connected. Speak a desire to add it to the archive.";
      connectionNote.textContent = voiceStatusMessage;
    }
  } catch {
    transcriptionAvailable = false;
    voiceStatusMessage = "Voice transcription isn’t available: the archive API has not been deployed or connected to this page.";
    connectionNote.textContent = voiceStatusMessage;
  }
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  const selected = voiceSelect.value;
  voiceSelect.replaceChildren(new Option("System voice", ""));
  voices.forEach((voice, index) => {
    const option = new Option(`${voice.name} · ${voice.lang}`, String(index));
    voiceSelect.add(option);
  });
  if (selected) voiceSelect.value = selected;
}

function speak(text, card) {
  if (!("speechSynthesis" in window)) {
    nowSpeaking.textContent = "Speech playback is unavailable in this browser.";
    return;
  }
  speechSynthesis.cancel();
  archive.querySelector('[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-pressed", "true");
  const utterance = new SpeechSynthesisUtterance(text);
  const voiceIndex = Number(voiceSelect.value);
  if (voiceSelect.value && speechSynthesis.getVoices()[voiceIndex]) {
    utterance.voice = speechSynthesis.getVoices()[voiceIndex];
  }
  utterance.rate = Number(rateControl.value);
  nowSpeaking.textContent = `speaking · ${text}`;
  utterance.onend = () => {
    card.setAttribute("aria-pressed", "false");
    nowSpeaking.textContent = "choose a line to hear it";
  };
  speechSynthesis.speak(utterance);
}

function resetRecorder() {
  clearTimeout(segmentTimer);
  isRecording = false;
  mediaRecorder = undefined;
  microphone?.getTracks().forEach(track => track.stop());
  microphone = undefined;
  startButton.disabled = false;
  stopButton.disabled = true;
}

async function transcribeChunk(blob) {
  if (blob.size < 600) return;
  const form = new FormData();
  const extension = blob.type.includes("mp4") ? "mp4" : "webm";
  form.append("file", blob, `desire-${Date.now()}.${extension}`);
  const response = await fetch(api("/transcribe"), { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Whishper could not transcribe this recording.");
  const words = String(data.text || "").trim();
  if (words) {
    transcript.value = `${transcript.value.trim()}${transcript.value.trim() ? " " : ""}${words}`;
    publishButton.disabled = false;
    setStatus("Listening · words are arriving as Whishper transcribes each segment", true);
  }
}

function beginRecordingSegment() {
  const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
  const recorder = mimeType ? new MediaRecorder(microphone, { mimeType }) : new MediaRecorder(microphone);
  mediaRecorder = recorder;
  recorder.addEventListener("dataavailable", event => {
    if (!event.data.size) return;
    transcriptionQueue = transcriptionQueue.then(() => transcribeChunk(event.data)).catch(error => {
      setStatus(error.message, isRecording);
    });
  });
  recorder.addEventListener("error", () => setStatus("The recording stopped unexpectedly."));
  recorder.addEventListener("stop", async () => {
    if (isRecording) {
      beginRecordingSegment();
      return;
    }
    await transcriptionQueue;
    resetRecorder();
    setStatus(transcript.value.trim() ? "Recording finished. Review the words, then add them to the archive." : "No words were recognized. You can try recording again.");
    publishButton.disabled = !transcript.value.trim();
  }, { once: true });
  recorder.start();
  segmentTimer = setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
  }, 6000);
}

async function startRecording() {
  if (!transcriptionAvailable) {
    setStatus(voiceStatusMessage);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setStatus("This browser can’t record audio. Try a current version of Chrome, Safari, or Firefox.");
    return;
  }
  try {
    microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    isRecording = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    publishButton.disabled = true;
    transcript.value = "";
    shareMessage.textContent = "";
    transcriptionQueue = Promise.resolve();
    beginRecordingSegment();
    setStatus("Listening · transcription updates every few seconds", true);
  } catch (error) {
    resetRecorder();
    setStatus(error.name === "NotAllowedError" ? "Microphone access was not allowed." : "Could not start the microphone. Check your browser permissions.");
  }
}

function stopRecording() {
  if (mediaRecorder?.state === "recording") {
    isRecording = false;
    clearTimeout(segmentTimer);
    setStatus("Finishing the last transcription segment…");
    mediaRecorder.stop();
  }
}

async function publishDesire() {
  const text = transcript.value.trim();
  if (!text) return;
  publishButton.disabled = true;
  shareMessage.textContent = "Adding your words to the archive…";
  try {
    const response = await fetch(api("/share"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not add the note to Are.na.");
    const newItem = data.item || { text, author: "community" };
    renderArchive([newItem, ...archiveItems]);
    shareMessage.textContent = "Your desire is in the archive. Thank you for leaving it here.";
    setTimeout(() => shareDialog.close(), 1300);
  } catch (error) {
    publishButton.disabled = false;
    shareMessage.textContent = error.message;
  }
}

document.querySelector("#enter").addEventListener("click", () => {
  intro.hidden = true;
  archiveView.hidden = false;
  loadArchive();
  loadVoiceStatus();
});
document.querySelector("#share-trigger").addEventListener("click", () => shareDialog.showModal());
document.querySelector("#record-start").addEventListener("click", startRecording);
document.querySelector("#record-stop").addEventListener("click", stopRecording);
publishButton.addEventListener("click", publishDesire);
transcript.addEventListener("input", () => { publishButton.disabled = isRecording || !transcript.value.trim(); });
voiceSelect.addEventListener("change", () => {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
});
shareDialog.addEventListener("close", () => {
  if (mediaRecorder?.state === "recording") stopRecording();
  microphone?.getTracks().forEach(track => track.stop());
});
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.addEventListener("voiceschanged", loadVoices);
}
