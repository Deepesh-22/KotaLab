/*
 * HamburgerMorph — tiny, reusable SVG hamburger-to-X button controller.
 * No dependencies. Rapid toggles retarget the spring from its current position.
 */
(function (global) {
  "use strict";

  const mounted = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (from, to, value) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const lerp = (from, to, amount) => from + (to - from) * amount;

  class HamburgerMorphController {
    constructor(button, options = {}) {
      this.button = button;
      this.paths = {
        top: button.querySelector("[data-hamburger-part='top']"),
        middle: button.querySelector("[data-hamburger-part='middle']"),
        bottom: button.querySelector("[data-hamburger-part='bottom']"),
      };
      this.openLabel = options.openLabel || button.dataset.openLabel || "Open menu";
      this.closeLabel = options.closeLabel || button.dataset.closeLabel || "Close menu";
      this.onChange = typeof options.onChange === "function" ? options.onChange : null;
      this.expanded = button.getAttribute("aria-expanded") === "true";
      this.target = this.expanded ? 1 : 0;
      this.progress = this.target;
      this.velocity = 0;
      this.frame = 0;
      this.lastTime = 0;
      this.motionQuery = global.matchMedia("(prefers-reduced-motion: reduce)");

      this.clickHandler = () => this.setExpanded(!this.expanded);
      this.motionHandler = (event) => {
        if (event.matches) {
          this.cancelFrame();
          this.progress = this.target;
          this.velocity = 0;
          this.render();
        }
      };

      button.setAttribute("aria-expanded", String(this.expanded));
      button.setAttribute("aria-label", this.expanded ? this.closeLabel : this.openLabel);
      button.addEventListener("click", this.clickHandler);
      if (this.motionQuery.addEventListener) {
        this.motionQuery.addEventListener("change", this.motionHandler);
      } else if (this.motionQuery.addListener) {
        this.motionQuery.addListener(this.motionHandler);
      }
      this.render();
    }

    setExpanded(expanded) {
      const next = Boolean(expanded);
      if (next === this.expanded) return;

      this.expanded = next;
      this.target = next ? 1 : 0;
      this.button.setAttribute("aria-expanded", String(next));
      this.button.setAttribute("aria-label", next ? this.closeLabel : this.openLabel);

      if (this.motionQuery.matches) {
        this.cancelFrame();
        this.progress = this.target;
        this.velocity = 0;
        this.render();
      } else {
        this.lastTime = 0;
        this.startFrame();
      }

      if (this.onChange) this.onChange(next);
    }

    startFrame() {
      if (!this.frame) this.frame = global.requestAnimationFrame((time) => this.tick(time));
    }

    cancelFrame() {
      if (this.frame) global.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }

    tick(time) {
      this.frame = 0;
      const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.032) : 1 / 60;
      this.lastTime = time;

      // Damped spring: ~450 ms travel with a small, controlled settling overshoot.
      const acceleration = (this.target - this.progress) * 360 - this.velocity * 32;
      this.velocity += acceleration * dt;
      this.progress += this.velocity * dt;
      this.render();

      if (Math.abs(this.target - this.progress) < 0.001 && Math.abs(this.velocity) < 0.012) {
        this.progress = this.target;
        this.velocity = 0;
        this.render();
        this.lastTime = 0;
        return;
      }
      this.startFrame();
    }

    curve(start, end, amount, bendSign) {
      // The endpoints also sweep along shallow arcs, not just the curve controls.
      const sweep = Math.sin(Math.PI * amount) * 2.2;
      const sx = lerp(start[0], end[0], amount);
      const sy = lerp(start[1], end[1], amount) - sweep * bendSign * 0.35;
      const ex = lerp(start[2], end[2], amount);
      const ey = lerp(start[3], end[3], amount) + sweep * bendSign * 0.35;
      const dx = ex - sx;
      const dy = ey - sy;
      const length = Math.hypot(dx, dy) || 1;
      const bend = Math.sin(Math.PI * amount) * 5.5 * bendSign;
      const nx = (-dy / length) * bend;
      const ny = (dx / length) * bend;
      const c1x = sx + dx * 0.32 + nx;
      const c1y = sy + dy * 0.32 + ny;
      const c2x = sx + dx * 0.68 + nx;
      const c2y = sy + dy * 0.68 + ny;

      return `M ${sx.toFixed(3)} ${sy.toFixed(3)} C ${c1x.toFixed(3)} ${c1y.toFixed(3)}, ${c2x.toFixed(3)} ${c2y.toFixed(3)}, ${ex.toFixed(3)} ${ey.toFixed(3)}`;
    }

    render() {
      if (!this.paths.top || !this.paths.middle || !this.paths.bottom) return;
      const p = this.progress;
      this.paths.top.setAttribute("d", this.curve([8, 11, 32, 11], [10, 10, 30, 30], p, 1));
      this.paths.bottom.setAttribute("d", this.curve([8, 29, 32, 29], [10, 30, 30, 10], p, -1));

      const middleScale = 1 - smoothstep(0.06, 0.96, p);
      const middleHalf = 10 * middleScale;
      this.paths.middle.setAttribute("d", `M ${(20 - middleHalf).toFixed(3)} 20 H ${(20 + middleHalf).toFixed(3)}`);
      this.paths.middle.style.opacity = String(1 - smoothstep(0.08, 0.7, p));
    }

    destroy() {
      this.cancelFrame();
      this.button.removeEventListener("click", this.clickHandler);
      if (this.motionQuery.removeEventListener) {
        this.motionQuery.removeEventListener("change", this.motionHandler);
      } else if (this.motionQuery.removeListener) {
        this.motionQuery.removeListener(this.motionHandler);
      }
      mounted.delete(this.button);
    }
  }

  function mount(button, options) {
    if (!button || !button.matches || !button.matches("button")) {
      throw new TypeError("HamburgerMorph.mount expects a button element.");
    }
    if (mounted.has(button)) return mounted.get(button);
    const controller = new HamburgerMorphController(button, options);
    mounted.set(button, controller);
    return controller;
  }

  global.HamburgerMorph = { mount };
})(window);
