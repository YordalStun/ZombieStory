import Phaser from "phaser";
import { FxTex } from "@/gfx/fx";
import { DEPTH } from "@/config/constants";

export interface RainZone {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A gloomy-morning rain effect built from three particle layers:
 * proper falling rain across the outdoor zone, a small trickle confined to
 * each window (so rain hitting the glass reads from indoors too), and
 * occasional drips falling off tree/bush foliage. Nothing here is lit by
 * Light2D — rain reads better as a constant weather layer than something
 * that goes pitch black in shadow.
 */
export class RainEffect {
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(scene: Phaser.Scene, outdoorZone: RainZone, windows: Point[], plants: Point[]) {
    const outdoor = scene.add.particles(0, 0, FxTex.RAIN_STREAK, {
      x: { min: outdoorZone.xMin, max: outdoorZone.xMax },
      y: { min: outdoorZone.yMin, max: outdoorZone.yMax },
      lifespan: 650,
      speedY: { min: 260, max: 340 },
      speedX: { min: -30, max: -10 },
      scaleY: { min: 0.8, max: 1.3 },
      alpha: { start: 0.5, end: 0.15 },
      quantity: 2,
      frequency: 26,
    });
    this.track(outdoor);

    for (const w of windows) {
      const e = scene.add.particles(0, 0, FxTex.RAIN_DROP, {
        x: { min: w.x - 6, max: w.x + 6 },
        y: { min: w.y - 2, max: w.y + 3 },
        lifespan: 500,
        speedY: { min: 40, max: 75 },
        speedX: { min: -4, max: 4 },
        alpha: { start: 0.75, end: 0 },
        scale: { min: 0.7, max: 1.1 },
        quantity: 1,
        frequency: 170,
      });
      this.track(e);
    }

    const freqs = [2000, 2400, 2800, 3200];
    plants.forEach((p, i) => {
      const e = scene.add.particles(0, 0, FxTex.RAIN_DROP, {
        x: { min: p.x - 7, max: p.x + 7 },
        y: p.y,
        lifespan: 380,
        speedY: { min: 30, max: 55 },
        speedX: { min: -6, max: 6 },
        alpha: { start: 0.6, end: 0 },
        scale: { min: 0.5, max: 0.85 },
        quantity: 1,
        frequency: freqs[i % freqs.length],
      });
      this.track(e);
    });
  }

  private track(e: Phaser.GameObjects.Particles.ParticleEmitter): void {
    e.setDepth(DEPTH.WEATHER);
    this.emitters.push(e);
  }

  destroy(): void {
    for (const e of this.emitters) e.destroy();
    this.emitters = [];
  }
}
