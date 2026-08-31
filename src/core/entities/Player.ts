import Phaser from "phaser";
import { playerAnimKey, playerTexKey, type Direction, type Outfit } from "@/gfx/playerSpriteGen";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { DEPTH } from "@/config/constants";

const SPEED = 62;
const FOOTSTEP_INTERVAL_MS = 300;

/** Getter-based so the scene can freely combine WASD + arrow keys behind it. */
export interface MoveInput {
  left(): boolean;
  right(): boolean;
  up(): boolean;
  down(): boolean;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  outfit: Outfit = "pajama";
  facing: Direction = "down";
  moving = false;
  private controlsEnabled = true;
  private footstepTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, playerTexKey("pajama", "down", "idle"));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.82);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 7);
    body.setOffset(3, 15);
    body.setCollideWorldBounds(true);

    this.play(playerAnimKey(this.outfit, this.facing, false));
  }

  setOutfit(outfit: Outfit): void {
    this.outfit = outfit;
    this.play(playerAnimKey(this.outfit, this.facing, this.moving), true);
  }

  setControlsEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
    if (!enabled) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.moving = false;
      this.play(playerAnimKey(this.outfit, this.facing, false), true);
    }
  }

  areControlsEnabled(): boolean {
    return this.controlsEnabled;
  }

  update(_time: number, delta: number, input: MoveInput): void {
    this.setDepth(DEPTH.ACTOR_SORT_BASE + this.y);

    if (!this.controlsEnabled) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    let vx = 0;
    let vy = 0;
    if (input.left()) vx -= 1;
    if (input.right()) vx += 1;
    if (input.up()) vy -= 1;
    if (input.down()) vy += 1;

    this.moving = vx !== 0 || vy !== 0;

    if (this.moving) {
      const len = Math.hypot(vx, vy) || 1;
      body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);

      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx > 0 ? "right" : "left";
      } else if (vy !== 0) {
        this.facing = vy > 0 ? "down" : "up";
      }

      this.footstepTimer -= delta;
      if (this.footstepTimer <= 0) {
        AudioManager.playSfx(SfxKey.FOOTSTEP, { volume: 0.5 });
        this.footstepTimer = FOOTSTEP_INTERVAL_MS;
      }
    } else {
      body.setVelocity(0, 0);
      this.footstepTimer = 0;
    }

    const key = playerAnimKey(this.outfit, this.facing, this.moving);
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
  }
}
