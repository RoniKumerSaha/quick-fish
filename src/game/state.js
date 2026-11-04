/**
 * Game state: player progress, basket, upgrades, and persistence.
 */

import { FISH_BY_ID, LOCATION_BY_ID, LOCATIONS, levelFromXp } from './content.js';

const SAVE_KEY = 'pixelfishing.save.v1';
const SAVE_VERSION = 1;

export function newGameState() {
  return {
    version: SAVE_VERSION,
    coins: 150,
    xp: 0,
    level: 0,
    upgrades: { rod: 0, line: 0, bait: 0, boat: 0 },
    // Bait is unlimited — the shop still sells bait packs, but you can
    // always cast. This is the "relaxed" mode the game defaults to.
    bait: Infinity,
    location: 'sunny_bay',
    unlocked: ['sunny_bay'],
    basket: {},        // fishId -> count
    collection: {},    // fishId -> { count, best, firstAt }
    stats: {
      casts: 0,
      catches: 0,
      sold: 0,
      coinsEarned: 0,
      biggest: null,      // fish id
      biggestWeight: 0,
      jokesCaught: 0,
      snaps: 0,
      escaped: 0,
      trips: 0,
    },
    settings: {
      music: true,
      sfx: true,
    },
    seenIntro: false,
  };
}

/**
 * Fill in anything missing from a loaded save (forward compatibility).
 */
function migrate(raw) {
  const base = newGameState();
  if (!raw || typeof raw !== 'object') return base;

  const state = { ...base, ...raw };
  state.version = SAVE_VERSION;
  state.upgrades = { ...base.upgrades, ...(raw.upgrades || {}) };
  state.stats = { ...base.stats, ...(raw.stats || {}) };
  state.settings = { ...base.settings, ...(raw.settings || {}) };
  state.basket = raw.basket && typeof raw.basket === 'object' ? raw.basket : {};
  state.collection = raw.collection && typeof raw.collection === 'object' ? raw.collection : {};

  // Drop unknown fish ids from basket/collection.
  for (const id of Object.keys(state.basket)) {
    if (!FISH_BY_ID[id]) delete state.basket[id];
  }
  for (const id of Object.keys(state.collection)) {
    if (!FISH_BY_ID[id]) delete state.collection[id];
  }

  // Clamp numeric fields.
  state.coins = Math.max(0, Math.floor(Number(state.coins) || 0));
  state.xp = Math.max(0, Math.floor(Number(state.xp) || 0));
  // Bait is unlimited: Infinity survives JSON as null, so restore it here.
  state.bait = Infinity;
  state.level = levelFromXp(state.xp);

  // Ensure unlocked list is valid and includes the current location.
  const validUnlocked = LOCATIONS.filter((l) => state.unlocked.includes(l.id)).map((l) => l.id);
  if (!validUnlocked.length) validUnlocked.push('sunny_bay');
  state.unlocked = validUnlocked;
  if (!state.unlocked.includes(state.location)) state.location = validUnlocked[0];

  return state;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newGameState();
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.warn('Could not load save, starting fresh:', err);
    return newGameState();
  }
}

let saveTimer = null;

export function saveState(state) {
  // Debounce writes; the game saves on many small events.
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Could not save game:', err);
    }
  }, 400);
}

export function saveStateNow(state) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save game:', err);
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
}

// --------------------------------------------------------------- selectors

export function basketCount(state) {
  let n = 0;
  for (const id in state.basket) n += state.basket[id] || 0;
  return n;
}

export function basketValue(state) {
  let v = 0;
  for (const id in state.basket) {
    const fish = FISH_BY_ID[id];
    if (fish) v += fish.price * (state.basket[id] || 0);
  }
  return v;
}

export function collectionCount(state) {
  return Object.keys(state.collection).length;
}

export function collectionTotal() {
  return Object.keys(FISH_BY_ID).length;
}

/** True if the player has enough coins and boat level for a location. */
export function locationUnlocked(state, loc) {
  return state.unlocked.includes(loc.id);
}

/**
 * All requirements for a location, as a list of { ok, text } checks.
 */
export function locationRequirements(state, loc) {
  const u = loc.unlock;
  const up = state.upgrades;
  const reqs = [];
  if (u.boat > 0) {
    reqs.push({ ok: up.boat >= u.boat, text: `Rig Lv ${u.boat}`, have: up.boat });
  }
  if (u.rod > 0) {
    reqs.push({ ok: up.rod >= u.rod, text: `Rod Lv ${u.rod}`, have: up.rod });
  }
  if (u.line > 0) {
    reqs.push({ ok: up.line >= u.line, text: `Line Lv ${u.line}`, have: up.line });
  }
  if (u.bait > 0) {
    reqs.push({ ok: up.bait >= u.bait, text: `Bait Lv ${u.bait}`, have: up.bait });
  }
  reqs.push({ ok: state.coins >= u.coins, text: `${u.coins} coins`, have: state.coins });
  return reqs;
}

export function canUnlockLocation(state, loc) {
  if (state.unlocked.includes(loc.id)) return true;
  return locationRequirements(state, loc).every((r) => r.ok);
}

export function locationUnlockReason(state, loc) {
  const failing = locationRequirements(state, loc).filter((r) => !r.ok);
  if (!failing.length) return '';
  return `Needs ${failing.map((r) => r.text).join(', ')}`;
}

export function getLocation(state, id = state.location) {
  return LOCATION_BY_ID[id] || LOCATION_BY_ID.sunny_bay;
}
