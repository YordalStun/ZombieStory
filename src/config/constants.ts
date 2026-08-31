// Internal render resolution. The canvas is scaled up (pixel-perfect,
// nearest-neighbor) to fill the browser window — see main.ts Scale config.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const TILE_SIZE = 16;

// Protagonist's name. Referenced anywhere his line of dialogue needs a
// speaker label. Change it here and it updates everywhere.
export const PLAYER_NAME = "Danny";

// Render order (Phaser GameObject depth). Keep every scene's z-ordering
// derived from this table instead of magic numbers scattered in code.
// Floor/decals/walls use fixed depths; actors and solid props use
// ACTOR_SORT_BASE + their world Y so they naturally sort against each
// other (a "wall" tile is flat and short in this top-down view, so it
// never needs to out-sort the player — it always renders underneath).
export const DEPTH = {
  FLOOR: 0,
  FLOOR_DECAL: 1,
  WALL: 5,
  ACTOR_SORT_BASE: 50,
  WEATHER: 5000,
  OVERLAY_DARKNESS: 900,
} as const;

export const SAVE_KEYS = {
  SETTINGS: "zombiestory:settings",
  PROGRESS: "zombiestory:save",
} as const;

export const STORY_FLAGS = {
  DRESSED: "dressed",
  WASHED_UP: "washedUp",
  ATE: "ate",
  GRABBED_KEYS: "grabbedKeys",
  ENTERED_CAR: "enteredCar",
} as const;

export type Checkpoint = "NIGHT_CUTSCENE" | "MORNING_ROUTINE" | "MOTORWAY";

export const CHECKPOINTS: Record<Checkpoint, Checkpoint> = {
  NIGHT_CUTSCENE: "NIGHT_CUTSCENE",
  MORNING_ROUTINE: "MORNING_ROUTINE",
  MOTORWAY: "MOTORWAY",
};
