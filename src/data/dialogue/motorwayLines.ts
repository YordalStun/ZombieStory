import { PLAYER_NAME } from "@/config/constants";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";

export const MOTORWAY_ARRIVAL_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Twenty minutes and I've moved about four car lengths." },
  { speaker: PLAYER_NAME, text: "Whole motorway, dead stopped. Nobody's even leaning on their horn anymore — that's the part I don't like." },
];

/**
 * One continuous broadcast — plays via DialoguePlayer.playAuto(), so it
 * advances itself line to line without the player having to click through
 * it. Ends on Danny's own line, which is what actually stops it.
 */
export const RADIO_BROADCAST_LINES: DialogueScript = [
  { speaker: "RADIO - TRAFFIC", text: "— avoid the M4 eastbound entirely, avoid the ring road, and do not, under any circumstances, attempt to continue on foot." },
  { speaker: PLAYER_NAME, text: "On foot. Who's telling people that?" },
  { speaker: "RADIO - ANCHOR", text: "We're going to bring you the Health Secretary's statement in full, because we think the wording matters." },
  { speaker: "RADIO - ANCHOR", text: "Quote: 'Containment has not failed. Containment has been revised.' End quote." },
  { speaker: PLAYER_NAME, text: "...Revised." },
  { speaker: "RADIO - ANCHOR", text: "We're getting reports of vehicles being abandoned on the eastbound carriageway. Drivers are being asked to remain with their cars." },
  { speaker: "RADIO - ANCHOR", text: "I'm told — sorry. I'm being told to repeat that. Remain with your vehicle. Lock it." },
  { speaker: PLAYER_NAME, text: "Lock it." },
  { speaker: "RADIO - ANCHOR", text: "If you're on the M4 between junctions nine and twelve, we're being asked to tell you the hard shoulder is not a safe—" },
  { speaker: PLAYER_NAME, text: "Alright. Alright, that's — let's turn this off." },
];

export const RADIO_OFF_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "...Quiet's worse, actually." },
];

export const HORN_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Not one of them looked round. Forty cars and not one head turned." },
];

export const WHEEL_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Hands at ten and two, going absolutely nowhere." },
];

export const MIRROR_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Cars behind me as far as the rain lets me see. No way back either." },
];

/** The beat that notices the figure approaching, right before it reaches the car. */
export const MOTORWAY_NOTICE_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Something's happening up ahead." },
  { speaker: PLAYER_NAME, text: "...Someone's out of their car. Walking wrong." },
];

/** As it reaches the car and starts hitting it. */
export const ZOMBIE_BANG_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Hey — hey! Get away from the car!" },
];

/** As the driver is pulled out. */
export const ZOMBIE_DRAG_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Oh God, it's got him. It's got him—" },
  { speaker: PLAYER_NAME, text: "Somebody help him! Somebody—" },
];

/** The last, self-preserving beat, right before the fade. */
export const MOTORWAY_ENDING_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Lock the doors. Lock the doors, lock the—" },
];
