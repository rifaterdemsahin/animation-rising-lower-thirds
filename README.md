# animation-rising-lower-thirds
Example of practical Animation Helper

> Live site: https://rifaterdemsahin.github.io/animation-rising-lower-thirds/

> https://youtu.be/jcrLdUPHQZQ?t=61

Goal : Create a structure where there is 3 coming up lower third concepts rising with timing. 

Problem Defined : https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/problem.md

- Example : Real Jobs / Real People

## Domain

Broadcast/live-stream motion graphics — specifically **lower thirds**, the
text+icon bars overlaid near the bottom of a video frame to identify a
speaker, role, or topic. The work here sits at the intersection of:
- video editing (a reusable graphic for a recorded timeline),
- live production (a real-time browser-source overlay for streaming), and
- front-end animation (the actual spring-motion implementation, in CSS/Canvas).

## Problem

Hand-keyframing the same two-card rising animation in a video editor every
time the copy changes ("Real Jobs / Real People" today, something else
tomorrow) doesn't scale — it has to be redone by hand per project. The full
motion/visual spec is in
[problem.md](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/blob/main/problem.md):
two rounded cards, an icon + serif label each, rising from off-screen with a
damped-spring bounce, staggered 150ms apart.

## Requirements

- **Type the text, get the animation** — no manual keyframing per project.
- **Visual spec compliance** — dual rounded rectangles (24–30px radius,
  `#0B1B1E` @ 85% opacity), cyan icon + serif text, 24px gap, per `problem.md`.
- **Motion spec compliance** — damped harmonic rise (ζ=0.5), opacity to 100%
  by frame 8, card 2 staggered +150ms behind card 1.
- **Two output modes**: an actual downloadable video file (for editing), and
  a transparent live overlay (for OBS/vMix streaming) — from one shared
  animation engine, not two separate implementations.
- **Usable two ways**: click through the UI, or drive it headlessly via a URL
  query-param API or a plain JS API — see `MCP_GUIDE.md`.
- **No build step** — plain static HTML/CSS/JS, deployable as-is to GitHub
  Pages.


Visual :

<img width="1728" height="940" alt="image" src="https://github.com/user-attachments/assets/0b98495e-be5e-4197-8776-7fbd0bb17615" />


Environment :
- Use it in a video → [video-recorded.html](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/video-recorded.html)
- Use it in a live session → [video-live.html](https://rifaterdemsahin.github.io/animation-rising-lower-thirds/video-live.html)
