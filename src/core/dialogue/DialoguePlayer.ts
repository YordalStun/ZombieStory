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
}

export const DialoguePlayer = new DialoguePlayerClass();
