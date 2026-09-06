import { rect, outline, speckle, px, hex } from "@/gfx/canvasUtils";

/**
 * Email photo attachments, drawn with the same flat-shaded pixel-art
 * helpers as the rest of the game's art (src/gfx) rather than a CSS
 * gradient standing in for a "photo" — small native canvas, scaled up
 * crisply via CSS (image-rendering: pixelated) so it reads as one more
 * piece of the game's own art instead of a real photograph.
 */

function toDataUrl(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  return canvas.toDataURL("image/png");
}

/** Jenna's photo: bare grocery shelves, a couple of stragglers left. */
export function drawEmptyShelvesPhoto(): string {
  return toDataUrl(80, 48, (ctx) => {
    rect(ctx, 0, 0, 80, 48, 0xd8d2c2); // fluorescent-lit ceiling/wall
    rect(ctx, 0, 34, 80, 14, 0xb4ac98); // floor
    speckle(ctx, 0, 34, 80, 14, 0x9c9482, 30, 71);

    // three shelving units, each with 3 bare shelves
    for (const sx of [4, 30, 56]) {
      rect(ctx, sx, 6, 20, 30, 0xc7c0ac); // unit frame
      for (const sy of [10, 19, 28]) {
        rect(ctx, sx, sy, 20, 2, 0x8a8270); // shelf lip
      }
    }
    // a few stray items left behind — most shelf space bare on purpose
    rect(ctx, 8, 12, 4, 5, 0xb03a3a);
    rect(ctx, 34, 21, 5, 6, 0xd8b23a);
    rect(ctx, 60, 30, 4, 4, 0x3a6ab0);
    rect(ctx, 60, 12, 5, 5, 0xd8b23a);

    // a dropped/torn box on the floor
    rect(ctx, 20, 40, 8, 5, 0xa8875a);
    outline(ctx, 20, 40, 8, 5, 0x7a6240);
  });
}

/** Marcus's photo: a knot of people standing motionless on a street corner, seen from across the road. */
export function drawStreetCrowdPhoto(): string {
  return toDataUrl(80, 48, (ctx) => {
    // dusky sky
    rect(ctx, 0, 0, 80, 24, 0x2a3550);
    rect(ctx, 0, 18, 80, 6, 0x3a4666);
    // building silhouettes across the street
    rect(ctx, 0, 4, 18, 20, 0x1c2438);
    rect(ctx, 20, 0, 14, 24, 0x20293e);
    rect(ctx, 36, 8, 20, 16, 0x1c2438);
    rect(ctx, 58, 2, 22, 22, 0x20293e);
    // scattered lit windows
    for (const [wx, wy] of [
      [4, 8],
      [10, 14],
      [24, 6],
      [40, 12],
      [46, 16],
      [64, 8],
      [70, 14],
    ] as const) {
      px(ctx, wx, wy, 0xd8c878);
      px(ctx, wx + 1, wy, 0xd8c878);
    }
    // road + pavement
    rect(ctx, 0, 24, 80, 24, 0x35363a);
    rect(ctx, 0, 24, 80, 3, 0x44454a);
    speckle(ctx, 0, 27, 80, 21, 0x2b2c30, 40, 133);

    // a single street lamp casting a small pool of light
    rect(ctx, 6, 12, 1, 22, 0x1a1a1c);
    ctx.fillStyle = hex(0xe8d090);
    ctx.beginPath();
    ctx.ellipse(6, 34, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // the crowd itself — small dark humanoid silhouettes, clustered tight,
    // facing away/inward rather than toward camera (unsettling, not posed)
    const people: Array<[number, number]> = [
      [40, 30],
      [45, 31],
      [42, 34],
      [49, 33],
      [37, 33],
      [44, 27],
      [51, 29],
    ];
    for (const [px_, py] of people) {
      rect(ctx, px_, py, 3, 6, 0x0c0e14);
      rect(ctx, px_ + 1, py - 2, 1, 2, 0x0c0e14); // head
    }
  });
}

/** A personal photo from Danny's own camera roll: Sam's leaving do, warm pub lighting, pints raised. */
export function drawLeavingDoPhoto(): string {
  return toDataUrl(80, 48, (ctx) => {
    rect(ctx, 0, 0, 80, 48, 0x3a2a1e); // dim pub interior
    rect(ctx, 0, 30, 80, 18, 0x2a1e16); // bar-top shadow band
    // warm string lights along the top
    for (let x = 4; x < 80; x += 8) px(ctx, x, 4, 0xe8c878);
    // a knot of people, pint glasses raised — a bright glint on each glass
    // so it reads as mid-toast, not just standing around
    const people: Array<[number, number]> = [
      [14, 20],
      [26, 18],
      [38, 21],
      [50, 17],
      [62, 20],
    ];
    for (const [gx, gy] of people) {
      rect(ctx, gx, gy, 6, 14, 0x1c140e); // body
      rect(ctx, gx + 1, gy - 4, 4, 4, 0xc79a72); // head
      rect(ctx, gx + 6, gy - 2, 2, 5, 0xd8c090); // raised pint glass
      px(ctx, gx + 6, gy - 3, 0xe8b830); // glint of beer
    }
    rect(ctx, 0, 38, 80, 10, 0x5a4230); // the bar
    rect(ctx, 0, 38, 80, 2, 0x7a5c40);
  });
}

/** A personal photo from Danny's own camera roll: the cat, deeply unbothered, on the windowsill. */
export function drawCatPhoto(): string {
  return toDataUrl(80, 48, (ctx) => {
    rect(ctx, 0, 0, 80, 48, 0xb8c8d0); // daylight through the window
    rect(ctx, 0, 30, 80, 18, 0xa8926c); // windowsill
    outline(ctx, 0, 30, 80, 18, 0x8a7452);
    ctx.fillStyle = hex(0x5a5a62);
    ctx.beginPath();
    ctx.ellipse(38, 24, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill(); // curled body
    rect(ctx, 20, 10, 8, 8, 0x5a5a62); // head
    rect(ctx, 20, 6, 3, 5, 0x5a5a62); // ear
    rect(ctx, 25, 6, 3, 5, 0x4a4a52); // ear, folded — deeply unimpressed
    px(ctx, 22, 13, 0xd8e0a0);
    px(ctx, 25, 13, 0xd8e0a0);
    rect(ctx, 50, 22, 14, 3, 0x4a4a52); // tail, wrapped round
  });
}
