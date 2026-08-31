import { TileGrid } from "@/core/level/TileGrid";
import { TILE } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import { OfficeTex } from "@/gfx/office";
import { COWORKER_VARIANTS, type CoworkerVariant } from "@/gfx/coworkerFigure";
import type { PropSpec } from "@/data/levels/apartmentLevel";

export const LEVEL_WIDTH = 40;
export const LEVEL_HEIGHT = 52;

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export interface CoworkerSpec {
  id: string;
  x: number;
  y: number;
  tex: CoworkerVariant;
  flip?: boolean;
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
  /** World Y past which the player has reached the break room — crosses this once and the broadcast fires. */
  breakRoomTriggerY: number;
}

/** Small seeded RNG so the crowd's "random" jitter is stable across reloads instead of reshuffling every playthrough. */
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
  | { kind: "empty" };

const POD_HALF_W = 15;
const POD_HALF_H = 13;

/**
 * Four desks in a pinwheel around a shared center — partitions meet in the
 * middle (like a real 4-up cubicle cluster), each desk opening outward into
 * its own corner. One drawn cubicle texture, mirrored per slot, so "sitting
 * in different directions" doesn't need four different pieces of art.
 */
const POD_SLOTS = [
  { dx: -POD_HALF_W, dy: -POD_HALF_H, flipX: true, flipY: true, faceDx: -1, faceDy: -1 }, // NW, opens up-left
  { dx: POD_HALF_W, dy: -POD_HALF_H, flipX: false, flipY: true, faceDx: 1, faceDy: -1 }, // NE, opens up-right
  { dx: -POD_HALF_W, dy: POD_HALF_H, flipX: true, flipY: false, faceDx: -1, faceDy: 1 }, // SW, opens down-left
  { dx: POD_HALF_W, dy: POD_HALF_H, flipX: false, flipY: false, faceDx: 1, faceDy: 1 }, // SE, opens down-right
] as const;

function placeDeskPod(
  props: PropSpec[],
  coworkers: CoworkerSpec[],
  podId: string,
  cx: number,
  cy: number,
  occupants: [PodOccupant, PodOccupant, PodOccupant, PodOccupant],
  variantCursor: { i: number },
): void {
  POD_SLOTS.forEach((slot, i) => {
    const dx = cx + slot.dx;
    const dy = cy + slot.dy;
    const id = `${podId}_${i}`;
    props.push({ id, tex: OfficeTex.CUBICLE, x: dx, y: dy, solid: true, flipX: slot.flipX, flipY: slot.flipY });

    const occ = occupants[i];
    if (occ.kind === "empty") return;

    const figureX = dx + slot.faceDx * 10;
    const figureY = dy + slot.faceDy * 10;
    const variant = COWORKER_VARIANTS[variantCursor.i % COWORKER_VARIANTS.length];
    variantCursor.i++;

    if (occ.kind === "named") {
      coworkers.push({
        id: occ.id,
        x: figureX,
        y: figureY,
        tex: variant,
        flip: slot.faceDx < 0,
        interactable: { prompt: occ.label, range: 26 },
      });
    } else {
      coworkers.push({ id: `${id}_extra`, x: figureX, y: figureY, tex: variant, flip: slot.faceDx < 0 });
    }
  });
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
): void {
  grid.room(x, y, w, h, TILE.WALL, TILE.FLOOR_CARPET_OFFICE_B);
  grid.doorwayV(x + w - 1, y + Math.floor(h / 2) - 1, y + Math.floor(h / 2), TILE.FLOOR_CARPET_OFFICE_B);

  const table = tileCenter(x + w / 2, y + h / 2);
  props.push({ id: `${roomId}_table`, tex: OfficeTex.MEETING_TABLE, x: table.x, y: table.y, solid: true });
  for (const [ox, oy] of [
    [-14, -17],
    [14, -17],
    [-14, 17],
    [14, 17],
  ] as const) {
    props.push({ id: `${roomId}_chair_${ox}_${oy}`, tex: PropTex.CHAIR, x: table.x + ox, y: table.y + oy });
  }
}

export function buildOfficeLevel(): OfficeLevel {
  const grid = new TileGrid(LEVEL_WIDTH, LEVEL_HEIGHT, -1);
  grid.room(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT, TILE.WALL, TILE.FLOOR_CARPET_OFFICE);

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
  for (const px of [12, 28]) {
    const p = tileCenter(px, 2.5);
    props.push({ id: `lobby_plant_${px}`, tex: OfficeTex.PLANT, x: p.x, y: p.y });
  }
  const noticeBoard = tileCenter(LEVEL_WIDTH - 1.6, 4);
  props.push({ id: "notice_board", tex: OfficeTex.NOTICE_BOARD, x: noticeBoard.x, y: noticeBoard.y });

  // ---- two glassed-off meeting rooms along the west wall, doors standing
  // open onto the floor — both empty, whatever was meant to happen in them
  // clearly isn't happening today ----
  carveMeetingRoom(grid, props, 2, 8, 9, 8, "meeting_a");
  carveMeetingRoom(grid, props, 2, 20, 9, 8, "meeting_b");

  // ---- open-plan floor: desk pods scattered with generous walking room
  // around and between them, not packed into forced corridors ----
  const pods: Array<{ id: string; cx: number; cy: number; occ: [PodOccupant, PodOccupant, PodOccupant, PodOccupant] }> = [
    {
      id: "pod1",
      cx: 20,
      cy: 12,
      occ: [{ kind: "extra" }, { kind: "extra" }, { kind: "empty" }, { kind: "named", id: "priya", label: "Talk to Priya" }],
    },
    {
      id: "pod2",
      cx: 32,
      cy: 11,
      occ: [{ kind: "named", id: "mark", label: "Talk to Mark" }, { kind: "empty" }, { kind: "extra" }, { kind: "empty" }],
    },
    {
      id: "pod3",
      cx: 19,
      cy: 25,
      occ: [{ kind: "extra" }, { kind: "empty" }, { kind: "named", id: "annoyed", label: "Talk to coworker" }, { kind: "extra" }],
    },
    {
      id: "pod4",
      cx: 33,
      cy: 26,
      occ: [{ kind: "empty" }, { kind: "named", id: "sam", label: "Talk to Sam" }, { kind: "extra" }, { kind: "empty" }],
    },
    {
      id: "pod5",
      cx: 19,
      cy: 38,
      occ: [{ kind: "extra" }, { kind: "extra" }, { kind: "empty" }, { kind: "named", id: "elena", label: "Talk to Elena" }],
    },
    {
      id: "pod6",
      cx: 32,
      cy: 39,
      occ: [{ kind: "empty" }, { kind: "extra" }, { kind: "empty" }, { kind: "extra" }],
    },
  ];
  for (const pod of pods) {
    const c = tileCenter(pod.cx, pod.cy);
    placeDeskPod(props, coworkers, pod.id, c.x, c.y, pod.occ, variantCursor);
  }

  // landmark clutter in the open floor between pods — filing cabinets,
  // a printer station, more plants, so the space reads as lived-in rather
  // than just repeated desk units
  const filingSpots: Array<[number, number]> = [
    [26, 10],
    [26, 25],
    [37, 18],
    [14, 31],
  ];
  filingSpots.forEach(([fx, fy], i) => {
    const p = tileCenter(fx, fy);
    props.push({ id: `filing_${i}`, tex: OfficeTex.FILING_CABINET, x: p.x, y: p.y, solid: true });
  });

  const printer = tileCenter(26, 18);
  props.push({ id: "printer", tex: OfficeTex.PRINTER, x: printer.x, y: printer.y, solid: true, interactable: { prompt: "Check printer", range: 20 } });

  for (const [px, py] of [
    [14, 12],
    [37, 32],
    [14, 44],
  ] as const) {
    const p = tileCenter(px, py);
    props.push({ id: `floor_plant_${px}_${py}`, tex: OfficeTex.PLANT, x: p.x, y: p.y });
  }

  // water cooler, a central open-floor landmark between the pod clusters
  const cooler = tileCenter(26, 32);
  props.push({ id: "water_cooler", tex: OfficeTex.WATER_COOLER, x: cooler.x, y: cooler.y, solid: true, interactable: { prompt: "Get some water", range: 22 } });
  coworkers.push({
    id: "greg",
    x: cooler.x - 18,
    y: cooler.y + 4,
    tex: COWORKER_VARIANTS[variantCursor.i++ % COWORKER_VARIANTS.length],
    interactable: { prompt: "Talk to Greg", range: 26 },
  });

  // ---- break room (south end): TV against the south wall, a crowd of
  // coworkers gathered in front of it ----
  const tv = tileCenter(LEVEL_WIDTH / 2, LEVEL_HEIGHT - 3);
  props.push({
    id: "tv",
    tex: PropTex.TV_ON,
    x: tv.x,
    y: tv.y,
    solid: true,
    interactable: { prompt: "Watch the news", range: 40 },
  });

  for (const px of [7, LEVEL_WIDTH - 8]) {
    const p = tileCenter(px, LEVEL_HEIGHT - 3);
    props.push({ id: `break_plant_${px}`, tex: OfficeTex.PLANT, x: p.x, y: p.y });
  }

  const rand = makeRng(918273);
  const crowdCenterX = (LEVEL_WIDTH * TILE_SIZE) / 2;
  const crowdTopY = tileCenter(0, LEVEL_HEIGHT - 12).y;
  const crowdBottomY = tv.y - 22;
  let crowdN = 0;
  for (let row = 0; row < 5; row++) {
    const y = crowdTopY + (row * (crowdBottomY - crowdTopY)) / 4 + (rand() - 0.5) * 6;
    const perRow = 4 + (row % 2);
    for (let i = 0; i < perRow; i++) {
      const spread = 170 - row * 8;
      const x = crowdCenterX + (i - (perRow - 1) / 2) * (spread / perRow) + (rand() - 0.5) * 10;
      coworkers.push({
        id: `crowd_${crowdN}`,
        x,
        y,
        tex: COWORKER_VARIANTS[crowdN % COWORKER_VARIANTS.length],
        flip: crowdN % 2 === 0,
      });
      crowdN++;
    }
  }

  return {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    tiles: grid.toArray(),
    props,
    coworkers,
    playerStart: tileCenter(20, 4.5),
    tvWorldPos: tv,
    breakRoomTriggerY: crowdTopY + 10,
  };
}
