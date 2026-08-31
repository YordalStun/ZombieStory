import { EventBus, Events } from "@/core/EventBus";

export interface Objective {
  id: string;
  label: string;
  done: boolean;
}

export interface ObjectiveState {
  title: string;
  objectives: Objective[];
}

/**
 * Tracks the player's current checklist of objectives. Objective ids are the
 * same STORY_FLAGS strings the save file uses, so a checklist can always be
 * rebuilt from a loaded save rather than being state that drifts from it.
 *
 * Scenes ask `allComplete()` before letting the story move on — that's what
 * stops the player driving off before the morning routine is actually done.
 */
class ObjectiveManagerClass {
  private title = "";
  private objectives: Objective[] = [];

  /** Starts a checklist. `doneIds` pre-ticks entries, for resuming a save. */
  start(title: string, entries: Array<{ id: string; label: string }>, doneIds: string[] = []): void {
    this.title = title;
    this.objectives = entries.map((e) => ({ ...e, done: doneIds.includes(e.id) }));
    this.emit();
  }

  complete(id: string): void {
    const objective = this.objectives.find((o) => o.id === id);
    if (!objective || objective.done) return;
    objective.done = true;
    this.emit();
  }

  /** Still-outstanding objectives, in checklist order. */
  remaining(): Objective[] {
    return this.objectives.filter((o) => !o.done);
  }

  allComplete(): boolean {
    return this.objectives.length > 0 && this.objectives.every((o) => o.done);
  }

  clear(): void {
    this.title = "";
    this.objectives = [];
    this.emit();
  }

  private emit(): void {
    const state: ObjectiveState = { title: this.title, objectives: this.objectives.map((o) => ({ ...o })) };
    EventBus.emit(Events.OBJECTIVE_SET, state);
  }
}

export const ObjectiveManager = new ObjectiveManagerClass();
