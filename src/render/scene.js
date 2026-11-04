/**
 * The fishing scene: sky, layered ocean with moving waves, shoreline,
 * the angler on his boat, ambient creatures and weather per location.
 */

import { rect, makeRng, clamp, lerp, mixHex, roundRect, roundRectPath } from '../engine/gfx.js';
import { W, H } from '../engine/view.js';
import { FISH, FISH_BY_ID } from '../game/content.js';
import {
  drawFisherman, drawRod, drawOilRig, RIG, drawCloud, drawBird, drawTree,
  drawRock, drawCoral, drawSeaweed, drawFish, drawBobber, drawSparkle,
  drawShipwreck, drawBrokenPier, drawCoralArch, drawDeadTree, drawSunkenMast,
} from './sprites.js';

/**
 * Pre-baked scenery per location so we do not regenerate noise each frame.
 */
const sceneryCache = new Map();

function getScenery(loc) {
  if (sceneryCache.has(loc.id)) return sceneryCache.get(loc.id);
  const rng = makeRng(hashString(loc.id));
  const data = {
    clouds: [],
    birds: [],
    rocks: [],
    corals: [],
    weeds: [],
    ambientFish: [],
    bubbles: [],
  };

  // Everything is placed as a fraction of the reference frame, so the
  // scenery looks the same whatever the window size is.
  const cloudCount = loc.ambience === 'abyss' ? 0 : loc.ambience === 'deep' ? 3 : 6;
  for (let i = 0; i < cloudCount; i++) {
    data.clouds.push({
      fx: rng(),
      fy: 0.026 + rng() * 0.148,
      w: 44 + Math.floor(rng() * 40),
      speed: 4 + rng() * 7,
    });
  }

  const birdCount = loc.ambience === 'abyss' ? 0 : loc.ambience === 'deep' ? 2 : 5;
  for (let i = 0; i < birdCount; i++) {
    data.birds.push({
      fx: rng(),
      fy: 0.074 + rng() * 0.13,
      speed: 8 + rng() * 10,
      phase: rng() * 6,
    });
  }

  const rockCount = loc.ambience === 'rocks' ? 8 : loc.ambience === 'shore' ? 3 : 2;
  for (let i = 0; i < rockCount; i++) {
    data.rocks.push({
      fx: rng(),
      // Below the waterline — the surface rocks are drawn separately.
      fy: 0.60 + rng() * 0.30,
      size: 10 + Math.floor(rng() * 16),
      layer: rng() > 0.5 ? 1 : 2,
    });
  }

  const coralCount = loc.ambience === 'reef' ? 9 : loc.ambience === 'abyss' ? 5 : 1;
  const coralColors = ['#e07a9a', '#f0a63c', '#b0709c', '#5fbf5a', '#c98ae8'];
  for (let i = 0; i < coralCount; i++) {
    data.corals.push({
      fx: rng(),
      fy: 0.667 + rng() * 0.278,
      color: coralColors[Math.floor(rng() * coralColors.length)],
      scale: 1 + Math.floor(rng() * 2),
    });
  }

  const weedCount = loc.ambience === 'reef' ? 12 : loc.ambience === 'abyss' ? 7 : 5;
  for (let i = 0; i < weedCount; i++) {
    data.weeds.push({
      fx: rng(),
      fy: 0.741 + rng() * 0.222,
      h: 16 + Math.floor(rng() * 18),
      phase: rng() * 6,
    });
  }

  // Fish swimming in the background water. These are real species — the
  // ones that live here — drawn at full art quality so the sea feels
  // alive rather than populated with grey blobs.
  const localFish = FISH.filter((f) => f.locations.includes(loc.id));
  const ambientCount = loc.ambience === 'abyss' ? 5 : 8;
  for (let i = 0; i < ambientCount; i++) {
    const species = localFish.length
      ? localFish[Math.floor(rng() * localFish.length)]
      : FISH_BY_ID.anchovy;
    data.ambientFish.push({
      fx: rng(),
      fy: 0.463 + rng() * 0.407,
      speed: 10 + rng() * 22,
      dir: rng() > 0.5 ? 1 : -1,
      phase: rng() * 10,
      // A mix of sizes, so the shoal has some depth.
      size: 26 + Math.floor(rng() * 30),
      fish: species,
    });
  }

  // A handful of rarer fish passing through, so every spot has something
  // worth looking at in the water.
  const visitors = FISH.filter((f) =>
    !f.locations.includes(loc.id) &&
    (f.tier === 'rare' || f.tier === 'legendary'));
  const visitorCount = loc.ambience === 'abyss' ? 3 : 2;
  for (let i = 0; i < visitorCount && visitors.length; i++) {
    const species = visitors[Math.floor(rng() * visitors.length)];
    data.ambientFish.push({
      fx: rng(),
      fy: 0.52 + rng() * 0.34,
      speed: 16 + rng() * 20,
      dir: rng() > 0.5 ? 1 : -1,
      phase: rng() * 10,
      size: 34 + Math.floor(rng() * 26),
      fish: species,
      rare: true,
    });
  }

  // Bubbles rising in deep water.
  const bubbleCount = loc.ambience === 'deep' || loc.ambience === 'abyss' ? 16 : 6;
  for (let i = 0; i < bubbleCount; i++) {
    data.bubbles.push({
      fx: rng(),
      fy: 0.444 + rng() * 0.519,
      speed: 6 + rng() * 14,
      size: rng() > 0.7 ? 3 : 2,
      phase: rng() * 10,
    });
  }

  sceneryCache.set(loc.id, data);
  return data;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Scene anchors, derived from the live viewport so the composition holds
 * together at any window size.
 *
 * These are the proportions the 960x540 reference frame used.
 */
const SHORE_F = 256 / 540;      // waterline as a fraction of the height
const RIG_FX = 150 / 960;
const RIG_FY = 322 / 540;
const BOBBER_FX = 566 / 960;
const BOBBER_FY = 396 / 540;

/** The waterline, in game units. */
export function shoreY() {
  return Math.round(H * SHORE_F);
}

/**
 * The rig sits in the water, below the waterline.
 *
 * This is the *deck surface* — the level the angler stands on.
 */
export function boatPos() {
  return { x: Math.round(W * RIG_FX), y: Math.round(H * RIG_FY) };
}

/** The bobber is cast out to the right of the rig. */
export function bobberPos() {
  return { x: Math.round(W * BOBBER_FX), y: Math.round(H * BOBBER_FY) };
}

/**
 * The current rig upgrade level.
 *
 * The rig grows with every boat upgrade, and the angler's footing on the
 * deck moves with it — so the scene needs to know the level before it can
 * place the rod. It is set once per frame from the player state.
 */
let rigLevel = 0;

/** Tell the scene how big the rig is. Call before computing the rod tip. */
export function setRigLevel(level) {
  rigLevel = level || 0;
}

/**
 * The rod is held in the angler's hands and reaches out over the water.
 */
function rodAnchor() {
  const b = boatPos();
  const s = 1 + rigLevel * 0.13;
  // The rod is held where the angler's forward hand is.
  return {
    x: b.x + (RIG.anglerX + RIG.handX) * s,
    y: b.y - RIG.handDrop * s,
    len: 60,
  };
}

/** The tip of the rod, where the fishing line starts. */
export function rodTip(bend = 0) {
  const rod = rodAnchor();
  return {
    x: rod.x + Math.round(rod.len * 1.5),
    y: rod.y - Math.round(rod.len * 0.85) + Math.round(bend * 26),
  };
}

/**
 * Draw the whole background scene.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} loc      location definition
 * @param {number} t        elapsed time in seconds
 * @param {object} opts     { boatLevel, bobberY, bobberX, lineEnd, tension }
 */
export function drawScene(ctx, loc, t, opts = {}) {
  const scenery = getScenery(loc);
  const isNight = loc.ambience === 'abyss';
  const SHORE_Y = shoreY();
  const weather = opts.weather || null;

  // The rig's size follows the boat upgrade, and the angler's footing
  // depends on it, so it has to be set before anything asks for the rod tip.
  setRigLevel(opts.boatLevel || 0);

  // ---- Sky
  //
  // The weather tints the location's own sky, so each place keeps its
  // colours while the light changes with the weather.
  const skyGrad = weather
    ? weather.tintSky(ctx, loc)
    : ctx.createLinearGradient(0, 0, 0, SHORE_Y);
  if (!weather) {
    skyGrad.addColorStop(0, loc.sky[0]);
    skyGrad.addColorStop(1, loc.sky[1]);
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, SHORE_Y);

  // Stars in the abyss
  if (isNight) {
    const rng = makeRng(99);
    for (let i = 0; i < 40; i++) {
      const sx = Math.floor(rng() * W);
      const sy = Math.floor(rng() * SHORE_Y);
      const tw = Math.sin(t * 2 + i) > 0.6;
      ctx.fillStyle = tw ? '#ffffff' : '#7f8fc0';
      ctx.fillRect(sx, sy, 2, 2);
    }
  } else {
    drawSun(ctx, loc, t, weather);
  }

  // ---- Storm clouds, over the top of the ordinary ones.
  if (weather) weather.drawStormClouds(ctx, t);

  // ---- Clouds
  ctx.save();
  if (weather) ctx.globalAlpha = Math.min(1, weather.current.cloudAlpha * 0.6);
  for (const c of scenery.clouds) {
    const cx = (c.fx * W + t * c.speed) % (W + 90) - 45;
    drawCloud(ctx, cx, c.fy * H, c.w);
  }
  ctx.restore();

  // ---- Birds
  for (const b of scenery.birds) {
    const bx = (b.fx * W + t * b.speed) % (W + 40) - 20;
    drawBird(ctx, bx, b.fy * H, t + b.phase);
  }

  // ---- Distant land (lighthouse / islands) per location
  //
  // The landmark is split in two: the part that stands above the water is
  // drawn here, before the sea, and the part that sits *in* the sea is drawn
  // after it. Anything below the waterline has to be painted afterwards or
  // the water rectangle covers it and the landmark vanishes.
  drawLandmark(ctx, loc, t);

  // ---- The shore and its hut, behind the water
  drawShore(ctx, loc, t);

  // ---- Water body
  const [wTop, wBottom] = loc.water;
  const waterGrad = ctx.createLinearGradient(0, SHORE_Y, 0, H);
  waterGrad.addColorStop(0, wTop);
  waterGrad.addColorStop(0.55, mixHex(wTop, wBottom, 0.55));
  waterGrad.addColorStop(1, wBottom);
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, SHORE_Y, W, H - SHORE_Y);

  // ---- Sun glitter on the water, brightest near the horizon.
  // It lines up under the sun so the light reads as coming from it.
  if (!isNight) {
    ctx.save();
    ctx.globalAlpha = 0.40;
    for (let i = 0; i < 70; i++) {
      const gy = SHORE_Y + 4 + rngGlitter(i) * 96;
      const spread = 50 + (gy - SHORE_Y) * 2.6;
      const gx = W * 0.27 + (rngGlitter(i * 7) - 0.5) * spread * 2;
      const w = 2 + Math.floor(rngGlitter(i * 3) * 6);
      if (Math.sin(t * 2.5 + i * 1.7) < 0) continue;
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(Math.round(gx), Math.round(gy), w, 2);
    }
    ctx.restore();
  }

  // ---- Wave bands (parallax by depth)
  drawWaves(ctx, loc, t, 0, weather);

  // ---- The part of the landmark that sits in the sea (the wreck, the
  // coral, the sunken mast). It has to come after the water, or the water
  // rectangle paints over it and the landmark disappears.
  drawLandmarkInWater(ctx, loc, t);

  // ---- Underwater scenery (behind the boat)
  drawUnderwater(ctx, loc, scenery, t);

  // ---- The pier, in front of the water
  drawPier(ctx, loc, t);

  // ---- Boat + fisherman
  drawAngler(ctx, opts);

  // ---- Foreground wave band over the boat's waterline
  drawWaves(ctx, loc, t, 1, weather);

  // ---- Fishing line, drawn above the waves so it stays visible
  if (opts.lineFrom && opts.lineTo) {
    drawFishingLine(ctx, opts.lineFrom, opts.lineTo, opts.tension || 0);
  }

  // ---- Bubbles
  for (const b of scenery.bubbles) {
    const by = (b.fy * H - t * b.speed) % (H - SHORE_Y);
    const yy = SHORE_Y + ((by + H) % (H - SHORE_Y));
    const bx = b.fx * W + Math.sin(t * 1.5 + b.phase) * 5;
    const a = Math.sin(t * 2 + b.phase) > 0.3;
    if (!a) continue;
    ctx.fillStyle = 'rgba(220,240,255,0.5)';
    ctx.beginPath();
    ctx.arc(bx, yy, b.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- The weather, over the top of everything.
  //
  // Precipitation falls in front of the whole scene, the mist sits over it,
  // and the dimming pass ties it together.
  if (weather) {
    weather.drawRipples(ctx, SHORE_Y);
    weather.drawFog(ctx, SHORE_Y, t);
    weather.drawSheets(ctx, t);
    weather.drawPrecipitation(ctx);
    weather.drawLightning(ctx);
    weather.drawHaze(ctx);
    weather.drawDim(ctx);
  }
}

/**
 * A soft sun with a glow, drawn behind the clouds.
 *
 * It sits in the upper-left third so the upgrades panel on the right never
 * covers it, and the glitter on the water is aligned with it below.
 */
function drawSun(ctx, loc, t, weather) {
  const sx = Math.round(W * 0.27);
  const sy = Math.round(H * 0.13) + Math.sin(t * 0.5) * 4;

  // The sun dims with the weather — in a storm there is no sun at all.
  const a = weather ? weather.current.sunAlpha : 1;
  if (a <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = a;

  const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150);
  glow.addColorStop(0, 'rgba(255,232,150,0.55)');
  glow.addColorStop(0.5, 'rgba(255,220,120,0.20)');
  glow.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffe89a';
  ctx.beginPath();
  ctx.arc(sx, sy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8d8';
  ctx.beginPath();
  ctx.arc(sx, sy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Smooth wave bands drawn as filled sine ribbons.
 *
 * The weather sets how big the swell is: calm in the fog, violent in the
 * Abyss storm.
 */
function drawWaves(ctx, loc, t, layer, weather) {
  const isNight = loc.ambience === 'abyss';
  const crest = isNight ? 'rgba(150,190,240,0.34)' : 'rgba(240,252,255,0.52)';
  const trough = isNight ? 'rgba(38,64,120,0.32)' : 'rgba(10,58,110,0.28)';
  const SHORE_Y = shoreY();
  const swell = weather ? weather.current.waveScale : 1;

  const bands = layer === 0 ? 6 : 4;
  for (let b = 0; b < bands; b++) {
    const depth = layer === 0 ? b / bands : 0.52 + b / (bands * 2.2);
    const y = SHORE_Y + 10 + depth * (H - SHORE_Y - 14);
    const amp = (layer === 0 ? 3 : 6) * (0.6 + depth) * swell;
    const period = layer === 0 ? 92 : 62;
    const speed = (layer === 0 ? 0.8 : 1.5) * (0.7 + swell * 0.4);
    const thick = 2 + depth * 3;

    ctx.strokeStyle = crest;
    ctx.lineWidth = thick;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const wave = Math.sin(x / period + t * speed * 1.6);
      const wave2 = Math.sin(x / (period * 0.43) - t * speed * 0.9);
      const v = wave * 0.7 + wave2 * 0.3;
      const yy = y + v * amp;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();

    ctx.strokeStyle = trough;
    ctx.lineWidth = Math.max(1, thick * 0.5);
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const wave = Math.sin(x / period + t * speed * 1.6 + 0.7);
      const wave2 = Math.sin(x / (period * 0.43) - t * speed * 0.9 + 0.5);
      const v = wave * 0.7 + wave2 * 0.3;
      const yy = y + v * amp + thick;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawUnderwater(ctx, loc, scenery, t) {
  const deep = loc.ambience === 'abyss' || loc.ambience === 'deep';
  const SHORE_Y = shoreY();

  // God rays in shallow water
  if (!deep && loc.ambience !== 'reef') {
    const rayLen = Math.round(180 * (H / 540));
    ctx.save();
    ctx.globalAlpha = 0.13;
    for (let i = 0; i < 5; i++) {
      const rx = W * (0.094 + i * 0.208) + Math.sin(t * 0.4 + i) * 22;
      const grad = ctx.createLinearGradient(rx, SHORE_Y, rx, SHORE_Y + rayLen);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(rx - 10, SHORE_Y);
      ctx.lineTo(rx + 10, SHORE_Y);
      ctx.lineTo(rx + 70, SHORE_Y + rayLen);
      ctx.lineTo(rx + 10, SHORE_Y + rayLen);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Caustic light bands on the seabed.
  if (!deep) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 194 + t * 14) % (W + 240)) - 120;
      const cy = H - 30 + Math.sin(t * 0.8 + i) * 4;
      const rw = 32 + (i % 3) * 14;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, rw * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Ambient fish — real species, swimming across the scene.
  for (const f of scenery.ambientFish) {
    const span = W + 120;
    const fx = f.dir > 0
      ? (f.fx * W + t * f.speed) % span - 60
      : W + 60 - ((f.fx * W + t * f.speed) % span);
    const fy = f.fy * H + Math.sin(t * 0.9 + f.phase) * 8;

    ctx.save();
    // Deeper fish are dimmer, so the shoal has depth.
    ctx.globalAlpha = f.rare ? 0.92 : 0.55 + f.size / 90;
    ctx.translate(fx, fy);
    if (f.dir < 0) ctx.scale(-1, 1);

    // The rare ones get a soft halo, so a visitor is visible at a glance.
    if (f.rare) {
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(t * 2 + f.phase) * 0.06;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(0, 0, f.size * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawFish(ctx, f.fish, 0, 0, t + f.phase, f.size);
    ctx.restore();
  }

  // Rocks
  for (const r of scenery.rocks) {
    drawRock(ctx, r.fx * W, r.fy * H, r.size);
    if (r.layer === 1) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      drawRock(ctx, r.fx * W + 4, r.fy * H + 6, r.size);
      ctx.restore();
    }
  }

  // Seaweed
  for (const w of scenery.weeds) {
    drawSeaweed(ctx, w.fx * W, w.fy * H, w.h, deep ? '#1f5a44' : '#2f7a4a');
  }

  // Coral
  for (const c of scenery.corals) {
    ctx.save();
    ctx.translate(c.fx * W, c.fy * H);
    ctx.scale(c.scale, c.scale);
    drawCoral(ctx, 0, 0, c.color);
    ctx.restore();
  }

  // Seabed
  const bedY = H - 26;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const bump = Math.sin(x * 0.016) * 7 + Math.sin(x * 0.006) * 9;
    ctx.lineTo(x, bedY + bump);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = loc.sand;
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const bump = Math.sin(x * 0.016) * 7 + Math.sin(x * 0.006) * 9;
    ctx.lineTo(x, bedY + bump + 7);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = '#6a4a20';
  ctx.fill();
  ctx.restore();
}

/**
 * The part of the location's landmark that stands above the water.
 *
 * Drawn before the sea, so it sits behind it.
 */
function drawLandmark(ctx, loc, t) {
  const SHORE_Y = shoreY();
  switch (loc.ambience) {
    case 'shore': {
      // Lighthouse on a headland.
      //
      // The headland is a quadratic curve, so the hill's crest sits at the
      // curve's midpoint. The tower is placed there rather than at a fixed
      // height, or it floats in the sky on a tall window.
      const hx0 = W * 0.688, hx1 = W * 0.792, hx2 = W;
      const hy0 = SHORE_Y, hy1 = H * 0.33, hy2 = SHORE_Y;

      // Crest of the curve (t = 0.5).
      const crestX = (hx0 + 2 * hx1 + hx2) / 4;
      const crestY = (hy0 + 2 * hy1 + hy2) / 4;

      // Headland.
      ctx.fillStyle = '#3f6b45';
      ctx.beginPath();
      ctx.moveTo(hx0, hy0);
      ctx.quadraticCurveTo(hx1, hy1, hx2, hy2);
      ctx.closePath();
      ctx.fill();

      // Tower — standing on the crest.
      const tw = 24;
      const towerH = Math.round(96 * Math.max(0.7, Math.min(1.25, H / 540)));
      const lx = crestX - tw / 2;
      const ly = crestY - towerH;

      // A strip of grass at the foot of the tower.
      ctx.fillStyle = '#35603c';
      ctx.beginPath();
      ctx.ellipse(crestX, crestY + 2, tw * 0.95, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createLinearGradient(lx, 0, lx + tw, 0);
      grad.addColorStop(0, '#f4f4f8');
      grad.addColorStop(1, '#b8bcc6');
      ctx.fillStyle = grad;
      ctx.fillRect(lx, ly, tw, towerH);
      ctx.fillStyle = '#d8452b';
      ctx.fillRect(lx, ly + towerH * 0.24, tw, towerH * 0.17);
      // Gallery.
      ctx.fillStyle = '#39424f';
      ctx.fillRect(lx - 4, ly - 4, tw + 8, 5);
      // Lamp room.
      ctx.fillStyle = '#2f4a6d';
      ctx.fillRect(lx + 4, ly - 22, tw - 8, 18);
      ctx.fillStyle = '#ffd45e';
      ctx.fillRect(lx + 7, ly - 19, tw - 14, 12);
      if (Math.sin(t * 1.5) > 0.3) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.moveTo(lx + 12, ly - 9);
        ctx.lineTo(lx - 120, ly - 60);
        ctx.lineTo(lx - 120, ly + 40);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'rocks': {
      // A cliff wall along the far side.
      ctx.fillStyle = '#464e5c';
      ctx.beginPath();
      ctx.moveTo(0, SHORE_Y);
      for (let x = 0; x <= W; x += 10) {
        const h = 36 + Math.sin(x * 0.01) * 20 + Math.sin(x * 0.0034) * 16;
        ctx.lineTo(x, SHORE_Y - h);
      }
      ctx.lineTo(W, SHORE_Y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case 'deep': {
      // Distant storm clouds.
      ctx.save();
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 360 + t * 12) % (W + 240)) - 120;
        ctx.fillStyle = '#1e3053';
        ctx.beginPath();
        ctx.ellipse(cx + 90, H * 0.056, 90, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a4275';
        ctx.beginPath();
        ctx.ellipse(cx + 84, H * 0.037, 60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'reef': {
      // Coral silhouette on the horizon.
      ctx.fillStyle = '#2b6874';
      for (let i = 0; i < 12; i++) {
        const cx = i * (W / 11) + 20;
        const ch = 20 + Math.round(Math.sin(i * 2.3) * 14 + 14);
        ctx.fillRect(cx, SHORE_Y - ch, 10, ch);
        ctx.fillRect(cx + 4, SHORE_Y - ch - 12, 6, 12);
      }
      break;
    }
    case 'abyss': {
      // A distant looming shape.
      ctx.save();
      ctx.globalAlpha = 0.4;
      const bob = Math.sin(t * 0.4) * 8;
      ctx.fillStyle = '#141f42';
      ctx.beginPath();
      ctx.ellipse(W * 0.73, H * 0.167 + bob, 220, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Glowing eyes.
      if (Math.sin(t * 1.2) > 0.4) {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(W * 0.688, H * 0.148 + bob, 5, 0, Math.PI * 2);
        ctx.arc(W * 0.73, H * 0.141 + bob, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
}

/**
 * The part of the location's landmark that sits *in* the water.
 *
 * Drawn after the sea, so the wreck, the coral and the tree are actually
 * visible instead of being painted over by the water rectangle.
 */
function drawLandmarkInWater(ctx, loc, t) {
  const SHORE_Y = shoreY();
  switch (loc.ambience) {
    case 'rocks': {
      // The landmark: a broken shipwreck half-sunk in the water.
      //
      // It sits out to the right so it does not crowd the rig, and it is
      // big enough to read as a whole ship rather than a smudge.
      drawShipwreck(ctx, W * 0.74, SHORE_Y + 26, 1.55, t);

      // A scatter of debris drifting around it.
      ctx.fillStyle = 'rgba(80,64,48,0.85)';
      const drift = (t * 6) % 90;
      for (let i = 0; i < 5; i++) {
        const dx = W * 0.58 + i * 34 + drift * 0.3;
        const dy = SHORE_Y + 34 + Math.sin(i * 2.1 + t) * 3;
        ctx.fillRect(Math.round(dx % (W - 40)), Math.round(dy), 9, 3);
      }
      break;
    }
    case 'deep': {
      // The landmark: a sunken mast, the only thing breaking the horizon.
      drawSunkenMast(ctx, W * 0.70, SHORE_Y + 16, 1.25, t);
      break;
    }
    case 'reef': {
      // The landmark: a coral arch, the one thing breaking the horizon.
      drawCoralArch(ctx, W * 0.72, SHORE_Y + 18, 1.5);
      break;
    }
    case 'abyss': {
      // The landmark: a dead tree, standing in the black water.
      //
      // It stands on the right, away from the rig, or the angler and the
      // platform hide it completely.
      drawDeadTree(ctx, W * 0.78, SHORE_Y + 40, 1.5, t);
      break;
    }
  }
}

/**
 * The low headland on the left, drawn behind the water.
 *
 * The player lives on a rig now, so there is no hut on the bank any more —
 * just the rock, running into the sea.
 */
function drawShore(ctx, loc, t) {
  const isNight = loc.ambience === 'abyss';
  const SHORE_Y = shoreY();

  // Rocky bank meeting the water at the left edge.
  const bankW = Math.round(92 * (W / 960));
  const bankTop = SHORE_Y - 48;
  ctx.fillStyle = isNight ? '#241f38' : '#94875f';
  ctx.beginPath();
  ctx.moveTo(0, SHORE_Y + 4);
  for (let x = 0; x <= bankW; x += 6) {
    const h = bankTop + Math.sin(x * 0.11) * 11 + Math.sin(x * 0.045) * 13;
    ctx.lineTo(x, h);
  }
  ctx.lineTo(bankW, SHORE_Y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isNight ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

/**
 * The rocky outcrops that break the surface on the left.
 *
 * The wooden jetty used to live here, but the player lives on a rig now —
 * so the water is left open and the rocks carry the foreground instead.
 */
function drawPier(ctx, loc, t) {
  const isNight = loc.ambience === 'abyss';
  const rock = isNight ? '#2b2740' : '#7d7359';
  const rockHi = isNight ? '#463f60' : '#a89a76';
  const rockDark = isNight ? '#171426' : '#4e4835';

  const deckY = Math.round(H * 0.437);

  // A low cluster of rocks breaking the surface.
  const rocks = [
    { x: Math.round(18 * (W / 960)), w: 46, h: 26 },
    { x: Math.round(72 * (W / 960)), w: 34, h: 17 },
    { x: Math.round(104 * (W / 960)), w: 22, h: 11 },
  ];
  for (const r of rocks) {
    const baseY = deckY + 22;
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.moveTo(r.x, baseY);
    ctx.quadraticCurveTo(r.x + r.w * 0.2, baseY - r.h * 1.5, r.x + r.w * 0.5, baseY - r.h);
    ctx.quadraticCurveTo(r.x + r.w * 0.82, baseY - r.h * 1.35, r.x + r.w, baseY);
    ctx.closePath();
    ctx.fill();
    // A lit face on the left of each rock.
    ctx.fillStyle = rockHi;
    ctx.beginPath();
    ctx.moveTo(r.x, baseY);
    ctx.quadraticCurveTo(r.x + r.w * 0.2, baseY - r.h * 1.5, r.x + r.w * 0.5, baseY - r.h);
    ctx.quadraticCurveTo(r.x + r.w * 0.36, baseY - r.h * 0.5, r.x + r.w * 0.22, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rockDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r.x, baseY);
    ctx.quadraticCurveTo(r.x + r.w * 0.2, baseY - r.h * 1.5, r.x + r.w * 0.5, baseY - r.h);
    ctx.quadraticCurveTo(r.x + r.w * 0.82, baseY - r.h * 1.35, r.x + r.w, baseY);
    ctx.stroke();
    // Foam where the rock meets the water.
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fillRect(r.x - 3, baseY - 2, r.w + 6, 3);
  }

  // Rocky Shore gets a broken pier instead of bare rocks — the remains of
  // whatever used to work this water.
  if (loc.ambience === 'rocks') {
    drawBrokenPier(ctx, Math.round(150 * (W / 960)), deckY + 34, 0.95, t);
  }
}

/**
 * A cheap deterministic pseudo-random in 0..1 from an integer seed.
 */
function rngGlitter(i) {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The rig, the angler and the fishing line.
 */
function drawAngler(ctx, opts = {}) {
  const {
    fisherFrame = 0, rodBend = 0,
  } = opts;
  const anchor = boatPos();
  const rigX = opts.rigX ?? anchor.x;
  const rigY = opts.rigY ?? anchor.y;
  const rod = rodAnchor();
  const s = 1 + rigLevel * 0.13;

  // The rig is drawn first — legs into the water, deck, then the derrick.
  drawOilRig(ctx, rigX, rigY, rigLevel, opts.t || 0);

  // The angler stands on the deck, to the right of the derrick so the
  // tower never hides him. His feet sit on the deck surface.
  drawFisherman(ctx, rigX + RIG.anglerX * s, rigY - RIG.footDrop * s, fisherFrame, s);

  // Rod — drawn after the angler so it reads as being in his hands.
  drawRod(ctx, rod.x + (rigX - anchor.x), rod.y + (rigY - anchor.y), rod.len, rodBend);
}

/**
 * A line with a slight sag, tightening as tension rises.
 */
function drawFishingLine(ctx, from, to, tension = 0) {
  const sag = Math.max(0, (1 - tension) * 14);
  ctx.strokeStyle = tension > 0.75 ? '#ffd0d0' : 'rgba(240,248,255,0.92)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(
    (from.x + to.x) / 2,
    (from.y + to.y) / 2 + sag,
    to.x, to.y,
  );
  ctx.stroke();
}

/**
 * Draw the bobber in the water at (x, y).
 */
export function drawFishingBobber(ctx, x, y, t, submerged) {
  drawBobber(ctx, x, y, t, submerged);
}

/**
 * Ambient animated fish (used by the collection screen previews).
 */
export function drawPreviewFish(ctx, fish, x, y, t) {
  drawFish(ctx, fish, x, y, t, 56);
}

export { W, H };
