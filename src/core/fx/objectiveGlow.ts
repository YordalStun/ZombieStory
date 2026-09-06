import Phaser from "phaser";

/**
 * A soft pulsing highlight ring around whatever prop satisfies the player's
 * current objective — a marker at the object itself, not just a line in the
 * sidebar checklist. Static (create once, toggle with setActive()) rather
 * than spawned per objective change, so scenes with a handful of these
 * don't churn tweens every time the checklist updates.
 */
export class ObjectiveGlow {
  private ring: Phaser.GameObjects.Rectangle;
  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, depth: number) {
    this.ring = scene.add.rectangle(x, y, w + 6, h + 6);
    this.ring.setStrokeStyle(2, 0xffe27a, 1);
    this.ring.setDepth(depth);
    this.ring.setVisible(false);
    this.tween = scene.tweens.add({
      targets: this.ring,
      alpha: { from: 0.25, to: 0.9 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      paused: true,
    });
  }

  setActive(active: boolean): void {
    if (this.ring.visible === active) return;
    this.ring.setVisible(active);
    if (active) this.tween.resume();
    else this.tween.pause();
  }

  destroy(): void {
    this.tween.stop();
    this.ring.destroy();
  }
}
