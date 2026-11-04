/**
 * Fixed-timestep game loop with an interpolated render pass.
 *
 * The simulation always advances in whole 1/60s steps so gameplay is
 * deterministic and frame-rate independent; rendering happens once per
 * animation frame.
 */

export class Loop {
  /**
   * @param {(dt:number)=>void} update
   * @param {(alpha:number)=>void} render
   */
  constructor(update, render, step = 1 / 60) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.frame = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
  }

  _tick(now) {
    if (!this.running) return;
    let delta = (now - this.last) / 1000;
    this.last = now;
    // Clamp huge deltas (tab was backgrounded) to avoid a simulation avalanche.
    if (delta > 0.25) delta = 0.25;

    this.acc += delta;
    let steps = 0;
    while (this.acc >= this.step && steps < 8) {
      this.update(this.step);
      this.acc -= this.step;
      steps++;
    }
    if (steps === 8) this.acc = 0;

    this.frame++;
    this.render(this.acc / this.step);
    requestAnimationFrame(this._tick);
  }
}
