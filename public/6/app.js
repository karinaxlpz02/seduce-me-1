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
  });
  archiveCount.textContent = archiveItems.length;
  archive.setAttribute("aria-busy", "false");
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
  archive.querySelector('[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
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
  if (viewId === "archive-view") void loadArchive();
}

history.replaceState({ viewId: currentView }, "", location.href);
document.querySelector("#enter-archive").addEventListener("click", () => showView("archive-view"));
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
