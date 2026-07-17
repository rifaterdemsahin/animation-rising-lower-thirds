/**
 * Rising Lower Thirds — shared animation engine.
 *
 * Implements the "Elastic Rise" motion spec from problem.md:
 * a damped harmonic oscillation y(t) = A * e^(-zeta*wn*t) * cos(wd*t),
 * with card 2 staggered +150ms behind card 1 (legacy 2-card shape), or
 * arbitrary caller-supplied delays for N cards (see PRESETS.kubernetes).
 *
 * Exposes:
 *  - LowerThirds.STYLE            visual spec constants
 *  - LowerThirds.PRESETS          shared example content (e.g. .kubernetes)
 *  - LowerThirds.springState(t, delayMs)   -> {y, opacity} at time t (ms)
 *  - LowerThirds.DURATION_MS       legacy fixed 2-card settle time
 *  - LowerThirds.computeDuration(cards)    settle time for an arbitrary card set
 *  - LowerThirds.mount(container, config)  DOM/CSS renderer (video-live.html, explainer.html)
 *  - LowerThirds.drawCanvasFrame(ctx, w, h, t, config, restY, onBackground)
 *    canvas renderer (video-recorded.html); onBackground(ctx) runs after the
 *    clear and before cards are drawn, for painting a background image.
 */
(function (global) {
  "use strict";

  const STYLE = {
    radius: 27,
    background: "rgba(11, 27, 30, 0.85)",
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderWidth: 1,
    paddingX: 28,
    paddingY: 14,
    gap: 24,
    iconColor: "#00D2D2",
    textColor: "#FFFFFF",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 26,
  };

  const STAGGER_MS = 150;
  const RISE_MS = 267; // frame 8 @ 30fps — opacity reaches 100%
  const SETTLE_MS = 1000; // frame 30 @ 30fps — motion considered settled
  const DURATION_MS = SETTLE_MS + STAGGER_MS + 200; // padding so the last card fully settles

  const AMPLITUDE = 120; // initial displacement, px
  const ZETA = 0.5; // damping ratio
  const WN = 11; // natural frequency (rad/s, tuned for ~1s settle)
  const WD = WN * Math.sqrt(1 - ZETA * ZETA);

  // Shared example content — single source of truth so video-recorded.html,
  // video-live.html, and explainer.html all demo the same Kubernetes flow
  // (cluster -> ingress gateway -> pod) instead of three separate copies of
  // the same array literal drifting apart. Callers should clone entries
  // before mutating (e.g. explainer.html's URL-param overrides) rather than
  // editing this array in place.
  const PRESETS = {
    kubernetes: {
      cards: [
        { icon: "🖥️", text: "Kubernetes Test Cluster", delayMs: 0 },
        { icon: "🚪", text: "Ingress Gateway", delayMs: 3200 },
        { icon: "📦", text: "Pod", delayMs: 6400 },
      ],
      background: "assets/k8s-explainer-background.png",
    },
  };

  /**
   * Motion state for a single card at global time t (ms).
   * delayMs staggers this card's local clock (card 2 = +150ms).
   */
  function springState(t, delayMs) {
    const localT = t - (delayMs || 0);
    if (localT <= 0) {
      return { y: AMPLITUDE, opacity: 0 };
    }
    const opacity = Math.min(1, localT / RISE_MS);
    if (localT >= SETTLE_MS) {
      return { y: 0, opacity: 1 };
    }
    const tSec = localT / 1000;
    const y = AMPLITUDE * Math.exp(-ZETA * WN * tSec) * Math.cos(WD * tSec);
    return { y, opacity };
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Normalizes a config into a flat array of cards, each with a delayMs.
   * Accepts either the legacy { card1, card2 } shape (delays 0 / STAGGER_MS)
   * or an explicit { cards: [{icon, text, delayMs}, ...] } for N cards with
   * caller-supplied timing (e.g. a multi-stage explainer).
   */
  function normalizeCards(config) {
    if (config.cards) return config.cards;
    return [
      Object.assign({ delayMs: 0 }, config.card1),
      Object.assign({ delayMs: STAGGER_MS }, config.card2),
    ];
  }

  /**
   * Time (ms) until every card in `cards` has fully settled.
   */
  function computeDuration(cards) {
    const maxDelay = cards.reduce((max, c) => Math.max(max, c.delayMs || 0), 0);
    return maxDelay + SETTLE_MS + 200;
  }

  // ---------------------------------------------------------------------
  // DOM / CSS renderer — used for the live overlay (video-live.html)
  // ---------------------------------------------------------------------

  function buildCardElement(card) {
    const el = document.createElement("div");
    el.className = "lt-card";
    el.innerHTML =
      '<span class="lt-icon">' + escapeHtml(card.icon || "") + "</span>" +
      '<span class="lt-text">' + escapeHtml(card.text || "") + "</span>";
    return el;
  }

  /**
   * Mounts lower-third cards into `container` and animates them in.
   * config: { card1: {icon, text}, card2: {icon, text} } (legacy 2-card shape)
   *      or { cards: [{icon, text, delayMs}, ...] } (N cards, custom timing)
   * Returns a controller: { stop(), replay() }
   */
  function mount(container, config) {
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "lt-wrap";
    const cards = normalizeCards(config);
    const elements = cards.map(function (card) {
      const el = buildCardElement(card);
      wrap.appendChild(el);
      return el;
    });
    container.appendChild(wrap);

    const duration = computeDuration(cards);
    let rafId = null;
    let start = null;

    function frame(now) {
      if (start === null) start = now;
      const t = now - start;
      cards.forEach(function (card, i) {
        const s = springState(t, card.delayMs || 0);
        elements[i].style.transform = "translateY(" + s.y + "px)";
        elements[i].style.opacity = String(s.opacity);
      });
      if (t < duration) {
        rafId = requestAnimationFrame(frame);
      }
    }

    function stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    }

    function replay() {
      stop();
      start = null;
      rafId = requestAnimationFrame(frame);
    }

    replay();
    return { stop, replay };
  }

  // ---------------------------------------------------------------------
  // Canvas renderer — used for recording to video (video-recorded.html)
  // ---------------------------------------------------------------------

  function measureCard(ctx, card) {
    ctx.font = STYLE.fontSize + "px " + STYLE.fontFamily;
    const iconWidth = STYLE.fontSize + 10;
    const textWidth = ctx.measureText(card.text || "").width;
    const width = STYLE.paddingX * 2 + iconWidth + textWidth;
    const height = STYLE.paddingY * 2 + STYLE.fontSize;
    return { width, height, iconWidth };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCard(ctx, x, y, dims, card, opacity) {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;

    roundRect(ctx, x, y, dims.width, dims.height, STYLE.radius);
    ctx.fillStyle = STYLE.background;
    ctx.fill();
    ctx.lineWidth = STYLE.borderWidth;
    ctx.strokeStyle = STYLE.borderColor;
    ctx.stroke();

    ctx.font = STYLE.fontSize + "px " + STYLE.fontFamily;
    ctx.textBaseline = "middle";

    ctx.fillStyle = STYLE.iconColor;
    ctx.fillText(card.icon || "", x + STYLE.paddingX, y + dims.height / 2);

    ctx.fillStyle = STYLE.textColor;
    ctx.fillText(card.text || "", x + STYLE.paddingX + dims.iconWidth, y + dims.height / 2);

    ctx.restore();
  }

  /**
   * Draws one frame of the card animation at time t (ms) onto a canvas.
   * `restY` is the resting baseline (bottom) Y coordinate for all cards.
   * Accepts the same { card1, card2 } / { cards: [...] } config shapes as mount().
   * `onBackground(ctx)`, if given, runs right after the clear and before any
   * cards are drawn — e.g. to paint a background image under them.
   */
  function drawCanvasFrame(ctx, width, height, t, config, restY, onBackground) {
    ctx.clearRect(0, 0, width, height);
    if (onBackground) onBackground(ctx);

    const cards = normalizeCards(config);
    const dims = cards.map(function (card) { return measureCard(ctx, card); });
    const totalWidth = dims.reduce(function (sum, d) { return sum + d.width; }, 0) + STYLE.gap * (cards.length - 1);
    const baseline = restY !== undefined ? restY : height - 160;

    let x = (width - totalWidth) / 2;
    cards.forEach(function (card, i) {
      const s = springState(t, card.delayMs || 0);
      drawCard(ctx, x, baseline - dims[i].height + s.y, dims[i], card, s.opacity);
      x += dims[i].width + STYLE.gap;
    });
  }

  global.LowerThirds = {
    STYLE: STYLE,
    STAGGER_MS: STAGGER_MS,
    DURATION_MS: DURATION_MS,
    PRESETS: PRESETS,
    springState: springState,
    computeDuration: computeDuration,
    normalizeCards: normalizeCards,
    mount: mount,
    drawCanvasFrame: drawCanvasFrame,
  };
})(window);
