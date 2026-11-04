/**
 * Display handling.
 *
 * The game fills the whole browser tab: the canvas is sized to the window
 * in CSS pixels and backed at the device pixel ratio, so the vector art
 * stays sharp on any screen and there is no letterbox frame around it.
 */

import { setViewport } from './view.js';

export class Display {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this._onResize);
    }
    this.resize();
  }

  resize() {
    const stage = this.canvas.parentElement;
    const cssW = Math.max(1, stage ? stage.clientWidth : window.innerWidth);
    const cssH = Math.max(1, stage ? stage.clientHeight : window.innerHeight);
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));

    // The canvas fills the tab exactly — no letterboxing.
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    // The backing store matches the physical pixels, so nothing is blurry.
    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The logical viewport the game lays itself out in.
    setViewport(cssW, cssH, dpr);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this._onResize);
    }
  }
}

/**
 * Toggle the browser's fullscreen mode.
 *
 * @returns {Promise<boolean>} whether the game is now fullscreen
 */
export async function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return false;
    }
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
      return true;
    }
  } catch {
    // The browser refused (often needs a user gesture) — fall through.
  }
  return !!document.fullscreenElement;
}

/** Whether the page is currently in fullscreen. */
export function isFullscreen() {
  return !!document.fullscreenElement;
}
