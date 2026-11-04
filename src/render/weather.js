/**
 * Weather.
 *
 * The scene draws the location's own colours; this module layers the
 * weather on top of them — precipitation, mist, lightning, and the dimming
 * that bad weather puts over everything.
 *
 * The weather of a visit is chosen from a seed, so the same visit always
 * has the same weather, but different visits get different ones.
 */

import { WEATHER_BY_ID, LOCATION_WEATHER } from '../game/content.js';
import { W, H } from '../engine/view.js';
import { clamp } from '../engine/gfx.js';

/**
 * The weather of a location.
 *
 * Each location has a fixed weather, so the world is different from place
 * to place. The Abyss is always a thunderstorm.
 */
export function weatherFor(locId) {
  const id = LOCATION_WEATHER[locId] || 'clear';
  return WEATHER_BY_ID[id] || WEATHER_BY_ID.clear;
}

/**
 * A running weather state: the current weather, how long it has been
 * running, and the particles it has spawned.
 */
export class Weather {
  constructor() {
    this.current = WEATHER_BY_ID.clear;
    this.timer = 0;
    this.particles = [];
    this.flash = 0;
    this.nextStrike = 0;
    this.rainRipples = [];
  }

  /**
   * Start a location with its own weather.
   */
  enter(locId) {
    this.current = weatherFor(locId);
    this.timer = 0;
    this.particles = [];
    this.rainRipples = [];
    this.flash = 0;
    this.nextStrike = 1.5 + Math.random() * 4;
  }

  /**
   * Advance the weather clock.
   */
  update(dt) {
    this.timer += dt;

    // Lightning.
    if (this.current.lightning) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        this.flash = 1;
        this.nextStrike = 2.5 + Math.random() * 7;
      }
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3.2);
    }

    this.updateParticles(dt);
  }

  /**
   * Move the precipitation and recycle the particles that fall off screen.
   */
  updateParticles(dt) {
    const p = this.current.precip;
    if (!p) {
      this.particles.length = 0;
      this.rainRipples.length = 0;
      return;
    }

    const want = p.count;
    while (this.particles.length < want) {
      this.particles.push(this.spawnParticle(p, true));
    }
    if (this.particles.length > want) {
      this.particles.length = want;
    }

    // The waterline. Raindrops that fall past it land on the water.
    const waterY = H * 0.474;

    const drift = p.kind === 'snow' ? Math.sin(this.timer * 1.3) * 14 : 0;
    for (const q of this.particles) {
      q.y += p.speed * dt;
      q.x += p.slant * p.speed * dt + drift * dt;
      if (q.y > waterY && p.kind === 'rain') {
        // The drop hits the water: make a ripple and start it again.
        if (this.rainRipples.length < 50) {
          this.rainRipples.push({ x: q.x, y: waterY, t: 0 });
        }
        this.spawnInto(q, p);
      } else if (q.y > H + 20) {
        this.spawnInto(q, p);
      } else if (q.x > W + 30) {
        q.x = -20;
      }
    }

    for (let i = this.rainRipples.length - 1; i >= 0; i--) {
      const r = this.rainRipples[i];
      r.t += dt;
      if (r.t > 0.7) this.rainRipples.splice(i, 1);
    }
  }

  spawnParticle(p, anywhere) {
    const q = { x: 0, y: 0, r: 1.4 };
    this.spawnInto(q, p, anywhere);
    return q;
  }

  spawnInto(q, p, anywhere = false) {
    q.x = Math.random() * (W + 120) - 60;
    q.y = anywhere ? Math.random() * H : -20 - Math.random() * 60;
    if (p.kind === 'snow') {
      // Fat, slow flakes of varying size.
      q.r = 1.4 + Math.random() * 2.6;
      q.sway = Math.random() * 6.28;
    } else {
      q.r = 1 + Math.random() * 0.8;
      q.len = 7 + Math.random() * 9;
    }
  }

  // ------------------------------------------------------------- rendering

  /**
   * The weather's tint over the location's sky.
   */
  tintSky(ctx, loc) {
    const [r, g, b] = this.current.skyTint;
    const top = tintHex(loc.sky[0], r, g, b);
    const bottom = tintHex(loc.sky[1], r, g, b);
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    return grad;
  }

  /**
   * Draw the storm cloud bank.
   *
   * A connected bank of cloud across the top of the sky, not a row of
   * separate discs — it has to read as overcast, not as flying saucers.
   */
  drawStormClouds(ctx, t) {
    const w = this.current;
    if (!w.precip && w.id !== 'storm') return;

    const stormy = w.id === 'storm';

    ctx.save();

    if (stormy) {
      // A thunderstorm swallows the sky: several stacked banks of cloud
      // running all the way down to the horizon, the nearest ones darkest.
      const horizon = H * 0.474;
      const layers = [
        { top: -40, depth: 150, step: 190, bottom: horizon, color: '#1b2440', speed: 16, alpha: 1 },
        { top: -10, depth: 170, step: 230, bottom: horizon, color: '#141c30', speed: 26, alpha: 1 },
        { top: 30, depth: 190, step: 260, bottom: horizon, color: '#0f1626', speed: 38, alpha: 0.96 },
        { top: 90, depth: 200, step: 300, bottom: horizon, color: '#0b111e', speed: 52, alpha: 0.92 },
      ];
      for (const L of layers) {
        this.cloudBank(ctx, t, L.top, L.depth, L.step, L.color, L.speed, L.alpha, L.bottom);
      }
      // A bruised glow where the light gets through.
      const g = ctx.createLinearGradient(0, H * 0.1, 0, horizon);
      g.addColorStop(0, 'rgba(120,150,210,0.12)');
      g.addColorStop(1, 'rgba(120,150,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, H * 0.1, W, horizon - H * 0.1);
    } else {
      // The other weathers get one modest bank near the top of the sky.
      this.cloudBank(ctx, t, H * 0.02, 34, 110, '#6f7a8c', 14, 1, H * 0.075, '#8d97a8');
    }

    ctx.restore();
  }

  /**
   * One connected bank of cloud.
   *
   * The bank is a ribbon with a rolling top and a rolling underside, so it
   * reads as cloud rather than as a row of discs or a flat curtain. Its
   * depth is what makes an overcast sky feel like it goes all the way down.
   */
  cloudBank(ctx, t, topY, depth, step, color, speed, alpha, bottomY, highlightColor = null) {
    const drift = t * speed;
    const n = Math.ceil((W + 200) / step);
    const off = drift % step;

    // A rolling edge: a wave along the bank, drifting slowly sideways.
    const wave = (i, k) =>
      Math.sin(i * 1.7 + t * 0.4) * depth * 0.3 + Math.sin(i * 0.6 + k) * depth * 0.22;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (highlightColor) {
      // A lighter band along the top of the bank, catching what light there is.
      ctx.fillStyle = highlightColor;
      ctx.beginPath();
      ctx.moveTo(-100, topY + depth * 0.55);
      for (let i = 0; i <= n; i++) {
        const x = -100 + i * step + off;
        ctx.quadraticCurveTo(x + step * 0.5, topY + wave(i, 0) * 0.6 - depth * 0.45, x + step, topY + wave(i, 0) * 0.6 + depth * 0.2);
      }
      ctx.lineTo(W + 100, topY + depth);
      ctx.lineTo(-100, topY + depth);
      ctx.closePath();
      ctx.fill();
    }

    // The body of the bank: rolling underside, rolling top.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-100, bottomY);
    for (let i = 0; i <= n; i++) {
      const x = -100 + i * step + off;
      const y = bottomY + wave(i, 0.4);
      ctx.quadraticCurveTo(x + step * 0.5, y + depth * 0.18, x + step, y);
    }
    ctx.lineTo(W + 100, topY + depth * 0.6);
    for (let i = n; i >= 0; i--) {
      const x = -100 + i * step + off;
      const y = topY + wave(i, 1.2);
      ctx.quadraticCurveTo(x + step * 0.5, y - depth * 0.55, x + step, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw the lightning flash over the whole sky.
   */
  drawLightning(ctx) {
    if (this.flash <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = this.flash * 0.55;
    ctx.fillStyle = '#dce8ff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /**
   * Draw the precipitation.
   */
  drawPrecipitation(ctx) {
    const p = this.current.precip;
    if (!p) return;

    ctx.save();
    if (p.kind === 'rain') {
      ctx.strokeStyle = 'rgba(190,214,240,0.55)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const q of this.particles) {
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - p.slant * q.len, q.y + q.len);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const q of this.particles) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * Draw the ripples where raindrops hit the water.
   */
  drawRipples(ctx, shoreY) {
    if (this.current.precip?.kind !== 'rain') return;
    ctx.save();
    ctx.strokeStyle = 'rgba(220,240,255,0.5)';
    ctx.lineWidth = 1;
    for (const r of this.rainRipples) {
      const k = r.t / 0.7;
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 2 + k * 9, (2 + k * 9) * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draw the mist.
   *
   * Two bands of fog — one just above the water and one over everything —
   * so the rig and the horizon both fade out.
   */
  drawFog(ctx, shoreY, t) {
    const f = this.current.fog;
    if (f <= 0) return;

    ctx.save();

    // A thick band sitting on the water.
    const band = ctx.createLinearGradient(0, shoreY - 70, 0, shoreY + 60);
    band.addColorStop(0, 'rgba(226,236,246,0)');
    band.addColorStop(0.5, `rgba(226,236,246,${f * 0.85})`);
    band.addColorStop(1, `rgba(226,236,246,${f * 0.5})`);
    ctx.fillStyle = band;
    ctx.fillRect(0, shoreY - 70, W, 130);

    // Drifting banks, so the fog moves.
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 340 + t * 14) % (W + 400)) - 200;
      const cy = shoreY - 30 + Math.sin(i * 1.7 + t * 0.3) * 22;
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 190);
      g.addColorStop(0, `rgba(232,240,250,${f * 0.55})`);
      g.addColorStop(1, 'rgba(232,240,250,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 190, 46, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // A veil over the whole scene.
    ctx.fillStyle = `rgba(220,232,244,${f * 0.42})`;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  /**
   * A dim over the whole scene, for the weather that is not sunny.
   */
  drawDim(ctx) {
    const d = this.current.dim;
    if (d <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(16,28,48,${d})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/**
 * Multiply a hex colour by a tint.
 */
function tintHex(hex, r, g, b) {
  const n = parseInt(hex.slice(1), 16);
  const rr = Math.round(((n >> 16) & 255) * r);
  const gg = Math.round(((n >> 8) & 255) * g);
  const bb = Math.round((n & 255) * b);
  return `rgb(${clamp(rr, 0, 255)},${clamp(gg, 0, 255)},${clamp(bb, 0, 255)})`;
}
