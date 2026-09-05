import Phaser from "phaser";
import { DEPTH } from "@/config/constants";

/**
 * A burst of small colored squares flung outward from a hit point — blood
 * (red, short-lived, a touch of gravity) and spark/debris pixels (bright,
 * quicker, wider spread) together read as a weapon actually connecting.
 * Scaled by `power` (a weapon's damage stat) so a heavy hit throws more
 * and further than a light one, not just the same burst every time.
 *
 * Most of this game's combat happens in rooms with the lights out on
 * purpose (see LightingManager) — an opaque 1-2px square barely registers
 * against a dark floor. The flash and the spark pixels below are additive
 * blended specifically so they still read as a bright hit even in a
 * near-black room, rather than only showing up in a lit one.
 */
export function spawnImpactBurst(scene: Phaser.Scene, x: number, y: number, power: number): void {
  const bloodCount = 6 + power * 3;
  const sparkCount = 4 + power * 3;
  const depth = DEPTH.ACTOR_SORT_BASE + y + 50;

  // an instant bright pop at the hit point, gone almost immediately — the
  // "something just connected" flash, on top of everything else below
  const flash = scene.add.circle(x, y, 3 + power * 1.5, 0xffffff, 0.9).setDepth(depth + 2);
  flash.setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: flash,
    scale: 2.4,
    alpha: 0,
    duration: 90 + power * 15,
    ease: "Cubic.easeOut",
    onComplete: () => flash.destroy(),
  });

  for (let i = 0; i < bloodCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * (10 + power * 5);
    const size = 1.5 + Math.random() * 2.5;
    const p = scene.add.rectangle(x, y, size, size, 0xb02222).setDepth(depth);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist + 3,
      alpha: 0,
      duration: 280 + Math.random() * 200,
      ease: "Cubic.easeOut",
      onComplete: () => p.destroy(),
    });
  }

  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 9 + Math.random() * (16 + power * 8);
    const size = 1.5 + Math.random() * 2;
    const color = Math.random() < 0.5 ? 0xfff2c0 : 0xdff4ff;
    const p = scene.add.rectangle(x, y, size, size, color).setDepth(depth + 1);
    p.setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      duration: 160 + Math.random() * 160,
      ease: "Cubic.easeOut",
      onComplete: () => p.destroy(),
    });
  }
}
