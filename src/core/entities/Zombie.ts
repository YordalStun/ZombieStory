import Phaser from "phaser";
import { FigureTex } from "@/gfx/zombieFigure";
import { DEPTH } from "@/config/constants";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";

export type ZombieState = "dormant" | "aggressive" | "dead";

const CHASE_SPEED = 34;
const HIT_FLASH_MS = 110;
const MAX_HEALTH = 3;
/** Matches the HUD's own "DIM LIGHT" boundary (see HUDUI.ts) — attracted to light means even dim light should register, not just fully lit. */
const AGGRO_LIGHT_THRESHOLD = 0.32;

export interface ZombieOptions {
  state?: ZombieState;
  health?: number;
  /**
   * House-defense zombies only: hit() still works even while dormant/calm,
   * so the player can finish off a zombie they've cornered even after it's
   * lost track of them in the dark. Everywhere else an un-woken zombie is
   * a pure obstacle, deliberately not interactive either way.
   */
  alwaysHittable?: boolean;
}

/** Passed to update() to drive continuous light+proximity aggro instead of the simple one-way wake(). Omit entirely for the existing always-on/never-on scenes — nothing changes for them. */
export interface AggroGate {
  lightLevel: number;
  range: number;
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
  private alwaysHittable: boolean;

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
    this.alwaysHittable = opts.alwaysHittable ?? false;
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

  /**
   * Reverses wake(): loses the player (out of light or range) and settles
   * back to a calm, idle stance. Only ever called by the continuous
   * AggroGate check in update() — nothing else needs a woken zombie to
   * stand back down.
   */
  private calm(): void {
    if (this.state !== "aggressive") return;
    this.state = "dormant";
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setImmovable(true);
    this.startIdleSway();
  }

  /** Returns true if this hit killed it. */
  hit(damage: number): boolean {
    if (this.state === "dead") return false;
    if (this.state === "dormant" && !this.alwaysHittable) return false;
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

  /**
   * Call every frame. `aggroGate`, when passed, re-evaluates every frame
   * instead of relying on a one-way wake(): close enough AND the target is
   * standing somewhere lit wakes it, and losing either condition calms it
   * back down — "attracted to light" as a continuous state, not a single
   * trigger. Omit it entirely for the simple always-on/never-on scenes
   * (HomeArrivalScene, LeaveBuildingScene) — they're unaffected either way.
   */
  update(_time: number, delta: number, targetX: number, targetY: number, aggroGate?: AggroGate): void {
    if (this.state === "dead") return;
    this.setDepth(DEPTH.ACTOR_SORT_BASE + this.y);

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) this.clearTint();
    }

    if (aggroGate) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const shouldChase = dist <= aggroGate.range && aggroGate.lightLevel >= AGGRO_LIGHT_THRESHOLD;
      if (shouldChase) this.wake();
      else this.calm();
    }

    if (this.state !== "aggressive") return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / len) * CHASE_SPEED, (dy / len) * CHASE_SPEED);
  }
}
