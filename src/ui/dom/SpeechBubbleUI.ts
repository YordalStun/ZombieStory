import { EventBus, Events } from "@/core/EventBus";
import type { DialogueLine } from "@/core/dialogue/DialogueTypes";
import { SpeakerRegistry } from "@/core/managers/SpeakerRegistry";

/** Kept clear of the very edge so the marker never clips the viewport itself. */
const MARGIN = 22;

/**
 * A small marker that tracks whoever's currently speaking, so it's always
 * clear who a line belongs to even with several characters on screen (or
 * with the speaker off-screen entirely) — the dialogue box's speaker name
 * only helps once you've already read down to it. Sits alongside, not
 * instead of, the dialogue box: this only ever shows a name + a pointer,
 * never the line's text.
 *
 * When SpeakerRegistry has no position for the current speaker (no scene
 * provider registered, or an unnamed narrator like "NEWSLINE"), it just
 * stays hidden — existing scenes/dialogue are unaffected until wired up.
 */
export function initSpeechBubbleUI(): void {
  const root = document.getElementById("ui-root");
  const marker = document.getElementById("speech-marker")!;
  const label = document.getElementById("speech-marker-label")!;
  const arrow = document.getElementById("speech-marker-arrow")!;

  let currentSpeaker: string | null = null;
  let rafId: number | null = null;

  function stopTracking(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function track(): void {
    if (!currentSpeaker || !root) return;
    const pos = SpeakerRegistry.getScreenPos(currentSpeaker);
    if (!pos) {
      marker.classList.add("hidden");
      rafId = requestAnimationFrame(track);
      return;
    }

    const w = root.clientWidth || 1;
    const h = root.clientHeight || 1;
    const clampedX = Math.min(Math.max(pos.x, MARGIN), w - MARGIN);
    const clampedY = Math.min(Math.max(pos.y, MARGIN), h - MARGIN);
    const offscreen = clampedX !== pos.x || clampedY !== pos.y;

    marker.classList.remove("hidden");
    marker.classList.toggle("offscreen", offscreen);
    marker.style.left = `${clampedX}px`;
    marker.style.top = `${clampedY}px`;

    // The arrow's unrotated CSS shape already points straight down (see
    // speechbubble.css), which is exactly right for the on-screen case —
    // the marker sits just above the speaker's head. Off-screen, rotate it
    // to aim toward their real position; atan2's 0deg is "right" and 90deg
    // is "down" in screen coordinates, so subtracting 90 lines that up with
    // the shape's own down-pointing rest state.
    const angleDeg = offscreen
      ? Math.atan2(pos.y - clampedY, pos.x - clampedX) * (180 / Math.PI) - 90
      : 0;
    arrow.style.transform = `rotate(${angleDeg}deg)`;

    rafId = requestAnimationFrame(track);
  }

  EventBus.on(Events.DIALOGUE_LINE, (line: DialogueLine) => {
    currentSpeaker = line.speaker;
    label.textContent = line.speaker;
    stopTracking();
    track();
  });

  EventBus.on(Events.DIALOGUE_HIDE, () => {
    currentSpeaker = null;
    stopTracking();
    marker.classList.add("hidden");
  });
}
