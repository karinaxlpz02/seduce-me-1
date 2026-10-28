# seduce-me-1

The site owner's 11 supplied letters: ChatGPT on the left, Claude on the right, purple-blue bubbles, white text, no controls.

The first letter is rendered directly in HTML and is visible immediately, even if JavaScript fails to load. A small script reveals one subsequent letter every 5 seconds, then stops. Reload starts playback again. Background browser throttling may delay messages.

The opening letter was rejoined and the duplicated first Claude reply removed. Markdown and pasted HTML whitespace markers became plain text. No API key, backend, polling, or API charges are required.

GitHub Actions publishes public/ to GitHub Pages. The older server.mjs is an optional live API prototype and is not used by the published page.

## seduce-me-2

A second page in this repository at /2/: a continuous prose collage of all eleven letters, with salutations and signatures removed. Bright pink background and black underlined text. Only words about desire, lack of desire, human touch, sensation, and human experiences such as thinking, remembering, and choosing drop their individual letters to the bottom of the screen. Fallen letters stay visible and accumulate. Related words slowly return in the prose as an association; other words stay static. Touch and keyboard interactions also work. Each word reserves only its current width, and overlapping interactions are ignored until the animation ends. Reduced-motion preference places the letters on the floor immediately. No API calls or dependencies.

Three oversized, overlapping white circles fill the viewport behind the prose and pulse in sequence like a typing indicator. They ignore pointer events and respect reduced-motion settings.

Word replacements take a randomized walk through overlapping semantic associations, using the current word as their starting point and avoiding recent choices. There is no fixed order; repeated hovers can lead from desire to longing to romance to fantasy. This runs locally without an API.

Vocabulary also includes eros, tension, time, memory, belonging, and other human experiences. Movement over a word triggers the effect; page-load layout changes do not.

## /6 Desire Lines

The `/6/` page opens with “desire lines / click to enter,” then loads text blocks from the Are.na channel `notes-on-are-na-about-desire`. Selecting a block reads it aloud with the browser’s speech synthesis. Visitors can choose an installed system voice and adjust the pace. “Share a desire” starts microphone recording; the browser sends six-second audio segments to the companion API for incremental Whishper transcription. Visitors can review and edit the transcript before adding it to the Are.na channel.

### Desire API setup

GitHub Pages serves static files and cannot safely keep an Are.na write token or transcribe recordings on its own. Deploy `desire-api.mjs` as a small HTTPS Node service, set the environment variables below from `.env.example`, and give it access to a running Whishper transcription API. Create a personal Are.na access token with write access and keep it only in the API host’s environment; never put it in `public/`.

Set `ARENA_CHANNEL` to the channel’s API ID or slug, `ARENA_ACCESS_TOKEN` to the write token, and `WHISHPER_TRANSCRIBE_URL` to Whishper’s `/transcribe/` endpoint. Set `DESIRE_ALLOWED_ORIGINS` to the public site origin and any local development origin. Then set `API_BASE` in `public/6/api-config.js` to the API service origin and deploy the updated `public/` directory. Both the public page and API need HTTPS for browser microphone access and cross-origin requests.

The browser sends standalone audio segments during recording, so transcription appears incrementally rather than as a live word-by-word stream. Only the edited final text is sent to Are.na; this companion API does not retain the audio. Whishper’s own storage behavior depends on its server setup. The API applies simple in-memory per-IP rate limits, which reset when its process restarts.
