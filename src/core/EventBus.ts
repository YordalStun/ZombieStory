import Phaser from "phaser";

/**
 * Single global event bus used for all cross-cutting communication:
 * Phaser scenes <-> DOM UI layer, and manager <-> manager.
 * Keeping this as one well-known emitter (instead of scene.events on
 * whichever scene happens to be active) means the DOM layer never needs
 * a reference to a specific Phaser Scene instance.
 */
export const EventBus = new Phaser.Events.EventEmitter();

// Event name constants — avoids typo'd string literals scattered across
// two very different layers (Phaser scenes and plain DOM/TS UI code).
export const Events = {
  // Dialogue (Phaser scene -> DOM)
  DIALOGUE_SHOW: "dialogue:show",
  DIALOGUE_LINE: "dialogue:line",
  DIALOGUE_HIDE: "dialogue:hide",
  // DOM -> Phaser scene (player pressed advance/skip)
  DIALOGUE_ADVANCE_REQUEST: "dialogue:advance-request",

  // HUD (Phaser scene -> DOM)
  OBJECTIVE_SET: "objective:set",
  PROMPT_SHOW: "prompt:show",
  PROMPT_HIDE: "prompt:hide",
  LIGHT_LEVEL: "light:level",

  // Menus (DOM -> Phaser scene / bootstrap)
  MENU_NEW_GAME: "menu:new-game",
  MENU_CONTINUE: "menu:continue",
  MENU_OPEN_SETTINGS: "menu:open-settings",
  MENU_CLOSE_SETTINGS: "menu:close-settings",

  // Settings (DOM -> AudioManager, bidirectional)
  SETTINGS_CHANGED: "settings:changed",

  // Combat (Phaser scene / manager -> DOM)
  WEAPONS_CHANGED: "weapons:changed",
} as const;
