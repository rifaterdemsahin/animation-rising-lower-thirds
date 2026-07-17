# 🎬 animation-rising-lower-thirds
Example of practical Animation Helper

> Live site: https://rifaterdemsahin.github.io/animation-rising-lower-thirds/

> https://youtu.be/jcrLdUPHQZQ?t=61

Goal : Create a structure where there is 3 coming up lower third concepts rising with timing. 

Problem Defined : https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/problem.md

- Example : Real Jobs / Real People (the original spec example, see `problem.md`
  — the interactive tools below now default to a Kubernetes flow example instead,
  see Requirements)

## 🌐 Domain

Broadcast/live-stream motion graphics — specifically **lower thirds**, the
text+icon bars overlaid near the bottom of a video frame to identify a
speaker, role, or topic. The work here sits at the intersection of:
- video editing (a reusable graphic for a recorded timeline),
- live production (a real-time browser-source overlay for streaming), and
- front-end animation (the actual spring-motion implementation, in CSS/Canvas).

## 🧩 Problem

Hand-keyframing the same two-card rising animation in a video editor every
time the copy changes ("Real Jobs / Real People" today, something else
tomorrow) doesn't scale — it has to be redone by hand per project. The full
motion/visual spec is in
[problem.md](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/problem.md):
two rounded cards, an icon + serif label each, rising from off-screen with a
damped-spring bounce, staggered 150ms apart.

## ✅ Requirements

- **Type the text, get the animation** — no manual keyframing per project.
- **Visual spec compliance** — dual rounded rectangles (24–30px radius,
  `#0B1B1E` @ 85% opacity), cyan icon + serif text, 24px gap, per `problem.md`.
- **Motion spec compliance** — damped harmonic rise (ζ=0.5), opacity to 100%
  by frame 8, card 2 staggered +150ms behind card 1.
- **Three outputs, one shared engine** (`assets/js/lower-thirds.js`), not three
  separate implementations — all default to the same Kubernetes example
  content (`LowerThirds.PRESETS.kubernetes`: Cluster → Ingress Gateway → Pod),
  fully typeable/overridable in every one of them:
  - 🎥 [`video-recorded.html`](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/video-recorded.html) —
    type your text, render it to a canvas **with the Kubernetes background
    painted behind the cards**, and export an actual downloadable video file
    (WebM/MP4) you can drop into an edit timeline.
  - 📡 [`video-live.html`](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/video-live.html) —
    the same animation as a lightweight, **transparent**-background overlay you
    can point OBS/vMix at for a live stream, driven by URL query params or the
    JS API directly. No background image here — a live-compositing overlay has
    to stay transparent, so this is the one output that doesn't get one.
  - 🧭 [`explainer.html`](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/explainer.html) —
    a worked example using the same engine as a teaching tool: the same three
    cards, staged one at a time instead of together, with the Kubernetes
    background, flow arrows, and a Play button that explains the concept.
- **Usable three ways**: click through the UI, drive it headlessly via a URL
  query-param API or a plain JS API, or call the hosted 🚀 Go/Fly.io API — see
  [`MCP_GUIDE.md`](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/MCP_GUIDE.md)
  and [`mcp-guide.html`](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/mcp-guide.html).
- **No build step** for the site itself — plain static HTML/CSS/JS, deployable
  as-is to GitHub Pages.


Visual :

<img width="1728" height="940" alt="image" src="https://github.com/user-attachments/assets/0b98495e-be5e-4197-8776-7fbd0bb17615" />


## 🌍 Environment
- 🎥 Use it in a video → [video-recorded.html](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/video-recorded.html)
- 📡 Use it in a live session → [video-live.html](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/video-live.html)
- 🧭 Use it to teach a concept → [explainer.html](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/explainer.html)
- 📖 Use it over an API → [mcp-guide.html](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/mcp-guide.html)
- 🚀 Call the hosted API directly → **https://lower-thirds-api.fly.dev** (Go backend, source in [`server/`](server/), see [`server/README.md`](server/README.md))
- 🗂️ Full design/implementation spec → [master-spec.html](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/master-spec.html) / [MASTER_SPEC.md](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/MASTER_SPEC.md)
- ⚙️ CI/deploy status → [GitHub Actions](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/actions)
- ☀️/🌙 Every page has a light/dark mode toggle in the footer (persisted per-browser)
