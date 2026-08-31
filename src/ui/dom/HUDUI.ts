import { EventBus, Events } from "@/core/EventBus";

export interface PromptShowPayload {
  text: string;
  screenX: number;
  screenY: number;
}

export function setHudVisible(visible: boolean): void {
  document.getElementById("hud-layer")!.classList.toggle("hidden", !visible);
  if (!visible) document.getElementById("interact-prompt")!.classList.add("hidden");
}

export function initHUDUI(): void {
  const objectiveEl = document.getElementById("objective-text")!;
  const lightDot = document.getElementById("light-dot")!;
  const lightLabel = document.getElementById("light-label")!;
  const promptEl = document.getElementById("interact-prompt")!;

  setHudVisible(false);

  EventBus.on(Events.OBJECTIVE_SET, (text: string) => {
    objectiveEl.textContent = text;
    objectiveEl.classList.toggle("hidden", !text);
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

  EventBus.on(Events.PROMPT_SHOW, (data: PromptShowPayload) => {
    promptEl.textContent = data.text;
    promptEl.style.left = `${data.screenX}px`;
    promptEl.style.top = `${data.screenY}px`;
    promptEl.classList.remove("hidden");
  });

  EventBus.on(Events.PROMPT_HIDE, () => {
    promptEl.classList.add("hidden");
  });
}
