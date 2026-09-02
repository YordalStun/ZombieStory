import { rect, ensureCanvas, clear } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

/**
 * One full-screen "back seat looking forward" cabin frame — headliner,
 * pillars, two front headrests and the dashboard, all opaque; the
 * windshield area in the middle is left untouched (transparent), so
 * whatever's drawn behind it (the scrolling road) shows through without
 * needing any alpha compositing.
 */
export const DadDrivePovTex = {
  DASHBOARD: "dad_drive_dashboard",
} as const;

export function generateDadDrivePovTextures(scene: Phaser.Scene): void {
  const key = DadDrivePovTex.DASHBOARD;
  const tex = ensureCanvas(scene, key, GAME_WIDTH, GAME_HEIGHT);
  const ctx = tex.getContext();
  clear(ctx, GAME_WIDTH, GAME_HEIGHT);

  const w = GAME_WIDTH;
  const h = GAME_HEIGHT;
  const cabin = 0x1c1c20;
  const cabinLight = 0x26262c;

  rect(ctx, 0, 0, w, 30, cabin);
  rect(ctx, 0, 0, 44, h, cabin);
  rect(ctx, w - 44, 0, 44, h, cabin);
  rect(ctx, 0, h - 86, w, 86, cabinLight);
  rect(ctx, 0, h - 86, w, 5, 0x323238);

  for (const hx of [w * 0.24, w * 0.76 - 56]) {
    rect(ctx, hx, h - 150, 56, 92, 0x18181c);
    rect(ctx, hx + 7, h - 144, 42, 62, 0x222226);
  }

  tex.refresh();
}
