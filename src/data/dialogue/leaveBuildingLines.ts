import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

export const CARPARK_ENTER_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Stairwell smells like a stairwell. At least that's normal." },
];

export const CARPARK_ZOMBIE_SEEN_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...Okay. That's one of them." },
  { speaker: PLAYER_NAME, text: "It's not moving. Just watching. Keep walking. Don't stop." },
];

export const CARPARK_GATEWAY_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Car's up on the next level. Nearly there." },
];

export const FORECOURT_DAD_SHOUT_LINES: DialogueScript = [
  { speaker: "Dad", text: `${PLAYER_NAME}! Don't stop — that one doesn't move. Just go round it!` },
];

export const GET_IN_CAR_LINES: DialogueScript = [{ speaker: PLAYER_NAME, text: "In. Go, go, go." }];
