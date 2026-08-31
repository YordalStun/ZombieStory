import { TileGrid } from "@/core/level/TileGrid";
import { TILE } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";
import { PropTex } from "@/gfx/props";

export const LEVEL_WIDTH = 46;
export const LEVEL_HEIGHT = 22;

export interface LightSpec {
  radius: number;
  color: number;
  intensity: number;
  flicker?: { intensityJitter: number; radiusJitter?: number };
  colorCycle?: { colors: number[]; periodMs: number };
}

export interface PropSpec {
  id: string;
  tex: string;
  x: number;
  y: number;
  solid?: boolean;
  interactable?: { prompt: string; range: number };
  light?: LightSpec;
  /** Flat floor coverings (rugs, mats) render at a fixed low depth instead
   *  of being y-sorted — a rug has no height, so it must never draw over
   *  furniture just because it happens to sit further "south" on screen. */
  floorDecal?: boolean;
  /** Sways gently — for trees/bushes catching the wind. */
  sway?: boolean;
  /** Recolors a shared texture (e.g. reusing the rug sprite for different mats around the house). */
  tint?: number;
  /** Overrides the default bottom-anchored footprint body — for props like
   *  a doorway panel where the whole sprite should block, not just a thin
   *  strip at its base. */
  fullBody?: boolean;
}

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

// Room outer rects (tile coords) — exported so the scene can derive room
// centers (e.g. for ceiling light placement) without re-deriving magic numbers.
export const BEDROOM_RECT = { x: 2, y: 2, w: 8, h: 7 };
export const BATHROOM_RECT = { x: 9, y: 2, w: 6, h: 7 };
export const KITCHEN_RECT = { x: 14, y: 2, w: 11, h: 7 };
// A hallway below all three rooms is the only through-route between them —
// bedroom and kitchen connect to each other via this hallway, and the
// bathroom is a side room off it, not something you have to cut through.
export const HALLWAY_RECT = { x: 2, y: 8, w: 23, h: 5 };

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
  kitchenWindowWorldPos: { x: number; y: number };
  bathroomLightPos: { x: number; y: number };
  kitchenLightPos: { x: number; y: number };
  carCenter: { x: number; y: number };
  dogBedWorldPos: { x: number; y: number };
  /** World x where the kitchen's exterior wall is — used to tell indoor from outdoor for weather volume/particles. */
  outsideThresholdX: number;
}

export function buildApartmentLevel(): ApartmentLevel {
  const grid = new TileGrid(LEVEL_WIDTH, LEVEL_HEIGHT, -1);

  // grass base layer under everything, so the house's walls/floors overwrite
  // it cleanly and nothing outside the building footprint renders as void
  grid.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT, TILE.GRASS);

  grid.room(BEDROOM_RECT.x, BEDROOM_RECT.y, BEDROOM_RECT.w, BEDROOM_RECT.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(BATHROOM_RECT.x, BATHROOM_RECT.y, BATHROOM_RECT.w, BATHROOM_RECT.h, TILE.WALL, TILE.FLOOR_TILE);
  grid.room(KITCHEN_RECT.x, KITCHEN_RECT.y, KITCHEN_RECT.w, KITCHEN_RECT.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(HALLWAY_RECT.x, HALLWAY_RECT.y, HALLWAY_RECT.w, HALLWAY_RECT.h, TILE.WALL, TILE.FLOOR_WOOD);

  // each room drops into the hallway from its south wall — this is the
  // only route between rooms, so reaching the kitchen never requires
  // cutting through the bathroom
  grid.doorwayH(8, 5, 6, TILE.FLOOR_WOOD); // bedroom -> hallway
  grid.doorwayH(8, 11, 12, TILE.FLOOR_TILE); // bathroom -> hallway
  grid.doorwayH(8, 18, 19, TILE.FLOOR_WOOD); // kitchen -> hallway
  grid.doorwayV(24, 5, 6, TILE.FLOOR_WOOD); // front door gap, kitchen -> driveway (2 tiles wide — a 1-tile gap leaves almost no margin around the player's collision box)

  grid.set(5, 2, TILE.WINDOW_NIGHT);
  grid.set(24, 3, TILE.WINDOW_DAY); // kitchen window, above the kitchen sink, facing the driveway — always daytime glass, this level never shows it at night

  // starts at column 25, OUTSIDE the kitchen's east wall (column 24) — starting
  // it at 24 painted walkable driveway over the wall at row 4, leaving an
  // unblocked hole beside the door that let the player skip the whole routine
  grid.fillRect(25, 4, 15, 3, TILE.DRIVEWAY);
  grid.fillRect(30, 2, 10, 11, TILE.DRIVEWAY);

  const props: PropSpec[] = [];
  const bed = tileCenter(4, 4.5);
  const tv = tileCenter(8, 4.5); // east wall, directly across the room from the bed

  props.push({ id: "bed", tex: PropTex.BED, x: bed.x, y: bed.y, solid: true });

  props.push({
    id: "tv",
    tex: PropTex.TV_ON,
    x: tv.x,
    y: tv.y,
    solid: true,
    interactable: { prompt: "Turn off TV", range: 26 },
    light: {
      // radius/intensity sized so the glow clearly reaches the bed ~64px away
      radius: 92,
      color: 0xaeeaff,
      intensity: 1.6,
      flicker: { intensityJitter: 0.22, radiusJitter: 0.08 },
    },
  });

  const clock = tileCenter(5, 3.3);
  props.push({
    id: "alarm_clock",
    tex: PropTex.ALARM_CLOCK,
    x: clock.x,
    y: clock.y,
    light: { radius: 16, color: 0xff5a5a, intensity: 0.4 },
  });

  const picture = tileCenter(3.3, 3);
  props.push({
    id: "picture",
    tex: PropTex.PICTURE_FRAME,
    x: picture.x,
    y: picture.y,
    interactable: { prompt: "Look at picture", range: 20 },
  });

  const dresser = tileCenter(6.3, 3.2);
  props.push({
    id: "dresser",
    tex: PropTex.DRESSER,
    x: dresser.x,
    y: dresser.y,
    solid: true,
    interactable: { prompt: "Get dressed", range: 24 },
  });

  // desk's back edge sits flush against the south wall, cord running into it;
  // the chair tucks in on the room-facing (front) side
  const desk = tileCenter(7.5, 7.4);
  props.push({
    id: "desk",
    tex: PropTex.DESK,
    x: desk.x,
    y: desk.y,
    solid: true,
    interactable: { prompt: "Check computer", range: 26 },
    light: { radius: 20, color: 0x6ab0d0, intensity: 0.4 },
  });

  const chair = tileCenter(7.5, 6.5);
  props.push({ id: "chair", tex: PropTex.CHAIR, x: chair.x, y: chair.y });

  const lavaLamp = tileCenter(7, 7.3); // sits on the desk, clear of the monitor
  props.push({
    id: "lava_lamp",
    tex: PropTex.LAVA_LAMP_ON,
    x: lavaLamp.x,
    y: lavaLamp.y,
    interactable: { prompt: "Turn off lava lamp", range: 22 },
    light: {
      radius: 34,
      color: 0xff5050,
      intensity: 0.9,
      colorCycle: {
        colors: [0xff5050, 0xff9040, 0xd050ff, 0x6a50ff, 0x50a0ff, 0x50e0a0],
        periodMs: 14000,
      },
    },
  });

  const rug = tileCenter(4.3, 6.5);
  props.push({ id: "rug", tex: PropTex.RUG, x: rug.x, y: rug.y, floorDecal: true });

  const sink = tileCenter(10.6, 3.4);
  props.push({
    id: "sink",
    tex: PropTex.SINK,
    x: sink.x,
    y: sink.y,
    solid: true,
    interactable: { prompt: "Wash up", range: 22 },
  });

  const mirror = tileCenter(10.6, 3);
  props.push({ id: "mirror", tex: PropTex.MIRROR, x: mirror.x, y: mirror.y });

  const toilet = tileCenter(13, 3.5);
  props.push({ id: "toilet", tex: PropTex.TOILET, x: toilet.x, y: toilet.y, solid: true });

  const bathtub = tileCenter(10.6, 6);
  props.push({
    id: "bathtub",
    tex: PropTex.BATHTUB,
    x: bathtub.x,
    y: bathtub.y,
    solid: true,
    interactable: { prompt: "Turn off shower", range: 22 },
  });

  const bathMat = tileCenter(12.2, 6.3);
  props.push({ id: "bath_mat", tex: PropTex.RUG, x: bathMat.x, y: bathMat.y, floorDecal: true, tint: 0x5a8fae });

  const bathSwitch = tileCenter(12.6, 6.9);
  props.push({
    id: "bathroom_switch",
    tex: PropTex.SWITCH_OFF,
    x: bathSwitch.x,
    y: bathSwitch.y,
    interactable: { prompt: "Flip light switch", range: 20 },
  });

  // counter run leading to the sink, which sits right under the window
  const counter = tileCenter(17.5, 3.4);
  props.push({
    id: "counter",
    tex: PropTex.COUNTER,
    x: counter.x,
    y: counter.y,
    solid: true,
    interactable: { prompt: "Grab a bite", range: 26 },
  });

  const kitchenSink = tileCenter(21.5, 3.4);
  props.push({ id: "kitchen_sink", tex: PropTex.SINK, x: kitchenSink.x, y: kitchenSink.y, solid: true });

  const fridge = tileCenter(15.5, 4);
  props.push({ id: "fridge", tex: PropTex.FRIDGE, x: fridge.x, y: fridge.y, solid: true });

  const kettle = tileCenter(17, 3.1);
  props.push({ id: "kettle", tex: PropTex.KETTLE, x: kettle.x, y: kettle.y });

  const fruitBowl = tileCenter(18.5, 3.1);
  props.push({ id: "fruit_bowl", tex: PropTex.FRUIT_BOWL, x: fruitBowl.x, y: fruitBowl.y });

  const kitchenMat = tileCenter(19.5, 5.6);
  props.push({ id: "kitchen_mat", tex: PropTex.RUG, x: kitchenMat.x, y: kitchenMat.y, floorDecal: true, tint: 0xb0a058 });

  const kitchenSwitch = tileCenter(18.4, 6.9);
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

  const door = tileCenter(24, 5.5);
  props.push({
    id: "front_door",
    tex: PropTex.DOOR,
    x: door.x,
    y: door.y,
    solid: true,
    fullBody: true,
    interactable: { prompt: "Head outside", range: 26 },
  });

  const entryMat = tileCenter(24.9, 5);
  props.push({ id: "entry_mat", tex: PropTex.RUG, x: entryMat.x, y: entryMat.y, floorDecal: true, tint: 0x8a7050 });

  const porchLight = tileCenter(24.6, 3.8);
  props.push({
    id: "porch_light",
    tex: PropTex.PORCH_LIGHT,
    x: porchLight.x,
    y: porchLight.y,
    light: { radius: 30, color: 0xffdba0, intensity: 0.55 },
  });

  const kitchenWindowGlow = tileCenter(24.7, 3);
  props.push({
    id: "kitchen_window_glow",
    tex: PropTex.PORCH_LIGHT,
    x: kitchenWindowGlow.x,
    y: kitchenWindowGlow.y,
    light: { radius: 30, color: 0xfff1d0, intensity: 0.7 },
  });

  const car = tileCenter(34, 7);
  props.push({
    id: "car",
    tex: PropTex.CAR,
    x: car.x,
    y: car.y,
    solid: true,
    interactable: { prompt: "Get in car", range: 32 },
  });

  const streetLamp1 = tileCenter(31, 3);
  props.push({
    id: "street_lamp_1",
    tex: PropTex.STREET_LAMP,
    x: streetLamp1.x,
    y: streetLamp1.y,
    solid: true,
    light: { radius: 60, color: 0xffdba0, intensity: 0.9, flicker: { intensityJitter: 0.06 } },
  });

  const streetLamp2 = tileCenter(38, 11);
  props.push({
    id: "street_lamp_2",
    tex: PropTex.STREET_LAMP,
    x: streetLamp2.x,
    y: streetLamp2.y,
    solid: true,
    light: { radius: 60, color: 0xffdba0, intensity: 0.9, flicker: { intensityJitter: 0.06 } },
  });

  const trees: Array<[number, number]> = [
    [26, 15],
    [42, 4],
    [43, 15],
  ];
  trees.forEach(([tx, ty], i) => {
    const p = tileCenter(tx, ty);
    props.push({ id: `tree_${i}`, tex: PropTex.TREE, x: p.x, y: p.y, solid: true, sway: true });
  });

  const bushes: Array<[number, number]> = [
    [25, 10],
    [27, 16],
    [39, 3],
  ];
  bushes.forEach(([bx, by], i) => {
    const p = tileCenter(bx, by);
    props.push({ id: `bush_${i}`, tex: PropTex.BUSH, x: p.x, y: p.y, sway: true });
  });

  for (let fx = 24; fx < 44; fx += 2) {
    const p = tileCenter(fx + 1, 18);
    props.push({ id: `fence_${fx}`, tex: PropTex.FENCE_SEGMENT, x: p.x, y: p.y, solid: true });
  }

  const neighborRoof = tileCenter(40, 21);
  props.push({ id: "neighbor_roof", tex: PropTex.NEIGHBOR_ROOF, x: neighborRoof.x, y: neighborRoof.y });

  const dogBed = tileCenter(16, 6.5);
  props.push({ id: "dog_bed", tex: PropTex.DOG_BED, x: dogBed.x, y: dogBed.y, floorDecal: true });

  return {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    tiles: grid.toArray(),
    props,
    playerStartBedroom: tileCenter(5.3, 6.2),
    bedCenter: bed,
    windowWorldPos: tileCenter(5, 2),
    kitchenWindowWorldPos: tileCenter(24, 3),
    bathroomLightPos: rectCenterTile(BATHROOM_RECT),
    kitchenLightPos: rectCenterTile(KITCHEN_RECT),
    carCenter: car,
    dogBedWorldPos: dogBed,
    outsideThresholdX: (KITCHEN_RECT.x + KITCHEN_RECT.w) * TILE_SIZE,
  };
}
