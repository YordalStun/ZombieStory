import Phaser from "phaser";
import { FigureTex } from "@/gfx/zombieFigure";
import { DEPTH } from "@/config/constants";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";

export type ZombieState = "dormant" | "aggressive" | "dead";

const CHASE_SPEED = 34;
const HIT_FLASH_MS = 110;
const MAX_HEALTH = 3;

export interface ZombieOptions {
  state?: ZombieState;
  health?: number;
}

/**
 * A dormant zombie is a solid, decorative obstacle only — no AI, it can't be
 * hurt and can't hurt the player. Several story beats need a zombie the
 * player walks past uneventfully before any real one shows up, so "does
 * nothing" has to be a first-class state here, not just "aggressive with
 * nothing in range". `wake()` is what turns one hostile.
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  state: ZombieState;
  health: number;
  private hitFlashTimer = 0;
  private idleSway?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ZombieOptions = {}) {
    super(scene, x, y, FigureTex.ZOMBIE);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.85);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(3, 20);
    body.setImmovable(true);

    this.health = opts.health ?? MAX_HEALTH;
    this.state = opts.state ?? "dormant";
    this.setDepth(DEPTH.ACTOR_SORT_BASE + y);
    this.startIdleSway();
  }

  /** Faint watching-you sway — reads as "alive" without implying a threat. */
  private startIdleSway(): void {
    this.idleSway = this.scene.tweens.add({
      targets: this,
      angle: { from: -1.5, to: 1.5 },
      duration: 1400 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Turns a dormant zombie hostile: it starts chasing and can now be hurt / hurt the player. */
  wake(): void {
    if (this.state !== "dormant") return;
    this.state = "aggressive";
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(false);
    this.idleSway?.stop();
    this.setAngle(0);
  }

  /** Returns true if this hit killed it. */
  hit(damage: number): boolean {
    if (this.state !== "aggressive") return false;
    this.health -= damage;
    this.hitFlashTimer = HIT_FLASH_MS;
    this.setTintFill(0xffffff);
    AudioManager.playSfx(SfxKey.BANG, { volume: 0.4 });
    AudioManager.playSfx(SfxKey.GROAN, { volume: 0.55, rate: 1.15 + Math.random() * 0.2 });
    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.state = "dead";
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: this.angle + 90,
      y: this.y + 4,
      duration: 450,
      delay: 150,
      onComplete: () => this.destroy(),
    });
  }

  /** Call every frame while aggressive; harmless no-op in any other state. */
  update(_time: number, delta: number, targetX: number, targetY: number): void {
    if (this.state === "dead") return;
    this.setDepth(DEPTH.ACTOR_SORT_BASE + this.y);

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) this.clearTint();
    }

    if (this.state !== "aggressive") return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / len) * CHASE_SPEED, (dy / len) * CHASE_SPEED);
  }
}
