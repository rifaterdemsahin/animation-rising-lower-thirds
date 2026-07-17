# 🚀 lower-thirds-api

A small Go HTTP API, deployed to [Fly.io](https://fly.io), that renders the
same "Elastic Rise" lower-thirds animation as `video-recorded.html` — but over
HTTP instead of a browser click. It drives headless Chromium (via
[chromedp](https://github.com/chromedp/chromedp)) against the public site's
existing URL API (`video-recorded.html?...&autorecord=1`), the same pattern
described in [`MCP_GUIDE.md`](../MCP_GUIDE.md) "Option 2", implemented in Go
instead of Node/Puppeteer.

Live at: **https://lower-thirds-api.fly.dev**

## 🔑 Auth

Every `/render` request needs `Authorization: Bearer <API_TOKEN>`. The token
is stored only as a Fly.io secret (`fly secrets set API_TOKEN=... -a lower-thirds-api`)
— never committed. Ask the repo owner for the current token, or rotate it
yourself if you have Key Vault / Fly access.

## 📡 Endpoints

- `GET /` — `200`, JSON service description (endpoints + docs links), no auth
  required. Exists so the bare API URL doesn't 404 — every other unmatched
  path still does.
- `GET /healthz` — `200 ok`, no auth required.
- `POST /render` — body:
  ```json
  { "icon1": "🖥️", "text1": "Kubernetes Test Cluster", "icon2": "🚪", "text2": "Ingress Gateway" }
  ```
  Returns `video/webm` bytes on success (200), or a JSON-free plain-text error
  (400/401/500). 2-card only for now — see `MASTER_SPEC.md` §8.4 for the
  known gap against the page's current 3-card default.

Example:

```bash
curl -X POST https://lower-thirds-api.fly.dev/render \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"icon1":"🖥️","text1":"Kubernetes Test Cluster","icon2":"🚪","text2":"Ingress Gateway"}' \
  -o lower-thirds.webm
```

## 🛠️ Local development

```bash
cd server
go build .
API_TOKEN=dev-token PORT=8080 ./lower-thirds-api   # needs a local Chrome/Chromium
                                                     # on PATH, or CHROMEDP_EXEC_PATH set
```

## ☁️ Deploy

```bash
cd server
fly deploy -a lower-thirds-api
```

`SITE_BASE_URL` (default: the public GitHub Pages site) and `CHROMEDP_EXEC_PATH`
(set in the Dockerfile to the container's Chromium) are the only other env
vars the server reads.
