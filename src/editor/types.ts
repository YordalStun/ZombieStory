import type { PropSpec, LightSpec } from "@/data/levels/apartmentLevel";

/**
 * The editor's own level format. It's a generic superset of the shapes
 * used across the real game's src/data/levels/*.ts files (which differ
 * slightly from each other — different names for the player-start field,
 * a handful of apartment-only named waypoints, etc.) rather than a exact
 * clone of any one of them. A level saved here is meant to be handed back
 * as a starting point for hand-written game level code, not loaded by the
 * game directly — the editor never reads or writes anything the running
 * game depends on.
 */
export type { PropSpec, LightSpec };

export interface ObjectiveStep {
  id: string;
  label: string;
}

export interface EditorObjectives {
  title: string;
  steps: ObjectiveStep[];
}

/**
 * A light switch a family member walks to and flips (see
 * familyHouseLevel.ts's SwitchSpec / HouseDefenseScene) — its own (x, y) is
 * where the switch prop sits, `lightId`/`lightX`/`lightY` are the separate
 * room-center ceiling light it toggles, and `spawnX`/`spawnY` is the
 * doorway point the family member walks in from and back out to. Unlike
 * the single playerStart/endPoint/zombieSpawn markers, a level can have
 * several of these, so they're a plain array rather than a MarkerKind.
 */
export interface EditorSwitchSpec {
  id: string;
  familyMemberId: string;
  x: number;
  y: number;
  lightId: string;
  lightX: number;
  lightY: number;
  spawnX: number;
  spawnY: number;
}

/** Where zombies force their way in (a broken window/door) — see FloorLevel.breachPoints. Also a plain array, for the same reason as switches. */
export interface EditorBreachPoint {
  id: string;
  x: number;
  y: number;
}

export interface EditorLevelData {
  formatVersion: 1;
  meta: {
    name: string;
    notes: string;
  };
  width: number;
  height: number;
  /** tiles[y][x], same convention as the game's TileGrid.toArray() — -1 means empty/unset. */
  tiles: number[][];
  props: PropSpec[];
  playerStart: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  zombieSpawn: { x: number; y: number } | null;
  switches: EditorSwitchSpec[];
  breachPoints: EditorBreachPoint[];
  ambientLevel: number;
  objectives: EditorObjectives;
}

export function emptyTileGrid(width: number, height: number, fill = -1): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < height; y++) rows.push(new Array(width).fill(fill));
  return rows;
}

export function newLevel(width = 24, height = 16): EditorLevelData {
  return {
    formatVersion: 1,
    meta: { name: "untitled-level", notes: "" },
    width,
    height,
    tiles: emptyTileGrid(width, height),
    props: [],
    playerStart: null,
    endPoint: null,
    zombieSpawn: null,
    switches: [],
    breachPoints: [],
    ambientLevel: 1,
    objectives: { title: "", steps: [] },
  };
}

/** Resize a tile grid in place semantics (returns a new grid), preserving overlapping cells. */
export function resizeTileGrid(tiles: number[][], newWidth: number, newHeight: number, fill = -1): number[][] {
  const out = emptyTileGrid(newWidth, newHeight, fill);
  const h = Math.min(tiles.length, newHeight);
  for (let y = 0; y < h; y++) {
    const w = Math.min(tiles[y].length, newWidth);
    for (let x = 0; x < w; x++) out[y][x] = tiles[y][x];
  }
  return out;
}
