# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site implementing the "Elastic Rise" lower-thirds animation: two rounded
cards (icon + serif text) that spring up from below the frame and settle with a
damped-oscillation bounce, the second card staggered 150ms behind the first. The
full motion/visual spec (dimensions, colors, timing, the math) is in `problem.md` —
read it before touching animation timing or styling.

There is no build step, package manager, or test suite. It's plain HTML/CSS/JS
deployed as-is to GitHub Pages via `.github/workflows/static.yml`, which uploads
the entire repo on every push to `main`. To preview locally, just open the HTML
files directly in a browser (or serve the directory with any static file server).

## Architecture

One shared animation engine drives two different output pages:

- **`assets/js/lower-thirds.js`** — the engine. `springState(t, delayMs)` is the
  single source of truth for the motion math (damped harmonic oscillation per
  `problem.md`'s spec: amplitude 120px, ζ=0.5, ωn=11, 150ms stagger). It's called
  by both renderers below, so animation tuning only ever happens in one place:
  - `LowerThirds.mount(container, config)` — DOM/CSS renderer (transform + opacity
    on `.lt-card` elements), used by `video-live.html`.
  - `LowerThirds.drawCanvasFrame(ctx, w, h, t, config, restY)` — Canvas 2D renderer,
    used by `video-recorded.html` because `MediaRecorder`/`captureStream()` needs a
    canvas or video element to record from, not arbitrary DOM.

- **`video-recorded.html`** — type lower-third text, render to `<canvas>`, capture
  with `canvas.captureStream()` + `MediaRecorder`, and download the result as a
  video file. This is the "get a video output" path.

- **`video-live.html`** — same text inputs, but renders live via the DOM/CSS path
  with a transparent background, meant to be pointed at directly as a browser
  source (OBS/vMix) for live sessions. Reusable two ways: the on-page form, or a
  query-string API (`?icon1=&text1=&icon2=&text2=&autoplay=1`) that strips the
  page's chrome and autoplays — see the `lt-overlay-mode` body class and the
  autoplay handling at the bottom of the file.

- **`assets/js/nav.js`** — injects the shared top nav and footer into every page
  (`document.body.insertBefore`/`appendChild`). There's no templating/build step,
  so this script is how nav/footer stay in one place instead of being duplicated
  HTML per page. Adding a new page means adding it to the `PAGES` array here and
  including the script tag.

- **`assets/css/style.css`** — site chrome (nav, footer, panels, forms).
  **`assets/css/lower-thirds.css`** — the card visuals themselves (`.lt-card`,
  `.lt-icon`, `.lt-text`, `.lt-stage`), matching the spec in `problem.md` exactly
  (border-radius 27px, `rgba(11,27,30,0.85)` background, etc.) — keep this in sync
  with `LowerThirds.STYLE` in the JS engine if either changes.

- **`recommendation.html`** — a standing note on video-production tooling
  evaluated for this repo (why the `ffmpeg-usage` skill was added, why a
  Remotion/Node-based pipeline was not, and what would justify revisiting that).
  Update it if the project's approach to producing/exporting video changes.

- **`.claude/skills/ffmpeg-usage/`** — an MIT-licensed ffmpeg skill (vendored from
  ychoi-kr/claude-ffmpeg-skill) for post-processing exported video (format
  conversion, compression, GIFs). Use it rather than inventing ad-hoc ffmpeg
  invocations when asked to convert/optimize a recorded clip.

## Conventions

- Any change to timing/easing/stagger belongs in `springState()` in
  `lower-thirds.js` — don't hardcode separate animation curves in the DOM
  (`video-live.html`) or canvas (`video-recorded.html`) call sites.
- Keep `STYLE` in `lower-thirds.js` (used for canvas rendering) and
  `lower-thirds.css` (used for DOM rendering) numerically in sync — they describe
  the same visual spec through two different rendering paths.
- `problem.md` is the design spec, not implementation — treat it as the reference
  to check new work against, not something to edit when code changes.
