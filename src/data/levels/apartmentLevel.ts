import { TileGrid } from "@/core/level/TileGrid";
import { TILE } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";
import { PropTex } from "@/gfx/props";

export const LEVEL_WIDTH = 38;
export const LEVEL_HEIGHT = 16;

export interface LightSpec {
  radius: number;
  color: number;
  intensity: number;
  flicker?: { intensityJitter: number; radiusJitter?: number };
}

export interface PropSpec {
  id: string;
  tex: string;
  x: number;
  y: number;
  solid?: boolean;
  interactable?: { prompt: string; range: number };
  light?: LightSpec;
}

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

// Room outer rects (tile coords) — exported so the scene can derive room
// centers (e.g. for ceiling light placement) without re-deriving magic numbers.
export const BEDROOM_RECT = { x: 2, y: 2, w: 8, h: 7 };
export const BATHROOM_RECT = { x: 9, y: 2, w: 6, h: 7 };
export const KITCHEN_RECT = { x: 14, y: 2, w: 11, h: 7 };

function rectCenterTile(r: { x: number; y: number; w: number; h: number }) {
  return tileCenter(r.x + r.w / 2, r.y + r.h / 2);
}

export interface ApartmentLevel {
  width: number;
  height: number;
  tiles: number[][];
  props: PropSpec[];
  playerStartBedroom: { x: number; y: number };
  bedCenter: { x: number; y: number };
  windowWorldPos: { x: number; y: number };
  bathroomLightPos: { x: number; y: number };
  kitchenLightPos: { x: number; y: number };
  carCenter: { x: number; y: number };
}

export function buildApartmentLevel(): ApartmentLevel {
  const grid = new TileGrid(LEVEL_WIDTH, LEVEL_HEIGHT, -1);

  // grass base layer under everything, so the house's walls/floors overwrite
  // it cleanly and nothing outside the building footprint renders as void
  grid.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT, TILE.GRASS);

  grid.room(BEDROOM_RECT.x, BEDROOM_RECT.y, BEDROOM_RECT.w, BEDROOM_RECT.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(BATHROOM_RECT.x, BATHROOM_RECT.y, BATHROOM_RECT.w, BATHROOM_RECT.h, TILE.WALL, TILE.FLOOR_TILE);
  grid.room(KITCHEN_RECT.x, KITCHEN_RECT.y, KITCHEN_RECT.w, KITCHEN_RECT.h, TILE.WALL, TILE.FLOOR_WOOD);

  grid.doorwayV(9, 5, 5, TILE.FLOOR_WOOD);
  grid.doorwayV(14, 5, 5, TILE.FLOOR_WOOD);
  grid.doorwayV(24, 5, 5, TILE.FLOOR_WOOD); // front door gap, kitchen -> driveway

  grid.set(5, 2, TILE.WINDOW_NIGHT);

  grid.fillRect(24, 4, 13, 3, TILE.DRIVEWAY);
  grid.fillRect(30, 2, 7, 8, TILE.DRIVEWAY);

  const props: PropSpec[] = [];
  const bed = tileCenter(4, 4.5);
  const tv = tileCenter(7, 7); // hugs the south wall, clear of the bed-to-doorway walking line

  props.push({ id: "bed", tex: PropTex.BED, x: bed.x, y: bed.y, solid: true });

  props.push({
    id: "tv",
    tex: PropTex.TV_ON,
    x: tv.x,
    y: tv.y,
    solid: true,
    interactable: { prompt: "Turn off TV", range: 26 },
    light: {
      radius: 78,
      color: 0xaeeaff,
      intensity: 1.5,
      flicker: { intensityJitter: 0.22, radiusJitter: 0.08 },
    },
  });

  const clock = tileCenter(5.6, 3.1);
  props.push({
    id: "alarm_clock",
    tex: PropTex.ALARM_CLOCK,
    x: clock.x,
    y: clock.y,
    light: { radius: 16, color: 0xff5a5a, intensity: 0.4 },
  });

  const dresser = tileCenter(7, 3.3);
  props.push({
    id: "dresser",
    tex: PropTex.DRESSER,
    x: dresser.x,
    y: dresser.y,
    solid: true,
    interactable: { prompt: "Get dressed", range: 24 },
  });

  const rug = tileCenter(4.5, 6.3);
  props.push({ id: "rug", tex: PropTex.RUG, x: rug.x, y: rug.y });

  const sink = tileCenter(12, 4);
  props.push({
    id: "sink",
    tex: PropTex.SINK,
    x: sink.x,
    y: sink.y,
    solid: true,
    interactable: { prompt: "Wash up", range: 22 },
  });

  const bathSwitch = tileCenter(9.4, 3);
  props.push({
    id: "bathroom_switch",
    tex: PropTex.SWITCH_OFF,
    x: bathSwitch.x,
    y: bathSwitch.y,
    interactable: { prompt: "Flip light switch", range: 20 },
  });

  const counter = tileCenter(18, 3.5);
  props.push({
    id: "counter",
    tex: PropTex.COUNTER,
    x: counter.x,
    y: counter.y,
    solid: true,
    interactable: { prompt: "Grab a bite", range: 26 },
  });

  const fridge = tileCenter(22, 4);
  props.push({ id: "fridge", tex: PropTex.FRIDGE, x: fridge.x, y: fridge.y, solid: true });

  const kitchenSwitch = tileCenter(14.4, 3);
  props.push({
    id: "kitchen_switch",
    tex: PropTex.SWITCH_OFF,
    x: kitchenSwitch.x,
    y: kitchenSwitch.y,
    interactable: { prompt: "Flip light switch", range: 20 },
  });

  const keys = tileCenter(23.4, 5.8);
  props.push({
    id: "keys",
    tex: PropTex.KEYS_HOOK,
    x: keys.x,
    y: keys.y,
    interactable: { prompt: "Grab keys", range: 20 },
  });

  const door = tileCenter(24, 5);
  props.push({
    id: "front_door",
    tex: PropTex.DOOR,
    x: door.x,
    y: door.y,
    interactable: { prompt: "Head outside", range: 22 },
  });

  const car = tileCenter(33, 5.5);
  props.push({
    id: "car",
    tex: PropTex.CAR,
    x: car.x,
    y: car.y,
    solid: true,
    interactable: { prompt: "Get in car", range: 32 },
  });

  return {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    tiles: grid.toArray(),
    props,
    playerStartBedroom: tileCenter(4, 6.3),
    bedCenter: bed,
    windowWorldPos: tileCenter(5, 2),
    bathroomLightPos: rectCenterTile(BATHROOM_RECT),
    kitchenLightPos: rectCenterTile(KITCHEN_RECT),
    carCenter: car,
  };
}
