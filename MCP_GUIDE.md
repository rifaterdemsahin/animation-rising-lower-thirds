# 📖 MCP Guide

How to drive this toolbox from an MCP (Model Context Protocol) client/agent,
instead of clicking through the UI.

## Why this is possible

`video-recorded.html` and `video-live.html` are already built as a toolbox, not
just a form (see `recommendation.html`). Each exposes two driving surfaces:

- **URL API** — query params fill the form and trigger the action with no
  interaction: `?icon1=&text1=&icon2=&text2=&autorecord=1` (recorded video) or
  `...&autoplay=1` (live overlay).
- **JS API** — `window.LowerThirds` (`mount`, `drawCanvasFrame`, `springState`)
  and `window.LowerThirdsRecorder` (`record`, `runAnimation`), documented
  on-page in each file's "API"/"Reusable" panel.

Both are just web pages with no server component (see `CLAUDE.md` — this repo
is a static site with no build step). An MCP server can't call them as an API
over HTTP the way it would call a REST backend; it has to drive them the same
way a human would, through a browser. That's exactly what browser-automation
MCP servers are for.

## Option 1 — an MCP browser-automation client (no new code)

If your MCP client already has browser tools (e.g. this project was built
using the `claude-in-chrome` MCP server's `navigate` / `computer` /
`javascript_tool` tools), you already have everything needed:

1. `navigate` to `video-recorded.html?icon1=💼&text1=Real+Jobs&icon2=👤&text2=Real+People&autorecord=1`.
2. Poll (`javascript_tool`) for `document.getElementById("status").textContent === "Recording ready."`.
3. Read the result via `javascript_tool`, e.g.
   `document.getElementById("download-link").href` (a `blob:` URL) — or call
   `LowerThirdsRecorder.record(canvas, config)` directly and post-process the
   returned `Blob` in-page (e.g. `Blob -> base64` for the tool to hand back).

This is how the pages in this repo were verified during development — no
custom server needed.

## Option 2 — a small dedicated MCP server (for repeatable automation)

If you want a tool like `render_lower_third(card1, card2) -> video file`
callable from any MCP client without a general-purpose browser-automation
server, wrap a headless browser around the URL API. Sketch (Node +
`@modelcontextprotocol/sdk` + Puppeteer — **not vendored into this repo**,
since it would pull in a Node/build toolchain this static site deliberately
avoids; treat this as a reference implementation to run separately):

```js
// mcp-server.js (illustrative — not part of this repo's deploy)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import puppeteer from "puppeteer";

const server = new McpServer({ name: "lower-thirds", version: "1.0.0" });

server.tool(
  "render_lower_third",
  { icon1: "string", text1: "string", icon2: "string", text2: "string" },
  async ({ icon1, text1, icon2, text2 }) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = new URL("https://rifaterdemsahin.github.io/animation-rising-lower-thirds/video-recorded.html");
    url.search = new URLSearchParams({ icon1, text1, icon2, text2, autorecord: "1" });
    await page.goto(url.toString());
    await page.waitForFunction(
      () => document.getElementById("status").textContent === "Recording ready."
    );
    const base64 = await page.evaluate(async () => {
      const blobUrl = document.getElementById("download-link").href;
      const blob = await (await fetch(blobUrl)).blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });
    });
    await browser.close();
    return { content: [{ type: "resource", mimeType: "video/webm", data: base64 }] };
  }
);

server.connect(new StdioServerTransport());
```

Point any MCP client at this server and `render_lower_third` becomes a normal
callable tool — same underlying URL API, just wrapped so no browser-automation
MCP server is required on the client side.

## 🚀 Option 3 — the hosted API (already built and deployed)

Option 2's sketch, but actually built (in Go, not Node) and running at
**https://lower-thirds-api.fly.dev** — no server to stand up yourself. Source
is in [`server/`](server/) (`server/main.go`), deployed to
[Fly.io](https://fly.io) via `server/Dockerfile` + `server/fly.toml`.

```bash
curl -X POST https://lower-thirds-api.fly.dev/render \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"icon1":"💼","text1":"Real Jobs","icon2":"👤","text2":"Real People"}' \
  -o lower-thirds.webm
```

- `GET /healthz` — no auth, `200 ok`.
- `POST /render` — `Authorization: Bearer <API_TOKEN>` required; body is
  `{icon1, text1, icon2, text2}`; response body is `video/webm` bytes.
- The token is a Fly.io secret, never committed — see `server/README.md` for
  how to get/rotate it.

Internally this is exactly Option 2's approach (headless Chrome driving
`video-recorded.html?...&autorecord=1`), via
[`chromedp`](https://github.com/chromedp/chromedp) instead of Puppeteer, so it
inherits the same "one shared engine" guarantee — nothing about the animation
itself is reimplemented server-side.

## Which to use

- Prototyping, one-off generation, or you already have a browser-automation
  MCP server connected → **Option 1**, nothing to build.
- Building your own MCP server / embedding this in another Node toolchain →
  **Option 2**, the Puppeteer sketch.
- Just need a video back from an HTTP call, right now, no server to run →
  **Option 3**, the hosted API.
