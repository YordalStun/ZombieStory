import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

export const HOUSE_DEFENSE_START_LINES: DialogueScript = [
  { speaker: "Dad", text: "Radio's been saying it since this morning — they go for light. Moving light most of all." },
  { speaker: "Mum", text: "So every light in this house goes off. All of it, every room, right now." },
  { speaker: PLAYER_NAME, text: "I'll cover the doors and windows. You three get the switches." },
  { speaker: "Mum", text: "I've got the living room. Your father's on the kitchen." },
  { speaker: "Dad", text: "Lily, Jack — straight to your own rooms and back down. Don't stop for anything." },
  { speaker: "Jack", text: "What if one gets in?" },
  { speaker: PLAYER_NAME, text: "Then it gets me first. Go." },
];

export const HORDE_ARRIVES_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Glass. That's glass." },
  { speaker: PLAYER_NAME, text: "They're already coming through — keep the lights going out, I'll hold this floor." },
];

export const UPSTAIRS_FIRST_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Lily's room, Jack's room, the bathroom. Same drill up here." },
];

export const HALFWAY_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Halfway dark. Keep going." },
];

export const HOUSE_DEFENSE_WIN_LINES: DialogueScript = [
  { speaker: "Mum", text: "That's the last one. Every room's out." },
  { speaker: "Dad", text: "...Is that all of them?" },
  { speaker: PLAYER_NAME, text: "For tonight. Everyone's still here. That's the only number that matters." },
];

/** Jack stayed up by his window when everyone else went dark — he never came back down during the blackout scene (see blackoutLines.ts's BLACKOUT_JACK_CHASE_LINES). Asking him during the fight gets one of these at random. */
export const JACK_ASK_SIGNAL_LINES: DialogueScript[] = [
  [{ speaker: "Jack", text: "Nothing. Still nothing." }],
  [{ speaker: "Jack", text: "One bar, then gone again. It's not staying up long enough to send anything." }],
  [{ speaker: "Jack", text: "I keep checking. I know. I can't not check." }],
];

/** Plays once the fight's actually over, before the win slate — Jack finally comes back down. */
export const JACK_POST_DEFENSE_RETURN_LINES: DialogueScript = [
  { speaker: "Jack", text: "Nothing. It's not coming back tonight." },
  { speaker: "Mum", text: "You did what you could. Come here." },
];

export const FAMILY_MEMBER_NAMES: Record<string, string> = {
  mum: "Mum",
  dad: "Dad",
  sister: "Lily",
  brother: "Jack",
};
