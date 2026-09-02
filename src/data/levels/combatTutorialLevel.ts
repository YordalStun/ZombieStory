import { TileGrid } from "@/core/level/TileGrid";
import { TILE } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import type { PropSpec } from "@/data/levels/apartmentLevel";

export type CombatTutorialVariant = "dirtTrack" | "garden";

export interface CombatTutorialLevel {
  width: number;
  height: number;
  tiles: number[][];
  props: PropSpec[];
  playerStart: { x: number; y: number };
  /** Reaching within range of this ends the tutorial. */
  endPoint: { x: number; y: number };
  ambientLevel: number;
}

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

/** A dirt track (grass either side of a beaten path) with a few widely-spaced street lamps — Path 1. */
function buildDirtTrack(): CombatTutorialLevel {
  const width = 10;
  const height = 42;
  const grid = new TileGrid(width, height, -1);
  grid.room(0, 0, width, height, TILE.WALL_EXT, TILE.GRASS);
  grid.fillRect(3, 1, 4, height - 2, TILE.DRIVEWAY);

  const props: PropSpec[] = [];
  const lampSpots: Array<[number, number]> = [
    [2.3, 32],
    [7.3, 22],
    [2.3, 12],
  ];
  lampSpots.forEach(([tx, ty], i) => {
    const p = tileCenter(tx, ty);
    props.push({
      id: `dirt_lamp_${i}`,
      tex: PropTex.STREET_LAMP,
      x: p.x,
      y: p.y,
      light: { radius: 50, color: 0xffe9a8, intensity: 0.75, flicker: { intensityJitter: 0.08 } },
    });
  });

  return {
    width,
    height,
    tiles: grid.toArray(),
    props,
    playerStart: tileCenter(4.5, 39),
    endPoint: tileCenter(4.5, 3),
    ambientLevel: 0.16,
  };
}

/** A short side-garden path from the crash site to the gate — Path 2. */
function buildGarden(): CombatTutorialLevel {
  const width = 9;
  const height = 16;
  const grid = new TileGrid(width, height, -1);
  grid.room(0, 0, width, height, TILE.WALL_EXT, TILE.GRASS);
  grid.fillRect(3, 1, 3, height - 2, TILE.DRIVEWAY);

  const props: PropSpec[] = [];
  const lamp = tileCenter(6, 8);
  props.push({
    id: "garden_lamp",
    tex: PropTex.STREET_LAMP,
    x: lamp.x,
    y: lamp.y,
    light: { radius: 46, color: 0xffe9a8, intensity: 0.7, flicker: { intensityJitter: 0.08 } },
  });

  // the gate itself — a gap flanked by two fence segments, the last thing
  // the player walks through before the stories rejoin
  const gateL = tileCenter(2.2, 2);
  const gateR = tileCenter(6.8, 2);
  props.push({ id: "gate_l", tex: PropTex.FENCE_SEGMENT, x: gateL.x, y: gateL.y, solid: true });
  props.push({ id: "gate_r", tex: PropTex.FENCE_SEGMENT, x: gateR.x, y: gateR.y, solid: true });

  return {
    width,
    height,
    tiles: grid.toArray(),
    props,
    playerStart: tileCenter(4.5, 14),
    endPoint: tileCenter(4.5, 2),
    ambientLevel: 0.4,
  };
}

export function buildCombatTutorialLevel(variant: CombatTutorialVariant): CombatTutorialLevel {
  return variant === "dirtTrack" ? buildDirtTrack() : buildGarden();
}
