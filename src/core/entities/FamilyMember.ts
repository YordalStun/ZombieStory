import Phaser from "phaser";
import { Player, type MoveInput } from "@/core/entities/Player";

export type FamilyMemberPhase = "toSwitch" | "atSwitch" | "toExit" | "done";

const ARRIVE_DIST = 5;
const FLIP_PAUSE_MS = 900;

const HOLD_INPUT: MoveInput = { left: () => false, right: () => false, up: () => false, down: () => false };

/**
 * A family member "doing" their room's light: walks in from the doorway,
 * over to the switch, pauses to flip it, then walks back out and vanishes.
 * Reuses the Player class wholesale (tinted, driven by a synthetic MoveInput
 * that homes toward the current waypoint) so it gets fully animated,
 * correctly-facing walk cycles for free instead of new sprite/anim work.
 * Every waypoint pair here is two points inside the same convex rectangular
 * room, so a straight-line homing input never clips through a wall.
 */
export class FamilyMemberController {
  readonly player: Player;
  phase: FamilyMemberPhase = "toSwitch";
  private pauseTimer = 0;
  private target: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    spawn: { x: number; y: number },
    switchPos: { x: number; y: number },
    private readonly exitPos: { x: number; y: number },
    tint: number,
    private readonly onFlip: () => void,
    private readonly onDone: () => void,
  ) {
    this.player = new Player(scene, spawn.x, spawn.y);
    this.player.setOutfit("pajama");
    this.player.setTint(tint);
    this.target = switchPos;
  }

  get x(): number {
    return this.player.x;
  }

  get y(): number {
    return this.player.y;
  }

  /** False once they've flipped the switch and made it back out — no longer a target zombies can reach. */
  get atRisk(): boolean {
    return this.phase !== "done";
  }

  update(time: number, delta: number): void {
    if (this.phase === "done") return;

    if (this.phase === "atSwitch") {
      this.player.update(time, delta, HOLD_INPUT);
      this.pauseTimer -= delta;
      if (this.pauseTimer <= 0) {
        this.onFlip();
        this.phase = "toExit";
        this.target = this.exitPos;
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y);
    if (dist <= ARRIVE_DIST) {
      if (this.phase === "toSwitch") {
        this.player.update(time, delta, HOLD_INPUT);
        this.phase = "atSwitch";
        this.pauseTimer = FLIP_PAUSE_MS;
      } else if (this.phase === "toExit") {
        this.phase = "done";
        this.player.destroy();
        this.onDone();
      }
      return;
    }

    const dx = this.target.x - this.player.x;
    const dy = this.target.y - this.player.y;
    const input: MoveInput = {
      left: () => dx < -2,
      right: () => dx > 2,
      up: () => dy < -2,
      down: () => dy > 2,
    };
    this.player.update(time, delta, input);
  }

  destroy(): void {
    this.player.destroy();
  }
}
