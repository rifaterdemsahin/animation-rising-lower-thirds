#!/usr/bin/env python3
"""
Smoke-tests every page in this static site: serves the repo locally,
requests each page, and checks it responds 200 with the expected title
and a couple of page-specific must-have markers. Also checks that every
local asset (css/js/png referenced by <link>/<script>/<img> src=) actually
resolves, to catch broken paths after a rename/move. Finally, hits the live
hosted Go API (server/, deployed to Fly.io) at a couple of known-good
endpoints — this is a real network call, not a local server, so it also
catches deploy regressions (e.g. the root path 404ing) that only show up
once the API is live, not just in local review.

No dependencies beyond the stdlib, matching this repo's "no build step"
convention (see CLAUDE.md) — run with: python3 tests/test_pages.py
"""

import http.server
import os
import socketserver
import sys
import threading
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (path, required substrings that must appear in the raw HTML)
PAGES = [
    ("index.html", ["<title>Rising Lower Thirds", "Rising Lower Thirds", "explainer.html"]),
    ("video-recorded.html", ["<title>Recorded Video", 'id="record-btn"', 'id="render-canvas"']),
    ("video-live.html", ["<title>Live Overlay", 'id="play-btn"', 'id="stage"']),
    ("explainer.html", ["<title>Explainer", "Kubernetes Test Cluster", 'id="play-btn"']),
    ("canva-guide.html", ["<title>Canva Guide", "canva.link", "Rise"]),
    ("canva-value.html", ["<title>Why Manual Canva", "Duplicate the template", "Rule of thumb"]),
    ("mcp-guide.html", ["<title>API Guide", "lower-thirds-api.fly.dev", "render_lower_third"]),
    ("recommendation.html", ["<title>Recommendations", "ffmpeg-usage"]),
    ("master-spec.html", ["<title>Master Spec", 'id="note-taker"']),
    ("cost-analysis.html", ["<title>Cost Analysis", "nano-banana-2", "Fly.io"]),
    ("proposed-solution.html", ["<title>Proposed Solution", "generate_background", "render_mixed_video"]),
    ("markdown_renderer.html", ["<title>Docs", 'id="doc-content"', "renderMarkdown"]),
    ("sitemap.html", ["<title>Sitemap", "markdown_renderer.html", "MASTER_SPEC.md"]),
]

# Live checks against the hosted Go API (see server/), not the local static
# site — catches regressions like a route returning 404 that only show up
# once deployed. Real network call, generous timeout since Fly.io machines
# auto-stop when idle and need a moment to cold-start on the first request.
API_BASE = "https://lower-thirds-api.fly.dev"
API_ENDPOINTS = [
    ("/", 200),
    ("/healthz", 200),
]

ASSET_TAGS = {"link": "href", "script": "src", "img": "src"}


class AssetLinkExtractor(HTMLParser):
    """Pulls href/src out of actual <link>/<script>/<img> tags only.

    Deliberately uses a real HTML parser rather than a text regex: this repo's
    pages embed their own JS source (e.g. explainer.html's standalone-HTML
    exporter) as inline <script> text, which can contain literal-looking
    href="..."/src="..." substrings inside string/regex literals. A parser
    correctly treats <script>/<style> bodies as raw CDATA and never emits
    start-tag events for text inside them, so those false positives can't
    leak into the extracted asset list the way a blanket regex would.
    """

    def __init__(self):
        super().__init__()
        self.assets = []

    def handle_starttag(self, tag, attrs):
        attr_name = ASSET_TAGS.get(tag)
        if not attr_name:
            return
        value = dict(attrs).get(attr_name)
        if not value:
            return
        if value.startswith(("http://", "https://", "#", "mailto:", "data:")):
            return
        self.assets.append(value.split("?")[0].split("#")[0])


def find_free_port():
    with socketserver.TCPServer(("127.0.0.1", 0), http.server.SimpleHTTPRequestHandler) as s:
        return s.server_address[1]


def start_server(port):
    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(
        *args, directory=REPO_ROOT, **kwargs
    )
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def fetch(url, timeout=10):
    """GET url, returning (status, body) for any HTTP response — including
    4xx/5xx, which urlopen otherwise raises as HTTPError instead of returning."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")


def local_assets(html):
    """Local (non-http, non-anchor, non-data) asset paths referenced in the page."""
    extractor = AssetLinkExtractor()
    extractor.feed(html)
    return extractor.assets


def main():
    port = find_free_port()
    httpd = start_server(port)
    base = f"http://127.0.0.1:{port}"

    failures = []
    checked_assets = set()

    try:
        time.sleep(0.2)  # let the server settle
        for path, required in PAGES:
            url = f"{base}/{path}"
            try:
                status, body = fetch(url)
            except urllib.error.URLError as exc:
                failures.append(f"{path}: request failed ({exc})")
                continue

            if status != 200:
                failures.append(f"{path}: expected HTTP 200, got {status}")
                continue

            for needle in required:
                if needle not in body:
                    failures.append(f"{path}: missing expected content {needle!r}")

            for asset in local_assets(body):
                if asset in checked_assets:
                    continue
                checked_assets.add(asset)
                asset_url = f"{base}/{asset}"
                try:
                    asset_status, _ = fetch(asset_url)
                except urllib.error.URLError as exc:
                    failures.append(f"{path}: asset {asset!r} failed to load ({exc})")
                    continue
                if asset_status != 200:
                    failures.append(f"{path}: asset {asset!r} returned HTTP {asset_status}")

            print(f"✅ {path} (checked {len(required)} markers)")
    finally:
        httpd.shutdown()

    print(f"\nChecked {len(PAGES)} pages and {len(checked_assets)} local assets.")

    print(f"\nChecking live API at {API_BASE} ...")
    for endpoint, expected_status in API_ENDPOINTS:
        url = f"{API_BASE}{endpoint}"
        try:
            status, _ = fetch(url, timeout=20)
        except urllib.error.URLError as exc:
            failures.append(f"{API_BASE}{endpoint}: request failed ({exc})")
            continue
        if status != expected_status:
            failures.append(f"{API_BASE}{endpoint}: expected HTTP {expected_status}, got {status}")
            continue
        print(f"✅ {endpoint} -> {status}")

    if failures:
        print(f"\n❌ {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)

    print("✅ All pages and assets OK.")


if __name__ == "__main__":
    main()
