/**
 * Rising Lower Thirds — shared animation engine.
 *
 * Implements the "Elastic Rise" motion spec from problem.md:
 * a damped harmonic oscillation y(t) = A * e^(-zeta*wn*t) * cos(wd*t),
 * with card 2 staggered +150ms behind card 1.
 *
 * Exposes:
 *  - LowerThirds.STYLE            visual spec constants
 *  - LowerThirds.springState(t, delayMs)   -> {y, opacity} at time t (ms)
 *  - LowerThirds.DURATION_MS       time until the motion has fully settled
 *  - LowerThirds.mount(container, config)  DOM/CSS renderer (video-live.html)
 *  - LowerThirds.drawCanvasFrame(ctx, w, h, t, config)  canvas renderer (video-recorded.html)
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
   * Mounts two lower-third cards into `container` and animates them in.
   * config: { card1: {icon, text}, card2: {icon, text} }
   * Returns a controller: { stop(), replay() }
   */
  function mount(container, config) {
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "lt-wrap";
    const el1 = buildCardElement(config.card1);
    const el2 = buildCardElement(config.card2);
    wrap.appendChild(el1);
    wrap.appendChild(el2);
    container.appendChild(wrap);

    let rafId = null;
    let start = null;

    function frame(now) {
      if (start === null) start = now;
      const t = now - start;
      const s1 = springState(t, 0);
      const s2 = springState(t, STAGGER_MS);
      el1.style.transform = "translateY(" + s1.y + "px)";
      el1.style.opacity = String(s1.opacity);
      el2.style.transform = "translateY(" + s2.y + "px)";
      el2.style.opacity = String(s2.opacity);
      if (t < DURATION_MS) {
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
   * Draws one frame of the two-card animation at time t (ms) onto a canvas.
   * `restY` is the resting baseline (bottom) Y coordinate for both cards.
   */
  function drawCanvasFrame(ctx, width, height, t, config, restY) {
    ctx.clearRect(0, 0, width, height);

    const dims1 = measureCard(ctx, config.card1);
    const dims2 = measureCard(ctx, config.card2);
    const totalWidth = dims1.width + STYLE.gap + dims2.width;
    const startX = (width - totalWidth) / 2;
    const baseline = restY !== undefined ? restY : height - 160;

    const s1 = springState(t, 0);
    const s2 = springState(t, STAGGER_MS);

    drawCard(ctx, startX, baseline - dims1.height + s1.y, dims1, config.card1, s1.opacity);
    drawCard(ctx, startX + dims1.width + STYLE.gap, baseline - dims2.height + s2.y, dims2, config.card2, s2.opacity);
  }

  global.LowerThirds = {
    STYLE: STYLE,
    STAGGER_MS: STAGGER_MS,
    DURATION_MS: DURATION_MS,
    springState: springState,
    mount: mount,
    drawCanvasFrame: drawCanvasFrame,
  };
})(window);
