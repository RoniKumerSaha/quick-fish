/**
 * Game orchestration: screens, the fishing state machine, and all the
 * wiring between input, logic and rendering.
 */

import { drawText, textWidth, wrapText } from '../engine/font.js';
import {
  rect, frame, panel, coin, clamp, shadowRect, chip, THEME, titleBanner, woodPanel,
  roundRect, roundRectStroke,
} from '../engine/gfx.js';
import { audio } from '../engine/audio.js';

import {
  FISH_BY_ID, LOCATIONS, LOCATION_BY_ID, UPGRADES, TIERS,
  levelFromXp, xpForNextLevel,
} from './content.js';
import {
  loadState, saveState, saveStateNow, basketCount, basketValue,
  collectionCount, collectionTotal, getLocation, canUnlockLocation,
  locationUnlockReason,
} from './state.js';
import {
  PHASE, createSession, updateSession, rollCatch, xpFor,
} from './fishing.js';

import {
  drawScene, drawFishingBobber, drawPreviewFish,
  shoreY, boatPos, bobberPos, rodTip, setRigLevel,
} from '../render/scene.js';
import { Weather } from '../render/weather.js';
import {
  drawHUD, drawLog, drawCatchPopup, drawTensionMeter, drawUpgrades, drawShop,
  drawCollection, drawLocationSelect, drawHint, drawCastPrompt,
  dim, travelRows, actionBarChips, fullscreenButtonRect, upgradeBuyButtons,
  W, H, withClip,
} from '../render/ui.js';
import {
  drawFish, drawSparkle, drawOilRig, drawFisherman, drawRod, FISH_SNOUT,
} from '../render/sprites.js';

export const SCREEN = {
  INTRO: 'intro',
  FISHING: 'fishing',
  SHOP: 'shop',
  COLLECTION: 'collection',
  TRAVEL: 'travel',
  STATS: 'stats',
};

const PANEL_W = 300;
const PANEL_H = 400;

/**
 * The right-hand panel slot. Width tracks the viewport so the panel never
 * floats away from the edge on a wide screen.
 */
function sidePanel() {
  const w = Math.min(320, Math.max(268, Math.round(W * 0.30)));
  return { x: W - w - 12, y: 44, w, h: Math.min(360, Math.max(240, H - 130)) };
}

/**
 * The upgrades panel, sized to the five rows it actually holds.
 *
 * The generic side panel is a fixed height, which left a slab of empty
 * parchment under the last upgrade on a tall window.
 */
function upgradesPanel() {
  const p = sidePanel();
  const rows = Object.keys(UPGRADES).length;
  const rowH = 52;
  // Header (30) + top padding (10) + the rows + a little breathing room.
  const contentH = 30 + 10 + rows * rowH + 8;
  return { ...p, h: Math.min(p.h, contentH) };
}

export class Game {
  constructor(ctx, input) {
    this.ctx = ctx;
    this.input = input;
    this.state = loadState();
    this.t = 0;
    this.screen = this.state.seenIntro ? SCREEN.FISHING : SCREEN.INTRO;
    this.session = null;
    this.popup = null;         // { fish, t }
    this.popupTimer = 0;
    this.log = [];
    this.scroll = {
      collection: { scroll: 0, maxScroll: 0 },
      travel: { scroll: 0, maxScroll: 0 },
    };
    this.transition = 0;
    this.pendingScreen = null;
    // The upgrades panel starts hidden so the sea is the first thing you
    // see. Press U to bring it back.
    this.showUpgrades = false;
    this.hint = '';
    this.hintTimer = 0;
    this.levelUpBanner = 0;
    this.introTime = 0;
    this.mouseOverPanel = false;
    // The weather of the current location. Each location has its own, so
    // the Abyss is always storming and Sunny Bay is always clear.
    this.weather = new Weather();
    this.weather.enter(this.state.location);
    this.weatherLocation = this.state.location;
  }

  // ------------------------------------------------------------- utilities

  pushLog(text, color = '#cfe3ff') {
    this.log.push({ text, color, time: this.t });
    if (this.log.length > 20) this.log.shift();
  }

  showHint(text, seconds = 3) {
    this.hint = text;
    this.hintTimer = seconds;
  }

  save() {
    saveState(this.state);
  }

  // ---------------------------------------------------------------- update

  update(dt) {
    this.t += dt;

    // The weather keeps running whatever screen we are on, so the sky is
    // already alive when you come back to the water.
    this.weather.update(dt);
    // A different location has different weather.
    if (this.weatherLocation !== this.state.location) {
      this.weatherLocation = this.state.location;
      this.weather.enter(this.state.location);
    }

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint = '';
    }
    if (this.popupTimer > 0) {
      this.popupTimer -= dt;
      if (this.popupTimer <= 0) this.popup = null;
    }
    if (this.levelUpBanner > 0) this.levelUpBanner -= dt;

    if (this.transition > 0) {
      this.transition -= dt;
      if (this.transition <= 0 && this.pendingScreen) {
        this.screen = this.pendingScreen;
        this.pendingScreen = null;
        this.transition = 0;
      }
      return;
    }

    switch (this.screen) {
      case SCREEN.INTRO: this.updateIntro(dt); break;
      case SCREEN.FISHING: this.updateFishing(dt); break;
      case SCREEN.SHOP: this.updateShop(dt); break;
      case SCREEN.COLLECTION: this.updateCollection(dt); break;
      case SCREEN.TRAVEL: this.updateTravel(dt); break;
      case SCREEN.STATS: this.updateStats(dt); break;
    }
  }

  goto(screen) {
    if (this.screen === screen) return;
    this.pendingScreen = screen;
    this.transition = 0.18;
  }

  // ----------------------------------------------------------------- intro

  updateIntro(dt) {
    this.introTime += dt;
    if (this.input.pressed(' ', 'Enter') || this.input.mouse.clicked) {
      audio.resume();
      audio.startMusic();
      this.state.seenIntro = true;
      this.save();
      this.goto(SCREEN.FISHING);
    }
  }

  // --------------------------------------------------------------- fishing

  updateFishing(dt) {
    const input = this.input;

    // Global screen switching
    if (input.pressed('u')) this.showUpgrades = !this.showUpgrades;
    if (input.pressed('s')) this.goto(SCREEN.SHOP);
    if (input.pressed('c')) this.goto(SCREEN.COLLECTION);
    if (input.pressed('m')) this.goto(SCREEN.TRAVEL);
    if (input.pressed('Tab')) this.goto(SCREEN.STATS);

    // A click that landed on a HUD control is a button press, not a cast.
    // The press itself is acted on in the render pass — which runs on every
    // frame, unlike the simulation, which can skip a frame entirely. All
    // this does is stop the same click from also casting a line.
    const onHud = this.pointerOnHud();

    if (this.session) {
      this.updateSession(dt);
      return;
    }

    // Idle: casting. Bait is unlimited, so you can always cast.
    if (!onHud && (input.pressed(' ') || input.mouse.justDown) && !this.popup) {
      this.cast();
    }

    // Escape / popup dismissal
    if (this.popup && (input.pressed(' ', 'Enter') || (input.mouse.justDown && !onHud))) {
      this.popup = null;
      this.popupTimer = 0;
    }
  }

  /**
   * Whether the mouse press this frame landed on a HUD control.
   *
   * The bottom action bar, the fullscreen toggle and the upgrade "buy"
   * buttons are the only clickable furniture on the fishing screen, so they
   * are the only things that can swallow a click before it reaches the
   * water. Clicking one of them must not also cast a line.
   *
   * @returns {boolean}
   */
  pointerOnHud() {
    const input = this.input;
    if (!input.mouse.justDown) return false;

    const m = input.mouse;
    const over = (r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;

    // The fullscreen toggle in the top bar.
    if (over(fullscreenButtonRect(getLocation(this.state).name))) return true;

    // The bottom action bar — but only while it is actually on screen.
    if (!this.reeling()) {
      for (const c of actionBarChips(this.showUpgrades)) {
        if (over(c)) return true;
      }
    }

    // The upgrade "buy" buttons, when the upgrades panel is open.
    if (this.showUpgrades && !this.reeling()) {
      for (const b of upgradeBuyButtons(upgradesPanel())) {
        if (over(b)) return true;
      }
    }
    return false;
  }

  /**
   * Whether a fish is currently on the line.
   */
  reeling() {
    return !!(this.session && this.session.phase === PHASE.HOOKED);
  }

  /**
   * Perform the action behind a clicked HUD control.
   */
  activateChip(chip) {
    switch (chip.action) {
      case 'upgrades':
        this.showUpgrades = !this.showUpgrades;
        audio.ui();
        break;
      case 'shop':
        this.goto(SCREEN.SHOP);
        break;
      case 'collection':
        this.goto(SCREEN.COLLECTION);
        break;
      case 'travel':
        this.goto(SCREEN.TRAVEL);
        break;
      case 'stats':
        this.goto(SCREEN.STATS);
        break;
      case 'fullscreen':
        if (this.onFullscreen) this.onFullscreen();
        break;
      case 'buy':
        this.buyUpgrade(chip.track);
        break;
    }
  }

  cast() {
    const state = this.state;
    const loc = getLocation(state);

    // Bait is unlimited, so a cast never runs out of it.
    if (Number.isFinite(state.bait)) state.bait = Math.max(0, state.bait - 1);
    state.stats.casts++;

    const fish = rollCatch(state, loc.id);

    // Joke: the fish steals your bait — you lose the catch too.
    if (fish.stealsBait) {
      state.stats.jokesCaught++;
      this.pushLog('A fish stole your bait!', '#ff9ec4');
      audio.catchJoke();
      this.showPopup(fish, 'stole');
      this.save();
      return;
    }

    this.session = createSession(fish, loc.id);
    audio.cast();
    this.save();
  }

  updateSession(dt) {
    const s = this.session;
    // Space always reels. The mouse only reels when clicked on the water,
    // so clicking the upgrade panel does not fight the fish.
    const holding = this.input.down(' ') ||
      (this.input.mouse.down && this.input.mouse.x > 60);

    updateSession(s, this.state, dt, holding, Math.random, {
      onBite: () => {
        audio.bite();
        this.pushLog('A bite! Hit it!', '#ffd45e');
      },
      onHook: (fish) => {
        audio.hookSet();
        this.pushLog(`Hooked ${fish.name}!`, '#9fd8ff');
      },
      onSurge: () => {
        audio.splash();
      },
      onReelTick: () => {
        audio.reelTick();
      },
      onResult: (kind, fish, reason) => {
        this.finishSession(kind, fish, reason);
      },
    });

    if (s.phase === PHASE.RESULT && this.session && this.session.resultTimer > 1.4) {
      this.session = null;
    }
  }

  finishSession(kind, fish, reason) {
    const state = this.state;

    if (kind === 'caught') {
      // The giant fish pulls your boat and escapes.
      if (fish.escapes) {
        state.stats.escaped++;
        state.stats.casts++;
        audio.catchJoke();
        this.pushLog('It pulled your boat! You let it go.', '#c98ae8');
        this.showPopup(fish, 'escaped');
        this.save();
        return;
      }

      state.stats.catches++;
      state.basket[fish.id] = (state.basket[fish.id] || 0) + 1;

      const entry = state.collection[fish.id] || { count: 0, best: 0, firstAt: Date.now() };
      entry.count++;
      entry.best = Math.max(entry.best, fish.weight);
      state.collection[fish.id] = entry;

      if (fish.weight > state.stats.biggestWeight) {
        state.stats.biggestWeight = fish.weight;
        state.stats.biggest = fish.id;
      }
      if (fish.tier === 'joke') state.stats.jokesCaught++;

      const xp = xpFor(fish);
      const before = state.level;
      state.xp += xp;
      state.level = levelFromXp(state.xp);
      if (state.level > before) {
        audio.levelUp();
        this.levelUpBanner = 2.5;
        this.pushLog(`Level up! Now Lv ${state.level}`, '#5fbf5a');
      }

      audio.catchSuccess();
      this.pushLog(`Caught ${fish.name} (+${xp} xp)`, TIERS[fish.tier]?.color || '#cfe3ff');
      this.showPopup(fish, 'caught');
    } else if (kind === 'snapped') {
      state.stats.snaps++;
      audio.snap();
      this.pushLog('The line snapped!', '#e4573d');
      this.showMessage('LINE SNAPPED!', reason, '#e4573d');
    } else if (kind === 'escaped') {
      audio.splash();
      this.pushLog('It got away.', '#9fb8dc');
      this.showMessage('IT GOT AWAY', reason, '#9fb8dc');
    }
    this.save();
  }

  showPopup(fish, kind) {
    this.popup = { fish, kind };
    this.popupTimer = 6;
  }

  showMessage(title, body, color) {
    this.popup = { message: true, title, body, color };
    this.popupTimer = 3.2;
  }

  // ------------------------------------------------------------------ shop

  updateShop(dt) {
    const input = this.input;
    if (input.pressed('Esc') || input.pressed('s')) {
      this.goto(SCREEN.FISHING);
    }
  }

  // ------------------------------------------------------------ collection

  updateCollection(dt) {
    const input = this.input;
    if (input.pressed('Esc') || input.pressed('c')) {
      this.goto(SCREEN.FISHING);
      return;
    }
    this.scroll.collection.scroll = this.handleScroll(this.scroll.collection.scroll, dt,
      { x: 60, y: 60, w: W - 120, h: H - 90 }, 800);
  }

  // ---------------------------------------------------------------- travel

  updateTravel(dt) {
    const input = this.input;
    if (input.pressed('Esc') || input.pressed('m')) {
      this.goto(SCREEN.FISHING);
      return;
    }
    this.scroll.travel.scroll = this.handleScroll(this.scroll.travel.scroll, dt,
      { x: 80, y: 74, w: W - 160, h: H - 150 }, 480);

    if (!input.mouse.justDown) return;

    const layout = travelRows(this.scroll.travel.scroll, travelPanel());
    for (const row of layout) {
      const hovering = input.mouse.x >= row.x && input.mouse.x < row.x + row.w &&
        input.mouse.y >= row.y && input.mouse.y < row.y + row.h;
      if (!hovering) continue;

      const loc = row.loc;
      if (state_unlocked(this.state, loc.id)) {
        if (this.state.location !== loc.id) {
          this.state.location = loc.id;
          audio.ui();
          this.pushLog(`Travelled to ${loc.name}`, '#9fd8ff');
          this.save();
        }
        this.goto(SCREEN.FISHING);
      } else if (canUnlockLocation(this.state, loc)) {
        this.state.coins -= loc.unlock.coins;
        this.state.unlocked.push(loc.id);
        this.state.location = loc.id;
        audio.unlock();
        this.pushLog(`Unlocked ${loc.name}!`, '#ffd45e');
        this.showHint(`${loc.name} unlocked. ${loc.blurb}`, 4);
        this.save();
        this.goto(SCREEN.FISHING);
      } else {
        audio.denied();
        this.showHint(locationUnlockReason(this.state, loc), 3);
      }
      break;
    }
  }

  // ----------------------------------------------------------------- stats

  updateStats(dt) {
    if (this.input.pressed('Esc') || this.input.pressed('Tab')) {
      this.goto(SCREEN.FISHING);
    }
  }

  // --------------------------------------------------------------- helpers

  handleScroll(current, dt, region, contentHeight) {
    const input = this.input;
    let s = current;
    if (input.down('Down')) s += 40 * dt;
    if (input.down('Up')) s -= 40 * dt;
    const hovering = input.mouse.x >= region.x && input.mouse.x < region.x + region.w &&
      input.mouse.y >= region.y && input.mouse.y < region.y + region.h;
    if (hovering) {
      if (input.mouse.justDown) s += 16;
    }
    return clamp(s, 0, Math.max(0, contentHeight - region.h));
  }

  // ---------------------------------------------------------------- render

  render() {
    const ctx = this.ctx;
    const state = this.state;
    const loc = getLocation(state);

    ctx.clearRect(0, 0, W, H);

    if (this.screen === SCREEN.INTRO) {
      this.renderIntro();
      return;
    }

    // --- background scene (always the fishing scene behind the panels)
    const s = this.session;
    const fisherFrame = s
      ? (s.phase === PHASE.CASTING ? 1 : s.phase === PHASE.HOOKED ? 2 : 0)
      : 0;
    const rodBend = s && s.phase === PHASE.HOOKED ? clamp(s.tension * 0.8, 0, 1) : 0;

    const bob = bobberPos();
    const bobberX = bob.x;
    const bobberY = bob.y;
    const showBobber = !!s;
    const submerged = s && (s.phase === PHASE.WAITING || s.phase === PHASE.HOOKED);

    // The rig's size has to be known before the rod tip can be placed,
    // because the angler stands higher on a bigger rig.
    setRigLevel(state.upgrades.boat);

    // A hooked fish hangs off the *end* of the line, so the leader has to
    // terminate at its snout rather than run through its body.
    const hooked = s && s.phase === PHASE.HOOKED && s.fish;
    const FISH_SIZE = 56;

    // Where the leader ends and the fish's snout sits. The fish is drawn
    // mirrored (it faces the angler), so its snout is to the *left* of its
    // centre — the offset table is per-archetype because the snout is not
    // on the centre line for every shape.
    const snout = FISH_SNOUT[s?.fish?.archetype] || FISH_SNOUT.slim;
    const hookX = bobberX;
    const hookY = bobberY - 2;

    // Fish centre, worked backwards from the snout.
    const fishX = hookX + snout.x * FISH_SIZE;
    const fishY = hookY - snout.y * FISH_SIZE;

    // The leader stops exactly at the snout.
    const lineTo = hooked ? { x: hookX, y: hookY }
      : (showBobber ? { x: bobberX, y: bobberY } : null);

    // The rod tip
    const tip = rodTip(rodBend);

    drawScene(ctx, loc, this.t, {
      boatLevel: state.upgrades.boat,
      fisherFrame,
      rodBend,
      lineFrom: tip,
      lineTo,
      tension: s ? s.tension : 0,
      weather: this.weather,
    });

    if (showBobber && !hooked) {
      drawFishingBobber(ctx, bobberX, bobberY, this.t, submerged);
    }

    // Fish on the line during the reel
    if (hooked) {
      // Mirrored so the fish faces the angler, with the leader on its nose.
      ctx.save();
      ctx.translate(fishX, fishY);
      ctx.scale(-1, 1);
      drawFish(ctx, s.fish, 0, 0, this.t, FISH_SIZE);
      ctx.restore();

      // A hook glinting at the corner of its mouth.
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.arc(hookX, hookY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9fb8cc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hookX + 2.4, hookY + 2.4, 2.6, Math.PI * 0.9, Math.PI * 1.9);
      ctx.stroke();

      // The bobber is under the water now — just a few bubbles escaping.
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(232,244,255,0.7)';
        ctx.beginPath();
        ctx.arc(bobberX + 2 - i * 7, bobberY - 2 - i * 5, 2 - i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Splash when surging
      if (s.surging) {
        for (let i = 0; i < 5; i++) {
          const a = this.t * 8 + i * 2;
          const sx = fishX + 26 + Math.cos(a) * 22;
          const sy = fishY - 14 - Math.abs(Math.sin(a)) * 12;
          ctx.fillStyle = 'rgba(207,232,255,0.85)';
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // --- HUD
    const hud = drawHUD(ctx, state, loc, this.t, {
      fullscreen: this.isFullscreen ? this.isFullscreen() : false,
      input: this.input,
      weather: this.weather.current,
    });
    if (hud && hud.action === 'fullscreen' && this.onFullscreen) {
      this.onFullscreen();
      this.input.consumeMousePress();
    }

    // --- Panels on the right (upgrades) when fishing
    this.logX = 12;
    if (this.screen === SCREEN.FISHING) {
      const reeling = s && s.phase === PHASE.HOOKED;

      // While a fish is on the line the upgrades panel gives way to the
      // tension meter — the reel is the only thing that matters then.
      if (this.showUpgrades && !reeling) {
        const ur = upgradesPanel();
        const result = drawUpgrades(ctx, state, this.input, this.t, ur);
        if (result && result.action === 'buy') {
          this.buyUpgrade(result.track);
        }
      }

      // Cast prompt
      if (!s && !this.popup) {
        drawCastPrompt(ctx, this.t, true, '');
      }

      // Tension meter during the reel, in the upgrades panel's slot.
      if (reeling) {
        const tr = sidePanel();
        drawTensionMeter(ctx, s, this.t, { x: tr.x, y: tr.y, w: tr.w, h: 170 });
      }
      if (s && s.phase === PHASE.BITE) {
        const pulse = Math.floor(this.t * 12) % 2;
        const label = 'BITE! HIT IT!';
        const lw = textWidth(label, 30, 900) + 44;
        const lx = Math.round(W * 0.42 - lw / 2);
        const ly = Math.round(H * 0.52);
        shadowRect(ctx, lx, ly, lw, 52, 'rgba(20,10,2,0.4)', 4, 12);
        roundRect(ctx, lx, ly, lw, 52, 12, pulse ? '#c23a26' : '#8e2c1c');
        roundRectStroke(ctx, lx, ly, lw, 52, 12, '#4a0e06', 2);
        drawText(ctx, label, W * 0.42, ly + 11, {
          color: pulse ? '#ffd45e' : '#ffffff', align: 'center', size: 30, weight: 900,
          shadow: 'rgba(40,6,2,0.9)', shadowOffset: 2,
        });
      }
      if (s && s.phase === PHASE.WAITING) {
        drawText(ctx, 'Waiting for a bite…', W * 0.42, Math.round(H * 0.56), {
          color: '#ffffff', align: 'center', size: 20, weight: 700,
          shadow: 'rgba(20,40,70,0.9)', shadowOffset: 2,
        });
      }

      // Bottom action bar
      this.renderActionBar();
    }

    // --- Modal screens
    if (this.screen === SCREEN.SHOP) {
      dim(ctx, 0.55);
      const sw = Math.min(320, Math.max(268, Math.round(W * 0.30)));
      const rect_ = { x: W - sw - 16, y: 48, w: sw, h: Math.min(PANEL_H, Math.max(300, H - 110)) };
      const result = drawShop(ctx, state, this.input, this.t, rect_);
      if (result) {
        if (result.action === 'sellAll') {
          let total = 0;
          for (const id in state.basket) {
            const fish = FISH_BY_ID[id];
            if (fish) total += fish.price * state.basket[id];
          }
          if (total > 0) {
            state.coins += total;
            state.stats.coinsEarned += total;
            state.stats.sold += Object.values(state.basket).reduce((a, b) => a + b, 0);
            state.basket = {};
            audio.coin();
            this.pushLog(`Sold your catch for ${total} coins`, '#ffd45e');
            this.save();
          }
        }
      }
      // Basket summary panel on the left
      this.renderBasketPanel();
    }

    if (this.screen === SCREEN.COLLECTION) {
      dim(ctx, 0.55);
      const margin = Math.round(Math.min(60, W * 0.06));
      const rect_ = { x: margin, y: 48, w: W - margin * 2, h: H - 96 };
      drawCollection(ctx, state, this.input, this.t, rect_, this.scroll.collection);
      this.drawFooterHint('C: CLOSE    SCROLL: MOUSE WHEEL / ARROWS');
    }

    if (this.screen === SCREEN.TRAVEL) {
      dim(ctx, 0.55);
      drawLocationSelect(ctx, state, this.input, this.t, travelPanel(), this.scroll.travel);
      this.drawFooterHint('M: CLOSE');
    }

    if (this.screen === SCREEN.STATS) {
      dim(ctx, 0.7);
      this.renderStats();
    }

    // --- Popups
    if (this.popup) {
      if (this.popup.message) {
        this.renderMessagePopup();
      } else {
        dim(ctx, 0.35);
        const appear = clamp((6 - this.popupTimer) * 4, 0, 1);
        const box = drawCatchPopup(ctx, this.popup.fish, this.t, appear);
        const kind = this.popup.kind;
        const prompt = kind === 'caught' ? 'CLICK TO CONTINUE'
          : kind === 'stole' ? 'CLICK TO CONTINUE'
          : 'IT ESCAPED — CLICK TO CONTINUE';
        drawText(ctx, prompt, W / 2, box.py + box.ph + 14, {
          color: '#ffd45e', align: 'center', size: 16, weight: 800,
          shadow: 'rgba(40,30,8,0.9)', shadowOffset: 2,
        });
      }
    }

    // --- Log feed and hint
    drawLog(ctx, this.log, this.t, this.logX || 12);
    if (this.hint) drawHint(ctx, this.hint);

    // --- Level up banner
    if (this.levelUpBanner > 0) {
      const y = 80 + Math.round(Math.sin(this.t * 3) * 4);
      const text = `LEVEL ${state.level}!`;
      const w = textWidth(text, 34, 900) + 56;
      const bx = Math.round((W - w) / 2);
      shadowRect(ctx, bx, y, w, 58, 'rgba(20,10,2,0.4)', 4, 14);
      roundRect(ctx, bx, y, w, 58, 14, '#3f9d43');
      roundRectStroke(ctx, bx, y, w, 58, 14, '#25591f', 2);
      ctx.fillStyle = 'rgba(255,255,255,0.26)';
      roundRect(ctx, bx + 5, y + 4, w - 10, 14, 6, 'rgba(255,255,255,0.26)');
      drawText(ctx, text, W / 2, y + 12, {
        color: '#ffffff', align: 'center', size: 34, weight: 900,
        shadow: 'rgba(10,40,18,0.9)', shadowOffset: 2,
      });
    }

    // --- Screen transition wipe
    if (this.transition > 0) {
      const p = this.transition / 0.18;
      ctx.save();
      ctx.globalAlpha = p;
      rect(ctx, 0, 0, W, H, '#05080f');
      ctx.restore();
    }
  }

  /**
   * A small centred hint chip at the very bottom of the screen.
   */
  drawFooterHint(text) {
    const ctx = this.ctx;
    const hw = textWidth(text, 13, 700) + 30;
    const hx = Math.round((W - hw) / 2);
    chip(ctx, hx, H - 34, hw, 26, {
      fill: '#2b4a72', light: '#5b86b4', dark: '#16283f', radius: 8,
    });
    drawText(ctx, text, W / 2, H - 27, {
      color: '#ffffff', align: 'center', size: 13, weight: 700,
    });
  }

  // ----------------------------------------------------------- sub-renders

  renderActionBar() {
    const ctx = this.ctx;
    const y = H - 42;
    const s = this.session;

    // While a fish is on the line, the bar becomes a single instruction
    // rather than a row of navigation hints.
    if (s && s.phase === PHASE.HOOKED) {
      const label = s.surging ? 'SURGING! HOLD ON!' : 'HOLD TO REEL';
      const w = textWidth(label, 18, 800) + 40;
      const bx = Math.round((W - w) / 2);
      shadowRect(ctx, bx, y, w, 36, 'rgba(20,10,2,0.4)', 4, 12);
      roundRect(ctx, bx, y, w, 36, 12, s.surging ? '#c23a26' : '#2b4a72');
      roundRectStroke(ctx, bx, y, w, 36, 12, s.surging ? '#4a0e06' : '#16283f', 2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      roundRect(ctx, bx + 4, y + 3, w - 8, 10, 5, 'rgba(255,255,255,0.22)');
      drawText(ctx, label, W / 2, y + 9, {
        color: s.surging ? '#ffd45e' : '#ffffff', align: 'center', size: 18, weight: 800,
      });
      return;
    }

    const items = actionBarChips(this.showUpgrades);
    for (const it of items) {
      const hovering = this.input.mouse.x >= it.x && this.input.mouse.x < it.x + it.w &&
        this.input.mouse.y >= it.y && this.input.mouse.y < it.y + it.h;
      chip(ctx, it.x, it.y, it.w, it.h, {
        fill: hovering ? '#3d6a9c' : '#2b4a72',
        light: hovering ? '#7fb0e0' : '#5b86b4',
        dark: '#16283f',
        radius: 8,
      });
      drawText(ctx, it.label, it.x + 12, it.y + 7, {
        color: hovering ? '#ffffff' : '#dbe8f5', size: 14, weight: 700,
      });

      // The chip is a real button, not just a keyboard hint — clicking it
      // opens the panel. Handled here, in the render pass, because that runs
      // on every frame; the simulation can skip one entirely.
      if (hovering && this.input.mouse.justDown) {
        this.activateChip({ action: it.action });
        this.input.consumeMousePress();
        break;
      }
    }
  }

  renderBasketPanel() {
    const ctx = this.ctx;
    const state = this.state;
    const bw = Math.min(380, Math.max(280, Math.round(W * 0.36)));
    const rect_ = { x: 16, y: 48, w: bw, h: Math.min(280, Math.max(220, H - 160)) };
    const p = panel(ctx, rect_.x, rect_.y, rect_.w, rect_.h, { title: 'YOUR BASKET' });
    drawText(ctx, 'YOUR BASKET', p.x + p.w / 2, p.textY + 6, {
      color: p.titleColor, align: 'center', size: 19, weight: 900,
      shadow: 'rgba(255,235,190,0.55)', shadowOffset: 1.5,
    });

    const count = basketCount(state);
    const value = basketValue(state);

    drawText(ctx, `${count} fish`, p.x + 14, p.bodyY, { color: THEME.inkSoft, size: 14, weight: 700 });
    coin(ctx, p.x + 110, p.bodyY - 2, 18);
    drawText(ctx, String(value), p.x + 134, p.bodyY, { color: THEME.goldDark, size: 14, weight: 800 });

    const entries = Object.entries(state.basket).filter(([, c]) => c > 0);
    let ry = p.bodyY + 30;
    const shown = entries.slice(0, 7);
    for (const [id, count2] of shown) {
      const fish = FISH_BY_ID[id];
      if (!fish) continue;
      const tier = TIERS[fish.tier] || TIERS.common;
      ctx.fillStyle = tier.color;
      ctx.beginPath();
      ctx.arc(p.x + 18, ry + 7, 5, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, fish.name, p.x + 32, ry, { color: THEME.ink, size: 14, weight: 600 });
      drawText(ctx, `x${count2}`, p.x + p.w - 14, ry, {
        color: THEME.inkSoft, align: 'right', size: 13, weight: 700,
      });
      ry += 24;
    }
    if (!shown.length) {
      drawText(ctx, 'Nothing yet.', p.x + 14, ry, { color: THEME.inkSoft, size: 14, weight: 600 });
    }
    if (entries.length > shown.length) {
      drawText(ctx, `+${entries.length - shown.length} more…`, p.x + 14, ry, {
        color: THEME.inkSoft, size: 13, weight: 600,
      });
    }

    drawText(ctx, 'ESC: CLOSE', p.x + 14, p.y + p.h - 22, {
      color: THEME.inkSoft, size: 12, weight: 700,
    });
  }

  renderStats() {
    const ctx = this.ctx;
    const state = this.state;
    const sw = Math.min(660, Math.max(420, W - 200));
    const sh = Math.min(340, Math.max(280, H - 140));
    const p = panel(ctx, Math.round((W - sw) / 2), Math.round((H - sh) / 2), sw, sh,
      { title: 'STATISTICS' });
    drawText(ctx, 'STATISTICS', p.x + p.w / 2, p.textY + 6, {
      color: p.titleColor, align: 'center', size: 20, weight: 900,
      shadow: 'rgba(255,235,190,0.55)', shadowOffset: 1.5,
    });
    const s = state.stats;

    // Two columns: lifetime numbers on the left, owned gear on the right.
    const colSplit = p.x + Math.round(p.w * 0.52);
    ctx.fillStyle = THEME.parchLine;
    ctx.fillRect(colSplit - 18, p.bodyY - 4, 1.5, p.h - (p.bodyY - p.y) - 24);

    const rows = [
      ['Casts', s.casts],
      ['Catches', s.catches],
      ['Sold', s.sold],
      ['Coins earned', s.coinsEarned],
      ['Jokes caught', s.jokesCaught],
      ['Lines snapped', s.snaps],
      ['Escaped', s.escaped],
      ['Collection', `${collectionCount(state)} / ${collectionTotal()}`],
      ['Biggest catch', s.biggest ? `${FISH_BY_ID[s.biggest]?.name || '?'} (${s.biggestWeight} kg)` : '—'],
    ];

    let y = p.bodyY;
    for (const [label, value] of rows) {
      drawText(ctx, label, p.x + 22, y, { color: THEME.inkSoft, size: 15, weight: 600 });
      drawText(ctx, String(value), colSplit - 34, y, {
        color: THEME.ink, align: 'right', size: 15, weight: 800,
      });
      y += 27;
    }

    // Right column — upgrades.
    const rx = colSplit + 4;
    drawText(ctx, 'UPGRADES', rx, p.bodyY, { color: THEME.goldDark, size: 15, weight: 900 });
    let ry = p.bodyY + 30;
    for (const key of Object.keys(UPGRADES)) {
      const up = UPGRADES[key];
      const lvl = state.upgrades[key];
      drawText(ctx, up.name, rx, ry, { color: THEME.inkSoft, size: 14, weight: 600 });
      drawText(ctx, `Lv ${lvl}`, rx, ry + 19, { color: THEME.ink, size: 13, weight: 800 });
      drawText(ctx, up.levels[lvl].label, p.x + p.w - 24, ry + 12, {
        color: THEME.inkSoft, align: 'right', size: 13, weight: 700,
      });
      ry += 40;
    }

    drawText(ctx, 'TAB / ESC: CLOSE', W / 2, H - 26, {
      color: '#ffffff', align: 'center', size: 15, weight: 700,
      shadow: 'rgba(0,0,0,0.6)', shadowOffset: 2,
    });
  }

  renderMessagePopup() {
    const ctx = this.ctx;
    const { title, body, color } = this.popup;
    const w = Math.min(448, W - 60), h = 156;
    const x = Math.round((W - w) / 2);
    const y = Math.round(H * 0.30);

    const inner = woodPanel(ctx, x, y, w, h, { body: THEME.parch, radius: 14 });
    titleBanner(ctx, inner.x, inner.y, inner.w, 42, title);
    drawText(ctx, title, inner.x + inner.w / 2, inner.y + 10, {
      color: color && color !== THEME.gold ? '#7a2418' : '#3a2410',
      align: 'center', size: 24, weight: 900,
      shadow: 'rgba(255,235,190,0.55)', shadowOffset: 2,
    });

    const lines = wrapText(body || '', w - 60, 15);
    lines.slice(0, 3).forEach((line, i) => {
      drawText(ctx, line, inner.x + inner.w / 2, inner.y + 62 + i * 22, {
        color: THEME.inkSoft, align: 'center', size: 15, weight: 600,
      });
    });
    drawText(ctx, 'CLICK TO CONTINUE', inner.x + inner.w / 2, inner.y + inner.h - 26, {
      color: THEME.goldDark, align: 'center', size: 14, weight: 800,
    });
  }

  renderIntro() {
    const ctx = this.ctx;
    const t = this.introTime;

    // The horizon sits at 56% of the height, so the sky and the sea keep
    // their proportions on any window shape.
    const horizon = Math.round(H * 0.56);

    // Sky.
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, '#2f92df');
    skyGrad.addColorStop(0.6, '#5cb6ea');
    skyGrad.addColorStop(1, '#a8dcf5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizon);

    // Sun — off to the right so it does not sit behind the title.
    const sunX = Math.round(W * 0.78);
    const sunY = Math.round(H * 0.17) + Math.sin(t * 0.6) * 4;
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 170);
    glow.addColorStop(0, 'rgba(255,232,150,0.6)');
    glow.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe89a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();

    // Sea.
    const seaGrad = ctx.createLinearGradient(0, horizon, 0, H);
    seaGrad.addColorStop(0, '#2f9fd6');
    seaGrad.addColorStop(1, '#0d4680');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, horizon, W, H - horizon);

    // Waves.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const y = horizon + 20 + i * Math.round((H - horizon) / 8);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const v = Math.sin(x / 60 + t * 1.6 + i);
        if (x === 0) ctx.moveTo(x, y + v * 6); else ctx.lineTo(x, y + v * 6);
      }
      ctx.stroke();
    }

    // Title plaque — a carved wooden sign hung over the sky.
    const bob = Math.round(Math.sin(t * 2) * 4);
    const plaqueW = Math.min(584, W - 60), plaqueH = 108;
    const plaqueX = Math.round((W - plaqueW) / 2);
    const plaqueY = Math.round(H * 0.055) + bob;
    const inner = woodPanel(ctx, plaqueX, plaqueY, plaqueW, plaqueH, { body: '#3d2513', radius: 16 });

    drawText(ctx, 'PIXEL FISHING', inner.x + inner.w / 2, inner.y + 14, {
      color: '#ffd45e', align: 'center', size: 46, weight: 900,
      shadow: 'rgba(20,10,2,0.9)', shadowOffset: 3,
    });
    drawText(ctx, 'ONE MORE CAST!', inner.x + inner.w / 2, inner.y + 68, {
      color: '#fdf3d8', align: 'center', size: 24, weight: 800,
      shadow: 'rgba(20,10,2,0.9)', shadowOffset: 2,
    });

    // The rig sits off to the left so nothing overlaps it.
    drawRigIntro(ctx, Math.round(W * 0.08) + Math.round(Math.sin(t * 0.5) * 12),
      Math.round(H * 0.78));

    // Instructions.
    const boxW = Math.min(536, W - 60), boxH = 124;
    const bx = Math.round((W - boxW) / 2);
    const by = Math.round(H * 0.65);
    const inner2 = woodPanel(ctx, bx, by, boxW, boxH, { body: THEME.parch, radius: 14 });

    const lines = [
      'Cast, catch, sell, upgrade, explore.',
      'Hold to reel — keep the tension in the green.',
      'Watch out. The ocean has a sense of humour.',
    ];
    lines.forEach((l, i) => {
      drawText(ctx, l, inner2.x + inner2.w / 2, inner2.y + 20 + i * 28, {
        color: THEME.ink, align: 'center', size: 17, weight: 700,
      });
    });

    const pulse = 0.72 + Math.sin(t * 3) * 0.28;
    const startText = 'CLICK OR PRESS SPACE TO START';
    const sw = textWidth(startText, 18, 800) + 56;
    const sx = Math.round((W - sw) / 2);
    ctx.save();
    ctx.globalAlpha = pulse;
    shadowRect(ctx, sx, by + boxH + 18, sw, 42, 'rgba(20,10,2,0.9)', 4, 14);
    roundRect(ctx, sx, by + boxH + 18, sw, 42, 14, '#3f9d43');
    roundRectStroke(ctx, sx, by + boxH + 18, sw, 42, 14, '#25591f', 2);
    ctx.fillStyle = 'rgba(255,255,255,0.26)';
    roundRect(ctx, sx + 5, by + boxH + 22, sw - 10, 12, 6, 'rgba(255,255,255,0.26)');
    drawText(ctx, startText, sx + sw / 2, by + boxH + 27, {
      color: '#ffffff', align: 'center', size: 18, weight: 800,
    });
    ctx.restore();
  }

  // ------------------------------------------------------------- purchases

  buyUpgrade(track) {
    const up = UPGRADES[track];
    const lvl = this.state.upgrades[track];
    if (lvl >= up.levels.length - 1) return;
    const next = up.levels[lvl + 1];
    if (this.state.coins < next.cost) {
      audio.denied();
      this.showHint(`Not enough coins for ${up.name} Lv ${lvl + 1}.`, 2);
      return;
    }
    this.state.coins -= next.cost;
    this.state.upgrades[track] = lvl + 1;
    audio.buy();
    this.pushLog(`${up.name} upgraded to Lv ${lvl + 1}`, '#ffd45e');
    this.save();
  }
}

function state_unlocked(state, id) {
  return state.unlocked.includes(id);
}

/**
 * Shared layout for the travel list so hit-testing and drawing agree.
 * A function, not a constant — the viewport can change at any time.
 *
 * The panel is sized to its content (five rows) so it does not stretch into
 * a tall empty box on a big screen.
 */
export function travelPanel() {
  const w = Math.min(440, Math.max(320, Math.round(W * 0.42)));
  const rowH = 72;
  const gap = 8;
  const listH = LOCATIONS.length * (rowH + gap);
  const h = Math.min(H - 110, listH + 74);
  return { x: 40, y: 58, w, h: Math.max(240, h) };
}

/**
 * The rig + angler on the intro screen, in the same vector style as the
 * fishing scene.
 */
function drawRigIntro(ctx, x, y) {
  const bob = Math.sin(performance.now() / 900) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  // Gentle rocking.
  ctx.rotate(Math.sin(performance.now() / 1100) * 0.03);

  drawOilRig(ctx, 0, 0, 0, performance.now() / 1000);
  drawFisherman(ctx, 34, -44, 0, 1);
  drawRod(ctx, 44, -38, 46, 0);

  ctx.restore();
}
