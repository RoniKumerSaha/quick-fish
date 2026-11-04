/**
 * Vector sprites.
 *
 * Everything here is drawn with canvas paths — there are no image assets in
 * this project. The fish are built from a shared body primitive plus a set
 * of per-archetype tails, fins and markings, so all thirteen species read
 * as the same illustrated family.
 */

import { rect, clamp, roundRect, roundRectPath, lighten, darken, mixHex } from '../engine/gfx.js';

// ------------------------------------------------------------------ palette

/**
 * A fish's colours, resolved from the content definition.
 */
function paletteOf(fish) {
  const p = fish.palette || {};
  return {
    body: p.body || '#9fb3c8',
    belly: p.belly || '#e6eef6',
    fin: p.fin || '#7a8fa5',
    eye: p.eye || '#101020',
    stripe: p.stripe || null,
    spot: p.spot || null,
    lure: p.lure || null,
  };
}

/**
 * Draw a closed, tapered body outline.
 *
 * The body is a lens shape whose half-height follows `profile(t)`; the
 * profile function is what makes each archetype read differently.
 */
function bodyShape(ctx, cx, cy, len, half, profile) {
  const steps = 26;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = cx - len / 2 + len * t;
    pts.push([x, cy - profile(t) * half]);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = cx - len / 2 + len * t;
    pts.push([x, cy + profile(t) * half]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.closePath();
}

/**
 * The default fish outline: full in the middle, tapering to the tail.
 */
function lensProfile(t) {
  return Math.sin(Math.PI * Math.min(1, t * 1.04)) ** 0.72;
}

/**
 * Fill a fish body with rich shading: a dark back, a saturated flank, a pale
 * belly, a specular sheen and a rim light along the spine.
 */
function paintBody(ctx, cx, cy, len, half, profile, pal) {
  const g = ctx.createLinearGradient(0, cy - half, 0, cy + half);
  g.addColorStop(0, darken(pal.body, 0.42));
  g.addColorStop(0.16, darken(pal.body, 0.20));
  g.addColorStop(0.44, pal.body);
  g.addColorStop(0.70, lighten(pal.body, 0.16));
  g.addColorStop(0.88, pal.belly);
  g.addColorStop(1, lighten(pal.belly, 0.12));

  bodyShape(ctx, cx, cy, len, half, profile);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  bodyShape(ctx, cx, cy, len, half, profile);
  ctx.clip();

  // A soft specular sheen across the upper flank.
  const sheen = ctx.createLinearGradient(0, cy - half, 0, cy);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.65, 'rgba(255,255,255,0.26)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - len / 2, cy - half, len, half);

  // Scale texture: a faint lattice over the mid-flank.
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(0.5, half * 0.07);
  const step = Math.max(4, half * 0.55);
  ctx.beginPath();
  for (let x = cx - len / 2; x <= cx + len / 2; x += step) {
    ctx.moveTo(x, cy - half);
    ctx.lineTo(x, cy + half);
  }
  for (let x = cx - len / 2 + step / 2; x <= cx + len / 2; x += step) {
    ctx.moveTo(x, cy - half);
    ctx.lineTo(x, cy + half);
  }
  ctx.stroke();

  // A rim light along the back.
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = Math.max(1, half * 0.14);
  ctx.beginPath();
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const x = cx - len / 2 + len * t;
    const y = cy - profile(t) * half + half * 0.11;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // A warm bounce light along the belly.
  ctx.strokeStyle = 'rgba(255,240,210,0.30)';
  ctx.lineWidth = Math.max(1, half * 0.12);
  ctx.beginPath();
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const x = cx - len / 2 + len * t;
    const y = cy + profile(t) * half - half * 0.10;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.restore();

  // A crisp outline so the fish reads against any background.
  bodyShape(ctx, cx, cy, len, half, profile);
  ctx.strokeStyle = darken(pal.body, 0.55);
  ctx.lineWidth = Math.max(1, half * 0.10);
  ctx.stroke();
}

/**
 * A fish eye: a dark socket ring, a white sclera, an iris and two catch
 * lights so it looks alive rather than like a pasted-on dot.
 */
function fishEye(ctx, x, y, r, pal) {
  // Socket shadow.
  ctx.fillStyle = darken(pal.body, 0.45);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.18, 0, Math.PI * 2);
  ctx.fill();

  // Sclera.
  ctx.fillStyle = '#fdfbf4';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Iris.
  ctx.fillStyle = pal.eye;
  ctx.beginPath();
  ctx.arc(x + r * 0.10, y, r * 0.62, 0, Math.PI * 2);
  ctx.fill();

  // Iris ring, a shade brighter than the pupil.
  ctx.strokeStyle = lighten(pal.eye, 0.35);
  ctx.lineWidth = Math.max(0.6, r * 0.16);
  ctx.beginPath();
  ctx.arc(x + r * 0.10, y, r * 0.40, 0, Math.PI * 2);
  ctx.stroke();

  // Catch lights.
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.26, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(x + r * 0.26, y + r * 0.24, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A curved gill plate just behind the head.
 */
function gillPlate(ctx, x, y, h, pal, dir = 1) {
  ctx.strokeStyle = darken(pal.body, 0.5);
  ctx.lineWidth = Math.max(1, h * 0.075);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.62);
  ctx.quadraticCurveTo(x - dir * h * 0.26, y - h * 0.05, x + dir * h * 0.06, y + h * 0.55);
  ctx.stroke();
  // A pale highlight on the plate edge.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(0.6, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(x + dir * h * 0.05, y - h * 0.6);
  ctx.quadraticCurveTo(x - dir * h * 0.2, y - h * 0.04, x + dir * h * 0.11, y + h * 0.52);
  ctx.stroke();
}

/**
 * A small curved mouth line.
 */
function fishMouth(ctx, x, y, w, pal, curve = 1) {
  ctx.strokeStyle = darken(pal.body, 0.62);
  ctx.lineWidth = Math.max(1, w * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.quadraticCurveTo(x, y + curve * w * 0.42, x + w * 0.5, y - curve * w * 0.1);
  ctx.stroke();
}

/**
 * A translucent fin with visible rays.
 */
function finShape(ctx, x, y, w, h, dir = -1, color = '#7a8fa5') {
  ctx.save();
  ctx.globalAlpha = 0.78;
  const grad = ctx.createLinearGradient(x, y, x + dir * w, y - h);
  grad.addColorStop(0, darken(color, 0.18));
  grad.addColorStop(1, lighten(color, 0.26));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * w * 0.5, y - h * 0.6, x + dir * w, y - h * 0.15);
  ctx.quadraticCurveTo(x + dir * w * 0.6, y + h * 0.3, x, y);
  ctx.closePath();
  ctx.fill();

  // Rays.
  ctx.strokeStyle = darken(color, 0.34);
  ctx.lineWidth = Math.max(0.6, w * 0.05);
  ctx.beginPath();
  for (let i = 1; i <= 3; i++) {
    const f = i / 4;
    ctx.moveTo(x, y);
    ctx.lineTo(x + dir * w * f * 0.95, y - h * (0.18 + f * 0.38));
  }
  ctx.stroke();

  // A bright leading edge.
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(0.6, w * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * w * 0.5, y - h * 0.6, x + dir * w, y - h * 0.15);
  ctx.stroke();
  ctx.restore();
}

/**
 * A tail fin that flutters with the animation phase.
 */
function tailFin(ctx, x, y, size, wag, color) {
  const swing = wag ? 0.22 : -0.22;
  ctx.save();

  // Membrane.
  ctx.globalAlpha = 0.82;
  const grad = ctx.createLinearGradient(x, y, x - size, y - size * 0.4);
  grad.addColorStop(0, darken(color, 0.16));
  grad.addColorStop(1, lighten(color, 0.28));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(
    x - size * 0.7, y + swing * size * 1.2 - size * 0.42,
    x - size, y + swing * size * 0.7 - size * 0.1,
  );
  ctx.quadraticCurveTo(
    x - size * 0.62, y + swing * size * 0.5 + size * 0.16,
    x, y + size * 0.12,
  );
  ctx.closePath();
  ctx.fill();

  // Fin rays.
  ctx.strokeStyle = darken(color, 0.38);
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const f = i / 5;
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - size * (0.55 + f * 0.42),
      y + swing * size * (0.9 - f * 0.5) + size * (f * 0.3 - 0.28),
    );
  }
  ctx.stroke();

  // A bright trailing edge.
  ctx.strokeStyle = 'rgba(255,255,255,0.40)';
  ctx.lineWidth = Math.max(0.8, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x - size, y + swing * size * 0.7 - size * 0.1);
  ctx.quadraticCurveTo(
    x - size * 0.62, y + swing * size * 0.5 + size * 0.16,
    x, y + size * 0.12,
  );
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a fish centred on (cx, cy) at the given size.
 *
 * @param {object} fish   content definition
 * @param {number} cx
 * @param {number} cy
 * @param {number} t      animation time in seconds
 * @param {number} size   overall length in pixels
 */
export function drawFish(ctx, fish, cx, cy, t = 0, size = 64) {
  const pal = paletteOf(fish);
  const wag = Math.sin(t * 5.5) > 0 ? 1 : -1;
  const arch = fish.archetype || 'note';

  ctx.save();

  switch (arch) {
    case 'slim': {
      const len = size * 0.86, half = size * 0.16;
      paintBody(ctx, cx, cy, len, half, lensProfile, pal);
      tailFin(ctx, cx - len / 2 + 2, cy, len * 0.26, wag, pal.fin);
      finShape(ctx, cx - len * 0.05, cy - half * 0.85, len * 0.22, half * 1.1, 1, pal.fin);
      finShape(ctx, cx - len * 0.02, cy + half * 0.8, len * 0.16, half * 0.8, 1, pal.fin);
      // Stripes.
      if (pal.stripe) {
        ctx.save();
        bodyShape(ctx, cx, cy, len, half, lensProfile);
        ctx.clip();
        ctx.fillStyle = pal.stripe;
        for (let i = 0; i < 4; i++) {
          const x = cx - len * 0.22 + i * len * 0.13;
          ctx.fillRect(x, cy - half, len * 0.045, half * 2);
        }
        ctx.restore();
      }
      gillPlate(ctx, cx + len * 0.22, cy, half * 1.5, pal, -1);
      fishMouth(ctx, cx + len * 0.44, cy + half * 0.30, len * 0.11, pal, 1);
      fishEye(ctx, cx + len * 0.32, cy - half * 0.25, size * 0.045, pal);
      break;
    }

    case 'round': {
      const len = size * 0.66, half = size * 0.30;
      const profile = (t2) => Math.sqrt(Math.max(0, 1 - Math.pow(t2 * 2 - 1, 2))) * 0.98 + 0.02;
      paintBody(ctx, cx, cy, len, half, profile, pal);
      tailFin(ctx, cx - len / 2 + 2, cy, len * 0.30, wag, pal.fin);
      finShape(ctx, cx - len * 0.02, cy - half * 0.9, len * 0.26, half * 0.9, 1, pal.fin);
      finShape(ctx, cx + len * 0.16, cy + half * 0.6, len * 0.20, half * 0.6, 1, pal.fin);
      gillPlate(ctx, cx + len * 0.12, cy, half * 1.5, pal, -1);
      fishMouth(ctx, cx + len * 0.40, cy + half * 0.36, len * 0.14, pal, 1);
      fishEye(ctx, cx + len * 0.24, cy - half * 0.28, size * 0.06, pal);
      break;
    }

    case 'flat': {
      const len = size * 0.78, half = size * 0.22;
      const profile = (t2) => Math.sin(Math.PI * Math.min(1, t2 * 0.86 + 0.14)) ** 0.6;
      paintBody(ctx, cx, cy, len, half, profile, pal);
      tailFin(ctx, cx - len / 2 + 2, cy, len * 0.26, wag, pal.fin);
      gillPlate(ctx, cx + len * 0.18, cy, half * 1.5, pal, -1);
      fishMouth(ctx, cx + len * 0.42, cy + half * 0.28, len * 0.10, pal, 1);
      // Both eyes on the upper side — the flounder look.
      fishEye(ctx, cx + len * 0.26, cy - half * 0.22, size * 0.045, pal);
      fishEye(ctx, cx + len * 0.36, cy - half * 0.16, size * 0.042, pal);
      if (pal.spot) {
        ctx.fillStyle = pal.spot;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * len * 0.22, cy + Math.sin(a) * half * 0.4,
            size * 0.022, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'blob': {
      const len = size * 0.62, half = size * 0.30;
      const profile = (t2) => Math.sin(Math.PI * Math.min(1, t2 * 0.9 + 0.1)) ** 0.5;
      paintBody(ctx, cx, cy, len, half, profile, pal);
      tailFin(ctx, cx - len / 2 + 2, cy, len * 0.24, wag, pal.fin);
      // Little legs underneath.
      ctx.fillStyle = pal.fin;
      for (let k = 0; k < 3; k++) {
        const lx = cx - len * 0.22 + k * len * 0.22;
        const off = Math.sin(t * 6 + k) * size * 0.012;
        roundRect(ctx, lx - size * 0.025, cy + half * 0.80 + off, size * 0.05, size * 0.08,
          size * 0.02, pal.fin);
      }
      // Lure on a stalk.
      if (pal.lure) {
        const lx = cx + len * 0.16;
        const ly = cy - half * 0.95;
        ctx.strokeStyle = pal.fin;
        ctx.lineWidth = Math.max(1, size * 0.022);
        ctx.beginPath();
        ctx.moveTo(lx, cy - half * 0.7);
        ctx.quadraticCurveTo(lx + size * 0.06, ly + size * 0.04, lx, ly);
        ctx.stroke();
        ctx.fillStyle = pal.lure;
        ctx.beginPath();
        ctx.arc(lx, ly, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(lx - size * 0.015, ly - size * 0.015, size * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
      gillPlate(ctx, cx + len * 0.02, cy, half * 1.4, pal, -1);
      fishMouth(ctx, cx + len * 0.32, cy + half * 0.30, len * 0.16, pal, 1);
      fishEye(ctx, cx + len * 0.16, cy - half * 0.2, size * 0.055, pal);
      break;
    }

    case 'eel': {
      // A long ribbon that undulates.
      const len = size * 0.9;
      const amp = size * 0.10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = pal.fin;
      ctx.lineWidth = size * 0.16;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const tt = i / 30;
        const x = cx - len / 2 + len * tt;
        const y = cy + Math.sin(tt * 6 - t * 5) * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = pal.body;
      ctx.lineWidth = size * 0.11;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const tt = i / 30;
        const x = cx - len / 2 + len * tt;
        const y = cy + Math.sin(tt * 6 - t * 5) * amp;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Head.
      const hx = cx + len * 0.44;
      const hy = cy + Math.sin(6 - t * 5) * amp;
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.ellipse(hx, hy, size * 0.09, size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darken(pal.body, 0.5);
      ctx.lineWidth = Math.max(0.8, size * 0.012);
      ctx.stroke();
      fishEye(ctx, hx + size * 0.02, hy - size * 0.02, size * 0.035, pal);
      break;
    }

    case 'shark': {
      const len = size * 0.95, half = size * 0.20;
      paintBody(ctx, cx, cy, len, half, lensProfile, pal);
      tailFin(ctx, cx - len / 2 + 2, cy, len * 0.26, wag, pal.fin);
      // Dorsal fin — a sharp translucent triangle with a ray down the middle.
      ctx.save();
      ctx.globalAlpha = 0.82;
      const dg = ctx.createLinearGradient(cx, cy - half, cx, cy - half * 2.1);
      dg.addColorStop(0, darken(pal.fin, 0.22));
      dg.addColorStop(1, lighten(pal.fin, 0.24));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.moveTo(cx - len * 0.02, cy - half * 0.85);
      ctx.lineTo(cx + len * 0.06, cy - half * 2.1);
      ctx.lineTo(cx + len * 0.16, cy - half * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = darken(pal.fin, 0.4);
      ctx.lineWidth = Math.max(0.7, size * 0.012);
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.01, cy - half * 0.9);
      ctx.lineTo(cx + len * 0.06, cy - half * 1.95);
      ctx.stroke();
      ctx.restore();
      // Pectoral fin.
      ctx.save();
      ctx.globalAlpha = 0.80;
      ctx.fillStyle = lighten(pal.fin, 0.10);
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.10, cy + half * 0.55);
      ctx.lineTo(cx + len * 0.00, cy + half * 1.6);
      ctx.lineTo(cx + len * 0.22, cy + half * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = darken(pal.fin, 0.42);
      ctx.lineWidth = Math.max(0.7, size * 0.011);
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.09, cy + half * 0.6);
      ctx.lineTo(cx + len * 0.02, cy + half * 1.45);
      ctx.stroke();
      ctx.restore();
      // A wide, toothy mouth.
      ctx.strokeStyle = 'rgba(24,14,34,0.75)';
      ctx.lineWidth = Math.max(1.2, size * 0.018);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.22, cy + half * 0.45);
      ctx.quadraticCurveTo(cx + len * 0.31, cy + half * 0.62, cx + len * 0.42, cy + half * 0.28);
      ctx.stroke();
      // Teeth.
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 5; k++) {
        const f = k / 5;
        const tx = cx + len * (0.24 + f * 0.16);
        const ty = cy + half * (0.47 + f * 0.02);
        ctx.beginPath();
        ctx.moveTo(tx - size * 0.010, ty);
        ctx.lineTo(tx, ty + size * 0.026);
        ctx.lineTo(tx + size * 0.010, ty);
        ctx.closePath();
        ctx.fill();
      }
      // Gill slits.
      for (let k = 0; k < 3; k++) {
        const gx = cx + len * (0.14 + k * 0.045);
        ctx.strokeStyle = 'rgba(30,20,40,0.6)';
        ctx.lineWidth = Math.max(1, size * 0.012);
        ctx.beginPath();
        ctx.moveTo(gx, cy - half * 0.55);
        ctx.lineTo(gx - size * 0.012, cy + half * 0.2);
        ctx.stroke();
      }
      fishEye(ctx, cx + len * 0.30, cy - half * 0.35, size * 0.035, pal);
      break;
    }

    case 'squid': {
      const len = size * 0.34;
      // Mantle.
      const g = ctx.createLinearGradient(0, cy - len, 0, cy + len * 0.3);
      g.addColorStop(0, darken(pal.body, 0.18));
      g.addColorStop(1, pal.belly);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy - len);
      ctx.quadraticCurveTo(cx + len * 0.75, cy - len * 0.2, cx + len * 0.5, cy + len * 0.28);
      ctx.lineTo(cx - len * 0.5, cy + len * 0.28);
      ctx.quadraticCurveTo(cx - len * 0.75, cy - len * 0.2, cx, cy - len);
      ctx.closePath();
      ctx.fill();
      // Side fins.
      ctx.fillStyle = pal.fin;
      ctx.beginPath();
      ctx.ellipse(cx - len * 0.62, cy - len * 0.30, len * 0.36, len * 0.22, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + len * 0.62, cy - len * 0.30, len * 0.36, len * 0.22, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Tentacles.
      ctx.strokeStyle = pal.body;
      ctx.lineWidth = size * 0.035;
      ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const lx = cx + (k - 2) * len * 0.28;
        const sway = Math.sin(t * 4 + k) * size * 0.03;
        ctx.beginPath();
        ctx.moveTo(lx, cy + len * 0.24);
        ctx.quadraticCurveTo(lx + sway, cy + len * 0.85, lx + sway * 1.6, cy + len * 1.25);
        ctx.stroke();
      }
      // A dark outline along the mantle edge.
      ctx.strokeStyle = darken(pal.body, 0.5);
      ctx.lineWidth = Math.max(1, size * 0.014);
      ctx.beginPath();
      ctx.moveTo(cx, cy - len);
      ctx.quadraticCurveTo(cx + len * 0.75, cy - len * 0.2, cx + len * 0.5, cy + len * 0.28);
      ctx.lineTo(cx - len * 0.5, cy + len * 0.28);
      ctx.quadraticCurveTo(cx - len * 0.75, cy - len * 0.2, cx, cy - len);
      ctx.closePath();
      ctx.stroke();
      fishEye(ctx, cx - len * 0.34, cy - len * 0.42, size * 0.04, pal);
      fishEye(ctx, cx + len * 0.34, cy - len * 0.42, size * 0.04, pal);
      break;
    }

    case 'crab': {
      const len = size * 0.62, half = size * 0.28;
      const profile = (t2) => Math.sqrt(Math.max(0, 1 - Math.pow(t2 * 2 - 1, 2))) * 0.96 + 0.04;
      paintBody(ctx, cx, cy, len, half, profile, pal);
      // Shell ridges.
      ctx.save();
      bodyShape(ctx, cx, cy, len, half, profile);
      ctx.clip();
      ctx.strokeStyle = darken(pal.body, 0.28);
      ctx.lineWidth = Math.max(1, half * 0.08);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(cx + i * len * 0.16, cy - half);
        ctx.quadraticCurveTo(cx + i * len * 0.16 + len * 0.05, cy, cx + i * len * 0.16, cy + half);
      }
      ctx.stroke();
      ctx.restore();
      // Legs.
      ctx.strokeStyle = pal.fin;
      ctx.lineWidth = size * 0.028;
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const lx = cx - len * 0.28 + k * len * 0.28;
        const step = Math.sin(t * 6 + k * 1.4) * size * 0.02;
        ctx.beginPath();
        ctx.moveTo(lx, cy + half * 0.7);
        ctx.lineTo(lx - size * 0.04 + step, cy + half * 1.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, cy + half * 0.7);
        ctx.lineTo(lx + size * 0.04 - step, cy + half * 1.35);
        ctx.stroke();
      }
      // Claws.
      for (const s of [-1, 1]) {
        const cxx = cx + s * len * 0.60;
        const cyy = cy - half * 0.15;
        const pinch = (Math.sin(t * 3 + s) + 1) * 0.14;
        ctx.fillStyle = pal.body;
        ctx.beginPath();
        ctx.ellipse(cxx, cyy, size * 0.07, size * 0.055, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = darken(pal.body, 0.5);
        ctx.lineWidth = Math.max(0.8, size * 0.011);
        ctx.stroke();
        ctx.fillStyle = lighten(pal.body, 0.28);
        ctx.beginPath();
        ctx.moveTo(cxx, cyy - size * 0.03);
        ctx.lineTo(cxx + s * size * 0.06, cyy - size * 0.09 - pinch * size * 0.2);
        ctx.lineTo(cxx + s * size * 0.05, cyy - size * 0.01);
        ctx.closePath();
        ctx.fill();
      }
      fishMouth(ctx, cx, cy + half * 0.55, len * 0.14, pal, 1);
      fishEye(ctx, cx - len * 0.16, cy - half * 0.34, size * 0.05, pal);
      fishEye(ctx, cx + len * 0.16, cy - half * 0.34, size * 0.05, pal);
      break;
    }

    case 'lobster': {
      // A segmented body, two big claws and a fan tail.
      const len = size * 0.80;

      // Abdomen segments, tapering towards the tail.
      for (let i = 0; i < 5; i++) {
        const f = i / 5;
        const px = cx - len * (0.10 + f * 0.42);
        const py = cy + size * 0.02 + Math.sin(t * 3 + f * 2) * size * 0.01;
        const w = size * (0.10 - f * 0.011);
        ctx.fillStyle = i % 2 ? pal.body : darken(pal.body, 0.10);
        roundRect(ctx, px - w, py - w * 0.9, w * 2, w * 1.8, w * 0.35, ctx.fillStyle);
        ctx.strokeStyle = darken(pal.body, 0.45);
        ctx.lineWidth = Math.max(0.6, size * 0.008);
        ctx.stroke();
      }

      // Tail fan.
      ctx.fillStyle = pal.fin;
      ctx.beginPath();
      ctx.moveTo(cx - len * 0.48, cy + size * 0.02);
      ctx.lineTo(cx - len * 0.66, cy - size * 0.10);
      ctx.lineTo(cx - len * 0.60, cy + size * 0.01);
      ctx.lineTo(cx - len * 0.66, cy + size * 0.12);
      ctx.closePath();
      ctx.fill();

      // Carapace.
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.ellipse(cx + len * 0.16, cy, size * 0.13, size * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darken(pal.body, 0.45);
      ctx.lineWidth = Math.max(0.8, size * 0.012);
      ctx.stroke();

      // Claws and legs.
      for (const s of [-1, 1]) {
        const pin = Math.sin(t * 2.6 + (s > 0 ? 0 : 1.4)) * size * 0.012;
        const ax = cx + len * 0.30;
        const ay = cy + s * size * 0.09;
        ctx.strokeStyle = pal.body;
        ctx.lineWidth = Math.max(1.4, size * 0.024);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + len * 0.20, cy + s * size * 0.04);
        ctx.quadraticCurveTo(ax + size * 0.03, ay, ax + size * 0.10, ay + pin);
        ctx.stroke();
        ctx.fillStyle = pal.fin;
        ctx.beginPath();
        ctx.ellipse(ax + size * 0.14, ay + pin, size * 0.075, size * 0.042, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = darken(pal.body, 0.5);
        ctx.lineWidth = Math.max(0.7, size * 0.010);
        ctx.stroke();

        ctx.strokeStyle = pal.fin;
        ctx.lineWidth = Math.max(0.8, size * 0.014);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + len * (0.14 - i * 0.10), cy + s * size * 0.06);
          ctx.lineTo(cx + len * (0.10 - i * 0.10), cy + s * size * 0.15);
          ctx.stroke();
        }
      }

      // Antennae.
      ctx.strokeStyle = pal.fin;
      ctx.lineWidth = Math.max(0.7, size * 0.010);
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.26, cy - size * 0.04);
      ctx.quadraticCurveTo(cx + len * 0.52, cy - size * 0.14, cx + len * 0.62, cy - size * 0.26);
      ctx.moveTo(cx + len * 0.26, cy + size * 0.02);
      ctx.quadraticCurveTo(cx + len * 0.50, cy + size * 0.02, cx + len * 0.58, cy + size * 0.08);
      ctx.stroke();

      fishEye(ctx, cx + len * 0.22, cy - size * 0.045, size * 0.032, pal);
      break;
    }

    case 'shrimp': {
      // A comma-shaped body that flicks as it swims.
      const len = size * 0.72;
      const flick = Math.sin(t * 4.5) * size * 0.05;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Body.
      ctx.strokeStyle = pal.body;
      ctx.lineWidth = size * 0.16;
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.36, cy - size * 0.06);
      ctx.quadraticCurveTo(cx + len * 0.05, cy - size * 0.16, cx - len * 0.10, cy + size * 0.06 + flick);
      ctx.quadraticCurveTo(cx - len * 0.20, cy + size * 0.22 + flick, cx - len * 0.42, cy + size * 0.20 + flick);
      ctx.stroke();

      // Pale underside.
      ctx.strokeStyle = pal.belly;
      ctx.lineWidth = size * 0.07;
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.34, cy - size * 0.02);
      ctx.quadraticCurveTo(cx + len * 0.05, cy - size * 0.10, cx - len * 0.08, cy + size * 0.08 + flick);
      ctx.quadraticCurveTo(cx - len * 0.18, cy + size * 0.22 + flick, cx - len * 0.40, cy + size * 0.21 + flick);
      ctx.stroke();

      // Segment lines.
      ctx.strokeStyle = darken(pal.body, 0.35);
      ctx.lineWidth = Math.max(0.7, size * 0.010);
      for (let i = 0; i < 4; i++) {
        const f = i / 4;
        const px = cx + len * (0.26 - f * 0.52);
        const py = cy - size * (0.08 - f * 0.02) + size * f * 0.16 + flick * f;
        ctx.beginPath();
        ctx.moveTo(px, py - size * 0.07);
        ctx.lineTo(px - size * 0.02, py + size * 0.07);
        ctx.stroke();
      }

      // Tail fan.
      ctx.fillStyle = pal.fin;
      ctx.beginPath();
      ctx.moveTo(cx - len * 0.40, cy + size * 0.20 + flick);
      ctx.lineTo(cx - len * 0.58, cy + size * 0.12 + flick);
      ctx.lineTo(cx - len * 0.54, cy + size * 0.24 + flick);
      ctx.lineTo(cx - len * 0.60, cy + size * 0.30 + flick);
      ctx.lineTo(cx - len * 0.38, cy + size * 0.28 + flick);
      ctx.closePath();
      ctx.fill();

      // Rostrum and antennae.
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.36, cy - size * 0.10);
      ctx.lineTo(cx + len * 0.50, cy - size * 0.14);
      ctx.lineTo(cx + len * 0.34, cy - size * 0.02);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = pal.fin;
      ctx.lineWidth = Math.max(0.6, size * 0.009);
      ctx.beginPath();
      ctx.moveTo(cx + len * 0.38, cy - size * 0.10);
      ctx.quadraticCurveTo(cx + len * 0.60, cy - size * 0.20, cx + len * 0.70, cy - size * 0.34);
      ctx.moveTo(cx + len * 0.38, cy - size * 0.06);
      ctx.quadraticCurveTo(cx + len * 0.58, cy - size * 0.10, cx + len * 0.66, cy - size * 0.20);
      ctx.stroke();

      fishEye(ctx, cx + len * 0.28, cy - size * 0.09, size * 0.032, pal);
      break;
    }

    case 'jelly': {
      // A pulsing bell with trailing tentacles.
      const r = size * 0.28;
      const pulse = 1 + Math.sin(t * 2.4) * 0.06;

      // Tentacles first, so the bell overlaps them.
      ctx.strokeStyle = pal.fin;
      ctx.lineWidth = Math.max(0.8, size * 0.012);
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const tx = cx + (i - 2.5) * r * 0.32;
        const sway = Math.sin(t * 2.2 + i * 0.9) * size * 0.05;
        ctx.beginPath();
        ctx.moveTo(tx, cy);
        ctx.quadraticCurveTo(tx + sway, cy + size * 0.22, tx - sway * 0.6, cy + size * 0.44);
        ctx.stroke();
      }

      // Oral arms.
      ctx.strokeStyle = lighten(pal.belly, 0.20);
      ctx.lineWidth = Math.max(1.2, size * 0.022);
      for (let i = 0; i < 2; i++) {
        const sway = Math.sin(t * 1.7 + i * 2.2) * size * 0.04;
        ctx.beginPath();
        ctx.moveTo(cx + (i - 0.5) * r * 0.3, cy + size * 0.02);
        ctx.quadraticCurveTo(cx + sway, cy + size * 0.18, cx + sway * 1.4, cy + size * 0.34);
        ctx.stroke();
      }

      // The bell.
      const g = ctx.createRadialGradient(cx, cy - r * 0.4, r * 0.1, cx, cy, r * 1.3);
      g.addColorStop(0, lighten(pal.body, 0.45));
      g.addColorStop(0.65, pal.body);
      g.addColorStop(1, lighten(pal.body, 0.20));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * pulse, r * 0.85 * pulse, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // A frilly rim.
      ctx.fillStyle = lighten(pal.body, 0.28);
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + (i / 10) * Math.PI;
        const rr = r * pulse * (1 + Math.sin(i * 2.1 + t * 3) * 0.06);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.85;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Inner ribs.
      ctx.strokeStyle = lighten(pal.body, 0.50);
      ctx.lineWidth = Math.max(0.6, size * 0.008);
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(cx + i * r * 0.34, cy);
        ctx.quadraticCurveTo(cx + i * r * 0.42, cy - r * 0.55, cx, cy - r * 0.80);
      }
      ctx.stroke();
      break;
    }

    case 'ray': {
      // A manta ray seen from above. The body runs nose-to-tail along the
      // centreline and the two wings sweep out and back from it, one
      // rolling up as the other rolls down.
      const noseX = size * 0.26;
      const tailX = size * 0.26;
      const flap = Math.sin(t * 2.6);
      // The wings are wide and clearly swept back, so the silhouette
      // reads as a manta rather than a kite.
      const span = size * (0.40 + flap * 0.05);
      const tipX = cx - size * 0.10;

      // The two wings, drawn first so the body overlaps their roots.
      for (const s of [-1, 1]) {
        const lift = span;
        ctx.beginPath();
        // Root at the front of the body.
        ctx.moveTo(cx + noseX * 0.70, cy + s * size * 0.03);
        // Leading edge, sweeping out and back to the tip.
        ctx.bezierCurveTo(
          cx + noseX * 0.55, cy + s * lift * 0.34,
          tipX + size * 0.14, cy + s * lift * 0.80,
          tipX + size * 0.03, cy + s * lift,
        );
        // A short blunt edge at the tip, so it is not a sharp point.
        ctx.lineTo(tipX - size * 0.05, cy + s * lift * 0.96);
        // Trailing edge, strongly concave, back in to the rear of the body.
        ctx.bezierCurveTo(
          cx - size * 0.16, cy + s * lift * 0.46,
          cx - tailX * 0.40, cy + s * size * 0.10,
          cx - tailX * 0.80, cy + s * size * 0.04,
        );
        ctx.closePath();

        const wg = ctx.createLinearGradient(0, cy, 0, cy + s * lift);
        wg.addColorStop(0, pal.body);
        wg.addColorStop(1, s < 0 ? darken(pal.body, 0.26) : darken(pal.body, 0.10));
        ctx.fillStyle = wg;
        ctx.fill();
        ctx.strokeStyle = darken(pal.body, 0.48);
        ctx.lineWidth = Math.max(1, size * 0.013);
        ctx.stroke();
      }

      // The body: a short spindle down the middle.
      const g = ctx.createLinearGradient(0, cy - size * 0.14, 0, cy + size * 0.14);
      g.addColorStop(0, darken(pal.body, 0.30));
      g.addColorStop(0.5, pal.body);
      g.addColorStop(1, darken(pal.body, 0.06));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx - size * 0.02, cy, noseX * 0.90, size * 0.115, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darken(pal.body, 0.48);
      ctx.lineWidth = Math.max(1, size * 0.013);
      ctx.stroke();

      // Spots on the back.
      if (pal.spot) {
        ctx.fillStyle = pal.spot;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(cx - size * 0.02 + (i % 3 - 1) * size * 0.07,
            cy + (i < 3 ? -1 : 1) * size * 0.04, size * 0.014, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Gills, as small slits just behind the head.
      ctx.strokeStyle = darken(pal.body, 0.40);
      ctx.lineWidth = Math.max(0.7, size * 0.010);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const gx = cx + size * 0.06 + i * size * 0.030;
          ctx.beginPath();
          ctx.moveTo(gx, cy + s * size * 0.02);
          ctx.lineTo(gx - size * 0.01, cy + s * size * 0.065);
          ctx.stroke();
        }
      }

      // Cephalic lobes — the two little horns beside the mouth.
      ctx.strokeStyle = darken(pal.body, 0.28);
      ctx.lineWidth = Math.max(1.4, size * 0.026);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + noseX * 0.80, cy - size * 0.03);
      ctx.quadraticCurveTo(cx + noseX * 1.05, cy - size * 0.10, cx + noseX * 0.92, cy - size * 0.19);
      ctx.moveTo(cx + noseX * 0.80, cy + size * 0.04);
      ctx.quadraticCurveTo(cx + noseX * 1.07, cy + size * 0.09, cx + noseX * 0.95, cy + size * 0.18);
      ctx.stroke();

      // A whip tail trailing behind.
      ctx.strokeStyle = pal.fin;
      ctx.lineWidth = Math.max(1, size * 0.016);
      ctx.beginPath();
      ctx.moveTo(cx - tailX * 0.80, cy);
      ctx.quadraticCurveTo(
        cx - tailX * 2.2, cy + size * 0.05 + Math.sin(t * 2) * size * 0.04,
        cx - tailX * 3.2, cy + size * 0.02,
      );
      ctx.stroke();

      fishEye(ctx, cx + noseX * 0.50, cy - size * 0.07, size * 0.026, pal);
      break;
    }

    case 'turtle': {
      // A sea turtle, seen from above.
      const shellL = size * 0.62, shellH = size * 0.34;
      const beat = Math.sin(t * 3.4);

      // Flippers, behind the shell.
      ctx.fillStyle = pal.fin;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + shellL * 0.24, cy + s * shellH * 0.5);
        ctx.rotate(s * (0.5 + beat * 0.35));
        ctx.beginPath();
        ctx.ellipse(shellL * 0.20, 0, shellL * 0.26, size * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Shell.
      const g = ctx.createRadialGradient(
        cx - shellL * 0.10, cy - shellH * 0.40, size * 0.03, cx, cy, shellL * 0.70,
      );
      g.addColorStop(0, lighten(pal.body, 0.30));
      g.addColorStop(0.6, pal.body);
      g.addColorStop(1, darken(pal.body, 0.30));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, shellL * 0.5, shellH * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darken(pal.body, 0.50);
      ctx.lineWidth = Math.max(1, size * 0.014);
      ctx.stroke();

      // Scutes.
      ctx.strokeStyle = darken(pal.body, 0.30);
      ctx.lineWidth = Math.max(0.6, size * 0.009);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(cx + i * shellL * 0.16, cy - shellH * 0.5);
        ctx.lineTo(cx + i * shellL * 0.20, cy + shellH * 0.5);
      }
      ctx.moveTo(cx + shellL * 0.23, cy - shellH * 0.26);
      ctx.ellipse(cx + shellL * 0.06, cy, shellL * 0.17, shellH * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Head.
      ctx.fillStyle = pal.fin;
      ctx.beginPath();
      ctx.ellipse(cx + shellL * 0.48, cy + shellH * 0.06, size * 0.085, size * 0.070, 0, 0, Math.PI * 2);
      ctx.fill();
      fishEye(ctx, cx + shellL * 0.50, cy + shellH * 0.02, size * 0.028, pal);

      // Rear flippers.
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx - shellL * 0.42, cy + s * shellH * 0.40, shellL * 0.16, size * 0.040,
          s * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'whale': {
      // A big, smooth swimmer. The body is a custom silhouette — a blunt
      // head at the front tapering to a narrow tail stock at the back.
      const noseX = size * 0.46;
      const tailX = size * 0.46;
      const back = size * 0.22;   // height of the back above the centreline
      const belly = size * 0.20;  // depth of the belly below it

      // Body silhouette.
      ctx.beginPath();
      ctx.moveTo(cx + noseX, cy + size * 0.02);
      // Top of the head, back along the back.
      ctx.bezierCurveTo(
        cx + noseX * 0.92, cy - back * 0.72,
        cx + noseX * 0.55, cy - back * 0.96,
        cx + noseX * 0.05, cy - back,
      );
      ctx.bezierCurveTo(
        cx - noseX * 0.50, cy - back * 1.02,
        cx - tailX * 0.60, cy - back * 0.42,
        cx - tailX * 0.96, cy - back * 0.20,
      );
      // Around the tail stock.
      ctx.quadraticCurveTo(cx - tailX * 1.06, cy, cx - tailX * 0.96, cy + back * 0.22);
      // Along the belly, forward.
      ctx.bezierCurveTo(
        cx - tailX * 0.60, cy + back * 0.50,
        cx - noseX * 0.50, cy + belly * 1.05,
        cx + noseX * 0.05, cy + belly * 0.95,
      );
      ctx.bezierCurveTo(
        cx + noseX * 0.55, cy + belly * 0.85,
        cx + noseX * 0.90, cy + belly * 0.52,
        cx + noseX, cy + size * 0.02,
      );
      ctx.closePath();

      const g = ctx.createLinearGradient(0, cy - back, 0, cy + belly);
      g.addColorStop(0, darken(pal.body, 0.34));
      g.addColorStop(0.22, darken(pal.body, 0.10));
      g.addColorStop(0.58, pal.body);
      g.addColorStop(0.86, pal.belly);
      g.addColorStop(1, lighten(pal.belly, 0.14));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = darken(pal.body, 0.52);
      ctx.lineWidth = Math.max(1, size * 0.014);
      ctx.stroke();

      // The fluke, drawn over the body so the lobes stay visible. They
      // splay out sideways from the narrow tail stock.
      ctx.save();
      ctx.fillStyle = pal.fin;
      const fl = Math.sin(t * 2.2) * size * 0.05;
      const stockX = cx - tailX * 0.94;
      const tipX = cx - tailX * 1.34;
      ctx.beginPath();
      ctx.moveTo(stockX, cy);
      // Upper lobe: out to the tip and back to the notch.
      ctx.quadraticCurveTo(stockX - size * 0.10, cy - back * 0.80 + fl, tipX, cy - back * 1.45 + fl);
      ctx.quadraticCurveTo(stockX - size * 0.03, cy - back * 0.52 + fl, stockX - size * 0.06, cy + fl);
      // Lower lobe: out to the tip and back to the stock.
      ctx.quadraticCurveTo(stockX - size * 0.03, cy + back * 0.52 + fl, tipX, cy + back * 1.45 + fl);
      ctx.quadraticCurveTo(stockX - size * 0.10, cy + back * 0.80 + fl, stockX, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = darken(pal.body, 0.45);
      ctx.lineWidth = Math.max(0.8, size * 0.012);
      ctx.stroke();
      ctx.restore();

      // Pectoral flipper.
      ctx.fillStyle = pal.fin;
      ctx.beginPath();
      ctx.moveTo(cx + noseX * 0.22, cy + belly * 0.62);
      ctx.quadraticCurveTo(cx + noseX * 0.02, cy + belly * 2.3, cx + noseX * 0.42, cy + belly * 1.8);
      ctx.quadraticCurveTo(cx + noseX * 0.46, cy + belly * 0.86, cx + noseX * 0.22, cy + belly * 0.62);
      ctx.closePath();
      ctx.fill();

      // A small dorsal fin, two thirds of the way back.
      ctx.fillStyle = pal.fin;
      ctx.beginPath();
      ctx.moveTo(cx - noseX * 0.18, cy - back * 0.88);
      ctx.quadraticCurveTo(cx - noseX * 0.28, cy - back * 1.55, cx - noseX * 0.04, cy - back * 0.80);
      ctx.closePath();
      ctx.fill();

      // The long jaw line, from the corner of the mouth back under the chin.
      ctx.strokeStyle = darken(pal.body, 0.60);
      ctx.lineWidth = Math.max(1.4, size * 0.020);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + noseX * 0.96, cy + size * 0.05);
      ctx.quadraticCurveTo(cx + noseX * 0.62, cy + belly * 0.70, cx + noseX * 0.10, cy + belly * 0.62);
      ctx.stroke();

      // Throat pleats.
      ctx.strokeStyle = darken(pal.body, 0.34);
      ctx.lineWidth = Math.max(0.6, size * 0.008);
      for (let i = 0; i < 4; i++) {
        const f = i / 4;
        ctx.beginPath();
        ctx.moveTo(cx + noseX * (0.88 - f * 0.62), cy + size * (0.06 + f * 0.06));
        ctx.quadraticCurveTo(
          cx + noseX * (0.74 - f * 0.62), cy + belly * (0.68 + f * 0.08),
          cx + noseX * (0.08 - f * 0.02), cy + belly * (0.60 + f * 0.08),
        );
        ctx.stroke();
      }

      // Ventral pleats along the belly, the humpback's signature.
      ctx.strokeStyle = lighten(pal.belly, 0.10);
      ctx.lineWidth = Math.max(0.6, size * 0.007);
      for (let i = 0; i < 7; i++) {
        const f = i / 7;
        const px = cx + noseX * (0.30 - f * 0.95);
        ctx.beginPath();
        ctx.moveTo(px, cy + belly * 0.92);
        ctx.lineTo(px + size * 0.02, cy + belly * (0.55 - f * 0.18));
        ctx.stroke();
      }

      // Blowhole.
      ctx.fillStyle = darken(pal.body, 0.60);
      ctx.beginPath();
      ctx.ellipse(cx + noseX * 0.44, cy - back * 0.82, size * 0.016, size * 0.009, 0, 0, Math.PI * 2);
      ctx.fill();

      fishEye(ctx, cx + noseX * 0.72, cy - back * 0.34, size * 0.030, pal);
      break;
    }

    case 'star': {
      const r = size * 0.32;
      const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, lighten(pal.body, 0.25));
      g.addColorStop(1, darken(pal.body, 0.18));
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * Math.PI * 2 - Math.PI / 2 + t * 0.22;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        const ang2 = ang + Math.PI / 5;
        ctx.lineTo(cx + Math.cos(ang2) * r * 0.42, cy + Math.sin(ang2) * r * 0.42);
      }
      ctx.closePath();
      ctx.fill();
      // Bumpy texture.
      ctx.fillStyle = lighten(pal.body, 0.35);
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * Math.PI * 2 - Math.PI / 2 + t * 0.22;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * r * 0.6, cy + Math.sin(ang) * r * 0.6,
          size * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = pal.eye;
      ctx.beginPath();
      ctx.arc(cx - r * 0.22, cy - r * 0.08, size * 0.026, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + r * 0.22, cy - r * 0.08, size * 0.026, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'boot': {
      // An old shoe.
      const w = size * 0.42, h = size * 0.44;
      const x = cx - w * 0.45, y = cy - h * 0.5;
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.22, y);
      ctx.lineTo(x + w * 0.78, y);
      ctx.quadraticCurveTo(x + w * 0.92, y + h * 0.55, x + w * 0.86, y + h * 0.74);
      ctx.lineTo(x + w * 0.14, y + h * 0.74);
      ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.5, x + w * 0.22, y);
      ctx.closePath();
      ctx.fill();
      // Sole.
      ctx.fillStyle = pal.fin;
      roundRect(ctx, x - w * 0.02, y + h * 0.72, w * 1.0, h * 0.16, h * 0.05, pal.fin);
      // Opening + laces.
      ctx.fillStyle = darken(pal.body, 0.4);
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.04, y + h * 0.10, w * 0.20, h * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8d8b0';
      ctx.lineWidth = Math.max(1, size * 0.016);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.30, y + h * 0.26); ctx.lineTo(x + w * 0.62, y + h * 0.32);
      ctx.moveTo(x + w * 0.30, y + h * 0.40); ctx.lineTo(x + w * 0.62, y + h * 0.46);
      ctx.stroke();
      fishEye(ctx, x + w * 0.40, y + h * 0.58, size * 0.035, pal);
      break;
    }

    case 'bottle': {
      const w = size * 0.24, h = size * 0.46;
      const x = cx - w / 2, y = cy - h / 2;
      ctx.fillStyle = pal.body;
      roundRect(ctx, x, y + h * 0.24, w, h * 0.76, w * 0.14, pal.body);
      roundRect(ctx, x + w * 0.26, y, w * 0.48, h * 0.30, w * 0.10, pal.body);
      // Paper label.
      ctx.fillStyle = pal.belly;
      roundRect(ctx, x + w * 0.06, y + h * 0.44, w * 0.88, h * 0.30, w * 0.06, pal.belly);
      ctx.strokeStyle = 'rgba(90,70,50,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.18, y + h * 0.52); ctx.lineTo(x + w * 0.82, y + h * 0.52);
      ctx.moveTo(x + w * 0.18, y + h * 0.60); ctx.lineTo(x + w * 0.70, y + h * 0.60);
      ctx.stroke();
      // Glass highlight.
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x + w * 0.16, y + h * 0.30, w * 0.10, h * 0.60);
      break;
    }

    case 'seat': {
      // A golden toilet seat.
      const w = size * 0.46, h = size * 0.26;
      const x = cx - w / 2, y = cy - h / 2;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, lighten(pal.body, 0.3));
      g.addColorStop(1, darken(pal.body, 0.15));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, y + h * 0.5, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.belly;
      ctx.beginPath();
      ctx.ellipse(cx, y + h * 0.5, w * 0.34, h * 0.30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.fin;
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.beginPath();
      ctx.ellipse(cx, y + h * 0.5, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'note':
    default: {
      // A soggy note / banana-ish blob.
      const w = size * 0.34, h = size * 0.34;
      const x = cx - w / 2, y = cy - h / 2;
      ctx.fillStyle = pal.body;
      roundRect(ctx, x, y, w, h, w * 0.18, pal.body);
      ctx.fillStyle = pal.belly;
      roundRect(ctx, x + w * 0.14, y + h * 0.18, w * 0.5, h * 0.3, w * 0.06, pal.belly);
      ctx.fillStyle = pal.fin;
      ctx.fillRect(x + w * 0.14, y + h * 0.68, w * 0.6, h * 0.08);
      fishEye(ctx, x + w * 0.34, y + h * 0.36, size * 0.03, pal);
      fishEye(ctx, x + w * 0.66, y + h * 0.36, size * 0.03, pal);
      break;
    }
  }

  ctx.restore();
}

/**
 * Visual bounds of each archetype, as a fraction of the drawn size.
 * Used to fit portraits into fixed boxes.
 */
export const FISH_ICON_H = {
  slim: 0.32,
  round: 0.60,
  flat: 0.44,
  blob: 0.60,
  eel: 0.30,
  shark: 0.42,
  squid: 0.80,
  crab: 0.60,
  star: 0.64,
  lobster: 0.62,
  shrimp: 0.58,
  jelly: 0.72,
  ray: 0.66,
  turtle: 0.56,
  whale: 0.44,
  boot: 0.48,
  bottle: 0.50,
  seat: 0.32,
  note: 0.36,
};

/**
 * Where each archetype's snout sits, as a fraction of the drawn `size`.
 *
 * `x` is measured forwards from the fish's centre (the direction it faces
 * when unmirrored) and `y` downwards from its centre line. The fishing
 * leader has to terminate here, or it ends up running through the fish.
 */
export const FISH_SNOUT = {
  slim:  { x: 0.378, y: 0.048 },   // mouth at len*0.44, len = size*0.86
  round: { x: 0.264, y: 0.108 },   // mouth at len*0.40, len = size*0.66
  flat:  { x: 0.328, y: 0.062 },   // mouth at len*0.42, len = size*0.78
  blob:  { x: 0.198, y: 0.090 },   // mouth at len*0.32, len = size*0.62
  eel:   { x: 0.440, y: 0.000 },   // head centre at len*0.44, len = size*0.9
  shark: { x: 0.399, y: 0.056 },   // jaw tip at len*0.42, len = size*0.95
  squid: { x: 0.150, y: -0.060 },  // mantle tip
  crab:  { x: 0.110, y: 0.150 },   // mouth under the shell
  lobster:{ x: 0.290, y: 0.000 },  // the rostrum
  shrimp:{ x: 0.310, y: -0.080 },  // the rostrum tip
  jelly: { x: 0.000, y: -0.280 },  // the top of the bell
  ray:   { x: 0.180, y: 0.000 },   // between the cephalic lobes
  turtle:{ x: 0.340, y: 0.020 },   // the head
  whale: { x: 0.404, y: 0.078 },   // the corner of the mouth
  star:  { x: 0.100, y: 0.000 },
  boot:  { x: 0.200, y: 0.000 },   // the toe
  bottle:{ x: 0.120, y: 0.000 },   // the neck
  seat:  { x: 0.230, y: 0.000 },
  note:  { x: 0.150, y: 0.000 },
};

/**
 * The aspect ratio (width / height) of each archetype's silhouette.
 */
export const FISH_ASPECT = {
  slim: 3.2,
  round: 1.1,
  flat: 2.6,
  blob: 1.15,
  eel: 4.4,
  shark: 2.8,
  squid: 0.7,
  crab: 1.9,
  lobster: 2.1,
  shrimp: 2.0,
  jelly: 0.9,
  ray: 1.5,
  turtle: 1.5,
  whale: 2.6,
  star: 1.0,
  boot: 1.0,
  bottle: 0.6,
  seat: 1.8,
  note: 1.0,
};

/**
 * Draw a fish fitted into a box of the given height, centred horizontally.
 */
export function drawFishFitted(ctx, fish, cx, cy, boxH, t = 0) {
  const aspect = FISH_ASPECT[fish.archetype] || 1.6;
  const size = Math.min(boxH / 0.7, (boxH * aspect) / 1.2);
  drawFish(ctx, fish, cx, cy, t, size);
}

/**
 * Draw a fish as a large portrait, centred on (cx, cy) and scaled to fill
 * the given target box.
 */
export function drawFishPortrait(ctx, fish, cx, cy, t = 0, targetW = 150, targetH = 90) {
  const aspect = FISH_ASPECT[fish.archetype] || 1.6;
  const size = Math.min(targetH / 0.72, targetW / aspect);
  drawFish(ctx, fish, cx, cy, t, size);
}

/**
 * Draw a fish scaled up by an integer factor, for portraits.
 */
export function drawFishScaled(ctx, fish, x, y, t = 0, scale = 2) {
  drawFish(ctx, fish, x, y, t, 32 * scale);
}

// ------------------------------------------------------------------ fisherman

/**
 * The angler. `frame` selects the animation pose:
 *   0 idle, 1 cast (rod forward), 2 pull (rod bent), 3 celebrate.
 */
export function drawFisherman(ctx, x, y, frame = 0, scale = 1) {
  const bob = frame === 1 ? Math.sin(performance.now() / 200) * 1 : 0;
  const H = 56;   // nominal height of the figure

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(scale, scale);

  // Legs — dark work trousers.
  ctx.fillStyle = '#2f3a4d';
  roundRect(ctx, -5, H - 22, 9, 22, 3, '#2f3a4d');
  roundRect(ctx, 5, H - 22, 9, 22, 3, '#2f3a4d');
  // Boots.
  ctx.fillStyle = '#1f2733';
  roundRect(ctx, -7, H - 8, 13, 7, 3, '#1f2733');
  roundRect(ctx, 3, H - 8, 13, 7, 3, '#1f2733');

  // Shirt — the classic hi-vis red of an offshore worker.
  const g = ctx.createLinearGradient(0, H - 50, 0, H - 18);
  g.addColorStop(0, '#e8503a');
  g.addColorStop(0.55, '#cf3520');
  g.addColorStop(1, '#9c2113');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-11, H - 18);
  ctx.quadraticCurveTo(-13, H - 42, -7, H - 48);
  ctx.lineTo(7, H - 48);
  ctx.quadraticCurveTo(13, H - 42, 11, H - 18);
  ctx.closePath();
  ctx.fill();
  // A bright shoulder highlight so the figure reads against the water.
  ctx.fillStyle = 'rgba(255,150,120,0.5)';
  ctx.beginPath();
  ctx.moveTo(-8, H - 47);
  ctx.lineTo(7, H - 47);
  ctx.quadraticCurveTo(12, H - 41, 11, H - 34);
  ctx.quadraticCurveTo(0, H - 40, -10, H - 34);
  ctx.closePath();
  ctx.fill();
  // Reflective band across the chest.
  ctx.fillStyle = 'rgba(240,244,250,0.72)';
  ctx.fillRect(-11, H - 33, 22, 3);
  ctx.fillStyle = 'rgba(240,244,250,0.42)';
  ctx.fillRect(-11, H - 27, 22, 2);

  // Arms — the forward arm holds the rod.
  ctx.strokeStyle = '#b8301c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, H - 44);
  ctx.lineTo(-13, H - 32);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, H - 44);
  const handX = frame === 1 ? 16 : 13;
  const handY = frame === 2 ? H - 40 : H - 44;
  ctx.lineTo(handX, handY);
  ctx.stroke();
  // Hands.
  ctx.fillStyle = '#f6d9ac';
  ctx.beginPath();
  ctx.arc(-13, H - 32, 2.6, 0, Math.PI * 2);
  ctx.arc(handX, handY, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Neck + head.
  ctx.fillStyle = '#fdf3d8';
  roundRect(ctx, -3, H - 52, 7, 6, 2, '#fdf3d8');
  ctx.fillStyle = '#f6d9ac';
  ctx.beginPath();
  ctx.arc(0, H - 57, 8.5, 0, Math.PI * 2);
  ctx.fill();
  // Face.
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(4.5, H - 58, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(3, H - 53, 4, 1);

  // Hard hat, in the same red as the shirt.
  const hatY = H - 66;
  ctx.fillStyle = '#c22f1c';
  ctx.beginPath();
  ctx.ellipse(0, hatY + 4, 16, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8503a';
  ctx.beginPath();
  ctx.ellipse(0, hatY, 8.5, 7, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ff8a6a';
  ctx.beginPath();
  ctx.ellipse(-3, hatY - 2, 4, 3, -0.3, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#9c2113';
  ctx.fillRect(-8, hatY, 16, 2.5);

  ctx.restore();
}

// ----------------------------------------------------------------------- rod

/**
 * A fishing rod. `bend` in 0..1 bows the tip down (when a fish is on).
 */
export function drawRod(ctx, x, y, len, bend = 0, color = '#6b4a34') {
  const rise = len * 0.85;

  ctx.save();
  ctx.lineCap = 'round';

  // Blank.
  ctx.strokeStyle = '#5d3a1a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + len * 0.6, y - rise * 0.9, x + len * 1.5, y - rise + bend * 26);
  ctx.stroke();
  ctx.strokeStyle = '#a87c52';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 1);
  ctx.quadraticCurveTo(x + len * 0.6, y - rise * 0.9 - 1, x + len * 1.5, y - rise - 1 + bend * 26);
  ctx.stroke();

  // Cork handle.
  ctx.strokeStyle = '#c9924c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 8);
  ctx.lineTo(x + 1, y - 1);
  ctx.stroke();

  // Reel.
  ctx.fillStyle = '#5f7fb5';
  ctx.beginPath();
  ctx.arc(x + 4, y + 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath();
  ctx.arc(x + 4, y + 4, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// --------------------------------------------------------------------- rig

/**
 * Geometry of the offshore rig, in rig units.
 *
 * The deck surface sits at local y = 0: the legs run down into the water
 * below it and the derrick towers above. Exported so the scene can anchor
 * the angler and the rod to exactly the numbers the sprite draws with.
 */
export const RIG = {
  deckHalfW: 92,
  deckH: 13,
  legH: 98,
  legFront: 66,
  legBack: 34,
  legW: 9,
  derrickX: -16,
  derrickH: 124,
  derrickBase: 19,
  derrickTop: 8,
  heliX: -62,
  heliR: 25,
  tankX: 62,
  anglerX: 34,
  // The angler's feet land 55 units above his origin, and his hands are
  // 13 units to the right of it — the scene needs both to place him.
  footDrop: 55,
  handX: 13,
  handDrop: 43,
};

/**
 * Rig materials: weathered timber at level 0, steel from level 1 up.
 */
function rigMaterials(level) {
  if (level >= 1) {
    return {
      leg: '#79838f', legHi: '#b6c0cb', legDark: '#3f464f',
      deck: '#68717d', deckHi: '#9aa5b1', deckDark: '#343a42',
      brace: '#5b636e', tank: '#8a939e', tankHi: '#c0c9d4',
    };
  }
  return {
    leg: '#8b5a2b', legHi: '#c9924c', legDark: '#4a2e15',
    deck: '#a9713a', deckHi: '#d29a55', deckDark: '#54341a',
    brace: '#6b4a34', tank: '#9c7040', tankHi: '#d3a468',
  };
}

/**
 * One vertical lattice leg of the rig — two rails with X bracing between.
 */
function drawRigLeg(ctx, x, top, height, w, mat, dim) {
  const rail = dim ? mat.legDark : mat.leg;
  const railHi = dim ? mat.leg : mat.legHi;
  const brace = dim ? mat.legDark : mat.brace;

  ctx.lineCap = 'round';

  // X bracing between the rails.
  ctx.strokeStyle = brace;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const seg = 15;
  for (let i = 0; i * seg < height; i++) {
    const y0 = top + i * seg;
    const y1 = Math.min(top + height, y0 + seg);
    ctx.moveTo(x - w / 2, y0);
    ctx.lineTo(x + w / 2, y1);
    ctx.moveTo(x + w / 2, y0);
    ctx.lineTo(x - w / 2, y1);
  }
  ctx.stroke();

  // The rails themselves.
  ctx.strokeStyle = rail;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top);
  ctx.lineTo(x - w / 2, top + height);
  ctx.moveTo(x + w / 2, top);
  ctx.lineTo(x + w / 2, top + height);
  ctx.stroke();

  // A catch-light down the left rail.
  ctx.strokeStyle = railHi;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 1.2, top);
  ctx.lineTo(x - w / 2 - 1.2, top + height);
  ctx.stroke();
}

/**
 * The deck plate the angler stands on.
 */
function drawRigDeck(ctx, halfW, deckH, mat) {
  // Under-deck beams.
  ctx.fillStyle = mat.deckDark;
  ctx.fillRect(-halfW, deckH - 4, halfW * 2, 4);

  // The plate.
  const g = ctx.createLinearGradient(0, 0, 0, deckH);
  g.addColorStop(0, mat.deckHi);
  g.addColorStop(0.45, mat.deck);
  g.addColorStop(1, mat.deckDark);
  ctx.fillStyle = g;
  ctx.fillRect(-halfW, 0, halfW * 2, deckH);

  // Grating.
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -halfW + 8; x < halfW; x += 12) {
    ctx.moveTo(x, 1.5);
    ctx.lineTo(x, deckH - 1.5);
  }
  ctx.stroke();

  // A bright lip along the front edge.
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.fillRect(-halfW, 0, halfW * 2, 1.5);
}

/**
 * The derrick: a tapering lattice tower standing on the deck.
 */
function drawDerrick(ctx, cx, baseY, height, baseHalf, topHalf, mat) {
  const rungs = 9;

  ctx.strokeStyle = mat.brace;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= rungs; i++) {
    const k = i / rungs;
    const y = baseY - height * k;
    const half = baseHalf + (topHalf - baseHalf) * k;
    ctx.moveTo(cx - half, y);
    ctx.lineTo(cx + half, y);
    if (i < rungs) {
      const k2 = (i + 1) / rungs;
      const y2 = baseY - height * k2;
      const half2 = baseHalf + (topHalf - baseHalf) * k2;
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half2, y2);
      ctx.moveTo(cx + half, y);
      ctx.lineTo(cx - half2, y2);
    }
  }
  ctx.stroke();

  // The two main rails.
  ctx.strokeStyle = mat.leg;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - baseHalf, baseY);
  ctx.lineTo(cx - topHalf, baseY - height);
  ctx.moveTo(cx + baseHalf, baseY);
  ctx.lineTo(cx + topHalf, baseY - height);
  ctx.stroke();

  ctx.strokeStyle = mat.legHi;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - baseHalf - 1.4, baseY);
  ctx.lineTo(cx - topHalf - 1.4, baseY - height);
  ctx.stroke();
}

/**
 * A cantilevered helideck, on the rigs big enough to have one.
 */
function drawHelideck(ctx, cx, cy, r, mat) {
  // The arm reaching back to the platform.
  ctx.strokeStyle = mat.brace;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + r - 2, cy + 3);
  ctx.lineTo(cx + r + 30, cy + 3);
  ctx.stroke();

  // The pad.
  ctx.fillStyle = mat.deckDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f3a45';
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.fill();

  // The landing circle and the H.
  ctx.strokeStyle = '#e8eef5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 8); ctx.lineTo(cx - 6, cy + 8);
  ctx.moveTo(cx + 6, cy - 8); ctx.lineTo(cx + 6, cy + 8);
  ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
  ctx.stroke();
}

/**
 * A pair of storage tanks on the deck.
 */
function drawTanks(ctx, x, y, mat) {
  for (let i = 0; i < 2; i++) {
    const tx = x + i * 21;
    ctx.fillStyle = mat.tank;
    roundRect(ctx, tx - 9, y - 21, 18, 21, 4, mat.tank);
    ctx.fillStyle = mat.tankHi;
    ctx.fillRect(tx - 7, y - 19, 4, 17);
    ctx.fillStyle = mat.deckDark;
    ctx.fillRect(tx - 9, y - 22, 18, 2);
    ctx.fillStyle = mat.deckDark;
    ctx.fillRect(tx - 9, y - 3, 18, 3);
  }
}

/**
 * The offshore rig the angler fishes from.
 *
 * (x, y) is the middle of the deck surface. The rig grows a little with
 * every upgrade: timber at level 0, then steel, a helideck, and finally a
 * flare boom burning at the end of the derrick.
 *
 * @param {number} level  the rig upgrade level
 * @param {number} t      elapsed time, for the blinking lights
 */
export function drawOilRig(ctx, x, y, level = 0, t = 0) {
  const s = 1 + level * 0.13;
  const mat = rigMaterials(level);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  const halfW = RIG.deckHalfW;
  const legTop = RIG.deckH;
  const legBot = RIG.legH;

  // ---- Back legs: further away, so they sit higher and read darker.
  for (const lx of [-RIG.legBack, RIG.legBack]) {
    drawRigLeg(ctx, lx, legTop, legBot - 20, RIG.legW, mat, true);
  }
  ctx.strokeStyle = mat.legDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-RIG.legBack, legTop);
  ctx.lineTo(RIG.legBack, legBot - 20);
  ctx.moveTo(RIG.legBack, legTop);
  ctx.lineTo(-RIG.legBack, legBot - 20);
  ctx.stroke();

  // ---- Front legs.
  for (const lx of [-RIG.legFront, RIG.legFront]) {
    drawRigLeg(ctx, lx, legTop, legBot, RIG.legW, mat, false);
  }

  // ---- Bracing across the front legs: one big X plus two ties.
  ctx.strokeStyle = mat.brace;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-RIG.legFront, legTop);
  ctx.lineTo(RIG.legFront, legBot);
  ctx.moveTo(RIG.legFront, legTop);
  ctx.lineTo(-RIG.legFront, legBot);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const k of [0.34, 0.68]) {
    const y = legTop + (legBot - legTop) * k;
    ctx.moveTo(-RIG.legFront, y);
    ctx.lineTo(RIG.legFront, y);
  }
  ctx.stroke();

  // ---- Deck.
  drawRigDeck(ctx, halfW, RIG.deckH, mat);

  // ---- Deck furniture.
  if (level >= 2) drawHelideck(ctx, RIG.heliX, -2, RIG.heliR, mat);
  drawTanks(ctx, RIG.tankX, 0, mat);

  // ---- Derrick.
  drawDerrick(ctx, RIG.derrickX, -2, RIG.derrickH, RIG.derrickBase, RIG.derrickTop, mat);

  // Crown block on top of the derrick.
  const topY = -2 - RIG.derrickH;
  ctx.fillStyle = mat.deckDark;
  roundRect(ctx, RIG.derrickX - RIG.derrickTop - 5, topY - 11,
    (RIG.derrickTop + 5) * 2, 11, 3, mat.deckDark);
  ctx.fillStyle = mat.tank;
  ctx.fillRect(RIG.derrickX - RIG.derrickTop - 5, topY - 11,
    (RIG.derrickTop + 5) * 2, 3);

  // The aviation warning light.
  const blink = Math.sin(t * 3.2) > 0;
  ctx.fillStyle = blink ? '#ff5a4a' : '#8c2a22';
  ctx.beginPath();
  ctx.arc(RIG.derrickX, topY - 15, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (blink) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#ff8a7a';
    ctx.beginPath();
    ctx.arc(RIG.derrickX, topY - 15, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- Flare boom, on the biggest rigs.
  if (level >= 4) {
    const bx = RIG.derrickX - 44;
    const by = -RIG.derrickH * 0.74;
    ctx.strokeStyle = mat.leg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(RIG.derrickX - 6, topY + 16);
    ctx.lineTo(bx, by);
    ctx.stroke();

    const flick = 0.7 + Math.sin(t * 9) * 0.3;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.ellipse(bx, by - 7 * flick, 5, 10 * flick, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.ellipse(bx, by - 4 * flick, 2.4, 5 * flick, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ------------------------------------------------------------------ scenery

export function drawCloud(ctx, x, y, w = 34) {
  const h = w * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + h * 0.5, h * 0.55, h * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.55, y + h * 0.38, h * 0.5, h * 0.46, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.78, y + h * 0.55, h * 0.42, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBird(ctx, x, y, t = 0) {
  const flap = Math.sin(t * 8) > 0 ? 1 : -1;
  ctx.strokeStyle = 'rgba(40,58,82,0.85)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 4, y - 3 * flap, x + 8, y);
  ctx.stroke();
}

export function drawTree(ctx, x, y, s = 1) {
  ctx.fillStyle = '#6b4a2c';
  roundRect(ctx, x + 6 * s, y + 14 * s, 5 * s, 14 * s, 2 * s, '#6b4a2c');
  ctx.fillStyle = '#3f8f4a';
  ctx.beginPath();
  ctx.arc(x + 8.5 * s, y + 10 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4fa85a';
  ctx.beginPath();
  ctx.arc(x + 6 * s, y + 7 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRock(ctx, x, y, size = 12) {
  ctx.fillStyle = '#7a8290';
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x + size * 0.2, y + size * 0.2);
  ctx.lineTo(x + size * 0.6, y);
  ctx.lineTo(x + size, y + size * 0.45);
  ctx.lineTo(x + size * 0.85, y + size);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9aa3b2';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.2);
  ctx.lineTo(x + size * 0.6, y);
  ctx.lineTo(x + size * 0.75, y + size * 0.35);
  ctx.closePath();
  ctx.fill();
}

export function drawCoral(ctx, x, y, color = '#e07a9a') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 12);
  ctx.lineTo(x + 4, y + 4);
  ctx.moveTo(x + 4, y + 8);
  ctx.lineTo(x, y + 2);
  ctx.moveTo(x + 4, y + 6);
  ctx.lineTo(x + 9, y);
  ctx.stroke();
}

export function drawSeaweed(ctx, x, y, h = 16, color = '#2f7a4a') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 1; i <= 4; i++) {
    ctx.quadraticCurveTo(
      x + Math.sin(i * 1.7) * 4, y - (h * i) / 4 - 1,
      x + Math.sin(i * 1.2) * 3, y - (h * i) / 4,
    );
  }
  ctx.stroke();
}

/**
 * A fishing bobber floating on the water.
 */
export function drawBobber(ctx, x, y, t = 0, submerged = false) {
  const bob = Math.sin(t * 3) * 1.5;
  const yy = y + bob;
  if (submerged) {
    ctx.fillStyle = 'rgba(232,244,255,0.75)';
    ctx.beginPath();
    ctx.arc(x - 2, yy, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 3, yy - 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Stem.
  ctx.strokeStyle = '#fdf3d8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 2, yy - 8);
  ctx.lineTo(x + 2, yy);
  ctx.stroke();
  // Body.
  const g = ctx.createLinearGradient(x, yy, x, yy + 9);
  g.addColorStop(0, '#ff7a5e');
  g.addColorStop(1, '#e4573d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x + 2, yy + 4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdf3d8';
  ctx.beginPath();
  ctx.arc(x + 2, yy + 0.5, 4.5, Math.PI, 0);
  ctx.fill();
}

/**
 * A sparkle used for legendary / rare reveals.
 */
export function drawSparkle(ctx, x, y, t = 0, color = '#fff0b8') {
  const s = Math.sin(t * 6);
  if (s < 0.2) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (s - 0.2) / 0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 7);
  ctx.quadraticCurveTo(x + 1.5, y - 1.5, x + 7, y);
  ctx.quadraticCurveTo(x + 1.5, y + 1.5, x, y + 7);
  ctx.quadraticCurveTo(x - 1.5, y + 1.5, x - 7, y);
  ctx.quadraticCurveTo(x - 1.5, y - 1.5, x, y - 7);
  ctx.fill();
  ctx.restore();
}

/**
 * A message bubble (used for the joke text and hints).
 */
export function drawBubble(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(253,243,216,0.95)';
  roundRect(ctx, x, y, w, h, 10, 'rgba(253,243,216,0.95)');
}

/**
 * A filled circle.
 */
export function drawCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}
