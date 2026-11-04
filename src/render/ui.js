/**
 * UI layer: HUD, buttons, panels, the catch popup, the shop, the
 * collection book and the location map.
 *
 * The visual language follows the reference art: a deep blue HUD strip at
 * the top, timber-framed panels with amber header bars down the right, and
 * a soft translucent log feed in the bottom-left.
 */

import { drawText, textWidth, wrapText, textHeight } from '../engine/font.js';
import {
  rect, frame, panel, bar, coin, clamp, shadowRect, chip,
  woodPanel, titleBanner, THEME, lighten, darken, mixHex,
  roundRect, roundRectPath, roundRectStroke, vGradientRound,
} from '../engine/gfx.js';
import { FISH_BY_ID, TIERS, UPGRADES, LOCATIONS, WEATHER_BY_ID } from '../game/content.js';
import { locationRequirements } from '../game/state.js';
import { W, H } from '../engine/view.js';
import {
  drawFish, drawFishFitted, drawFishScaled, drawFishPortrait, drawSparkle,
  drawCircle, drawShipwreck, drawCoralArch, drawDeadTree,
} from './sprites.js';

export { W, H };

/**
 * Truncate a string with an ellipsis so it fits within `maxW` pixels.
 */
function fitText(str, maxW, size = 14, weight = 700) {
  if (textWidth(str, size, weight) <= maxW) return str;
  let out = str;
  while (out.length > 1 && textWidth(`${out}…`, size, weight) > maxW) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

// -------------------------------------------------------------------- button

/**
 * The chips in the bottom action bar.
 *
 * The layout is shared between the render pass, which draws the chips, and
 * the update pass, which has to recognise that a click landed on one so it
 * does not *also* cast a line. Both passes therefore call this, and the
 * rectangles are always in sync.
 *
 * @param {boolean} upgradesOpen  whether the upgrades panel is currently shown
 * @returns {Array<{action:string,label:string,x:number,y:number,w:number,h:number}>}
 */
export function actionBarChips(upgradesOpen = false) {
  const items = [
    { action: 'upgrades', key: 'U', label: upgradesOpen ? 'Hide upgrades' : 'Upgrades' },
    { action: 'shop', key: 'S', label: 'Market' },
    { action: 'collection', key: 'C', label: 'Collection' },
    { action: 'travel', key: 'M', label: 'Travel' },
    { action: 'stats', key: 'Tab', label: 'Stats' },
  ];
  const y = H - 42;
  let x = 12;
  return items.map((it) => {
    const label = `${it.key}: ${it.label}`;
    const w = textWidth(label, 14, 700) + 24;
    const chip = { action: it.action, label, x, y, w, h: 30 };
    x += w + 8;
    return chip;
  });
}

/**
 * Where the HUD's fullscreen toggle sits, given the location name shown
 * next to it. Shared with the update pass for the same reason as
 * `actionBarChips`.
 *
 * @param {string} locName
 */
export function fullscreenButtonRect(locName) {
  const nw = Math.max(textWidth(locName, 17, 800), 90) + 74;
  const nx = W - nw - 10;
  const size = 30;
  return { x: nx - 38, y: 8, w: size, h: size };
}


/**
 * A rounded green "buy" button, in the style of the reference art.
 * Returns true when clicked this frame.
 */
export function button(ctx, input, {
  x, y, w, h, label, sub = null,
  enabled = true, accent = THEME.green, radius = 8,
}) {
  const hovering = enabled && input.mouse.x >= x && input.mouse.x < x + w &&
    input.mouse.y >= y && input.mouse.y < y + h;
  const pressed = hovering && input.mouse.justDown;

  ctx.save();
  if (pressed) ctx.translate(0, 1);

  const base = enabled ? (hovering ? lighten(accent, 0.12) : accent) : '#7d8a78';
  const top = enabled ? lighten(base, 0.28) : '#9aa596';
  const bottom = enabled ? darken(base, 0.22) : '#5f6a5c';

  shadowRect(ctx, x, y + 2, w, h, 'rgba(20,30,16,0.32)', 3, radius);
  vGradientRound(ctx, x, y, w, h, radius, top, bottom);
  roundRectStroke(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius,
    enabled ? darken(base, 0.42) : '#59614f', 2);

  // Top gloss.
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  roundRect(ctx, x + 3, y + 2, w - 6, Math.max(2, h * 0.3), Math.max(1, radius - 2),
    'rgba(255,255,255,0.30)');

  const textCol = enabled ? '#ffffff' : '#c2c8bb';
  const ty = sub ? y + Math.round(h * 0.16) : y + Math.round((h - 15) / 2);
  drawText(ctx, label, x + Math.round(w / 2), ty, {
    color: textCol, align: 'center', size: 14, weight: 800,
    shadow: 'rgba(10,30,12,0.55)', shadowOffset: 1.5,
  });
  if (sub) {
    drawText(ctx, sub, x + Math.round(w / 2), ty + 17, {
      color: enabled ? '#e4f3d8' : '#aeb5a6', align: 'center', size: 11, weight: 600,
    });
  }
  ctx.restore();

  return pressed;
}

/**
 * A small rounded button used inside panels.
 */
function miniButton(ctx, input, {
  x, y, w, h, enabled = true, accent = THEME.green, tint = null, radius = 6,
}) {
  const hovering = enabled && input.mouse.x >= x && input.mouse.x < x + w &&
    input.mouse.y >= y && input.mouse.y < y + h;

  const base = !enabled ? '#8a8272'
    : tint === 'red' ? (hovering ? '#f0664f' : '#d9482f')
    : tint === 'green' ? (hovering ? '#63c257' : '#4f9d43')
    : (hovering ? lighten(accent, 0.18) : accent);

  vGradientRound(ctx, x, y, w, h, radius, lighten(base, 0.26), darken(base, 0.2));
  roundRectStroke(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius, darken(base, 0.4), 1.5);
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  roundRect(ctx, x + 2, y + 1.5, w - 4, Math.max(1.5, h * 0.28), Math.max(1, radius - 1),
    'rgba(255,255,255,0.26)');

  return hovering;
}

/**
 * Apply a scroll offset inside a clipped region.
 */
export function withClip(ctx, x, y, w, h, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  fn();
  ctx.restore();
}

// ------------------------------------------------------------------------ HUD

/**
 * Top bar: a deep blue signboard carrying coins, level, bait and the
 * location name.
 */
export function drawHUD(ctx, state, loc, t, opts = {}) {
  const BAR_H = 46;

  // Board.
  vGradientRound(ctx, -6, -6, W + 12, BAR_H + 6, 14, '#2f5c8f', '#1b3a5e');
  rect(ctx, 0, BAR_H - 4, W, 5, 'rgba(6,16,32,0.62)');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 0, W, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, BAR_H - 5, W, 1);

  // Coins.
  coin(ctx, 12, 9, 26);
  drawText(ctx, `$${state.coins}`, 46, 12, {
    color: '#ffffff', size: 22, weight: 800, shadow: 'rgba(4,14,30,0.95)', shadowOffset: 2,
  });

  // Level badge.
  const lvLabel = `Lv ${state.level}`;
  const lvW = textWidth(lvLabel, 17, 800) + 18;
  chip(ctx, 152, 10, lvW, 26, { fill: '#3f9d43', light: '#8cf0a8', dark: '#1e5418', radius: 7 });
  drawText(ctx, lvLabel, 161, 16, {
    color: '#ffffff', size: 17, weight: 800, shadow: 'rgba(12,48,14,0.9)', shadowOffset: 1.5,
  });

  // XP bar.
  const barX = 152 + lvW + 12;
  const barW = 130;
  const xpInLevel = state.level > 0
    ? Math.min(1, (state.xp - xpBase(state.level)) / Math.max(1, xpBase(state.level + 1) - xpBase(state.level)))
    : Math.min(1, state.xp / 40);
  bar(ctx, barX, 15, barW, 16, xpInLevel, '#f0c33c', '#1e2c40', '#111d2e');

  // Bait — always unlimited, so the worm comes with an infinity mark.
  const baitX = barX + barW + 22;
  drawBaitIcon(ctx, baitX, 11, 22);
  drawInfinityMark(ctx, baitX + 28, 22);

  // Location name plaque, right aligned — map pin, name, a small progress
  // bar and a sun icon, in the style of the reference art.
  const name = loc.name;
  const nw = Math.max(textWidth(name, 17, 800), 90) + 74;
  const nx = W - nw - 10;
  const plaqueH = 40;
  const plaqueY = 3;

  // Fullscreen toggle, tucked just to the left of the location plaque.
  const fsRect = fullscreenButtonRect(name);
  const fsClicked = drawFullscreenButton(ctx, opts.fullscreen, opts.input, fsRect.x);

  roundRect(ctx, nx, plaqueY, nw, plaqueH, 10, 'rgba(14,36,66,0.94)');
  roundRectStroke(ctx, nx + 0.5, plaqueY + 0.5, nw - 1, plaqueH - 1, 10, 'rgba(130,185,240,0.55)', 1.5);

  // Map pin.
  drawMapPin(ctx, nx + 20, plaqueY + 15);

  const textX = nx + 38;
  drawText(ctx, name, textX, plaqueY + 7, {
    color: '#ffffff', size: 17, weight: 800, shadow: 'rgba(6,18,34,0.9)', shadowOffset: 1.5,
  });

  // Progress bar under the name — how close the next unlock is.
  const pbx = textX;
  const pbw = Math.max(52, textWidth(name, 17, 800));
  bar(ctx, pbx, plaqueY + 27, pbw, 6, locationProgress(state, loc), '#f0c33c', '#15304f', '#0e2340');

  // Weather glyph — the weather the place is having right now.
  const wx = nx + nw - 22;
  drawWeatherIcon(ctx, wx, plaqueY + 20, opts.weather?.id || loc.weather);

  return fsClicked ? { action: 'fullscreen' } : null;
}

/**
 * A small glyph for the weather: sun, rain, storm, fog or snow.
 */
export function drawWeatherIcon(ctx, cx, cy, weatherId) {
  switch (weatherId) {
    case 'rain':
      drawRainIcon(ctx, cx, cy);
      break;
    case 'storm':
      drawStormIcon(ctx, cx, cy);
      break;
    case 'fog':
      drawFogIcon(ctx, cx, cy);
      break;
    case 'snow':
      drawSnowIcon(ctx, cx, cy);
      break;
    default:
      drawSunIcon(ctx, cx, cy);
  }
}

function drawRainIcon(ctx, cx, cy) {
  ctx.fillStyle = '#8ea6c4';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a9c8ea';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 4); ctx.lineTo(cx - 7, cy + 9);
  ctx.moveTo(cx + 1, cy + 4); ctx.lineTo(cx - 1, cy + 9);
  ctx.moveTo(cx + 6, cy + 4); ctx.lineTo(cx + 4, cy + 9);
  ctx.stroke();
}

function drawStormIcon(ctx, cx, cy) {
  ctx.fillStyle = '#6b7891';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 5, 8, 0, Math.PI * 2);
  ctx.fill();
  // The bolt.
  ctx.fillStyle = '#ffd45e';
  ctx.beginPath();
  ctx.moveTo(cx + 1, cy - 1);
  ctx.lineTo(cx - 4, cy + 5);
  ctx.lineTo(cx - 1, cy + 5);
  ctx.lineTo(cx - 3, cy + 11);
  ctx.lineTo(cx + 5, cy + 3);
  ctx.lineTo(cx + 1, cy + 3);
  ctx.closePath();
  ctx.fill();
}

function drawFogIcon(ctx, cx, cy) {
  ctx.strokeStyle = '#c6d4e6';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - 4); ctx.lineTo(cx + 9, cy - 4);
  ctx.moveTo(cx - 6, cy + 1); ctx.lineTo(cx + 7, cy + 1);
  ctx.moveTo(cx - 9, cy + 6); ctx.lineTo(cx + 6, cy + 6);
  ctx.stroke();
}

function drawSnowIcon(ctx, cx, cy) {
  ctx.strokeStyle = '#dbe8f7';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const [dx, dy] of [[0, 0], [-7, 5], [7, 5]]) {
    const x = cx + dx, y = cy + dy;
    ctx.beginPath();
    ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
    ctx.moveTo(x - 2, y - 3.5); ctx.lineTo(x + 2, y + 3.5);
    ctx.moveTo(x - 2, y + 3.5); ctx.lineTo(x + 2, y - 3.5);
    ctx.stroke();
  }
}

/**
 * The fullscreen toggle in the HUD: a small chip with the four-corner
 * "expand" glyph. Returns true when it was clicked this frame.
 *
 * @param {boolean} isFull  whether the game is currently fullscreen
 * @param {Input|null} input
 * @param {number} x        left edge of the chip
 */
export function drawFullscreenButton(ctx, isFull = false, input = null, x = 0) {
  const size = 30;
  const y = 8;
  const hovering = !!input && input.mouse.x >= x && input.mouse.x < x + size &&
    input.mouse.y >= y && input.mouse.y < y + size;

  // Chip body.
  roundRect(ctx, x, y, size, size, 8, hovering ? 'rgba(90,140,200,0.95)' : 'rgba(20,46,80,0.92)');
  roundRectStroke(ctx, x + 0.5, y + 0.5, size - 1, size - 1, 8,
    hovering ? 'rgba(180,220,255,0.85)' : 'rgba(130,185,240,0.5)', 1.5);

  // Four corner brackets — "expand". In fullscreen they fold inward.
  const g = 6.5;
  const m = 7.5;
  const len = 5;
  const corners = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  ctx.save();
  ctx.strokeStyle = hovering ? '#ffffff' : '#cfe3ff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [sx, sy] of corners) {
    const cx = x + size / 2 + sx * (size / 2 - m);
    const cy = y + size / 2 + sy * (size / 2 - m);
    // Point the bracket inward or outward depending on the state.
    const dir = isFull ? -sx : sx;
    const dirY = isFull ? -sy : sy;
    ctx.beginPath();
    ctx.moveTo(cx - dir * len, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy - dirY * len);
    ctx.stroke();
  }
  ctx.restore();

  // Tooltip-ish caption on hover.
  if (hovering) {
    const label = isFull ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
    const lw = textWidth(label, 11, 800) + 16;
    roundRect(ctx, x + size / 2 - lw / 2, y + size + 5, lw, 20, 5, 'rgba(10,24,44,0.94)');
    roundRectStroke(ctx, x + size / 2 - lw / 2, y + size + 5, lw, 20, 5, 'rgba(130,185,240,0.45)', 1);
    drawText(ctx, label, x + size / 2, y + size + 8, {
      color: '#ffffff', align: 'center', size: 11, weight: 800,
    });
  }

  return !!hovering && !!input && input.mouse.justDown;
}

/**
 * A little red map pin.
 */
export function drawMapPin(ctx, x, y) {  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e4573d';
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-8, 3, -9, -3, -9, -6);
  ctx.arc(0, -6, 9, Math.PI, 0);
  ctx.bezierCurveTo(9, -3, 8, 3, 0, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a8301f';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fdf0d2';
  ctx.beginPath();
  ctx.arc(0, -6, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A little sun.
 */
export function drawSunIcon(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffd45e';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffb02e';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5);
    ctx.lineTo(Math.cos(a) * 13.5, Math.sin(a) * 13.5);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A crescent moon, for the night-time locations.
 */
export function drawMoonIcon(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  // A crescent is two circles wound in opposite directions, so the overlap
  // cancels out under the non-zero fill rule.
  ctx.fillStyle = '#e8e4d0';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.moveTo(4.5, -3 + 8.5);
  ctx.arc(4.5, -3, 8.5, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * How close the player is to unlocking the next location: 0..1.
 */
function locationProgress(state, loc) {  const reqs = locationRequirements(state, loc);
  if (!reqs.length) return 1;
  const ok = reqs.filter((r) => r.ok).length;
  return ok / reqs.length;
}

function xpBase(level) {
  // XP required to have reached `level`.
  const table = [0, 40, 100, 200, 360, 580, 880, 1300, 1850, 2600, 3600, 5000, 6900, 9400, 12800];
  return table[Math.min(level, table.length - 1)];
}

/**
 * A little worm on a hook — the bait icon.
 */
export function drawBaitIcon(ctx, x, y, size = 20) {
  const s = size / 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // A proper fishing hook: an eye at the top, a shank, and a bend with
  // the point barb facing back up.
  ctx.strokeStyle = '#dbe6f2';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(5.6, 0.4);
  ctx.lineTo(5.6, 4.6);
  ctx.bezierCurveTo(5.6, 6.4, 2.4, 6.6, 2.2, 4.6);
  ctx.stroke();
  // The barb.
  ctx.beginPath();
  ctx.moveTo(2.2, 4.6);
  ctx.lineTo(3.4, 3.6);
  ctx.stroke();
  // The eye of the hook.
  ctx.strokeStyle = '#9fb4cc';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(5.6, 0.6, 0.9, 0, Math.PI * 2);
  ctx.stroke();

  // The worm, threaded onto the hook.
  ctx.strokeStyle = '#d1593a';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(0.6, 4.0);
  ctx.bezierCurveTo(-0.4, 2.4, 3.0, 2.2, 2.6, 0.9);
  ctx.bezierCurveTo(2.4, 0.1, 5.0, 0.4, 5.0, 1.8);
  ctx.stroke();
  ctx.strokeStyle = '#f7a884';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(1.0, 3.4);
  ctx.bezierCurveTo(0.3, 2.4, 2.6, 2.2, 2.6, 1.5);
  ctx.stroke();

  ctx.restore();
}

/**
 * A small infinity symbol — bait is unlimited, so there is never a count.
 */
/**
 * The infinity sign that marks the bait supply as unlimited.
 *
 * (x, y) is the centre of the mark, so it lines up with whatever it sits
 * next to.
 */
export function drawInfinityMark(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  const w = 7, h = 4.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - w, y - h, x - w, y + h, x, y);
  ctx.bezierCurveTo(x + w, y - h, x + w, y + h, x, y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Bottom-left log feed: the last few events.
 *
 * `x` lets the caller slide the feed clear of the fish finder panel, which
 * occupies the same corner when it is unlocked.
 */
export function drawLog(ctx, entries, t, x = 12) {
  const baseY = H - 108;
  const visible = entries.slice(-4);
  visible.forEach((e, i) => {
    const age = t - e.time;
    if (age > 9) return;
    const alpha = age > 7 ? 1 - (age - 7) / 2 : 1;
    const y = baseY - (visible.length - 1 - i) * 22;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const tw = textWidth(e.text, 14);
    // A translucent ribbon behind each line so it stays readable over water.
    ctx.fillStyle = 'rgba(18,32,54,0.62)';
    roundRect(ctx, x - 8, y - 5, tw + 16, 22, 6, 'rgba(18,32,54,0.62)');
    ctx.fillStyle = e.color || '#cfe3ff';
    roundRect(ctx, x - 8, y - 5, 4, 22, 2, e.color || '#cfe3ff');
    drawText(ctx, e.text, x, y, {
      color: e.color || '#cfe3ff', size: 14, weight: 600,
    });
    ctx.restore();
  });
}

// --------------------------------------------------------------- catch popup

/**
 * The "You Caught!" popup shown after a successful catch.
 */
export function drawCatchPopup(ctx, fish, t, appear = 0) {
  const jokeLines = fish.joke ? wrapText(fish.joke, 330, 14).slice(0, 3) : [];
  const pw = 380;
  const ph = 300 + (jokeLines.length ? jokeLines.length * 19 + 10 : 0);
  const px = Math.round((W - pw) / 2);
  const py = Math.round((H - ph) / 2) - 20;

  // Slide-in.
  const slide = appear < 1 ? Math.round((1 - appear) * -60) : 0;
  ctx.save();
  ctx.globalAlpha = appear < 1 ? appear : 1;

  const isJoke = fish.tier === 'joke';
  const isLegend = fish.tier === 'legendary';
  const isLegendJoke = isJoke && fish.legendaryJoke;
  const tier = TIERS[fish.tier] || TIERS.common;

  // A timber-framed card with an amber header.
  const inner = woodPanel(ctx, px, py + slide, pw, ph, { body: THEME.parch, radius: 14 });

  // Banner across the top of the panel.
  const banner = isLegendJoke ? 'LEGENDARY JOKE!'
    : isJoke ? 'WHAT WAS THAT?!'
    : isLegend ? 'LEGENDARY CATCH!'
    : 'YOU CAUGHT!';
  titleBanner(ctx, inner.x, inner.y, inner.w, 42, banner);
  drawText(ctx, banner, inner.x + inner.w / 2, inner.y + 11, {
    color: isLegend || isLegendJoke ? '#5a3208' : '#3a2410',
    align: 'center', size: 26, weight: 900,
    shadow: 'rgba(255,235,190,0.55)', shadowOffset: 2,
  });

  // A recessed "aquarium" well behind the portrait.
  const wellY = inner.y + 54;
  const wellH = 118;
  ctx.save();
  roundRectPath(ctx, inner.x + 12, wellY, inner.w - 24, wellH, 10);
  ctx.clip();
  const wellGrad = ctx.createLinearGradient(0, wellY, 0, wellY + wellH);
  wellGrad.addColorStop(0, '#cfe6f2');
  wellGrad.addColorStop(1, '#a9cbdd');
  ctx.fillStyle = wellGrad;
  ctx.fillRect(inner.x + 12, wellY, inner.w - 24, wellH);

  // Golden light rays fanning out behind the fish, as in the reference art.
  const rays = isLegend || isLegendJoke ? 14 : 10;
  const rayCx = inner.x + inner.w / 2;
  const rayCy = wellY + wellH - 8;
  ctx.save();
  ctx.globalAlpha = isLegend || isLegendJoke ? 0.42 : 0.26;
  for (let i = 0; i < rays; i++) {
    const a = -Math.PI / 2 + ((i / (rays - 1)) - 0.5) * 2.0;
    const len = 220;
    const spread = 0.055;
    const g = ctx.createLinearGradient(rayCx, rayCy, rayCx + Math.cos(a) * len, rayCy + Math.sin(a) * len);
    g.addColorStop(0, 'rgba(255,226,140,0.85)');
    g.addColorStop(1, 'rgba(255,226,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(rayCx, rayCy);
    ctx.lineTo(rayCx + Math.cos(a - spread) * len, rayCy + Math.sin(a - spread) * len);
    ctx.lineTo(rayCx + Math.cos(a + spread) * len, rayCy + Math.sin(a + spread) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Bubbles inside the well.
  for (let i = 0; i < 7; i++) {
    const bx = inner.x + 30 + ((i * 53) % (inner.w - 60));
    const by = wellY + wellH - ((t * 22 + i * 27) % wellH);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  roundRectStroke(ctx, inner.x + 12, wellY, inner.w - 24, wellH, 10, '#b39468', 2);

  // Fish portrait, scaled to fill the well.
  const portraitCX = inner.x + inner.w / 2;
  const portraitCY = wellY + Math.round(wellH / 2) - 2;

  if (isLegend || tier.glow) {
    for (let i = 0; i < 5; i++) {
      const sx = inner.x + 36 + i * 62;
      drawSparkle(ctx, sx, portraitCY + Math.round(Math.sin(t * 3 + i) * 8), t, tier.glow || '#fff0b8');
    }
  }

  drawFishPortrait(ctx, fish, portraitCX, portraitCY, t, 200, 104);

  // Info box.
  const infoY = wellY + wellH + 12;
  roundRect(ctx, inner.x + 12, infoY, inner.w - 24, 52, 8, THEME.parchHi);
  roundRectStroke(ctx, inner.x + 12, infoY, inner.w - 24, 52, 8, THEME.parchLine, 1.5);

  drawText(ctx, fish.name, inner.x + inner.w / 2, infoY + 8, {
    color: THEME.ink, align: 'center', size: 20, weight: 800,
  });
  drawText(ctx, `${fish.weight.toFixed(1)} kg`, inner.x + inner.w / 2, infoY + 32, {
    color: THEME.inkSoft, align: 'center', size: 14, weight: 600,
  });

  // Value + tier row.
  const valY = infoY + 62;
  coin(ctx, inner.x + 20, valY, 20);
  drawText(ctx, `+${fish.price}`, inner.x + 46, valY + 2, {
    color: THEME.goldDark, size: 18, weight: 800,
  });

  const tierLabel = isLegendJoke ? 'LEGENDARY' : tier.label.toUpperCase();
  const tierCol = isLegendJoke ? THEME.goldDark
    : tier.color === THEME.gold ? THEME.goldDark : tier.color;
  drawText(ctx, tierLabel, inner.x + inner.w - 20, valY + 4, {
    color: tierCol, align: 'right', size: 15, weight: 800,
  });

  // Joke text.
  jokeLines.forEach((line, i) => {
    drawText(ctx, line, inner.x + inner.w / 2, valY + 26 + i * 19, {
      color: '#9a5a7a', align: 'center', size: 13, weight: 600,
    });
  });

  ctx.restore();
  return { px, py: py + slide, pw, ph };
}

// -------------------------------------------------------------- tension meter

/**
 * The reel minigame HUD: tension bar with a moving safe zone, plus the
 * progress of the fish coming to the boat.
 */
export function drawTensionMeter(ctx, s, t, rect_ = { x: 648, y: 44, w: 300, h: 160 }) {
  const { x, y, w, h } = rect_;
  const p = panel(ctx, x, y, w, h, { title: 'REELING' });
  drawText(ctx, 'REELING', p.x + p.w / 2, p.textY + 7, {
    color: p.titleColor, align: 'center', size: 20, weight: 900,
    shadow: 'rgba(255,235,190,0.55)', shadowOffset: 1.5,
  });

  const innerX = p.x + 16;
  const innerW = p.w - 32;

  // --- Tension (the main gauge)
  const tRow = p.bodyY;
  drawText(ctx, 'TENSION', innerX, tRow + 1, { color: THEME.inkSoft, size: 12, weight: 800 });
  const tBarX = innerX + 76;
  const tBarW = innerW - 76;
  const tBarH = 20;

  // Safe zone backdrop.
  const safeX = tBarX + Math.round((s.safeZone - s.safeWidth / 2) * tBarW);
  const safeW = Math.max(8, Math.round(s.safeWidth * tBarW));

  // Tension fill.
  const fillW = Math.round(clamp(s.tension, 0, 1) * tBarW);
  const danger = s.tension > 0.8;
  const tcol = danger
    ? (Math.floor(t * 12) % 2 ? '#d63b2b' : '#ff8a7a')
    : s.tension > 0.62 ? '#e08a2a' : '#3d7fd6';

  ctx.save();
  roundRectPath(ctx, tBarX, tRow, tBarW, tBarH, 5);
  ctx.clip();
  ctx.fillStyle = '#e6d5b0';
  ctx.fillRect(tBarX, tRow, tBarW, tBarH);
  ctx.fillStyle = tcol;
  ctx.fillRect(tBarX, tRow, fillW, tBarH);
  ctx.fillStyle = lighten(tcol, 0.32);
  ctx.fillRect(tBarX, tRow, fillW, tBarH * 0.4);
  // The safe band sits on top of the fill so it stays readable.
  ctx.fillStyle = 'rgba(95,191,90,0.40)';
  ctx.fillRect(safeX, tRow, safeW, tBarH);
  ctx.restore();
  roundRectStroke(ctx, tBarX, tRow, tBarW, tBarH, 5, '#7a6040', 2);
  // Safe-zone edges.
  ctx.strokeStyle = 'rgba(47,112,64,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(safeX + 1, tRow);
  ctx.lineTo(safeX + 1, tRow + tBarH);
  ctx.moveTo(safeX + safeW - 1, tRow);
  ctx.lineTo(safeX + safeW - 1, tRow + tBarH);
  ctx.stroke();

  // Marker.
  const mx = tBarX + fillW;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(mx - 1, tRow - 4, 3, tBarH + 8);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(mx, tRow - 8);
  ctx.lineTo(mx + 5, tRow - 2);
  ctx.lineTo(mx - 5, tRow - 2);
  ctx.closePath();
  ctx.fill();

  // --- Landing progress
  const lRow = tRow + 34;
  drawText(ctx, 'LANDING', innerX, lRow + 2, { color: THEME.inkSoft, size: 12, weight: 800 });
  bar(ctx, tBarX, lRow, tBarW, 18, s.reelProgress, '#5fbf5a', '#e2cfa4', '#c3a774');

  // --- Line health
  const hRow = lRow + 30;
  drawText(ctx, 'LINE', innerX, hRow + 2, { color: THEME.inkSoft, size: 12, weight: 800 });
  bar(ctx, tBarX, hRow, tBarW, 18, s.lineHealth,
    s.lineHealth > 0.5 ? '#5fbf5a' : '#e4573d', '#e2cfa4', '#c3a774');

  // Surging is shown inside the panel so it can never collide with the
  // action bar below.
  if (s.surging) {
    const label = '! SURGING !';
    const lw = textWidth(label, 14, 800) + 22;
    const lx = Math.round(p.x + (p.w - lw) / 2);
    const ly = p.y + p.h - 30;
    roundRect(ctx, lx, ly, lw, 24, 6, '#a8301f');
    roundRectStroke(ctx, lx, ly, lw, 24, 6, '#e4573d', 1.5);
    drawText(ctx, label, lx + lw / 2, ly + 5, {
      color: Math.floor(t * 10) % 2 ? '#ffd45e' : '#ffffff',
      align: 'center', size: 14, weight: 800,
    });
  }
}

// -------------------------------------------------------------------- panels

/**
 * The geometry of the "buy" button on each upgrade row.
 *
 * The render pass draws these and the update pass has to recognise a click
 * on one, so both go through this list.
 *
 * @param {object} rect_  the panel rectangle
 * @returns {Array<{track:string,x:number,y:number,w:number,h:number}>}
 */
export function upgradeBuyButtons(rect_) {
  const { x, y, w } = rect_;
  const tracks = Object.keys(UPGRADES);
  const rowH = 52;
  // The panel's own inset: the header strip is 30 tall and the body starts
  // 10 below it.
  let rowY = y + 1 + 30 + 10;
  const out = [];
  for (const key of tracks) {
    const btnW = 88, btnH = 30;
    out.push({ track: key, x: x + w - btnW - 12, y: rowY + 2, w: btnW, h: btnH });
    rowY += rowH;
  }
  return out;
}

/**
 * The upgrades panel (right side, as in the reference art).
 */
export function drawUpgrades(ctx, state, input, t, rect_) {
  const { x, y, w, h } = rect_;
  const p = panel(ctx, x, y, w, h, { title: 'UPGRADES' });
  drawText(ctx, 'UPGRADES', p.x + p.w / 2 + 18, p.textY + 6, {
    color: p.titleColor, align: 'center', size: 22, weight: 900,
    shadow: 'rgba(255,235,190,0.55)', shadowOffset: 2,
  });
  drawUpgradeIcon(ctx, 'up', p.x + 22, p.textY + 5);

  const tracks = Object.keys(UPGRADES);
  const rowH = 52;
  let rowY = p.bodyY;
  let action = null;
  const buyButtons = upgradeBuyButtons(rect_);

  for (const key of tracks) {
    const up = UPGRADES[key];
    const lvl = state.upgrades[key];
    const maxed = lvl >= up.levels.length - 1;
    const next = up.levels[lvl + 1];
    const cost = next ? next.cost : 0;
    const affordable = !maxed && state.coins >= cost;

    const hovering = input.mouse.x >= p.x && input.mouse.x < p.x + p.w &&
      input.mouse.y >= rowY && input.mouse.y < rowY + rowH;

    // Row background.
    if (hovering) {
      roundRect(ctx, p.x + 8, rowY - 4, p.w - 16, rowH - 4, 8, 'rgba(255,255,255,0.55)');
    }

    // Icon in a little recessed tile.
    const tileX = p.x + 12;
    roundRect(ctx, tileX, rowY - 2, 40, 40, 8, '#efe0bd');
    roundRectStroke(ctx, tileX, rowY - 2, 40, 40, 8, THEME.parchLine, 1.5);
    drawUpgradeIcon(ctx, key, tileX + 9, rowY + 7, lvl);

    // Name + current level.
    drawText(ctx, up.name, tileX + 52, rowY, { color: THEME.ink, size: 17, weight: 800 });
    drawText(ctx, `Lv ${lvl}`, tileX + 52, rowY + 21, { color: THEME.inkSoft, size: 13, weight: 700 });

    // Level pips.
    const pipX = tileX + 52;
    for (let i = 0; i < up.levels.length; i++) {
      const on = i <= lvl;
      roundRect(ctx, pipX + i * 9, rowY + 38, 6, 6, 2, on ? THEME.gold : '#cdb894');
    }

    // Cost / button.
    if (maxed) {
      drawText(ctx, 'MAX', p.x + p.w - 14, rowY + 12, {
        color: THEME.greenDark, align: 'right', size: 15, weight: 800,
      });
    } else {
      const btn = buyButtons.find((b) => b.track === key);
      const bx = btn.x, by = btn.y;
      const btnW = btn.w, btnH = btn.h;
      miniButton(ctx, input, {
        x: bx, y: by, w: btnW, h: btnH,
        enabled: affordable,
        tint: affordable ? 'green' : null,
      });
      coin(ctx, bx + 7, by + 6, 18);
      drawText(ctx, String(cost), bx + 30, by + 6, {
        color: affordable ? '#ffffff' : '#c9c2b2', size: 16, weight: 800,
        shadow: 'rgba(20,40,22,0.6)', shadowOffset: 1,
      });
      if (affordable && hovering && input.mouse.justDown &&
          input.mouse.x >= bx && input.mouse.x < bx + btnW &&
          input.mouse.y >= by && input.mouse.y < by + btnH) {
        action = { action: 'buy', track: key };
      }
    }
    rowY += rowH;
  }

  return action;
}

/**
 * Icons for the upgrade rows and the panel header.
 */
export function drawUpgradeIcon(ctx, key, x, y, lvl = 0) {
  ctx.save();
  ctx.translate(x, y);

  switch (key) {
    case 'up': {
      // A green up arrow.
      ctx.fillStyle = '#4f9d43';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(18, 11);
      ctx.lineTo(12, 11);
      ctx.lineTo(12, 22);
      ctx.lineTo(6, 22);
      ctx.lineTo(6, 11);
      ctx.lineTo(0, 11);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2c5e26';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case 'rod': {
      // A rod arcing up to the right with a reel.
      ctx.strokeStyle = '#6b4a34';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1, 20);
      ctx.quadraticCurveTo(8, 4, 20, 1);
      ctx.stroke();
      ctx.strokeStyle = '#e8d8b0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4, 16);
      ctx.quadraticCurveTo(9, 6, 20, 3);
      ctx.stroke();
      ctx.fillStyle = '#c9924c';
      roundRect(ctx, 0, 16, 4, 8, 2, '#c9924c');
      ctx.fillStyle = '#5f7fb5';
      ctx.beginPath();
      ctx.arc(7, 19, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'line': {
      // A spool of line with a loose thread.
      roundRect(ctx, 1, 4, 18, 15, 3, '#c9b58c');
      roundRectStroke(ctx, 1, 4, 18, 15, 3, '#8a7a58', 1.5);
      roundRect(ctx, 4, 7, 12, 9, 2, '#e8d8b0');
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(4, 7, 12, 2);
      ctx.strokeStyle = '#e8d8b0';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(19, 10);
      ctx.quadraticCurveTo(23, 11, 22, 16);
      ctx.stroke();
      break;
    }
    case 'bait': {
      // A pink worm.
      ctx.strokeStyle = '#d1593a';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(3, 18);
      ctx.bezierCurveTo(1, 10, 9, 10, 8, 5);
      ctx.bezierCurveTo(7.5, 1, 15, 2, 14, 6);
      ctx.stroke();
      ctx.strokeStyle = '#f2a077';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(4, 16);
      ctx.bezierCurveTo(3, 11, 8, 10, 8, 6);
      ctx.stroke();
      break;
    }
    case 'boat': {
      // A little offshore rig: legs into the water, a deck, a derrick.
      ctx.strokeStyle = '#6b4a34';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(5, 11); ctx.lineTo(4, 21);
      ctx.moveTo(15, 11); ctx.lineTo(16, 21);
      ctx.moveTo(5, 16); ctx.lineTo(15, 16);
      ctx.stroke();
      // Deck.
      ctx.fillStyle = '#a9713a';
      ctx.fillRect(2, 9, 16, 3);
      ctx.fillStyle = '#d29a55';
      ctx.fillRect(2, 9, 16, 1);
      // Derrick.
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(8, 9); ctx.lineTo(9, 0);
      ctx.moveTo(12, 9); ctx.lineTo(11, 0);
      ctx.moveTo(8.5, 6); ctx.lineTo(11.5, 6);
      ctx.moveTo(8.7, 3.5); ctx.lineTo(11.3, 3.5);
      ctx.stroke();
      // Crown.
      ctx.fillStyle = '#c23a26';
      ctx.beginPath();
      ctx.arc(10, -1, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// --------------------------------------------------------------------- shop

export function drawShop(ctx, state, input, t, rect_) {
  const { x, y, w, h } = rect_;
  const p = panel(ctx, x, y, w, h, { title: 'FISH MARKET' });
  drawText(ctx, 'FISH MARKET', p.x + p.w / 2, p.textY + 6, {
    color: p.titleColor, align: 'center', size: 20, weight: 900,
    shadow: 'rgba(255,235,190,0.55)', shadowOffset: 1.5,
  });

  let rowY = p.bodyY;
  drawText(ctx, 'SELL YOUR CATCH', p.x + 14, rowY, { color: THEME.ink, size: 14, weight: 800 });
  rowY += 26;

  const entries = Object.entries(state.basket).filter(([, c]) => c > 0);
  if (!entries.length) {
    drawText(ctx, 'Your basket is empty.', p.x + 14, rowY, { color: THEME.inkSoft, size: 14, weight: 600 });
    return null;
  }

  // Show up to 6 lines, with a total row and the sell button pinned to the
  // bottom of the panel so it can never overlap the totals.
  const shown = entries.slice(0, 6);
  const priceX = p.x + p.w - 14;
  const countX = p.x + p.w - 116;
  const nameMax = countX - (p.x + 14) - 14;
  for (const [id, count] of shown) {
    const fish = FISH_BY_ID[id];
    if (!fish) continue;
    const sub = fish.price * count;
    const subText = String(sub);
    const priceW = textWidth(subText, 14, 700);
    drawText(ctx, fitText(fish.name, nameMax, 14), p.x + 14, rowY, {
      color: THEME.ink, size: 14, weight: 600,
    });
    drawText(ctx, `x${count}`, countX, rowY, {
      color: THEME.inkSoft, align: 'right', size: 13, weight: 600,
    });
    coin(ctx, priceX - priceW - 24, rowY - 2, 16);
    drawText(ctx, subText, priceX, rowY, {
      color: THEME.goldDark, align: 'right', size: 14, weight: 800,
    });
    rowY += 24;
  }
  if (entries.length > shown.length) {
    drawText(ctx, `...and ${entries.length - shown.length} more`, p.x + 14, rowY, {
      color: THEME.inkSoft, size: 13, weight: 600,
    });
  }

  // Total + sell button, anchored to the bottom of the panel.
  let total = 0;
  for (const [id, count] of entries) total += (FISH_BY_ID[id]?.price || 0) * count;

  const btnW = 140, btnH = 36;
  const btnX = p.x + p.w - btnW - 14;
  const btnY = p.y + p.h - btnH - 14;

  const totalY = btnY - 30;
  ctx.fillStyle = THEME.parchLine;
  ctx.fillRect(p.x + 12, totalY - 8, p.w - 24, 1.5);
  drawText(ctx, 'TOTAL', p.x + 14, totalY, { color: THEME.ink, size: 16, weight: 800 });
  const totalText = String(total);
  coin(ctx, p.x + p.w - 16 - textWidth(totalText, 17, 800) - 26, totalY - 3, 20);
  drawText(ctx, totalText, p.x + p.w - 14, totalY, {
    color: THEME.goldDark, align: 'right', size: 17, weight: 800,
  });

  const hovering = miniButton(ctx, input, {
    x: btnX, y: btnY, w: btnW, h: btnH, enabled: true, tint: 'green', radius: 8,
  });
  drawText(ctx, 'SELL ALL', btnX + btnW / 2, btnY + 8, {
    color: '#ffffff', align: 'center', size: 16, weight: 800,
    shadow: 'rgba(10,40,18,0.7)', shadowOffset: 1.5,
  });
  if (hovering && input.mouse.justDown) {
    return { action: 'sellAll' };
  }

  return null;
}

// ---------------------------------------------------------------- collection

export function drawCollection(ctx, state, input, t, rect_, scroll) {
  const { x, y, w, h } = rect_;
  const p = panel(ctx, x, y, w, h, { title: 'FISH COLLECTION' });
  drawText(ctx, 'FISH COLLECTION', p.x + p.w / 2, p.textY + 6, {
    color: p.titleColor, align: 'center', size: 20, weight: 900,
    shadow: 'rgba(255,235,190,0.55)', shadowOffset: 1.5,
  });

  const discovered = Object.keys(state.collection).length;
  const total = Object.keys(FISH_BY_ID).length;
  drawText(ctx, `${discovered} / ${total} discovered`, p.x + 14, p.bodyY, {
    color: THEME.inkSoft, size: 14, weight: 700,
  });

  const gridY = p.bodyY + 30;
  const gridH = p.h - (gridY - p.y) - 16;
  // The column count follows the panel width, so the book reflows on a
  // wide screen instead of stretching the cells.
  const cols = Math.max(3, Math.min(8, Math.floor((p.w - 28) / 128)));
  const cellW = Math.floor((p.w - 28) / cols);
  const cellH = 92;
  const rows = Math.ceil(Object.keys(FISH_BY_ID).length / cols);
  const contentH = rows * (cellH + 8);
  scroll.maxScroll = Math.max(0, contentH - gridH);
  scroll.scroll = clamp(scroll.scroll, 0, scroll.maxScroll);

  withClip(ctx, p.x + 8, gridY, p.w - 16, gridH, () => {
    const off = Math.round(scroll.scroll);
    ctx.save();
    ctx.translate(0, -off);
    let i = 0;
    for (const fish of Object.values(FISH_BY_ID)) {
      const cx = p.x + 14 + (i % cols) * cellW;
      const cy = gridY + Math.floor(i / cols) * (cellH + 8);
      const entry = state.collection[fish.id];
      const known = !!entry;

      // Cell: a recessed parchment tile with a wooden border.
      roundRect(ctx, cx, cy, cellW - 8, cellH, 8, known ? '#f7ead0' : '#e6d3ac');
      roundRectStroke(ctx, cx, cy, cellW - 8, cellH, 8, known ? '#a98a52' : '#c0a374', 1.5);
      ctx.fillStyle = known ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)';
      roundRect(ctx, cx + 3, cy + 3, cellW - 14, 3, 2, known ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)');

      if (known) {
        const tier = TIERS[fish.tier] || TIERS.common;
        if (tier.glow) {
          drawSparkle(ctx, cx + cellW - 18, cy + 12, t + i, tier.glow);
        }
        drawFishFitted(ctx, fish, cx + (cellW - 8) / 2, cy + 30, 42, t + i);
        drawText(ctx, fitText(fish.name, cellW - 16, 12), cx + (cellW - 8) / 2, cy + 54, {
          color: THEME.ink, align: 'center', size: 12, weight: 700,
        });
        drawText(ctx, `x${entry.count}`, cx + (cellW - 8) / 2, cy + 70, {
          color: THEME.inkSoft, align: 'center', size: 12, weight: 600,
        });
      } else {
        // Silhouette first, then the "???" label underneath it.
        ctx.save();
        ctx.globalAlpha = 0.22;
        drawFishFitted(ctx, fish, cx + (cellW - 8) / 2, cy + 30, 42, t + i);
        ctx.restore();
        drawText(ctx, '???', cx + (cellW - 8) / 2, cy + 54, {
          color: '#8a7454', align: 'center', size: 14, weight: 700,
        });
      }
      i++;
    }
    ctx.restore();
  });

  // Scrollbar.
  if (scroll.maxScroll > 0) {
    const trackH = gridH - 8;
    const thumbH = Math.max(20, Math.round((gridH / contentH) * trackH));
    const thumbY = gridY + 4 + Math.round((scroll.scroll / scroll.maxScroll) * (trackH - thumbH));
    roundRect(ctx, p.x + p.w - 12, gridY + 4, 6, trackH, 3, '#cdb894');
    roundRect(ctx, p.x + p.w - 12, thumbY, 6, thumbH, 3, '#8b5a2b');
  }
}

// ------------------------------------------------------------------ location

export function drawLocationSelect(ctx, state, input, t, rect_, scroll) {
  const { x, y, w, h } = rect_;
  const p = panel(ctx, x, y, w, h, { title: 'TRAVEL' });
  drawText(ctx, 'TRAVEL', p.x + p.w / 2, p.textY + 6, {
    color: p.titleColor, align: 'center', size: 20, weight: 900,
    shadow: 'rgba(255,235,190,0.55)', shadowOffset: 1.5,
  });

  const listY = p.bodyY;
  const listH = p.h - (listY - p.y) - 16;
  const contentH = LOCATIONS.length * (72 + 8);
  scroll.maxScroll = Math.max(0, contentH - listH);
  scroll.scroll = clamp(scroll.scroll, 0, scroll.maxScroll);
  // Rows are computed after clamping so hit-testing and drawing agree.
  const clampedRows = travelRows(scroll.scroll, rect_);

  withClip(ctx, p.x + 6, listY, p.w - 12, listH, () => {
    for (const row of clampedRows) {
      const loc = row.loc;
      const ry = row.y;
      if (ry + row.h < listY || ry > listY + listH) continue;

      const unlocked = state.unlocked.includes(loc.id);
      const current = state.location === loc.id;
      const hovering = input.mouse.x >= row.x && input.mouse.x < row.x + row.w &&
        input.mouse.y >= ry && input.mouse.y < ry + row.h;

      roundRect(ctx, row.x, ry, row.w, row.h, 10,
        current ? '#f7e2ae' : hovering ? '#f5e7c4' : '#e9d6b0');
      roundRectStroke(ctx, row.x, ry, row.w, row.h, 10, current ? THEME.goldDark : '#b09463', 2);

      // Mini preview: the sky, the water, and a silhouette of whatever
      // makes this place recognisable — a lighthouse, a shipwreck, a coral
      // arch. The gradients alone made every location look the same.
      const pvX = row.x + 8, pvY = ry + 8, pvW = 72, pvH = 56;
      ctx.save();
      roundRectPath(ctx, pvX, pvY, pvW, pvH, 6);
      ctx.clip();
      drawLocationThumb(ctx, loc, pvX, pvY, pvW, pvH, t);
      ctx.restore();
      roundRectStroke(ctx, pvX, pvY, pvW, pvH, 6, '#7a6040', 1.5);

      const textX = row.x + 92;
      const statusW = current ? textWidth('YOU ARE HERE', 13, 800)
        : textWidth('LOCKED', 13, 800);
      const nameMax = row.w - 100 - statusW - 16;

      drawText(ctx, fitText(loc.name, nameMax, 20, 800), textX, ry + 8, {
        color: unlocked ? THEME.ink : '#6a5638', size: 20, weight: 800,
      });

      if (current) {
        drawText(ctx, 'YOU ARE HERE', row.x + row.w - 14, ry + 12, {
          color: THEME.goldDark, align: 'right', size: 13, weight: 800,
        });
      } else if (unlocked) {
        drawText(ctx, 'TRAVEL', row.x + row.w - 14, ry + 12, {
          color: THEME.greenDark, align: 'right', size: 13, weight: 800,
        });
      } else {
        drawText(ctx, 'LOCKED', row.x + row.w - 14, ry + 12, {
          color: THEME.redDark, align: 'right', size: 13, weight: 800,
        });
      }

      // Second line: the flavour text when you can go there, the missing
      // requirements when it is still locked.
      const line2Max = row.w - 106;
      if (current || unlocked) {
        drawText(ctx, fitText(loc.tagline, line2Max, 14), textX, ry + 36, {
          color: THEME.inkSoft, size: 14, weight: 600,
        });
        // The weather that place is having, with its glyph.
        const wName = WEATHER_BY_ID[loc.weather]?.name || '';
        if (wName) {
          const gw = textWidth(wName, 13, 700) + 26;
          const gx = row.x + row.w - gw - 12;
          drawWeatherIcon(ctx, gx + 8, ry + 42, loc.weather);
          drawText(ctx, wName, gx + 18, ry + 37, {
            color: '#5c4527', size: 13, weight: 700,
          });
        }
      } else {
        drawText(ctx, fitText(locationRequirementText(state, loc), line2Max, 14), textX, ry + 36, {
          color: '#a05040', size: 14, weight: 700,
        });
      }
    }
  });

  if (scroll.maxScroll > 0) {
    const trackH = listH - 8;
    const thumbH = Math.max(20, Math.round((listH / contentH) * trackH));
    const thumbY = listY + 4 + Math.round((scroll.scroll / scroll.maxScroll) * (trackH - thumbH));
    roundRect(ctx, p.x + p.w - 12, listY + 4, 6, trackH, 3, '#cdb894');
    roundRect(ctx, p.x + p.w - 12, thumbY, 6, thumbH, 3, '#8b5a2b');
  }
}

/**
 * A tiny scene of a location, used as the thumbnail in the travel panel.
 *
 * Each one gets the sky and water of the real place plus a silhouette of
 * its landmark, so the five rows are told apart at a glance instead of
 * being five near-identical blue rectangles.
 */
function drawLocationThumb(ctx, loc, x, y, w, h, t) {
  const horizon = y + h * 0.5;
  const wx = WEATHER_BY_ID[loc.weather];

  // The weather tints the sky, the same way it tints the real scene.
  const tint = wx?.skyTint || [1, 1, 1];
  const skyG = ctx.createLinearGradient(0, y, 0, horizon);
  skyG.addColorStop(0, tintHex(loc.sky[0], tint));
  skyG.addColorStop(1, tintHex(loc.sky[1], tint));
  ctx.fillStyle = skyG;
  ctx.fillRect(x, y, w, horizon - y);

  const watG = ctx.createLinearGradient(0, horizon, 0, y + h);
  watG.addColorStop(0, tintHex(loc.water[0], tint));
  watG.addColorStop(1, tintHex(loc.water[1], tint));
  ctx.fillStyle = watG;
  ctx.fillRect(x, horizon, w, y + h - horizon);

  // Sun or moon.
  if (loc.ambience === 'abyss') {
    ctx.fillStyle = 'rgba(200,215,255,0.85)';
    ctx.beginPath();
    ctx.arc(x + w * 0.78, y + h * 0.18, 5, 0, Math.PI * 2);
    ctx.fill();
    // A few stars.
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x + 8 + i * 13, y + 6 + (i % 3) * 7, 1.5, 1.5);
    }
  } else {
    ctx.fillStyle = 'rgba(255,236,160,0.9)';
    ctx.beginPath();
    ctx.arc(x + w * 0.22, y + h * 0.2, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // The landmark silhouette.
  switch (loc.ambience) {
    case 'shore': {
      // A lighthouse on a headland.
      ctx.fillStyle = '#3f6b45';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.52, horizon);
      ctx.quadraticCurveTo(x + w * 0.68, y + h * 0.16, x + w, horizon);
      ctx.closePath();
      ctx.fill();

      const lx = x + w * 0.66;
      const lh = h * 0.42;
      ctx.fillStyle = '#f0f0f4';
      ctx.fillRect(lx, horizon - lh, 7, lh);
      ctx.fillStyle = '#d8452b';
      ctx.fillRect(lx, horizon - lh * 0.72, 7, lh * 0.16);
      ctx.fillStyle = '#2f4a6d';
      ctx.fillRect(lx - 1, horizon - lh - 5, 9, 5);
      ctx.fillStyle = '#ffd45e';
      ctx.fillRect(lx + 1, horizon - lh - 4, 5, 4);
      break;
    }
    case 'rocks': {
      // A broken shipwreck in the shallows.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, horizon - 1, w, 2);

      ctx.save();
      ctx.translate(x + w * 0.58, horizon + 4);
      ctx.rotate(-0.16);
      ctx.scale(0.19, 0.19);
      drawShipwreck(ctx, 0, 0, 1, t);
      ctx.restore();
      break;
    }
    case 'deep': {
      // A sunken mast breaking the surface.
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x, horizon - 1, w, 2);
      ctx.strokeStyle = '#2a3d5c';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.66, horizon + 6);
      ctx.lineTo(x + w * 0.60, horizon - h * 0.30);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.63, horizon - h * 0.16);
      ctx.lineTo(x + w * 0.80, horizon - h * 0.22);
      ctx.stroke();
      break;
    }
    case 'reef': {
      // A coral arch.
      ctx.save();
      ctx.translate(x + w * 0.52, horizon + 4);
      ctx.scale(0.26, 0.26);
      drawCoralArch(ctx, 0, 0, 1);
      ctx.restore();
      break;
    }
    case 'abyss': {
      // A looming shape with two glowing eyes.
      ctx.fillStyle = '#141f42';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.62, y + h * 0.28, 30, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      if (Math.sin(t * 1.2) > 0.3) {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x + w * 0.56, y + h * 0.26, 2, 0, Math.PI * 2);
        ctx.arc(x + w * 0.64, y + h * 0.25, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // A dead tree on the left.
      ctx.save();
      ctx.translate(x + w * 0.2, horizon + 6);
      ctx.scale(0.2, 0.2);
      drawDeadTree(ctx, 0, 0, 1, t);
      ctx.restore();
      break;
    }
  }

  // The seabed along the bottom.
  ctx.fillStyle = loc.sand;
  ctx.fillRect(x, y + h - 4, w, 4);

  // A touch of the weather, so the thumbnail shows it too.
  drawThumbWeather(ctx, loc.weather, x, y, w, h, horizon, t);
}

/**
 * The weather painted into a location thumbnail.
 */
function drawThumbWeather(ctx, weatherId, x, y, w, h, horizon, t) {
  if (weatherId === 'rain' || weatherId === 'storm') {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,222,245,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const rx = x + ((i * 13 + t * 40) % w);
      const ry = y + ((i * 29 + t * 130) % h);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2.5, ry + 6);
    }
    ctx.stroke();
    ctx.restore();
  } else if (weatherId === 'snow') {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 18; i++) {
      const rx = x + ((i * 17 + Math.sin(t + i) * 6 + t * 12) % w + w) % w;
      const ry = y + ((i * 23 + t * 22) % h);
      ctx.beginPath();
      ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (weatherId === 'fog') {
    ctx.save();
    const g = ctx.createLinearGradient(0, horizon - 18, 0, y + h);
    g.addColorStop(0, 'rgba(228,238,248,0.15)');
    g.addColorStop(0.4, 'rgba(228,238,248,0.8)');
    g.addColorStop(1, 'rgba(228,238,248,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(x, horizon - 18, w, h);
    ctx.restore();
  }
}

/**
 * Multiply a hex colour by a tint triple.
 */
function tintHex(hex, tint) {
  const n = parseInt(hex.slice(1), 16);
  const rr = Math.round(((n >> 16) & 255) * tint[0]);
  const gg = Math.round(((n >> 8) & 255) * tint[1]);
  const bb = Math.round((n & 255) * tint[2]);
  const c = (v) => Math.max(0, Math.min(255, v));
  return `rgb(${c(rr)},${c(gg)},${c(bb)})`;
}

/**
 * Layout for the travel rows, shared with hit-testing in the game module.
 * Kept here so the renderer stays the single source of truth for geometry.
 */
export function travelRows(scroll, panelRect) {
  const { x, y, w } = panelRect;
  const listY = y + 46;
  const rowH = 72;
  return LOCATIONS.map((loc, i) => ({
    loc,
    x: x + 10,
    y: listY + i * (rowH + 8) - Math.round(scroll),
    w: w - 20,
    h: rowH,
  }));
}

/**
 * The requirement text for a locked location, e.g. "Needs Rig Lv 2, 400c".
 */
export function locationRequirementText(state, loc) {
  const missing = locationRequirements(state, loc)
    .filter((r) => !r.ok)
    .map((r) => r.text.replace(' coins', 'c'));
  if (missing.length) return `Needs ${missing.join(', ')}`;
  // Every requirement is met but the spot is not claimed yet.
  return `Unlock for ${loc.unlock.coins}c`;
}

// ------------------------------------------------------------------ overlays

/**
 * A dimmed backdrop for modal panels.
 */
export function dim(ctx, alpha = 0.6) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/**
 * A tooltip-style hint bar at the bottom of the screen.
 */
export function drawHint(ctx, text) {
  if (!text) return;
  const w = textWidth(text, 15) + 32;
  const x = Math.round((W - w) / 2);
  const y = H - 44;
  shadowRect(ctx, x, y, w, 34, 'rgba(0,0,0,0.4)', 4, 10);
  roundRect(ctx, x, y, w, 34, 10, '#2b4a72');
  roundRectStroke(ctx, x, y, w, 34, 10, '#1b3355', 2);
  drawText(ctx, text, W / 2, y + 8, {
    color: '#ffffff', align: 'center', size: 15, weight: 700,
  });
}

/**
 * The "cast" prompt that pulses while the player is idle.
 */
export function drawCastPrompt(ctx, t, canCast, reason = '') {
  const y = H - 92;
  const text = canCast ? 'CLICK / SPACE TO CAST' : reason;
  if (!text) return;
  const pulse = 0.7 + Math.sin(t * 4) * 0.3;
  const w = textWidth(text, 16, 800) + 40;
  const x = Math.round((W - w) / 2);
  ctx.save();
  ctx.globalAlpha = canCast ? pulse : 0.92;
  shadowRect(ctx, x, y, w, 36, 'rgba(0,0,0,0.35)', 4, 12);
  roundRect(ctx, x, y, w, 36, 12, canCast ? '#3f9d43' : '#4a3a30');
  roundRectStroke(ctx, x, y, w, 36, 12, canCast ? '#2c5e26' : '#332822', 2);
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  roundRect(ctx, x + 4, y + 3, w - 8, 10, 5, 'rgba(255,255,255,0.24)');
  drawText(ctx, text, W / 2, y + 9, {
    color: canCast ? '#ffffff' : '#d8c0a8', align: 'center', size: 16, weight: 800,
  });
  ctx.restore();
}
