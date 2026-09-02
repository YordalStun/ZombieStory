import { rect, ensureCanvas, clear } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

/**
 * Five full-screen frames of the same high-up city view, from bright
 * afternoon through to full night — crossfaded in sequence by the scene
 * that uses them to sell a sunset timelapse without any actual animation
 * logic living in here. A deterministic PRNG seeds the building layout so
 * all five frames share the exact same skyline (only the sky/lighting
 * changes), rather than five independently-random silhouettes that would
 * "jump" between frames.
 */
export const CitySunsetTex = {
  DAY: "city_sunset_day",
  GOLDEN: "city_sunset_golden",
  SUNSET: "city_sunset_sunset",
  DUSK: "city_sunset_dusk",
  NIGHT: "city_sunset_night",
} as const;

interface Building {
  x: number;
  w: number;
  h: number;
  windows: Array<{ x: number; y: number }>;
  /** A smaller stacked block on top — real skyscrapers step in near the roof, and a uniform block silhouette is what reads as flattest/least "3D". */
  cap?: { w: number; h: number };
  roofDetail: "none" | "antenna" | "tank";
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 1000) / 1000;
  };
}

/**
 * One skyline layer. Called twice per frame with different seeds/ranges —
 * a short, dense FAR layer and a taller, sparser NEAR layer in front of
 * it — since two overlapping bands read as real depth in a way one flat
 * silhouette never does, especially once the near layer gets side-shading
 * (see drawSkyline) and the far one gets pushed toward the sky color as
 * haze. Deterministic seed keeps a given layer's shapes identical across
 * all five frames — only sky/tint/lit-windows differ between them.
 */
function buildSkylineLayer(seed: number, horizonY: number, minH: number, maxH: number, minW: number, maxW: number): Building[] {
  const rand = seededRandom(seed);
  const buildings: Building[] = [];
  let x = -10;
  while (x < GAME_WIDTH + 10) {
    const w = minW + rand() * (maxW - minW);
    const h = minH + rand() * (maxH - minH);
    const rows = Math.max(2, Math.floor(h / 14));
    const cols = Math.max(2, Math.floor(w / 10));
    const windows: Array<{ x: number; y: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.6) windows.push({ x: 3 + c * (w / cols), y: 4 + r * (h / rows) });
      }
    }
    const cap = rand() < 0.3 ? { w: w * (0.4 + rand() * 0.3), h: 8 + rand() * 16 } : undefined;
    const roofRoll = rand();
    const roofDetail: Building["roofDetail"] = roofRoll < 0.18 ? "antenna" : roofRoll < 0.3 ? "tank" : "none";
    buildings.push({ x, w, h, windows, cap, roofDetail });
    x += w + 3 + rand() * (horizonY > 150 ? 8 : 14);
  }
  return buildings;
}

function drawSkyGradient(ctx: CanvasRenderingContext2D, w: number, h: number, stops: Array<[number, string]>): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glow: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, glow);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, count: number): void {
  const rand = seededRandom(919);
  ctx.fillStyle = "#e8ecf8";
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.55;
    ctx.globalAlpha = 0.4 + rand() * 0.6;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
}

function lighten(hex: string, amt: number): string {
  return darken(hex, -amt);
}

function drawRoofDetail(ctx: CanvasRenderingContext2D, cx: number, topY: number, kind: Building["roofDetail"], color: string): void {
  if (kind === "antenna") {
    ctx.fillStyle = color;
    ctx.fillRect(cx, topY - 10, 1, 10);
    ctx.fillRect(cx - 1, topY - 10, 3, 1);
  } else if (kind === "tank") {
    ctx.fillStyle = color;
    ctx.fillRect(cx - 3, topY - 6, 6, 6);
    ctx.fillRect(cx - 2, topY - 8, 4, 2);
  }
}

/**
 * One skyline layer. `shaded` layers get a two-tone light/shadow split
 * per building (light source implied from the upper-left, matching where
 * the sun sits through the day), a lit roofline edge, roof massing/detail,
 * and windows — that's what actually reads as volumetric rather than a
 * paper cutout. `shaded=false` (the far layer) stays a flat, single-tone,
 * detail-less haze silhouette on purpose: real atmospheric perspective
 * loses contrast and fine detail with distance, so keeping it flat is
 * what SELLS it as farther away, not a shortcut.
 */
function drawSkylineLayer(
  ctx: CanvasRenderingContext2D,
  buildings: Building[],
  horizonY: number,
  base: string,
  litWindow: string,
  litFraction: number,
  shaded: boolean,
): void {
  const rand = seededRandom(shaded ? 88 : 41);
  const lit = lighten(base, shaded ? 26 : 10);
  const shadow = darken(base, shaded ? 30 : 8);

  for (const b of buildings) {
    const top = horizonY - b.h;
    const splitX = b.x + b.w * 0.62;

    ctx.fillStyle = shaded ? lit : base;
    ctx.fillRect(b.x, top, b.w * 0.62, b.h + 4);
    ctx.fillStyle = shaded ? shadow : base;
    ctx.fillRect(splitX, top, b.x + b.w - splitX, b.h + 4);

    if (shaded) {
      ctx.fillStyle = lighten(base, 46);
      ctx.fillRect(b.x, top, b.w, 1);
    }

    if (b.cap) {
      const capX = b.x + (b.w - b.cap.w) / 2;
      const capTop = top - b.cap.h;
      const capSplit = capX + b.cap.w * 0.62;
      ctx.fillStyle = shaded ? lit : base;
      ctx.fillRect(capX, capTop, b.cap.w * 0.62, b.cap.h + 2);
      ctx.fillStyle = shaded ? shadow : base;
      ctx.fillRect(capSplit, capTop, capX + b.cap.w - capSplit, b.cap.h + 2);
      if (shaded) drawRoofDetail(ctx, capX + b.cap.w / 2, capTop, b.roofDetail, shadow);
    } else if (shaded) {
      drawRoofDetail(ctx, b.x + b.w / 2, top, b.roofDetail, shadow);
    }
  }

  if (litFraction > 0) {
    ctx.fillStyle = litWindow;
    for (const b of buildings) {
      for (const win of b.windows) {
        if (rand() < litFraction) ctx.fillRect(b.x + win.x, horizonY - b.h + win.y, 2, 3);
      }
    }
  }
}

function drawSkyline(ctx: CanvasRenderingContext2D, horizonY: number, silhouette: string, litWindow: string, litFraction: number): void {
  const farH = horizonY - 34;
  const far = buildSkylineLayer(771, farH, 60, 92, 20, 40);
  const near = buildSkylineLayer(4271, horizonY, 66, horizonY - 20, 22, 52);

  // the far layer's own flat, detail-less, lightened-toward-the-sky
  // treatment is what sells "distant" — no separate haze overlay on top of
  // it, since that read as a seam wherever a shorter near building failed
  // to fully cover it rather than as atmospheric depth
  drawSkylineLayer(ctx, far, farH, lighten(silhouette, 34), litWindow, litFraction * 0.35, false);
  drawSkylineLayer(ctx, near, horizonY, silhouette, litWindow, litFraction, true);
}

/** A dark sill/ledge band along the bottom — sells "looking out through a high window" and covers the gap below the skyline's base. */
function drawLedge(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, color: number): void {
  rect(ctx, 0, horizonY + 4, w, h - horizonY - 4, color);
  rect(ctx, 0, horizonY + 4, w, 2, color);
}

function drawFull(scene: Phaser.Scene, key: string, fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): void {
  const tex = ensureCanvas(scene, key, GAME_WIDTH, GAME_HEIGHT);
  const ctx = tex.getContext();
  clear(ctx, GAME_WIDTH, GAME_HEIGHT);
  fn(ctx, GAME_WIDTH, GAME_HEIGHT);
  tex.refresh();
}

export function generateCitySunsetTextures(scene: Phaser.Scene): void {
  const horizonY = 190;

  drawFull(scene, CitySunsetTex.DAY, (ctx, w, h) => {
    drawSkyGradient(ctx, w, h, [
      [0, "#5a9fd6"],
      [0.6, "#9cc9e8"],
      [1, "#c9e2ee"],
    ]);
    drawSun(ctx, w * 0.72, 62, 16, "#fff8e0", "rgba(255,250,220,0.5)");
    drawSkyline(ctx, horizonY, "#4a5a68", "#fff6c8", 0);
    drawLedge(ctx, w, h, horizonY, 0x3a4a52);
  });

  drawFull(scene, CitySunsetTex.GOLDEN, (ctx, w, h) => {
    drawSkyGradient(ctx, w, h, [
      [0, "#7ab0d8"],
      [0.55, "#e8c088"],
      [1, "#f2d9a8"],
    ]);
    drawSun(ctx, w * 0.62, 96, 17, "#ffd88a", "rgba(255,200,110,0.55)");
    drawSkyline(ctx, horizonY, "#454858", "#ffdb8a", 0.15);
    drawLedge(ctx, w, h, horizonY, 0x342c38);
  });

  drawFull(scene, CitySunsetTex.SUNSET, (ctx, w, h) => {
    drawSkyGradient(ctx, w, h, [
      [0, "#3d3f6e"],
      [0.4, "#a9557a"],
      [0.72, "#e8794f"],
      [1, "#f7b169"],
    ]);
    drawSun(ctx, w * 0.5, 152, 20, "#ff9a4d", "rgba(255,130,60,0.6)");
    drawSkyline(ctx, horizonY, "#242233", "#ffb85e", 0.4);
    drawLedge(ctx, w, h, horizonY, 0x201a26);
  });

  drawFull(scene, CitySunsetTex.DUSK, (ctx, w, h) => {
    drawSkyGradient(ctx, w, h, [
      [0, "#131a3a"],
      [0.5, "#2e2a5a"],
      [0.8, "#6a3f5e"],
      [1, "#a85a55"],
    ]);
    drawStars(ctx, w, horizonY, 40);
    // sun already below the horizon — just its afterglow along the skyline
    const glow = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY);
    glow.addColorStop(0, "rgba(255,140,80,0)");
    glow.addColorStop(1, "rgba(255,140,80,0.35)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizonY - 30, w, 30);
    drawSkyline(ctx, horizonY, "#161522", "#ffcf7a", 0.7);
    drawLedge(ctx, w, h, horizonY, 0x14101a);
  });

  drawFull(scene, CitySunsetTex.NIGHT, (ctx, w, h) => {
    drawSkyGradient(ctx, w, h, [
      [0, "#05061a"],
      [0.7, "#0e1030"],
      [1, "#1b1f3f"],
    ]);
    drawStars(ctx, w, horizonY, 70);
    drawSun(ctx, w * 0.18, 44, 12, "#eef0f4", "rgba(230,235,250,0.28)"); // moon
    drawSkyline(ctx, horizonY, "#0c0c14", "#ffd98a", 0.85);
    drawLedge(ctx, w, h, horizonY, 0x0a0810);
  });
}
