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
      '<a href="' + GITHUB_URL + '" target="_blank" rel="noopener">📦 View project on GitHub →</a>' +
      '<a href="' + ACTIONS_URL + '" target="_blank" rel="noopener">⚙️ Actions →</a>' +
      "</span>";

    footer.appendChild(inner);
    document.body.appendChild(footer);
  }

  buildNav();
  buildFooter();
})();
