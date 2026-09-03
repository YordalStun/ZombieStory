import { EventBus, Events } from "@/core/EventBus";
import { WEAPONS, type WeaponDef } from "@/core/combat/weapons";

/**
 * Tracks which weapons the player has picked up and which one is currently
 * equipped. Runtime-only, like ObjectiveManager — this story arc plays out
 * in one continuous stretch with nothing crossing a save/load boundary, so
 * there's no need to persist it yet.
 */
class WeaponManagerClass {
  private ownedIds: string[] = [];
  private equippedId: string | null = null;

  /**
   * One slot: Danny's hands, not a bag. There's no switch-weapon control,
   * so letting pickups pile up just left every weapon but the first one
   * dead weight in the panel — picking up a new one now drops whatever he
   * was already holding.
   */
  pickUp(id: string): void {
    if (!WEAPONS[id] || this.equippedId === id) return;
    this.ownedIds = [id];
    this.equippedId = id;
    this.emit();
  }

  equip(id: string): void {
    if (!this.ownedIds.includes(id) || this.equippedId === id) return;
    this.equippedId = id;
    this.emit();
  }

  has(id: string): boolean {
    return this.ownedIds.includes(id);
  }

  hasAny(): boolean {
    return this.ownedIds.length > 0;
  }

  getEquipped(): WeaponDef | null {
    return this.equippedId ? WEAPONS[this.equippedId] : null;
  }

  getOwned(): WeaponDef[] {
    return this.ownedIds.map((id) => WEAPONS[id]);
  }

  clear(): void {
    this.ownedIds = [];
    this.equippedId = null;
    this.emit();
  }

  private emit(): void {
    EventBus.emit(Events.WEAPONS_CHANGED, this.getOwned());
  }
}

export const WeaponManager = new WeaponManagerClass();
