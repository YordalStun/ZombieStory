import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

export const DIRT_TRACK_START_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Alright. On foot from here, then." },
];

export const GARDEN_START_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Round the side. Through the gate, and I'm home." },
];

export const SWING_TUTORIAL_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "If anything comes at me — press F, and swing." },
  { speaker: PLAYER_NAME, text: "Nothing out here to try it on. Good. Let's keep it that way." },
];

export const LIGHT_TUTORIAL_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "That indicator, top right — tells me how lit up I am." },
  { speaker: PLAYER_NAME, text: "Standing in the light, anything out there sees me just as easily. Worth remembering." },
];

export const TRACK_END_LINES: DialogueScript = [{ speaker: PLAYER_NAME, text: "Nearly there. Come on." }];

export const GATE_END_LINES: DialogueScript = [{ speaker: PLAYER_NAME, text: "Here goes." }];
