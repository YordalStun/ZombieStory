import type { EditorLevelData } from "@/editor/types";

const MAX_HISTORY = 100;

/** Whole-state snapshot undo/redo — levels here are small (tens of tiles/props), so a JSON-clone-per-edit is cheap and, unlike a diff-based approach, can never drift out of sync with the live state. */
export class EditorHistory {
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  push(state: EditorLevelData): void {
    this.undoStack.push(JSON.stringify(state));
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): EditorLevelData | null {
    if (!this.canUndo()) return null;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    return JSON.parse(this.undoStack[this.undoStack.length - 1]) as EditorLevelData;
  }

  redo(): EditorLevelData | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    return JSON.parse(next) as EditorLevelData;
  }

  reset(state: EditorLevelData): void {
    this.undoStack = [JSON.stringify(state)];
    this.redoStack = [];
  }
}
