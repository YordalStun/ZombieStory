import { rect, speckle, ensureCanvas, clear, outline } from "@/gfx/canvasUtils";

export const ReturnDriveTex = {
  ROAD_TILE: "return_road_tile",
  SMOKE_PUFF: "return_smoke_puff",
  BARRIER: "return_barrier",
  SIGN: "return_sign",
} as const;

export const ROAD_TILE_SIZE = { w: 208, h: 48 };

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

export function generateReturnDriveTextures(scene: Phaser.Scene): void {
  draw(scene, ReturnDriveTex.ROAD_TILE, ROAD_TILE_SIZE.w, ROAD_TILE_SIZE.h, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x3a3a3e);
    speckle(ctx, 0, 0, w, h, 0x333338, 30, 5);
    rect(ctx, 6, 0, 3, h, 0xd8d0b8);
    rect(ctx, w - 9, 0, 3, h, 0xd8d0b8);
    rect(ctx, w / 2 - 2, 4, 4, 18, 0xcfc7ae);
    rect(ctx, w / 2 - 2, 28, 4, 18, 0xcfc7ae);
  });

  draw(scene, ReturnDriveTex.SMOKE_PUFF, 20, 20, (ctx) => {
    ctx.fillStyle = "#9a9a9a";
    ctx.beginPath();
    ctx.arc(10, 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b8b8b8";
    ctx.beginPath();
    ctx.arc(7, 7, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // a short guardrail segment — repeated in a scrolling line along both
  // road edges, so drawn tall/narrow to stack seamlessly end to end
  draw(scene, ReturnDriveTex.BARRIER, 8, 22, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x8a8f96);
    rect(ctx, 0, 0, w, 3, 0xb8bcc2);
    rect(ctx, 0, h - 3, w, 3, 0x5a5e64);
    rect(ctx, w / 2 - 1, 0, 2, h, 0x6a6e74);
  });

  // a green motorway sign on a post
  draw(scene, ReturnDriveTex.SIGN, 18, 28, (ctx, w, h) => {
    rect(ctx, w / 2 - 1, 11, 2, h - 11, 0x6a6e74);
    rect(ctx, w / 2 - 3, h - 4, 6, 4, 0x4a4e54);
    rect(ctx, 0, 0, w, 13, 0x1e6b3a);
    outline(ctx, 0, 0, w, 13, 0xf0f0e8);
    rect(ctx, 2, 3, w - 4, 2, 0xf0f0e8);
    rect(ctx, 2, 7, w - 7, 2, 0xf0f0e8);
  });
}
