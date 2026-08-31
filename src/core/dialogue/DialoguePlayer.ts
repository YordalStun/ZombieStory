import { EventBus, Events } from "@/core/EventBus";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";

/**
 * Drives a DialogueScript to completion: emits one DIALOGUE_LINE per line
 * and waits for a DIALOGUE_ADVANCE_REQUEST (fired by the DOM dialogue box
 * on player input) before showing the next. The DOM layer only renders —
 * this is the single source of truth for "where are we in the script."
 */
class DialoguePlayerClass {
  private active = false;

  isActive(): boolean {
    return this.active;
  }

  play(script: DialogueScript): Promise<void> {
    return new Promise((resolve) => {
      if (script.length === 0) {
        resolve();
        return;
      }
      this.active = true;
      let i = 0;

      const showLine = () => EventBus.emit(Events.DIALOGUE_LINE, script[i]);

      const onAdvance = () => {
        i++;
        if (i >= script.length) {
          EventBus.off(Events.DIALOGUE_ADVANCE_REQUEST, onAdvance);
          EventBus.emit(Events.DIALOGUE_HIDE);
          this.active = false;
          resolve();
        } else {
          showLine();
        }
      };

      EventBus.on(Events.DIALOGUE_ADVANCE_REQUEST, onAdvance);
      EventBus.emit(Events.DIALOGUE_SHOW);
      showLine();
    });
  }

  /**
   * Plays a script that advances itself once each line has had time to be
   * read, rather than waiting on the player. A click still skips a line
   * ahead immediately (same DIALOGUE_ADVANCE_REQUEST the dialogue box
   * always fires once its typewriter has finished) — it just isn't required.
   * For a radio broadcast or anything else that should keep talking whether
   * or not the player is clicking through it.
   */
  playAuto(script: DialogueScript, msPerChar = 42, minMs = 1800): Promise<void> {
    return new Promise((resolve) => {
      if (script.length === 0) {
        resolve();
        return;
      }
      this.active = true;
      let i = 0;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const onManualAdvance = () => advance();

      const advance = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        EventBus.off(Events.DIALOGUE_ADVANCE_REQUEST, onManualAdvance);
        i++;
        if (i >= script.length) {
          EventBus.emit(Events.DIALOGUE_HIDE);
          this.active = false;
          resolve();
        } else {
          showLine();
        }
      };

      const showLine = () => {
        EventBus.emit(Events.DIALOGUE_LINE, script[i]);
        EventBus.once(Events.DIALOGUE_ADVANCE_REQUEST, onManualAdvance);
        timer = setTimeout(advance, Math.max(minMs, script[i].text.length * msPerChar));
      };

      EventBus.emit(Events.DIALOGUE_SHOW);
      showLine();
    });
  }
}

export const DialoguePlayer = new DialoguePlayerClass();
