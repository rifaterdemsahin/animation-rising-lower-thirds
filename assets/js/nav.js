/**
 * Shared top menu + footer, injected into every page.
 * Keeps navigation in one place instead of duplicating markup per page.
 */
(function () {
  "use strict";

  // Top nav, logically grouped: a top-level page (Home) stays a plain link;
  // everything else is grouped under a labeled dropdown by what job it does
  // (produce an output vs. reference material) rather than listed flat.
  var NAV_GROUPS = [
    { href: "index.html", label: "🏠 Home" },
    {
      label: "🎬 Outputs",
      submenu: [
        { href: "video-recorded.html", label: "🎥 Recorded Video" },
        { href: "video-live.html", label: "📡 Live Overlay" },
        { href: "explainer.html", label: "🧭 Explainer" },
        { href: "canva-guide.html", label: "🎨 Canva Guide (manual, no-code)" },
      ],
    },
    {
      label: "📚 Resources",
      submenu: [
        { href: "mcp-guide.html", label: "📖 API Guide" },
        { href: "recommendation.html", label: "💡 Recommendations" },
        { href: "proposed-solution.html", label: "🤖 Proposed Solution" },
        { href: "master-spec.html", label: "🗂️ Master Spec" },
        { href: "cost-analysis.html", label: "💰 Cost Analysis" },
        { href: "sitemap.html", label: "🗺️ Sitemap" },
      ],
    },
  ];

  // Search index — page/doc title -> URL. Flat and title-only (not full-text
  // across every doc's body) on purpose: fetching+indexing every markdown
  // file's contents client-side would add real latency and complexity for a
  // handful of pages where a title match already gets you there in one type.
  var SEARCH_INDEX = [
    { href: "index.html", label: "🏠 Home" },
    { href: "video-recorded.html", label: "🎥 Recorded Video" },
    { href: "video-live.html", label: "📡 Live Overlay" },
    { href: "explainer.html", label: "🧭 Explainer" },
    { href: "canva-guide.html", label: "🎨 Canva Guide" },
    { href: "mcp-guide.html", label: "📖 API Guide" },
    { href: "recommendation.html", label: "💡 Recommendations" },
    { href: "proposed-solution.html", label: "🤖 Proposed Solution" },
    { href: "master-spec.html", label: "🗂️ Master Spec" },
    { href: "cost-analysis.html", label: "💰 Cost Analysis" },
    { href: "sitemap.html", label: "🗺️ Sitemap" },
    { href: "markdown_renderer.html?file=README.md", label: "📖 README.md" },
    { href: "markdown_renderer.html?file=CLAUDE.md", label: "🧠 CLAUDE.md" },
    { href: "markdown_renderer.html?file=problem.md", label: "📐 problem.md" },
    { href: "markdown_renderer.html?file=MASTER_SPEC.md", label: "🗂️ MASTER_SPEC.md" },
    { href: "markdown_renderer.html?file=MCP_GUIDE.md", label: "📡 MCP_GUIDE.md" },
    { href: "markdown_renderer.html?file=SANITY_CHECK.md", label: "✅ SANITY_CHECK.md" },
    { href: "markdown_renderer.html?file=server/README.md", label: "🚀 server/README.md" },
    { href: "markdown_renderer.html?file=canva.md", label: "🎨 canva.md" },
  ];

  var GITHUB_URL = "https://github.com/rifaterdemsahin/animation-rising-lower-thirds";
  var ACTIONS_URL = "https://github.com/rifaterdemsahin/animation-rising-lower-thirds/actions";
  var API_URL = "https://lower-thirds-api.fly.dev";
  var THEME_KEY = "lower-thirds-theme";

  function applyStoredTheme() {
    var stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function buildThemeToggle() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";

    function render() {
      var theme = currentTheme();
      btn.textContent = theme === "light" ? "🌙 Dark mode" : "☀️ Light mode";
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }

    btn.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      window.localStorage.setItem(THEME_KEY, next);
      render();
    });

    render();
    return btn;
  }

  function currentPage() {
    var path = window.location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  // A labeled group of links, rendered as a hover dropdown (desktop) that's
  // also click-toggleable (touch/keyboard). The group label itself is not a
  // page (no href) — it's just the toggle; only submenu items navigate.
  function buildDropdown(group, current) {
    var wrap = document.createElement("div");
    wrap.className = "nav-dropdown";

    var isActive = group.submenu.some(function (sub) { return sub.href === current; });

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-dropdown-label";
    toggle.textContent = group.label + " ▾";
    if (isActive) toggle.classList.add("active");
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      document.querySelectorAll(".nav-dropdown.open").forEach(function (el) {
        if (el !== wrap) el.classList.remove("open");
      });
      wrap.classList.toggle("open");
    });
    wrap.appendChild(toggle);

    var menu = document.createElement("div");
    menu.className = "nav-dropdown-menu";
    group.submenu.forEach(function (sub) {
      var subA = document.createElement("a");
      subA.href = sub.href;
      subA.textContent = sub.label;
      if (sub.href === current) subA.classList.add("active");
      menu.appendChild(subA);
    });
    wrap.appendChild(menu);

    return wrap;
  }

  document.addEventListener("click", function (e) {
    document.querySelectorAll(".nav-dropdown.open").forEach(function (el) {
      if (!el.contains(e.target)) el.classList.remove("open");
    });
  });

  function buildSearch() {
    var wrap = document.createElement("div");
    wrap.className = "nav-search";

    var input = document.createElement("input");
    input.type = "search";
    input.placeholder = "🔍 Search";
    input.setAttribute("aria-label", "Search pages and docs");
    wrap.appendChild(input);

    var results = document.createElement("div");
    results.className = "nav-search-results";
    wrap.appendChild(results);

    function render(query) {
      results.innerHTML = "";
      if (!query) {
        results.classList.remove("open");
        return;
      }
      var q = query.toLowerCase();
      var matches = SEARCH_INDEX.filter(function (item) {
        return item.label.toLowerCase().indexOf(q) !== -1 || item.href.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 8);

      if (!matches.length) {
        var empty = document.createElement("div");
        empty.className = "nav-search-empty";
        empty.textContent = "No matches";
        results.appendChild(empty);
      } else {
        matches.forEach(function (item) {
          var a = document.createElement("a");
          a.href = item.href;
          a.textContent = item.label;
          results.appendChild(a);
        });
      }
      results.classList.add("open");
    }

    input.addEventListener("input", function () { render(input.value.trim()); });
    input.addEventListener("focus", function () { if (input.value.trim()) render(input.value.trim()); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var first = results.querySelector("a");
        if (first) window.location.href = first.getAttribute("href");
      } else if (e.key === "Escape") {
        input.value = "";
        render("");
        input.blur();
      }
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) results.classList.remove("open");
    });

    return wrap;
  }

  function buildNav() {
    var current = currentPage();
    var header = document.createElement("header");
    header.className = "site-nav";

    var inner = document.createElement("div");
    inner.className = "site-nav-inner";

    var brand = document.createElement("a");
    brand.className = "site-brand";
    brand.href = "index.html";
    brand.textContent = "🎬 Rising Lower Thirds";
    inner.appendChild(brand);

    var links = document.createElement("nav");
    links.className = "site-links";
    NAV_GROUPS.forEach(function (item) {
      if (item.submenu) {
        links.appendChild(buildDropdown(item, current));
        return;
      }
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      if (item.href === current) a.classList.add("active");
      links.appendChild(a);
    });
    inner.appendChild(links);

    inner.appendChild(buildSearch());

    header.appendChild(inner);
    document.body.insertBefore(header, document.body.firstChild);
  }

  function buildFooter() {
    var footer = document.createElement("footer");
    footer.className = "site-footer";

    var inner = document.createElement("div");
    inner.className = "site-footer-inner";
    inner.innerHTML =
      "<span>🎬 Animation Helper for Rising Lower Thirds</span>" +
      '<span class="site-footer-links">' +
      '<a href="' + API_URL + '" target="_blank" rel="noopener">🚀 Live API →</a>' +
      '<a href="' + GITHUB_URL + '" target="_blank" rel="noopener">📦 GitHub →</a>' +
      '<a href="' + ACTIONS_URL + '" target="_blank" rel="noopener">⚙️ Actions →</a>' +
      "</span>";

    inner.querySelector(".site-footer-links").appendChild(buildThemeToggle());

    footer.appendChild(inner);
    document.body.appendChild(footer);
  }

  applyStoredTheme();
  buildNav();
  buildFooter();
})();
