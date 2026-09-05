import Phaser from "phaser";
import type { Player } from "@/core/entities/Player";
import type { Zombie } from "@/core/entities/Zombie";
import type { WeaponDef } from "@/core/combat/weapons";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { PropTex } from "@/gfx/props";
import { spawnImpactBurst } from "@/core/combat/impactFx";

const FACING_ANGLE_DEG: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };
const FACING_VECTOR: Record<string, { x: number; y: number }> = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
};
/** How far a thrust lunges forward, in world px, at full extension. */
const LUNGE_DISTANCE = 8;

/** Every pickup icon is drawn lying flat/horizontal, handle at the left edge (see props.ts) — reused as-is for the held/swung sprite, no separate art needed. */
const WEAPON_HELD_TEX: Record<string, string> = {
  cricket_bat: PropTex.BAT,
  knife: PropTex.KNIFE,
  crowbar: PropTex.CROWBAR,
  frying_pan: PropTex.FRYING_PAN,
  fire_poker: PropTex.FIRE_POKER,
};

/**
 * Right against Danny's own hip/hand, not out at arm's length — the grip
 * end (see getHeldSprite's origin) sits almost on top of this point,
 * so the weapon reads as gripped rather than floating beside him.
 * Player.setOrigin(0.5, 0.82) anchors him barely above his own feet
 * (PLAYER_H=24 → the anchor sits just ~4px above the sprite's bottom
 * edge), not centered — hand/waist height is a good ~10-16px *above*
 * that anchor, not the handful of px this used before, which is what
 * had the weapon reading as dragging near his feet instead of held.
 */
const HELD_OFFSET: Record<string, { x: number; y: number }> = {
  right: { x: 5, y: -13 },
  left: { x: -5, y: -13 },
  down: { x: 4, y: -10 },
  up: { x: -4, y: -16 },
};

/** Idle "held ready" tilt, added to the facing angle — lowers the tip a little rather than holding it dead level. */
const REST_TILT_DEG = 20;

function angleDiffDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return Math.abs(d);
}

const lastSwingAt = new WeakMap<Player, number>();
const heldSprites = new WeakMap<Player, Phaser.GameObjects.Image>();
const swingTweens = new WeakMap<Player, Phaser.Tweens.Tween>();
/** Live-mutated by an in-progress thrust tween; read every frame in positionHeldSprite so the lunge shows up while it's happening, not just at the angle. */
const lungeState = new WeakMap<Player, { amount: number }>();

function getLunge(player: Player): { amount: number } {
  let s = lungeState.get(player);
  if (!s) {
    s = { amount: 0 };
    lungeState.set(player, s);
  }
  return s;
}

function getHeldSprite(scene: Phaser.Scene, player: Player, texKey: string): Phaser.GameObjects.Image {
  let sprite = heldSprites.get(player);
  if (!sprite) {
    // Pivots right at the grip end (every weapon icon is drawn handle-first
    // at x=0) so it rotates like it's actually held there, not spinning
    // around its own middle.
    sprite = scene.add.image(player.x, player.y, texKey).setOrigin(0.05, 0.5);
    heldSprites.set(player, sprite);
  }
  return sprite;
}

function positionHeldSprite(sprite: Phaser.GameObjects.Image, player: Player): void {
  const offset = HELD_OFFSET[player.facing];
  const dir = FACING_VECTOR[player.facing];
  const lunge = lungeState.get(player)?.amount ?? 0;
  sprite.setPosition(player.x + offset.x + dir.x * lunge, player.y + offset.y + dir.y * lunge);
  sprite.setDepth(player.depth + 1);
  sprite.setFlipY(player.facing === "left" || player.facing === "up");
}

/**
 * Keeps Danny visibly holding whatever's equipped, resting near his hand.
 * Call once a frame from any scene that lets him fight. Position tracks the
 * player every single frame, swing or not — swingWeapon()'s tween only ever
 * owns the ANGLE (sweep/chop) or the lunge amount read back in here via
 * positionHeldSprite (thrust) — see swingTweens/lungeState below — so the
 * weapon can never get left behind mid-attack the way it did when position
 * was only ever set once, at the start of a swing.
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
  positionHeldSprite(sprite, player);

  if (swingTweens.has(player)) return;
  sprite.setAngle(FACING_ANGLE_DEG[player.facing] + REST_TILT_DEG);
}

/**
 * Swings the player's equipped weapon: a brief drawn arc for feedback, the
 * held sprite sweeping through that same arc, and a one-shot hit check
 * against whichever zombies are actually in range and within it. A
 * connecting hit also throws a knockback, a blood/spark burst, and — for
 * the heavier weapons — a touch of camera shake, all scaled by the
 * weapon's own damage so a crowbar reads as noticeably more powerful than
 * a knife lands, not just different numbers on a stats panel.
 * Player.facing is only ever one of the four cardinal directions (no finer
 * aim exists), so everything is centered on that.
 *
 * Gated by the weapon's own swingMs as a cooldown: without it, mashing the
 * key landed several hits a second no matter what the weapon's stats said.
 * A swing simply can't start again until the previous one's animation would
 * have finished. arcDegrees/swingMs differing per weapon (see weapons.ts)
 * already made each feel a little different; attackStyle goes further —
 * a thrust genuinely moves through space differently from a chop, not just
 * a faster or narrower version of the same sweep.
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

    swingTweens.get(player)?.stop();
    const lunge = getLunge(player);
    lunge.amount = 0; // a swing cut short mid-thrust must not leave the weapon stuck lunged forever

    if (weapon.attackStyle === "thrust") {
      // point straight down facing and lunge the whole sprite forward and
      // back — a stab, not a sweep, so it needs to move through POSITION
      // rather than angle (see positionHeldSprite's lunge read-back)
      sprite.setAngle(facingDeg);
      positionHeldSprite(sprite, player);
      const tween = scene.tweens.add({
        targets: lunge,
        amount: LUNGE_DISTANCE,
        duration: weapon.swingMs * 0.4,
        ease: "Cubic.easeOut",
        yoyo: true,
        hold: weapon.swingMs * 0.15,
        onComplete: () => swingTweens.delete(player),
      });
      swingTweens.set(player, tween);
    } else if (weapon.attackStyle === "chop") {
      // wound up further back than a sweep's own start, then commits down
      // and through — slow to leave, fast to land, reads as heavier
      sprite.setAngle(facingDeg - weapon.arcDegrees * 0.9);
      positionHeldSprite(sprite, player);
      const tween = scene.tweens.add({
        targets: sprite,
        angle: facingDeg + weapon.arcDegrees * 0.3,
        duration: weapon.swingMs,
        ease: "Cubic.easeIn",
        onComplete: () => swingTweens.delete(player),
      });
      swingTweens.set(player, tween);
    } else {
      sprite.setAngle(facingDeg - weapon.arcDegrees / 2);
      positionHeldSprite(sprite, player);
      const tween = scene.tweens.add({
        targets: sprite,
        angle: facingDeg + weapon.arcDegrees / 2,
        duration: weapon.swingMs,
        ease: "Back.Out",
        onComplete: () => swingTweens.delete(player),
      });
      swingTweens.set(player, tween);
    }
  }

  let hitAny = false;
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

    const zx = zombie.x;
    const zy = zombie.y;
    zombie.hit(weapon.damage, player.x, player.y);
    spawnImpactBurst(scene, zx, zy, weapon.damage);
    hitAny = true;
  }

  // A light punch of shake on a connecting heavy hit — light weapons stay
  // shake-free so it doesn't fatigue on every single tap.
  if (hitAny && weapon.damage >= 2) {
    scene.cameras.main.shake(90, 0.003);
  }
}
