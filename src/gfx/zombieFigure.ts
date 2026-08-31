import { Palette } from "@/gfx/palette";
import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";

export const FigureTex = {
  ZOMBIE: "fig_zombie",
  DRIVER: "fig_driver",
} as const;

const SIZE = { w: 16, h: 30 };

function draw(
  scene: Phaser.Scene,
  key: string,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const tex = ensureCanvas(scene, key, SIZE.w, SIZE.h);
  const ctx = tex.getContext();
  clear(ctx, SIZE.w, SIZE.h);
  fn(ctx, SIZE.w, SIZE.h);
  tex.refresh();
}

/**
 * Single static pose for each, animated entirely with tweens (position,
 * angle, scale) rather than sprite-sheet frames — matches how everything
 * else in this scene moves (wipers, brake lights, the radio glow).
 */
export function generateFigureTextures(scene: Phaser.Scene): void {
  draw(scene, FigureTex.ZOMBIE, (ctx) => {
    const skin = 0x6f8060;
    const skinShadow = 0x566249;
    const rag = 0x453f34;
    const ragTorn = 0x342f27;
    const stain = 0x6e2020;
    const hair = 0x24211b;

    // legs, staggered rather than square — an even stance reads as normal
    rect(ctx, 4, 22, 3, 7, 0x2c2a24);
    rect(ctx, 10, 24, 3, 6, 0x2c2a24);
    rect(ctx, 4, 28, 3, 2, 0x141311);
    rect(ctx, 10, 29, 3, 1, 0x141311);

    // torso, hunched — leans and narrows toward the (tilted) head rather
    // than standing square over the hips
    rect(ctx, 3, 12, 10, 11, rag);
    rect(ctx, 3, 18, 10, 5, ragTorn);
    rect(ctx, 8, 14, 4, 5, stain);

    // raised arm reaching, the other hanging low
    rect(ctx, 11, 8, 3, 9, rag);
    rect(ctx, 12, 6, 3, 4, skin);
    rect(ctx, 1, 14, 3, 10, rag);
    rect(ctx, 0, 22, 3, 3, skin);

    // head, tilted onto one shoulder
    rect(ctx, 5, 3, 7, 7, skin);
    rect(ctx, 5, 8, 5, 2, skinShadow);
    rect(ctx, 4, 1, 6, 4, hair);
    rect(ctx, 7, 5, 1, 1, 0x1a1a1a);
    rect(ctx, 10, 6, 1, 1, 0x1a1a1a);
  });

  draw(scene, FigureTex.DRIVER, (ctx) => {
    const skin = Palette.skin;
    const skinShadow = Palette.skinShadow;
    const shirt = 0x556575;
    const shirtShadow = 0x3f4c58;
    const hair = 0x3a2b22;

    rect(ctx, 4, 21, 3, 7, 0x2b2f38);
    rect(ctx, 9, 21, 3, 7, 0x2b2f38);
    rect(ctx, 4, 27, 3, 2, 0x1a1a1a);
    rect(ctx, 9, 27, 3, 2, 0x1a1a1a);

    rect(ctx, 3, 11, 10, 11, shirt);
    rect(ctx, 3, 18, 10, 4, shirtShadow);

    // both arms up and out — resisting, not resigned
    rect(ctx, 11, 6, 3, 10, shirt);
    rect(ctx, 12, 4, 3, 4, skin);
    rect(ctx, 2, 6, 3, 10, shirt);
    rect(ctx, 1, 4, 3, 4, skin);

    rect(ctx, 4, 2, 8, 7, skin);
    rect(ctx, 4, 8, 8, 2, skinShadow);
    rect(ctx, 4, 0, 8, 4, hair);
    rect(ctx, 6, 5, 1, 1, 0x2a2018);
    rect(ctx, 9, 5, 1, 1, 0x2a2018);
  });
}
