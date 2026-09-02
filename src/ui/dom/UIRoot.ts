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
    <div id="computer-overlay" class="hidden">
      <div id="computer-crt-frame">
        <div id="computer-crt-screen">
          <div id="computer-logo" class="hidden">
            <div class="computer-logo-mark">M</div>
            <div class="computer-logo-word">MERIDIAN</div>
            <div class="computer-logo-sub">office workstation</div>
          </div>
          <div id="computer-boot" class="hidden">
            <div id="computer-boot-log"></div>
          </div>
          <div id="computer-login" class="hidden">
            <div class="computer-login-box">
              <div class="computer-login-title">OFFICE-OS</div>
              <div class="computer-login-user">d.reyes</div>
              <div class="computer-login-field">
                <span>Password:</span>
                <span id="computer-login-password"></span>
              </div>
              <div id="computer-login-status"></div>
            </div>
          </div>
          <div id="computer-desktop" class="hidden">
            <div id="computer-icons"></div>
            <div id="computer-app-window" class="hidden">
              <div id="computer-app-titlebar">
                <span id="computer-app-title"></span>
                <button id="computer-app-close">&times;</button>
              </div>
              <div id="computer-app-body"></div>
            </div>
            <div id="computer-taskbar">
              <span id="computer-taskbar-start">OFFICE-OS</span>
              <span id="computer-clock"></span>
              <button id="computer-power-off" title="Step away (Esc)">⏻</button>
            </div>
          </div>
          <div id="computer-crt-scanlines"></div>
          <div id="computer-crt-vignette"></div>
        </div>
      </div>
      <div id="computer-exit-hint">ESC to step away from the desk</div>
    </div>
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
  // Deliberately built from camera.worldView, not camera.scrollX/scrollY.
  // Those two stop agreeing once the camera is both zoomed and pinned
  // against its bounds (e.g. following the player into a desk pod near the
  // level edge, which happens for roughly half the office's pods): scrollX
  // keeps reporting the *unclamped* follow target, while worldView is
  // Phaser's own authoritative post-clamp visible rect and always matches
  // what's actually drawn. Using scrollX there put the prompt hundreds of
  // px away from the thing it was labelling — sometimes off-screen
  // entirely, which is what read as "talking to nobody".
  const view = camera.worldView;
  // Rounded because this is recomputed every frame against a lerped
  // (continuously, fractionally drifting) camera-follow scroll — left
  // unrounded, a CSS left/top in fractional px redraws slightly differently
  // every frame, which reads as the prompt text jittering/"floating" in
  // place, worse the higher the zoom.
  return {
    x: Math.round(((worldX - view.x) / view.width) * camera.width * currentScale),
    y: Math.round(((worldY - view.y) / view.height) * camera.height * currentScale),
  };
}
