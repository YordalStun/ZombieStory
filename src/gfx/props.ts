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
  [PropTex.DOOR]: { w: 16, h: 16 },
  [PropTex.CAR]: { w: 40, h: 64 },
  [PropTex.ALARM_CLOCK]: { w: 10, h: 8 },
  [PropTex.SWITCH_OFF]: { w: 6, h: 10 },
  [PropTex.SWITCH_ON]: { w: 6, h: 10 },
  [PropTex.RUG]: { w: 28, h: 20 },
  [PropTex.KEYS_HOOK]: { w: 8, h: 10 },
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

  draw(scene, PropTex.DOOR, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, Palette.doorFrame);
    rect(ctx, 1, 1, w - 2, h - 2, Palette.doorWood);
    rect(ctx, w - 4, h / 2 - 1, 2, 2, 0xd8c68a);
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
}
