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

The `/6/` page opens with “desire lines / click to enter,” then loads the 81 text blocks from the public Are.na channel `notes-on-are-na-about-desire`. Selecting a block reads it aloud with the browser’s speech synthesis; visitors can choose a system voice and adjust the pace.

“Share a desire” shows live interim words through the browser’s speech recognition where supported. Browser speech services may process audio outside the device. Browsers without live recognition use the MIT-licensed [browser-whisper](https://github.com/tanpreetjolly/browser-whisper) fallback, which transcribes each phrase on-device after a pause and downloads Whisper Tiny (about 120 MB) the first time. The transcript is editable and copyable; it is not posted to Are.na. `npm run build:speech` bundles the fallback, and its license is at `public/6/licenses/browser-whisper-MIT.txt`.
