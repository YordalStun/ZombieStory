import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

export const PRIYA_LINES: DialogueScript = [
  { speaker: "Priya", text: "Hang on — no, I said I'll call you back—" },
  { speaker: "Priya", text: `Sorry, ${PLAYER_NAME}. That was my sister. Says the hospital near her is turning people away at the door.` },
  { speaker: "Priya", text: "Probably an exaggeration. People exaggerate." },
];

export const MARK_LINES: DialogueScript = [
  { speaker: "Mark", text: `Morning, ${PLAYER_NAME}. Don't mind me, just pretending this report is more interesting than my phone.` },
  { speaker: "Mark", text: "Nobody's said anything official. If it were actually bad, someone would've said something official." },
  { speaker: "Mark", text: "...Right?" },
];

export const GREG_LINES: DialogueScript = [
  { speaker: "Greg", text: "You seen Sandra today?" },
  { speaker: "Greg", text: "Didn't call in, didn't message the group chat, nothing. She always messages the group chat." },
  { speaker: "Greg", text: "I'm sure it's fine. Everyone keeps saying it's fine." },
];

export const BEN_LINES: DialogueScript = [
  { speaker: "Ben", text: "Can everyone keep it down out there? Some of us are trying to hit a deadline." },
  { speaker: "Ben", text: `A deadline, ${PLAYER_NAME}. On today of all days. I don't even know why I'm still doing this.` },
];

export const SAM_LINES: DialogueScript = [
  { speaker: "Sam", text: "Hey — you should come see this." },
  { speaker: "Sam", text: "Everyone's crowded round the TV in the break room. It's not good, mate." },
  { speaker: "Sam", text: "Come on. Down that way." },
];

export const ELENA_LINES: DialogueScript = [
  { speaker: "Elena", text: "Meeting's cancelled. Both of them, actually." },
  { speaker: "Elena", text: "Nobody sent an email. People just... didn't show up, and then didn't come back." },
];

export const DANA_LINES: DialogueScript = [
  { speaker: "Dana", text: `${PLAYER_NAME}! There you are.` },
  { speaker: "Dana", text: "We started here the same week, remember? Feels like a hundred years ago now, not six." },
  { speaker: "Dana", text: "You look how I feel. Which is to say: not great." },
];

export const OWEN_LINES: DialogueScript = [
  { speaker: "Owen", text: "It just rings out. Every time. No voicemail, nothing." },
  { speaker: "Owen", text: `Sorry — ${PLAYER_NAME}, hi. I'm trying my brother. Lines must be jammed, everyone's probably trying at once.` },
  { speaker: "Owen", text: "Everyone's probably fine. That's — yeah. That's probably it." },
];

export const FATIMA_LINES: DialogueScript = [
  { speaker: "Fatima", text: `${PLAYER_NAME}, good, you're in. Listen — I think people should be heading home, not sitting at their desks.` },
  { speaker: "Fatima", text: "I've said it to three managers already. Got three different versions of 'let's not panic.'" },
  { speaker: "Fatima", text: "I'm not panicking. I'm being sensible. There's a difference." },
];

export const CHRIS_LINES: DialogueScript = [
  { speaker: "Chris", text: `Alright, ${PLAYER_NAME}. Bet you five quid the fire alarm's the next thing that goes off today.` },
  { speaker: "Chris", text: "Gotta laugh, mate. What's the alternative." },
];

export const PRINTER_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Jammed again. Some things never change, whatever else is going on." },
];

export const WATER_COOLER_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Same water cooler, same lukewarm cup. At least something's normal." },
];

/** First proximity trigger — the whole room's attention, escalating past everything the radio covered on the drive in. */
export const OFFICE_BROADCAST_LINES: DialogueScript = [
  { speaker: "News Anchor", text: "—and we're now getting confirmation that three more hospital trusts have declared a critical incident this morning." },
  { speaker: "News Anchor", text: "The Department of Health says the public should remain calm and avoid emergency departments unless absolutely necessary." },
  { speaker: "News Anchor", text: "Several schools across the region have announced they will not reopen after this morning's drop-off." },
  { speaker: "News Anchor", text: "Police are asking residents in the following postcodes to stay indoors while, quote, 'ongoing incidents' are resolved." },
  { speaker: "Coworker", text: "That's my mum's postcode. That's my mum's actual postcode." },
  { speaker: "News Anchor", text: "We're being told to cross now to our reporter at—" },
  { speaker: "News Anchor", text: "—I'm sorry, we seem to have lost that signal. We'll return to it as soon as—" },
  { speaker: "News Anchor", text: "One moment. One moment, please." },
  { speaker: PLAYER_NAME, text: "Nobody in this room is breathing." },
];

export const TV_REPEAT_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Same story, over and over, with less and less of it making sense." },
];

export const FIND_DESK_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "I can't just stand here. I should get back to my desk. Try to think." },
];

export const AT_DESK_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Back at my desk. Same chair, same view of the partition wall." },
  { speaker: PLAYER_NAME, text: "None of it feels like it means anything right now." },
];

export const LOBBY_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Made it in. Lift, corridor, desk. Same as every other day." },
  { speaker: PLAYER_NAME, text: "It doesn't feel like every other day." },
];
