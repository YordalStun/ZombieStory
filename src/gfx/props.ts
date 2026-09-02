import { Palette } from "@/gfx/palette";
import { clear, outline, rect, ensureCanvas } from "@/gfx/canvasUtils";

export const PropTex = {
  BED: "prop_bed",
  SLEEPING_FIGURE: "prop_sleeping_figure",
  TV_ON: "prop_tv_on",
  TV_OFF: "prop_tv_off",
  DRESSER: "prop_dresser",
  SINK: "prop_sink",
  COUNTER: "prop_counter",
  FRIDGE: "prop_fridge",
  DOOR: "prop_door",
  CAR: "prop_car",
  ALARM_CLOCK: "prop_alarm_clock",
  SWITCH_OFF: "prop_switch_off",
  SWITCH_ON: "prop_switch_on",
  RUG: "prop_rug",
  KEYS_HOOK: "prop_keys_hook",
  PICTURE_FRAME: "prop_picture_frame",
  LAVA_LAMP_ON: "prop_lava_lamp_on",
  LAVA_LAMP_OFF: "prop_lava_lamp_off",
  DESK: "prop_desk",
  CHAIR: "prop_chair",
  KETTLE: "prop_kettle",
  FRUIT_BOWL: "prop_fruit_bowl",
  TREE: "prop_tree",
  BUSH: "prop_bush",
  FENCE_SEGMENT: "prop_fence_segment",
  STREET_LAMP: "prop_street_lamp",
  PORCH_LIGHT: "prop_porch_light",
  NEIGHBOR_ROOF: "prop_neighbor_roof",
  DOG_BED: "prop_dog_bed",
  MIRROR: "prop_mirror",
  TOILET: "prop_toilet",
  BATHTUB: "prop_bathtub",
  PILLAR: "prop_pillar",
} as const;

// Display sizes, in px, at native (unscaled) resolution — used for physics
// body sizing and layout math so nothing has to hardcode magic numbers.
export const PropSize: Record<string, { w: number; h: number }> = {
  [PropTex.BED]: { w: 32, h: 48 },
  [PropTex.SLEEPING_FIGURE]: { w: 20, h: 16 },
  [PropTex.TV_ON]: { w: 22, h: 18 },
  [PropTex.TV_OFF]: { w: 22, h: 18 },
  [PropTex.DRESSER]: { w: 28, h: 16 },
  [PropTex.SINK]: { w: 16, h: 16 },
  [PropTex.COUNTER]: { w: 32, h: 16 },
  [PropTex.FRIDGE]: { w: 16, h: 24 },
  [PropTex.DOOR]: { w: 16, h: 48 },
  [PropTex.CAR]: { w: 40, h: 64 },
  [PropTex.ALARM_CLOCK]: { w: 10, h: 8 },
  [PropTex.SWITCH_OFF]: { w: 6, h: 10 },
  [PropTex.SWITCH_ON]: { w: 6, h: 10 },
  [PropTex.RUG]: { w: 28, h: 20 },
  [PropTex.KEYS_HOOK]: { w: 8, h: 10 },
  [PropTex.PICTURE_FRAME]: { w: 14, h: 11 },
  [PropTex.LAVA_LAMP_ON]: { w: 8, h: 14 },
  [PropTex.LAVA_LAMP_OFF]: { w: 8, h: 14 },
  [PropTex.DESK]: { w: 26, h: 18 },
  [PropTex.CHAIR]: { w: 12, h: 14 },
  [PropTex.KETTLE]: { w: 8, h: 10 },
  [PropTex.FRUIT_BOWL]: { w: 11, h: 7 },
  [PropTex.TREE]: { w: 26, h: 32 },
  [PropTex.BUSH]: { w: 14, h: 10 },
  [PropTex.FENCE_SEGMENT]: { w: 32, h: 14 },
  [PropTex.STREET_LAMP]: { w: 10, h: 30 },
  [PropTex.PORCH_LIGHT]: { w: 7, h: 8 },
  [PropTex.NEIGHBOR_ROOF]: { w: 90, h: 56 },
  [PropTex.DOG_BED]: { w: 22, h: 18 },
  [PropTex.MIRROR]: { w: 10, h: 8 },
  [PropTex.TOILET]: { w: 12, h: 14 },
  [PropTex.BATHTUB]: { w: 16, h: 30 },
  [PropTex.PILLAR]: { w: 14, h: 14 },
};

function draw(
  scene: Phaser.Scene,
  key: string,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const { w, h } = PropSize[key];
  const tex = ensureCanvas(scene, key, w, h);
  const ctx = tex.getContext();
  clear(ctx, w, h);
  fn(ctx, w, h);
  tex.refresh();
}

export function generatePropTextures(scene: Phaser.Scene): void {
  draw(scene, PropTex.BED, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.bedFrame);
    rect(ctx, 2, 2, w - 4, h - 4, Palette.bedSheet);
    rect(ctx, 2, h - 14, w - 4, 12, Palette.bedSheetShadow);
    rect(ctx, 4, 4, w - 8, 8, Palette.pillow);
    outline(ctx, 0, 0, w, h, Palette.bedFrame);
  });

  draw(scene, PropTex.SLEEPING_FIGURE, (ctx, w, h) => {
    rect(ctx, 0, 2, w, h - 2, Palette.bedSheetShadow);
    rect(ctx, 1, 3, w - 2, h - 4, 0x4a5f80);
    // head poking out at the left (pillow) end
    rect(ctx, 0, 0, 7, 8, Palette.skin);
    rect(ctx, 0, 0, 7, 3, Palette.hair);
  });

  draw(scene, PropTex.TV_ON, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.tvBody);
    rect(ctx, 2, 2, w - 4, h - 6, Palette.tvScreenOn);
    rect(ctx, w / 2 - 3, h - 3, 6, 3, Palette.tvBody);
    outline(ctx, 2, 2, w - 4, h - 6, 0x7fd6f2);
  });

  draw(scene, PropTex.TV_OFF, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.tvBody);
    rect(ctx, 2, 2, w - 4, h - 6, Palette.tvScreenOff);
    rect(ctx, w / 2 - 3, h - 3, 6, 3, Palette.tvBody);
    rect(ctx, 4, 4, 4, 3, 0x2a2a30);
  });

  draw(scene, PropTex.DRESSER, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.dresserWood);
    rect(ctx, 0, 0, w, 2, Palette.dresserWoodDark);
    for (const dx of [4, 14, 24]) rect(ctx, dx, 5, 8, 2, Palette.dresserWoodDark);
    outline(ctx, 0, 0, w, h, Palette.dresserWoodDark);
  });

  draw(scene, PropTex.SINK, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.sinkWhite);
    rect(ctx, 2, 2, w - 4, h - 6, Palette.sinkShadow);
    rect(ctx, w / 2 - 1, 1, 2, 3, 0x8a8f90);
    outline(ctx, 0, 0, w, h, Palette.sinkShadow);
  });

  draw(scene, PropTex.COUNTER, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.counterBase);
    rect(ctx, 0, 0, w, 5, Palette.counterTop);
    rect(ctx, 4, 8, w - 8, 1, Palette.counterBase);
  });

  draw(scene, PropTex.FRIDGE, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.fridgeBody);
    rect(ctx, 0, 8, w, 1, Palette.fridgeShadow);
    rect(ctx, w - 3, 2, 2, 3, Palette.fridgeShadow);
    outline(ctx, 0, 0, w, h, Palette.fridgeShadow);
  });

  // this fills a doorway cut through a *vertical* wall (one column wide, two
  // rows tall), so the sprite is tall/narrow, not wide — two panels stacked
  draw(scene, PropTex.DOOR, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.doorFrame);
    rect(ctx, 1, 1, w - 2, h / 2 - 2, Palette.doorWood);
    rect(ctx, 1, h / 2 + 1, w - 2, h / 2 - 2, Palette.doorWood);
    rect(ctx, w / 2 - 1, h / 2 - 6, 2, 2, 0xd8c68a);
    rect(ctx, w / 2 - 1, h / 2 + 4, 2, 2, 0xd8c68a);
  });

  draw(scene, PropTex.CAR, (ctx, w, h) => {
    rect(ctx, 4, 0, w - 8, h, Palette.carBodyDark);
    rect(ctx, 3, 6, w - 6, h - 12, Palette.carBody);
    rect(ctx, 6, 10, w - 12, 18, Palette.carGlass);
    rect(ctx, 6, h - 22, w - 12, 12, Palette.carGlass);
    for (const wy of [4, h - 10]) {
      rect(ctx, 0, wy, 5, 8, Palette.carWheel);
      rect(ctx, w - 5, wy, 5, 8, Palette.carWheel);
    }
    rect(ctx, w / 2 - 2, 1, 4, 2, 0xffe9a8);
  });

  draw(scene, PropTex.ALARM_CLOCK, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x2a2a2e);
    rect(ctx, 1, 1, w - 2, h - 3, 0x141416);
    rect(ctx, 2, 2, w - 4, 2, Palette.clockRedLED);
  });

  draw(scene, PropTex.SWITCH_OFF, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0xd8d4c8);
    rect(ctx, 1, 1, w - 2, h / 2 - 1, 0xb8b4a8);
    outline(ctx, 0, 0, w, h, 0x8a8778);
  });

  draw(scene, PropTex.SWITCH_ON, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0xd8d4c8);
    rect(ctx, 1, h / 2, w - 2, h / 2 - 1, 0xb8b4a8);
    outline(ctx, 0, 0, w, h, 0x8a8778);
  });

  draw(scene, PropTex.RUG, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.rug);
    outline(ctx, 0, 0, w, h, Palette.floorCarpetDark);
    outline(ctx, 3, 3, w - 6, h - 6, 0x9a4c4c);
  });

  draw(scene, PropTex.KEYS_HOOK, (ctx) => {
    rect(ctx, 2, 0, 2, 3, 0x6b5a3a);
    rect(ctx, 1, 3, 4, 2, 0xb8a04a);
    rect(ctx, 3, 5, 1, 4, 0xcfc8b0);
    rect(ctx, 5, 5, 1, 3, 0xcfc8b0);
  });

  draw(scene, PropTex.PICTURE_FRAME, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x2a1c12);
    rect(ctx, 1, 1, w - 2, h - 2, 0xcfc3a0);
    rect(ctx, 1, h - 4, w - 2, 3, 0x8fae6b);
    rect(ctx, 3, 3, 2, 2, Palette.skin);
    rect(ctx, 6, 2, 2, 2, 0xc78a5e);
    rect(ctx, 9, 3, 2, 2, 0xe0ac81);
  });

  draw(scene, PropTex.LAVA_LAMP_OFF, (ctx, w, h) => {
    rect(ctx, 0, 0, w, 2, 0x1a1a1e);
    rect(ctx, 2, 2, w - 4, h - 6, 0x3a3a40);
    rect(ctx, 1, h - 4, w - 2, 4, 0x2a2a2e);
  });

  draw(scene, PropTex.LAVA_LAMP_ON, (ctx, w, h) => {
    // glass drawn near-white so the scene can setTint() the actual cycling color onto it
    rect(ctx, 0, 0, w, 2, 0x1a1a1e);
    rect(ctx, 2, 2, w - 4, h - 6, 0xf0e8ff);
    rect(ctx, 3, 4, w - 6, 2, 0xffffff);
    rect(ctx, 1, h - 4, w - 2, 4, 0x2a2a2e);
  });

  draw(scene, PropTex.DESK, (ctx, w, h) => {
    // back edge (bottom) sits flush against the wall; monitor + its cord live
    // on that side, keyboard is on the front edge where the chair tucks in
    rect(ctx, 0, 0, w, h, Palette.dresserWood);
    rect(ctx, 0, h - 3, w, 3, Palette.dresserWoodDark);
    rect(ctx, w - 11, h - 9, 9, 7, 0x1c1c1e);
    rect(ctx, w - 10, h - 8, 7, 5, 0x2a4a5a);
    rect(ctx, w - 7, h - 2, 1, 2, 0x2a2a2e);
    rect(ctx, 3, 2, 10, 3, 0x3a3a3e);
    outline(ctx, 0, 0, w, h, Palette.dresserWoodDark);
  });

  draw(scene, PropTex.CHAIR, (ctx, w, h) => {
    rect(ctx, 2, 1, w - 4, 3, 0x2a2a30);
    rect(ctx, 1, 3, w - 2, h - 5, 0x3a3a40);
    rect(ctx, w / 2 - 1, h - 3, 2, 3, 0x1a1a1e);
  });

  draw(scene, PropTex.KETTLE, (ctx, w, h) => {
    rect(ctx, 1, 3, w - 2, h - 4, 0x8a8f94);
    rect(ctx, 2, 4, w - 4, h - 6, 0xb0b5b8);
    rect(ctx, w - 2, 3, 2, 2, 0x6a6f74);
    rect(ctx, 0, 2, 2, 2, 0x6a6f74);
    rect(ctx, w / 2 - 2, 0, 4, 2, 0x3a3a3e);
  });

  draw(scene, PropTex.FRUIT_BOWL, (ctx, w, h) => {
    rect(ctx, 0, h - 3, w, 3, 0x8a6a4f);
    rect(ctx, 1, h - 5, w - 2, 3, 0xa5825f);
    rect(ctx, 2, 0, 3, 3, 0xd8483a);
    rect(ctx, 5, 0, 3, 3, 0xe0a83a);
    rect(ctx, 8, 1, 3, 3, 0x7ab54a);
  });

  draw(scene, PropTex.TREE, (ctx, w, h) => {
    rect(ctx, w / 2 - 2, h - 12, 4, 12, 0x4a3a28);
    rect(ctx, w / 2 - 1, h - 12, 1, 12, 0x3a2c1e);
    for (const [cx, cy, r] of [
      [w / 2, h - 22, 11],
      [w / 2 - 7, h - 16, 8],
      [w / 2 + 7, h - 17, 8],
    ] as const) {
      ctx.fillStyle = "#355c30";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#4a7a40";
    ctx.beginPath();
    ctx.arc(w / 2 - 3, h - 25, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  draw(scene, PropTex.BUSH, (ctx, w, h) => {
    ctx.fillStyle = "#355c30";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 1, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a7a40";
    ctx.beginPath();
    ctx.ellipse(w / 2 - 2, h / 2 - 2, w / 3, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  draw(scene, PropTex.FENCE_SEGMENT, (ctx, w, h) => {
    for (const px of [2, w - 6]) rect(ctx, px, 0, 4, h, 0x5a4a38);
    rect(ctx, 0, 3, w, 3, 0x6b5a45);
    rect(ctx, 0, h - 6, w, 3, 0x6b5a45);
  });

  draw(scene, PropTex.STREET_LAMP, (ctx, w, h) => {
    rect(ctx, w / 2 - 1, 8, 2, h - 8, 0x2a2a2e);
    rect(ctx, w / 2 - 4, 0, 8, 9, 0x3a3a3e);
    rect(ctx, w / 2 - 3, 1, 6, 6, 0xffe9a8);
    rect(ctx, w / 2 - 3, h - 3, 6, 3, 0x1a1a1e);
  });

  draw(scene, PropTex.PORCH_LIGHT, (ctx, w, h) => {
    rect(ctx, 0, 0, w, 2, 0x2a2a2e);
    rect(ctx, 1, 2, w - 2, h - 3, 0xffe9a8);
    outline(ctx, 1, 2, w - 2, h - 3, 0x2a2a2e);
  });

  draw(scene, PropTex.NEIGHBOR_ROOF, (ctx, w, h) => {
    rect(ctx, 0, h / 2, w, h / 2, 0x2c2432);
    rect(ctx, 0, 0, w, h / 2, 0x3a3040);
    rect(ctx, 0, h / 2 - 2, w, 3, 0x231d29);
    rect(ctx, w * 0.15, h * 0.15, 8, 12, 0x1a1622);
  });

  draw(scene, PropTex.DOG_BED, (ctx, w, h) => {
    ctx.fillStyle = "#6b4a34";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a6a4a";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 3, h / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a5825f";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 1, w / 2 - 7, h / 2 - 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  draw(scene, PropTex.MIRROR, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0xb8b0a0);
    rect(ctx, 1, 1, w - 2, h - 2, 0xdfeef2);
    rect(ctx, 2, 1, 2, h - 2, 0xffffff);
  });

  draw(scene, PropTex.TOILET, (ctx, w, h) => {
    rect(ctx, 1, 0, w - 2, 5, Palette.sinkWhite);
    ctx.fillStyle = "#e8ecec";
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 5, w / 2 - 1, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c3caca";
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 5, w / 2 - 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  draw(scene, PropTex.BATHTUB, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.sinkShadow);
    rect(ctx, 1, 1, w - 2, h - 2, Palette.sinkWhite);
    rect(ctx, 3, 3, w - 6, h - 6, 0xc9d6d6);
    rect(ctx, w / 2 - 2, 1, 4, 3, 0x8a8f90);
  });

  // bare concrete support column — car parks, not homes or offices
  draw(scene, PropTex.PILLAR, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x8a8a86);
    rect(ctx, 0, 0, w, 3, 0x9d9d98);
    rect(ctx, 0, h - 3, w, 3, 0x6e6e6a);
    outline(ctx, 0, 0, w, h, 0x5c5c58);
  });
}
