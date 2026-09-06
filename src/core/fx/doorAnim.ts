import Phaser from "phaser";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";

/**
 * Every door in the game used to "open" by having its collision quietly
 * disabled underneath a sprite that just kept sitting there looking shut —
 * walkable, but visually still a closed door forever. This gives it an
 * actual swing: foreshortens and tilts open, holds, then swings back shut,
 * with the door SFX timed to the swing rather than fired in isolation.
 */
export function playDoorOpen(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image,
  opts: { holdMs?: number; swingMs?: number } = {},
): Promise<void> {
  const swingMs = opts.swingMs ?? 260;
  const holdMs = opts.holdMs ?? 900;
  AudioManager.playSfx(SfxKey.DOOR, { volume: 0.55 });

  return new Promise((resolve) => {
    scene.tweens.add({
      targets: sprite,
      scaleX: 0.25,
      angle: 12,
      alpha: 0.85,
      duration: swingMs,
      ease: "Cubic.easeOut",
      onComplete: () => {
        scene.time.delayedCall(holdMs, () => {
          scene.tweens.add({
            targets: sprite,
            scaleX: 1,
            angle: 0,
            alpha: 1,
            duration: swingMs,
            ease: "Cubic.easeIn",
            onComplete: () => resolve(),
          });
        });
      },
    });
  });
}
