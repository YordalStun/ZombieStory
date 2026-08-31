import { clear, outline, rect, speckle, ensureCanvas } from "@/gfx/canvasUtils";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";

export const OfficeTex = {
  CUBICLE: "office_cubicle",
  WATER_COOLER: "office_water_cooler",
  PLANT: "office_plant",
  RECEPTION_DESK: "office_reception_desk",
  FILING_CABINET: "office_filing_cabinet",
  PRINTER: "office_printer",
  NOTICE_BOARD: "office_notice_board",
  MEETING_TABLE: "office_meeting_table",
  ELEVATOR_WALL: "office_elevator_wall",
  ELEVATOR_DOOR: "office_elevator_door",
} as const;

export const OfficeTexSize: Record<string, { w: number; h: number }> = {
  [OfficeTex.CUBICLE]: { w: 28, h: 24 },
  [OfficeTex.WATER_COOLER]: { w: 12, h: 22 },
  [OfficeTex.PLANT]: { w: 14, h: 20 },
  [OfficeTex.RECEPTION_DESK]: { w: 48, h: 20 },
  [OfficeTex.FILING_CABINET]: { w: 14, h: 16 },
  [OfficeTex.PRINTER]: { w: 16, h: 12 },
  [OfficeTex.NOTICE_BOARD]: { w: 20, h: 4 },
  [OfficeTex.MEETING_TABLE]: { w: 46, h: 24 },
};

function draw(
  scene: Phaser.Scene,
  key: string,
  fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const { w, h } = OfficeTexSize[key];
  const tex = ensureCanvas(scene, key, w, h);
  const ctx = tex.getContext();
  clear(ctx, w, h);
  fn(ctx, w, h);
  tex.refresh();
}

/** Full-screen-sized textures for the elevator intro beat — sized explicitly rather than looked up, same convention as gfx/motorway.ts's cabin art. */
function drawFull(
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

export function generateOfficeTextures(scene: Phaser.Scene): void {
  const partition = 0x8a92a6;
  const partitionShadow = 0x6f7788;
  const partitionFabric = 0x7a8296;
  const deskTop = 0xb5a888;
  const deskTopDark = 0x9d9074;

  // an open-plan cubicle corner: fabric partition walls on the back + one
  // side, desk surface filling the enclosed corner — reads as a "cubicle"
  // from directly above without needing a full 3D booth. Deliberately drawn
  // with the partition on the top+left so callers can flipX/flipY it to get
  // all four corner orientations out of one texture, for pods where desks
  // face different directions around a shared divider.
  draw(scene, OfficeTex.CUBICLE, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, deskTop);
    rect(ctx, 0, h - 3, w, 3, deskTopDark);
    rect(ctx, 0, 0, w, 6, partition);
    rect(ctx, 0, 0, w, 2, partitionFabric);
    rect(ctx, 0, 0, 6, h, partition);
    rect(ctx, 0, 0, 2, h, partitionFabric);
    outline(ctx, 0, 6, 6, h - 6, partitionShadow);
    // monitor + keyboard, tucked in the corner the partitions form
    rect(ctx, w - 13, 8, 10, 8, 0x1c1c1e);
    rect(ctx, w - 12, 9, 8, 6, 0x2a4a5a);
    rect(ctx, w - 12, h - 9, 9, 4, 0x2a2a2e);
    // a little clutter so every desk doesn't read identical — papers, a mug
    rect(ctx, 9, h - 9, 6, 4, 0xd8d0b8);
    rect(ctx, 9, h - 11, 3, 3, 0xc94a3a);
  });

  draw(scene, OfficeTex.WATER_COOLER, (ctx, w, h) => {
    rect(ctx, 1, h - 8, w - 2, 8, 0xe8e8e4);
    rect(ctx, 1, h - 8, w - 2, 2, 0xcfcfc8);
    rect(ctx, w / 2 - 2, h - 6, 4, 3, 0x2a3a44);
    rect(ctx, 2, h - 15, w - 4, 8, 0x3a4a52);
    ctx.fillStyle = "#bfe0ea";
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 16, w / 2 - 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8f6fa";
    ctx.beginPath();
    ctx.ellipse(w / 2 - 1, h - 18, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, w / 2 - 2, 1, 4, 4, 0x2a3a44);
  });

  draw(scene, OfficeTex.PLANT, (ctx, w, h) => {
    rect(ctx, w / 2 - 4, h - 8, 8, 8, 0x8a5a3f);
    rect(ctx, w / 2 - 4, h - 8, 8, 2, 0x9d6a4a);
    ctx.fillStyle = "#3f6b38";
    for (const [dx, dy, r] of [
      [0, -6, 6],
      [-4, -3, 5],
      [4, -3, 5],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(w / 2 + dx, h - 10 + dy, r, r * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  draw(scene, OfficeTex.RECEPTION_DESK, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x3a4048);
    rect(ctx, 0, 0, w, 4, 0x4a525c);
    rect(ctx, 4, h - 5, w - 8, 3, 0x2c3138);
    outline(ctx, 0, 0, w, h, 0x24282e);
  });

  draw(scene, OfficeTex.FILING_CABINET, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x53586a);
    rect(ctx, 1, 1, w - 2, 6, 0x666c82);
    rect(ctx, 1, 9, w - 2, 6, 0x666c82);
    rect(ctx, w / 2 - 2, 3, 4, 1, 0x2a2c36);
    rect(ctx, w / 2 - 2, 11, 4, 1, 0x2a2c36);
    outline(ctx, 0, 0, w, h, 0x3a3e4c);
  });

  draw(scene, OfficeTex.PRINTER, (ctx, w, h) => {
    rect(ctx, 0, 2, w, h - 2, 0xd4d0c6);
    rect(ctx, 0, 2, w, 3, 0xb8b4a8);
    rect(ctx, 2, h - 6, w - 4, 4, 0x2a2a2e);
    rect(ctx, w / 2 - 4, 0, 8, 3, 0xf0eee6);
    rect(ctx, 3, 6, 5, 4, 0x3a6ea0);
  });

  draw(scene, OfficeTex.NOTICE_BOARD, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x8a6a4a);
    rect(ctx, 1, 1, w - 2, h - 2, 0xcfc3a0);
    rect(ctx, 2, 1, 3, 2, 0xd8483a);
    rect(ctx, 9, 1, 3, 2, 0xe0a83a);
    rect(ctx, 15, 1, 3, 2, 0x4a7ab5);
  });

  // side-room table for the two meeting rooms — a big communal surface,
  // distinct from the individual cubicle desks
  draw(scene, OfficeTex.MEETING_TABLE, (ctx, w, h) => {
    rect(ctx, 2, 2, w - 4, h - 4, 0x6b5033);
    rect(ctx, 3, 3, w - 6, h - 6, 0x7a5d3d);
    rect(ctx, 3, 3, w - 6, 3, 0x8a6a48);
    outline(ctx, 2, 2, w - 4, h - 4, 0x4a3826);
  });

  // --- elevator intro (opening beat only, not part of the walkable level) ---

  drawFull(scene, OfficeTex.ELEVATOR_WALL, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x6a6e76);
    for (let x = 0; x < w; x += 24) rect(ctx, x, 0, 1, h, 0x5a5e66);
    rect(ctx, 0, h - 46, w, 46, 0x53565e);
    rect(ctx, 0, h - 46, w, 2, 0x3f4248);
    speckle(ctx, 0, 0, w, h, 0x76797f, 220, 17);
    // floor-number display, top center
    rect(ctx, w / 2 - 22, 14, 44, 20, 0x1a1c1e);
    rect(ctx, w / 2 - 19, 17, 38, 14, 0x0c0d0e);
    rect(ctx, w / 2 - 5, 20, 10, 8, 0x4ade80);
    // handrail
    rect(ctx, 30, h - 70, w - 60, 5, 0x3f4248);
    rect(ctx, 30, h - 70, w - 60, 1, 0x767a80);
    // control panel, right side
    rect(ctx, w - 60, h - 150, 30, 90, 0x4a4e56);
    for (let i = 0; i < 5; i++) {
      rect(ctx, w - 52, h - 140 + i * 16, 14, 10, i === 3 ? 0xffd15c : 0x2a2c30);
    }
  });

  // exactly half the screen wide, so a closed pair (the second flipped) meets
  // seamlessly at center with no gap
  drawFull(scene, OfficeTex.ELEVATOR_DOOR, GAME_WIDTH / 2, GAME_HEIGHT, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x7c8088);
    for (let x = 6; x < w; x += 20) rect(ctx, x, 0, 1, h, 0x6a6e76);
    rect(ctx, w - 10, 0, 10, h, 0x686c74);
    rect(ctx, w - 4, h / 2 - 16, 3, 32, 0x2a2c30); // door handle, on the inner (seam) edge
    speckle(ctx, 0, 0, w, h, 0x888c92, 140, 31);
    outline(ctx, 0, 0, w, h, 0x50535a);
  });
}
