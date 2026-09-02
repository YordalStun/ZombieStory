import { PropTex, PropSize } from "@/gfx/props";
import { OfficeTex, OfficeTexSize } from "@/gfx/office";
import { CoworkerTex } from "@/gfx/coworkerFigure";
import { FigureTex } from "@/gfx/zombieFigure";
import { TILE, TILESET_KEY, WALL_TILE_INDICES, TILE_COUNT } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";

export type PaletteCategory = "tiles" | "props" | "office" | "coworkers" | "figures";

export interface PaletteEntry {
  /** For tiles: the numeric tile index as a string. For everything else: the texture key. */
  key: string;
  label: string;
  w: number;
  h: number;
  /** Tiles only — used to render the swatch from the shared tileset strip instead of its own texture. */
  tileIndex?: number;
}

const STAND_SIZE = { w: 16, h: 24 };
const SEAT_SIZE = { w: 20, h: 20 };
const FIGURE_SIZE = { w: 16, h: 30 };

function titleCase(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const TILE_PALETTE: PaletteEntry[] = Object.entries(TILE).map(([name, index]) => ({
  key: String(index),
  label: titleCase(name),
  w: TILE_SIZE,
  h: TILE_SIZE,
  tileIndex: index,
}));

export const WALL_TILE_SET = new Set<number>(WALL_TILE_INDICES);

export const PROP_PALETTE: PaletteEntry[] = Object.entries(PropTex).map(([name, key]) => ({
  key,
  label: titleCase(name),
  w: PropSize[key]?.w ?? TILE_SIZE,
  h: PropSize[key]?.h ?? TILE_SIZE,
}));

export const OFFICE_PALETTE: PaletteEntry[] = Object.entries(OfficeTex)
  .filter(([, key]) => key in OfficeTexSize)
  .map(([name, key]) => ({
    key,
    label: titleCase(name),
    w: OfficeTexSize[key].w,
    h: OfficeTexSize[key].h,
  }));

export const COWORKER_PALETTE: PaletteEntry[] = Object.entries(CoworkerTex).map(([name, key]) => ({
  key,
  label: titleCase(name),
  ...(name.startsWith("SEAT_") ? SEAT_SIZE : STAND_SIZE),
}));

export const FIGURE_PALETTE: PaletteEntry[] = Object.entries(FigureTex).map(([name, key]) => ({
  key,
  label: titleCase(name),
  ...FIGURE_SIZE,
}));

export const PALETTES: Record<PaletteCategory, PaletteEntry[]> = {
  tiles: TILE_PALETTE,
  props: PROP_PALETTE,
  office: OFFICE_PALETTE,
  coworkers: COWORKER_PALETTE,
  figures: FIGURE_PALETTE,
};

export { TILESET_KEY, TILE_COUNT };
