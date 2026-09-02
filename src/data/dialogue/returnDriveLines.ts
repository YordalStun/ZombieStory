import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

export const RETURN_DRIVE_START_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Empty motorway. That's almost worse than the traffic." },
  { speaker: PLAYER_NAME, text: "Keep it moving. Mind whatever's been left in the road." },
];

export const BREAKDOWN_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "No. No no no — not now." },
  { speaker: PLAYER_NAME, text: "Come on. Come ON." },
];

export const PHONE_NO_SIGNAL_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "No signal. Of course there's no signal." },
  { speaker: PLAYER_NAME, text: "Nothing. Not one bar, anywhere." },
];

export const DIRT_PATH_SPOTTED_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...That track. It heads roughly the right way, doesn't it?" },
  { speaker: PLAYER_NAME, text: "Better than sitting here." },
];

export const REMEMBER_BAT_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Wait — the bat. It's still in the boot." },
];

export const GET_BAT_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Right. If anything gets close, this is what I've got." },
];
