export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  damage: number;
  /** Reach of a swing, in world px. */
  range: number;
  /** Width of the swing arc, in degrees. */
  arcDegrees: number;
  swingMs: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  cricket_bat: {
    id: "cricket_bat",
    name: "Cricket Bat",
    description: "Been in the boot since summer. Heavier than it looks.",
    damage: 1,
    range: 28,
    arcDegrees: 120,
    swingMs: 300,
  },
  knife: {
    id: "knife",
    name: "Kitchen Knife",
    description: "Quick. Not much reach, but it's quick.",
    damage: 1,
    range: 20,
    arcDegrees: 80,
    swingMs: 180,
  },
  crowbar: {
    id: "crowbar",
    name: "Crowbar",
    description: "From the garage. Every swing means it.",
    damage: 2,
    range: 26,
    arcDegrees: 100,
    swingMs: 420,
  },
  frying_pan: {
    id: "frying_pan",
    name: "Frying Pan",
    description: "Cast iron. Wide, satisfying arc.",
    damage: 1,
    range: 24,
    arcDegrees: 150,
    swingMs: 340,
  },
  fire_poker: {
    id: "fire_poker",
    name: "Fire Poker",
    description: "Iron rod from the hearth set. Good reach.",
    damage: 2,
    range: 34,
    arcDegrees: 90,
    swingMs: 380,
  },
};
