/**
 * Drawing primitives.
 *
 * Everything is vector: rounded rectangles, gradients, soft shadows and
 * strokes. There is no pixel grid any more, so the art stays sharp at any
 * canvas size.
 */

export const PALETTE = {
  night: '#0d1b3d',
  ink: '#101020',
  shadow: 'rgba(0,0,0,0.25)',
  white: '#ffffff',
  cream: '#fdf3d8',
  sand: '#e8c98a',
  wood: '#8b5a2b',
  woodDark: '#5d3a1a',
  gold: '#ffd45e',
  goldDark: '#c9992b',
  red: '#e4573d',
  green: '#5fbf5a',
  blue: '#3d7fd6',
  deepBlue: '#1b3a6b',
};

/**
 * The UI theme.
 *
 * The reference art pairs a warm "weathered timber" frame with a cream
 * parchment interior and an amber title strip, so the panels read as a
 * physical object hung over the ocean.
 *
 * The values are deliberately high-contrast: the ink is nearly black on
 * cream parchment, the timber frame is a full two stops darker than the
 * body it surrounds, and every panel carries a hard outline so it reads
 * clearly against bright water or a dark night sky.
 */
export const THEME = {
  // Parchment (panel interiors)
  parch: '#fdf0d2',
  parchMid: '#f2e0b6',
  parchDark: '#e3cfa0',
  parchLine: '#b8996a',
  parchHi: '#fffaf0',
  parchShade: '#d9c093',

  // Timber (frames, bars, chips)
  wood: '#8b5a2b',
  woodLight: '#b47a3c',
  woodHi: '#d29a55',
  woodDark: '#5d3a1a',
  woodDarkest: '#2e1c0a',

  // Ink (text on parchment)
  ink: '#241708',
  inkSoft: '#6a5030',

  // Accents
  gold: '#ffd45e',
  goldLight: '#ffe89a',
  goldDark: '#8f6708',
  red: '#e4573d',
  redDark: '#93240f',
  green: '#4f9d43',
  greenLight: '#7ce09a',
  greenDark: '#215733',
  blue: '#3d7fd6',
  blueLight: '#9fd8ff',
  slate: '#2b3a4f',
  slateLight: '#48607d',
  sky: '#4aa3ff',

  shadow: 'rgba(28,14,2,0.48)',
  softShadow: 'rgba(16,9,2,0.28)',
};

/** Disable smoothing on a 2d context (kept for crisp sprite blits). */
export function pixelate(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
}

/**
 * Fill a rect.
 */
export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/**
 * Fill a rect outline.
 */
export function frame(ctx, x, y, w, h, color, t = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, t);
  ctx.fillRect(x, y + h - t, w, t);
  ctx.fillRect(x, y, t, h);
  ctx.fillRect(x + w - t, y, t, h);
}

/**
 * Draw a rounded rectangle path (does not fill).
 */
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Fill a rounded rectangle.
 */
export function roundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

/**
 * Stroke a rounded rectangle.
 */
export function roundRectStroke(ctx, x, y, w, h, r, color, lw = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

/**
 * A soft drop shadow beneath a rounded panel.
 */
export function shadowRect(ctx, x, y, w, h, color = 'rgba(0,0,0,0.3)', off = 3, r = 8) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = off * 3;
  ctx.shadowOffsetY = off;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

/**
 * A vertical linear gradient fill.
 */
export function vGradient(ctx, x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/**
 * A vertical linear gradient clipped to a rounded rect.
 */
export function vGradientRound(ctx, x, y, w, h, r, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

/**
 * Parse a hex colour into components.
 */
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Blend two hex colours. t = 0 gives `a`, t = 1 gives `b`. */
export function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Lighten a hex colour toward white. */
export function lighten(hex, amt) {
  const c = hexToRgb(hex);
  const f = (v) => Math.round(v + (255 - v) * amt);
  return `rgb(${f(c.r)},${f(c.g)},${f(c.b)})`;
}

/** Darken a hex colour toward black. */
export function darken(hex, amt) {
  const c = hexToRgb(hex);
  const f = (v) => Math.round(v * (1 - amt));
  return `rgb(${f(c.r)},${f(c.g)},${f(c.b)})`;
}

/**
 * A raised timber frame around a parchment interior.
 *
 * Returns the inner content rect (x, y, w, h).
 */
export function woodPanel(ctx, x, y, w, h, {
  body = THEME.parch,
  frameColor = THEME.wood,
  light = THEME.woodHi,
  dark = THEME.woodDark,
  shadow = true,
  thickness = 8,
  radius = 10,
} = {}) {
  const T = thickness;

  if (shadow) shadowRect(ctx, x, y, w, h, THEME.shadow, 5, radius);

  // Outer timber band.
  vGradientRound(ctx, x, y, w, h, radius, lighten(frameColor, 0.20), darken(frameColor, 0.30));
  roundRectStroke(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius, THEME.woodDarkest, 2.5);

  // Inner parchment body.
  const bx = x + T, by = y + T, bw = w - T * 2, bh = h - T * 2;
  const br = Math.max(2, radius - T / 2);
  vGradientRound(ctx, bx, by, bw, bh, br, body, darken(body, 0.14));

  // A hard inner outline separates the parchment from the timber.
  roundRectStroke(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, br, darken(frameColor, 0.42), 1.5);

  // Lit top-left edge and shaded bottom-right edge.
  ctx.save();
  roundRectPath(ctx, bx, by, bw, bh, br);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillRect(bx, by, bw, 2);
  ctx.fillRect(bx, by, 2, bh);
  ctx.fillStyle = 'rgba(110,78,36,0.26)';
  ctx.fillRect(bx, by + bh - 2, bw, 2);
  ctx.fillRect(bx + bw - 2, by, 2, bh);
  ctx.restore();

  return { x: bx, y: by, w: bw, h: bh };
}

/**
 * An amber header banner with a chunky outlined title, in the style of the
 * reference art's header bars.
 */
export function titleBanner(ctx, x, y, w, h, title, color = '#3a2410', opts = {}) {
  const { drawText } = opts;
  vGradientRound(ctx, x, y, w, h, 6, '#d8b070', '#b5823f');
  roundRectStroke(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6, '#7a5220', 2);
  // Highlight along the top.
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillRect(x + 3, y + 2, w - 6, 1);
}

/**
 * A parchment panel with an amber header bar, in the style of the
 * reference art: a light body, a warm title strip and a thin border.
 *
 * Returns { x, y, w, h, textY, textH, bodyY } where `bodyY` is the first
 * usable content row inside the panel.
 */
export function panel(ctx, x, y, w, h, {
  title = null,
  titleHeight = 30,
  titleColor = '#3a2410',
  body = THEME.parch,
  titleIcon = null,
} = {}) {
  shadowRect(ctx, x, y, w, h, THEME.shadow, 4, 10);

  // Parchment body.
  vGradientRound(ctx, x, y, w, h, 10, body, darken(body, 0.12));
  roundRectStroke(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10, '#a98a52', 2);

  const inner = { x: x + 1, y: y + 1, w: w - 2, h: h - 2 };

  if (!title) {
    return { ...inner, textY: inner.y, textH: 0, bodyY: inner.y + 10 };
  }

  // Amber header strip with a darker underline.
  ctx.save();
  roundRectPath(ctx, inner.x, inner.y, inner.w, inner.h, 9);
  ctx.clip();
  vGradient(ctx, inner.x, inner.y, inner.w, titleHeight, '#e0b878', '#b5823f');
  ctx.fillStyle = '#f2d199';
  ctx.fillRect(inner.x, inner.y, inner.w, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(inner.x, inner.y + 2, 2, titleHeight - 4);
  ctx.fillStyle = 'rgba(90,55,20,0.22)';
  ctx.fillRect(inner.x + inner.w - 2, inner.y + 2, 2, titleHeight - 4);
  ctx.fillStyle = '#8a5c22';
  ctx.fillRect(inner.x, inner.y + titleHeight - 2, inner.w, 2);
  ctx.restore();

  const bodyY = inner.y + titleHeight;
  ctx.fillStyle = '#cbb083';
  ctx.fillRect(inner.x, bodyY, inner.w, 1);

  return {
    ...inner,
    textY: inner.y,
    textH: titleHeight,
    bodyY: bodyY + 10,
    title,
    titleColor,
    titleIcon,
  };
}

/**
 * A small dark wooden chip used for HUD readouts.
 */
export function chip(ctx, x, y, w, h, {
  fill = '#2e1c0e',
  light = '#6b4423',
  dark = '#180d05',
  radius = 5,
} = {}) {
  vGradientRound(ctx, x, y, w, h, radius, lighten(fill, 0.16), fill);
  roundRectStroke(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius, dark, 1.5);
  ctx.fillStyle = light;
  ctx.fillRect(x + 3, y + 1, w - 6, 1);
}

/**
 * A horizontal progress/health bar with a rounded, bevelled frame.
 */
export function bar(ctx, x, y, w, h, ratio, fill, back = '#16233f', border = null) {
  const inner = Math.max(0, Math.min(1, ratio));
  const r = h / 2;

  // Recessed well.
  vGradientRound(ctx, x, y, w, h, r, darken(back, 0.30), back);
  roundRectStroke(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r, border || darken(back, 0.5), 1.5);

  const fw = (w - 4) * inner;
  if (fw > 1) {
    ctx.save();
    roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, Math.max(1, r - 1));
    ctx.clip();
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, fw, h - 4);
    ctx.fillStyle = lighten(fill, 0.35);
    ctx.fillRect(x + 2, y + 2, fw, Math.max(1, (h - 4) * 0.4));
    ctx.restore();
  }
}

/**
 * A gold coin drawn with vector shapes.
 */
export function coin(ctx, x, y, size = 16) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;

  // Outer rim.
  ctx.fillStyle = '#c9992b';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner face with a gradient.
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffe89a');
  g.addColorStop(0.55, '#ffd45e');
  g.addColorStop(1, '#e0a51f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r - Math.max(1, r * 0.18), 0, Math.PI * 2);
  ctx.fill();

  // Highlight.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.28, cy - r * 0.34, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // "$" mark.
  ctx.strokeStyle = '#a8801a';
  ctx.lineWidth = Math.max(1, size * 0.11);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.46);
  ctx.lineTo(cx, cy + r * 0.46);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.22, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.22, r * 0.28, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
}

/**
 * Draw a sprite from a string grid. '.' and ' ' are transparent.
 *
 * @param {string[]} rows
 * @param {Record<string,string>} map char -> colour
 */
export function sprite(ctx, rows, map, x, y, flipX = false) {
  const h = rows.length;
  for (let ry = 0; ry < h; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === '.' || ch === ' ') continue;
      const col = map[ch];
      if (!col) continue;
      const px = flipX ? x + (row.length - 1 - rx) : x + rx;
      ctx.fillStyle = col;
      ctx.fillRect(px, y + ry, 1, 1);
    }
  }
}

/**
 * Scale a sprite up by an integer factor.
 */
export function spriteScaled(ctx, rows, map, x, y, scale = 1, flipX = false) {
  const h = rows.length;
  for (let ry = 0; ry < h; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === '.' || ch === ' ') continue;
      const col = map[ch];
      if (!col) continue;
      const col_ = flipX ? row.length - 1 - rx : rx;
      ctx.fillRect(x + col_ * scale, y + ry * scale, scale, scale);
    }
  }
}

/**
 * Clamp helper.
 */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Linear interpolation.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Mulberry32 seeded PRNG — deterministic, used for scenery so the world
 * does not reshuffle every frame.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
