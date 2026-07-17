# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site implementing the "Elastic Rise" lower-thirds animation: rounded
cards (icon + serif text) that spring up from below the frame and settle with a
damped-oscillation bounce, staggered in time card-to-card. The full motion/visual
spec (dimensions, colors, timing, the math) is in `problem.md` — read it before
touching animation timing or styling.

The site itself has no build step or package manager. It's plain HTML/CSS/JS
deployed as-is to GitHub Pages via `.github/workflows/static.yml`, which
uploads the entire repo on every push to `main`. To preview locally, just open
the HTML files directly in a browser (or serve the directory with any static
file server). A separate, optional Go API server (`server/`, see §"Hosted API")
is deployed independently to Fly.io — it does not affect the static site's
build-free deployment.

There is a lightweight smoke-test suite, `tests/test_pages.py` (stdlib-only
Python, no dependencies to install) — it serves the repo locally and checks
every page returns 200, contains a few expected markers, and that every local
asset it references actually resolves. Run it with `python3 tests/test_pages.py`;
it also runs in CI via `.github/workflows/test-pages.yml` on every push/PR.
Add new pages to the `PAGES` list in that script when you add them to
`assets/js/nav.js`.

## Architecture

One shared animation engine drives **three** output pages:

- **`assets/js/lower-thirds.js`** — the engine. `springState(t, delayMs)` is the
  single source of truth for the motion math (damped harmonic oscillation per
  `problem.md`'s spec: amplitude 120px, ζ=0.5, ωn=11). It's called by both
  renderers below, so animation tuning only ever happens in one place. Both
  renderers accept either the legacy 2-card shape (`{card1, card2}`, stagger
  fixed at `STAGGER_MS`) or an arbitrary-length `{cards: [{icon, text, delayMs}, ...]}`
  — `normalizeCards()` reconciles the two, so existing pages didn't need to
  change when N-card support was added for `explainer.html`.
  - `LowerThirds.mount(container, config)` — DOM/CSS renderer (transform + opacity
    on `.lt-card` elements), used by `video-live.html` and `explainer.html`.
  - `LowerThirds.drawCanvasFrame(ctx, w, h, t, config, restY)` — Canvas 2D renderer,
    used by `video-recorded.html` because `MediaRecorder`/`captureStream()` needs a
    canvas or video element to record from, not arbitrary DOM.
  - `LowerThirds.computeDuration(cards)` — settle time for a card set; used
    instead of the fixed `DURATION_MS` constant wherever card delays are
    caller-supplied rather than the fixed 2-card stagger.

- 🎥 **`video-recorded.html`** — type lower-third text, render to `<canvas>`, capture
  with `canvas.captureStream()` + `MediaRecorder`, and download the result as a
  video file (WebM/MP4) to drop into an edit timeline.

- 📡 **`video-live.html`** — same text inputs, but renders live via the DOM/CSS path
  with a transparent background, meant to be pointed at directly as a browser
  source (OBS/vMix) for live sessions. Reusable two ways: the on-page form, or a
  query-string API (`?icon1=&text1=&icon2=&text2=&autoplay=1`) that strips the
  page's chrome and autoplays — see the `lt-overlay-mode` body class and the
  autoplay handling at the bottom of the file.

- 🧭 **`explainer.html`** — a worked teaching example, not a general-purpose form:
  three staged cards (Kubernetes Test Cluster → Ingress Gateway → Pod) rise
  several seconds apart (not the base 150ms stagger) via the N-card engine
  support above, each accompanied by a caption and a directional SVG arrow drawn
  once both endpoint cards have settled. Uses a pre-generated background image
  (`assets/k8s-explainer-background.png`) — see `MASTER_SPEC.md` for the full
  spec, including the exact image-generation prompt. Supports `?autoplay=1`.

- **`assets/js/nav.js`** — injects the shared top nav and footer into every page
  (`document.body.insertBefore`/`appendChild`). There's no templating/build step,
  so this script is how nav/footer stay in one place instead of being duplicated
  HTML per page. Adding a new page means adding it to the `PAGES` array here and
  including the script tag.

- **`assets/css/style.css`** — site chrome (nav, footer, panels, forms).
  **`assets/css/lower-thirds.css`** — the card visuals themselves (`.lt-card`,
  `.lt-icon`, `.lt-text`, `.lt-stage`), matching the spec in `problem.md` exactly
  (border-radius 27px, `rgba(11,27,30,0.85)` background, etc.) — keep this in sync
  with `LowerThirds.STYLE` in the JS engine if either changes. It also holds the
  `explainer.html`-specific additions (`.lt-explainer-bg`, `.lt-arrows`,
  `.lt-arrow`, `.lt-caption*`).

- **`recommendation.html`** — a standing note on video-production tooling
  evaluated for this repo (why the `ffmpeg-usage` skill was added, why a
  Remotion/Node-based pipeline was not, and what would justify revisiting that).
  Update it if the project's approach to producing/exporting video changes.

- **`mcp-guide.html`** / **`MCP_GUIDE.md`** — on-site and repo copies of how to
  drive this toolbox programmatically: browser automation against the URL API,
  or the hosted Go/Fly.io API in `server/`. Keep both in sync — `mcp-guide.html`
  renders the same guidance as `MCP_GUIDE.md` (pattern matches `recommendation.html`).

- **`MASTER_SPEC.md`** — the design/implementation spec for the `explainer.html`
  worked example (staging timings, background image prompt, engine changes). Not
  a living doc like `problem.md`; it records what was decided and built for that
  feature.

- **`.claude/skills/ffmpeg-usage/`** — an MIT-licensed ffmpeg skill (vendored from
  ychoi-kr/claude-ffmpeg-skill) for post-processing exported video (format
  conversion, compression, GIFs). Use it rather than inventing ad-hoc ffmpeg
  invocations when asked to convert/optimize a recorded clip.

## Hosted API (`server/`)

A small Go HTTP service, deployed separately to Fly.io, that wraps the same
`video-recorded.html` URL API described above via headless Chrome (`chromedp`)
so the animations can be generated over HTTP instead of clicking through a
browser. It is not part of the static site's GitHub Pages deploy and has its
own Dockerfile/`fly.toml` inside `server/`. Auth is a bearer token stored as a
Fly.io secret (`API_TOKEN`), never committed — see `mcp-guide.html` for request
examples and `server/README.md` for deploy/operate instructions.

## Secrets

This repo never commits credentials. Local secrets (e.g. an image-generation API
key) live in a git-ignored `.env` at the repo root (see `.gitignore`); values are
pulled from Azure Key Vault (`dp-kv-deliverypilot`) on demand rather than stored
long-term on disk. The Fly.io-hosted API's `API_TOKEN` lives only as a Fly secret.

## Conventions

- Any change to timing/easing/stagger belongs in `springState()` in
  `lower-thirds.js` — don't hardcode separate animation curves in the DOM
  (`video-live.html`, `explainer.html`) or canvas (`video-recorded.html`) call
  sites.
- Keep `STYLE` in `lower-thirds.js` (used for canvas rendering) and
  `lower-thirds.css` (used for DOM rendering) numerically in sync — they describe
  the same visual spec through two different rendering paths.
- `problem.md` is the design spec, not implementation — treat it as the reference
  to check new work against, not something to edit when code changes.
- New output pages: add them to `PAGES` in `assets/js/nav.js`, and to the
  three-outputs list in `README.md` / `index.html` / this file so the "N shared
  outputs, one engine" framing stays accurate.
