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
};
