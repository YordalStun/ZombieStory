import { Palette } from "@/gfx/palette";
import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";

export const PLAYER_W = 16;
export const PLAYER_H = 24;

export type Direction = "down" | "up" | "left" | "right";
export type PoseFrame = "idle" | "walk0" | "walk1";
export type Outfit = "pajama" | "dressed";

export function playerTexKey(outfit: Outfit, dir: Direction, frame: PoseFrame): string {
  return `player_${outfit}_${dir}_${frame}`;
}

export function playerAnimKey(outfit: Outfit, dir: Direction, moving: boolean): string {
  return `anim_${outfit}_${dir}_${moving ? "walk" : "idle"}`;
}

interface DrawOpts {
  legOffset: number; // -1 left-forward, 0 neutral, 1 right-forward
  shirt: number;
  shirtShadow: number;
}

/** Draws facing down/up/right. "left" is produced by mirroring the "right" draw — see buildFrame. */
function drawBody(ctx: CanvasRenderingContext2D, dir: "down" | "up" | "right", opts: DrawOpts): void {
  const legY = 16;
  const legH = 6;
  const footH = 2;

  const lLegY = legY + (opts.legOffset === -1 ? 1 : 0);
  const rLegY = legY + (opts.legOffset === 1 ? 1 : 0);
  rect(ctx, 4, lLegY, 3, legH, Palette.pants);
  rect(ctx, 9, rLegY, 3, legH, Palette.pants);
  rect(ctx, 4, lLegY + legH, 3, footH, Palette.shoes);
  rect(ctx, 9, rLegY + legH, 3, footH, Palette.shoes);

  rect(ctx, 3, 6, 10, 10, opts.shirt);
  rect(ctx, 3, 13, 10, 3, opts.shirtShadow);

  if (dir === "down") {
    rect(ctx, 4, 0, 8, 6, Palette.hair);
    rect(ctx, 4, 2, 8, 4, Palette.skin);
    rect(ctx, 6, 3, 1, 1, 0x2a2018);
    rect(ctx, 9, 3, 1, 1, 0x2a2018);
  } else if (dir === "up") {
    rect(ctx, 4, 0, 8, 6, Palette.hair);
    rect(ctx, 4, 5, 8, 1, Palette.hair);
  } else {
    rect(ctx, 4, 0, 7, 6, Palette.hair);
    rect(ctx, 8, 2, 4, 4, Palette.skin);
    rect(ctx, 11, 3, 1, 1, 0x2a2018);
  }
}

function buildFrame(
  scene: Phaser.Scene,
  key: string,
  dir: Direction,
  legOffset: number,
  shirt: number,
  shirtShadow: number,
): void {
  const tex = ensureCanvas(scene, key, PLAYER_W, PLAYER_H);
  const ctx = tex.getContext();
  clear(ctx, PLAYER_W, PLAYER_H);
  if (dir === "left") {
    ctx.save();
    ctx.translate(PLAYER_W, 0);
    ctx.scale(-1, 1);
    drawBody(ctx, "right", { legOffset, shirt, shirtShadow });
    ctx.restore();
  } else {
    drawBody(ctx, dir, { legOffset, shirt, shirtShadow });
  }
  tex.refresh();
}

const OUTFIT_COLORS: Record<Outfit, [number, number]> = {
  pajama: [Palette.shirt, Palette.shirtShadow],
  dressed: [Palette.workShirt, Palette.workShirtShadow],
};

export function generatePlayerTextures(scene: Phaser.Scene): void {
  const dirs: Direction[] = ["down", "up", "left", "right"];
  const outfits: Outfit[] = ["pajama", "dressed"];

  for (const outfit of outfits) {
    const [shirt, shirtShadow] = OUTFIT_COLORS[outfit];
    for (const dir of dirs) {
      buildFrame(scene, playerTexKey(outfit, dir, "idle"), dir, 0, shirt, shirtShadow);
      buildFrame(scene, playerTexKey(outfit, dir, "walk0"), dir, -1, shirt, shirtShadow);
      buildFrame(scene, playerTexKey(outfit, dir, "walk1"), dir, 1, shirt, shirtShadow);
    }
  }
}

export function createPlayerAnimations(scene: Phaser.Scene): void {
  const dirs: Direction[] = ["down", "up", "left", "right"];
  const outfits: Outfit[] = ["pajama", "dressed"];

  for (const outfit of outfits) {
    for (const dir of dirs) {
      const idleKey = playerAnimKey(outfit, dir, false);
      if (!scene.anims.exists(idleKey)) {
        scene.anims.create({
          key: idleKey,
          frames: [{ key: playerTexKey(outfit, dir, "idle") }],
          frameRate: 1,
        });
      }
      const walkKey = playerAnimKey(outfit, dir, true);
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: [
            { key: playerTexKey(outfit, dir, "walk0") },
            { key: playerTexKey(outfit, dir, "idle") },
            { key: playerTexKey(outfit, dir, "walk1") },
            { key: playerTexKey(outfit, dir, "idle") },
          ],
          frameRate: 7,
          repeat: -1,
        });
      }
    }
  }
}
