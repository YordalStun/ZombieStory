/**
 * Tiny helpers for hand-drawing placeholder pixel art onto a 2D canvas
 * context. Everything here works in whole pixels on purpose — no
 * anti-aliasing, no sub-pixel coordinates — so the output reads as
 * intentional pixel art rather than a blurry scaled-down photo.
 */

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: number,
): void {
  ctx.fillStyle = hex(color);
  ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
}

export function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  ctx.fillStyle = hex(color);
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

export function outline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  rect(ctx, x, y, w, 1, color);
  rect(ctx, x, y + h - 1, w, 1, color);
  rect(ctx, x, y, 1, h, color);
  rect(ctx, x + w - 1, y, 1, h, color);
}

/** Deterministic pseudo-random dither speckle — same seed always draws the same speckle, so shared tileset frames don't look identical when tiled. */
export function speckle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  count: number,
  seed: number,
): void {
  let s = seed || 1;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 1000) / 1000;
  };
  for (let i = 0; i < count; i++) {
    const dx = Math.floor(rand() * w);
    const dy = Math.floor(rand() * h);
    px(ctx, x + dx, y + dy, color);
  }
}

export function ensureCanvas(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  return scene.textures.createCanvas(key, w, h)!;
}
