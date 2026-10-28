import http from "node:http";

const port = Number(process.env.DESIRE_API_PORT || 8787);
const arenaBase = "https://api.are.na/v3";
const channel = process.env.ARENA_CHANNEL || "notes-on-are-na-about-desire";
const arenaToken = process.env.ARENA_ACCESS_TOKEN;
const whishperUrl = process.env.WHISHPER_TRANSCRIBE_URL;
const allowedOrigins = new Set((process.env.DESIRE_ALLOWED_ORIGINS || "https://karinaxlpz02.github.io,http://localhost:8000,http://127.0.0.1:8000").split(",").map(value => value.trim()).filter(Boolean));
const limits = new Map();

function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function bodyBytes(req, limit) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) throw Object.assign(new Error("The recording is too large."), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function rateLimit(req, key, count, period) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const current = limits.get(id) || { started: now, count: 0 };
  if (now - current.started > period) { current.started = now; current.count = 0; }
  current.count++;
  limits.set(id, current);
  return current.count <= count;
}

async function fetchArchive() {
  const items = [];
  let page = 1;
  while (page <= 10) {
    const url = `${arenaBase}/channels/${encodeURIComponent(channel)}/contents?page=${page}&per=100`;
    const response = await fetch(url, { headers: arenaToken ? { Authorization: `Bearer ${arenaToken}` } : {} });
    if (!response.ok) throw new Error(`Are.na returned ${response.status} while loading the archive.`);
    const result = await response.json();
    for (const block of result.data || []) {
      if (block.type !== "Text") continue;
      const text = block.content?.plain || block.content?.markdown || "";
      if (text.trim()) items.push({ id: block.id, text, author: block.user?.name || "notes on desire", user: block.user, created_at: block.created_at });
    }
    if (!result.meta?.next_page) break;
    page = result.meta.next_page;
  }
  return items;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (origin && !allowedOrigins.has(origin)) return send(res, 403, { error: "This site is not allowed to use the desire archive." });
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const path = new URL(req.url, "http://localhost").pathname;
  try {
    if (path === "/api/desire/archive" && req.method === "GET") {
      if (!rateLimit(req, "archive", 90, 60 * 60 * 1000)) return send(res, 429, { error: "Please wait a little before loading the archive again." });
      return send(res, 200, { items: await fetchArchive() });
    }

    if (path === "/api/desire/transcribe" && req.method === "POST") {
      if (!whishperUrl) return send(res, 503, { error: "The archive owner has not connected Whishper yet." });
      if (!rateLimit(req, "transcribe", 120, 60 * 60 * 1000)) return send(res, 429, { error: "You have reached the recording limit for now." });
      const bytes = await bodyBytes(req, 12 * 1024 * 1024);
      const request = new Request("http://desire-upload.invalid", { method: "POST", headers: req.headers, body: bytes, duplex: "half" });
      const received = await request.formData();
      const audio = received.get("file");
      if (!(audio instanceof Blob) || !audio.size) return send(res, 400, { error: "No recording was received." });
      const form = new FormData();
      form.append("file", audio, audio.name || "desire-recording.webm");
      form.set("language", "auto");
      form.set("model_size", process.env.WHISHPER_MODEL_SIZE || "small");
      const response = await fetch(whishperUrl, { method: "POST", body: form, signal: AbortSignal.timeout(90000) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, 502, { error: "Whishper could not transcribe that segment. Try again or speak for a little longer." });
      return send(res, 200, { text: result.text || "" });
    }

    if (path === "/api/desire/share" && req.method === "POST") {
      if (!arenaToken) return send(res, 503, { error: "The archive owner has not connected Are.na write access yet." });
      if (!rateLimit(req, "share", 6, 60 * 60 * 1000)) return send(res, 429, { error: "You have reached the sharing limit for now." });
      const bytes = await bodyBytes(req, 8 * 1024);
      let payload;
      try { payload = JSON.parse(bytes.toString("utf8")); } catch { return send(res, 400, { error: "The note could not be read." }); }
      const text = typeof payload.text === "string" ? payload.text.trim() : "";
      if (!text || text.length > 2000) return send(res, 400, { error: "A desire must be between 1 and 2,000 characters." });
      const response = await fetch(`${arenaBase}/blocks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${arenaToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value: text, channels: [{ id: channel }] }),
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, 502, { error: "Are.na couldn’t save the note. Check the channel and write access, then try again." });
      const item = { id: result.id, text: result.content?.plain || text, author: result.user?.name || "community", user: result.user, created_at: result.created_at };
      return send(res, 201, { item });
    }

    return send(res, 404, { error: "Not found." });
  } catch (error) {
    return send(res, error.status || 502, { error: error.status ? error.message : "The archive service is temporarily unavailable." });
  }
});

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, item] of limits) if (item.started < cutoff) limits.delete(key);
}, 15 * 60 * 1000).unref();

server.listen(port, "0.0.0.0", () => console.log(`Desire archive API ready on port ${port}.`));
