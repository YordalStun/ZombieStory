import { ensureCanvas, clear, rect } from "@/gfx/canvasUtils";

export const FxTex = {
  RAIN_STREAK: "fx_rain_streak",
  RAIN_DROP: "fx_rain_drop",
} as const;

/** Small particle textures for weather effects — see core/fx/RainEffect.ts. */
export function generateFxTextures(scene: Phaser.Scene): void {
  const streak = ensureCanvas(scene, FxTex.RAIN_STREAK, 2, 10);
  const sctx = streak.getContext();
  clear(sctx, 2, 10);
  rect(sctx, 0, 0, 1, 10, 0xcfe0ea);
  rect(sctx, 1, 2, 1, 6, 0x9fb8c8);
  streak.refresh();

  const drop = ensureCanvas(scene, FxTex.RAIN_DROP, 3, 3);
  const dctx = drop.getContext();
  clear(dctx, 3, 3);
  rect(dctx, 1, 0, 1, 3, 0xcfe0ea);
  rect(dctx, 0, 1, 1, 1, 0xcfe0ea);
  drop.refresh();
}
