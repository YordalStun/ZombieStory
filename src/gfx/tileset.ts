import { Palette } from "@/gfx/palette";
import { clear, outline, rect, speckle } from "@/gfx/canvasUtils";

export const TILE = {
  FLOOR_WOOD: 0,
  FLOOR_WOOD_B: 1,
  FLOOR_TILE: 2,
  FLOOR_TILE_B: 3,
  WALL: 4,
  WALL_EXT: 5,
  DRIVEWAY: 6,
  GRASS: 7,
  WINDOW_NIGHT: 8,
  WINDOW_DAY: 9,
} as const;

export const TILESET_KEY = "tileset";
export const TILE_COUNT = 10;

export const WALL_TILE_INDICES = [
  TILE.WALL,
  TILE.WALL_EXT,
  TILE.WINDOW_NIGHT,
  TILE.WINDOW_DAY,
];

const T = 16;

function drawFloorWood(ctx: CanvasRenderingContext2D, ox: number, variant: boolean): void {
  rect(ctx, ox, 0, T, T, variant ? Palette.floorWoodDark : Palette.floorWood);
  // plank lines
  rect(ctx, ox, 5, T, 1, Palette.floorWoodDark);
  rect(ctx, ox, 11, T, 1, Palette.floorWoodDark);
  rect(ctx, ox + 6, 0, 1, 5, Palette.floorWoodDark);
  rect(ctx, ox + 2, 6, 1, 5, Palette.floorWoodDark);
  rect(ctx, ox + 11, 12, 1, 4, Palette.floorWoodDark);
  speckle(ctx, ox, 0, T, T, variant ? Palette.floorWood : Palette.floorWoodDark, 4, ox + 3);
}

function drawFloorTile(ctx: CanvasRenderingContext2D, ox: number, variant: boolean): void {
  rect(ctx, ox, 0, T, T, Palette.floorTile);
  outline(ctx, ox, 0, T, T, Palette.floorTileDark);
  if (variant) {
    rect(ctx, ox + 7, 0, 1, T, Palette.floorTileDark);
    rect(ctx, ox, 7, T, 1, Palette.floorTileDark);
  }
}

function drawWall(ctx: CanvasRenderingContext2D, ox: number, exterior: boolean): void {
  rect(ctx, ox, 0, T, T, Palette.wall);
  rect(ctx, ox, 0, T, 3, Palette.wallTrim);
  rect(ctx, ox, T - 3, T, 3, Palette.wallShadow);
  if (exterior) {
    speckle(ctx, ox, 3, T, T - 6, Palette.wallShadow, 6, ox + 9);
  }
}

function drawDriveway(ctx: CanvasRenderingContext2D, ox: number): void {
  rect(ctx, ox, 0, T, T, Palette.driveway);
  speckle(ctx, ox, 0, T, T, Palette.drivewayDark, 10, ox + 5);
}

function drawGrass(ctx: CanvasRenderingContext2D, ox: number): void {
  rect(ctx, ox, 0, T, T, Palette.grass);
  speckle(ctx, ox, 0, T, T, Palette.grassDark, 14, ox + 7);
}

function drawWindowWall(ctx: CanvasRenderingContext2D, ox: number, day: boolean): void {
  rect(ctx, ox, 0, T, T, Palette.wall);
  rect(ctx, ox, 0, T, 3, Palette.wallTrim);
  rect(ctx, ox, T - 3, T, 3, Palette.wallShadow);
  // window frame + glass
  rect(ctx, ox + 2, 4, T - 4, 9, Palette.doorFrame);
  rect(ctx, ox + 3, 5, T - 6, 7, day ? Palette.windowGlassDay : Palette.windowGlassNight);
  rect(ctx, ox + 7, 5, 1, 7, Palette.doorFrame);
}

export function generateTileset(scene: Phaser.Scene): void {
  const key = TILESET_KEY;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, T * TILE_COUNT, T)!;
  const ctx = tex.getContext();
  clear(ctx, T * TILE_COUNT, T);

  drawFloorWood(ctx, TILE.FLOOR_WOOD * T, false);
  drawFloorWood(ctx, TILE.FLOOR_WOOD_B * T, true);
  drawFloorTile(ctx, TILE.FLOOR_TILE * T, false);
  drawFloorTile(ctx, TILE.FLOOR_TILE_B * T, true);
  drawWall(ctx, TILE.WALL * T, false);
  drawWall(ctx, TILE.WALL_EXT * T, true);
  drawDriveway(ctx, TILE.DRIVEWAY * T);
  drawGrass(ctx, TILE.GRASS * T);
  drawWindowWall(ctx, TILE.WINDOW_NIGHT * T, false);
  drawWindowWall(ctx, TILE.WINDOW_DAY * T, true);

  tex.refresh();
}
