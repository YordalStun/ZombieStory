import { Palette } from "@/gfx/palette";
import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";

/**
 * A handful of baked color variants rather than one texture + setTint() —
 * tint multiplies the *whole* sprite uniformly, which would wreck the skin
 * tone along with the shirt. Same technique as gfx/motorway.ts's parameterized
 * drawCarRear() feeding several QUEUE_CARS colors into one draw function.
 */
export const CoworkerTex = {
  A: "fig_coworker_a",
  B: "fig_coworker_b",
  C: "fig_coworker_c",
  D: "fig_coworker_d",
  E: "fig_coworker_e",
} as const;

export type CoworkerVariant = (typeof CoworkerTex)[keyof typeof CoworkerTex];

export const COWORKER_VARIANTS: CoworkerVariant[] = [
  CoworkerTex.A,
  CoworkerTex.B,
  CoworkerTex.C,
  CoworkerTex.D,
  CoworkerTex.E,
];

const SIZE = { w: 16, h: 30 };

interface CoworkerStyle {
  shirt: number;
  shirtShadow: number;
  pants: number;
  hair: number;
  skin: number;
}

const STYLES: Record<CoworkerVariant, CoworkerStyle> = {
  [CoworkerTex.A]: { shirt: 0x5d7a8f, shirtShadow: 0x475d6e, pants: 0x2b2f38, hair: 0x2a2018, skin: Palette.skin },
  [CoworkerTex.B]: { shirt: 0x8a6a4f, shirtShadow: 0x6e5340, pants: 0x3a3d44, hair: 0x1a1a1a, skin: 0xc78a5e },
  [CoworkerTex.C]: { shirt: 0xa5455a, shirtShadow: 0x813545, pants: 0x2a2a30, hair: 0x4a3524, skin: 0xe0ac81 },
  [CoworkerTex.D]: { shirt: 0x556b4a, shirtShadow: 0x40523a, pants: 0x24262c, hair: 0x0c0c0c, skin: 0x9d7355 },
  [CoworkerTex.E]: { shirt: 0x726a94, shirtShadow: 0x585072, pants: 0x2e2e34, hair: 0x6b5a44, skin: Palette.skinShadow },
};

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
 * Ordinary standing pose — arms down, upright, mid-conversation rather than
 * mid-crisis. What tells this apart from FigureTex.DRIVER (same rough build)
 * is entirely the pose: no raised/resisting arms, no torn clothing.
 */
export function generateCoworkerTextures(scene: Phaser.Scene): void {
  for (const variant of COWORKER_VARIANTS) {
    const s = STYLES[variant];
    draw(scene, variant, (ctx) => {
      rect(ctx, 4, 22, 3, 7, s.pants);
      rect(ctx, 9, 22, 3, 7, s.pants);
      rect(ctx, 4, 28, 3, 2, 0x141311);
      rect(ctx, 9, 28, 3, 2, 0x141311);

      rect(ctx, 3, 11, 10, 12, s.shirt);
      rect(ctx, 3, 19, 10, 4, s.shirtShadow);

      rect(ctx, 11, 12, 3, 8, s.shirt);
      rect(ctx, 11, 19, 3, 3, s.skin);
      rect(ctx, 2, 12, 3, 8, s.shirt);
      rect(ctx, 2, 19, 3, 3, s.skin);

      rect(ctx, 4, 2, 8, 7, s.skin);
      rect(ctx, 4, 8, 8, 2, s.skin);
      rect(ctx, 4, 0, 8, 4, s.hair);
      rect(ctx, 6, 5, 1, 1, 0x1a1a1a);
      rect(ctx, 9, 5, 1, 1, 0x1a1a1a);
    });
  }
}
