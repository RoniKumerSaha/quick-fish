/**
 * Pixel Fishing — entry point.
 * Wires the canvas, input, audio, game loop and the Game object together.
 */

import { Display, toggleFullscreen, isFullscreen } from './engine/display.js';
import { Input } from './engine/input.js';
import { Loop } from './engine/loop.js';
import { audio } from './engine/audio.js';
import { Game, SCREEN } from './game/screens.js';
import { saveStateNow } from './game/state.js';

/**
 * True when the page is being served from a local development server.
 *
 * Used to switch on the developer conveniences — everything unlocked, all
 * gear maxed — without them ever being present in a deployed build. The
 * check is on the *hostname*, so it cannot fire in production however the
 * site is reached.
 */
function isLocalDev() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

/**
 * Apply the developer save, if the dev helpers are present.
 *
 * The helpers live in `dev/`, which is excluded from git, so a deployed
 * site does not have them. The import is dynamic and guarded, which means
 * a production build simply skips it — there is nothing to disable and
 * nothing to leak.
 */
async function applyDevSave(game) {
  if (!isLocalDev()) return;
  try {
    const mod = await import('../dev/autounlock.js');
    mod.unlockEverything(game.state);
    // The intro screen is chosen when the Game is built, before the state
    // was unlocked, so put the player straight into the water.
    game.screen = SCREEN.FISHING;
    console.info('[dev] Everything unlocked.');
  } catch {
    // The dev folder is not present — nothing to do.
  }
}

export async function boot(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  const display = new Display(canvas);
  const input = new Input(canvas);
  const game = new Game(ctx, input);

  // Developer conveniences: everything unlocked, all gear maxed.
  // Only ever runs on localhost, and only if `dev/` is present.
  await applyDevSave(game);

  // The AudioContext can only start after a user gesture.
  const kickAudio = () => {
    audio.resume();
    audio.startMusic();
    audio.setMusicEnabled(game.state.settings.music);
    audio.setEnabled(game.state.settings.sfx);
  };
  const gestureOnce = (e) => {
    kickAudio();
    window.removeEventListener('pointerdown', gestureOnce);
    window.removeEventListener('keydown', gestureOnce);
  };
  window.addEventListener('pointerdown', gestureOnce);
  window.addEventListener('keydown', gestureOnce);

  // Pause the music when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.setMusicEnabled(false);
    } else {
      audio.setMusicEnabled(game.state.settings.music);
    }
  });

  // Save on exit.
  window.addEventListener('beforeunload', () => saveStateNow(game.state));

  // Fullscreen: the F key, or the button in the HUD.
  const goFullscreen = async () => {
    await toggleFullscreen();
    // The window metrics change when entering or leaving fullscreen.
    setTimeout(() => display.resize(), 60);
  };
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'f' || e.key === 'F') goFullscreen();
  });
  document.addEventListener('fullscreenchange', () => display.resize());

  game.onFullscreen = goFullscreen;
  game.isFullscreen = isFullscreen;

  // Expose a small debug surface (handy in the console).
  window.__pixelFishing = { game, input, audio, display, toggleFullscreen };

  const loop = new Loop(
    (dt) => game.update(dt),
    () => {
      game.render();
      input.endFrame();
    },
  );
  loop.start();

  // Hide the boot overlay.
  const bootEl = document.getElementById('boot');
  if (bootEl) bootEl.classList.add('hidden');

  return { game, input, audio, display, loop, ctx };
}
