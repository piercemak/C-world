import React, { useEffect, useMemo, useRef } from "react";
import { useSnow } from "./SnowContext.jsx";

class Vector2 {
  constructor(x, y) { this.x = x; this.y = y; }
}

const frand = (min, max) => min + Math.random() * (max - min);

export default function SnowOverlay() {
  const { snowEnabled } = useSnow();
  const canvasRef = useRef(null);

  // keep “engine” instance stable
  const engine = useMemo(() => {
    return {
      canvas: null,
      ctx: null,
      particles: [],
      running: false,
      rafId: null,
      frameTime: 0,

      // tweak here
      pAmount: 5000,
      pSize: [0.5, 1.5],
      pSwing: [0.1, 1],
      pSpeed: [40, 100],
      pAmplitude: [25, 50],

      resize(w, h) {
        if (!this.canvas) return;
        this.canvas.width = w;
        this.canvas.height = h;
      },

      init(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext("2d");
        this.resize(window.innerWidth, window.innerHeight);
        this._initParticles();
      },

      start() {
        if (!this.canvas || !this.ctx) return;
        this.running = true;
        this.frameTime = performance.now();
        this._loop();
      },

      stop() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
      },

      _initParticles() {
        this.particles.length = 0;

        for (let i = 0; i < this.pAmount; i++) {
          const origin = new Vector2(
            frand(0, this.canvas.width),
            frand(-this.canvas.height, 0)
          );

          const velocity = new Vector2(
            frand(this.pSwing[0], this.pSwing[1]),
            frand(this.pSpeed[0], this.pSpeed[1])
          );

          const size = frand(this.pSize[0], this.pSize[1]);
          const amplitude = frand(this.pAmplitude[0], this.pAmplitude[1]);

          this.particles.push({
            origin,
            position: new Vector2(origin.x, origin.y),
            velocity,
            size,
            amplitude,
            dx: Math.random() * 100,
            update(dt) {
              this.position.y += this.velocity.y * dt;
              this.dx += this.velocity.x * dt;
              this.position.x = this.origin.x + (this.amplitude * Math.sin(this.dx));
            },
          });
        }
      },

      _clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      },

      _update(dt) {
        for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];
          p.update(dt);

          if (p.position.y - p.size > this.canvas.height) {
            p.position.y = -p.size;
            p.position.x = p.origin.x = Math.random() * this.canvas.width;
            p.dx = Math.random() * 100;
          }
        }
      },

      _draw() {
        this.ctx.fillStyle = "rgb(255,255,255)";
        for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];
          this.ctx.fillRect(p.position.x, p.position.y, p.size, p.size);
        }
      },

      _loop() {
        if (!this.running) return;

        const now = performance.now();
        const dt = (now - this.frameTime) / 1000; // seconds
        this.frameTime = now;

        this._clear();
        this._update(dt);
        this._draw();

        this.rafId = requestAnimationFrame(() => this._loop());
      },
    };
  }, []);

  // enable/disable + cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
      // (optional) re-init particles on resize:
      engine._initParticles();
    };

    if (snowEnabled) {
      engine.init(canvas);
      engine.start();
      window.addEventListener("resize", handleResize);
    } else {
      engine.stop();
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.stop();
    };
  }, [snowEnabled, engine]);

  // If you want it to never block clicks:
  return (
    <canvas
      ref={canvasRef}
      id="particle_canvas"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 5, // set above background, below UI if needed
      }}
    />
  );
}
