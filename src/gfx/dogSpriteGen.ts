import { clear, ensureCanvas } from "@/gfx/canvasUtils";

export const DOG_W = 16;
export const DOG_H = 14;

export type DogDirection = "down" | "up" | "left" | "right";
export type DogPose = "idle" | "walk0" | "walk1";

export function dogTexKey(dir: DogDirection, pose: DogPose): string {
  return `dog_${dir}_${pose}`;
}

export function dogAnimKey(dir: DogDirection, moving: boolean): string {
  return `dog_anim_${dir}_${moving ? "walk" : "idle"}`;
}

export const DOG_WAG_KEYS = ["dog_wag0", "dog_wag1"];
export const DOG_WAG_ANIM = "dog_anim_wag";

const BODY = "#9a6a3f";
const BODY_DARK = "#7a5230";
const EAR = "#5a3c22";

/** tailSide sweeps the tail left/right of its resting angle — used both for the idle sway and the petting wag. */
function drawDog(ctx: CanvasRenderingContext2D, dir: DogDirection, legOffset: number, tailSide: number): void {
  const w = DOG_W;
  const h = DOG_H;
  const cx = w / 2;
  const cy = h / 2;
  const horizontal = dir === "left" || dir === "right";
  const facing = dir === "up" || dir === "left" ? -1 : 1;

  // legs
  ctx.fillStyle = BODY_DARK;
  const legLift = legOffset === -1 ? 1 : 0;
  const legLift2 = legOffset === 1 ? 1 : 0;
  if (horizontal) {
    ctx.fillRect(cx - 3, h - 4 + legLift, 2, 3);
    ctx.fillRect(cx + 1, h - 4 + legLift2, 2, 3);
  } else {
    ctx.fillRect(cx - 4, h - 4 + legLift, 2, 3);
    ctx.fillRect(cx + 2, h - 4 + legLift2, 2, 3);
  }

  // body
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, horizontal ? 7 : 5.5, horizontal ? 5 : 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const headOffset = horizontal ? 6.5 : 5.5;
  const headX = cx + (horizontal ? facing * headOffset : 0);
  const headY = cy - 1 + (!horizontal ? facing * headOffset : 0);
  const tailX = cx - (horizontal ? facing * headOffset : 0);
  const tailY = cy - 1 - (!horizontal ? facing * headOffset : 0);

  // tail — swept perpendicular to the body's long axis
  ctx.strokeStyle = BODY_DARK;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  if (horizontal) {
    ctx.lineTo(tailX - facing * 3, tailY - 4 + tailSide * 2.5);
  } else {
    ctx.lineTo(tailX + tailSide * 3, tailY - facing * 4);
  }
  ctx.stroke();

  // head + ears
  ctx.fillStyle = BODY;
  ctx.beginPath();
  ctx.arc(headX, headY, 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = EAR;
  if (horizontal) {
    ctx.fillRect(headX + facing * 1, headY - 4, 2, 2.5);
  } else {
    ctx.fillRect(headX - 3, headY - 3, 2, 2.5);
    ctx.fillRect(headX + 1, headY - 3, 2, 2.5);
  }

  if (dir === "down") {
    ctx.fillStyle = "#2a2018";
    ctx.fillRect(headX - 1, headY + 1, 1, 1);
    ctx.fillRect(headX + 1, headY + 1, 1, 1);
  }
}

function buildFrame(scene: Phaser.Scene, key: string, dir: DogDirection, legOffset: number, tailSide: number): void {
  const tex = ensureCanvas(scene, key, DOG_W, DOG_H);
  const ctx = tex.getContext();
  clear(ctx, DOG_W, DOG_H);
  drawDog(ctx, dir, legOffset, tailSide);
  tex.refresh();
}

export function generateDogTextures(scene: Phaser.Scene): void {
  const dirs: DogDirection[] = ["down", "up", "left", "right"];
  for (const dir of dirs) {
    buildFrame(scene, dogTexKey(dir, "idle"), dir, 0, 0);
    buildFrame(scene, dogTexKey(dir, "walk0"), dir, -1, -0.6);
    buildFrame(scene, dogTexKey(dir, "walk1"), dir, 1, 0.6);
  }
  buildFrame(scene, DOG_WAG_KEYS[0], "down", 0, -1);
  buildFrame(scene, DOG_WAG_KEYS[1], "down", 0, 1);
}

export function createDogAnimations(scene: Phaser.Scene): void {
  const dirs: DogDirection[] = ["down", "up", "left", "right"];
  for (const dir of dirs) {
    const idleKey = dogAnimKey(dir, false);
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({ key: idleKey, frames: [{ key: dogTexKey(dir, "idle") }], frameRate: 1 });
    }
    const walkKey = dogAnimKey(dir, true);
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: [
          { key: dogTexKey(dir, "walk0") },
          { key: dogTexKey(dir, "idle") },
          { key: dogTexKey(dir, "walk1") },
          { key: dogTexKey(dir, "idle") },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  }
  if (!scene.anims.exists(DOG_WAG_ANIM)) {
    scene.anims.create({
      key: DOG_WAG_ANIM,
      frames: [{ key: DOG_WAG_KEYS[0] }, { key: DOG_WAG_KEYS[1] }],
      frameRate: 5,
      repeat: -1,
    });
  }
}
