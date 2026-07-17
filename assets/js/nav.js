/**
 * Shared top menu + footer, injected into every page.
 * Keeps navigation in one place instead of duplicating markup per page.
 */
(function () {
  "use strict";

  var PAGES = [
    { href: "index.html", label: "🏠 Home" },
    { href: "video-recorded.html", label: "🎥 Recorded Video" },
    { href: "video-live.html", label: "📡 Live Overlay" },
    { href: "explainer.html", label: "🧭 Explainer" },
    { href: "mcp-guide.html", label: "📖 API Guide" },
    { href: "recommendation.html", label: "💡 Recommendations" },
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
    PAGES.forEach(function (page) {
      var a = document.createElement("a");
      a.href = page.href;
      a.textContent = page.label;
      if (page.href === current) a.classList.add("active");
      links.appendChild(a);
    });
    inner.appendChild(links);

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
      '<a href="master-spec.html">🗂️ Master Spec</a>' +
      '<a href="' + API_URL + '" target="_blank" rel="noopener">🚀 API →</a>' +
      '<a href="' + GITHUB_URL + '" target="_blank" rel="noopener">📦 View project on GitHub →</a>' +
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
