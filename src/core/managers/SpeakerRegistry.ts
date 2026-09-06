/**
 * Lets whichever scene is active tell the DOM speech-bubble layer (see
 * ui/dom/SpeechBubbleUI.ts) where a named speaker currently is on screen,
 * without the DOM layer ever needing a reference to a live Phaser scene or
 * camera. Keyed by lowercase speaker name so a dialogue line's `speaker`
 * field ("Mum", "Dana", PLAYER_NAME) can be looked up directly.
 *
 * A getter, not a snapshot: it's re-invoked every frame the bubble is on
 * screen, so it keeps tracking a character mid-walk-cycle, and can return
 * null at any time (character off-stage, already left, scene mid-teardown)
 * to just hide the bubble rather than pointing at a stale position.
 */
export type SpeakerPositionMap = Map<string, () => { x: number; y: number } | null>;

class SpeakerRegistryClass {
  private positions: SpeakerPositionMap | null = null;

  set(positions: SpeakerPositionMap | null): void {
    this.positions = positions;
  }

  getScreenPos(speaker: string): { x: number; y: number } | null {
    const getter = this.positions?.get(speaker.trim().toLowerCase());
    return getter ? getter() : null;
  }
}

export const SpeakerRegistry = new SpeakerRegistryClass();
