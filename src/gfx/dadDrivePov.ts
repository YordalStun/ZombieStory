import { rect, outline, speckle, ensureCanvas, clear } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

/**
 * The backseat POV for Dad's drive: a static "SKY" backdrop (sky, distant
 * trees, the road stretching to a horizon) sits at the back; a handful of
 * small dynamic sprites (lane dashes, passing cars/zombies) are animated
 * toward the viewer over it to sell speed; and DASHBOARD sits in front of
 * all of it with an opaque cabin frame and a transparent windshield cutout
 * — anything behind naturally gets clipped by whichever is opaque, no
 * masking needed. Composition follows a real back-seat dashboard photo:
 * right-hand drive, mirror + visors under the headliner, two front
 * headrests, instrument cluster/wheel on the right, console between.
 */
export const DadDrivePovTex = {
  DASHBOARD: "dad_drive_dashboard",
  SKY: "dad_drive_sky",
  LANE_DASH: "dad_drive_lane_dash",
  HOUSE_WALL: "dad_drive_house_wall",
  CAR_AHEAD: "dad_drive_car_ahead",
} as const;

/** Road-space geometry shared between the sky backdrop and the scene's animated sprites. */
export const DAD_DRIVE_ROAD = {
  horizonY: 118,
  bottomY: 272,
  centerX: 240,
} as const;

/** The crash beat's wall band — sized for that composition, not the full screen (a full-screen image positioned mid-frame just clipped its own most interesting detail out of view). */
export const WALL_SIZE = { w: 480, h: 130 };

function drawFull(scene: Phaser.Scene, key: string, fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): void {
  const tex = ensureCanvas(scene, key, GAME_WIDTH, GAME_HEIGHT);
  const ctx = tex.getContext();
  clear(ctx, GAME_WIDTH, GAME_HEIGHT);
  fn(ctx, GAME_WIDTH, GAME_HEIGHT);
  tex.refresh();
}

function drawSized(
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

function polygon(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: number): void {
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

export function generateDadDrivePovTextures(scene: Phaser.Scene): void {
  const { horizonY, centerX } = DAD_DRIVE_ROAD;

  // ---- SKY: static backdrop, seen only through the windshield cutout ----
  drawFull(scene, DadDrivePovTex.SKY, (ctx, w, h) => {
    rect(ctx, 0, 0, w, horizonY, 0xb8bdc4);
    rect(ctx, 0, 0, w, horizonY * 0.45, 0xc9ccd1);
    rect(ctx, 0, horizonY - 18, w, 18, 0xaba398);

    // sparse bare-branch clusters along the horizon — irregular spacing and
    // radiating twigs, not a uniform grid (which read as a row of crosses)
    ctx.strokeStyle = "#4a4438";
    ctx.lineWidth = 1;
    for (let x = -10; x < w + 10; ) {
      const baseX = x + Math.random() * 4;
      const clusterH = 9 + Math.random() * 15;
      const branches = 3 + Math.floor(Math.random() * 3);
      for (let b = 0; b < branches; b++) {
        const ang = -1.15 - Math.random() * 1.3;
        const len = clusterH * (0.5 + Math.random() * 0.6);
        const bx = baseX + (Math.random() - 0.5) * 6;
        ctx.beginPath();
        ctx.moveTo(bx, horizonY);
        ctx.lineTo(bx + Math.cos(ang) * len * 0.5, horizonY + Math.sin(ang) * len);
        ctx.stroke();
      }
      x += 20 + Math.random() * 22;
    }

    // grass verge either side of the road
    rect(ctx, 0, horizonY, w, h - horizonY, 0x3d4a30);

    // road: a trapezoid widening from the horizon down to the bottom edge
    const topHalfW = 10;
    const botHalfW = 210;
    ctx.fillStyle = "#3a3a3e";
    ctx.beginPath();
    ctx.moveTo(centerX - topHalfW, horizonY);
    ctx.lineTo(centerX + topHalfW, horizonY);
    ctx.lineTo(centerX + botHalfW, h);
    ctx.lineTo(centerX - botHalfW, h);
    ctx.closePath();
    ctx.fill();

    // hard shoulder line down the left edge of the road
    ctx.strokeStyle = "#cfc7ae";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - topHalfW - 1, horizonY);
    ctx.lineTo(centerX - botHalfW - 4, h);
    ctx.stroke();

    // crash barrier receding along the right verge
    ctx.strokeStyle = "#9096a0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX + topHalfW + 6, horizonY + 4);
    ctx.lineTo(centerX + botHalfW + 30, h - 40);
    ctx.stroke();

    // a distant overpass crossing the road
    rect(ctx, centerX - 40, horizonY - 6, 80, 5, 0x5a5850);

    // a road sign on the verge
    rect(ctx, centerX - 90, horizonY - 2, 2, 14, 0x6a6a6a);
    rect(ctx, centerX - 96, horizonY - 14, 14, 12, 0x2a5a9a);
  });

  // ---- a single lane-dash marker, scaled/moved toward the viewer in-scene ----
  drawFull(scene, DadDrivePovTex.LANE_DASH, (ctx) => {
    rect(ctx, 0, 0, 6, 20, 0xd8d0b8);
  });

  // ---- a car glimpsed from behind/above, as we approach and overtake it —
  // the previous top-down car sprite read as the wrong camera angle
  // entirely through a windshield. Drawn near-white so the scene's setTint()
  // still reads as a real paint colour. ----
  drawSized(scene, DadDrivePovTex.CAR_AHEAD, 26, 20, (ctx, w, h) => {
    rect(ctx, 1, 2, w - 2, h - 4, 0xe8e8e8);
    rect(ctx, 0, h - 3, w, 3, 0xc8c8c8); // rear bumper
    rect(ctx, 3, 4, w - 6, 8, 0x1c2430); // rear windscreen
    rect(ctx, 3, 4, w - 6, 2, 0x3a4858); // glass highlight along the top
    rect(ctx, 2, h - 7, 5, 4, 0xc03030); // tail light, left
    rect(ctx, w - 7, h - 7, 5, 4, 0xc03030); // tail light, right
    outline(ctx, 1, 2, w - 2, h - 4, 0xb0b0b0);
  });

  // ---- DASHBOARD: the opaque cabin frame, windshield left transparent ----
  drawFull(scene, DadDrivePovTex.DASHBOARD, (ctx, w, h) => {
    const cabin = 0x1c1c20;
    const cabinLight = 0x2a2a30;
    const cabinDeep = 0x151518;

    // A-pillars, each a tapered quad from header down to footwell — just
    // enough to read as looking out through a windshield rather than a
    // flat screen; too wide and the cabin trim dominates over the view
    polygon(ctx, [
      [0, 0],
      [82, 40],
      [62, h],
      [0, h],
    ], cabin);
    polygon(ctx, [
      [w, 0],
      [w - 82, 40],
      [w - 62, h],
      [w, h],
    ], cabin);

    // headliner
    rect(ctx, 0, 0, w, 40, cabin);
    rect(ctx, 0, 37, w, 3, cabinLight);

    // sun visors, flush against the headliner either side of the mirror
    rect(ctx, 140, 4, 66, 13, cabinLight);
    rect(ctx, w - 206, 4, 66, 13, cabinLight);

    // rearview mirror, hanging center-stage
    rect(ctx, w / 2 - 3, 14, 6, 20, 0x1a1a1e);
    rect(ctx, w / 2 - 36, 32, 72, 15, cabinDeep);
    rect(ctx, w / 2 - 36, 32, 72, 2, 0x2e2e34);
    rect(ctx, w / 2 - 20, 35, 40, 8, 0x362a20); // faint warm reflection hint

    // ---- dashboard/console band across the bottom ----
    rect(ctx, 0, 175, w, h - 175, 0x24242a);
    rect(ctx, 0, 175, w, 3, 0x30303a);

    // passenger-side dash (left) — plain, uncluttered
    rect(ctx, 54, 178, 120, 30, 0x1f1f24);

    // center console: vents, climate knobs, radio, gearstick
    rect(ctx, 196, 180, 26, 10, cabinDeep);
    rect(ctx, 258, 180, 26, 10, cabinDeep);
    for (const kx of [206, 240, 274]) {
      ctx.fillStyle = "#33333a";
      ctx.beginPath();
      ctx.arc(kx, 206, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a4a54";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    rect(ctx, 195, 222, 90, 24, cabinDeep);
    rect(ctx, 202, 228, 22, 8, 0x2a4a48);
    ctx.fillStyle = "#7fe0c8";
    ctx.fillRect(205, 230, 14, 4);
    for (const bx of [232, 246, 260, 274]) rect(ctx, bx, 228, 8, 8, 0x353540);
    rect(ctx, 233, 250, 14, 8, 0x1a1a1e);
    rect(ctx, 236, 234, 8, 18, 0x2a2a30);

    // ---- instrument cluster + steering wheel, right side (RHD) — anchored
    // to the dashboard band, with a clean gap between them so the wheel
    // doesn't collide with the gauges instead of sitting neatly below them ----
    const dashTop = 175;
    const wheelCx = 270;
    const wheelCy = dashTop + 30;
    const clusterCy = 140;
    rect(ctx, 218, 116, 106, 42, cabinDeep);
    ctx.fillStyle = "#1c1c22";
    for (const [gx, gr] of [[244, 12], [296, 14]] as const) {
      ctx.beginPath();
      ctx.arc(gx, clusterCy, gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d8a355";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gx, clusterCy, gr - 2, -2.4, 1.6);
      ctx.stroke();
    }

    ctx.strokeStyle = "#141416";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(wheelCx, wheelCy, 36, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.strokeStyle = "#2a2a30";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wheelCx, wheelCy, 40, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    // spokes
    ctx.strokeStyle = "#1a1a1e";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(wheelCx, wheelCy);
    ctx.lineTo(wheelCx - 34, wheelCy - 15);
    ctx.moveTo(wheelCx, wheelCy);
    ctx.lineTo(wheelCx + 34, wheelCy - 15);
    ctx.stroke();
    rect(ctx, wheelCx - 6, wheelCy - 6, 12, 12, 0x1a1a1e);

    // driver's hand on the wheel rim
    ctx.fillStyle = "#c78a5e";
    ctx.beginPath();
    ctx.ellipse(wheelCx + 38, wheelCy + 8, 9, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // ---- two front headrests, closest to camera so drawn last ----
    const headrestY = 196;
    // passenger side (left) — empty
    rect(ctx, 58, headrestY, 118, h - headrestY, 0x232328);
    rect(ctx, 58, headrestY, 118, 8, 0x2c2c32);
    outline(ctx, 58, headrestY, 118, h - headrestY, 0x18181c);

    // driver side (right) — Dad's head/shoulder visible above and beside it
    rect(ctx, w - 176, headrestY, 118, h - headrestY, 0x232328);
    rect(ctx, w - 176, headrestY, 118, 8, 0x2c2c32);
    outline(ctx, w - 176, headrestY, 118, h - headrestY, 0x18181c);

    // from directly behind, Dad's headrest hides almost all of him — just
    // a sliver of greying hair over the top is enough to read as "someone
    // is sat there", not a whole visible head and shoulders. The flat edge
    // of the half-ellipse sits right at the headrest's own top edge so it
    // reads as hair poking up out of it, not a blob floating above it.
    const headCx = w - 117;
    ctx.fillStyle = "#9a9aa0";
    ctx.beginPath();
    ctx.ellipse(headCx, headrestY, 26, 16, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a7a80";
    ctx.beginPath();
    ctx.ellipse(headCx + 10, headrestY, 26, 16, 0, Math.PI * 1.35, Math.PI * 1.9);
    ctx.fill();
  });

  // ---- the side of the house — what Dad actually drives into. Sized for
  // the crash beat's own composition (a band across the screen), not the
  // full canvas — a full-screen image positioned mid-frame just clipped
  // its own most interesting detail (the window) out of view ----
  drawSized(scene, DadDrivePovTex.HOUSE_WALL, WALL_SIZE.w, WALL_SIZE.h, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0xcfc6ae); // pebbledash render
    speckle(ctx, 0, 0, w, h, 0xb8ae94, 200, 23);
    speckle(ctx, 0, 0, w, h, 0xe0d8c0, 140, 41);
    rect(ctx, 0, h - 20, w, 20, 0x8a7a5e); // brick plinth at the base
    rect(ctx, 0, h - 20, w, 3, 0x6e6048);
    // a window, off to one side, to read unmistakably as "a house"
    rect(ctx, w - 150, 22, 70, 78, 0x4a4032);
    rect(ctx, w - 146, 26, 62, 70, 0x2a3a48);
    rect(ctx, w - 146, 26, 62, 3, 0xdcd2b8);
    rect(ctx, w - 116, 26, 3, 70, 0xdcd2b8);
  });
}
