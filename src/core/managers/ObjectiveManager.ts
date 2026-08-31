import { EventBus, Events } from "@/core/EventBus";

/**
 * Minimal quest/objective tracker. Today it's just a single line of
 * guidance text the HUD displays ("Get ready for work"). The API is
 * intentionally already shaped like a short queue so a real quest system
 * (multiple concurrent objectives, completion checks, rewards) can grow
 * out of this without a rewrite.
 */
class ObjectiveManagerClass {
  private current = "";

  set(text: string): void {
    this.current = text;
    EventBus.emit(Events.OBJECTIVE_SET, text);
  }

  get(): string {
    return this.current;
  }

  clear(): void {
    this.set("");
  }
}

export const ObjectiveManager = new ObjectiveManagerClass();
