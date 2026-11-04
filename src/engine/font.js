/**
 * Vector text rendering.
 *
 * The game draws real type with the canvas 2D text API rather than a bitmap
 * font, so it stays crisp at any resolution. A rounded, chunky sans stack
 * keeps the friendly cartoon feel of the reference art.
 *
 * The public API mirrors the old bitmap font so callers do not need to
 * change much:
 *
 *   drawText(ctx, str, x, y, opts)  -> width in pixels
 *   textWidth(str, size)            -> width in pixels
 *   wrapText(str, maxWidth, size)   -> array of lines
 */

export const FONT_STACK =
  '"Trebuchet MS", "Segoe UI", "Verdana", "DejaVu Sans", system-ui, sans-serif';

export const FONT_H = 12;      // nominal line height at size 12
export const FONT_W = 8;       // nominal advance width at size 12

const DEFAULT_SIZE = 12;

/**
 * A shared offscreen canvas used purely for measuring text. Measuring with
 * the real context is more accurate, but the shared one is a safe fallback
 * for headless environments where no canvas is available.
 */
let measureCtx = null;

function getMeasureCtx() {
  if (measureCtx) return measureCtx;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  try {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    measureCtx = c.getContext('2d');
  } catch {
    measureCtx = null;
  }
  return measureCtx;
}

/**
 * Apply the font settings to a context.
 */
function applyFont(ctx, size, weight) {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
}

/**
 * Measure a string's width in pixels.
 */
export function textWidth(str, size = DEFAULT_SIZE, weight = 700) {
  str = String(str ?? '');
  if (!str.length) return 0;
  const m = getMeasureCtx();
  if (!m) {
    // Rough fallback: average glyph advance is about 0.55em for this stack.
    return str.length * size * 0.55;
  }
  applyFont(m, size, weight);
  return m.measureText(str).width;
}

/**
 * Height of a line of text at the given size.
 */
export function textHeight(size = DEFAULT_SIZE) {
  return Math.round(size * 1.2);
}

/**
 * Draw text onto a canvas 2d context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} str
 * @param {number} x
 * @param {number} y       top of the text box
 * @param {object} [opts]
 * @param {number} [opts.size=12]     font size in px
 * @param {number} [opts.weight=700]  font weight
 * @param {string} [opts.color='#fff']
 * @param {string} [opts.shadow]      drop shadow colour
 * @param {number} [opts.shadowOffset=2]
 * @param {'left'|'center'|'right'} [opts.align='left']
 * @param {'normal'|'uppercase'|'lowercase'} [opts.transform='normal']
 */
export function drawText(ctx, str, x, y, opts = {}) {
  const {
    size = DEFAULT_SIZE,
    weight = 700,
    color = '#ffffff',
    shadow = null,
    shadowOffset = 0,
    align = 'left',
    transform = 'normal',
  } = opts;

  str = String(str ?? '');
  if (!str.length) return 0;
  if (transform === 'uppercase') str = str.toUpperCase();
  else if (transform === 'lowercase') str = str.toLowerCase();

  const w = textWidth(str, size, weight);
  let ox = x;
  if (align === 'center') ox = x - w / 2;
  else if (align === 'right') ox = x - w;

  ctx.save();
  applyFont(ctx, size, weight);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(str, ox + shadowOffset, y + shadowOffset);
  }

  ctx.fillStyle = color;
  ctx.fillText(str, ox, y);
  ctx.restore();
  return w;
}

/**
 * Wrap text to a maximum pixel width, returning an array of lines.
 */
export function wrapText(str, maxWidth, size = DEFAULT_SIZE, weight = 700) {
  const words = String(str ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (textWidth(test, size, weight) <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
