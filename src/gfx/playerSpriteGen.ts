import { Palette } from "@/gfx/palette";
import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";

export const PLAYER_W = 16;
export const PLAYER_H = 24;

export type Direction = "down" | "up" | "left" | "right";
export type PoseFrame = "idle" | "walk0" | "walk1";
/**
 * "pajama"/"dressed" are Danny's own two states. The rest give each named
 * family member (Blackout/HouseDefense) a silhouette of their own rather
 * than four recolors of the same body — Jack's hood, Lily's nightdress,
 * Mum's long hair over the same pajama shape Dad keeps by default.
 */
export type Outfit = "pajama" | "dressed" | "pajama_hoodie" | "pajama_dress" | "pajama_longhair";

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
  /** Nightdress/dress silhouette instead of separate legs (Lily). */
  dress?: boolean;
  /** Hood up, replacing hair entirely (Jack). */
  hood?: boolean;
  /** Hair past the shoulders, drawn over the torso's outer edges (Mum, and Lily via dress). */
  longHair?: boolean;
}

/** Draws facing down/up/right. "left" is produced by mirroring the "right" draw — see buildFrame. */
function drawBody(ctx: CanvasRenderingContext2D, dir: "down" | "up" | "right", opts: DrawOpts): void {
  const legY = 16;
  const legH = 6;
  const footH = 2;

  if (opts.dress) {
    // Flared skirt silhouette rather than two separate legs — the "forward"
    // side reads as a step by peeking 1px more shoe out from under the hem,
    // not by a leg detaching from the hip the way a moved leg-top used to.
    rect(ctx, 3, 13, 10, 5, opts.shirtShadow);
    rect(ctx, 2, 17, 12, 2, opts.shirt);
    rect(ctx, 4, 19 + (opts.legOffset === -1 ? 1 : 0), 3, footH, Palette.shoes);
    rect(ctx, 9, 19 + (opts.legOffset === 1 ? 1 : 0), 3, footH, Palette.shoes);
  } else {
    // Both legs' tops stay flush against the torso's bottom row (16) no
    // matter the stride — only the far end (the foot) moves to suggest a
    // step. Moving the whole leg block down for the "forward" leg used to
    // open a 1px gap between hip and thigh every other walk frame, which at
    // this sprite's tiny scale read as the leg visibly disconnecting from
    // the body.
    const lStride = opts.legOffset === -1 ? 1 : 0;
    const rStride = opts.legOffset === 1 ? 1 : 0;
    rect(ctx, 4, legY, 3, legH + lStride, Palette.pants);
    rect(ctx, 9, legY, 3, legH + rStride, Palette.pants);
    rect(ctx, 4, legY + legH + lStride, 3, footH, Palette.shoes);
    rect(ctx, 9, legY + legH + rStride, 3, footH, Palette.shoes);
  }

  if (opts.dress) {
    rect(ctx, 3, 6, 10, 7, opts.shirt);
  } else {
    rect(ctx, 3, 6, 10, 10, opts.shirt);
    rect(ctx, 3, 13, 10, 3, opts.shirtShadow);
  }

  // arms swing opposite the forward leg, same alternating-gait offset as above
  const armY = 7;
  const sleeveH = 6;
  const handH = 2;
  const lArmY = armY + (opts.legOffset === 1 ? 1 : 0);
  const rArmY = armY + (opts.legOffset === -1 ? 1 : 0);
  rect(ctx, 1, lArmY, 2, sleeveH, opts.shirt);
  rect(ctx, 1, lArmY + sleeveH, 2, handH, Palette.skin);
  rect(ctx, 13, rArmY, 2, sleeveH, opts.shirt);
  rect(ctx, 13, rArmY + sleeveH, 2, handH, Palette.skin);

  if (dir === "down") {
    if (opts.hood) {
      rect(ctx, 3, 0, 10, 6, opts.shirtShadow);
    } else {
      rect(ctx, 4, 0, 8, 6, Palette.hair);
    }
    rect(ctx, 4, 2, 8, 4, Palette.skin);
    rect(ctx, 6, 3, 1, 1, 0x2a2018);
    rect(ctx, 9, 3, 1, 1, 0x2a2018);
    if (opts.longHair) {
      rect(ctx, 2, 6, 2, 6, Palette.hair);
      rect(ctx, 12, 6, 2, 6, Palette.hair);
    }
  } else if (dir === "up") {
    if (opts.hood) {
      rect(ctx, 3, 0, 10, 6, opts.shirtShadow);
    } else {
      rect(ctx, 4, 0, 8, 6, Palette.hair);
      rect(ctx, 4, 5, 8, 1, Palette.hair);
    }
    if (opts.longHair) {
      rect(ctx, 3, 5, 10, 4, Palette.hair);
    }
  } else {
    if (opts.hood) {
      rect(ctx, 3, 0, 9, 6, opts.shirtShadow);
    } else {
      rect(ctx, 4, 0, 7, 6, Palette.hair);
    }
    rect(ctx, 8, 2, 4, 4, Palette.skin);
    rect(ctx, 11, 3, 1, 1, 0x2a2018);
    if (opts.longHair) {
      rect(ctx, 3, 6, 2, 6, Palette.hair);
    }
  }
}

function buildFrame(
  scene: Phaser.Scene,
  key: string,
  dir: Direction,
  legOffset: number,
  style: OutfitStyle,
): void {
  const tex = ensureCanvas(scene, key, PLAYER_W, PLAYER_H);
  const ctx = tex.getContext();
  clear(ctx, PLAYER_W, PLAYER_H);
  const opts = { legOffset, ...style };
  if (dir === "left") {
    ctx.save();
    ctx.translate(PLAYER_W, 0);
    ctx.scale(-1, 1);
    drawBody(ctx, "right", opts);
    ctx.restore();
  } else {
    drawBody(ctx, dir, opts);
  }
  tex.refresh();
}

interface OutfitStyle {
  shirt: number;
  shirtShadow: number;
  dress?: boolean;
  hood?: boolean;
  longHair?: boolean;
}

const OUTFIT_STYLES: Record<Outfit, OutfitStyle> = {
  pajama: { shirt: Palette.shirt, shirtShadow: Palette.shirtShadow },
  dressed: { shirt: Palette.workShirt, shirtShadow: Palette.workShirtShadow },
  pajama_hoodie: { shirt: 0x5a6a78, shirtShadow: 0x424e58, hood: true },
  pajama_dress: { shirt: 0xc06a86, shirtShadow: 0x8f4a63, dress: true, longHair: true },
  pajama_longhair: { shirt: Palette.shirt, shirtShadow: Palette.shirtShadow, longHair: true },
};

const ALL_OUTFITS: Outfit[] = ["pajama", "dressed", "pajama_hoodie", "pajama_dress", "pajama_longhair"];

export function generatePlayerTextures(scene: Phaser.Scene): void {
  const dirs: Direction[] = ["down", "up", "left", "right"];

  for (const outfit of ALL_OUTFITS) {
    const style = OUTFIT_STYLES[outfit];
    for (const dir of dirs) {
      buildFrame(scene, playerTexKey(outfit, dir, "idle"), dir, 0, style);
      buildFrame(scene, playerTexKey(outfit, dir, "walk0"), dir, -1, style);
      buildFrame(scene, playerTexKey(outfit, dir, "walk1"), dir, 1, style);
    }
  }
}

export function createPlayerAnimations(scene: Phaser.Scene): void {
  const dirs: Direction[] = ["down", "up", "left", "right"];
  const outfits: Outfit[] = ALL_OUTFITS;

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
