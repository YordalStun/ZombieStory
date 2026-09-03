import { TileGrid } from "@/core/level/TileGrid";
import { TILE } from "@/gfx/tileset";
import { TILE_SIZE } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import type { PropSpec, LightSpec } from "@/data/levels/apartmentLevel";

export type { PropSpec, LightSpec };

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

/**
 * Danny's parents' house — deliberately a different, bigger building from
 * Danny's own apartment (buildApartmentLevel()), not a re-skin of it. The
 * exterior here is what HomeArrivalScene shows (street approach, door,
 * the first zombie); the two floors below are HouseDefenseScene's actual
 * play space, reached from the ground floor's entry hall.
 */

// ---------------------------------------------------------------------------
// Exterior (HomeArrivalScene)
// ---------------------------------------------------------------------------

export const EXT_WIDTH = 44;
export const EXT_HEIGHT = 26;
export const EXT_HOUSE = { x: 6, y: 3, w: 28, h: 13 };

export interface FamilyHouseExteriorLevel {
  width: number;
  height: number;
  tiles: number[][];
  props: PropSpec[];
  playerStart: { x: number; y: number };
  zombieSpawn: { x: number; y: number };
}

export function buildFamilyHouseExterior(): FamilyHouseExteriorLevel {
  const grid = new TileGrid(EXT_WIDTH, EXT_HEIGHT, -1);
  grid.fillRect(0, 0, EXT_WIDTH, EXT_HEIGHT, TILE.GRASS);

  const H = EXT_HOUSE;
  grid.room(H.x, H.y, H.w, H.h, TILE.WALL_EXT, TILE.FLOOR_WOOD);

  // windows scattered across every wall — a lot more glass than one
  // apartment's worth, reading as a house with a lot more rooms behind it
  for (const wx of [H.x + 3, H.x + 8, H.x + 19, H.x + 24]) grid.set(wx, H.y, TILE.WINDOW_NIGHT);
  for (const wy of [H.y + 3, H.y + 8]) {
    grid.set(H.x, wy, TILE.WINDOW_NIGHT);
    grid.set(H.x + H.w - 1, wy, TILE.WINDOW_NIGHT);
  }
  for (const wx of [H.x + 4, H.x + 10, H.x + 22]) grid.set(wx, H.y + H.h - 1, TILE.WINDOW_NIGHT);

  // front door, centered-ish on the south wall
  const doorCol = H.x + 14;
  grid.doorwayH(H.y + H.h - 1, doorCol - 1, doorCol, TILE.FLOOR_WOOD);

  grid.fillRect(H.x + 10, H.y + H.h, 8, 5, TILE.DRIVEWAY); // porch/path
  grid.fillRect(H.x + 12, H.y + H.h + 5, 4, 6, TILE.DRIVEWAY); // path to the street
  grid.fillRect(0, EXT_HEIGHT - 4, EXT_WIDTH, 4, TILE.DRIVEWAY); // street along the bottom

  const props: PropSpec[] = [];

  const door = tileCenter(doorCol - 0.5, H.y + H.h - 1);
  props.push({
    id: "front_door",
    tex: PropTex.DOOR_WIDE,
    x: door.x,
    y: door.y,
    solid: true,
    fullBody: true,
    interactable: { prompt: "Go inside", range: 26 },
  });

  const porchLight = tileCenter(doorCol - 3, H.y + H.h - 2);
  props.push({
    id: "porch_light",
    tex: PropTex.PORCH_LIGHT,
    x: porchLight.x,
    y: porchLight.y,
    light: { radius: 34, color: 0xffdba0, intensity: 0.6 },
  });

  const bushSpots: Array<[number, number]> = [
    [H.x + 6, H.y + H.h + 1],
    [H.x + 21, H.y + H.h + 1],
    [H.x - 2, H.y + 5],
  ];
  bushSpots.forEach(([bx, by], i) => {
    const p = tileCenter(bx, by);
    props.push({ id: `bush_${i}`, tex: PropTex.BUSH, x: p.x, y: p.y, sway: true });
  });

  const treeSpots: Array<[number, number]> = [
    [2, 4],
    [EXT_WIDTH - 3, 6],
    [EXT_WIDTH - 4, H.y + H.h + 2],
  ];
  treeSpots.forEach(([tx, ty], i) => {
    const p = tileCenter(tx, ty);
    props.push({ id: `tree_${i}`, tex: PropTex.TREE, x: p.x, y: p.y, solid: true, sway: true });
  });

  for (let fx = 1; fx < EXT_WIDTH - 1; fx += 2) {
    if (fx > H.x - 3 && fx < H.x + H.w + 2) continue; // gap for the house itself
    const p = tileCenter(fx + 0.5, EXT_HEIGHT - 6);
    props.push({ id: `fence_${fx}`, tex: PropTex.FENCE_SEGMENT, x: p.x, y: p.y, solid: true });
  }

  const streetLamp = tileCenter(doorCol, EXT_HEIGHT - 3);
  props.push({
    id: "street_lamp",
    tex: PropTex.STREET_LAMP,
    x: streetLamp.x,
    y: streetLamp.y,
    solid: true,
    light: { radius: 55, color: 0xffdba0, intensity: 0.85, flicker: { intensityJitter: 0.06 } },
  });

  return {
    width: EXT_WIDTH,
    height: EXT_HEIGHT,
    tiles: grid.toArray(),
    props,
    playerStart: tileCenter(doorCol, EXT_HEIGHT - 6),
    zombieSpawn: tileCenter(doorCol - 4, H.y + H.h + 2),
  };
}

// ---------------------------------------------------------------------------
// Interior floors (HouseDefenseScene)
// ---------------------------------------------------------------------------

export type SwitchId = "living_room" | "kitchen" | "bedroom_a" | "bedroom_b";
export type FamilyMemberId = "mum" | "dad" | "sister" | "brother";

export interface SwitchSpec {
  id: SwitchId;
  familyMemberId: FamilyMemberId;
  x: number;
  y: number;
  lightId: string;
  /** Ceiling-light position for this room — HouseDefenseScene registers a light here, not on the switch prop itself, matching apartmentLevel's bathroomLightPos/kitchenLightPos convention. */
  lightX: number;
  lightY: number;
  /** Doorway-side point inside the room, just off the connecting hall/landing — the family member walks in here, over to the switch, then back out here and vanishes. Straight-line to/from the switch, both being inside the same convex room. */
  spawnX: number;
  spawnY: number;
}

export interface EntrySpec {
  id: string;
  x: number;
  y: number;
}

export interface FloorLevel {
  width: number;
  height: number;
  tiles: number[][];
  props: PropSpec[];
  switches: SwitchSpec[];
  /** Where zombies force their way in — broken windows/doors, on this floor. */
  breachPoints: EntrySpec[];
  stairsAt: { x: number; y: number };
  entryAt: { x: number; y: number };
  ambientLevel: number;
}

const GROUND_W = 34;
const GROUND_H = 22;

export function buildFamilyHouseGroundFloor(): FloorLevel {
  const grid = new TileGrid(GROUND_W, GROUND_H, -1);
  grid.fillRect(0, 0, GROUND_W, GROUND_H, TILE.WALL_EXT);

  // Adjacent rooms share their border wall tile exactly (e.g. HALL.x sits
  // right on LIVING's own right-wall column) rather than each drawing an
  // independent wall with an uncarved gap tile between — that gap used to
  // leave a 3-tile-thick (48px) wall between every pair of rooms, taller
  // than Danny's own sprite. Every doorway cut, window, and interior prop
  // below is already expressed relative to these rects, so closing the
  // gaps here is enough on its own.
  const HALL = { x: 12, y: 2, w: 6, h: 18 };
  const LIVING = { x: 2, y: 2, w: 11, h: 9 };
  const KITCHEN = { x: 2, y: 10, w: 11, h: 8 };
  const DINING = { x: 17, y: 2, w: 11, h: 9 };
  const STUDY = { x: 17, y: 10, w: 11, h: 8 };

  grid.room(HALL.x, HALL.y, HALL.w, HALL.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(LIVING.x, LIVING.y, LIVING.w, LIVING.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(KITCHEN.x, KITCHEN.y, KITCHEN.w, KITCHEN.h, TILE.WALL, TILE.FLOOR_TILE);
  grid.room(DINING.x, DINING.y, DINING.w, DINING.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(STUDY.x, STUDY.y, STUDY.w, STUDY.h, TILE.WALL, TILE.FLOOR_WOOD);

  grid.doorwayH(LIVING.y + 4, LIVING.x + LIVING.w - 1, HALL.x + 1, TILE.FLOOR_WOOD);
  grid.doorwayH(KITCHEN.y + 4, KITCHEN.x + KITCHEN.w - 1, HALL.x + 1, TILE.FLOOR_TILE);
  grid.doorwayH(DINING.y + 4, HALL.x + HALL.w - 1, DINING.x + 1, TILE.FLOOR_WOOD);
  grid.doorwayH(STUDY.y + 4, HALL.x + HALL.w - 1, STUDY.x + 1, TILE.FLOOR_WOOD);
  grid.doorwayV(HALL.x + 3, 0, HALL.y + 1, TILE.FLOOR_WOOD); // front door, at the top of the hall

  grid.set(3, LIVING.y, TILE.WINDOW_NIGHT);
  grid.set(3, KITCHEN.y + KITCHEN.h - 1, TILE.WINDOW_NIGHT);
  grid.set(DINING.x + DINING.w - 1, DINING.y, TILE.WINDOW_NIGHT);
  grid.set(STUDY.x + STUDY.w - 1, STUDY.y + STUDY.h - 1, TILE.WINDOW_NIGHT);

  const props: PropSpec[] = [];

  const frontDoor = tileCenter(HALL.x + 3, 0.5);
  props.push({ id: "entry_door", tex: PropTex.DOOR, x: frontDoor.x, y: frontDoor.y, solid: true, fullBody: true });

  const stairs = tileCenter(HALL.x + 3, HALL.y + HALL.h - 2);
  props.push({
    id: "stairs_up",
    tex: PropTex.STAIRS,
    x: stairs.x,
    y: stairs.y,
    interactable: { prompt: "Go upstairs", range: 28 },
  });

  const sofa = tileCenter(LIVING.x + 3, LIVING.y + 6);
  props.push({ id: "sofa", tex: PropTex.BED, x: sofa.x, y: sofa.y, solid: true, tint: 0x5a7a8a });
  const livingTv = tileCenter(LIVING.x + 8, LIVING.y + 2.5);
  props.push({ id: "living_tv", tex: PropTex.TV_OFF, x: livingTv.x, y: livingTv.y, solid: true });
  const livingRug = tileCenter(LIVING.x + 4, LIVING.y + 4.5);
  props.push({ id: "living_rug", tex: PropTex.RUG, x: livingRug.x, y: livingRug.y, floorDecal: true });
  const livingSwitch = tileCenter(LIVING.x + LIVING.w - 2, LIVING.y + 1.3);
  const livingLight = tileCenter(LIVING.x + LIVING.w / 2, LIVING.y + LIVING.h / 2);
  const livingDoorway = tileCenter(LIVING.x + LIVING.w - 2, LIVING.y + 4);

  const counter = tileCenter(KITCHEN.x + 2, KITCHEN.y + 1.5);
  props.push({ id: "kitchen_counter", tex: PropTex.COUNTER, x: counter.x, y: counter.y, solid: true });
  const fridge = tileCenter(KITCHEN.x + 1.2, KITCHEN.y + 4);
  props.push({ id: "fridge", tex: PropTex.FRIDGE, x: fridge.x, y: fridge.y, solid: true });
  const kitchenTable = tileCenter(KITCHEN.x + 7, KITCHEN.y + 5);
  props.push({ id: "kitchen_table", tex: PropTex.COUNTER, x: kitchenTable.x, y: kitchenTable.y, solid: true, tint: 0x8a7050 });
  const knife = tileCenter(KITCHEN.x + 2, KITCHEN.y + 1.3);
  props.push({ id: "pickup_knife", tex: PropTex.KNIFE, x: knife.x, y: knife.y, interactable: { prompt: "Take knife", range: 20 } });
  const fryingPan = tileCenter(KITCHEN.x + 7.5, KITCHEN.y + 2.2);
  props.push({ id: "pickup_frying_pan", tex: PropTex.FRYING_PAN, x: fryingPan.x, y: fryingPan.y, interactable: { prompt: "Take frying pan", range: 20 } });
  const kitchenSwitch = tileCenter(KITCHEN.x + KITCHEN.w - 2, KITCHEN.y + KITCHEN.h - 2);
  const kitchenLight = tileCenter(KITCHEN.x + KITCHEN.w / 2, KITCHEN.y + KITCHEN.h / 2);
  const kitchenDoorway = tileCenter(KITCHEN.x + KITCHEN.w - 2, KITCHEN.y + 4);

  const diningTable = tileCenter(DINING.x + 5, DINING.y + 4.5);
  props.push({ id: "dining_table", tex: PropTex.COUNTER, x: diningTable.x, y: diningTable.y, solid: true, tint: 0x8a6a4f });
  const fruitBowl = tileCenter(DINING.x + 5, DINING.y + 3.8);
  props.push({ id: "fruit_bowl", tex: PropTex.FRUIT_BOWL, x: fruitBowl.x, y: fruitBowl.y });

  const studyDesk = tileCenter(STUDY.x + 2, STUDY.y + 1.5);
  props.push({ id: "study_desk", tex: PropTex.DESK, x: studyDesk.x, y: studyDesk.y, solid: true });
  const crowbar = tileCenter(STUDY.x + 8, STUDY.y + 5.5);
  props.push({ id: "pickup_crowbar", tex: PropTex.CROWBAR, x: crowbar.x, y: crowbar.y, interactable: { prompt: "Take crowbar", range: 20 } });

  return {
    width: GROUND_W,
    height: GROUND_H,
    tiles: grid.toArray(),
    props,
    switches: [
      {
        id: "living_room",
        familyMemberId: "mum",
        x: livingSwitch.x,
        y: livingSwitch.y,
        lightId: "living_room_light",
        lightX: livingLight.x,
        lightY: livingLight.y,
        spawnX: livingDoorway.x,
        spawnY: livingDoorway.y,
      },
      {
        id: "kitchen",
        familyMemberId: "dad",
        x: kitchenSwitch.x,
        y: kitchenSwitch.y,
        lightId: "kitchen_light",
        lightX: kitchenLight.x,
        lightY: kitchenLight.y,
        spawnX: kitchenDoorway.x,
        spawnY: kitchenDoorway.y,
      },
    ],
    breachPoints: [
      { id: "living_window", x: tileCenter(3, LIVING.y).x, y: tileCenter(3, LIVING.y).y },
      { id: "kitchen_window", x: tileCenter(3, KITCHEN.y + KITCHEN.h - 1).x, y: tileCenter(3, KITCHEN.y + KITCHEN.h - 1).y },
      { id: "dining_window", x: tileCenter(DINING.x + DINING.w - 1, DINING.y).x, y: tileCenter(DINING.x + DINING.w - 1, DINING.y).y },
      { id: "study_window", x: tileCenter(STUDY.x + STUDY.w - 1, STUDY.y + STUDY.h - 1).x, y: tileCenter(STUDY.x + STUDY.w - 1, STUDY.y + STUDY.h - 1).y },
    ],
    stairsAt: stairs,
    entryAt: tileCenter(HALL.x + 3, 1.5),
    // Deliberately below AGGRO_LIGHT_THRESHOLD (0.32, see Zombie.ts) on its
    // own — a room's own light is what has to push Danny's spot over that
    // line, so flipping a switch off is a real, felt change rather than
    // ambient light alone always reading as "lit" everywhere.
    ambientLevel: 0.15,
  };
}

const UPPER_W = 30;
const UPPER_H = 18;

export function buildFamilyHouseUpperFloor(): FloorLevel {
  const grid = new TileGrid(UPPER_W, UPPER_H, -1);
  grid.fillRect(0, 0, UPPER_W, UPPER_H, TILE.WALL_EXT);

  // Same shared-wall fix as the ground floor — see the comment there.
  const LANDING = { x: 10, y: 2, w: 6, h: 14 };
  const BED_A = { x: 2, y: 2, w: 9, h: 8 };
  const BED_B = { x: 15, y: 2, w: 9, h: 8 };
  const BATH = { x: 2, y: 9, w: 8, h: 5 };

  grid.room(LANDING.x, LANDING.y, LANDING.w, LANDING.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(BED_A.x, BED_A.y, BED_A.w, BED_A.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(BED_B.x, BED_B.y, BED_B.w, BED_B.h, TILE.WALL, TILE.FLOOR_WOOD);
  grid.room(BATH.x, BATH.y, BATH.w, BATH.h, TILE.WALL, TILE.FLOOR_TILE);

  grid.doorwayH(BED_A.y + 4, BED_A.x + BED_A.w - 1, LANDING.x + 1, TILE.FLOOR_WOOD);
  grid.doorwayH(BED_B.y + 4, LANDING.x + LANDING.w - 1, BED_B.x + 1, TILE.FLOOR_WOOD);
  grid.doorwayH(BATH.y + 2, BATH.x + BATH.w - 1, LANDING.x + 1, TILE.FLOOR_TILE);

  grid.set(2, BED_A.y + 3, TILE.WINDOW_NIGHT);
  grid.set(BED_B.x + BED_B.w - 1, BED_B.y + 3, TILE.WINDOW_NIGHT);

  const props: PropSpec[] = [];

  const stairs = tileCenter(LANDING.x + 3, LANDING.y + LANDING.h - 2);
  props.push({
    id: "stairs_down",
    tex: PropTex.STAIRS,
    x: stairs.x,
    y: stairs.y,
    interactable: { prompt: "Go downstairs", range: 28 },
  });

  const bedA = tileCenter(BED_A.x + 2.5, BED_A.y + 3);
  props.push({ id: "bed_a", tex: PropTex.BED, x: bedA.x, y: bedA.y, solid: true });
  const deskA = tileCenter(BED_A.x + 6.5, BED_A.y + 1.5);
  props.push({ id: "desk_a", tex: PropTex.DESK, x: deskA.x, y: deskA.y, solid: true });
  const switchA = tileCenter(BED_A.x + BED_A.w - 2, BED_A.y + BED_A.h - 2);
  const bedALight = tileCenter(BED_A.x + BED_A.w / 2, BED_A.y + BED_A.h / 2);
  const bedADoorway = tileCenter(BED_A.x + BED_A.w - 2, BED_A.y + 4);

  const bedB = tileCenter(BED_B.x + 2.5, BED_B.y + 3);
  props.push({ id: "bed_b", tex: PropTex.BED, x: bedB.x, y: bedB.y, solid: true, tint: 0x8a5a6a });
  const fryingPokerSpot = tileCenter(BED_B.x + 6.5, BED_B.y + 5.5);
  props.push({ id: "pickup_fire_poker", tex: PropTex.FIRE_POKER, x: fryingPokerSpot.x, y: fryingPokerSpot.y, interactable: { prompt: "Take fire poker", range: 20 } });
  const switchB = tileCenter(BED_B.x + 2, BED_B.y + BED_B.h - 2);
  const bedBLight = tileCenter(BED_B.x + BED_B.w / 2, BED_B.y + BED_B.h / 2);
  const bedBDoorway = tileCenter(BED_B.x + 2, BED_B.y + 4);

  const toilet = tileCenter(BATH.x + 2, BATH.y + 2.5);
  props.push({ id: "bath_toilet", tex: PropTex.TOILET, x: toilet.x, y: toilet.y, solid: true });
  const bathtub = tileCenter(BATH.x + 5.5, BATH.y + 2.5);
  props.push({ id: "bath_tub", tex: PropTex.BATHTUB, x: bathtub.x, y: bathtub.y, solid: true });

  return {
    width: UPPER_W,
    height: UPPER_H,
    tiles: grid.toArray(),
    props,
    switches: [
      {
        id: "bedroom_a",
        familyMemberId: "sister",
        x: switchA.x,
        y: switchA.y,
        lightId: "bedroom_a_light",
        lightX: bedALight.x,
        lightY: bedALight.y,
        spawnX: bedADoorway.x,
        spawnY: bedADoorway.y,
      },
      {
        id: "bedroom_b",
        familyMemberId: "brother",
        x: switchB.x,
        y: switchB.y,
        lightId: "bedroom_b_light",
        lightX: bedBLight.x,
        lightY: bedBLight.y,
        spawnX: bedBDoorway.x,
        spawnY: bedBDoorway.y,
      },
    ],
    // Zombies only ever breach at ground level (see HouseDefenseScene's
    // updateSpawning) — there's no plausible way for one to reach an
    // upstairs window, so this floor deliberately has none.
    breachPoints: [],
    stairsAt: stairs,
    entryAt: stairs,
    ambientLevel: 0.15,
  };
}
