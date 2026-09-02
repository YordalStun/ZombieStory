import { EventBus, Events } from "@/core/EventBus";
import { WeaponManager } from "@/core/managers/WeaponManager";
import type { WeaponDef } from "@/core/combat/weapons";

let panel: HTMLDivElement;
let list: HTMLDivElement;
let visible = false;

/**
 * A lightweight, non-modal stats panel toggled with "I" — lists every
 * weapon the player has picked up along with its numbers (dmg/range/etc).
 * Doesn't pause the scene or touch player controls; it's just a HUD
 * overlay, so it stays decoupled from any specific Phaser scene like the
 * rest of the DOM UI layer.
 */
export function initWeaponUI(): void {
  const root = document.getElementById("ui-root")!;

  panel = document.createElement("div");
  panel.id = "weapon-panel";
  panel.className = "weapon-panel hidden";

  const header = document.createElement("div");
  header.className = "weapon-panel-header";
  header.innerHTML = `<span>🏏 Weapons</span><span class="weapon-panel-hint">I to close</span>`;

  list = document.createElement("div");
  list.className = "weapon-panel-list";

  panel.appendChild(header);
  panel.appendChild(list);
  root.appendChild(panel);

  EventBus.on(Events.WEAPONS_CHANGED, () => {
    if (visible) render();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "i") return;
    if (!visible && !WeaponManager.hasAny()) return;
    setVisible(!visible);
  });
}

function setVisible(next: boolean): void {
  visible = next;
  panel.classList.toggle("hidden", !visible);
  if (visible) render();
}

function render(): void {
  const weapons = WeaponManager.getOwned();
  const equippedId = WeaponManager.getEquipped()?.id;
  list.replaceChildren();

  for (const w of weapons) {
    list.appendChild(buildRow(w, w.id === equippedId));
  }
}

function buildRow(w: WeaponDef, equipped: boolean): HTMLDivElement {
  const row = document.createElement("div");
  row.className = equipped ? "weapon-panel-row equipped" : "weapon-panel-row";

  const name = document.createElement("div");
  name.className = "weapon-panel-name";
  name.textContent = w.name;
  if (equipped) {
    const tag = document.createElement("span");
    tag.className = "weapon-panel-equipped-tag";
    tag.textContent = "equipped";
    name.appendChild(tag);
  }

  const desc = document.createElement("div");
  desc.className = "weapon-panel-desc";
  desc.textContent = w.description;

  const stats = document.createElement("div");
  stats.className = "weapon-panel-stats";
  stats.appendChild(buildStat("DMG", String(w.damage)));
  stats.appendChild(buildStat("Range", String(w.range)));
  stats.appendChild(buildStat("Arc", `${w.arcDegrees}°`));
  stats.appendChild(buildStat("Swing", `${w.swingMs}ms`));

  row.appendChild(name);
  row.appendChild(desc);
  row.appendChild(stats);
  return row;
}

function buildStat(label: string, value: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.textContent = `${label} `;
  const b = document.createElement("b");
  b.textContent = value;
  span.appendChild(b);
  return span;
}
