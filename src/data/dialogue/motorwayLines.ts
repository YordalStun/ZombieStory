import { PLAYER_NAME } from "@/config/constants";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";

export const MOTORWAY_ARRIVAL_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Twenty minutes and I've moved about four car lengths." },
  { speaker: PLAYER_NAME, text: "Whole motorway, dead stopped. Nobody's even leaning on their horn anymore — that's the part I don't like." },
];

/** Each radio press advances the broadcast one beat. */
export const RADIO_STAGES: DialogueScript[] = [
  [
    { speaker: "RADIO - TRAFFIC", text: "— avoid the M4 eastbound entirely, avoid the ring road, and do not, under any circumstances, attempt to continue on foot." },
    { speaker: PLAYER_NAME, text: "On foot. Who's telling people that?" },
  ],
  [
    { speaker: "RADIO - ANCHOR", text: "We're going to bring you the Health Secretary's statement in full, because we think the wording matters." },
    { speaker: "RADIO - ANCHOR", text: "Quote: 'Containment has not failed. Containment has been revised.' End quote." },
    { speaker: PLAYER_NAME, text: "...Revised." },
  ],
  [
    { speaker: "RADIO - ANCHOR", text: "We're getting reports of vehicles being abandoned on the eastbound carriageway. Drivers are being asked to remain with their cars." },
    { speaker: "RADIO - ANCHOR", text: "I'm told — sorry. I'm being told to repeat that. Remain with your vehicle. Lock it." },
    { speaker: PLAYER_NAME, text: "Lock it." },
  ],
  [
    { speaker: "RADIO - ANCHOR", text: "If you are on the M4 between junctions nine and twelve, we are being asked to tell you—" },
    { speaker: "RADIO", text: "[The signal drops to a flat carrier tone.]" },
    { speaker: PLAYER_NAME, text: "No no no, come back. Come on." },
  ],
];

export const RADIO_DEAD_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Nothing. Every station, the same nothing." },
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

/** The beat that ends the scene, once the radio has run its course. */
export const MOTORWAY_ENDING_LINES: DialogueScript = [
  { speaker: PLAYER_NAME, text: "Something's happening up ahead. Doors opening." },
  { speaker: PLAYER_NAME, text: "People are getting out. They're leaving their cars and they're running — this way." },
  { speaker: PLAYER_NAME, text: "Running from something I can't see yet." },
];
