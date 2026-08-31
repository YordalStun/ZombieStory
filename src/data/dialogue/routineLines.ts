import { PLAYER_NAME } from "@/config/constants";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";

export const WAKE_UP_LINE: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...Still on. Guess nobody slept well tonight." },
];

export const DRESSER_LINES = {
  first: [{ speaker: PLAYER_NAME, text: "Work clothes. Let's get this over with." }] as DialogueScript,
  repeat: [{ speaker: PLAYER_NAME, text: "Already dressed. Not doing that twice." }] as DialogueScript,
};

export const SINK_LINES = {
  first: [{ speaker: PLAYER_NAME, text: "Cold water. Wakes you up faster than coffee ever does." }] as DialogueScript,
  repeat: [{ speaker: PLAYER_NAME, text: "I'm awake, I'm awake." }] as DialogueScript,
};

export const KITCHEN_LINES = {
  first: [{ speaker: PLAYER_NAME, text: "Half a granola bar. Breakfast of champions." }] as DialogueScript,
  repeat: [{ speaker: PLAYER_NAME, text: "Nothing left. Should really buy groceries." }] as DialogueScript,
};

export const TV_MORNING_OFF_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...I've heard enough of that for one morning." },
];

export const TV_MORNING_ON_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...Maybe I don't want it back on, actually." },
];

export const KEYS_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Keys, wallet, phone. Same as every morning." },
];

export const FRONT_DOOR_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Alright. Let's just... get to work. Everything's probably fine." },
];

export const CAR_ENTER_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...Something feels off today." },
];
