import type Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { WeaponManager } from "@/core/managers/WeaponManager";
import { hideMenu } from "@/ui/dom/MenuUI";

interface JumpTarget {
  group: string;
  label: string;
  go: (game: Phaser.Game) => void;
}

/**
 * Any active scene's ScenePlugin can start any other registered scene by
 * key — it doesn't have to be "this" scene — so it doesn't matter which one
 * happens to be running when the debug menu is opened. hideMenu() clears
 * whatever DOM menu-layer content is currently showing (the main menu,
 * settings, an end slate): jumping in from one of those would otherwise
 * leave it stacked on top of the new scene, since only each scene's own
 * normal transition code (not a scene-external debug jump) knows to clear it.
 */
function jump(game: Phaser.Game, key: string, data?: object): void {
  hideMenu();
  const runner = game.scene.getScenes(true)[0] ?? game.scene.scenes[0];
  runner.scene.start(key, data);
}

/** Most jump targets from Combat Tutorial onward assume the player already has the bat from the earlier bat-toss/glovebox beat — grant it so combat is testable without replaying that. */
function withBat(game: Phaser.Game, key: string, data?: object): void {
  WeaponManager.pickUp("cricket_bat");
  jump(game, key, data);
}

const TARGETS: JumpTarget[] = [
  { group: "Night / Morning", label: "Night cutscene (bedroom)", go: (g) => jump(g, SceneKeys.APARTMENT, { checkpoint: "NIGHT_CUTSCENE" }) },
  { group: "Night / Morning", label: "Morning routine", go: (g) => jump(g, SceneKeys.APARTMENT, { checkpoint: "MORNING_ROUTINE" }) },
  { group: "Day", label: "Motorway drive", go: (g) => jump(g, SceneKeys.MOTORWAY) },
  { group: "Day", label: "Office", go: (g) => jump(g, SceneKeys.OFFICE) },
  { group: "Path 1 — drive yourself", label: "Leave building (car park)", go: (g) => jump(g, SceneKeys.LEAVE_BUILDING, { variant: "carpark" }) },
  { group: "Path 1 — drive yourself", label: "Return drive (breakdown)", go: (g) => jump(g, SceneKeys.RETURN_DRIVE) },
  { group: "Path 1 — drive yourself", label: "Combat tutorial (dirt track)", go: (g) => withBat(g, SceneKeys.COMBAT_TUTORIAL, { variant: "dirtTrack" }) },
  { group: "Path 2 — Dad picks you up", label: "Leave building (forecourt)", go: (g) => jump(g, SceneKeys.LEAVE_BUILDING, { variant: "forecourt" }) },
  { group: "Path 2 — Dad picks you up", label: "Dad's drive (crash)", go: (g) => jump(g, SceneKeys.DAD_DRIVE) },
  { group: "Path 2 — Dad picks you up", label: "Combat tutorial (garden)", go: (g) => withBat(g, SceneKeys.COMBAT_TUTORIAL, { variant: "garden" }) },
  { group: "Rejoined ending", label: "Home arrival (door zombie)", go: (g) => withBat(g, SceneKeys.HOME_ARRIVAL) },
  { group: "Rejoined ending", label: "Blackout (power cut)", go: (g) => jump(g, SceneKeys.BLACKOUT) },
  { group: "Rejoined ending", label: "House defense (full chapter)", go: (g) => withBat(g, SceneKeys.HOUSE_DEFENSE) },
];

let panel: HTMLDivElement;
let visible = false;

/**
 * Small always-on-top button + panel for jumping straight to any point in
 * the game — testing only, has no effect on the real save file (no
 * SaveManager writes here; each target scene checkpoints itself exactly as
 * it would in normal play once it starts). Lives outside #ui-root's normal
 * layer stack so it survives every scene transition and stays clickable
 * over menus, dialogue, even the desk computer overlay.
 */
export function initDebugMenuUI(game: Phaser.Game): void {
  const root = document.getElementById("app")!;

  const button = document.createElement("button");
  button.id = "debug-jump-button";
  button.textContent = "⏭ TEST";
  button.title = "Jump to any point in the game";
  root.appendChild(button);

  panel = document.createElement("div");
  panel.id = "debug-jump-panel";
  panel.className = "hidden";

  const header = document.createElement("div");
  header.className = "debug-jump-header";
  header.innerHTML = `<span>Jump to…</span><span class="debug-jump-hint">testing only</span>`;
  panel.appendChild(header);

  let currentGroup = "";
  for (const target of TARGETS) {
    if (target.group !== currentGroup) {
      currentGroup = target.group;
      const groupEl = document.createElement("div");
      groupEl.className = "debug-jump-group";
      groupEl.textContent = currentGroup;
      panel.appendChild(groupEl);
    }
    const btn = document.createElement("button");
    btn.className = "debug-jump-target";
    btn.textContent = target.label;
    btn.addEventListener("click", () => {
      setVisible(false);
      target.go(game);
    });
    panel.appendChild(btn);
  }

  root.appendChild(panel);

  button.addEventListener("click", () => setVisible(!visible));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && visible) setVisible(false);
  });
}

function setVisible(next: boolean): void {
  visible = next;
  panel.classList.toggle("hidden", !visible);
}
