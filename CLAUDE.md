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
  - `LowerThirds.PRESETS.kubernetes` — the shared example content (Cluster →
    Ingress Gateway → Pod, same delays as `explainer.html`) and its background
    image path. All three output pages default to this preset rather than each
    hardcoding their own copy of the same array — see "one shared example,
    three outputs" below.
  - `LowerThirds.mount(container, config)` — DOM/CSS renderer (transform + opacity
    on `.lt-card` elements), used by `video-live.html` and `explainer.html`.
  - `LowerThirds.drawCanvasFrame(ctx, w, h, t, config, restY, onBackground)` — Canvas
    2D renderer, used by `video-recorded.html` because `MediaRecorder`/`captureStream()`
    needs a canvas or video element to record from, not arbitrary DOM. The optional
    `onBackground(ctx)` callback runs right after the per-frame clear and before any
    card is drawn — that's how `video-recorded.html` paints a background image
    without the engine needing to know anything about image loading.
  - `LowerThirds.computeDuration(cards)` — settle time for a card set; used
    instead of the fixed `DURATION_MS` constant wherever card delays are
    caller-supplied rather than the fixed 2-card stagger. Both
    `LowerThirdsRecorder.runAnimation` (video-recorded.html) and `mount()` use
    this so recordings/animations run exactly as long as the configured cards
    need, not a fixed 2-card duration.

### One shared example, three outputs

All three output pages default to `LowerThirds.PRESETS.kubernetes` — typing
your own text still works everywhere (that's the whole point of the toolbox),
but out of the box they demo the same thing so a viewer sees consistent
content across a recorded clip, a live overlay, and the interactive explainer:

- 🎥 **`video-recorded.html`** — type lower-third text (3 icon/text pairs, K8s by
  default), render to `<canvas>` **with the Kubernetes background painted behind
  the cards** (`bgImage` + gradient, drawn via the `onBackground` callback above),
  capture with `canvas.captureStream()` + `MediaRecorder`, and download the
  result as a video file (WebM/MP4) to drop into an edit timeline.

- 📡 **`video-live.html`** — same idea, defaults to the same K8s text, but
  renders live via the DOM/CSS path with a **transparent** background — no
  background image here, deliberately: this page is meant to be pointed at
  directly as a browser source (OBS/vMix) for live sessions, and compositing
  requires real transparency, so it can't also carry a baked-in background the
  way the other two outputs do. Reusable two ways: the on-page form, or a
  query-string API (`?icon1=&text1=&icon2=&text2=&icon3=&text3=&autoplay=1`)
  that strips the page's chrome and autoplays — see the `lt-overlay-mode` body
  class and the autoplay handling at the bottom of the file.

- 🧭 **`explainer.html`** — the same `PRESETS.kubernetes` content, staged one
  card at a time (not simultaneously) several seconds apart via the N-card
  engine support above, each accompanied by a caption and a directional SVG
  arrow drawn once both endpoint cards have settled. The background lives on
  its own `.lt-bg-layer` (separate from `.lt-stage`) so it can fade/scale in
  sync with Play, "landing" together with the first card rather than sitting
  there statically — see `resetCaptionsAndArrows`/`playSequence` in the page's
  own script. Supports `?autoplay=1` plus `text1-3`/`emoji1-3`/`bgprompt`
  overrides. Its "⬇ Download standalone HTML" button bundles the page (CSS/JS
  inlined, background as a data URI) into one portable, dependency-free
  `.html` file client-side — no server involved, matches the static-site
  constraint.

The background image itself (`assets/k8s-explainer-background.png`) is a
single pre-generated static asset shared by both `video-recorded.html` and
`explainer.html` — see `MASTER_SPEC.md` for the exact image-generation prompt.

- **`assets/js/nav.js`** — injects the shared top nav and footer into every page
  (`document.body.insertBefore`/`appendChild`). There's no templating/build step,
  so this script is how nav/footer stay in one place instead of being duplicated
  HTML per page. The top nav is grouped, not flat: `NAV_GROUPS` has a plain
  `🏠 Home` link plus two dropdowns (`🎬 Outputs` — the four content-producing
  pages; `📚 Resources` — everything reference/docs) — hover on desktop, click
  to toggle on touch, via `.nav-dropdown`/`.open`. `SEARCH_INDEX` is a separate
  flat title→URL list (pages + every markdown doc, matching `SEARCH_INDEX`
  entries to `sitemap.html`'s coverage) powering the nav search box — title-only
  matching, not full-text, on purpose (fetching every doc's body client-side
  for search would add real latency for little benefit at this page count).
  The footer is deliberately just external/meta links (live API, GitHub,
  Actions) plus the theme toggle — content pages live in the top nav's
  Resources dropdown instead. Adding a new page means: `NAV_GROUPS` (pick
  Outputs/Resources) or leave it footer-only if it's truly meta, `SEARCH_INDEX`,
  `PAGES` in `tests/test_pages.py`, and `sitemap.html`.

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

- **`MASTER_SPEC.md`** / **`master-spec.html`** — the design/implementation spec
  for the `explainer.html` worked example and the shared-preset/background work
  (staging timings, background image prompt, engine changes). Not a living doc
  like `problem.md`; it records what was decided and built for that feature.
  `master-spec.html` renders the same content on-site (pattern matches
  `recommendation.html`/`mcp-guide.html`) and adds a floating note-taker widget
  (`.note-taker`, fixed position, `localStorage`-persisted, copy-to-clipboard).

- **`.claude/skills/ffmpeg-usage/`** — an MIT-licensed ffmpeg skill (vendored from
  ychoi-kr/claude-ffmpeg-skill) for post-processing exported video (format
  conversion, compression, GIFs). Use it rather than inventing ad-hoc ffmpeg
  invocations when asked to convert/optimize a recorded clip.

- **`canva-guide.html`** — a no-code alternative path: generate the background
  and each lower-third label as images (Gemini/fal.ai), then place/time/animate
  them by hand in Canva, using the same coordinates/timing the engine computes.
  Cross-references `explainer.html`'s Builder for exact x/y and
  `problem.md`/`MASTER_SPEC.md` for the visual spec and timing values.

- **`cost-analysis.html`** — per-environment time/cost breakdown (build time,
  per-use time, and the two places real money is spent: image generation and
  Fly.io hosting). Update the per-image cost figure if the `image-generation`
  skill's pricing changes.

- **`proposed-solution.html`** — a *proposal*, not implemented: extending
  `server/` with image-generation, HTML-generation, and mixed-video-compositing
  endpoints, exposed as MCP tools. Don't treat anything on this page as already
  built — cross-check `server/main.go` before assuming a described endpoint exists.

- **`markdown_renderer.html`** — a small vanilla-JS markdown-to-HTML parser
  (headers, bold/italic, inline code, fenced code blocks, links, bare URLs,
  lists, tables, blockquotes, horizontal rules — not full CommonMark, just
  what this repo's own `.md` files actually use) that fetches and renders any
  file via `?file=path/to/file.md`. This is how every markdown doc in the repo
  is reachable on-site without a hand-written HTML mirror per file.

- **`sitemap.html`** — the definitive list of every page and every doc
  (via `markdown_renderer.html?file=...`). Add new pages/docs here too, not
  just to `assets/js/nav.js`.

## Hosted API (`server/`)

A small Go HTTP service, deployed separately to Fly.io, that wraps the same
`video-recorded.html` URL API described above via headless Chrome (`chromedp`)
so the animations can be generated over HTTP instead of clicking through a
browser. It is not part of the static site's GitHub Pages deploy and has its
own Dockerfile/`fly.toml` inside `server/`. Auth is a bearer token stored as a
Fly.io secret (`API_TOKEN`), never committed — see `mcp-guide.html` for request
examples and `server/README.md` for deploy/operate instructions.

## Theming

`assets/css/style.css` defines site chrome as CSS custom properties on `:root`,
with a `:root[data-theme="light"]` override block. `assets/js/nav.js` builds a
toggle button in the footer (`.theme-toggle`) that flips `data-theme` on
`<html>` and persists the choice to `localStorage` (`lower-thirds-theme`) —
every page picks it up on load via `applyStoredTheme()`. This only themes site
chrome (nav, footer, panels, buttons, text); the lower-thirds card visuals
(`.lt-card` etc.) are intentionally excluded and stay fixed to `problem.md`'s
spec regardless of theme — a broadcast graphic shouldn't change look based on
the tool's own UI preference.

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
- New output pages: add them to `PAGES` in `assets/js/nav.js`, to `PAGES` in
  `tests/test_pages.py`, and to the three-outputs list in `README.md` /
  `index.html` / this file so the "N shared outputs, one engine" framing stays
  accurate.
- Shared example content changes (e.g. retiring/adding a `PRESETS` entry)
  belong in `lower-thirds.js`, not copy-pasted per page — see "one shared
  example, three outputs" above.
- `body { overflow-wrap: break-word }` in `style.css` is inherited site-wide so
  prose/table text can't overflow narrow viewports; `<pre>` blocks are exempt
  by design (browsers never wrap `white-space: pre` regardless of
  `overflow-wrap`), so code/URL examples keep their intentional horizontal
  scroll — don't fight that by adding wrapping overrides to `pre`.
