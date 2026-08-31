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
      // starts at the top of the pane and travels only far enough to reach the
      // bottom of it — the old speed/lifespan let drops fall well past the sill
      // and read as rain inside the room instead of trickling down the glass.
      const e = scene.add.particles(0, 0, FxTex.RAIN_DROP, {
        x: { min: w.x - 6, max: w.x + 6 },
        y: { min: w.y - 8, max: w.y - 4 },
        lifespan: 480,
        speedY: { min: 20, max: 30 },
        speedX: { min: -3, max: 3 },
        alpha: { start: 0.75, end: 0 },
        scale: { min: 0.7, max: 1.1 },
        quantity: 1,
        frequency: 150,
      });
      // sits at the wall/glass plane, not above the whole room — anything in
      // front of the window (furniture, the player) now correctly occludes it.
      this.track(e, DEPTH.WALL + 1);
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

  private track(e: Phaser.GameObjects.Particles.ParticleEmitter, depth: number = DEPTH.WEATHER): void {
    e.setDepth(depth);
    this.emitters.push(e);
  }

  destroy(): void {
    for (const e of this.emitters) e.destroy();
    this.emitters = [];
  }
}
