import Phaser from "phaser";
import { DEPTH } from "@/config/constants";

/**
 * A burst of small colored squares flung outward from a hit point — blood
 * (red, short-lived, a touch of gravity) and spark/debris pixels (bright,
 * quicker, wider spread) together read as a weapon actually connecting.
 * Scaled by `power` (a weapon's damage stat) so a heavy hit throws more
 * and further than a light one, not just the same burst every time.
 */
export function spawnImpactBurst(scene: Phaser.Scene, x: number, y: number, power: number): void {
  const bloodCount = 5 + power * 2;
  const sparkCount = 3 + power * 2;
  const depth = DEPTH.ACTOR_SORT_BASE + y + 50;

  for (let i = 0; i < bloodCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * (8 + power * 4);
    const size = 1 + Math.random() * 2;
    const p = scene.add.rectangle(x, y, size, size, 0x8a1c1c).setDepth(depth);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist + 3,
      alpha: 0,
      duration: 250 + Math.random() * 180,
      ease: "Cubic.easeOut",
      onComplete: () => p.destroy(),
    });
  }

  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 7 + Math.random() * (12 + power * 6);
    const size = 1 + Math.random() * 1.5;
    const color = Math.random() < 0.5 ? 0xfff2c0 : 0xe8e8e8;
    const p = scene.add.rectangle(x, y, size, size, color).setDepth(depth + 1);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      duration: 130 + Math.random() * 120,
      ease: "Cubic.easeOut",
      onComplete: () => p.destroy(),
    });
  }
}
