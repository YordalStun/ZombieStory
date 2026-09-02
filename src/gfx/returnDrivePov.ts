import { clear, rect, outline, speckle, ensureCanvas } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

/**
 * Full-screen illustrated POV shots for the breakdown cutscene — same
 * composed-static-image technique as OfficeScene's elevator intro and
 * MotorwayScene's cabin dressing, just three new one-off frames instead of
 * reusable tiles, since each is only ever shown once per playthrough.
 */
export const PovTex = {
  PHONE: "pov_phone",
  DIRT_PATH: "pov_dirt_path",
  BOOT: "pov_boot",
} as const;

function draw(
  scene: Phaser.Scene,
  key: string,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const tex = ensureCanvas(scene, key, GAME_WIDTH, GAME_HEIGHT);
  const ctx = tex.getContext();
  clear(ctx, GAME_WIDTH, GAME_HEIGHT);
  fn(ctx, GAME_WIDTH, GAME_HEIGHT);
  tex.refresh();
}

export function generateReturnDrivePovTextures(scene: Phaser.Scene): void {
  draw(scene, PovTex.PHONE, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x14161c);
    speckle(ctx, 0, 0, w, h, 0x1c1f28, 60, 7);
    // hand, bottom-center, holding the phone up toward "camera"
    rect(ctx, w / 2 - 60, h - 70, 120, 70, 0xb98a63);
    rect(ctx, w / 2 - 60, h - 70, 120, 10, 0xa5754f);
    // phone body
    rect(ctx, w / 2 - 34, h - 190, 68, 130, 0x0c0d10);
    outline(ctx, w / 2 - 34, h - 190, 68, 130, 0x2a2d34);
    // screen
    rect(ctx, w / 2 - 28, h - 182, 56, 114, 0x1a2230);
    // status bar + no-signal glyph (bars with a red strike, tweened blink from the scene)
    rect(ctx, w / 2 - 22, h - 176, 4, 3, 0x3a4658);
    rect(ctx, w / 2 - 16, h - 178, 4, 5, 0x3a4658);
    rect(ctx, w / 2 - 10, h - 181, 4, 8, 0x3a4658);
  });

  draw(scene, PovTex.DIRT_PATH, (ctx, w, h) => {
    // dusky sky
    rect(ctx, 0, 0, w, h * 0.42, 0x4a3a52);
    rect(ctx, 0, 0, w, h * 0.16, 0x2c2440);
    // distant treeline
    ctx.fillStyle = "#241f30";
    for (let x = -20; x < w + 20; x += 26) {
      const th = 30 + ((x * 37) % 22);
      ctx.beginPath();
      ctx.ellipse(x, h * 0.42, 18, th, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // verge grass either side
    rect(ctx, 0, h * 0.42, w, h * 0.58, 0x2f3a26);
    speckle(ctx, 0, h * 0.42, w, h * 0.58, 0x263019, 140, 11);
    // dirt path receding toward the horizon, trapezoid
    ctx.fillStyle = "#5a4a34";
    ctx.beginPath();
    ctx.moveTo(w / 2 - 14, h * 0.42);
    ctx.lineTo(w / 2 + 14, h * 0.42);
    ctx.lineTo(w * 0.82, h);
    ctx.lineTo(w * 0.18, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4a3c2a";
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, h * 0.5);
    ctx.lineTo(w / 2 + 6, h * 0.5);
    ctx.lineTo(w * 0.6, h * 0.8);
    ctx.lineTo(w * 0.42, h * 0.8);
    ctx.closePath();
    ctx.fill();
  });

  draw(scene, PovTex.BOOT, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x0a0a0c);
    // boot interior lining, rounded via a soft rect
    rect(ctx, w * 0.12, h * 0.1, w * 0.76, h * 0.85, 0x2a2822);
    speckle(ctx, w * 0.12, h * 0.1, w * 0.76, h * 0.85, 0x201e1a, 50, 19);
    // jerry can, left
    rect(ctx, w * 0.2, h * 0.55, 40, 46, 0x3a5a3a);
    rect(ctx, w * 0.2 + 14, h * 0.5, 12, 8, 0x2a4228);
    // rolled blanket, right
    ctx.fillStyle = "#6a5040";
    ctx.beginPath();
    ctx.ellipse(w * 0.78, h * 0.62, 34, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // the cricket bat, front and center — the whole point of this shot
    ctx.save();
    ctx.translate(w / 2, h * 0.68);
    ctx.rotate(-0.3);
    rect(ctx, -8, -70, 16, 60, 0xc9a565);
    rect(ctx, -8, -70, 16, 10, 0xd8b878);
    rect(ctx, -5, -10, 10, 26, 0x8a6a3f);
    ctx.restore();
    // a hand reaching in from the bottom edge toward the bat
    rect(ctx, w / 2 - 20, h - 40, 40, 40, 0xb98a63);
  });
}
