import Phaser from "phaser";
import { dogAnimKey, dogTexKey, DOG_WAG_ANIM, type DogDirection } from "@/gfx/dogSpriteGen";
import { DEPTH } from "@/config/constants";

export type DogState = "sleeping" | "following" | "beingPet" | "returning";

const FOLLOW_SPEED = 78;
const FOLLOW_STOP_DISTANCE = 26;
const FOLLOW_RESUME_DISTANCE = 40;
const FOLLOW_DURATION_MS = 22000;
const PET_DURATION_MS = 1600;
const RETURN_ARRIVE_DISTANCE = 4;

/**
 * A loose, low-effort companion: sleeps in its bed until the player enters
 * the kitchen, tags along for a while (never blocking movement — no
 * collision with the player), can be pet, and eventually wanders back to
 * bed on its own. No pathfinding — it seeks in a straight line, which is
 * fine at this scale since it only ever has to retrace where the player
 * just walked.
 */
export class Dog extends Phaser.Physics.Arcade.Sprite {
  state: DogState = "sleeping";
  private readonly bedX: number;
  private readonly bedY: number;
  private facing: DogDirection = "down";
  private moving = false;
  private followTimer = 0;
  private petTimer = 0;

  constructor(scene: Phaser.Scene, bedX: number, bedY: number) {
    super(scene, bedX, bedY, dogTexKey("down", "idle"));
    this.bedX = bedX;
    this.bedY = bedY;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.75);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 7);
    body.setOffset(3, 5);
    body.setCollideWorldBounds(true);

    this.play(dogAnimKey("down", false));
  }

  isPettable(): boolean {
    return this.state === "following";
  }

  wake(): void {
    if (this.state !== "sleeping") return;
    this.state = "following";
    this.followTimer = FOLLOW_DURATION_MS;
  }

  pet(): void {
    if (this.state !== "following") return;
    this.state = "beingPet";
    this.petTimer = PET_DURATION_MS;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.moving = false;
    this.facing = "down";
    this.play(DOG_WAG_ANIM, true);
  }

  update(_time: number, delta: number, targetX: number, targetY: number): void {
    this.setDepth(DEPTH.ACTOR_SORT_BASE + this.y);
    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.state) {
      case "sleeping":
        body.setVelocity(0, 0);
        break;

      case "following": {
        this.followTimer -= delta;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
        const threshold = this.moving ? FOLLOW_STOP_DISTANCE : FOLLOW_RESUME_DISTANCE;
        if (dist > threshold) {
          this.moveToward(targetX, targetY, FOLLOW_SPEED);
        } else {
          body.setVelocity(0, 0);
          this.moving = false;
          this.updateAnim();
        }
        if (this.followTimer <= 0) this.state = "returning";
        break;
      }

      case "beingPet":
        this.petTimer -= delta;
        if (this.petTimer <= 0) this.state = "returning";
        break;

      case "returning": {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.bedX, this.bedY);
        if (dist <= RETURN_ARRIVE_DISTANCE) {
          body.setVelocity(0, 0);
          this.moving = false;
          this.setPosition(this.bedX, this.bedY);
          this.facing = "down";
          this.state = "sleeping";
          this.play(dogAnimKey("down", false), true);
        } else {
          this.moveToward(this.bedX, this.bedY, FOLLOW_SPEED);
        }
        break;
      }
    }
  }

  private moveToward(tx: number, ty: number, speed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / len) * speed, (dy / len) * speed);
    this.moving = true;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? "right" : "left";
    else this.facing = dy > 0 ? "down" : "up";
    this.updateAnim();
  }

  private updateAnim(): void {
    const key = dogAnimKey(this.facing, this.moving);
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
  }
}
