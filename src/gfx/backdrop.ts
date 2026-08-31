import { clear, ensureCanvas, rect, speckle } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

export const BACKDROP_KEY = "menu_backdrop";

/** A quiet, dread-tinged skyline for the main menu — pure atmosphere, no gameplay meaning. */
export function generateMenuBackdrop(scene: Phaser.Scene): void {
  const w = GAME_WIDTH;
  const h = GAME_HEIGHT;
  const tex = ensureCanvas(scene, BACKDROP_KEY, w, h);
  const ctx = tex.getContext();
  clear(ctx, w, h);

  // sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#0b0c1a");
  grad.addColorStop(0.55, "#161226");
  grad.addColorStop(1, "#241521");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // moon
  ctx.fillStyle = "#e9e3c8";
  ctx.beginPath();
  ctx.arc(w - 70, 54, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9c2a2";
  ctx.beginPath();
  ctx.arc(w - 64, 48, 3, 0, Math.PI * 2);
  ctx.fill();

  // stars
  speckle(ctx, 0, 0, w, h * 0.5, 0xd8d8e8, 60, 42);

  // distant skyline silhouette
  let x = -10;
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 1000) / 1000;
  };
  while (x < w + 10) {
    const bw = 14 + Math.floor(rand() * 22);
    const bh = 40 + Math.floor(rand() * 90);
    rect(ctx, x, h - bh - 40, bw, bh, 0x120d1a);
    // a few lit windows, sparse — most of the city is dark tonight
    for (let wy = h - bh - 34; wy < h - 46; wy += 10) {
      for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
        if (rand() > 0.86) rect(ctx, wx, wy, 2, 3, 0x6a5a2c);
      }
    }
    x += bw + 3;
  }

  // foreground rooftop band
  rect(ctx, 0, h - 40, w, 40, 0x0d0a14);
  speckle(ctx, 0, h - 40, w, 40, 0x171225, 40, 91);

  // faint red emergency-glow haze low on the horizon — the only hint
  // anything is wrong, easy to miss on first look
  const haze = ctx.createLinearGradient(0, h - 60, 0, h - 20);
  haze.addColorStop(0, "rgba(120,30,20,0)");
  haze.addColorStop(1, "rgba(120,30,20,0.18)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, h - 60, w, 40);

  tex.refresh();
}
