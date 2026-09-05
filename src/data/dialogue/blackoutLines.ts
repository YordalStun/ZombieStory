import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { PLAYER_NAME } from "@/config/constants";

/** Ordinary reflex, before anyone's actually alarmed — a switch, the telly, nothing. */
export const BLACKOUT_GATHER_LINES: DialogueScript = [
  { speaker: "Mum", text: "Try it again." },
  { speaker: "Dad", text: "I've tried it three times, love." },
  { speaker: "Jack", text: "The telly won't even come on standby." },
  { speaker: "Lily", text: "Is it just us?" },
  { speaker: "Jack", text: "Why isn't ANYTHING working?" },
  { speaker: "Mum", text: "Jack. Breathe." },
];

export const BLACKOUT_CRASH_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "What was that?" },
  { speaker: "Dad", text: "That was outside. That was right outside." },
];

/** Lily's already moving before anyone can stop her — this is deliberately hers, not Danny's. */
export const BLACKOUT_TO_WINDOW_LINES: DialogueScript = [
  { speaker: "Lily", text: "I just want to see—" },
  { speaker: PLAYER_NAME, text: "Lily, don't—" },
];

/** Plays once the 3D street shot cuts back to the room. Let this one breathe — don't rush past it. */
export const BLACKOUT_WINDOW_REACTION_LINES: DialogueScript = [
  { speaker: "Mum", text: "Get back from the glass. Both of you." },
  { speaker: "Jack", text: "Is that— are those all—" },
  { speaker: "Dad", text: "The Hendersons' lamppost. That's the Hendersons' lamppost." },
  { speaker: PLAYER_NAME, text: "Dad." },
  { speaker: "Dad", text: "Sorry. Sorry. I'm — sorry." },
  { speaker: "Mum", text: "We saw. We don't need to keep watching." },
  { speaker: "Lily", text: "There were so many of them just... standing there." },
  { speaker: "Jack", text: "Standing where we used to—" },
  { speaker: "Jack", text: "Never mind." },
];

export const BLACKOUT_RADIO_START_LINES: DialogueScript = [
  { speaker: "Dad", text: "Right. Right. Let's see if anyone's saying anything." },
  { speaker: PLAYER_NAME, text: "The pocket one? Does it still have batteries?" },
  { speaker: "Dad", text: "It always has batteries. I check it every August like a lunatic, your mother says." },
  { speaker: "Mum", text: "I do say that." },
];

/** Broken fragments as Dad scans through — same broadcast voice as the office TV, now barely holding together. */
export const BLACKOUT_RADIO_SCAN_LINES: DialogueScript = [
  { speaker: "News Anchor", text: "—epeat, do not attempt to travel unless—" },
  { speaker: "News Anchor", text: "—ncy services are aware of reports in the—" },
  { speaker: "News Anchor", text: "—if you are hearing this broadcast, remain—" },
];

export const BLACKOUT_RADIO_HUSH_LINES: DialogueScript = [
  { speaker: "Mum", text: "Turn it down! If we can hear that from the street—" },
  { speaker: "Dad", text: "Sorry. Sorry, sorry." },
  { speaker: PLAYER_NAME, text: "Upstairs. Away from the windows." },
];

export const BLACKOUT_UPSTAIRS_LINES: DialogueScript = [{ speaker: "Mum", text: "Everyone. Landing. Now." }];

export const BLACKOUT_PHONE_CHECK_LINES: DialogueScript = [
  { speaker: "Mum", text: "Phones. Everyone check your phones." },
  { speaker: "Dad", text: "Nothing. Not one bar." },
  { speaker: PLAYER_NAME, text: "Same." },
  { speaker: "Lily", text: "Mine's not even trying." },
];

export const BLACKOUT_JACK_SIGNAL_LINES: DialogueScript = [{ speaker: "Jack", text: "Wait — wait, I've got one bar—" }];

/** Fires right after the phone-flash UI empties back out to "No Service". */
export const BLACKOUT_JACK_SIGNAL_LOST_LINES: DialogueScript = [
  { speaker: "Jack", text: "It's gone. It's already gone." },
  { speaker: "Jack", text: "That was Mia. And Tyler. Everyone's asking the same thing." },
  { speaker: "Jack", text: "Nobody knows anything either." },
];

export const BLACKOUT_JACK_CHASE_LINES: DialogueScript = [
  { speaker: "Jack", text: "If it came back once, it'll come back again — I'm going to try the landing." },
  { speaker: "Mum", text: "Jack—" },
  { speaker: "Jack", text: "Two minutes. I just want to reply to one of them." },
];

export const BLACKOUT_JACK_RETURN_LINES: DialogueScript = [
  { speaker: "Jack", text: "Nothing. It's not coming back." },
  { speaker: "Mum", text: "Then you're not leaving this room again. Sit." },
];

export const BLACKOUT_PLANNING_LINES: DialogueScript = [
  { speaker: "Dad", text: "Okay. We need an actual plan, not just standing around a dead radio." },
  { speaker: PLAYER_NAME, text: "Then let's make one." },
];

export interface PhoneMessage {
  sender: string;
  text: string;
}

/** Backlog arriving all at once — the ordinary kind of message, which is exactly what makes it land. */
export const JACK_PHONE_MESSAGES: PhoneMessage[] = [
  { sender: "Mia", text: "does anyone know whats actually going on???" },
  { sender: "Tyler", text: "bro are you seeing this on the news" },
  { sender: "Family Group", text: "PLEASE can someone reply, is everyone ok" },
  { sender: "Aunt Jean", text: "Jack love are you and your mum and dad safe" },
  { sender: "Ryan", text: "cant get through to anyone. u guys ok?" },
];
