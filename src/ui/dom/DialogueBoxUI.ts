import { EventBus, Events } from "@/core/EventBus";
import type { DialogueLine } from "@/core/dialogue/DialogueTypes";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";

const CHARS_PER_SECOND = 42;

export function initDialogueBoxUI(): void {
  const box = document.getElementById("dialogue-box")!;
  const speakerEl = document.getElementById("dialogue-speaker")!;
  const textEl = document.getElementById("dialogue-text")!;
  const continueEl = document.getElementById("dialogue-continue")!;

  let fullText = "";
  let revealed = 0;
  let rafId: number | null = null;
  let lastTime = 0;

  function stopReveal(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick(now: number): void {
    if (!lastTime) lastTime = now;
    const dt = now - lastTime;
    lastTime = now;
    revealed += (dt / 1000) * CHARS_PER_SECOND;
    const count = Math.min(fullText.length, Math.floor(revealed));
    textEl.textContent = fullText.slice(0, count);
    if (count >= fullText.length) {
      continueEl.classList.remove("hidden");
      stopReveal();
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  function showLine(line: DialogueLine): void {
    speakerEl.textContent = line.speaker;
    fullText = line.text;
    revealed = 0;
    lastTime = 0;
    textEl.textContent = "";
    continueEl.classList.add("hidden");
    stopReveal();
    rafId = requestAnimationFrame(tick);
  }

  function isRevealing(): boolean {
    return rafId !== null;
  }

  function handleAdvanceInput(): void {
    if (box.classList.contains("hidden")) return;
    if (isRevealing()) {
      stopReveal();
      textEl.textContent = fullText;
      continueEl.classList.remove("hidden");
    } else {
      AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.5 });
      EventBus.emit(Events.DIALOGUE_ADVANCE_REQUEST);
    }
  }

  EventBus.on(Events.DIALOGUE_SHOW, () => box.classList.remove("hidden"));
  EventBus.on(Events.DIALOGUE_LINE, (line: DialogueLine) => showLine(line));
  EventBus.on(Events.DIALOGUE_HIDE, () => {
    box.classList.add("hidden");
    stopReveal();
  });

  box.addEventListener("click", handleAdvanceInput);
  window.addEventListener("keydown", (e) => {
    if (box.classList.contains("hidden")) return;
    if (e.code === "Space" || e.code === "Enter" || e.code === "KeyE") {
      e.preventDefault();
      handleAdvanceInput();
    }
  });
}
