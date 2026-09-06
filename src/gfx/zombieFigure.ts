import { Palette } from "@/gfx/palette";
import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";

export const FigureTex = {
  ZOMBIE: "fig_zombie",
  ZOMBIE_M2: "fig_zombie_m2",
  ZOMBIE_F1: "fig_zombie_f1",
  ZOMBIE_F2: "fig_zombie_f2",
  DRIVER: "fig_driver",
} as const;

/** Every zombie variant, for callers that want the crowd to actually look mixed rather than one model repeated — see Zombie.ts's random pick. */
export const ZOMBIE_VARIANTS = [FigureTex.ZOMBIE, FigureTex.ZOMBIE_M2, FigureTex.ZOMBIE_F1, FigureTex.ZOMBIE_F2] as const;

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

interface ZombieStyle {
  rag: number;
  ragTorn: number;
  stain: number;
  hair: number;
  skin: number;
  skinShadow: number;
  /** A skirt/dress hem instead of separate trouser legs. */
  dress?: boolean;
  /** Hair drawn past the shoulders down the sides of the torso. */
  longHair?: boolean;
}

/** One hunched, reaching pose shared by every variant — only the palette and dress/hair flags change, same approach as the family sprites in playerSpriteGen.ts. */
function drawZombieVariant(ctx: CanvasRenderingContext2D, style: ZombieStyle): void {
  const { skin, skinShadow, rag, ragTorn, stain, hair } = style;

  if (style.dress) {
    // torn skirt hem instead of two legs — one leg still pokes out below
    // for the stagger, so it doesn't read as gliding
    rect(ctx, 3, 20, 10, 6, ragTorn);
    rect(ctx, 2, 25, 12, 2, rag);
    rect(ctx, 4, 27, 3, 3, 0x2c2a24);
    rect(ctx, 10, 25, 3, 5, 0x2c2a24);
    rect(ctx, 10, 29, 3, 1, 0x141311);
  } else {
    rect(ctx, 4, 22, 3, 7, 0x2c2a24);
    rect(ctx, 10, 24, 3, 6, 0x2c2a24);
    rect(ctx, 4, 28, 3, 2, 0x141311);
    rect(ctx, 10, 29, 3, 1, 0x141311);
  }

  // torso, hunched — leans and narrows toward the (tilted) head rather
  // than standing square over the hips
  rect(ctx, 3, 12, 10, style.dress ? 9 : 11, rag);
  if (!style.dress) rect(ctx, 3, 18, 10, 5, ragTorn);
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
  if (style.longHair) {
    rect(ctx, 3, 5, 2, 7, hair);
    rect(ctx, 11, 5, 2, 7, hair);
  }
}

/**
 * Single static pose for each, animated entirely with tweens (position,
 * angle, scale) rather than sprite-sheet frames — matches how everything
 * else in this scene moves (wipers, brake lights, the radio glow). Four
 * palette/silhouette variants (two male-presenting, two female-presenting
 * with a torn dress + long hair) so a crowd of these — House Defense in
 * particular throws several on screen at once — doesn't read as one model
 * copy-pasted, the way a single ZOMBIE texture used to everywhere.
 */
export function generateFigureTextures(scene: Phaser.Scene): void {
  draw(scene, FigureTex.ZOMBIE, (ctx) =>
    drawZombieVariant(ctx, { skin: 0x6f8060, skinShadow: 0x566249, rag: 0x453f34, ragTorn: 0x342f27, stain: 0x6e2020, hair: 0x24211b }),
  );
  draw(scene, FigureTex.ZOMBIE_M2, (ctx) =>
    drawZombieVariant(ctx, { skin: 0x82785f, skinShadow: 0x685f4b, rag: 0x2e3f38, ragTorn: 0x222e29, stain: 0x5a1c1c, hair: 0x3a2e20 }),
  );
  draw(scene, FigureTex.ZOMBIE_F1, (ctx) =>
    drawZombieVariant(ctx, {
      skin: 0x7a8a6a,
      skinShadow: 0x5f6e53,
      rag: 0x5a3f52,
      ragTorn: 0x432f3d,
      stain: 0x6e2020,
      hair: 0x1c1814,
      dress: true,
      longHair: true,
    }),
  );
  draw(scene, FigureTex.ZOMBIE_F2, (ctx) =>
    drawZombieVariant(ctx, {
      skin: 0x69795c,
      skinShadow: 0x516046,
      rag: 0x3f4a5c,
      ragTorn: 0x2f3846,
      stain: 0x5a1c1c,
      hair: 0x5c4530,
      dress: true,
      longHair: true,
    }),
  );

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
