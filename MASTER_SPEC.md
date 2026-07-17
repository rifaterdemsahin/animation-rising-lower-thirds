# Master Spec: Kubernetes Flow Explainer (3rd output + engine generalization)

Status: **implemented** (2026-07-17). Scope decided via clarifying questions on
2026-07-17: new standalone page, background image pre-generated as a static asset,
sequential staged reveal (Cluster → Ingress Gateway → Pod).

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
