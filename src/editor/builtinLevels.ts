import { buildApartmentLevel } from "@/data/levels/apartmentLevel";
import { buildOfficeLevel } from "@/data/levels/officeLevel";
import { buildCombatTutorialLevel, type CombatTutorialVariant } from "@/data/levels/combatTutorialLevel";
import { buildLeaveBuildingLevel, type LeaveBuildingVariant } from "@/data/levels/leaveBuildingLevel";
import {
  buildFamilyHouseExterior,
  buildFamilyHouseGroundFloor,
  buildFamilyHouseUpperFloor,
  type FloorLevel,
} from "@/data/levels/familyHouseLevel";
import type { EditorLevelData, EditorSwitchSpec } from "@/editor/types";

/**
 * Adapters from the real game's level-builder functions into the editor's
 * own generic format, purely for "open this to look at it / use it as a
 * starting point" — this reads the game's real level data (so it never
 * drifts out of sync as the game changes) but never writes back to it.
 * Loading one of these just seeds the editor's own in-memory working
 * state; nothing here touches game save files or game source.
 */
export interface BuiltinLevelOption {
  id: string;
  label: string;
  load: () => EditorLevelData;
}

export const BUILTIN_LEVELS: BuiltinLevelOption[] = [
  {
    id: "apartment",
    label: "Apartment",
    load: () => {
      const lvl = buildApartmentLevel();
      return {
        formatVersion: 1,
        meta: { name: "apartment", notes: "Imported from the game's built-in Apartment level (reference only)." },
        width: lvl.width,
        height: lvl.height,
        tiles: lvl.tiles,
        props: lvl.props,
        playerStart: lvl.playerStartBedroom,
        endPoint: null,
        zombieSpawn: null,
        switches: [],
        breachPoints: [],
        ambientLevel: 1,
        objectives: { title: "", steps: [] },
      };
    },
  },
  {
    id: "office",
    label: "Office",
    load: () => {
      const lvl = buildOfficeLevel();
      return {
        formatVersion: 1,
        meta: { name: "office", notes: "Imported from the game's built-in Office level (reference only). Coworkers are not editable here — they render as ordinary props." },
        width: lvl.width,
        height: lvl.height,
        tiles: lvl.tiles,
        props: [
          ...lvl.props,
          ...lvl.coworkers.map((c) => ({ id: c.id, tex: c.tex, x: c.x, y: c.y, flipX: c.flip })),
        ],
        playerStart: lvl.playerStart,
        endPoint: null,
        zombieSpawn: null,
        switches: [],
        breachPoints: [],
        ambientLevel: 1,
        objectives: { title: "", steps: [] },
      };
    },
  },
  ...(["dirtTrack", "garden"] as CombatTutorialVariant[]).map((variant) => ({
    id: `combat_${variant}`,
    label: `Combat Tutorial — ${variant === "dirtTrack" ? "Dirt Track" : "Garden"}`,
    load: (): EditorLevelData => {
      const lvl = buildCombatTutorialLevel(variant);
      return {
        formatVersion: 1,
        meta: { name: `combat_tutorial_${variant}`, notes: "Imported from the game's built-in Combat Tutorial level (reference only)." },
        width: lvl.width,
        height: lvl.height,
        tiles: lvl.tiles,
        props: lvl.props,
        playerStart: lvl.playerStart,
        endPoint: lvl.endPoint,
        zombieSpawn: null,
        switches: [],
        breachPoints: [],
        ambientLevel: lvl.ambientLevel,
        objectives: { title: "", steps: [] },
      };
    },
  })),
  ...(["carpark", "forecourt"] as LeaveBuildingVariant[]).map((variant) => ({
    id: `leave_${variant}`,
    label: `Leave Building — ${variant === "carpark" ? "Car Park" : "Forecourt"}`,
    load: (): EditorLevelData => {
      const lvl = buildLeaveBuildingLevel(variant);
      return {
        formatVersion: 1,
        meta: { name: `leave_building_${variant}`, notes: "Imported from the game's built-in Leave Building level (reference only). NPCs are not editable here — they render as ordinary props." },
        width: lvl.width,
        height: lvl.height,
        tiles: lvl.tiles,
        props: [
          ...lvl.props,
          ...lvl.npcs.map((c) => ({ id: c.id, tex: c.tex, x: c.x, y: c.y, flipX: c.flip })),
        ],
        playerStart: lvl.playerStart,
        endPoint: null,
        zombieSpawn: lvl.zombieSpawn,
        switches: [],
        breachPoints: [],
        ambientLevel: lvl.ambientLevel,
        objectives: { title: "", steps: [] },
      };
    },
  })),
  {
    id: "family_house_exterior",
    label: "Family House — Exterior",
    load: () => {
      const lvl = buildFamilyHouseExterior();
      return {
        formatVersion: 1,
        meta: { name: "family_house_exterior", notes: "Imported from the game's built-in Family House exterior (HomeArrivalScene, reference only)." },
        width: lvl.width,
        height: lvl.height,
        tiles: lvl.tiles,
        props: lvl.props,
        playerStart: lvl.playerStart,
        endPoint: null,
        zombieSpawn: lvl.zombieSpawn,
        switches: [],
        breachPoints: [],
        ambientLevel: 1,
        objectives: { title: "", steps: [] },
      };
    },
  },
  ...(
    [
      ["family_house_ground", "Family House — Ground Floor", buildFamilyHouseGroundFloor],
      ["family_house_upper", "Family House — Upper Floor", buildFamilyHouseUpperFloor],
    ] as const
  ).map(([id, label, build]) => ({
    id,
    label,
    load: (): EditorLevelData => {
      const lvl: FloorLevel = build();
      return {
        formatVersion: 1,
        meta: {
          name: id,
          notes:
            "Imported from the game's built-in House Defense floor (reference only). Player start is this floor's entryAt (where you land arriving here); end point is stairsAt (the stairs prop's own position, not where you land using them — see useStairs() in HouseDefenseScene.ts).",
        },
        width: lvl.width,
        height: lvl.height,
        tiles: lvl.tiles,
        props: lvl.props,
        playerStart: lvl.entryAt,
        endPoint: lvl.stairsAt,
        zombieSpawn: null,
        switches: lvl.switches as EditorSwitchSpec[],
        breachPoints: lvl.breachPoints,
        ambientLevel: lvl.ambientLevel,
        objectives: { title: "", steps: [] },
      };
    },
  })),
];
