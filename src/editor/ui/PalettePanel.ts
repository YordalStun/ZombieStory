import type { EditorScene } from "@/editor/EditorScene";
import { PALETTES, TILESET_KEY, type PaletteCategory, type PaletteEntry } from "@/editor/paletteData";
import { TILE_SIZE } from "@/config/constants";

const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  tiles: "Tiles",
  props: "Props",
  office: "Office",
  coworkers: "People",
  figures: "Figures",
};

function fullTextureDataURL(scene: Phaser.Scene, key: string): string {
  const src = scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
  return src.toDataURL();
}

function tileDataURL(scene: Phaser.Scene, index: number): string {
  const src = scene.textures.get(TILESET_KEY).getSourceImage() as HTMLCanvasElement;
  const c = document.createElement("canvas");
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, index * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
  return c.toDataURL();
}

export function buildPalette(container: HTMLElement, scene: EditorScene): void {
  const tabBar = document.createElement("div");
  tabBar.className = "tab-bar";
  const panels: Record<PaletteCategory, HTMLElement> = {} as Record<PaletteCategory, HTMLElement>;
  const tabButtons: Record<PaletteCategory, HTMLButtonElement> = {} as Record<PaletteCategory, HTMLButtonElement>;

  const categories: PaletteCategory[] = ["tiles", "props", "office", "coworkers", "figures"];

  function activate(cat: PaletteCategory): void {
    categories.forEach((c) => {
      panels[c].classList.toggle("active", c === cat);
      tabButtons[c].classList.toggle("active", c === cat);
    });
  }

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = CATEGORY_LABELS[cat];
    btn.onclick = () => activate(cat);
    tabBar.appendChild(btn);
    tabButtons[cat] = btn;
  });
  container.appendChild(tabBar);

  const swatchButtons: HTMLElement[] = [];

  categories.forEach((cat) => {
    const panel = document.createElement("div");
    panel.className = "tab-panel";
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent =
      cat === "tiles"
        ? "Click a tile, then paint on the canvas. Right-click erases."
        : "Click an object, then click the canvas to place it. Escape returns to Select.";
    panel.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "swatch-grid";
    panel.appendChild(grid);
    panels[cat] = panel;
    container.appendChild(panel);

    const entries: PaletteEntry[] = PALETTES[cat];
    entries.forEach((entry) => {
      const sw = document.createElement("div");
      sw.className = "swatch";
      sw.title = entry.label;

      const img = document.createElement("img");
      img.src = cat === "tiles" ? tileDataURL(scene, entry.tileIndex!) : fullTextureDataURL(scene, entry.key);
      if (cat === "tiles") img.className = "swatch-tile";
      sw.appendChild(img);

      const label = document.createElement("div");
      label.className = "swatch-label";
      label.textContent = entry.label;
      sw.appendChild(label);

      sw.onclick = () => {
        swatchButtons.forEach((b) => b.classList.remove("active"));
        sw.classList.add("active");
        if (cat === "tiles") {
          scene.setTool({ type: "tile", tileIndex: entry.tileIndex! });
        } else {
          scene.setTool({ type: "prop", texKey: entry.key, w: entry.w, h: entry.h });
        }
      };
      swatchButtons.push(sw);
      grid.appendChild(sw);
    });
  });

  activate("tiles");

  scene.events.on("tool-changed", (tool: { type: string }) => {
    if (tool.type !== "tile" && tool.type !== "prop") {
      swatchButtons.forEach((b) => b.classList.remove("active"));
    }
  });
}
