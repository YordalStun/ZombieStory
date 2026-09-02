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
  MEETING_TABLE_SMALL: "office_meeting_table_small",
  WHITEBOARD: "office_whiteboard",
  BIN: "office_bin",
  COAT_RACK: "office_coat_rack",
  VENDING_MACHINE: "office_vending_machine",
  WALL_TV: "office_wall_tv",
  MONITOR_GLOW: "office_monitor_glow",
  POSTER_A: "office_poster_a",
  POSTER_B: "office_poster_b",
  CALENDAR: "office_calendar",
  PAPER_STACK: "office_paper_stack",
  TV_BROADCAST_SCREEN: "office_tv_broadcast_screen",
  DESK_ARROW: "office_desk_arrow",
  ELEVATOR_WALL: "office_elevator_wall",
  ELEVATOR_DOOR: "office_elevator_door",
  EXIT_DOORS: "office_exit_doors",
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
  [OfficeTex.MEETING_TABLE_SMALL]: { w: 24, h: 20 },
  [OfficeTex.WHITEBOARD]: { w: 26, h: 4 },
  [OfficeTex.BIN]: { w: 8, h: 10 },
  [OfficeTex.COAT_RACK]: { w: 10, h: 20 },
  [OfficeTex.VENDING_MACHINE]: { w: 18, h: 28 },
  [OfficeTex.WALL_TV]: { w: 30, h: 6 },
  [OfficeTex.MONITOR_GLOW]: { w: 8, h: 6 },
  [OfficeTex.POSTER_A]: { w: 12, h: 4 },
  [OfficeTex.POSTER_B]: { w: 12, h: 4 },
  [OfficeTex.CALENDAR]: { w: 10, h: 4 },
  [OfficeTex.PAPER_STACK]: { w: 10, h: 8 },
  [OfficeTex.DESK_ARROW]: { w: 14, h: 14 },
  [OfficeTex.EXIT_DOORS]: { w: 20, h: 18 },
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

  // big conference-room table
  draw(scene, OfficeTex.MEETING_TABLE, (ctx, w, h) => {
    rect(ctx, 2, 2, w - 4, h - 4, 0x6b5033);
    rect(ctx, 3, 3, w - 6, h - 6, 0x7a5d3d);
    rect(ctx, 3, 3, w - 6, 3, 0x8a6a48);
    outline(ctx, 2, 2, w - 4, h - 4, 0x4a3826);
  });

  // smaller round-ish huddle-room table — same wood tones, distinct shape
  // and size so the two meeting rooms don't read as copies of each other
  draw(scene, OfficeTex.MEETING_TABLE_SMALL, (ctx, w, h) => {
    ctx.fillStyle = "#6b5033";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a5d3d";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a3826";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  draw(scene, OfficeTex.WHITEBOARD, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0xd8d8d0);
    rect(ctx, 2, 1, 6, 1, 0x3a6ea0);
    rect(ctx, 10, 1, 4, 1, 0xc94a3a);
    rect(ctx, 16, 1, 8, 1, 0x2a2a2e);
  });

  draw(scene, OfficeTex.BIN, (ctx, w, h) => {
    rect(ctx, 1, 2, w - 2, h - 2, 0x4a5058);
    rect(ctx, 0, 0, w, 2, 0x5c626c);
    rect(ctx, 1, h - 2, w - 2, 2, 0x3a3f46);
  });

  draw(scene, OfficeTex.COAT_RACK, (ctx, w, h) => {
    rect(ctx, w / 2 - 1, 2, 2, h - 4, 0x4a3826);
    rect(ctx, 1, h - 4, w - 2, 3, 0x3a2c1c);
    rect(ctx, w / 2 - 4, 1, 8, 2, 0x3a2c1c);
    // a coat and a bag hung on the hooks — implies recent use, not empty furniture
    rect(ctx, w / 2 - 5, 3, 5, 9, 0x556b8a);
    rect(ctx, w / 2 + 2, 4, 4, 6, 0x8a4a3a);
  });

  draw(scene, OfficeTex.VENDING_MACHINE, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x2a3038);
    rect(ctx, 2, 2, w - 4, h - 10, 0x1a2530);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        rect(ctx, 4 + c * 7, 4 + r * 7, 5, 5, [0xc94a3a, 0xe0a83a, 0x4a7ab5, 0x5a9a5a, 0xb54a9a, 0xd8d0b8][(r * 2 + c) % 6]);
      }
    }
    rect(ctx, 2, h - 7, w - 4, 5, 0x3a424c);
    rect(ctx, w - 6, h - 6, 3, 3, 0xffd15c);
  });

  // flat wall-mounted screen — thin (shallow depth), meant to sit flush
  // against a wall tile rather than free-standing like the apartment's CRT
  draw(scene, OfficeTex.WALL_TV, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x14161a);
    rect(ctx, 1, 1, w - 2, h - 3, 0x9adfff);
    rect(ctx, 1, 1, w - 2, 1, 0xd8f6ff);
  });

  // small standalone glow, layered over an occupied desk's monitor and
  // tween-pulsed in OfficeScene so screens read as genuinely on/active
  draw(scene, OfficeTex.MONITOR_GLOW, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x8fe0ff);
    rect(ctx, 1, 1, w - 3, 1, 0xffffff);
    rect(ctx, 1, 3, w - 4, 1, 0x5ab0d8);
  });

  // wall-decor variety — motivational/generic posters, a wall calendar —
  // cheap, small, and scattered around means the walls stop reading blank
  draw(scene, OfficeTex.POSTER_A, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0x2c5a8a);
    rect(ctx, 1, 1, w - 2, 1, 0xdfeef2);
    rect(ctx, 1, h - 1, w - 2, 1, 0xdfeef2);
  });

  draw(scene, OfficeTex.POSTER_B, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0xd8d8d0);
    rect(ctx, 2, 1, w - 4, 1, 0x2a2a2e);
    rect(ctx, 2, h - 2, w - 6, 1, 0x8a3a3a);
  });

  draw(scene, OfficeTex.CALENDAR, (ctx, w, h) => {
    rect(ctx, 0, 0, w, h, 0xefece2);
    rect(ctx, 0, 0, w, 1, 0xc94a3a);
    for (let x = 1; x < w - 1; x += 2) rect(ctx, x, 2, 1, h - 3, 0xb8b0a0);
  });

  // loose paper clutter — for the printer nook and anywhere that needs to
  // feel used rather than staged
  draw(scene, OfficeTex.PAPER_STACK, (ctx, w, h) => {
    rect(ctx, 0, 2, w - 2, h - 2, 0xcfc8b0);
    rect(ctx, 1, 0, w - 2, h - 2, 0xe0dac6);
    rect(ctx, 2, 1, w - 5, h - 5, 0xd8d0b8);
  });

  // points right by default (0deg) — OfficeScene rotates it per-frame toward
  // the target with setRotation(), so the base art just needs a clean,
  // legible triangle
  // small world-scale doors (unlike ELEVATOR_WALL/DOOR below, which are
  // full-screen and only ever used pinned to the camera for the arrival
  // cutscene) — this is the real, walkable, re-interactable way out.
  draw(scene, OfficeTex.EXIT_DOORS, (ctx, w, h) => {
    rect(ctx, 3, 0, w - 6, 3, 0x1a3a22);
    rect(ctx, 5, 1, w - 10, 1, 0x5fe07a);
    rect(ctx, 1, 4, w - 2, h - 4, 0x9aa2b6);
    rect(ctx, 1, 4, (w - 2) / 2 - 1, h - 4, 0x8a92a6);
    rect(ctx, w / 2 + 1, 4, (w - 2) / 2 - 1, h - 4, 0x8a92a6);
    rect(ctx, w / 2 - 1, 4, 2, h - 4, 0x5a6272);
    outline(ctx, 1, 4, w - 2, h - 4, 0x5a6272);
  });

  draw(scene, OfficeTex.DESK_ARROW, (ctx, w, h) => {
    ctx.fillStyle = "#ffd15c";
    ctx.beginPath();
    ctx.moveTo(w - 1, h / 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(2, h - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8a6a1e";
    ctx.lineWidth = 1;
    ctx.stroke();
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

  // TV-broadcast cutaway — a "mid shot" of the newsroom, held behind the
  // dialogue box for the length of the office TV broadcast. Studio
  // backdrop, an anchor bust at a desk, a breaking-news banner, faint
  // scanlines for a broadcast (not in-person) feel.
  drawFull(scene, OfficeTex.TV_BROADCAST_SCREEN, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
    // studio backdrop
    rect(ctx, 0, 0, w, h, 0x141b28);
    rect(ctx, 0, 0, w, h * 0.55, 0x1c2740);
    for (let x = 0; x < w; x += 34) rect(ctx, x, 0, 1, h * 0.55, 0x24304f);
    rect(ctx, 0, h * 0.42, w, 3, 0x2e3d5e);

    // breaking-news banner
    const bannerY = h * 0.46;
    rect(ctx, 0, bannerY, w, 20, 0xa01e1e);
    rect(ctx, 0, bannerY, w, 3, 0xd83a3a);
    rect(ctx, 16, bannerY + 6, 90, 8, 0xf0e8e0);
    rect(ctx, w - 70, bannerY + 6, 54, 8, 0xf0e8e0);

    // live dot, top-right
    ctx.fillStyle = "#e03a3a";
    ctx.beginPath();
    ctx.ellipse(w - 56, 18, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, w - 46, 14, 30, 8, 0xf0e8e0);

    // anchor desk + bust, bottom half
    const deskY = h * 0.66;
    rect(ctx, 0, deskY, w, h - deskY, 0x1a2030);
    rect(ctx, w * 0.5 - 90, deskY - 4, 180, 8, 0x2c3450);
    // shoulders/suit
    rect(ctx, w / 2 - 46, deskY - 60, 92, 60, 0x2a3346);
    rect(ctx, w / 2 - 46, deskY - 60, 92, 10, 0x33405a);
    // shirt/tie hint
    rect(ctx, w / 2 - 10, deskY - 60, 20, 40, 0xe8e4da);
    rect(ctx, w / 2 - 4, deskY - 60, 8, 40, 0xa01e1e);
    // head
    rect(ctx, w / 2 - 16, deskY - 92, 32, 34, 0xd8a878);
    rect(ctx, w / 2 - 16, deskY - 92, 32, 10, 0x2a2018);
    rect(ctx, w / 2 - 8, deskY - 76, 3, 3, 0x1a1a1a);
    rect(ctx, w / 2 + 5, deskY - 76, 3, 3, 0x1a1a1a);
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
