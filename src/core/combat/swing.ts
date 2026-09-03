import Phaser from "phaser";
import type { Player } from "@/core/entities/Player";
import type { Zombie } from "@/core/entities/Zombie";
import type { WeaponDef } from "@/core/combat/weapons";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { PropTex } from "@/gfx/props";

const FACING_ANGLE_DEG: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };

/** Every pickup icon is drawn lying flat/horizontal, handle at the left edge (see props.ts) — reused as-is for the held/swung sprite, no separate art needed. */
const WEAPON_HELD_TEX: Record<string, string> = {
  cricket_bat: PropTex.BAT,
  knife: PropTex.KNIFE,
  crowbar: PropTex.CROWBAR,
  frying_pan: PropTex.FRYING_PAN,
  fire_poker: PropTex.FIRE_POKER,
};

/** Rough offset from Danny's feet-anchored origin to hand height, per facing. */
const HELD_OFFSET: Record<string, { x: number; y: number }> = {
  right: { x: 7, y: -9 },
  left: { x: -7, y: -9 },
  down: { x: 5, y: -6 },
  up: { x: -5, y: -11 },
};

function angleDiffDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return Math.abs(d);
}

const lastSwingAt = new WeakMap<Player, number>();
const heldSprites = new WeakMap<Player, Phaser.GameObjects.Image>();
const swingTweens = new WeakMap<Player, Phaser.Tweens.Tween>();

function getHeldSprite(scene: Phaser.Scene, player: Player, texKey: string): Phaser.GameObjects.Image {
  let sprite = heldSprites.get(player);
  if (!sprite) {
    // Pivots near the handle end, matching where every weapon icon's grip sits (x=0).
    sprite = scene.add.image(player.x, player.y, texKey).setOrigin(0.15, 0.5);
    heldSprites.set(player, sprite);
  }
  return sprite;
}

/**
 * Keeps Danny visibly holding whatever's equipped, resting near his hand.
 * Call once a frame from any scene that lets him fight. swingWeapon() takes
 * the same sprite over for the duration of an actual swing (see the tween
 * there), so this only repositions it between swings — it backs off on its
 * own while swingTweens has an entry for this player.
 */
export function updateHeldWeapon(scene: Phaser.Scene, player: Player, weapon: WeaponDef | null): void {
  if (!weapon) {
    heldSprites.get(player)?.setVisible(false);
    return;
  }
  const texKey = WEAPON_HELD_TEX[weapon.id];
  if (!texKey) return;

  const sprite = getHeldSprite(scene, player, texKey);
  if (sprite.texture.key !== texKey) sprite.setTexture(texKey);
  sprite.setVisible(true);
  sprite.setDepth(player.depth + 1);

  if (swingTweens.has(player)) return;

  const offset = HELD_OFFSET[player.facing];
  sprite.setPosition(player.x + offset.x, player.y + offset.y);
  sprite.setFlipY(player.facing === "left" || player.facing === "up");
  sprite.setAngle(FACING_ANGLE_DEG[player.facing] - 18);
}

/**
 * Swings the player's equipped weapon: a brief drawn arc for feedback, the
 * held sprite sweeping through that same arc, and a one-shot hit check
 * against whichever zombies are actually in range and within it.
 * Player.facing is only ever one of the four cardinal directions (no finer
 * aim exists), so everything is centered on that.
 *
 * Gated by the weapon's own swingMs as a cooldown: without it, mashing the
 * key landed several hits a second no matter what the weapon's stats said.
 * A swing simply can't start again until the previous one's animation would
 * have finished, and since arcDegrees/swingMs already differ per weapon
 * (see weapons.ts), that alone makes each one feel and read distinctly
 * different — no separate per-weapon animation code needed.
 */
export function swingWeapon(scene: Phaser.Scene, player: Player, weapon: WeaponDef, zombies: Zombie[]): void {
  const now = scene.time.now;
  const last = lastSwingAt.get(player) ?? -Infinity;
  if (now - last < weapon.swingMs) return;
  lastSwingAt.set(player, now);

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

  const texKey = WEAPON_HELD_TEX[weapon.id];
  if (texKey) {
    const sprite = getHeldSprite(scene, player, texKey);
    if (sprite.texture.key !== texKey) sprite.setTexture(texKey);
    sprite.setVisible(true);
    sprite.setDepth(player.depth + 1);
    const offset = HELD_OFFSET[player.facing];
    sprite.setPosition(player.x + offset.x, player.y + offset.y);
    sprite.setFlipY(player.facing === "left" || player.facing === "up");
    sprite.setAngle(facingDeg - weapon.arcDegrees / 2);

    swingTweens.get(player)?.stop();
    const tween = scene.tweens.add({
      targets: sprite,
      angle: facingDeg + weapon.arcDegrees / 2,
      duration: weapon.swingMs,
      ease: "Back.Out",
      onComplete: () => swingTweens.delete(player),
    });
    swingTweens.set(player, tween);
  }

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
