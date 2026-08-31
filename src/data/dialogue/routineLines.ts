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
  first: [
    { speaker: PLAYER_NAME, text: "Brush your teeth. Splash some cold water on your face. Basic stuff." },
    { speaker: PLAYER_NAME, text: "Cold water wakes you up faster than coffee ever does, anyway." },
  ] as DialogueScript,
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

export const PICTURE_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Me and the guys, last summer. ...Should probably call them today." },
];

export const LAVA_LAMP_ON_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Mesmerizing. Slightly hypnotic. Definitely not helping me focus." },
];

export const LAVA_LAMP_OFF_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Okay. Enough stalling." },
];

export const COMPUTER_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Forty-some messages overnight. Everyone's asking the same thing: are you seeing this?" },
];

export const DOG_PET_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Hey, buddy. Yeah, I know. Weird morning." },
];

export const DOG_WAKE_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Morning, you. Come on, then." },
];

export const SHOWER_OFF_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...Guess it's been dripping all night." },
];

export const DOOR_LOCKED_HINTS: Record<string, DialogueScript> = {
  dressed: [{ speaker: PLAYER_NAME, text: "Not like this. Let's get dressed first." }],
  washedUp: [{ speaker: PLAYER_NAME, text: "I should wash up before I go." }],
  ate: [{ speaker: PLAYER_NAME, text: "I should eat something first." }],
  grabbedKeys: [{ speaker: PLAYER_NAME, text: "Wait — I need my keys." }],
};
