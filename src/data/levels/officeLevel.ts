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

// Margins here need to clear the *cubicle's own* solid footprint, which is
// its full 28x24 sprite (Arcade's StaticBody.updateFromGameObject() re-syncs
// the body to the full display size after any custom setSize/setOffset —
// the "walk over the top, blocked by the base" reduced footprint used
// elsewhere never actually applies to solid props), not a shrunk hitbox —
// 18/12 measured a few px short of that in testing, clipping into the
// nearest cubicle corner.
const SIDE_OFFSET: Record<"e" | "w" | "n" | "s", [number, number]> = {
  e: [POD_HALF_W + 25, 0],
  w: [-POD_HALF_W - 25, 0],
  n: [0, -POD_HALF_H - 25],
  s: [0, POD_HALF_H + 25],
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

    const figureX = dx + slot.faceDx * 7;
    const figureY = dy + slot.faceDy * 6;

    const occ = occupants[i];
    if (occ.kind === "player_desk") {
      onPlayerDesk?.({ x: dx, y: dy });
      // the player's own monitor — every other occupied desk gets a glow
      // overlay added over its seated figure in OfficeScene, but there's no
      // figure here to hang it off, so it's placed explicitly at the same
      // relative offset, and doubles as the "use computer" interact point
      props.push({
        id: "player_computer",
        tex: OfficeTex.MONITOR_GLOW,
        x: figureX - 3,
        y: figureY - 8,
        interactable: { prompt: "Use computer", range: 18 },
      });
      return;
    }
    if (occ.kind === "empty") {
      // an empty desk still has its chair — without one it read as a
      // partition with a bite taken out of it rather than a vacant seat
      props.push({ id: `${id}_chair`, tex: PropTex.CHAIR, x: figureX, y: figureY, flipX: slot.flipX });
      return;
    }

    const variant = COWORKER_SEAT_VARIANTS[variantCursor.i % COWORKER_SEAT_VARIANTS.length];
    const deskClutter = variantCursor.i % 3 === 0;
    variantCursor.i++;

    if (occ.kind === "named") {
      coworkers.push({
        id: occ.id,
        x: figureX,
        y: figureY,
        tex: variant,
        seated: true,
        // same-pod seats sit ~38px apart at minimum (see figureX/Y above) —
        // a wider range here made neighbouring seats' catch circles overlap,
        // so "closest interactable" could pick the coworker next door
        // instead of the one the player was actually standing in front of
        interactable: { prompt: occ.label, range: 17 },
      });
    } else {
      coworkers.push({ id: `${id}_extra`, x: figureX, y: figureY, tex: variant, seated: true });
    }

    // roughly a third of occupied desks get something left on the desk
    // surface itself (papers, a mug) — on the cubicle side away from the
    // seat, never overlapping the figure
    if (deskClutter) {
      props.push({ id: `${id}_papers`, tex: OfficeTex.PAPER_STACK, x: dx - slot.faceDx * 6, y: dy - slot.faceDy * 8 });
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

  // ---- open-plan floor: a real grid of desk pods on an 8-tile pitch.
  // The first pass had 6 pods on a 13-tile pitch, which left the aisles
  // between them reading as bare carpet no matter how much loose clutter
  // got scattered into the gaps — the actual fix is more desks, not more
  // scatter. Two of the grid slots are given to shared equipment (printer,
  // water cooler) instead of a pod, same as a real floor plan would. Not
  // every desk is occupied — some are simply empty, which reads as
  // attrition/people already gone rather than a staffing bug.
  const pods: Array<{ id: string; cx: number; cy: number; occ: [PodOccupant, PodOccupant, PodOccupant, PodOccupant]; decor: PodDecor }> = [
    {
      id: "pod1",
      cx: 19,
      cy: 11,
      occ: [{ kind: "named", id: "dana", label: "Talk to Dana" }, { kind: "extra" }, { kind: "empty" }, { kind: "extra" }],
      decor: { rug: true, filing: "w", bin: "n" },
    },
    {
      id: "pod2",
      cx: 35,
      cy: 11,
      occ: [{ kind: "extra" }, { kind: "named", id: "mark", label: "Talk to Mark" }, { kind: "empty" }, { kind: "extra" }],
      decor: { rug: true, coat: "e", bin: "n" },
    },
    {
      id: "pod3",
      cx: 19,
      cy: 19,
      occ: [{ kind: "empty" }, { kind: "extra" }, { kind: "named", id: "priya", label: "Talk to Priya" }, { kind: "extra" }],
      decor: { rug: true, bin: "w" },
    },
    {
      id: "pod4",
      cx: 27,
      cy: 19,
      occ: [{ kind: "named", id: "owen", label: "Talk to Owen" }, { kind: "empty" }, { kind: "extra" }, { kind: "empty" }],
      decor: { rug: true, filing: "n" },
    },
    {
      id: "pod5",
      cx: 35,
      cy: 19,
      occ: [{ kind: "extra" }, { kind: "empty" }, { kind: "named", id: "fatima", label: "Talk to Fatima" }, { kind: "extra" }],
      decor: { rug: true, coat: "e", filing: "s" },
    },
    {
      id: "pod6",
      cx: 19,
      cy: 27,
      occ: [{ kind: "named", id: "ben", label: "Talk to Ben" }, { kind: "extra" }, { kind: "empty" }, { kind: "empty" }],
      decor: { rug: true, bin: "w" },
    },
    {
      id: "pod7",
      cx: 35,
      cy: 27,
      occ: [{ kind: "extra" }, { kind: "named", id: "sam", label: "Talk to Sam" }, { kind: "empty" }, { kind: "extra" }],
      decor: { rug: true, filing: "e", bin: "s" },
    },
    {
      id: "pod8",
      cx: 19,
      cy: 35,
      occ: [{ kind: "empty" }, { kind: "extra" }, { kind: "named", id: "elena", label: "Talk to Elena" }, { kind: "empty" }],
      decor: { rug: true, bin: "w" },
    },
    {
      id: "pod9",
      cx: 27,
      cy: 35,
      occ: [{ kind: "player_desk" }, { kind: "extra" }, { kind: "named", id: "chris", label: "Talk to Chris" }, { kind: "empty" }],
      decor: { rug: true, coat: "s" },
    },
    {
      id: "pod10",
      cx: 35,
      cy: 35,
      occ: [{ kind: "empty" }, { kind: "extra" }, { kind: "named", id: "greg", label: "Talk to Greg" }, { kind: "extra" }],
      decor: { rug: true, filing: "e", bin: "s" },
    },
    {
      id: "pod11",
      cx: 19,
      cy: 42,
      occ: [{ kind: "extra" }, { kind: "empty" }, { kind: "extra" }, { kind: "empty" }],
      decor: { rug: true, bin: "w" },
    },
    {
      id: "pod12",
      cx: 35,
      cy: 42,
      occ: [{ kind: "empty" }, { kind: "extra" }, { kind: "empty" }, { kind: "extra" }],
      decor: { rug: true, coat: "e" },
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

  // printer station occupies the grid slot between pods 1/2 and 3/5 —
  // its own filing cabinet and a loose stack of paper right beside it
  const printer = tileCenter(27, 11);
  props.push({ id: "printer", tex: OfficeTex.PRINTER, x: printer.x, y: printer.y, solid: true, interactable: { prompt: "Check printer", range: 22 } });
  props.push({ id: "printer_cabinet", tex: OfficeTex.FILING_CABINET, x: printer.x + 15, y: printer.y, solid: true });
  props.push({ id: "printer_papers", tex: OfficeTex.PAPER_STACK, x: printer.x - 12, y: printer.y + 6 });
  props.push({ id: "printer_bin", tex: OfficeTex.BIN, x: printer.x, y: printer.y + 14 });

  // coffee/water station occupies the matching grid slot one row down,
  // between pods 6/7 and 9
  const cooler = tileCenter(27, 27);
  props.push({ id: "water_cooler", tex: OfficeTex.WATER_COOLER, x: cooler.x, y: cooler.y, solid: true, interactable: { prompt: "Get some water", range: 22 } });
  props.push({ id: "coffee_counter", tex: PropTex.COUNTER, x: cooler.x + 24, y: cooler.y, solid: true, tint: 0x8a8f94 });
  props.push({ id: "coffee_mug_stack", tex: OfficeTex.PAPER_STACK, x: cooler.x - 14, y: cooler.y + 8 });
  props.push({ id: "coffee_bin", tex: OfficeTex.BIN, x: cooler.x, y: cooler.y + 16 });

  // ---- records alcove, west wall below the meeting rooms (x<13, y>28) —
  // this strip has no pods (the meeting rooms above it rule out a grid
  // column), so instead of scattering loose filing cabinets across open
  // carpet it gets one purpose-built archive nook: several cabinets
  // clustered together the way a real records room would be, against the
  // wall it's actually plausible next to ----
  const archiveBaseX = 5;
  const archiveBaseY = 32;
  for (let i = 0; i < 3; i++) {
    const p = tileCenter(archiveBaseX + i * 1.4, archiveBaseY);
    props.push({ id: `archive_cabinet_${i}`, tex: OfficeTex.FILING_CABINET, x: p.x, y: p.y, solid: true });
  }
  const archivePapers = tileCenter(archiveBaseX + 1.4, archiveBaseY + 1.6);
  props.push({ id: "archive_papers", tex: OfficeTex.PAPER_STACK, x: archivePapers.x, y: archivePapers.y });
  const archivePoster = tileCenter(archiveBaseX + 0.5, archiveBaseY - 2.5);
  props.push({ id: "archive_poster", tex: OfficeTex.POSTER_A, x: archivePoster.x, y: archivePoster.y });
  const archiveBin = tileCenter(archiveBaseX - 2, archiveBaseY + 1);
  props.push({ id: "archive_bin", tex: OfficeTex.BIN, x: archiveBin.x, y: archiveBin.y });
  for (const oy of [-8, 8]) {
    const p = tileCenter(archiveBaseX - 1.5, archiveBaseY + oy / 5);
    props.push({ id: `archive_plant_${oy}`, tex: OfficeTex.PLANT, x: p.x, y: p.y });
  }

  // whiteboards + posters/calendars against the east wall, one per window
  // bay, plus the meeting-room-facing wall — real wall-mounted dressing,
  // not floor clutter
  props.push({ id: "wb_east", tex: OfficeTex.WHITEBOARD, x: tileCenter(LEVEL_WIDTH - 1.6, 15).x, y: tileCenter(LEVEL_WIDTH - 1.6, 15).y });
  props.push({ id: "poster_east_1", tex: OfficeTex.POSTER_A, x: tileCenter(LEVEL_WIDTH - 1.6, 23).x, y: tileCenter(LEVEL_WIDTH - 1.6, 23).y });
  props.push({ id: "calendar_east", tex: OfficeTex.CALENDAR, x: tileCenter(LEVEL_WIDTH - 1.6, 31).x, y: tileCenter(LEVEL_WIDTH - 1.6, 31).y });
  props.push({ id: "poster_east_2", tex: OfficeTex.POSTER_B, x: tileCenter(LEVEL_WIDTH - 1.6, 39).x, y: tileCenter(LEVEL_WIDTH - 1.6, 39).y });
  props.push({ id: "calendar_east_2", tex: OfficeTex.CALENDAR, x: tileCenter(LEVEL_WIDTH - 1.6, 45).x, y: tileCenter(LEVEL_WIDTH - 1.6, 45).y });
  props.push({ id: "poster_meeting_a", tex: OfficeTex.POSTER_B, x: tileCenter(9.4, 32).x, y: tileCenter(9.4, 32).y });

  // a handful of plants at the open intersections between pod rows/columns
  // — softening the grid the way an actual office breaks up a cubicle
  // farm, not a blind scatter: fixed, hand-picked spots at the gaps the
  // pod grid itself leaves open, one per intersection rather than several
  const aisleIntersections: Array<[number, number]> = [
    [27, 15],
    [23, 23],
    [31, 31],
    [23, 39],
    [31, 11],
  ];
  aisleIntersections.forEach(([tx, ty], i) => {
    const p = tileCenter(tx, ty);
    props.push({ id: `aisle_plant_${i}`, tex: OfficeTex.PLANT, x: p.x, y: p.y });
  });

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

  // supplies staged near the break room's back corridor — spare chairs and
  // a couple of boxes of stock for the vending machines, waiting to be put
  // away; this is also the only stretch of the west corridor with nothing
  // else nearby (the records alcove is well north of it, the break room's
  // own dressing well south), so it earns a real reason to be here rather
  // than another loose scatter
  const supplyBaseY = LEVEL_HEIGHT - 13;
  props.push({ id: "supply_cabinet", tex: OfficeTex.FILING_CABINET, x: tileCenter(6, supplyBaseY).x, y: tileCenter(6, supplyBaseY).y, solid: true });
  props.push({ id: "supply_boxes", tex: OfficeTex.PAPER_STACK, x: tileCenter(6, supplyBaseY + 1.4).x, y: tileCenter(6, supplyBaseY + 1.4).y });
  props.push({ id: "supply_chair", tex: PropTex.CHAIR, x: tileCenter(3.5, supplyBaseY + 1).x, y: tileCenter(3.5, supplyBaseY + 1).y });
  props.push({ id: "supply_bin", tex: OfficeTex.BIN, x: tileCenter(8.5, supplyBaseY).x, y: tileCenter(8.5, supplyBaseY).y });

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
