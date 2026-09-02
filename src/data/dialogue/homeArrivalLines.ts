import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

export const HOME_ARRIVAL_START_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Home. Actually home." },
  { speaker: PLAYER_NAME, text: "...That's not nothing between me and the door." },
  { speaker: PLAYER_NAME, text: "This one's not just standing there. It's seen me." },
  { speaker: PLAYER_NAME, text: "Press I any time to see what I'm carrying and what it can do." },
];

export const NOT_SAFE_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Not with that thing still up." },
];

export const ZOMBIE_DEAD_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...Down. Okay. Okay." },
  { speaker: PLAYER_NAME, text: "Inside. Now, before anything else turns up." },
];

export const GO_INSIDE_LINES: DialogueScript = [{ speaker: PLAYER_NAME, text: "Door's locked behind me. That's it, for now." }];
