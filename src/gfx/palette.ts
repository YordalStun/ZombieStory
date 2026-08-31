/**
 * Shared placeholder-art palette. Kept small and consistent on purpose —
 * a limited flat-shaded palette reads as "intentional pixel art" even
 * when the shapes themselves are simple primitives. Swap these values
 * (or replace textureGen.ts wholesale with real sprite loading) when
 * final art arrives; nothing else in the game reads raw hex codes.
 */
export const Palette = {
  // Skin / hair / clothing for the protagonist
  skin: 0xe0ac81,
  skinShadow: 0xc78a5e,
  hair: 0x3a2b22,
  shirt: 0x3d6b8a,
  shirtShadow: 0x2c4f66,
  workShirt: 0x4a5a3d,
  workShirtShadow: 0x37432c,
  pants: 0x2b2f38,
  pantsShadow: 0x1d2027,
  shoes: 0x1a1a1a,

  // Architecture
  floorWood: 0x8a6a4f,
  floorWoodDark: 0x7a5b43,
  floorTile: 0xafc2c9,
  floorTileDark: 0x9db0b7,
  floorCarpet: 0x6e4557,
  floorCarpetDark: 0x603a4a,
  driveway: 0x4a4a4d,
  drivewayDark: 0x3e3e41,
  grass: 0x3f6b3a,
  grassDark: 0x35592f,
  wall: 0x565160,
  wallShadow: 0x413d48,
  wallTrim: 0x6f6a7a,
  doorWood: 0x6b4a34,
  doorFrame: 0x4a3624,
  windowGlassNight: 0x1c2740,
  windowGlassDay: 0x8fc2e8,

  // Furniture / props
  bedFrame: 0x543a28,
  bedSheet: 0x3c4f6b,
  bedSheetShadow: 0x2e3d54,
  pillow: 0xe6e2d6,
  tvBody: 0x1c1c1e,
  tvScreenOff: 0x0a0a0c,
  tvScreenOn: 0xbfe9ff,
  dresserWood: 0x6b5033,
  dresserWoodDark: 0x54402a,
  sinkWhite: 0xe8ecec,
  sinkShadow: 0xc3caca,
  counterTop: 0x9a8b76,
  counterBase: 0x5c4630,
  fridgeBody: 0xd8d9d6,
  fridgeShadow: 0xb9bab6,
  rug: 0x8a3b3b,

  carBody: 0x8a1f2b,
  carBodyDark: 0x6d1621,
  carGlass: 0x9fd0e6,
  carWheel: 0x161616,

  // Lighting-related decor
  lampWarm: 0xffd98a,
  clockRedLED: 0xff3b3b,

  // UI accents (used sparingly inside the Phaser canvas, e.g. selection glow)
  accent: 0xffd15c,
} as const;

export type PaletteKey = keyof typeof Palette;
