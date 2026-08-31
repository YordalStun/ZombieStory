import { clear, rect, ensureCanvas } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

export const MwTex = {
  BACKDROP: "mw_backdrop",
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

/** Texture key for one baked queue-car instance — see QUEUE_CARS below. */
export function carTexKey(id: string): string {
  return `mw_car_${id}`;
}

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
  carGlass: 0x262b31,
  tailLight: 0xff4a3a,
  tailGlow: 0xff8a72,
  plate: 0xcfc8b0,
  distantCar: 0x2e3238,
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
  w: number,
  h: number,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const tex = ensureCanvas(scene, key, w, h);
  const ctx = tex.getContext();
  clear(ctx, w, h);
  fn(ctx, w, h);
  tex.refresh();
}

// a handful of realistic, clearly distinct body/roof tones — every queue car
// picks a pair from here, drawn directly rather than tinted at runtime, since
// tinting one shared silhouette washed the glass and tail lights out too
const CAR_COLORS: Array<{ body: number; roof: number }> = [
  { body: 0xdcd7ca, roof: 0xbdb8a9 }, // cream / white
  { body: 0x9298a0, roof: 0x767c84 }, // silver
  { body: 0x2c2f34, roof: 0x1e2024 }, // charcoal
  { body: 0x9c3d3d, roof: 0x7c2f2f }, // red
  { body: 0x5c2530, roof: 0x431b24 }, // maroon
  { body: 0x314f70, roof: 0x243a54 }, // navy
  { body: 0x8c7c5c, roof: 0x6e6047 }, // tan
  { body: 0x3f5c46, roof: 0x2e4433 }, // forest green
];

export type CarStyle = "sedan" | "estate" | "van" | "hatch";

/** One car baked and placed in the stopped queue. */
export interface QueueCarSpec {
  id: string;
  style: CarStyle;
  colorIndex: number;
  w: number;
  h: number;
  x: number;
  y: number;
  /** Near cars ride their brakes visibly; distant ones don't need the glow. */
  brakeLit: boolean;
}

/**
 * Three lanes of stopped traffic receding toward the horizon, nose-to-tail
 * within each lane rather than scattered — that's what actually reads as a
 * backed-up queue instead of a handful of cars dropped on an empty road.
 * Positions are hand-placed (not randomised) so the scene is reproducible.
 */
/** The car the zombie sequence targets — see QUEUE_CARS' "c0" entry. */
export const ZOMBIE_TARGET_CAR_ID = "c0";

export const QUEUE_CARS: QueueCarSpec[] = [
  // left lane
  { id: "a0", style: "hatch", colorIndex: 1, w: 56, h: 38, x: 90, y: 158, brakeLit: true },
  { id: "a1", style: "sedan", colorIndex: 5, w: 37, h: 26, x: 101, y: 136, brakeLit: false },
  { id: "a2", style: "van", colorIndex: 2, w: 27, h: 20, x: 92, y: 119, brakeLit: false },
  { id: "a3", style: "estate", colorIndex: 6, w: 19, h: 14, x: 98, y: 105, brakeLit: false },

  // centre lane — straight ahead, so its lead car is the closest thing in the scene
  { id: "b0", style: "estate", colorIndex: 3, w: 62, h: 43, x: 236, y: 152, brakeLit: true },
  { id: "b1", style: "hatch", colorIndex: 0, w: 40, h: 27, x: 248, y: 129, brakeLit: false },
  { id: "b2", style: "sedan", colorIndex: 7, w: 28, h: 20, x: 238, y: 113, brakeLit: false },
  { id: "b3", style: "van", colorIndex: 4, w: 20, h: 15, x: 246, y: 100, brakeLit: false },
  { id: "b4", style: "sedan", colorIndex: 1, w: 15, h: 11, x: 232, y: 96, brakeLit: false },

  // right lane
  // the red car — see ZOMBIE_TARGET_CAR_ID below
  { id: "c0", style: "sedan", colorIndex: 3, w: 54, h: 37, x: 380, y: 160, brakeLit: true },
  { id: "c1", style: "van", colorIndex: 6, w: 37, h: 26, x: 392, y: 137, brakeLit: false },
  { id: "c2", style: "hatch", colorIndex: 3, w: 26, h: 18, x: 382, y: 119, brakeLit: false },
  { id: "c3", style: "estate", colorIndex: 0, w: 18, h: 13, x: 390, y: 104, brakeLit: false },
];

/** A car seen from directly behind, its silhouette shaped by `style`. */
function drawCarRear(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: CarStyle,
  bodyColor: number,
  roofColor: number,
): void {
  const shape = {
    sedan: { roofInset: 0.12, roofFrac: 0.34, flatRoof: false, lightFrac: 0.16 },
    estate: { roofInset: 0.1, roofFrac: 0.56, flatRoof: false, lightFrac: 0.15 },
    van: { roofInset: 0.04, roofFrac: 0.72, flatRoof: true, lightFrac: 0.2 },
    hatch: { roofInset: 0.14, roofFrac: 0.46, flatRoof: false, lightFrac: 0.14 },
  }[style];

  const roofInset = Math.max(1, Math.round(w * shape.roofInset));
  const roofH = Math.round(h * shape.roofFrac);
  const lightH = Math.max(2, Math.round(h * 0.11));
  const lightW = Math.max(3, Math.round(w * shape.lightFrac));

  // roof and rear window
  rect(ctx, roofInset, 0, w - roofInset * 2, roofH, roofColor);
  rect(ctx, roofInset + 2, shape.flatRoof ? 2 : 1, w - roofInset * 2 - 4, Math.max(2, roofH - 5), C.carGlass);
  if (!shape.flatRoof) {
    // rounded shoulder into the body — a van's roof stays square instead
    rect(ctx, roofInset - 1, roofH - 2, 1, 2, bodyColor);
    rect(ctx, w - roofInset, roofH - 2, 1, 2, bodyColor);
  }

  // body
  rect(ctx, 0, roofH, w, h - roofH, bodyColor);
  // shadow under the bumper, so it sits on the road instead of floating
  rect(ctx, 1, h - Math.round(h * 0.12), w - 2, Math.round(h * 0.12), 0x1b1e22);

  if (style === "estate") {
    // roof rails — a pair of thin lines along the top
    rect(ctx, roofInset + 3, 1, w - roofInset * 2 - 6, 1, 0x1c1f23);
  }

  // tail lights, with a soft bloom either side
  const lightY = Math.round(h * (style === "van" ? 0.58 : 0.48));
  rect(ctx, 2, lightY, lightW, lightH, C.tailLight);
  rect(ctx, w - 2 - lightW, lightY, lightW, lightH, C.tailLight);
  rect(ctx, 1, lightY + lightH, lightW + 2, 1, C.tailGlow);
  rect(ctx, w - 3 - lightW, lightY + lightH, lightW + 2, 1, C.tailGlow);

  // plate
  const plateW = Math.max(6, Math.round(w * 0.3));
  const plateY = style === "van" ? h - Math.round(h * 0.28) : Math.round(h * 0.68);
  rect(ctx, Math.round((w - plateW) / 2), plateY, plateW, Math.max(2, lightH - 1), C.plate);
}

export function generateMotorwayTextures(scene: Phaser.Scene): void {
  draw(scene, MwTex.BACKDROP, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
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

    // two dashed dividers splitting our carriageway into three lanes, so the
    // queue of cars reads as three lanes of stopped traffic rather than a
    // scatter — spaced wider as they come toward us, same as before
    for (const baseX of [168, 312]) {
      let y = 100;
      let gap = 5;
      while (y < h) {
        const drift = Math.round(((baseX - 240) / 240) * (y - 100) * 0.06);
        rect(ctx, baseX + drift - 1, y, 2 + Math.round(gap / 4), gap, C.laneMark);
        y += gap * 3;
        gap += 3;
      }
    }

    // a smudge of queue continuing past the last modelled car, right at the
    // horizon — sells "backed up as far as you can see" without needing more
    // fully-modelled cars this close to the vanishing point
    for (const dx of [82, 150, 210, 270, 330, 398]) {
      rect(ctx, dx, 97 + ((dx * 13) % 3), 6, 3, C.distantCar);
    }
  });

  for (const car of QUEUE_CARS) {
    const { body, roof } = CAR_COLORS[car.colorIndex % CAR_COLORS.length];
    draw(scene, carTexKey(car.id), car.w, car.h, (ctx, w, h) => drawCarRear(ctx, w, h, car.style, body, roof));
  }

  draw(scene, MwTex.HEADLINER, GAME_WIDTH, 26, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, C.cabin);
    rect(ctx, 0, h - 3, w, 3, C.cabinLit); // trim catching the grey daylight
  });

  draw(scene, MwTex.PILLAR, 20, 146, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, C.cabin);
    rect(ctx, w - 2, 0, 2, h, C.cabinLit);
  });

  draw(scene, MwTex.DASH, GAME_WIDTH, 102, (ctx, w, h) => {
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

  draw(scene, MwTex.GLASS_GRIME, GAME_WIDTH - 40, 142, (ctx, w, h) => {
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

  draw(scene, MwTex.WHEEL, 196, 104, (ctx, w, h) => {
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
  draw(scene, MwTex.RADIO_ON, 56, 30, radio(true));
  draw(scene, MwTex.RADIO_OFF, 56, 30, radio(false));

  draw(scene, MwTex.WIPER, 4, 96, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, C.wiper);
    rect(ctx, 1, 0, 1, h, 0x2a2e33); // faint edge highlight along the blade
  });

  draw(scene, MwTex.MIRROR, 46, 15, (ctx, w, h) => {
    rect(ctx, Math.round(w / 2) - 2, 0, 4, 4, C.cabin); // stem up to the glass
    rect(ctx, 0, 3, w, h - 3, C.cabin);
    rect(ctx, 2, 5, w - 4, h - 8, C.mirrorGlass);
  });
}
