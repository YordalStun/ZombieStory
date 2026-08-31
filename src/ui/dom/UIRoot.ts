import type Phaser from "phaser";
import { GAME_WIDTH } from "@/config/constants";

let currentScale = 1;

/**
 * Builds the DOM UI skeleton as a sibling of the Phaser canvas. Everything
 * text-bearing in the game (dialogue, HUD, menus) lives here instead of in
 * Phaser GameObjects, so it renders at native browser resolution — crisp
 * at any window size — while the canvas underneath stays a small, chunky
 * pixel-art surface. See syncViewport() for how the two stay aligned.
 */
export function initUIRoot(): HTMLDivElement {
  const app = document.getElementById("app");
  if (!app) throw new Error("#app root missing from index.html");
  app.style.position = "relative";

  const root = document.createElement("div");
  root.id = "ui-root";
  root.innerHTML = `
    <div id="hud-layer">
      <div id="objective-text" class="hidden"></div>
      <div id="light-indicator">
        <span id="light-dot" class="dark"></span>
        <span id="light-label">IN SHADOW</span>
      </div>
    </div>
    <div id="interact-prompt" class="hidden"></div>
    <div id="dialogue-box" class="hidden">
      <div id="dialogue-speaker"></div>
      <div id="dialogue-text"></div>
      <div id="dialogue-continue" class="hidden">&#9660;</div>
    </div>
    <div id="menu-layer" class="hidden"></div>
    <div id="fade-layer"></div>
  `;
  app.appendChild(root);
  return root;
}

/** Keeps #ui-root pixel-aligned with the Phaser canvas on every resize. */
export function syncViewport(game: Phaser.Game): void {
  const app = document.getElementById("app");
  const uiRoot = document.getElementById("ui-root");
  const canvas = game.canvas;
  if (!app || !uiRoot || !canvas) return;

  const appRect = app.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  uiRoot.style.left = `${canvasRect.left - appRect.left}px`;
  uiRoot.style.top = `${canvasRect.top - appRect.top}px`;
  uiRoot.style.width = `${canvasRect.width}px`;
  uiRoot.style.height = `${canvasRect.height}px`;

  // Used only for world<->screen coordinate math (interact prompts) — UI
  // text/chrome sizing is intentionally independent of this, see ui.css.
  currentScale = canvasRect.width / GAME_WIDTH || 1;
}

/** Converts a world-space point (in the given camera) to a px offset within #ui-root. */
export function worldToScreen(
  camera: Phaser.Cameras.Scene2D.Camera,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  // zoom defaults to 1 everywhere except OfficeScene, so this is a no-op
  // for every other scene's existing math
  return {
    x: (worldX - camera.scrollX) * camera.zoom * currentScale,
    y: (worldY - camera.scrollY) * camera.zoom * currentScale,
  };
}
