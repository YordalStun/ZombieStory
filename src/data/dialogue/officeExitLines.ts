import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

/** Fires once both emails and the news have been checked — the last beat before the story forks. */
export const HEAD_HOME_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Right. I've seen enough. I need to get home." },
  { speaker: PLAYER_NAME, text: "Let them know first, though." },
];

export const CHOSEN_DRIVE_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Mum, Dad — heading home now. Should be back before it gets properly bad. Love you." },
  { speaker: PLAYER_NAME, text: "Sent. Right. Car keys." },
];

export const CHOSEN_PICKUP_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Dad — can you come and get me? Don't think I should be driving in this." },
  { speaker: PLAYER_NAME, text: "Sent. Okay. Just wait, then." },
];

/** Short, mostly-scenery beat while the player waits for the reply — no input needed. */
export const WINDOW_POV_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "The office looks different with half the lights off." },
  { speaker: PLAYER_NAME, text: "Whole city out there, and it's gone quiet in a way that doesn't feel like quiet." },
];

export const DAD_OUTSIDE_LINES: DialogueScript = [{ speaker: "Dad", text: "outside. hurry up x" }];

export const DANA_BAT_LINES: DialogueScript = [
  { speaker: "Dana", text: `${PLAYER_NAME}! You heading off?` },
  { speaker: "Dana", text: "Take this. Found it in the stationery cupboard, don't ask me why it was in there." },
  { speaker: "Dana", text: "Just — take it. Better than nothing." },
];

export const BOSS_STOP_LINES: DialogueScript = [
  { speaker: "Gary", text: `${PLAYER_NAME} — where do you think you're going? We are not done for the day.` },
  { speaker: "Gary", text: "I don't care what's on the news. Sit back down, there's work to do." },
];

export const DANNY_DEFIANT_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...No. I'm going home, Gary." },
  { speaker: PLAYER_NAME, text: "Sack me if you want. I mean it, sack me. I'm going." },
];
