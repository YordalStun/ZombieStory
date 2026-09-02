import Phaser from "phaser";
import "@/editor/ui/editor.css";
import { EditorScene } from "@/editor/EditorScene";
import { buildPalette } from "@/editor/ui/PalettePanel";
import { buildInspector } from "@/editor/ui/InspectorPanel";
import { BUILTIN_LEVELS } from "@/editor/builtinLevels";
import { downloadLevel, parseLevelJson, readFileAsText } from "@/editor/io";

const root = document.getElementById("editor-root")!;

// ---- static shell ----

const toolbar = document.createElement("div");
toolbar.className = "editor-toolbar";
root.appendChild(toolbar);

const body = document.createElement("div");
body.className = "editor-body";
root.appendChild(body);

const paletteEl = document.createElement("div");
paletteEl.className = "editor-palette";
body.appendChild(paletteEl);

const canvasWrap = document.createElement("div");
canvasWrap.className = "editor-canvas-wrap";
body.appendChild(canvasWrap);

const statusBar = document.createElement("div");
statusBar.className = "status-bar";
canvasWrap.appendChild(statusBar);

const sideEl = document.createElement("div");
sideEl.className = "editor-side";
body.appendChild(sideEl);

// ---- scene reference, filled in once Phaser has actually booted it ----
// (see the polling wait below the Phaser bootstrap — toolbar button
// closures below capture this binding and only ever read it on click,
// by which point boot has long since finished)
let scene: EditorScene;

// ---- toolbar contents ----

function toolbarTitle(text: string): void {
  const t = document.createElement("div");
  t.className = "title";
  t.textContent = text;
  toolbar.appendChild(t);
}

function toolbarButton(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = onClick;
  toolbar.appendChild(b);
  return b;
}

function toolbarSep(): void {
  const s = document.createElement("div");
  s.className = "sep";
  toolbar.appendChild(s);
}

toolbarTitle("Level Editor");

const selectToolBtn = toolbarButton("Select", () => scene.setTool({ type: "select" }));
const playTestBtn = toolbarButton("▶ Play Test", () => scene.togglePlayTest());
toolbarSep();

toolbarButton("New", () => {
  const w = Number(prompt("Width (tiles)", "30") ?? 30);
  const h = Number(prompt("Height (tiles)", "20") ?? 20);
  if (w > 0 && h > 0) scene.newLevel(w, h);
});
toolbarButton("Save (.json)", () => downloadLevel(scene.getLevel()));
const loadInput = document.createElement("input");
loadInput.type = "file";
loadInput.accept = "application/json";
loadInput.style.display = "none";
loadInput.onchange = async () => {
  const file = loadInput.files?.[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    const data = parseLevelJson(text);
    scene.loadLevel(data, true);
  } catch (e) {
    alert(`Couldn't load that file: ${e instanceof Error ? e.message : String(e)}`);
  }
  loadInput.value = "";
};
toolbar.appendChild(loadInput);
toolbarButton("Load (.json)", () => loadInput.click());

const builtinSelect = document.createElement("select");
const placeholderOpt = document.createElement("option");
placeholderOpt.textContent = "Open built-in level…";
placeholderOpt.value = "";
builtinSelect.appendChild(placeholderOpt);
BUILTIN_LEVELS.forEach((opt) => {
  const o = document.createElement("option");
  o.value = opt.id;
  o.textContent = opt.label;
  builtinSelect.appendChild(o);
});
builtinSelect.onchange = () => {
  const opt = BUILTIN_LEVELS.find((o) => o.id === builtinSelect.value);
  builtinSelect.value = "";
  if (!opt) return;
  if (scene.getLevel().props.length > 0 || scene.history.canUndo()) {
    if (!confirm(`Load "${opt.label}"? This replaces your current unsaved work in the editor (it never changes the real game files either way — save first if you want to keep this).`)) return;
  }
  scene.loadLevel(opt.load(), true);
};
toolbar.appendChild(builtinSelect);

toolbarSep();
const undoBtn = toolbarButton("Undo", () => scene.undo());
const redoBtn = toolbarButton("Redo", () => scene.redo());

toolbarSep();
const snapBtn = toolbarButton("Snap: On", () => {
  const next = !scene.snapToGrid;
  scene.setSnap(next);
  snapBtn.textContent = `Snap: ${next ? "On" : "Off"}`;
  snapBtn.classList.toggle("active", next);
});
snapBtn.classList.add("active");
const gridBtn = toolbarButton("Grid: On", () => {
  const next = gridBtn.textContent === "Grid: Off";
  scene.setGridVisible(next);
  gridBtn.textContent = `Grid: ${next ? "On" : "Off"}`;
  gridBtn.classList.toggle("active", next);
});
gridBtn.classList.add("active");

toolbarSep();
toolbarButton("Zoom −", () => scene.zoomBy(0.8));
toolbarButton("Zoom +", () => scene.zoomBy(1.25));
toolbarButton("Fit", () => scene.fitCameraToLevel());

const spacer = document.createElement("div");
spacer.className = "spacer";
toolbar.appendChild(spacer);

const backLink = document.createElement("a");
backLink.href = "./index.html";
backLink.textContent = "← Back to game";
backLink.style.color = "var(--text-dim)";
backLink.style.fontSize = "10px";
backLink.style.textDecoration = "none";
toolbar.appendChild(backLink);

// ---- status bar contents ----

const statusTool = document.createElement("span");
const statusCursor = document.createElement("span");
const statusZoom = document.createElement("span");
const statusCounts = document.createElement("span");
[statusTool, statusCursor, statusZoom, statusCounts].forEach((el) => statusBar.appendChild(el));

// ---- Phaser bootstrap ----

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: canvasWrap,
  width: canvasWrap.clientWidth || 960,
  height: canvasWrap.clientHeight || 640,
  backgroundColor: "#0a0a0d",
  pixelArt: true,
  // needed for Play Test mode's player movement/collision — otherwise
  // identical to edit mode, which never touches physics
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [EditorScene],
});

window.addEventListener("resize", () => {
  game.scale.resize(canvasWrap.clientWidth, canvasWrap.clientHeight);
});

function refreshHistoryButtons(): void {
  undoBtn.disabled = !scene.history.canUndo();
  redoBtn.disabled = !scene.history.canRedo();
}

function refreshToolButtons(): void {
  selectToolBtn.classList.toggle("active", scene.tool.type === "select");
}

// Phaser doesn't guarantee game.scene.keys["Editor"] is populated (let
// alone that create() has run) the instant `new Phaser.Game()` returns —
// polling a rAF loop for the scene's own isReady flag sidesteps that
// entirely instead of betting on exactly when boot/READY/create() land
// relative to each other.
function waitForScene(onReady: (scene: EditorScene) => void): void {
  const found = game.scene.keys["Editor"] as EditorScene | undefined;
  if (found?.isReady) {
    onReady(found);
  } else {
    requestAnimationFrame(() => waitForScene(onReady));
  }
}

waitForScene((readyScene) => {
  scene = readyScene;

  scene.events.on("level-changed", () => {
    statusCounts.innerHTML = `<b>${scene.getLevel().props.length}</b> props &nbsp; <b>${scene.getLevel().width}×${scene.getLevel().height}</b> tiles`;
    refreshHistoryButtons();
  });
  scene.events.on("tool-changed", () => {
    const t = scene.tool;
    statusTool.innerHTML = `Tool: <b>${t.type}</b>`;
    refreshToolButtons();
  });
  scene.events.on("zoom-changed", (z: number) => {
    statusZoom.innerHTML = `Zoom: <b>${z.toFixed(2)}×</b>`;
  });
  scene.events.on("cursor-moved", (p: { x: number; y: number }) => {
    statusCursor.innerHTML = `<b>${Math.round(p.x)}, ${Math.round(p.y)}</b>`;
  });
  scene.events.on("playtest-changed", (info: { active: boolean; usedDefaultSpawn?: boolean }) => {
    playTestBtn.textContent = info.active ? "■ Stop Test" : "▶ Play Test";
    playTestBtn.classList.toggle("active", info.active);
    paletteEl.classList.toggle("disabled-during-test", info.active);
    if (info.active) {
      statusTool.innerHTML = info.usedDefaultSpawn
        ? "<b>PLAY TESTING</b> (no player start set — spawned at level center) — WASD/Arrows, Esc to stop"
        : "<b>PLAY TESTING</b> — WASD/Arrows to move, Esc to stop";
    } else {
      statusTool.innerHTML = `Tool: <b>${scene.tool.type}</b>`;
    }
  });

  buildPalette(paletteEl, scene);
  buildInspector(sideEl, scene);

  statusTool.innerHTML = "Tool: <b>select</b>";
  statusZoom.innerHTML = `Zoom: <b>${scene.cameras.main.zoom.toFixed(2)}×</b>`;
  statusCounts.innerHTML = `<b>${scene.getLevel().props.length}</b> props &nbsp; <b>${scene.getLevel().width}×${scene.getLevel().height}</b> tiles`;
  refreshHistoryButtons();
  refreshToolButtons();
});
