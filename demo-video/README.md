# demo-video/

Tooling that records a silent tutorial video of the explainer game
(`../index.html`) and burns in captions. The generated `.mp4` files are
gitignored — commit the scripts, `captions.srt`, and this README, not the video.

## What's here

- `record.js` — main recorder. Drives a headless Chromium through 9 scenes,
  streams PNG screenshots to ffmpeg (1280x720, 30fps, H.264 yuv420p), joins the
  scene clips, and burns subtitles from `captions.srt` into `tutorial.mp4`.
- `scenes.js` — the scene scripts (steps + caption text) and caption timings.
- `overlay.js` — injection added to every recorded page: a visible cursor, click
  ripples, and key chips (so the viewer can see what's being pressed), plus a
  `window.__MV` helper used by the recorder to read game state and move the
  agent. It never touches `index.html`.
- `qa.js` — text-only QA: ffprobe checks (resolution/fps/codec/pix_fmt/no
  audio/size), SRT constraint checks (non-overlap, 2.5–5s, ≤2 lines, ≤42
  chars/line, ≤15cps), frame sampling for blank/duplicate/bright-text, and an
  ffmpeg decode pass.
- `captions.srt` — the global subtitle file burned into `tutorial.mp4`.

## Requirements

- Node.js, ffmpeg/ffprobe on PATH, and Playwright-core with Chromium installed.
  (This repo uses the scratch copy at `/tmp/pwtest/node_modules/playwright-core`
  with `npx playwright-core install chromium`.)
- Python3 with Pillow for the frame checks in `qa.js`.

## Regenerate

```bash
node demo-video/record.js                          # full record: scenes/*.mp4, concat.mp4, captions.srt, tutorial.mp4
REBUILD_ONLY=1 node demo-video/record.js           # skip recording; rebuild captions.srt + tutorial.mp4 from existing scenes
node demo-video/qa.js                              # checks tutorial.mp4 + captions.srt
```

`record.js` persists each scene's caption events to `scenes/caps.json` (gitignored),
so the `REBUILD_ONLY` mode regenerates `captions.srt` and re-burns subtitles
without re-recording the scenes.

Output: `demo-video/tutorial.mp4`.

## Format spec

- 1280x720, 30fps, H.264, yuv420p, faststart, no audio streams, <100MB.
- Subtitles: white on a semi-transparent dark box, bottom center, ~34px at
  720p, max 2 lines and 42 chars/line, each caption 2.5–5s, reading speed ≤15
  chars/s.
- Pacing: 1–2s after each action; slow AI speed (0.7s) for the Watch AI scene;
  holds on important states.

## QA failures

`qa.js` exits non-zero and lists every failed check. The most likely culprits
are caption timing (edit `scenes.js` `w` fields / text) or the frame checks
(usually a scene that froze or a missing bright subtitle frame).
