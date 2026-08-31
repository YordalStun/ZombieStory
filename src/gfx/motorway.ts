import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

export const MwTex = {
  BACKDROP: "mw_backdrop",
  CAR_FAR: "mw_car_far",
  CAR_MID: "mw_car_mid",
  CAR_NEAR: "mw_car_near",
  HEADLINER: "mw_headliner",
  PILLAR: "mw_pillar",
  DASH: "mw_dash",
  WHEEL: "mw_wheel",
  RADIO_ON: "mw_radio_on",
  RADIO_OFF: "mw_radio_off",
  WIPER: "mw_wiper",
  MIRROR: "mw_mirror",
  GLASS_GRIME: "mw_glass_grime",
} as const;

const MwSize: Record<string, { w: number; h: number }> = {
  [MwTex.BACKDROP]: { w: GAME_WIDTH, h: GAME_HEIGHT },
  [MwTex.CAR_FAR]: { w: 26, h: 18 },
  [MwTex.CAR_MID]: { w: 40, h: 28 },
  [MwTex.CAR_NEAR]: { w: 60, h: 42 },
  [MwTex.HEADLINER]: { w: GAME_WIDTH, h: 26 },
  [MwTex.PILLAR]: { w: 20, h: 146 },
  [MwTex.DASH]: { w: GAME_WIDTH, h: 102 },
  [MwTex.WHEEL]: { w: 196, h: 104 },
  [MwTex.RADIO_ON]: { w: 56, h: 30 },
  [MwTex.RADIO_OFF]: { w: 56, h: 30 },
  [MwTex.WIPER]: { w: 4, h: 96 },
  [MwTex.MIRROR]: { w: 46, h: 15 },
  [MwTex.GLASS_GRIME]: { w: GAME_WIDTH - 40, h: 142 },
};

/** Where the glass sits, in screen space — the cabin frame is built around this. */
export const GLASS = { x: 20, y: 26, w: GAME_WIDTH - 40, h: 142 };

const C = {
  skyHigh: 0x3c4450,
  skyLow: 0x59626c,
  cloud: 0x4a525d,
  treeline: 0x232a2b,
  roadFar: 0x3b3f44,
  roadNear: 0x2b2e33,
  roadWet: 0x424951,
  laneMark: 0xb9b3a2,
  barrier: 0x6a6f75,
  barrierPost: 0x3c4046,
  carBody: 0x8a3f3f,
  carGlass: 0x2b3138,
  carRoof: 0x6f3434,
  tailLight: 0xff4a3a,
  tailGlow: 0xff8a72,
  plate: 0xcfc8b0,
  cabin: 0x1a1c20,
  cabinLit: 0x24272c,
  dash: 0x212429,
  dashTop: 0x2c3037,
  dashSeam: 0x15171a,
  wheelRim: 0x171a1e,
  wheelHilite: 0x2a2e34,
  wheelHub: 0x2f333a,
  radioFace: 0x191c20,
  radioTrim: 0x3a3f46,
  radioDisplay: 0x0d1012,
  radioDisplayOn: 0x6fd08a,
  radioStandby: 0x6a4a22,
  knob: 0x4a4f57,
  wiper: 0x101215,
  mirrorGlass: 0x39414a,
} as const;

function draw(
  scene: Phaser.Scene,
  key: string,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const { w, h } = MwSize[key];
  const tex = ensureCanvas(scene, key, w, h);
  const ctx = tex.getContext();
  clear(ctx, w, h);
  fn(ctx, w, h);
  tex.refresh();
}

/** A car seen from directly behind, sized for its distance up the queue. */
function drawCarRear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const lightH = Math.max(2, Math.round(h * 0.12));
  const lightW = Math.max(3, Math.round(w * 0.16));
  const roofInset = Math.round(w * 0.12);

  // roof and rear window sit above the boot line
  rect(ctx, roofInset, 0, w - roofInset * 2, Math.round(h * 0.34), C.carRoof);
  rect(ctx, roofInset + 2, 2, w - roofInset * 2 - 4, Math.round(h * 0.24), C.carGlass);

  // body
  rect(ctx, 0, Math.round(h * 0.32), w, Math.round(h * 0.52), C.carBody);
  // shadow under the bumper, so it sits on the road instead of floating
  rect(ctx, 1, Math.round(h * 0.84), w - 2, Math.round(h * 0.1), 0x1b1e22);

  // tail lights, with a soft bloom either side
  const lightY = Math.round(h * 0.45);
  rect(ctx, 2, lightY, lightW, lightH, C.tailLight);
  rect(ctx, w - 2 - lightW, lightY, lightW, lightH, C.tailLight);
  rect(ctx, 1, lightY + lightH, lightW + 2, 1, C.tailGlow);
  rect(ctx, w - 3 - lightW, lightY + lightH, lightW + 2, 1, C.tailGlow);

  // plate
  const plateW = Math.max(6, Math.round(w * 0.3));
  rect(ctx, Math.round((w - plateW) / 2), Math.round(h * 0.66), plateW, Math.max(2, lightH - 1), C.plate);
}

export function generateMotorwayTextures(scene: Phaser.Scene): void {
  draw(scene, MwTex.BACKDROP, (ctx, w, h) => {
    // sky, banded rather than smooth so it stays in the pixel-art idiom
    rect(ctx, 0, 0, w, 40, C.skyHigh);
    rect(ctx, 0, 40, w, 30, 0x454e59);
    rect(ctx, 0, 70, w, 24, C.skyLow);
    for (const [cx, cy, cw] of [[40, 34, 90], [200, 22, 120], [350, 44, 80]] as const) {
      rect(ctx, cx, cy, cw, 6, C.cloud);
    }

    // treeline along the horizon, broken up so it doesn't read as a bar
    rect(ctx, 0, 88, w, 8, C.treeline);
    for (let x = 0; x < w; x += 7) {
      const top = 82 + ((x * 37) % 7);
      rect(ctx, x, top, 6, 96 - top, C.treeline);
    }

    // road, darkening toward the camera
    rect(ctx, 0, 96, w, 30, C.roadFar);
    rect(ctx, 0, 126, w, 40, C.roadWet);
    rect(ctx, 0, 166, w, h - 166, C.roadNear);

    // central barrier running up the left, posts thinning with distance
    rect(ctx, 0, 96, 46, 4, C.barrier);
    for (let i = 0; i < 8; i++) {
      const px = 2 + i * 6;
      rect(ctx, px, 100, 2, 3 + i, C.barrierPost);
    }

    // lane markings, spaced wider as they come toward us
    let y = 100;
    let gap = 5;
    while (y < h) {
      rect(ctx, Math.round(w * 0.5) - 1, y, 2 + Math.round(gap / 4), gap, C.laneMark);
      y += gap * 3;
      gap += 3;
    }
  });

  draw(scene, MwTex.CAR_FAR, drawCarRear);
  draw(scene, MwTex.CAR_MID, drawCarRear);
  draw(scene, MwTex.CAR_NEAR, drawCarRear);

  draw(scene, MwTex.HEADLINER, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, C.cabin);
    rect(ctx, 0, h - 3, w, 3, C.cabinLit); // trim catching the grey daylight
  });

  draw(scene, MwTex.PILLAR, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, C.cabin);
    rect(ctx, w - 2, 0, 2, h, C.cabinLit);
  });

  draw(scene, MwTex.DASH, (ctx, w, h) => {
    rect(ctx, 0, 0, w, 14, C.dashTop); // top of the dash, lit from the glass
    rect(ctx, 0, 14, w, 2, C.dashSeam);
    rect(ctx, 0, 16, w, h - 16, C.dash);

    // right-hand drive: the binnacle sits in front of the driver on the right,
    // its two dials dim behind the wheel
    rect(ctx, 276, 12, 136, 8, C.dashSeam);
    rect(ctx, 280, 20, 128, 30, 0x191c20);
    for (const dialX of [308, 380]) {
      rect(ctx, dialX - 16, 24, 32, 22, 0x121417);
      rect(ctx, dialX - 12, 28, 24, 14, 0x1d2126);
      rect(ctx, dialX - 1, 30, 2, 9, 0x8a5f4a); // needle, parked
    }

    // vents: one out by the passenger side, one in the middle by the radio
    for (const vx of [24, 186]) {
      rect(ctx, vx, 24, 52, 20, 0x1a1d21);
      for (let i = 0; i < 4; i++) rect(ctx, vx + 3, 27 + i * 5, 46, 2, 0x25292f);
    }
  });

  draw(scene, MwTex.GLASS_GRIME, (ctx, w, h) => {
    // faint smears and specks so the glass reads as a surface you're looking
    // through rather than an open hole in the front of the car
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % w;
      const y = (i * 53) % h;
      const len = 10 + ((i * 31) % 34);
      rect(ctx, x, y, len, 1, 0xdfe8ef);
      rect(ctx, x + 3, y + 1, Math.max(3, len - 8), 1, 0xdfe8ef);
    }
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 40; i++) {
      rect(ctx, (i * 173) % w, (i * 71) % h, 1, 1, 0xe8f0f5);
    }
    // wiper-blade arcs left behind at the edges of the swept area
    ctx.globalAlpha = 0.04;
    for (const bx of [60, 300]) {
      for (let i = 0; i < 30; i++) rect(ctx, bx + i * 2, 20 + Math.round(i * i * 0.06), 3, 1, 0xdfe8ef);
    }
    ctx.globalAlpha = 1;
  });

  draw(scene, MwTex.WHEEL, (ctx, w, h) => {
    // an actual rim you can see the dash through, not a filled mass: the
    // ellipse is centred on the bottom edge so only its top half is on screen
    const cx = w / 2;
    const cy = h;
    const a = w / 2 - 6;
    const b = h - 10;
    const thickness = 8;

    for (let y = 0; y < h; y++) {
      const dy = (cy - y) / b;
      if (Math.abs(dy) > 1) continue;
      const dx = a * Math.sqrt(1 - dy * dy);
      const left = Math.round(cx - dx);
      const right = Math.round(cx + dx);
      rect(ctx, left - thickness / 2, y, thickness, 1, C.wheelRim);
      rect(ctx, right - thickness / 2, y, thickness, 1, C.wheelRim);
      // the top of the rim catches the grey light coming through the glass
      if (y > 10 && y < 20) {
        rect(ctx, left, y, thickness - 3, 1, C.wheelHilite);
        rect(ctx, right - thickness + 3, y, thickness - 3, 1, C.wheelHilite);
      }
    }

    // spokes out to the rim at roughly nine and three o'clock, plus the hub —
    // kept in rim tones so it reads as part of the wheel rather than a pale
    // block floating at the bottom of the screen
    const spokeY = Math.round(h * 0.72);
    rect(ctx, 12, spokeY, w - 24, 6, C.wheelRim);
    rect(ctx, Math.round(cx - 22), spokeY - 5, 44, 22, C.wheelRim);
    rect(ctx, Math.round(cx - 16), spokeY - 1, 32, 2, C.wheelHub);
  });

  const radio = (on: boolean) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    rect(ctx, 0, 0, w, h, C.radioTrim);
    rect(ctx, 1, 1, w - 2, h - 2, C.radioFace);

    // the unit is backlit either way — dim standby amber when it's off, the
    // green display when it's playing — so it always reads as live in the dark
    rect(ctx, 4, 4, w - 22, 11, on ? C.radioDisplayOn : C.radioStandby);
    if (on) {
      // a few dark notches read as digits without drawing real glyphs
      for (const dx of [6, 10, 16, 20, 26]) rect(ctx, dx, 6, 1, 7, C.radioDisplay);
    }
    // spill from the display onto the trim below it
    rect(ctx, 3, 15, w - 20, 1, on ? 0x2f5d3d : 0x2e2418);

    rect(ctx, w - 15, 4, 11, 11, C.knob);
    rect(ctx, w - 13, 6, 3, 3, on ? C.radioDisplayOn : C.radioStandby);
    rect(ctx, 4, h - 9, w - 8, 2, C.radioTrim);
    for (let i = 0; i < 5; i++) rect(ctx, 6 + i * 9, h - 7, 5, 4, C.knob);
  };
  draw(scene, MwTex.RADIO_ON, radio(true));
  draw(scene, MwTex.RADIO_OFF, radio(false));

  draw(scene, MwTex.WIPER, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, C.wiper);
    rect(ctx, 1, 0, 1, h, 0x2a2e33); // faint edge highlight along the blade
  });

  draw(scene, MwTex.MIRROR, (ctx, w, h) => {
    rect(ctx, Math.round(w / 2) - 2, 0, 4, 4, C.cabin); // stem up to the glass
    rect(ctx, 0, 3, w, h - 3, C.cabin);
    rect(ctx, 2, 5, w - 4, h - 8, C.mirrorGlass);
  });
}
