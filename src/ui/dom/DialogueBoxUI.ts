import { EventBus, Events } from "@/core/EventBus";
import type { DialogueLine } from "@/core/dialogue/DialogueTypes";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";

const CHARS_PER_SECOND = 42;

/**
 * Sims/Animal-Crossing-style "gibberish" voice per speaker — one shared
 * blip buffer (see synth.ts) played back at a different rate per name, so
 * each character reads as having their own voice without a real line
 * recorded. Danny gets his own rate distinct from every coworker's.
 */
const VOICE_RATE_BY_SPEAKER: Record<string, number> = {
  danny: 0.82,
  dana: 1.15,
  priya: 1.32,
  mark: 0.76,
  owen: 0.94,
  fatima: 1.2,
  ben: 0.85,
  sam: 1.05,
  elena: 1.26,
  chris: 0.9,
  greg: 0.68,
};
const DEFAULT_VOICE_RATE = 1.0;

function voiceRateFor(speaker: string): number {
  return VOICE_RATE_BY_SPEAKER[speaker.trim().toLowerCase()] ?? DEFAULT_VOICE_RATE;
}

export function initDialogueBoxUI(): void {
  const box = document.getElementById("dialogue-box")!;
  const speakerEl = document.getElementById("dialogue-speaker")!;
  const textEl = document.getElementById("dialogue-text")!;
  const continueEl = document.getElementById("dialogue-continue")!;

  let fullText = "";
  let revealed = 0;
  let rafId: number | null = null;
  let lastTime = 0;
  let voiceRate = DEFAULT_VOICE_RATE;
  let blipsPlayed = 0;

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

    // one blip roughly every 3 newly-revealed non-space characters — reads
    // as a steady mutter rather than a machine gun of individual clicks
    while (blipsPlayed * 3 < count) {
      blipsPlayed++;
      const ch = fullText[blipsPlayed * 3 - 1];
      if (ch && ch !== " ") {
        AudioManager.playSfx(SfxKey.TALK_BLIP, {
          volume: 0.32,
          rate: voiceRate * (0.94 + Math.random() * 0.12),
        });
      }
    }

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
    blipsPlayed = 0;
    voiceRate = voiceRateFor(line.speaker);
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
