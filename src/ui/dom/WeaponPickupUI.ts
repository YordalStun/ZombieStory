import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import type { WeaponDef } from "@/core/combat/weapons";

/** Which weapon ids have already had their card shown this playthrough — picking the same one up again (e.g. re-grabbing a dropped weapon after a swap) is a silent no-op, not a repeat ceremony. */
const announcedIds = new Set<string>();

/** Same "click or Space" pattern as PhoneFlashUI's continue prompt. */
function waitForContinue(): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", finish);
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") finish();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", finish);
  });
}

/**
 * A blocking "new weapon" card the first time — and only the first time —
 * each weapon is picked up in a playthrough: its name and flavour text,
 * held until the player actively dismisses it rather than a toast that
 * times out on its own. Callers await this, so the scene itself is what
 * actually pauses (controls disabled, zombies/spawning held off) — this
 * module only owns the card's own visibility and input.
 */
export async function announceWeaponPickup(weapon: WeaponDef): Promise<void> {
  if (announcedIds.has(weapon.id)) return;
  announcedIds.add(weapon.id);

  const layer = document.getElementById("weapon-pickup-layer")!;
  const nameEl = document.getElementById("weapon-pickup-name")!;
  const descEl = document.getElementById("weapon-pickup-desc")!;

  nameEl.textContent = weapon.name;
  descEl.textContent = weapon.description;

  layer.classList.remove("hidden");
  requestAnimationFrame(() => layer.classList.add("visible"));
  AudioManager.playSfx(SfxKey.INTERACT, { volume: 0.7, rate: 0.8 });

  await waitForContinue();

  layer.classList.remove("visible");
  await new Promise<void>((resolve) => window.setTimeout(resolve, 220));
  layer.classList.add("hidden");
}
