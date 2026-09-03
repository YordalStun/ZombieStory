import { SaveManager } from "@/core/managers/SaveManager";

const MIN = 0.5;
const MAX = 2;

/**
 * Applied to #game-root only — the canvas the Phaser game renders into —
 * never #ui-root, so dialogue/menu/HUD text stays legible no matter how
 * dark or bright the player has calibrated the game world itself.
 */
export function applyBrightness(value: number): void {
  const clamped = Math.min(MAX, Math.max(MIN, value));
  const root = document.getElementById("game-root");
  if (root) root.style.filter = `brightness(${clamped})`;
}

let layer: HTMLDivElement | null = null;

function build(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = "brightness-layer";
  el.className = "hidden";
  el.innerHTML = `
    <div class="brightness-panel">
      <h1 class="game-title small">CALIBRATE</h1>
      <p class="brightness-copy">Turn it up until you can just make out the mark in the dark. That's about how dim the shadows will look once the lights start going out.</p>
      <div class="brightness-stage"><div class="brightness-symbol">Z</div></div>
      <input type="range" id="brightness-slider" min="${MIN * 100}" max="${MAX * 100}" value="100" />
      <button class="menu-button" id="brightness-continue">Continue</button>
    </div>
  `;
  document.body.appendChild(el);

  const stage = el.querySelector<HTMLDivElement>(".brightness-stage")!;
  const slider = el.querySelector<HTMLInputElement>("#brightness-slider")!;
  slider.addEventListener("input", () => {
    stage.style.filter = `brightness(${Number(slider.value) / 100})`;
  });

  return el;
}

/**
 * Full-screen "adjust until you can just make out the mark" calibration,
 * shown once at boot before the player ever sees the main menu — this game
 * leans hard on real darkness (Light2D-gated zombie aggro, rooms you turn
 * the lights out on), so what actually reads as "dark" varies a lot by
 * monitor. The slider's own value becomes Settings.brightness, applied as a
 * CSS filter on the canvas both immediately and on every future boot.
 */
export function showBrightnessCalibration(onDone: () => void): void {
  if (!layer) layer = build();
  layer.classList.remove("hidden");

  const stage = layer.querySelector<HTMLDivElement>(".brightness-stage")!;
  const slider = layer.querySelector<HTMLInputElement>("#brightness-slider")!;
  const continueBtn = layer.querySelector<HTMLButtonElement>("#brightness-continue")!;

  const stored = SaveManager.loadSettings().brightness;
  slider.value = String(Math.round(stored * 100));
  stage.style.filter = `brightness(${stored})`;

  continueBtn.addEventListener(
    "click",
    () => {
      const value = Number(slider.value) / 100;
      SaveManager.updateSettings({ brightness: value });
      applyBrightness(value);
      layer!.classList.add("hidden");
      onDone();
    },
    { once: true },
  );
}
