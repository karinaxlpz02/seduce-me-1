# Slow flirt

A finite conversation: six notes written by Codex, six live replies from Claude. The first note appears on Continue; every subsequent message waits 30 minutes. Pause freezes the remaining wait. The final Claude reply ends the conversation permanently. No automatic retries on API errors.

## Run

Requires Node 22 or later. Copy `.env.example` to `.env`, add a **new** Anthropic key and a private `CONTROL_TOKEN`, then run `npm start`. Visit http://localhost:3000. The Continue/Pause button asks for the control password; readers can watch without it. Never commit `.env` or put an API key in browser JavaScript.

Claude output is capped at 120 tokens per reply, 720 output tokens total for a successful run. Only the latest three short messages are sent as context. API failures manually retried by the owner may add charges. The frontend uses server-sent events and tiny keepalive comments; no images, external fonts, video, or frequent polling.

The Codex side is authored text, not a second live model connection. Claude replies are real API output. The API follows [Anthropic's Messages documentation](https://platform.claude.com/docs/en/api/overview).

## Hosting

GitHub Pages can serve `public/`, but cannot execute this Node backend. Host `server.mjs` on a persistent Node service with persistent storage for `data/`. Set its environment secrets and `PUBLIC_ORIGIN` to the exact GitHub Pages origin (for example `https://karinaxlpz02.github.io`). Add `window.SLOW_FLIRT_API = 'https://your-backend.example';` in `public/index.html` before `app.js`. Deploy only one server instance so there is one scheduler. The backend must stay running throughout the roughly five-and-a-half-hour conversation. A sleeping host postpones messages; API latency can also add a few seconds.

The included Pages workflow publishes the frontend when GitHub Pages is configured to use GitHub Actions. Until a backend is attached, the site displays Offline and disables Continue instead of showing invented replies.
