function fadeEl(): HTMLElement {
  return document.getElementById("fade-layer")!;
}

export function initFadeUI(): void {
  const el = fadeEl();
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
}

export function setFadeInstant(black: boolean): void {
  const el = fadeEl();
  el.style.transition = "none";
  el.style.opacity = black ? "1" : "0";
  el.style.pointerEvents = black ? "auto" : "none";
}

/** DOM-level fade covering canvas + UI alike (a Phaser camera fade would leave the DOM layer untouched). */
export function fadeOut(durationMs = 900): Promise<void> {
  const el = fadeEl();
  return new Promise((resolve) => {
    el.style.transition = `opacity ${durationMs}ms ease-in`;
    el.style.pointerEvents = "auto";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
    window.setTimeout(resolve, durationMs);
  });
}

export function fadeIn(durationMs = 900): Promise<void> {
  const el = fadeEl();
  return new Promise((resolve) => {
    el.style.transition = `opacity ${durationMs}ms ease-out`;
    requestAnimationFrame(() => {
      el.style.opacity = "0";
    });
    window.setTimeout(() => {
      el.style.pointerEvents = "none";
      resolve();
    }, durationMs);
  });
}
