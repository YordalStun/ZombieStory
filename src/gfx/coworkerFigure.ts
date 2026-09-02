import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";

/**
 * Ten baked style variants (five male-coded, five female-coded — hair
 * length/shape is the legibility cue at this pixel scale) rather than one
 * texture + setTint(), since tint would multiply the whole sprite uniformly
 * and wreck the skin tone along with the shirt. Same technique as
 * gfx/motorway.ts's parameterized drawCarRear() feeding several colors into
 * one draw function. Each style gets both a standing pose (crowd) and a
 * seated pose (desks).
 */
export const CoworkerTex = {
  STAND_A: "fig_coworker_stand_a",
  STAND_B: "fig_coworker_stand_b",
  STAND_C: "fig_coworker_stand_c",
  STAND_D: "fig_coworker_stand_d",
  STAND_E: "fig_coworker_stand_e",
  STAND_F: "fig_coworker_stand_f",
  STAND_G: "fig_coworker_stand_g",
  STAND_H: "fig_coworker_stand_h",
  STAND_I: "fig_coworker_stand_i",
  STAND_J: "fig_coworker_stand_j",
  SEAT_A: "fig_coworker_seat_a",
  SEAT_B: "fig_coworker_seat_b",
  SEAT_C: "fig_coworker_seat_c",
  SEAT_D: "fig_coworker_seat_d",
  SEAT_E: "fig_coworker_seat_e",
  SEAT_F: "fig_coworker_seat_f",
  SEAT_G: "fig_coworker_seat_g",
  SEAT_H: "fig_coworker_seat_h",
  SEAT_I: "fig_coworker_seat_i",
  SEAT_J: "fig_coworker_seat_j",
  STAND_K: "fig_coworker_stand_k",
  SEAT_K: "fig_coworker_seat_k",
} as const;

export type CoworkerVariant = (typeof CoworkerTex)[keyof typeof CoworkerTex];

interface CoworkerStyle {
  letter: string;
  gender: "m" | "f";
  shirt: number;
  shirtShadow: number;
  pants: number;
  hair: number;
  skin: number;
}

export const COWORKER_STYLES: CoworkerStyle[] = [
  { letter: "a", gender: "m", shirt: 0x5d7a8f, shirtShadow: 0x475d6e, pants: 0x2b2f38, hair: 0x2a2018, skin: 0xe0ac81 },
  { letter: "b", gender: "f", shirt: 0xa5455a, shirtShadow: 0x813545, pants: 0x2a2a30, hair: 0x4a3524, skin: 0xe0ac81 },
  { letter: "c", gender: "m", shirt: 0x8a6a4f, shirtShadow: 0x6e5340, pants: 0x3a3d44, hair: 0x1a1a1a, skin: 0xc78a5e },
  { letter: "d", gender: "f", shirt: 0x726a94, shirtShadow: 0x585072, pants: 0x2e2e34, hair: 0x6b5a44, skin: 0xc78a5e },
  { letter: "e", gender: "m", shirt: 0x556b4a, shirtShadow: 0x40523a, pants: 0x24262c, hair: 0x0c0c0c, skin: 0x9d7355 },
  { letter: "f", gender: "f", shirt: 0xc98a3a, shirtShadow: 0x9d6a2a, pants: 0x2a2a30, hair: 0x241a12, skin: 0xc78a5e },
  { letter: "g", gender: "m", shirt: 0x3a5a8a, shirtShadow: 0x2c4468, pants: 0x22242a, hair: 0x4a3524, skin: 0xe0ac81 },
  { letter: "h", gender: "f", shirt: 0x4a8a7a, shirtShadow: 0x386a5e, pants: 0x2a2a30, hair: 0x1a1a1a, skin: 0x9d7355 },
  { letter: "i", gender: "m", shirt: 0x8a3a3a, shirtShadow: 0x6a2c2c, pants: 0x2e2e34, hair: 0x6b5a44, skin: 0xe0ac81 },
  { letter: "j", gender: "f", shirt: 0x6a8a3a, shirtShadow: 0x506a2c, pants: 0x2a2a30, hair: 0x2a2018, skin: 0x9d7355 },
  // the boss — a sharp dark blazer instead of the others' casual shirts is
  // the only cue this needs; same draw functions, no new pose
  { letter: "k", gender: "m", shirt: 0x2c3038, shirtShadow: 0x1c1e24, pants: 0x18181c, hair: 0x555555, skin: 0xc78a5e },
];

export const COWORKER_STAND_VARIANTS: CoworkerVariant[] = COWORKER_STYLES.map(
  (s) => CoworkerTex[`STAND_${s.letter.toUpperCase()}` as keyof typeof CoworkerTex],
);
export const COWORKER_SEAT_VARIANTS: CoworkerVariant[] = COWORKER_STYLES.map(
  (s) => CoworkerTex[`SEAT_${s.letter.toUpperCase()}` as keyof typeof CoworkerTex],
);

const STAND_SIZE = { w: 16, h: 24 }; // matches PLAYER_W/PLAYER_H exactly
const SEAT_SIZE = { w: 20, h: 20 };

function draw(scene: Phaser.Scene, key: string, w: number, h: number, fn: (ctx: CanvasRenderingContext2D) => void): void {
  const tex = ensureCanvas(scene, key, w, h);
  const ctx = tex.getContext();
  clear(ctx, w, h);
  fn(ctx);
  tex.refresh();
}

function drawHair(ctx: CanvasRenderingContext2D, s: CoworkerStyle, topY: number): void {
  if (s.gender === "m") {
    rect(ctx, 4, topY, 8, 4, s.hair);
  } else {
    // longer hair — reads past the shoulders on both sides, the clearest
    // legible cue at this pixel scale
    rect(ctx, 3, topY, 10, 5, s.hair);
    rect(ctx, 2, topY + 4, 2, 7, s.hair);
    rect(ctx, 12, topY + 4, 2, 7, s.hair);
  }
}

/** Ordinary standing pose — arms down, upright. Used for the TV-crowd figures. */
function drawStanding(ctx: CanvasRenderingContext2D, s: CoworkerStyle): void {
  rect(ctx, 4, 16, 3, 6, s.pants);
  rect(ctx, 9, 16, 3, 6, s.pants);
  rect(ctx, 4, 22, 3, 2, 0x141311);
  rect(ctx, 9, 22, 3, 2, 0x141311);

  rect(ctx, 3, 6, 10, 10, s.shirt);
  rect(ctx, 3, 13, 10, 3, s.shirtShadow);

  rect(ctx, 1, 7, 2, 6, s.shirt);
  rect(ctx, 1, 13, 2, 2, s.skin);
  rect(ctx, 13, 7, 2, 6, s.shirt);
  rect(ctx, 13, 13, 2, 2, s.skin);

  drawHair(ctx, s, 0);
  rect(ctx, 4, 2, 8, 4, s.skin);
  rect(ctx, 6, 3, 1, 1, 0x1a1a1a);
  rect(ctx, 9, 3, 1, 1, 0x1a1a1a);
}

/**
 * Seated at a desk — a visible chair back behind them, hands resting
 * forward (typing), no separate leg silhouette since they're tucked under
 * the desk. Deliberately not flipped per pod slot like the desk texture is
 * — a generic "at the desk, working" read holds up fine regardless of
 * which corner of the pod it's tucked into (matches how the standing
 * crowd figures already read fine without per-instance rotation).
 */
function drawSeated(ctx: CanvasRenderingContext2D, s: CoworkerStyle): void {
  // chair back, behind (above) the person
  rect(ctx, 5, 1, 10, 8, 0x2a2c30);
  rect(ctx, 6, 2, 8, 6, 0x34383e);

  rect(ctx, 5, 9, 10, 8, s.shirt);
  rect(ctx, 5, 14, 10, 3, s.shirtShadow);

  // arms reaching forward/down toward the desk
  rect(ctx, 3, 12, 3, 5, s.shirt);
  rect(ctx, 3, 16, 3, 2, s.skin);
  rect(ctx, 14, 12, 3, 5, s.shirt);
  rect(ctx, 14, 16, 3, 2, s.skin);

  drawHair(ctx, s, 3);
  rect(ctx, 6, 5, 8, 4, s.skin);
  rect(ctx, 8, 6, 1, 1, 0x1a1a1a);
  rect(ctx, 11, 6, 1, 1, 0x1a1a1a);

  // chair base peeking out at the very bottom
  rect(ctx, 8, 18, 4, 2, 0x1e2024);
}

export function generateCoworkerTextures(scene: Phaser.Scene): void {
  for (const s of COWORKER_STYLES) {
    draw(scene, CoworkerTex[`STAND_${s.letter.toUpperCase()}` as keyof typeof CoworkerTex], STAND_SIZE.w, STAND_SIZE.h, (ctx) =>
      drawStanding(ctx, s),
    );
    draw(scene, CoworkerTex[`SEAT_${s.letter.toUpperCase()}` as keyof typeof CoworkerTex], SEAT_SIZE.w, SEAT_SIZE.h, (ctx) =>
      drawSeated(ctx, s),
    );
  }
}
