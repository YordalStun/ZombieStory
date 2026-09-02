import { TileGrid } from "@/core/level/TileGrid";
import { TILE } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import { CoworkerTex } from "@/gfx/coworkerFigure";
import type { PropSpec } from "@/data/levels/apartmentLevel";
import type { CoworkerSpec } from "@/data/levels/officeLevel";

export type LeaveBuildingVariant = "carpark" | "forecourt";

export interface LeaveBuildingLevel {
  width: number;
  height: number;
  tiles: number[][];
  props: PropSpec[];
  npcs: CoworkerSpec[];
  playerStart: { x: number; y: number };
  zombieSpawn: { x: number; y: number };
  /** Ambient light level passed straight to LightingManager — the car park is dim, the forecourt is ordinary daylight. */
  ambientLevel: number;
}

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

/**
 * Path 1: the multi-level car park. One open bordered floor rather than
 * true multi-storey geometry (this game has no z-levels) — "going up a
 * layer" is sold by walking through a pillar gateway partway up, from the
 * zombie's level to the car's, plus a dimmer ambient than anywhere else the
 * player's been so far.
 */
function buildCarPark(): LeaveBuildingLevel {
  const width = 22;
  const height = 32;
  const grid = new TileGrid(width, height, -1);
  grid.room(0, 0, width, height, TILE.WALL_EXT, TILE.DRIVEWAY);

  const props: PropSpec[] = [];

  for (const [tx, ty] of [
    [4, 24],
    [17, 24],
    [4, 20],
    [17, 20],
    [4, 8],
    [17, 8],
    [4, 4],
    [17, 4],
  ] as const) {
    const p = tileCenter(tx, ty);
    props.push({ id: `pillar_${tx}_${ty}`, tex: PropTex.PILLAR, x: p.x, y: p.y, solid: true });
  }

  // the "gateway" up to the next level — a gap between two pillars, roughly
  // level's midpoint, that the player has to walk through
  const gateL = tileCenter(9, 16);
  const gateR = tileCenter(13, 16);
  props.push({ id: "pillar_gate_l", tex: PropTex.PILLAR, x: gateL.x, y: gateL.y, solid: true });
  props.push({ id: "pillar_gate_r", tex: PropTex.PILLAR, x: gateR.x, y: gateR.y, solid: true });

  const car = tileCenter(11, 5);
  props.push({
    id: "car",
    tex: PropTex.CAR,
    x: car.x,
    y: car.y,
    solid: true,
    interactable: { prompt: "Get in the car", range: 30 },
  });

  return {
    width,
    height,
    tiles: grid.toArray(),
    props,
    npcs: [],
    playerStart: tileCenter(11, 28),
    zombieSpawn: tileCenter(7, 26),
    ambientLevel: 0.55,
  };
}

/** Path 2: a short forecourt strip just outside the office building, Dad's car waiting across it. */
function buildForecourt(): LeaveBuildingLevel {
  const width = 20;
  const height = 15;
  const grid = new TileGrid(width, height, -1);
  grid.room(0, 0, width, height, TILE.OFFICE_WALL, TILE.DRIVEWAY);

  const props: PropSpec[] = [];
  for (const tx of [3, width - 4]) {
    const p = tileCenter(tx, 12);
    props.push({ id: `forecourt_lamp_${tx}`, tex: PropTex.STREET_LAMP, x: p.x, y: p.y, light: { radius: 55, color: 0xffe9a8, intensity: 0.7 } });
  }
  for (const [tx, ty] of [
    [2, 3],
    [width - 3, 3],
  ] as const) {
    const p = tileCenter(tx, ty);
    props.push({ id: `forecourt_bush_${tx}`, tex: PropTex.BUSH, x: p.x, y: p.y, sway: true });
  }

  const car = tileCenter(10, 2);
  props.push({
    id: "car",
    tex: PropTex.CAR,
    x: car.x,
    y: car.y,
    solid: true,
    interactable: { prompt: "Get in the car", range: 30 },
  });

  const dad = tileCenter(13, 2.3);
  const npcs: CoworkerSpec[] = [{ id: "dad", x: dad.x, y: dad.y, tex: CoworkerTex.STAND_G, flip: true }];

  return {
    width,
    height,
    tiles: grid.toArray(),
    props,
    npcs,
    playerStart: tileCenter(10, 12),
    zombieSpawn: tileCenter(10, 6),
    ambientLevel: 0.95,
  };
}

export function buildLeaveBuildingLevel(variant: LeaveBuildingVariant): LeaveBuildingLevel {
  return variant === "carpark" ? buildCarPark() : buildForecourt();
}
