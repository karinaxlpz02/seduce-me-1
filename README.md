# seduce-me-1

The site owner's 11 supplied letters: ChatGPT on the left, Claude on the right, purple-blue bubbles, white text, no controls.

The first letter is rendered directly in HTML and is visible immediately, even if JavaScript fails to load. A small script reveals one subsequent letter every 5 seconds, then stops. Reload starts playback again. Background browser throttling may delay messages.

The opening letter was rejoined and the duplicated first Claude reply removed. Markdown and pasted HTML whitespace markers became plain text. No API key, backend, polling, or API charges are required.

GitHub Actions publishes public/ to GitHub Pages. The older server.mjs is an optional live API prototype and is not used by the published page.

## seduce-me-2

A second page in this repository at /2/: a continuous prose collage of all eleven letters, with salutations and signatures removed. Bright pink background and black underlined text. Only words about desire, lack of desire, human touch, sensation, and human experiences such as thinking, remembering, and choosing drop their individual letters to the bottom of the screen. Fallen letters stay visible and accumulate. Related words slowly return in the prose as an association; other words stay static. Touch and keyboard interactions also work. The widest word in each association group reserves its position, and overlapping interactions are ignored until the animation ends. Reduced-motion preference places the letters on the floor immediately. No API calls or dependencies.

Three oversized, overlapping white circles fill the viewport behind the prose and pulse in sequence like a typing indicator. They ignore pointer events and respect reduced-motion settings.

Word replacements take a randomized walk through overlapping semantic associations, using the current word as their starting point and avoiding recent choices. There is no fixed order; repeated hovers can lead from desire to longing to romance to fantasy. This runs locally without an API.
