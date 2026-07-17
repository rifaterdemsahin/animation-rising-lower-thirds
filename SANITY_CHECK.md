# ✅ Sanity Check

A reusable, run-it-yourself checklist for confirming the whole project — site,
hosted API, and deploy pipeline — is actually working, not just "looks right
in the diff." Complements `tests/test_pages.py` (the automated part of this)
with the manual/visual checks that script can't cover.

**Last full pass:** 2026-07-18, commit `19bae1c`, main branch. All checks
below passed. Re-run this whenever you want confidence the live site/API
match what's committed — especially after a `server/` change (see
`MASTER_SPEC.md` §10.3's deploy-reminder rule) or a visual/animation change.

---

## 1. Automated (run this first)

```bash
python3 tests/test_pages.py
```

Covers, in one command: all 7 pages return `200` with expected content
markers, every local asset they reference resolves, and the **live** hosted
API (`GET /` and `GET /healthz` at `https://lower-thirds-api.fly.dev`)
responds correctly. Also runs in CI on every push/PR via
`.github/workflows/test-pages.yml` — check
[GitHub Actions](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/actions)
if you'd rather not run it locally.

If this fails, stop and fix it before going further — everything below
assumes it's green.

## 2. Deploy pipeline

- [ ] `git log -1` locally matches the latest commit on `origin/main`
      (`git fetch && git log origin/main -1`) — nothing uncommitted/unpushed.
- [ ] Latest **"Deploy static content to Pages"** run on
      [Actions](https://github.com/rifaterdemsahin/animation-rising-lower-thirds/actions)
      is green and corresponds to that commit.
- [ ] Latest **"Test pages"** run is green.
- [ ] https://rifaterdemsahin.github.io/animation-rising-lower-thirds/ loads
      (curl or open it) and its footer/visible content reflects the latest
      change (not a stale cached build).
- [ ] If `server/` changed since the last check: `fly status -a lower-thirds-api`
      shows a machine `started` recently, and `fly deploy -a lower-thirds-api`
      has actually been run (see `MASTER_SPEC.md` §10.3 — this doesn't
      auto-deploy the way the static site does).

## 3. Every page loads and does its one job

For each, open it in a real foreground browser tab (not just curl) — some of
this depends on `requestAnimationFrame`, which background/automation tabs can
freeze, giving a false negative:

- [ ] **`index.html`** — nav/footer render, the Preview stage plays the
      Kubernetes cards, all "Environment" links resolve.
- [ ] **`video-recorded.html`** — form defaults to the Kubernetes 3-card
      example, ▶ Preview shows cards rising over the background image on the
      canvas, ⏺ Record & Download produces a playable video file.
- [ ] **`video-live.html`** — form defaults to the same Kubernetes content,
      stage background is the checkerboard (transparency), not an image, ▶
      Play rises correctly, `?...&autoplay=1` strips chrome and autoplays.
- [ ] **`explainer.html`** — see §4, it's the biggest page.
- [ ] **`mcp-guide.html`** — every 📋 Copy button actually copies its block's
      text (check clipboard, not just the "Copied!" label).
- [ ] **`recommendation.html`** — content panels render.
- [ ] **`master-spec.html`** — the 📝 Notes widget opens/closes, persists
      text across a reload, and its 📋 Copy button copies the note text.

## 4. `explainer.html` — Example + Builder

- [ ] **🎬 Example**: ▶ Play rises all three cards over the background image,
      background itself fades/scales in ("lands") in sync with Play, captions
      appear per stage, flow arrows draw between settled cards, ⬇ Download
      standalone HTML produces a file that opens and plays with **zero**
      external `<link>`/`<script>` requests (verify: 0 external refs when
      parsed, e.g. via `DOMParser` — not just "looks fine").
- [ ] **🏗️ Builder — 📐 All parameters**: table shows correct emoji/text/delay
      and non-zero, sensible x/y/width/height for all 3 rows.
- [ ] **🏗️ Builder — 🎛️ Customize & generate**: editing an emoji/text field
      live-updates the parameters table, the Builder preview, the generated
      URL, and the generated agent prompt — and Play (in the Example above)
      uses the edited values.
- [ ] **🏗️ Builder — position sliders**: dragging an X or Y slider moves that
      stage's pill in the Builder preview **without** moving the others and
      **without** overlapping them, and updates the parameters table's X/Y —
      the animated Example above must stay unaffected.
- [ ] **🏗️ Builder — URL API / agent prompt**: the generated URL, opened
      fresh, reproduces the same fields; the 📋 Copy buttons copy the correct
      text.

## 5. Site-wide

- [ ] Footer's ☀️/🌙 theme toggle switches the whole page (verify via
      computed styles if the browser's own dark-mode auto-inversion makes a
      screenshot misleading) and the choice persists across a reload and
      across pages (`localStorage` key `lower-thirds-theme`).
- [ ] Footer links all resolve: 🗂️ Master Spec, 🚀 API
      (`https://lower-thirds-api.fly.dev`), 📦 GitHub repo, ⚙️ Actions.
- [ ] Long text (a paragraph, a long URL in `<code>`, a long typed label)
      doesn't overflow its container at a narrow viewport width — `<pre>`
      blocks are the deliberate exception (they scroll horizontally by
      design).

## 6. Hosted API (`server/`)

```bash
API_TOKEN=$(fly secrets list -a lower-thirds-api >/dev/null; echo "<ask the repo owner / see server/README.md>")

curl -s https://lower-thirds-api.fly.dev/            # -> 200, JSON service description
curl -s https://lower-thirds-api.fly.dev/healthz     # -> 200 "ok"
curl -s -X POST https://lower-thirds-api.fly.dev/render \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"icon1":"🖥️","text1":"Kubernetes Test Cluster","icon2":"🚪","text2":"Ingress Gateway"}' \
  -o /tmp/sanity-check.webm -w "HTTP %{http_code}, %{size_download} bytes\n"
file /tmp/sanity-check.webm   # -> should say "WebM"
```

- [ ] `/` and `/healthz` both `200` (also covered by §1's automated check).
- [ ] `/render` without a token returns `401`.
- [ ] `/render` with a valid token and body returns `200` and a genuinely
      playable WebM file (not just non-zero bytes — actually open it, or
      check `file`/`ffprobe` reports a valid video).

## 7. Known, accepted gaps (not bugs — don't "fix" without discussion)

- The hosted API (`POST /render`) only accepts the legacy 2-card shape
  (`icon1/text1/icon2/text2`) — it hasn't been extended to 3 cards or a
  background, even though `video-recorded.html` itself now defaults to both.
  See `MASTER_SPEC.md` §8.4.
- `video-live.html` never gets a background image — that's deliberate (a
  live-compositing OBS/vMix overlay has to stay transparent). See
  `MASTER_SPEC.md` §8.3.
- The Builder's X/Y sliders never affect the real animated Example — that's
  deliberate too (the Example must stay spec-compliant with `problem.md`).
  See `MASTER_SPEC.md` §13.
