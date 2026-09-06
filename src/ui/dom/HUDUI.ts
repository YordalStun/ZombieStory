import { EventBus, Events } from "@/core/EventBus";
import type { ObjectiveState } from "@/core/managers/ObjectiveManager";
import type { HealthState } from "@/core/managers/PlayerHealth";

export interface PromptShowPayload {
  text: string;
  screenX: number;
  screenY: number;
}

export function setHudVisible(visible: boolean): void {
  document.getElementById("hud-layer")!.classList.toggle("hidden", !visible);
  if (!visible) {
    document.getElementById("interact-prompt")!.classList.add("hidden");
    setSwingHintVisible(false);
  }
}

/** A persistent "[F] Swing" keycap hint, shown whenever the player actually has a swing available — separate from the world-anchored interact prompt, which only ever points at a specific nearby object. */
export function setSwingHintVisible(visible: boolean): void {
  document.getElementById("swing-hint")!.classList.toggle("hidden", !visible);
}

/** Turns a "[E] Grab keys"-style prompt string into a styled keycap + label, instead of literal bracket text. */
function renderPromptContent(el: HTMLElement, text: string): void {
  const match = text.match(/^\[(.+?)\]\s*(.*)$/);
  el.replaceChildren();
  if (!match) {
    el.textContent = text;
    return;
  }
  const keycap = document.createElement("span");
  keycap.className = "prompt-keycap";
  keycap.textContent = match[1];
  const label = document.createElement("span");
  label.className = "prompt-label";
  label.textContent = match[2];
  el.appendChild(keycap);
  el.appendChild(label);
}

export function initHUDUI(): void {
  const objectiveEl = document.getElementById("objective-text")!;
  const lightDot = document.getElementById("light-dot")!;
  const lightLabel = document.getElementById("light-label")!;
  const promptEl = document.getElementById("interact-prompt")!;
  const healthBarEl = document.getElementById("health-bar")!;
  const healthSegmentsEl = document.getElementById("health-segments")!;

  setHudVisible(false);

  EventBus.on(Events.OBJECTIVE_SET, (state: ObjectiveState) => {
    objectiveEl.replaceChildren();
    const empty = !state.title && state.objectives.length === 0;
    objectiveEl.classList.toggle("hidden", empty);
    if (empty) return;

    if (state.title) {
      const title = document.createElement("div");
      title.className = "objective-title";
      title.textContent = state.title;
      objectiveEl.appendChild(title);
    }

    if (state.objectives.length > 0) {
      const list = document.createElement("ul");
      list.className = "objective-list";
      for (const objective of state.objectives) {
        const item = document.createElement("li");
        item.classList.toggle("done", objective.done);
        // the box is content, not decoration — it's the completion state
        item.textContent = `${objective.done ? "[x]" : "[ ]"} ${objective.label}`;
        list.appendChild(item);
      }
      objectiveEl.appendChild(list);
    }
  });

  EventBus.on(Events.LIGHT_LEVEL, (level: number) => {
    let label = "IN SHADOW";
    let cls = "dark";
    if (level > 0.66) {
      label = "IN THE LIGHT";
      cls = "bright";
    } else if (level > 0.32) {
      label = "DIM LIGHT";
      cls = "dim";
    }
    lightLabel.textContent = label;
    lightDot.className = cls;
  });

  EventBus.on(Events.PLAYER_HEALTH_CHANGED, (state: HealthState) => {
    healthBarEl.classList.remove("hidden");
    if (healthSegmentsEl.childElementCount !== state.maxHp) {
      healthSegmentsEl.replaceChildren();
      for (let i = 0; i < state.maxHp; i++) {
        const seg = document.createElement("span");
        seg.className = "health-segment";
        healthSegmentsEl.appendChild(seg);
      }
    }
    Array.from(healthSegmentsEl.children).forEach((seg, i) => {
      seg.classList.toggle("filled", i < state.hp);
      seg.classList.toggle("empty", i >= state.hp);
    });
    healthBarEl.classList.toggle("critical", state.hp > 0 && state.hp <= Math.ceil(state.maxHp * 0.3));
  });

  EventBus.on(Events.PROMPT_SHOW, (data: PromptShowPayload) => {
    renderPromptContent(promptEl, data.text);
    promptEl.style.left = `${data.screenX}px`;
    promptEl.style.top = `${data.screenY}px`;
    promptEl.classList.remove("hidden");
  });

  EventBus.on(Events.PROMPT_HIDE, () => {
    promptEl.classList.add("hidden");
  });
}
