/**
 * Fishing mechanics: catch selection (rarity rolls) and the
 * tension-bar minigame that decides whether you land the fish.
 */

import { FISH, FISH_BY_ID, TIERS } from './content.js';
import { clamp } from '../engine/gfx.js';

// --------------------------------------------------------------- selection

/**
 * Pick the species for a cast at a location.
 *
 * Rarity weights are adjusted by bait level (better bait favours rarer fish)
 * and by the player's experience — the "finder" bonus is now derived from
 * level, so a seasoned angler pulls up bigger game without having to buy
 * a separate upgrade track.
 *
 * Every location draws from its own pool *plus* a random handful of
 * "visiting" rare fish from anywhere, so a lucky cast can turn up a
 * mahi-mahi at Sunny Bay or a coelacanth in the shallows.
 */
export function rollCatch(state, locationId, rng = Math.random) {
  const baitLvl = state.upgrades.bait;
  const finderLvl = experienceBonus(state.level);
  const rodLvl = state.upgrades.rod;
  const lineLvl = state.upgrades.line;

  const pool = FISH.filter((f) => {
    if (!f.locations.includes(locationId)) return false;
    if (f.minBait > baitLvl) return false;
    if (f.minRod > rodLvl) return false;
    if (f.minLine > lineLvl) return false;
    if (f.minLevel > state.level) return false;
    return true;
  });

  const locals = pool.length ? pool : [FISH_BY_ID.anchovy];
  const visitors = visitingRares(locationId, rng, baitLvl, finderLvl, rodLvl, lineLvl, state.level);
  const candidates = visitors.length ? locals.concat(visitors) : locals;

  // Weight multiplier by tier.
  const tierBoost = {
    common: 1,
    uncommon: 0.85 + baitLvl * 0.28 + finderLvl * 0.10,
    rare: 0.18 + baitLvl * 0.26 + finderLvl * 0.32,
    legendary: 0.008 + baitLvl * 0.014 + finderLvl * 0.022,
    joke: 0.55 + baitLvl * 0.05,
  };

  const weighted = candidates.map((f) => ({
    fish: f,
    w: Math.max(0.0001, f.weightIn * (tierBoost[f.tier] ?? 1)),
  }));

  const total = weighted.reduce((sum, x) => sum + x.w, 0);
  let roll = rng() * total;
  for (const entry of weighted) {
    roll -= entry.w;
    if (roll <= 0) return entry.fish;
  }
  return weighted[weighted.length - 1].fish;
}

/**
 * The "finder" bonus, derived from how experienced the angler is.
 *
 * This used to be the Fish Finder upgrade track. It is now tied to the
 * player's level, so experience alone reveals bigger game — the upgrade
 * menu no longer has a row to buy.
 *
 * @param {number} level  the player's level
 * @returns {number} a bonus in roughly the same 0..5 range the old
 *                    maxed finder used to provide
 */
export function experienceBonus(level) {
  return Math.min(5, Math.floor((level || 0) / 4));
}

/**
 * Rare fish that have "wandered" into a location.
 *
 * A visiting fish is drawn from the rare/legendary pool of *other*
 * locations, so every spot can turn up something special. The chance grows
 * with the bait and the player's experience, and the travellers must still
 * be within the player's gear and level to be catchable.
 *
 * @returns {object[]} the visiting fish (usually 0 or 1)
 */
function visitingRares(locationId, rng, baitLvl, finderLvl, rodLvl, lineLvl, level = 0) {
  // 8% base chance, up to ~30% with good bait and a high level.
  const chance = 0.08 + baitLvl * 0.028 + finderLvl * 0.038;
  if (rng() > chance) return [];

  const candidates = FISH.filter((f) =>
    !f.locations.includes(locationId) &&
    (f.tier === 'rare' || f.tier === 'legendary') &&
    f.minBait <= baitLvl &&
    f.minRod <= rodLvl &&
    f.minLine <= lineLvl &&
    f.minLevel <= level);

  if (!candidates.length) return [];

  // Favour the rarer of the travellers, but never exclude the commons of
  // the rare pool entirely.
  const pick = candidates[Math.floor(rng() * candidates.length) % candidates.length];
  return pick ? [pick] : [];
}

// --------------------------------------------------------------- minigame

export const PHASE = {
  IDLE: 'idle',
  CASTING: 'casting',
  WAITING: 'waiting',
  BITE: 'bite',
  HOOKED: 'hooked',
  RESULT: 'result',
};

/**
 * Create a fresh fishing session state.
 */
export function createSession(fish, locationId) {
  return {
    phase: PHASE.CASTING,
    timer: 0,
    fish: null,
    pendingFish: fish,
    locationId,

    // rod animation
    castAnim: 0,

    // waiting for a bite
    waitTime: 0,
    bobPhase: 0,

    // bite window
    biteTimer: 0,
    biteWindow: 0,

    // tension minigame
    tension: 0.35,       // 0..1 where 1 = line snaps
    lineHealth: 1,       // 0..1, the fish can also wear you down
    reelProgress: 0,     // 0..1 toward landing
    stamina: 1,          // 0..1 player stamina for holding reel
    surging: false,
    surgeTimer: 0,
    pullStrength: 1,
    safeZone: 0.35,
    safeWidth: 0.22,
    tensionDir: 1,
    holdTime: 0,
    reelTickAcc: 0,
    failReason: null,
    resultFish: null,
    resultKind: null,   // 'caught' | 'escaped' | 'snapped'
    resultTimer: 0,
  };
}

/**
 * Progress the fishing session.
 *
 * @param {object} s       session
 * @param {object} state   player state (read-only here)
 * @param {number} dt      seconds
 * @param {boolean} holding  player is holding the reel button
 * @param {function} rng
 * @param {object} events  callbacks: onBite, onHook, onResult, onReelTick
 */
export function updateSession(s, state, dt, holding, rng = Math.random, events = {}) {
  s.timer += dt;

  switch (s.phase) {
    case PHASE.CASTING: {
      s.castAnim += dt;
      if (s.castAnim > 0.45) {
        s.phase = PHASE.WAITING;
        s.timer = 0;
        // Waiting time depends on bait quality: better bait bites sooner.
        const baitLvl = state.upgrades?.bait || 0;
        const base = 2.2 + rng() * 4.5;
        s.waitTime = base / (1 + baitLvl * 0.12);
      }
      break;
    }

    case PHASE.WAITING: {
      s.bobPhase += dt * 2.4;
      if (s.timer >= s.waitTime) {
        s.phase = PHASE.BITE;
        s.timer = 0;
        // Bite window: how long the player has to react. An experienced
        // angler spots the bite sooner.
        const exp = experienceBonus(state.level);
        s.biteWindow = clamp(1.35 - exp * 0.06, 0.75, 1.4);
        events.onBite?.();
      }
      break;
    }

    case PHASE.BITE: {
      if (holding) {
        s.phase = PHASE.HOOKED;
        s.timer = 0;
        s.fish = s.pendingFish;
        s.pendingFish = null;
        s.tension = 0.25;
        s.lineHealth = 1;
        s.reelProgress = 0;
        s.stamina = 1;
        s.surging = false;
        s.surgeTimer = 1.2;
        s.tensionDir = 1;
        events.onHook?.(s.fish);
      } else if (s.timer >= s.biteWindow) {
        // Missed the bite — the fish is gone, but you keep your bait.
        s.phase = PHASE.RESULT;
        s.timer = 0;
        s.resultKind = 'escaped';
        s.resultFish = null;
        s.failReason = 'It got away. It was quick about it.';
        events.onResult?.(s.resultKind, null, s.failReason);
      }
      break;
    }

    case PHASE.HOOKED: {
      updateTensionGame(s, state, dt, holding, rng, events);
      break;
    }

    case PHASE.RESULT: {
      s.resultTimer += dt;
      break;
    }
  }
}

/**
 * The tension minigame.
 *
 * Holding the button reels the fish in but raises tension. Releasing lets
 * tension fall but the fish recovers distance. The fish periodically
 * surges, which spikes tension. If tension maxes out the line snaps; if the
 * fish wears down your line health it escapes.
 *
 * The tuning here is deliberately forgiving: a wide safe zone, a generous
 * bite window, slow line wear and a strong pull. The reel should feel like
 * a satisfying rhythm, not a dexterity test.
 */
function updateTensionGame(s, state, dt, holding, rng, events) {
  const fish = s.fish;
  const weight = fish ? fish.weight : 3;

  const up = state.upgrades || {};
  const rodLvl = up.rod || 0;
  const lineLvl = up.line || 0;

  // Heavier fish pull harder; better rods/boats help keep control.
  const rodFactor = 1 + rodLvl * 0.16;
  const lineFactor = 1 + lineLvl * 0.10;
  const basePull = (0.11 + weight * 0.014) / rodFactor;
  const surgePull = (0.20 + weight * 0.020) / rodFactor;

  // --- surge scheduling
  s.surgeTimer -= dt;
  if (s.surgeTimer <= 0) {
    s.surging = !s.surging;
    if (s.surging) {
      s.surgeTimer = 0.6 + rng() * 1.2;
      events.onSurge?.();
    } else {
      s.surgeTimer = 1.4 + rng() * 2.0;
    }
  }

  // --- tension
  const pull = s.surging ? surgePull : basePull;
  if (holding) {
    // Reeling raises tension faster the closer to the safe zone you are.
    s.tension += (pull * 1.35 + 0.055) * dt;
    s.stamina = Math.max(0, s.stamina - 0.42 * dt);
    s.reelProgress += (0.20 + 0.20 / Math.max(1, weight * 0.30)) * dt / lineFactor;
  } else {
    s.tension -= 0.50 * dt;
    s.stamina = Math.min(1, s.stamina + 0.30 * dt);
    // Fish swims away while you are not reeling.
    s.reelProgress -= 0.030 * dt * (1 + weight * 0.04);
  }

  // While surging the fish gains a little ground even if you hold.
  if (s.surging) {
    s.reelProgress -= 0.03 * dt;
    s.tension += 0.05 * dt;
  }

  // The safe zone drifts slowly so you cannot just park the tension, but
  // it stays wide enough to hit without pixel-perfect timing.
  s.safeZone = clamp(
    0.34 + Math.sin(s.timer * 0.7) * 0.10 + (rng() - 0.5) * 0.015,
    0.22, 0.58,
  );
  s.safeWidth = clamp(0.34 - lineLvl * 0.012, 0.22, 0.34);

  s.tension = clamp(s.tension, 0, 1.05);
  s.reelProgress = clamp(s.reelProgress, 0, 1);

  // Being in the safe zone recovers the line quickly; outside it, the line
  // wears slowly, so a brief slip does not lose the fish.
  const inSafe = Math.abs(s.tension - s.safeZone) <= s.safeWidth / 2;
  if (inSafe) {
    s.lineHealth = Math.min(1, s.lineHealth + 0.22 * dt);
  } else {
    s.lineHealth -= 0.055 * dt;
  }

  // Outside the safe zone, tension climbs on its own — but gently.
  if (!inSafe && s.tension < 0.9) {
    s.tension += 0.07 * dt;
  }

  // --- reel tick sound
  if (holding) {
    s.reelTickAcc += dt * 8;
    while (s.reelTickAcc >= 1) {
      s.reelTickAcc -= 1;
      events.onReelTick?.();
    }
  }

  // --- outcomes
  if (s.tension >= 1) {
    s.phase = PHASE.RESULT;
    s.timer = 0;
    s.resultKind = 'snapped';
    s.resultFish = null;
    s.failReason = 'The line snapped! The fish is gone forever. Probably.';
    events.onResult?.('snapped', null, s.failReason);
    return;
  }

  if (s.lineHealth <= 0) {
    s.phase = PHASE.RESULT;
    s.timer = 0;
    s.resultKind = 'escaped';
    s.resultFish = null;
    s.failReason = 'The fish wore you down and slipped the hook.';
    events.onResult?.('escaped', null, s.failReason);
    return;
  }

  if (s.reelProgress >= 1) {
    s.phase = PHASE.RESULT;
    s.timer = 0;
    s.resultKind = 'caught';
    s.resultFish = fish;
    events.onResult?.('caught', fish, null);
  }
}

/**
 * XP awarded for a catch.
 */
export function xpFor(fish) {
  const base = {
    common: 8,
    uncommon: 16,
    rare: 30,
    legendary: 70,
    joke: 12,
  }[fish.tier] ?? 8;
  return Math.round(base * (1 + fish.weight * 0.05));
}

/**
 * Describe the current tension state for the UI.
 */
export function tensionState(s) {
  if (!s || s.phase !== PHASE.HOOKED) return 'idle';
  const d = Math.abs(s.tension - s.safeZone);
  if (d <= s.safeWidth / 2) return 'safe';
  if (s.tension > s.safeZone) return 'high';
  return 'low';
}

export function tierColor(tier) {
  return (TIERS[tier] || TIERS.common).color;
}
