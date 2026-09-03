import Phaser from "phaser";
import type { Player } from "@/core/entities/Player";
import type { Zombie } from "@/core/entities/Zombie";
import type { WeaponDef } from "@/core/combat/weapons";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";

const FACING_ANGLE_DEG: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };

function angleDiffDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return Math.abs(d);
}

/**
 * Swings the player's equipped weapon: a brief drawn arc for feedback, plus
 * a one-shot hit check against whichever zombies are actually in range and
 * within the arc. Player.facing is only ever one of the four cardinal
 * directions (no finer aim exists), so the arc is centered on that.
 */
export function swingWeapon(scene: Phaser.Scene, player: Player, weapon: WeaponDef, zombies: Zombie[]): void {
  AudioManager.playSfx(SfxKey.SWING, { volume: 0.55, rate: 0.9 + Math.random() * 0.2 });

  const facingDeg = FACING_ANGLE_DEG[player.facing];
  const g = scene.add.graphics();
  g.setPosition(player.x, player.y);
  g.setDepth(player.depth + 1);
  g.fillStyle(0xf0ece2, 0.5);
  g.slice(
    0,
    0,
    weapon.range,
    Phaser.Math.DegToRad(facingDeg - weapon.arcDegrees / 2),
    Phaser.Math.DegToRad(facingDeg + weapon.arcDegrees / 2),
    false,
  );
  g.fillPath();
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration: weapon.swingMs,
    onComplete: () => g.destroy(),
  });

  for (const zombie of zombies) {
    // Whether a non-aggressive zombie can actually be hit is zombie.hit()'s
    // own call (dormant obstacles are usually swing-proof, but a
    // house-defense zombie that's lost the player's light stays finishable
    // via alwaysHittable) — this only needs to rule out one already dead.
    if (zombie.state === "dead") continue;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, zombie.x, zombie.y);
    if (dist > weapon.range) continue;
    const angleToZombie = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(player.x, player.y, zombie.x, zombie.y));
    if (angleDiffDeg(angleToZombie, facingDeg) > weapon.arcDegrees / 2) continue;
    zombie.hit(weapon.damage);
  }
}
