/**
 * The live viewport.
 *
 * The game fills the whole browser tab, so the logical size of the world
 * changes with the window. Every layout module imports `W` and `H` from
 * here — they are live bindings, so a resize is picked up automatically
 * without any module needing to be told about it.
 *
 * The scene is authored against a 960x540 reference frame and is scaled to
 * fit whatever space we actually have, so the art keeps its proportions on
 * any window shape.
 */

/** Minimum logical size — below this the UI gets unreadably cramped. */
export const MIN_W = 860;
export const MIN_H = 480;

/** The frame the scene and all art proportions were authored against. */
export const REF_W = 960;
export const REF_H = 540;

/**
 * The logical size of the viewport, in game units.
 *
 * These are live bindings: import them and you always see the current
 * value. Do not assign to them from another module — call
 * `setViewport()` instead.
 */
export let W = REF_W;
export let H = REF_H;

/** How much the reference frame is scaled to fit the viewport. */
export let scale = 1;

/** The device pixel ratio the surface was last sized for. */
export let dpr = 1;

/**
 * Recompute the logical viewport for a given CSS-pixel surface.
 *
 * @param {number} cssW  surface width in CSS pixels
 * @param {number} cssH  surface height in CSS pixels
 * @param {number} ratio device pixel ratio
 */
export function setViewport(cssW, cssH, ratio = 1) {
  dpr = ratio;
  // The logical size tracks the window closely, but is clamped so the UI
  // never collapses below a usable size.
  W = Math.max(MIN_W, Math.round(cssW));
  H = Math.max(MIN_H, Math.round(cssH));
  scale = Math.min(W / REF_W, H / REF_H);
}
