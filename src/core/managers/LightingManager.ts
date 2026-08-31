import Phaser from "phaser";

export interface FlickerConfig {
  /** Fraction of base intensity the flicker can swing by, e.g. 0.25 = ±25%. */
  intensityJitter: number;
  /** Fraction of base radius the flicker can swing by. */
  radiusJitter?: number;
  /** How often (ms) a new random flicker target is picked. */
  changeEveryMs?: [number, number];
}

export interface ColorCycleConfig {
  /** Colors to cycle through, in order, looping back to the first. At least 2. */
  colors: number[];
  /** Time (ms) to complete one full loop through every color. */
  periodMs: number;
}

interface LightHandle {
  light: Phaser.GameObjects.Light;
  baseRadius: number;
  baseIntensity: number;
  enabled: boolean;
  flicker?: FlickerConfig;
  flickerCurrent: number;
  flickerTarget: number;
  nextChangeAt: number;
  colorCycle?: ColorCycleConfig;
  currentColor: number;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/**
 * Thin wrapper around Phaser's Light2D pipeline that adds the things a
 * game actually needs on top of it: named/toggleable lights, organic
 * flicker, and a `getLightLevelAt` query. That query is deliberately
 * generic — today it only drives the "in light / in shadow" HUD read-out,
 * but it's written so a future stealth/detection system (zombies seeing
 * the player better in lit areas) can call the exact same function.
 */
export class LightingManager {
  private scene: Phaser.Scene;
  private lightsById = new Map<string, LightHandle>();
  private ambientLevel = 0.15;

  constructor(scene: Phaser.Scene, ambientColor = 0x14141f, ambientLevel = 0.15) {
    this.scene = scene;
    scene.lights.enable();
    this.setAmbient(ambientColor, ambientLevel);
  }

  /** `level` is our own 0..1 estimate of ambient brightness, used by getLightLevelAt (Phaser doesn't expose one). */
  setAmbient(color: number, level: number): void {
    this.scene.lights.setAmbientColor(color);
    this.ambientLevel = Phaser.Math.Clamp(level, 0, 1);
  }

  /** Opt a game object into Light2D shading. Call this on every sprite/tile layer that should react to light. */
  makeLit(obj: { setPipeline: (key: string) => unknown }): void {
    obj.setPipeline("Light2D");
  }

  addLight(
    id: string,
    x: number,
    y: number,
    radius: number,
    color: number,
    intensity: number,
    flicker?: FlickerConfig,
    colorCycle?: ColorCycleConfig,
  ): void {
    const light = this.scene.lights.addLight(x, y, radius, color, intensity);
    this.lightsById.set(id, {
      light,
      baseRadius: radius,
      baseIntensity: intensity,
      enabled: true,
      flicker,
      flickerCurrent: 1,
      flickerTarget: 1,
      nextChangeAt: 0,
      colorCycle,
      currentColor: colorCycle ? colorCycle.colors[0] : color,
    });
  }

  setPosition(id: string, x: number, y: number): void {
    this.lightsById.get(id)?.light.setPosition(x, y);
  }

  setEnabled(id: string, enabled: boolean): void {
    const h = this.lightsById.get(id);
    if (!h) return;
    h.enabled = enabled;
    h.light.setIntensity(enabled ? h.baseIntensity * h.flickerCurrent : 0);
  }

  isEnabled(id: string): boolean {
    return this.lightsById.get(id)?.enabled ?? false;
  }

  remove(id: string): void {
    const h = this.lightsById.get(id);
    if (h) {
      this.scene.lights.removeLight(h.light);
      this.lightsById.delete(id);
    }
  }

  update(time: number, delta: number): void {
    for (const h of this.lightsById.values()) {
      if (!h.enabled) continue;

      if (h.flicker) {
        if (time >= h.nextChangeAt) {
          const jitter = h.flicker.intensityJitter;
          h.flickerTarget = 1 - jitter + Math.random() * jitter * 2;
          const [lo, hi] = h.flicker.changeEveryMs ?? [70, 180];
          h.nextChangeAt = time + lo + Math.random() * (hi - lo);
        }

        // exponential smoothing toward target — a random walk reads as an
        // organic flicker, a pure sine wave reads as a mechanical pulse
        const rate = 1 - Math.pow(0.001, delta / 1000);
        h.flickerCurrent += (h.flickerTarget - h.flickerCurrent) * rate;

        h.light.setIntensity(h.baseIntensity * h.flickerCurrent);
        if (h.flicker.radiusJitter) {
          h.light.setRadius(h.baseRadius * (1 - h.flicker.radiusJitter + h.flickerCurrent * h.flicker.radiusJitter));
        }
      }

      if (h.colorCycle) {
        const n = h.colorCycle.colors.length;
        const segmentMs = h.colorCycle.periodMs / n;
        const t = (time % h.colorCycle.periodMs) / segmentMs;
        const idx = Math.floor(t) % n;
        const nextIdx = (idx + 1) % n;
        const color = lerpColor(h.colorCycle.colors[idx], h.colorCycle.colors[nextIdx], t - Math.floor(t));
        h.currentColor = color;
        h.light.setColor(color);
      }
    }
  }

  /** The light's current color — meaningful mainly for a colorCycle light, so a matching sprite can be tinted in sync (see the lava lamp). */
  getCurrentColor(id: string): number | undefined {
    return this.lightsById.get(id)?.currentColor;
  }

  /**
   * Rough 0..1 illumination estimate at a world point: ambient floor plus
   * linear falloff contribution from every enabled light in range.
   * Intentionally cheap (no shadow occlusion) — good enough for a HUD
   * read-out and, later, for scaling enemy detection range.
   */
  getLightLevelAt(x: number, y: number): number {
    let level = this.ambientLevel;
    for (const h of this.lightsById.values()) {
      if (!h.enabled) continue;
      const dx = h.light.x - x;
      const dy = h.light.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= h.light.radius) continue;
      const falloff = 1 - dist / h.light.radius;
      level += falloff * h.flickerCurrent * (h.baseIntensity / 1.4);
    }
    return Phaser.Math.Clamp(level, 0, 1);
  }

  destroy(): void {
    for (const h of this.lightsById.values()) this.scene.lights.removeLight(h.light);
    this.lightsById.clear();
  }
}
