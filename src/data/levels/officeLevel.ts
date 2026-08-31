import { TileGrid } from "@/core/level/TileGrid";
import { TILE } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import { OfficeTex } from "@/gfx/office";
import { COWORKER_STAND_VARIANTS, COWORKER_SEAT_VARIANTS, type CoworkerVariant } from "@/gfx/coworkerFigure";
import type { PropSpec } from "@/data/levels/apartmentLevel";

export const LEVEL_WIDTH = 40;
export const LEVEL_HEIGHT = 54;

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export interface CoworkerSpec {
  id: string;
  x: number;
  y: number;
  tex: CoworkerVariant;
  flip?: boolean;
  seated?: boolean;
  /** undefined = purely decorative crowd/desk figure, no prompt/dialogue. */
  interactable?: { prompt: string; range: number };
}

export interface OfficeLevel {
  width: number;
  height: number;
  tiles: number[][];
  props: PropSpec[];
  coworkers: CoworkerSpec[];
  playerStart: { x: number; y: number };
  tvWorldPos: { x: number; y: number };
  /** Distance from tvWorldPos, in px, inside which the broadcast auto-fires. */
  tvTriggerRadius: number;
  /** Danny's own desk — target for the post-broadcast "find your desk" arrow. */
  playerDeskWorldPos: { x: number; y: number };
}

/** Small seeded RNG so "random" jitter/scatter is stable across reloads instead of reshuffling every playthrough. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

type PodOccupant =
  | { kind: "named"; id: string; label: string }
  | { kind: "extra" }
  | { kind: "empty" }
  | { kind: "player_desk" };

const POD_HALF_W = 15;
const POD_HALF_H = 13;

/**
 * Four desks in a pinwheel around a shared center — partitions meet in the
 * middle (like a real 4-up cubicle cluster), each desk opening outward into
 * its own corner. One drawn cubicle texture, mirrored per slot, so "sitting
 * in different directions" doesn't need four different pieces of art.
 */
const POD_SLOTS = [
  { dx: -POD_HALF_W, dy: -POD_HALF_H, flipX: true, flipY: true, faceDx: -1, faceDy: -1 },
  { dx: POD_HALF_W, dy: -POD_HALF_H, flipX: false, flipY: true, faceDx: 1, faceDy: -1 },
  { dx: -POD_HALF_W, dy: POD_HALF_H, flipX: true, flipY: false, faceDx: -1, faceDy: 1 },
  { dx: POD_HALF_W, dy: POD_HALF_H, flipX: false, flipY: false, faceDx: 1, faceDy: 1 },
] as const;

interface PodDecor {
  filing?: "e" | "w" | "n" | "s";
  coat?: "e" | "w" | "n" | "s";
  bin?: "e" | "w" | "n" | "s";
  rug?: boolean;
}

const SIDE_OFFSET: Record<"e" | "w" | "n" | "s", [number, number]> = {
  e: [POD_HALF_W + 18, 0],
  w: [-POD_HALF_W - 18, 0],
  n: [0, -POD_HALF_H - 12],
  s: [0, POD_HALF_H + 12],
};

function placeDeskPod(
  props: PropSpec[],
  coworkers: CoworkerSpec[],
  podId: string,
  cx: number,
  cy: number,
  occupants: [PodOccupant, PodOccupant, PodOccupant, PodOccupant],
  variantCursor: { i: number },
  decor: PodDecor,
  onPlayerDesk?: (pos: { x: number; y: number }) => void,
): void {
  if (decor.rug) {
    props.push({
      id: `${podId}_rug`,
      tex: PropTex.RUG,
      x: cx,
      y: cy,
      floorDecal: true,
      tint: 0x33465e,
    });
  }

  POD_SLOTS.forEach((slot, i) => {
    const dx = cx + slot.dx;
    const dy = cy + slot.dy;
    const id = `${podId}_${i}`;
    props.push({ id, tex: OfficeTex.CUBICLE, x: dx, y: dy, solid: true, flipX: slot.flipX, flipY: slot.flipY });

    const occ = occupants[i];
    if (occ.kind === "player_desk") {
      onPlayerDesk?.({ x: dx, y: dy });
      return;
    }
    if (occ.kind === "empty") return;

    const figureX = dx + slot.faceDx * 7;
    const figureY = dy + slot.faceDy * 6;
    const variant = COWORKER_SEAT_VARIANTS[variantCursor.i % COWORKER_SEAT_VARIANTS.length];
    variantCursor.i++;

    if (occ.kind === "named") {
      coworkers.push({
        id: occ.id,
        x: figureX,
        y: figureY,
        tex: variant,
        seated: true,
        interactable: { prompt: occ.label, range: 28 },
      });
    } else {
      coworkers.push({ id: `${id}_extra`, x: figureX, y: figureY, tex: variant, seated: true });
    }
  });

  if (decor.filing) {
    const [ox, oy] = SIDE_OFFSET[decor.filing];
    props.push({ id: `${podId}_filing`, tex: OfficeTex.FILING_CABINET, x: cx + ox, y: cy + oy, solid: true });
  }
  if (decor.coat) {
    const [ox, oy] = SIDE_OFFSET[decor.coat];
    props.push({ id: `${podId}_coat`, tex: OfficeTex.COAT_RACK, x: cx + ox, y: cy + oy, solid: true });
  }
  if (decor.bin) {
    const [ox, oy] = SIDE_OFFSET[decor.bin];
    props.push({ id: `${podId}_bin`, tex: OfficeTex.BIN, x: cx + ox, y: cy + oy });
  }
}

/** A small enclosed side room off the open floor, doorway facing east into it. */
function carveMeetingRoom(
  grid: TileGrid,
  props: PropSpec[],
  x: number,
  y: number,
  w: number,
  h: number,
  roomId: string,
  size: "large" | "small",
): void {
  grid.room(x, y, w, h, TILE.OFFICE_WALL, TILE.FLOOR_CARPET_OFFICE_MEETING);
  grid.doorwayV(x + w - 1, y + Math.floor(h / 2) - 1, y + Math.floor(h / 2), TILE.FLOOR_CARPET_OFFICE_MEETING);

  const table = tileCenter(x + w / 2, y + h / 2);

  if (size === "large") {
    props.push({ id: `${roomId}_table`, tex: OfficeTex.MEETING_TABLE, x: table.x, y: table.y, solid: true });
    for (const [ox, oy] of [
      [-14, -17],
      [14, -17],
      [-14, 17],
      [14, 17],
      [0, -17],
      [0, 17],
    ] as const) {
      props.push({ id: `${roomId}_chair_${ox}_${oy}`, tex: PropTex.CHAIR, x: table.x + ox, y: table.y + oy });
    }
    const wb = tileCenter(x + w - 2, y + 1.3);
    props.push({ id: `${roomId}_whiteboard`, tex: OfficeTex.WHITEBOARD, x: wb.x, y: wb.y });
  } else {
    props.push({ id: `${roomId}_table`, tex: OfficeTex.MEETING_TABLE_SMALL, x: table.x, y: table.y, solid: true });
    for (const [ox, oy] of [
      [-15, 0],
      [15, 0],
      [0, 13],
    ] as const) {
      props.push({ id: `${roomId}_chair_${ox}_${oy}`, tex: PropTex.CHAIR, x: table.x + ox, y: table.y + oy });
    }
    const poster = tileCenter(x + 1.3, y + 1.3);
    props.push({ id: `${roomId}_poster`, tex: OfficeTex.POSTER_B, x: poster.x, y: poster.y });
  }

  const plant = tileCenter(x + w - 1.5, y + h - 1.5);
  props.push({ id: `${roomId}_plant`, tex: OfficeTex.PLANT, x: plant.x, y: plant.y });

  // the far corner from the doorway (opposite the table cluster) is left
  // empty by the furniture above in the larger room — a bin closes it out
  if (size === "large") {
    const bin = tileCenter(x + 1.5, y + h - 1.5);
    props.push({ id: `${roomId}_bin`, tex: OfficeTex.BIN, x: bin.x, y: bin.y });
  }
}

export function buildOfficeLevel(): OfficeLevel {
  const grid = new TileGrid(LEVEL_WIDTH, LEVEL_HEIGHT, -1);
  grid.room(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT, TILE.OFFICE_WALL, TILE.FLOOR_CARPET_OFFICE);

  // vary the carpet tile-by-tile so a big open floor doesn't read as one
  // flat repeated slab — mostly the base tile with the other two variants
  // scattered in at low density
  const carpetRng = makeRng(4471);
  for (let y = 1; y < LEVEL_HEIGHT - 1; y++) {
    for (let x = 1; x < LEVEL_WIDTH - 1; x++) {
      const r = carpetRng();
      const tile = r < 0.72 ? TILE.FLOOR_CARPET_OFFICE : r < 0.88 ? TILE.FLOOR_CARPET_OFFICE_B : TILE.FLOOR_CARPET_OFFICE_C;
      grid.set(x, y, tile);
    }
  }

  for (const wy of [10, 24, 38, 48]) {
    grid.set(0, wy, TILE.WINDOW_DAY);
    grid.set(LEVEL_WIDTH - 1, wy, TILE.WINDOW_DAY);
  }

  const props: PropSpec[] = [];
  const coworkers: CoworkerSpec[] = [];
  const variantCursor = { i: 0 };

  // ---- lobby (rows 1-6): where the player steps out after the elevator ----
  const reception = tileCenter(20, 3);
  props.push({ id: "reception_desk", tex: OfficeTex.RECEPTION_DESK, x: reception.x, y: reception.y, solid: true });
  const receptionRug = tileCenter(20, 3);
  props.push({ id: "reception_rug", tex: PropTex.RUG, x: receptionRug.x, y: receptionRug.y, floorDecal: true, tint: 0x4a3020 });
  for (const px of [12, 28]) {
    const p = tileCenter(px, 2.5);
    props.push({ id: `lobby_plant_${px}`, tex: OfficeTex.PLANT, x: p.x, y: p.y });
  }
  const noticeBoard = tileCenter(LEVEL_WIDTH - 1.6, 3);
  props.push({ id: "notice_board", tex: OfficeTex.NOTICE_BOARD, x: noticeBoard.x, y: noticeBoard.y });
  const lobbyPoster = tileCenter(1.6, 3);
  props.push({ id: "lobby_poster", tex: OfficeTex.POSTER_A, x: lobbyPoster.x, y: lobbyPoster.y });
  const lobbyCalendar = tileCenter(1.6, 5);
  props.push({ id: "lobby_calendar", tex: OfficeTex.CALENDAR, x: lobbyCalendar.x, y: lobbyCalendar.y });
  // small waiting nook beside reception
  const waitTable = tileCenter(26, 4.5);
  props.push({ id: "wait_table", tex: OfficeTex.MEETING_TABLE_SMALL, x: waitTable.x, y: waitTable.y, solid: true });
  props.push({ id: "wait_chair_1", tex: PropTex.CHAIR, x: waitTable.x - 15, y: waitTable.y, flipX: true });
  props.push({ id: "wait_chair_2", tex: PropTex.CHAIR, x: waitTable.x + 15, y: waitTable.y });
  // the stretch between the entrance corner and reception, and between
  // reception and the notice board, read thin — a coat rack for visitors
  // and a side cabinet close those gaps out
  const lobbyCoatRack = tileCenter(9, 5);
  props.push({ id: "lobby_coat_rack", tex: OfficeTex.COAT_RACK, x: lobbyCoatRack.x, y: lobbyCoatRack.y });
  const lobbySideCabinet = tileCenter(33, 5);
  props.push({ id: "lobby_side_cabinet", tex: OfficeTex.FILING_CABINET, x: lobbySideCabinet.x, y: lobbySideCabinet.y, solid: true });
  const lobbyBin = tileCenter(11, 6.5);
  props.push({ id: "lobby_bin", tex: OfficeTex.BIN, x: lobbyBin.x, y: lobbyBin.y });
  const lobbyCornerPlant = tileCenter(4, 7);
  props.push({ id: "lobby_corner_plant", tex: OfficeTex.PLANT, x: lobbyCornerPlant.x, y: lobbyCornerPlant.y });

  // ---- two meeting rooms along the west wall — deliberately different
  // sizes/furniture so they don't read as copies of each other ----
  carveMeetingRoom(grid, props, 2, 8, 11, 10, "meeting_a", "large");
  carveMeetingRoom(grid, props, 2, 21, 8, 7, "meeting_b", "small");

  // ---- open-plan floor: desk pods scattered with generous walking room
  // around and between them, not packed into forced corridors ----
  const pods: Array<{ id: string; cx: number; cy: number; occ: [PodOccupant, PodOccupant, PodOccupant, PodOccupant]; decor: PodDecor }> = [
    {
      id: "pod1",
      cx: 20,
      cy: 12,
      occ: [{ kind: "extra" }, { kind: "extra" }, { kind: "named", id: "dana", label: "Talk to Dana" }, { kind: "named", id: "priya", label: "Talk to Priya" }],
      decor: { rug: true, filing: "e", bin: "w" },
    },
    {
      id: "pod2",
      cx: 33,
      cy: 11,
      occ: [{ kind: "named", id: "mark", label: "Talk to Mark" }, { kind: "empty" }, { kind: "extra" }, { kind: "named", id: "owen", label: "Talk to Owen" }],
      decor: { rug: true, filing: "e", coat: "n" },
    },
    {
      id: "pod3",
      cx: 19,
      cy: 25,
      occ: [{ kind: "extra" }, { kind: "named", id: "fatima", label: "Talk to Fatima" }, { kind: "named", id: "ben", label: "Talk to Ben" }, { kind: "extra" }],
      decor: { rug: true, bin: "e" },
    },
    {
      id: "pod4",
      cx: 34,
      cy: 26,
      occ: [{ kind: "player_desk" }, { kind: "named", id: "sam", label: "Talk to Sam" }, { kind: "extra" }, { kind: "empty" }],
      decor: { rug: true, filing: "w", coat: "e" },
    },
    {
      id: "pod5",
      cx: 19,
      cy: 39,
      occ: [{ kind: "extra" }, { kind: "extra" }, { kind: "empty" }, { kind: "named", id: "elena", label: "Talk to Elena" }],
      decor: { rug: true, bin: "w" },
    },
    {
      id: "pod6",
      cx: 33,
      cy: 40,
      occ: [{ kind: "empty" }, { kind: "extra" }, { kind: "named", id: "chris", label: "Talk to Chris" }, { kind: "named", id: "greg", label: "Talk to Greg" }],
      decor: { rug: true, filing: "e" },
    },
  ];
  let playerDeskWorldPos = { x: 0, y: 0 };
  for (const pod of pods) {
    const c = tileCenter(pod.cx, pod.cy);
    placeDeskPod(props, coworkers, pod.id, c.x, c.y, pod.occ, variantCursor, pod.decor, (pos) => {
      playerDeskWorldPos = pos;
      // a photo on the desk — the one small personal touch that marks this
      // one out as Danny's own, not just another empty seat
      props.push({ id: "player_desk_photo", tex: PropTex.PICTURE_FRAME, x: pos.x - 6, y: pos.y + 6 });
    });
  }

  // printer station — printer, its own filing cabinet and a loose stack of
  // paper right beside it, between pods 1 and 2 (not floating in open floor)
  const printer = tileCenter(26.5, 10.5);
  props.push({ id: "printer", tex: OfficeTex.PRINTER, x: printer.x, y: printer.y, solid: true, interactable: { prompt: "Check printer", range: 22 } });
  props.push({ id: "printer_cabinet", tex: OfficeTex.FILING_CABINET, x: printer.x + 15, y: printer.y, solid: true });
  props.push({ id: "printer_papers", tex: OfficeTex.PAPER_STACK, x: printer.x - 12, y: printer.y + 6 });
  props.push({ id: "printer_bin", tex: OfficeTex.BIN, x: printer.x, y: printer.y + 14 });

  // coffee/water station between pods 3 and 4
  const cooler = tileCenter(26.5, 24.5);
  props.push({ id: "water_cooler", tex: OfficeTex.WATER_COOLER, x: cooler.x, y: cooler.y, solid: true, interactable: { prompt: "Get some water", range: 22 } });
  props.push({ id: "coffee_counter", tex: PropTex.COUNTER, x: cooler.x + 20, y: cooler.y, solid: true, tint: 0x8a8f94 });
  props.push({ id: "coffee_mug_stack", tex: OfficeTex.PAPER_STACK, x: cooler.x - 14, y: cooler.y + 8 });

  // whiteboards + posters/calendars scattered through the open floor,
  // placed against the nearest real wall rather than mid-carpet
  props.push({ id: "wb_east", tex: OfficeTex.WHITEBOARD, x: tileCenter(LEVEL_WIDTH - 1.6, 18).x, y: tileCenter(LEVEL_WIDTH - 1.6, 18).y });
  props.push({ id: "poster_east_1", tex: OfficeTex.POSTER_A, x: tileCenter(LEVEL_WIDTH - 1.6, 32).x, y: tileCenter(LEVEL_WIDTH - 1.6, 32).y });
  props.push({ id: "calendar_east", tex: OfficeTex.CALENDAR, x: tileCenter(LEVEL_WIDTH - 1.6, 40).x, y: tileCenter(LEVEL_WIDTH - 1.6, 40).y });
  props.push({ id: "poster_meeting_a", tex: OfficeTex.POSTER_B, x: tileCenter(9.4, 32).x, y: tileCenter(9.4, 32).y });

  // Filler clutter across the open floor on a loosely-jittered grid — the
  // pods and named stations read fine up close, but at this zoom the camera
  // shows enough world space that the aisles *between* them were reading as
  // bare carpet. This guarantees baseline coverage everywhere without it
  // reading as a random scatter (still grid-anchored, just jittered).
  // Tighter than a first pass: 5-tile pitch instead of 6, and the west
  // walkway (x<13, kept clear up top for the meeting rooms) gets its own
  // fill once those rooms are behind it (y>=29). Bound extended south of
  // 43 so the approach to the break room (y~44-48, before its own vending
  // machines/rug take over) isn't a dead gap.
  const fillerRng = makeRng(552013);
  const fillerTex = [OfficeTex.PLANT, OfficeTex.BIN, OfficeTex.PAPER_STACK, OfficeTex.FILING_CABINET];
  let fillerN = 0;
  for (let gy = 14; gy < LEVEL_HEIGHT - 6; gy += 5) {
    const startX = gy >= 29 ? 4 : 13;
    for (let gx = startX; gx < LEVEL_WIDTH - 2; gx += 5) {
      const jx = gx + (fillerRng() - 0.5) * 2.5;
      const jy = gy + (fillerRng() - 0.5) * 2.5;
      const p = tileCenter(jx, jy);
      const tooClose = props.some((existing) => Math.hypot(existing.x - p.x, existing.y - p.y) < 22);
      if (tooClose) continue;
      const tex = fillerTex[fillerN % fillerTex.length];
      props.push({ id: `filler_${fillerN}`, tex, x: p.x, y: p.y, solid: tex === OfficeTex.FILING_CABINET });
      fillerN++;
    }
  }

  // The far-west corridor (past pods 3/5, x<11) kept testing right at the
  // bare-minimum visible-object count even with the pass above — a second,
  // tighter strip just for that walkway so it never reads as empty carpet.
  const westRng = makeRng(661029);
  const westTex = [OfficeTex.PLANT, OfficeTex.PAPER_STACK, OfficeTex.BIN];
  let westN = 0;
  for (let gy = 29; gy < LEVEL_HEIGHT - 6; gy += 4) {
    const jx = 4 + (westRng() - 0.5) * 3;
    const jy = gy + (westRng() - 0.5) * 2.5;
    const p = tileCenter(jx, jy);
    const tooClose = props.some((existing) => Math.hypot(existing.x - p.x, existing.y - p.y) < 18);
    if (tooClose) continue;
    const tex = westTex[westN % westTex.length];
    props.push({ id: `west_filler_${westN}`, tex, x: p.x, y: p.y });
    westN++;
  }

  // ---- break room (south end): TV flush against the south wall, a loose
  // crowd of coworkers gathered facing it, plus its own dressing ----
  const tv = tileCenter(LEVEL_WIDTH / 2, LEVEL_HEIGHT - 1.6);
  props.push({ id: "tv", tex: OfficeTex.WALL_TV, x: tv.x, y: tv.y, interactable: { prompt: "Watch the news", range: 30 } });

  const vending1 = tileCenter(3, LEVEL_HEIGHT - 4);
  props.push({ id: "vending_1", tex: OfficeTex.VENDING_MACHINE, x: vending1.x, y: vending1.y, solid: true });
  const vending2 = tileCenter(5.2, LEVEL_HEIGHT - 4);
  props.push({ id: "vending_2", tex: OfficeTex.VENDING_MACHINE, x: vending2.x, y: vending2.y, solid: true });
  const breakBin = tileCenter(7.5, LEVEL_HEIGHT - 3);
  props.push({ id: "break_bin", tex: OfficeTex.BIN, x: breakBin.x, y: breakBin.y });
  const breakApproachPlant = tileCenter(4, LEVEL_HEIGHT - 9);
  props.push({ id: "break_approach_plant", tex: OfficeTex.PLANT, x: breakApproachPlant.x, y: breakApproachPlant.y });

  for (const px of [10, LEVEL_WIDTH - 11]) {
    const p = tileCenter(px, LEVEL_HEIGHT - 3);
    props.push({ id: `break_plant_${px}`, tex: OfficeTex.PLANT, x: p.x, y: p.y });
  }
  const breakRug = tileCenter(LEVEL_WIDTH / 2, LEVEL_HEIGHT - 6);
  props.push({ id: "break_rug", tex: PropTex.RUG, x: breakRug.x, y: breakRug.y, floorDecal: true, tint: 0x2c3a4d });

  // organic crowd cluster via rejection sampling inside an ellipse, not
  // rows — genuinely irregular spacing so it reads as people gathered, not
  // a queue
  const rand = makeRng(918273);
  const clusterCx = tv.x;
  const clusterCy = tv.y - 44;
  const ellipseRx = 92;
  const ellipseRy = 42;
  const minDist = 13;
  const points: Array<{ x: number; y: number }> = [];
  let attempts = 0;
  while (points.length < 21 && attempts < 3000) {
    attempts++;
    const ang = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand());
    const px = clusterCx + Math.cos(ang) * ellipseRx * rad;
    const py = clusterCy + Math.sin(ang) * ellipseRy * rad;
    if (points.some((p) => Phaser_distance(p.x, p.y, px, py) < minDist)) continue;
    points.push({ x: px, y: py });
  }
  points
    .sort((a, b) => a.y - b.y)
    .forEach((p, i) => {
      coworkers.push({
        id: `crowd_${i}`,
        x: p.x,
        y: p.y,
        tex: COWORKER_STAND_VARIANTS[i % COWORKER_STAND_VARIANTS.length],
        flip: i % 2 === 0,
      });
    });

  return {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    tiles: grid.toArray(),
    props,
    coworkers,
    playerStart: tileCenter(20, 4.5),
    tvWorldPos: tv,
    tvTriggerRadius: 95,
    playerDeskWorldPos,
  };
}

function Phaser_distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
