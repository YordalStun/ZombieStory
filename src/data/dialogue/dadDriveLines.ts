import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

export const DAD_DRIVE_START_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Dad. DAD. Since when do you drive like this?" },
  { speaker: "Dad", text: "Since today. Seatbelt on." },
];

export const DAD_DRIVE_SWERVE_LINES: DialogueScript = [{ speaker: "Dad", text: "Whoops. Didn't see that one." }];

export const DAD_DRIVE_CLOSE_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Nearly home. Nearly, nearly home." },
];

export const DAD_CRASH_LINES: DialogueScript = [
  { speaker: "Dad", text: "...Parked it." },
  { speaker: PLAYER_NAME, text: "You drove through the wall." },
  { speaker: "Dad", text: "I said parked it. Everyone's fine. Out you get." },
];
