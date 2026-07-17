# Master Spec: Kubernetes Flow Explainer (3rd output + engine generalization)

Status: **implemented** (2026-07-17), **extended four times** (2026-07-18, see
§8-12). Scope decided via clarifying questions on 2026-07-17: new standalone
page, background image pre-generated as a static asset, sequential staged
reveal (Cluster → Ingress Gateway → Pod). Extended 2026-07-18: the Kubernetes
example became the shared default content across all three outputs (§8), a
full project reference was added (§9), the background was replaced with a
content-matched version plus standing rules (§10), a live-API 404 bug at the
bare root URL was fixed with a regression test added (§11), and
`explainer.html` gained a live parameters table (with x/y image positions)
plus a URL/agent-prompt generator (§12).

This spec sits alongside `problem.md` (which remains the unmodified motion/visual
contract for the base 2-card "Elastic Rise" spring) and extends the toolbox described
in `CLAUDE.md` with a third worked example. It does not change `problem.md`.

---

## 1. Goal

Today the repo has one shared animation engine (`assets/js/lower-thirds.js`) driving
two outputs, both built around the same fixed "Real Jobs / Real People" two-card
example:

- `video-recorded.html` → downloadable MP4/WebM
- `video-live.html` → transparent live overlay (OBS/vMix)

This adds a **third output** and a **worked Kubernetes example**:

- `explainer.html` (new) → an interactive HTML page that uses the engine to visually
  teach one concept — how a request flows through a Kubernetes test cluster — via
  three staged lower-third cards, a generated background, and a single Play button.

The K8s content is the flagship demo for the new HTML output specifically. The engine
change that makes it possible (support for N cards, not just 2) is generic and
available to all three outputs.

---

## 2. Engine change: generalize 2 cards → N cards

`lower-thirds.js` currently hardcodes `config.card1` / `config.card2` in both
`mount()` and `drawCanvasFrame()`. `springState(t, delayMs)` already takes an
arbitrary delay, so it already supports N cards — only the renderers need to
generalize.

**Change:** accept `config.cards = [{icon, text, delayMs}, ...]` (array, arbitrary
length) in both renderers, laid out left-to-right in array order. Keep
`config.card1`/`config.card2` working unchanged for backward compatibility — internally
normalize them to `cards: [card1, card2]` with `delayMs` 0 and `STAGGER_MS`
respectively, so `video-recorded.html` and `video-live.html` need zero changes.

Each card entry's `delayMs` is caller-supplied (not a fixed 150ms), so the explainer
page can space its three stages seconds apart instead of milliseconds apart.

This is the only change to `lower-thirds.js`. `STYLE`, `springState()`, and the spring
constants (ζ=0.5, ωn=11, amplitude 120px) are untouched — per `CLAUDE.md`, timing/easing
changes only ever happen in `springState()`, and none are needed here.

---

## 3. New page: `explainer.html`

### 3.1 Content — the three stages

| Stage | Card | delayMs (from Play press) | Caption shown alongside |
| --- | --- | --- | --- |
| 1 | 🖥️ **Kubernetes Test Cluster** | `0` | "Everything below lives inside one test cluster — the boundary for all the resources in this demo." |
| 2 | 🚪 **Ingress Gateway** | `3200` (after stage 1 settles + reading dwell) | "External traffic enters through the Ingress Gateway, which matches incoming requests against routing rules." |
| 3 | 📦 **Pod** | `6400` (after stage 2 settles + reading dwell) | "The Gateway forwards the matched request to the target Pod running the application." |

Dwell timing: each card settles per `springState` (~1000ms) and then holds for
~2200ms so its caption is readable before the next stage fires — hence the ~3200ms
spacing. These are starting values to tune by eye once built, not a hard spec (same
caveat `recommendation.html` already gives for the base spring constants).

Card 1 stays visible/pinned as the persistent context label ("we're inside this
cluster") while cards 2 and 3 stage in — it does not exit.

### 3.2 Flow direction (arrows)

Between stage 2→3 (Ingress Gateway → Pod) and stage 1→2 (Cluster → Ingress Gateway),
draw a simple directional connector (SVG line + arrowhead, cyan `#00D2D2` to match
`STYLE.iconColor`) once both endpoint cards are visible. This is DOM/SVG only, layered
in `explainer.html` itself — not a `lower-thirds.js` engine feature, since arrows are
specific to this explainer's teaching layout, not the general lower-thirds primitive.
(MP4 export and live overlay stay arrow-free — see §5, out of scope.)

### 3.3 Interactive Play button

- One `▶ Play` button, initial state. Pressing it starts the staged sequence from
  t=0 (same `replay()` pattern already in `lower-thirds.js`'s `mount()` return value).
- Button becomes `⟳ Replay` once the sequence completes, so it can be re-run.
- No auto-play on page load — matches existing pages, which are also
  click-to-run/query-param-to-run (see `MCP_GUIDE.md`), and makes this scriptable via
  the same query-string API convention (`?autoplay=1`) if wired up.

### 3.4 Background image

> **⚠️ Superseded 2026-07-18 — see §10.** The image and prompt below were the
> first version; §10 replaces both with a content-matched version (the scene
> layout now mirrors the actual cluster → gateway → pod flow instead of being
> generic K8s-themed decoration). Left here for the historical record.

- Generated once, ahead of time, and committed as a static asset — **no live API
  calls from the page** (this is a static site with no server and no build step; a
  client-side API key field was explicitly ruled out for this pass).
- Generated via this repo's `image-generation` skill (fal.ai), targeting the
  `fal-ai/nano-banana` endpoint specifically — fal's hosted alias for Google's Gemini
  2.5 Flash Image model ("Nano Banana"), which is the model the task named.
- **Output location:** `assets/k8s-explainer-background.png` (flat in `assets/`,
  matching the existing convention of `assets/lower-thirds-Gemini_Generated_Image_...png`).
- **Prefilled generation prompt** (recorded here so it's reproducible, and shown
  read-only on the page itself near the background credit, per the task's request that
  the prompt carry its own output location):

  > A cinematic, dark navy-teal technical illustration of a Kubernetes cluster
  > architecture: a subtle grid of server racks and container nodes glowing faintly,
  > an abstract network topology with faint cyan connection lines suggesting traffic
  > entering through a gateway and reaching workload nodes. Wide 16:9, moody and
  > minimal like a live-stream tech-talk background. Plenty of dark negative space in
  > the lower two-thirds of the frame for text/card overlays. No readable text, no
  > logos, no UI chrome in the image itself. Dark charcoal (#0B1B1E) base tones with
  > cyan (#00D2D2) accent glow. High resolution, professional broadcast-graphics
  > style. **Save to: `assets/k8s-explainer-background.png`.**

- Used as a full-bleed `background-image` on the page's stage container, dimmed via a
  CSS gradient overlay so the existing card contrast (`STYLE.background` at 85%
  opacity) still reads per `problem.md`'s visual spec.

### 3.5 Not a form

Unlike `video-recorded.html`/`video-live.html`, this page has fixed K8s content (it's
a worked example, not a general-purpose tool) — no text inputs. If a generic "type
your own 3-stage explainer" tool is wanted later, that's a follow-up, not this spec.

---

## 4. Files touched

| File | Change |
| --- | --- |
| `assets/js/lower-thirds.js` | Generalize `mount()`/`drawCanvasFrame()` to loop over `config.cards[]`; normalize legacy `card1`/`card2` internally. No math/timing changes. |
| `explainer.html` | **New.** Stage markup, Play button, captions, SVG arrows, background image, prompt credit block. |
| `assets/css/lower-thirds.css` | Add styles for `.lt-caption`, `.lt-arrow`, and the background/overlay treatment — additive only, existing `.lt-card` rules untouched. |
| `assets/k8s-explainer-background.png` | **New.** Pre-generated background asset (§3.4). |
| `assets/js/nav.js` | Add `explainer.html` to the `PAGES` array so nav/footer include it. |
| `index.html` | Add a link/card pointing at the new explainer page, next to the existing "Environment" links. |
| `README.md` | Add `explainer.html` under "Environment" alongside the existing two links. |

---

## 5. Explicitly out of scope for this pass

- **MP4/live-overlay K8s variants.** The task's "3 outputs" maps to MP4 / live
  overlay / HTML as the three *existing/target output formats* of the toolbox, not
  three renderings of the K8s content specifically. Only `explainer.html` gets the
  K8s example, background, captions, and arrows. The engine change (§2) means someone
  *could* drive the same 3-card K8s config through `video-recorded.html` or
  `video-live.html` via the URL/JS API, but no dedicated preset UI is being added to
  those two pages here.
- **Live/client-side Gemini image generation.** Ruled out per the clarifying answer —
  no API key input, no runtime fetch to Gemini/fal from the page.
- **Editable/typed K8s text.** Content is fixed for this worked example.

---

## 6. Open items to confirm before/while implementing

1. Exact dwell timings (3200ms/6400ms) are placeholders — tune by eye once the page
   is up, same as the base spring constants were.
2. Icon choices (🖥️ / 🚪 / 📦) are placeholders — swap if you want different glyphs
   or custom SVGs.

## 7. Implementation notes

- Background image generated via the `image-generation` skill's `nano-banana-2` fal.ai
  endpoint, using the `FAL-AI-KEY` secret in the `dp-kv-deliverypilot` Azure Key Vault
  (fetched into a git-ignored `.env` at the repo root — `.env` was added to
  `.gitignore`; the key itself is never committed).
- `lower-thirds.js`: `mount()`/`drawCanvasFrame()` now loop over `normalizeCards()`
  output; `card1`/`card2` configs are normalized internally to a 2-element `cards[]`
  with delays `0`/`STAGGER_MS`, so `video-recorded.html`/`video-live.html` needed no
  changes. New public helpers: `LowerThirds.normalizeCards()`, `LowerThirds.computeDuration()`.
- Verified the engine logic directly (`normalizeCards`, `computeDuration`,
  `springState`, `drawCanvasFrame`) via in-page JS calls — all correct for both the
  legacy 2-card shape and the new 3-card K8s config. Full visual playback wasn't
  observable through the browser-automation tab specifically because Chrome freezes
  `requestAnimationFrame` in that unfocused tab (confirmed by the same freeze on the
  pre-existing, unmodified `video-live.html` — not a regression); load `explainer.html`
  in a normal foreground browser tab to see the live animation.

---

## 8. Addendum (2026-07-18): unified Kubernetes example across all three outputs

**This reverses §5's original "MP4/live-overlay K8s variants: out of scope" call.**
Decided via clarifying question that day: `video-recorded.html` and `explainer.html`
both get the Kubernetes background + content; `video-live.html` switches its default
*content* to the same Kubernetes example but stays **transparent** (no background
image) — a live-compositing OBS/vMix overlay can't carry a baked-in background
without losing the ability to composite over the stream underneath it, so that page
is deliberately excluded from "all outputs get a background."

### 8.1 Engine changes

- **`LowerThirds.PRESETS.kubernetes`** — the shared example content (`cards`, same
  three entries/delays as §3.1) plus `background` (the image path), added to
  `lower-thirds.js` as the single source of truth. All three output pages read from
  this preset for their defaults instead of each hardcoding their own copy — avoids
  the "Real Jobs / Real People" hardcoded-in-three-places drift this same repo had
  before this addendum.
- **`drawCanvasFrame(ctx, w, h, t, config, restY, onBackground)`** — new optional
  6th parameter. Runs right after the per-frame `clearRect` and before any card is
  drawn, so a caller can paint a background image without the engine needing to know
  anything about image loading/decoding. Purely additive — every existing call site
  omitting the 6th arg behaves exactly as before.

### 8.2 `video-recorded.html`

- Form grew a third icon/text pair; all three default to the Kubernetes preset's
  values (typing over them still works exactly as before — it's a general tool,
  not locked to K8s).
- A preloaded `Image` (`assets/k8s-explainer-background.png`) is drawn full-canvas,
  then the same dark linear-gradient treatment `explainer.html` uses (so contrast
  reads the same way in both places), via the new `onBackground` callback — plumbed
  through `LowerThirdsRecorder.runAnimation`/`record`, which now also accept an
  optional `onBackground` argument and forward it into `drawCanvasFrame`.
- **Bug fixed in passing:** `runAnimation`'s loop previously compared against the
  fixed `LowerThirds.DURATION_MS` (sized for the legacy 2-card/150ms-stagger case,
  ~1350ms) regardless of how many cards or what delays the config actually used —
  correct for the original 2-card tool, but would have silently cut a 3-stage
  Kubernetes recording off after ~1.3s instead of the ~7.6s it needs. Now computes
  `LowerThirds.computeDuration(normalizeCards(config))` once per run instead.

### 8.3 `video-live.html`

- Same third icon/text field added; defaults to the Kubernetes preset's `cards`
  (mapped with the preset's delays) via `currentConfig()`; URL query-param API
  gained `icon3`/`text3` to match. `mount()` itself already computed duration
  dynamically per §2/§7, so no fixed-duration bug existed here the way it did in
  `video-recorded.html`.
- **No background image** — `.lt-transparent`/the real transparent background in
  overlay mode are untouched. This is the one output that intentionally does not
  follow "all outputs get a background."

### 8.4 Known gap

The hosted API (`server/main.go`, §"Hosted API" in `CLAUDE.md`) still only accepts
`{icon1, text1, icon2, text2}` — it was not extended to the 3-card shape or given a
background option as part of this addendum. Calling it still produces a 2-card,
background-free video even though the page it drives (`video-recorded.html`) now
defaults to 3 cards with a background when used directly. Documented as a known
limitation in `mcp-guide.html`'s Option 3 section rather than silently mismatched;
extending `server/main.go` to accept `cards`/background would be a natural follow-up
if the hosted API needs to match the page's new default exactly.

---

## 9. Project reference (audit — 2026-07-18)

A from-scratch pass over every doc in the repo, to keep this page a genuine
"catch me up on everything" reference rather than just the original explainer spec.
Each area's authoritative source stays where it was — this section points at it
rather than duplicating it, so it can't silently drift out of sync.

| Area | Authoritative source |
| --- | --- |
| Motion/visual spec (the math, colors, dimensions) | [`problem.md`](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/problem.md) — unmodified since day one, deliberately; see `CLAUDE.md`'s "not something to edit when code changes." |
| Architecture, conventions, file-by-file breakdown | [`CLAUDE.md`](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/CLAUDE.md) |
| Project pitch, domain, requirements, environment links | [`README.md`](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/README.md) / `index.html` |
| Programmatic consumption (browser automation / custom MCP server / hosted API), plus copy-pasteable agent prompts | [`MCP_GUIDE.md`](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/MCP_GUIDE.md) / `mcp-guide.html` |
| Hosted Go/Fly.io API — endpoints, auth, deploy/operate | [`server/README.md`](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/server/README.md) |
| Video-production tooling decisions (ffmpeg skill, why not Remotion) | `recommendation.html` |
| This feature's design/implementation record | this file / `master-spec.html` (you are here) |
| Original Canva reference presentation | `canva.md` |

**Site-wide features not covered above, added incrementally across sessions and
easy to lose track of** (all implemented, all live):

- **Light/dark theme toggle** — footer button, `data-theme` on `<html>`,
  `localStorage`-persisted, site-chrome-only (card visuals never themed). See
  `CLAUDE.md`'s "Theming" section.
- **`overflow-wrap: break-word`** on `body`, inherited site-wide, so prose/table
  text can't overflow narrow viewports; `<pre>` blocks keep their horizontal
  scroll by design (browsers never wrap `white-space: pre`).
- **Floating note-taker** on `master-spec.html` — fixed position, `localStorage`
  per-page, copy-to-clipboard.
- **"Download standalone HTML"** on `explainer.html` — client-side bundling of
  CSS/JS/background into one dependency-free `.html` file (data URI for the
  image), verified via a real `DOMParser` pass rather than text search (a naive
  regex/text search false-positives on the exporter's own embedded source code —
  see `tests/test_pages.py`'s `AssetLinkExtractor` for the same lesson applied to
  the test suite).
- **`tests/test_pages.py`** + `.github/workflows/test-pages.yml` — stdlib-only
  Python smoke test (serves the repo locally, checks every page + every local
  asset it references), runs in CI on every push/PR alongside the GitHub Pages
  deploy workflow.
- **Footer** carries links to this spec, the hosted API, the GitHub repo, and
  GitHub Actions, plus the theme toggle — one shared component
  (`assets/js/nav.js`), not duplicated per page.

---

## 10. Addendum (2026-07-18, later same day): content-matched background

**Replaces §3.4's image/prompt.** The repo owner supplied both a much more
specific prompt and a finished reference image
(`assets/content-matched to the lower third.png`, generated externally) and asked
that it become the standard going forward: **backgrounds must relate to what the
lower thirds actually say, not just be generically theme-appropriate.**

### 10.1 What changed

- `assets/k8s-explainer-background.png` was replaced with a resized/optimized
  (1920×1080, PNG, `PIL`/Lanczos) copy of the supplied reference image. The raw
  upload is left in place at `assets/content-matched to the lower third.png` as
  the source.
- The new prompt (below) replaces §3.4's — it's now what's shown on
  `explainer.html`'s background-credit panel and recorded here:

  > Create a dark, tech-themed isometric background illustration that visually
  > represents a Kubernetes traffic flow: cluster → ingress gateway → pod.
  >
  > SCENE LAYOUT (top to bottom, mirroring the flow below):
  > - Upper area: a cluster of glowing cyan cube-shaped nodes grouped together
  >   on an isometric platform, representing the Kubernetes Test Cluster.
  >   Slightly larger and denser than the other node groups, to signal "this
  >   is the entry point."
  > - Middle area: a single glowing connector/port node (like a network jack
  >   or gateway socket) that the cluster's traffic funnels into — this
  >   represents the Ingress Gateway. Render it as a distinct, brighter
  >   focal point with a visible glowing cable/line running down from it.
  > - The glowing line from the gateway node bends and travels down toward
  >   the bottom of the frame, ending just above where the label row sits —
  >   visually "handing off" to the Pod label below.
  > - Scatter a few smaller, dimmer server racks and node clusters in the
  >   background/periphery to suggest a larger data center, but keep them
  >   visually secondary (less glow, more shadow) so the eye follows the
  >   main cluster → gateway → down path.
  >
  > STYLE: Dark navy-black background (#0a1414), cyan/teal glowing accents
  > (#2dd4d4) for the active flow path, dimmer teal-gray (#1a2e2e) for
  > background elements. Isometric circuit-board style connection lines
  > throughout. Cinematic, moody, high-tech.
  >
  > FOREGROUND: Leave the bottom ~25% of the frame clear/darker for
  > pill-shaped text labels to be overlaid separately. No text rendered in
  > this image.
  >
  > Aspect ratio: 16:9, 1920x1080. **Save to: `assets/k8s-explainer-background.png`.**

### 10.2 Standing rule (applies going forward, not just this asset)

**Any background generated for this project must be content-matched to the
lower thirds it sits behind, and its layout must correspond to where those
labels/cards actually land on screen** — not a generic on-theme backdrop. Concretely:
the visual composition should echo the structure of the content (e.g. a
top-to-bottom flow illustration behind top-to-bottom staged cards), and empty/dark
space must be deliberately left where the card row actually sits (bottom ~20-25%
of frame here) rather than the cards landing on top of busy detail. Check this
before generating, not after — regenerating already-wrong compositions is more
expensive than specifying the layout correctly the first time.

### 10.3 Deploy reminder (standing rule, `server/`)

**Any change to `server/` must be followed by `fly deploy -a lower-thirds-api`
(from inside `server/`) before the change is considered done.** The static site
auto-deploys to GitHub Pages on every push via `.github/workflows/static.yml`;
the Go API does not auto-deploy anywhere — it only updates when `fly deploy` is
run by hand. It's easy to commit a `server/` change, push, and assume everything
shipped, when the live API at
[lower-thirds-api.fly.dev](https://lower-thirds-api.fly.dev) is still running
the old binary.

---

## 11. Addendum (2026-07-18, later still): fixed the bare API URL 404ing

`https://lower-thirds-api.fly.dev/` (no path) returned a bare `net/http` 404 —
the server only ever registered `/healthz` and `/render` on its `ServeMux`, so
the root path had no handler. Fixed in `server/main.go`: a `rootHandler()`
registered on `/` now answers the exact root path with a small JSON service
description (endpoints + docs links); every other unmatched path still 404s
normally, since a `"/"` pattern on `ServeMux` only acts as a catch-all for
paths nothing more specific matches.

Also added a regression test: `tests/test_pages.py` now makes a real network
call to the live API (`GET /` and `GET /healthz`, expecting `200` on both) in
addition to its existing local-static-site checks — this is the only part of
the test suite that depends on external, deployed state rather than the local
checkout, deliberately, so a 404-on-deploy class of bug like this one gets
caught by CI going forward instead of only by a user noticing.

---

## 12. Addendum (2026-07-18, once more): parameters table + URL/prompt generator

`explainer.html` gained two new panels:

- **"📐 All parameters"** — a live table of each stage's emoji, text, entrance
  delay, and its **x/y/width/height on the 1920×1080 background image**
  (`assets/k8s-explainer-background.png`'s native resolution). Useful for
  recreating the composition in another tool (Canva, Figma, a video editor)
  without guessing where to place each label over the background PNG.
  Positions are computed by mounting the current config into a hidden clone of
  the stage sized to exactly 1920×1080 (not the viewport), then reading
  `getBoundingClientRect()` — so the resulting pixel values are the image-space
  coordinates directly, with no scaling math and no dependency on the visitor's
  actual screen size.
- **"🎛️ Customize & generate"** — six input fields (emoji/text × 3 stages),
  seeded from URL params or `LowerThirds.PRESETS.kubernetes`. Editing any field
  live-updates the parameters table above, the generated `?emoji1=&text1=...`
  URL, and a ready-to-paste AI-agent prompt below (both with 📋 copy buttons,
  same pattern as `mcp-guide.html`'s prompt blocks) — and the Play button now
  plays whatever's currently in the fields, not just the page's initial config.

This turns the page into a small standalone tool: type any three labels, see
exactly where they'll land on the background image, get a shareable URL or
agent-prompt for the result, and preview it — all without leaving the page.
