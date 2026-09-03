import { EventBus, Events } from "@/core/EventBus";

const DEFAULT_MAX_HP = 5;

export interface HealthState {
  hp: number;
  maxHp: number;
}

/**
 * Runtime-only, like WeaponManager/ObjectiveManager — nothing before the
 * house-defense chapter ever needed a player-death mechanic (see the many
 * "no player-health system exists" notes on earlier scenes), so this is
 * scoped to that chapter and reset fresh at its start rather than carried
 * across the whole game.
 */
class PlayerHealthClass {
  private maxHp = DEFAULT_MAX_HP;
  private hp = DEFAULT_MAX_HP;

  reset(maxHp: number = DEFAULT_MAX_HP): void {
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.emit();
  }

  /** No-ops once dead — a corpse can't take further damage. */
  damage(amount: number): void {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.emit();
  }

  heal(amount: number): void {
    if (this.hp <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.emit();
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  private emit(): void {
    const state: HealthState = { hp: this.hp, maxHp: this.maxHp };
    EventBus.emit(Events.PLAYER_HEALTH_CHANGED, state);
  }
}

export const PlayerHealth = new PlayerHealthClass();
