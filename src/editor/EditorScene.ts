import Phaser from "phaser";
import { TILE_SIZE } from "@/config/constants";
import { generateTileset } from "@/gfx/tileset";
import { generatePropTextures } from "@/gfx/props";
import { generateOfficeTextures } from "@/gfx/office";
import { generateCoworkerTextures } from "@/gfx/coworkerFigure";
import { generateFigureTextures } from "@/gfx/zombieFigure";
import { generatePlayerTextures, createPlayerAnimations } from "@/gfx/playerSpriteGen";
import { Player, type MoveInput } from "@/core/entities/Player";
import { TILESET_KEY, WALL_TILE_SET } from "@/editor/paletteData";
import { EditorHistory } from "@/editor/history";
import { newLevel, resizeTileGrid, type EditorLevelData, type PropSpec } from "@/editor/types";

export type MarkerKind = "playerStart" | "endPoint" | "zombieSpawn";

export type EditorTool =
  | { type: "select" }
  | { type: "tile"; tileIndex: number }
  | { type: "prop"; texKey: string; w: number; h: number }
  | { type: "marker"; which: MarkerKind };

const MARKER_STYLE: Record<MarkerKind, { color: number; label: string }> = {
  playerStart: { color: 0x4ade80, label: "START" },
  endPoint: { color: 0xfacc15, label: "END" },
  zombieSpawn: { color: 0xa855f7, label: "ZOMBIE" },
};

const TILE_COMPOSITE_KEY = "editor_tile_composite";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

/**
 * The editor's whole world lives on one Phaser scene: a regenerated
 * canvas texture for the tile grid (cheap to redraw per-cell, unlike
 * juggling Phaser's Tilemap API through arbitrary resizes), one Image
 * per placed prop using the game's own real texture keys, and Graphics
 * overlays for the grid, selection box, and start/end/zombie markers.
 * DOM panels drive this scene entirely through the public methods below
 * and listen for "level-changed" / "selection-changed" / "tool-changed"
 * on `scene.events` to stay in sync — there is no game-facing state here
 * at all, this scene never touches SaveManager or anything the running
 * game reads.
 */
export class EditorScene extends Phaser.Scene {
  /** Flips true at the end of create(), once textures exist and the scene can safely be wired up from outside — main.ts polls this rather than trusting exactly when Phaser's own boot/READY events land relative to create(). */
  isReady = false;
  level: EditorLevelData = newLevel();
  history = new EditorHistory();
  tool: EditorTool = { type: "select" };
  snapToGrid = true;
  selectedPropIndex: number | null = null;
  selectedMarker: MarkerKind | null = null;
  playTesting = false;

  private tileComposite!: Phaser.Textures.CanvasTexture;
  private tileImage!: Phaser.GameObjects.Image;
  private gridGfx!: Phaser.GameObjects.Graphics;
  private wallGfx!: Phaser.GameObjects.Graphics;
  private selectionGfx!: Phaser.GameObjects.Graphics;
  private propLayer!: Phaser.GameObjects.Container;
  private propSprites: Phaser.GameObjects.Image[] = [];
  private markerNodes: Record<MarkerKind, Phaser.GameObjects.Container | null> = {
    playerStart: null,
    endPoint: null,
    zombieSpawn: null,
  };

  private isPointerDown = false;
  private isPainting = false;
  private isPanning = false;
  private isDraggingProp = false;
  private dragOffset = { x: 0, y: 0 };
  private lastPanPoint = { x: 0, y: 0 };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private strokeSnapshot: string | null = null;
  private showGrid = true;
  private lastPaintCell: { x: number; y: number } | null = null;

  // ---- play test ----
  private player?: Player;
  private playMoveInput?: MoveInput;
  private wallColliders?: Phaser.Physics.Arcade.StaticGroup;
  private testedPropSprites: Phaser.GameObjects.Image[] = [];
  private preTestCamera: { zoom: number; scrollX: number; scrollY: number } | null = null;

  constructor() {
    super("Editor");
  }

  create(): void {
    generateTileset(this);
    generatePropTextures(this);
    generateOfficeTextures(this);
    generateCoworkerTextures(this);
    generateFigureTextures(this);
    generatePlayerTextures(this);
    createPlayerAnimations(this);

    this.propLayer = this.add.container(0, 0);
    this.gridGfx = this.add.graphics();
    this.wallGfx = this.add.graphics();
    this.selectionGfx = this.add.graphics();
    this.selectionGfx.setDepth(1000);

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.on("keydown-DELETE", () => this.deleteSelected());
    this.input.keyboard!.on("keydown-BACKSPACE", () => this.deleteSelected());
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.playTesting) this.stopPlayTest();
      else this.setTool({ type: "select" });
    });

    const kb = this.input.keyboard!;
    const cursors = kb.createCursorKeys();
    const w = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const a = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const s = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const d = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.playMoveInput = {
      left: () => cursors.left.isDown || a.isDown,
      right: () => cursors.right.isDown || d.isDown,
      up: () => cursors.up.isDown || w.isDown,
      down: () => cursors.down.isDown || s.isDown,
    };

    this.input.on("wheel", (pointer: Phaser.Input.Pointer, _go: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      const factor = dy > 0 ? 0.9 : 1.1;
      const newZoom = Phaser.Math.Clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const worldBefore = cam.getWorldPoint(pointer.x, pointer.y);
      cam.setZoom(newZoom);
      const worldAfter = cam.getWorldPoint(pointer.x, pointer.y);
      cam.scrollX += worldBefore.x - worldAfter.x;
      cam.scrollY += worldBefore.y - worldAfter.y;
      this.events.emit("zoom-changed", newZoom);
    });

    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.input.on("pointerupoutside", this.onPointerUp, this);

    this.loadLevel(this.level, true);
    this.isReady = true;
    this.events.emit("scene-ready");
  }

  update(time: number, delta: number): void {
    if (this.playTesting && this.player && this.playMoveInput) {
      this.player.update(time, delta, this.playMoveInput);
    }
  }

  // ---- public API used by the DOM UI ----

  loadLevel(data: EditorLevelData, resetHistory = false): void {
    // swapping level data out from under a live player/physics bodies
    // would orphan them — always leave play-test cleanly first
    if (this.playTesting) this.stopPlayTest();
    this.level = data;
    this.selectedPropIndex = null;
    this.selectedMarker = null;
    this.rebuildTileComposite();
    this.rebuildProps();
    this.rebuildMarkers();
    this.rebuildGrid();
    this.fitCameraToLevel();
    if (resetHistory) this.history.reset(this.level);
    this.events.emit("level-changed", this.level);
    this.events.emit("selection-changed", null);
  }

  getLevel(): EditorLevelData {
    return this.level;
  }

  newLevel(width: number, height: number): void {
    this.loadLevel(newLevel(width, height), true);
  }

  resizeLevel(width: number, height: number): void {
    if (this.playTesting) this.stopPlayTest();
    this.level = {
      ...this.level,
      width,
      height,
      tiles: resizeTileGrid(this.level.tiles, width, height),
    };
    this.rebuildTileComposite();
    this.rebuildGrid();
    this.commit();
  }

  setMeta(name: string, notes: string): void {
    this.level = { ...this.level, meta: { name, notes } };
    this.commit(false);
  }

  setAmbientLevel(v: number): void {
    this.level = { ...this.level, ambientLevel: v };
    this.commit(false);
  }

  setObjectives(title: string, steps: { id: string; label: string }[]): void {
    this.level = { ...this.level, objectives: { title, steps } };
    this.commit(false);
  }

  setTool(tool: EditorTool): void {
    this.tool = tool;
    this.events.emit("tool-changed", tool);
  }

  setSnap(v: boolean): void {
    this.snapToGrid = v;
  }

  setGridVisible(v: boolean): void {
    this.showGrid = v;
    this.gridGfx.setVisible(v);
  }

  zoomBy(factor: number): void {
    const cam = this.cameras.main;
    const z = Phaser.Math.Clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    cam.setZoom(z);
    this.events.emit("zoom-changed", z);
  }

  fitCameraToLevel(): void {
    const cam = this.cameras.main;
    const worldW = this.level.width * TILE_SIZE;
    const worldH = this.level.height * TILE_SIZE;
    cam.setBounds(-200, -200, worldW + 400, worldH + 400);
    const zoom = Phaser.Math.Clamp(Math.min(cam.width / (worldW + 40), cam.height / (worldH + 40)), MIN_ZOOM, 4);
    cam.setZoom(zoom);
    cam.centerOn(worldW / 2, worldH / 2);
    this.events.emit("zoom-changed", cam.zoom);
  }

  togglePlayTest(): void {
    if (this.playTesting) this.stopPlayTest();
    else this.startPlayTest();
  }

  /**
   * Spawns the real game Player entity (same sprite, speed, collision
   * shape as in-game) at the playerStart marker and lets you walk it
   * around with WASD/arrows against the level's actual wall tiles and
   * solid props — the fastest way to sanity-check scale, gaps, and
   * "can I actually get from A to B" without leaving the editor. Nothing
   * here is wired to SaveManager/ObjectiveManager/AudioManager/etc., so
   * it can't touch game save data even though it's the exact same Player
   * class the game itself uses.
   */
  private startPlayTest(): void {
    if (this.playTesting) return;
    this.deselect();
    this.setTool({ type: "select" });

    const cam = this.cameras.main;
    this.preTestCamera = { zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY };

    const usedDefaultSpawn = !this.level.playerStart;
    const spawn = this.level.playerStart ?? {
      x: (this.level.width * TILE_SIZE) / 2,
      y: (this.level.height * TILE_SIZE) / 2,
    };

    this.player = new Player(this, spawn.x, spawn.y);
    this.player.setOutfit("dressed");
    this.player.setDepth(50 + spawn.y);

    this.wallColliders = this.buildWallColliders();
    this.physics.add.collider(this.player, this.wallColliders);

    this.testedPropSprites = this.enablePropTestColliders();
    for (const sprite of this.testedPropSprites) {
      this.physics.add.collider(this.player, sprite);
    }

    cam.stopFollow();
    cam.setZoom(2.4);
    cam.startFollow(this.player, true, 0.1, 0.1);
    this.events.emit("zoom-changed", cam.zoom);

    this.playTesting = true;
    this.events.emit("playtest-changed", { active: true, usedDefaultSpawn });
  }

  private stopPlayTest(): void {
    if (!this.playTesting) return;

    this.player?.destroy();
    this.player = undefined;
    this.wallColliders?.destroy(true);
    this.wallColliders = undefined;
    this.testedPropSprites = [];
    // physics bodies were added directly to the live prop sprites — the
    // simplest way back to exactly edit mode's state is to just rebuild
    // them fresh, rather than trying to strip bodies off one at a time
    this.rebuildProps();

    const cam = this.cameras.main;
    cam.stopFollow();
    if (this.preTestCamera) {
      cam.setZoom(this.preTestCamera.zoom);
      cam.setScroll(this.preTestCamera.scrollX, this.preTestCamera.scrollY);
      this.events.emit("zoom-changed", cam.zoom);
    }
    this.preTestCamera = null;

    this.playTesting = false;
    this.events.emit("playtest-changed", { active: false });
  }

  private buildWallColliders(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        if (!WALL_TILE_SET.has(this.level.tiles[y]?.[x] ?? -1)) continue;
        const zone = this.add.zone(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        group.add(zone);
      }
    }
    return group;
  }

  /** Same body-shaping convention as the real scenes: a footprint roughly the base of the sprite, not its full bounding box, so tall props don't block from further away than they visually should. */
  private enablePropTestColliders(): Phaser.GameObjects.Image[] {
    const enabled: Phaser.GameObjects.Image[] = [];
    this.level.props.forEach((spec, i) => {
      if (!spec.solid) return;
      const img = this.propSprites[i];
      if (!img) return;
      this.physics.add.existing(img, true);
      const body = img.body as Phaser.Physics.Arcade.StaticBody;
      const texW = img.width;
      const texH = img.height;
      const w = Math.max(6, texW * 0.75);
      const h = Math.max(6, texH * 0.4);
      body.setSize(w, h);
      body.setOffset((texW - w) / 2, texH - h);
      body.updateFromGameObject();
      enabled.push(img);
    });
    return enabled;
  }

  undo(): void {
    if (this.playTesting) this.stopPlayTest();
    const prev = this.history.undo();
    if (prev) this.applyHistoryState(prev);
  }

  redo(): void {
    if (this.playTesting) this.stopPlayTest();
    const next = this.history.redo();
    if (next) this.applyHistoryState(next);
  }

  deleteSelected(): void {
    if (this.selectedPropIndex !== null) {
      this.level.props.splice(this.selectedPropIndex, 1);
      this.selectedPropIndex = null;
      this.rebuildProps();
      this.selectionGfx.clear();
      this.commit();
      this.events.emit("selection-changed", null);
    } else if (this.selectedMarker) {
      this.clearMarker(this.selectedMarker);
    }
  }

  clearMarker(which: MarkerKind): void {
    this.level = { ...this.level, [which]: null };
    this.rebuildMarkers();
    this.commit();
    this.events.emit("selection-changed", null);
  }

  updateSelectedProp(patch: Partial<PropSpec>): void {
    if (this.selectedPropIndex === null) return;
    const props = this.level.props.slice();
    props[this.selectedPropIndex] = { ...props[this.selectedPropIndex], ...patch };
    this.level = { ...this.level, props };
    this.refreshPropSprite(this.selectedPropIndex);
    this.updateSelectionBox();
    this.commit(false);
  }

  // ---- rendering ----

  private rebuildTileComposite(): void {
    const w = this.level.width * TILE_SIZE;
    const h = this.level.height * TILE_SIZE;
    if (this.textures.exists(TILE_COMPOSITE_KEY)) this.textures.remove(TILE_COMPOSITE_KEY);
    this.tileComposite = this.textures.createCanvas(TILE_COMPOSITE_KEY, Math.max(1, w), Math.max(1, h))!;
    const ctx = this.tileComposite.getContext();
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        this.drawTileCell(ctx, x, y, this.level.tiles[y]?.[x] ?? -1, false);
      }
    }
    this.tileComposite.refresh();
    if (this.tileImage) this.tileImage.destroy();
    this.tileImage = this.add.image(0, 0, TILE_COMPOSITE_KEY).setOrigin(0, 0).setDepth(-10);
    this.redrawWallOverlay();
  }

  private drawTileCell(ctx: CanvasRenderingContext2D, x: number, y: number, index: number, refresh: boolean): void {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.clearRect(px, py, TILE_SIZE, TILE_SIZE);
    if (index < 0) {
      ctx.fillStyle = "#1a1a1e";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#26262c";
      ctx.fillRect(px, py, TILE_SIZE / 2, TILE_SIZE / 2);
      ctx.fillRect(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
    } else {
      const src = this.textures.get(TILESET_KEY).getSourceImage() as CanvasImageSource;
      ctx.drawImage(src, index * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, px, py, TILE_SIZE, TILE_SIZE);
    }
    if (refresh) this.tileComposite.refresh();
  }

  private paintCell(x: number, y: number, index: number): void {
    if (x < 0 || y < 0 || x >= this.level.width || y >= this.level.height) return;
    if (this.level.tiles[y][x] !== index) {
      this.level.tiles[y][x] = index;
      this.drawTileCell(this.tileComposite.getContext(), x, y, index, true);
      this.redrawWallOverlay();
    }
    this.lastPaintCell = { x, y };
  }

  /**
   * Browsers coalesce rapid mousemove events (a fast real drag, not just a
   * scripted one, can jump several cells between two delivered events), so
   * painting only the sampled endpoint leaves visible gaps in a stroke.
   * Walk every cell on the line from the last painted cell to this one.
   */
  private paintLineTo(x: number, y: number, index: number): void {
    if (!this.lastPaintCell) {
      this.paintCell(x, y, index);
      return;
    }
    let x0 = this.lastPaintCell.x;
    let y0 = this.lastPaintCell.y;
    const dx = Math.abs(x - x0);
    const dy = -Math.abs(y - y0);
    const sx = x0 < x ? 1 : -1;
    const sy = y0 < y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.paintCell(x0, y0, index);
      if (x0 === x && y0 === y) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  private redrawWallOverlay(): void {
    this.wallGfx.clear();
    this.wallGfx.lineStyle(1, 0xff5555, 0.55);
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        if (WALL_TILE_SET.has(this.level.tiles[y]?.[x] ?? -1)) {
          this.wallGfx.strokeRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        }
      }
    }
  }

  private rebuildGrid(): void {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, 0x3a3a44, 0.5);
    const w = this.level.width * TILE_SIZE;
    const h = this.level.height * TILE_SIZE;
    for (let x = 0; x <= this.level.width; x++) {
      this.gridGfx.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, h);
    }
    for (let y = 0; y <= this.level.height; y++) {
      this.gridGfx.lineBetween(0, y * TILE_SIZE, w, y * TILE_SIZE);
    }
    this.gridGfx.setVisible(this.showGrid);
  }

  private rebuildProps(): void {
    this.propSprites.forEach((s) => s.destroy());
    this.propSprites = this.level.props.map((spec, i) => {
      const img = this.add.image(spec.x, spec.y, spec.tex).setOrigin(0.5, 0.5);
      if (spec.flipX) img.setFlipX(true);
      if (spec.flipY) img.setFlipY(true);
      if (typeof spec.tint === "number") img.setTint(spec.tint);
      img.setDepth(50 + spec.y);
      img.setInteractive({ cursor: "pointer" });
      img.on("pointerdown", (p: Phaser.Input.Pointer) => this.onPropPointerDown(i, p));
      this.propLayer.add(img);
      return img;
    });
  }

  private refreshPropSprite(index: number): void {
    const spec = this.level.props[index];
    const img = this.propSprites[index];
    if (!spec || !img) return;
    img.setTexture(spec.tex);
    img.setPosition(spec.x, spec.y);
    img.setFlipX(!!spec.flipX);
    img.setFlipY(!!spec.flipY);
    if (typeof spec.tint === "number") img.setTint(spec.tint);
    else img.clearTint();
    img.setDepth(50 + spec.y);
  }

  private rebuildMarkers(): void {
    (Object.keys(this.markerNodes) as MarkerKind[]).forEach((kind) => {
      this.markerNodes[kind]?.destroy();
      this.markerNodes[kind] = null;
      const pt = this.level[kind];
      if (!pt) return;
      const style = MARKER_STYLE[kind];
      const gfx = this.add.graphics();
      gfx.fillStyle(style.color, 0.9);
      gfx.fillCircle(0, 0, 6);
      gfx.lineStyle(2, 0x000000, 0.6);
      gfx.strokeCircle(0, 0, 6);
      const label = this.add.text(0, -18, style.label, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5, 0.5);
      const container = this.add.container(pt.x, pt.y, [gfx, label]);
      container.setDepth(2000);
      container.setSize(16, 16);
      container.setInteractive({ hitArea: new Phaser.Geom.Circle(0, 0, 10), hitAreaCallback: Phaser.Geom.Circle.Contains, cursor: "pointer" });
      container.on("pointerdown", (p: Phaser.Input.Pointer) => this.onMarkerPointerDown(kind, p));
      this.markerNodes[kind] = container;
    });
  }

  private updateSelectionBox(): void {
    this.selectionGfx.clear();
    if (this.selectedPropIndex === null) return;
    const spec = this.level.props[this.selectedPropIndex];
    const img = this.propSprites[this.selectedPropIndex];
    if (!spec || !img) return;
    const bw = img.displayWidth + 4;
    const bh = img.displayHeight + 4;
    this.selectionGfx.lineStyle(1.5, 0x66ccff, 1);
    this.selectionGfx.strokeRect(spec.x - bw / 2, spec.y - bh / 2, bw, bh);
  }

  // ---- pointer handling ----

  private worldPointer(p: Phaser.Input.Pointer): { x: number; y: number } {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    return { x: wp.x, y: wp.y };
  }

  private snapPoint(x: number, y: number): { x: number; y: number } {
    if (!this.snapToGrid) return { x, y };
    return {
      x: Math.floor(x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2,
      y: Math.floor(y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  private onPropPointerDown(index: number, pointer: Phaser.Input.Pointer): void {
    if (this.playTesting || this.tool.type !== "select" || this.spaceKey.isDown || pointer.button === 1) return;
    pointer.event.stopPropagation();
    this.selectProp(index);
    this.isDraggingProp = true;
    const spec = this.level.props[index];
    const wp = this.worldPointer(pointer);
    this.dragOffset = { x: wp.x - spec.x, y: wp.y - spec.y };
    this.strokeSnapshot = JSON.stringify(this.level);
  }

  private onMarkerPointerDown(kind: MarkerKind, pointer: Phaser.Input.Pointer): void {
    if (this.playTesting || this.tool.type !== "select" || this.spaceKey.isDown || pointer.button === 1) return;
    pointer.event.stopPropagation();
    this.selectMarker(kind);
    this.isDraggingProp = true;
    const pt = this.level[kind]!;
    const wp = this.worldPointer(pointer);
    this.dragOffset = { x: wp.x - pt.x, y: wp.y - pt.y };
    this.strokeSnapshot = JSON.stringify(this.level);
  }

  selectProp(index: number): void {
    this.selectedPropIndex = index;
    this.selectedMarker = null;
    this.updateSelectionBox();
    this.events.emit("selection-changed", { kind: "prop", index });
  }

  selectMarker(kind: MarkerKind): void {
    this.selectedMarker = kind;
    this.selectedPropIndex = null;
    this.selectionGfx.clear();
    this.events.emit("selection-changed", { kind: "marker", which: kind });
  }

  private deselect(): void {
    this.selectedPropIndex = null;
    this.selectedMarker = null;
    this.selectionGfx.clear();
    this.events.emit("selection-changed", null);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.playTesting) return;
    this.isPointerDown = true;

    if (this.spaceKey.isDown || pointer.button === 1) {
      this.isPanning = true;
      this.lastPanPoint = { x: pointer.x, y: pointer.y };
      return;
    }

    const wp = this.worldPointer(pointer);

    if (this.tool.type === "tile") {
      this.isPainting = true;
      this.strokeSnapshot = JSON.stringify(this.level);
      this.lastPaintCell = null;
      const cx = Math.floor(wp.x / TILE_SIZE);
      const cy = Math.floor(wp.y / TILE_SIZE);
      this.paintLineTo(cx, cy, pointer.rightButtonDown() ? -1 : this.tool.tileIndex);
      return;
    }

    if (this.tool.type === "prop") {
      const snapped = this.snapPoint(wp.x, wp.y);
      this.strokeSnapshot = JSON.stringify(this.level);
      const id = `${this.tool.texKey.replace(/^.*_/, "")}_${this.level.props.length}_${Math.floor(Math.random() * 1000)}`;
      const spec: PropSpec = { id, tex: this.tool.texKey, x: snapped.x, y: snapped.y };
      this.level.props.push(spec);
      this.rebuildProps();
      this.selectProp(this.level.props.length - 1);
      this.commit();
      return;
    }

    if (this.tool.type === "marker") {
      const snapped = this.snapPoint(wp.x, wp.y);
      this.strokeSnapshot = JSON.stringify(this.level);
      this.level = { ...this.level, [this.tool.which]: snapped };
      this.rebuildMarkers();
      this.setTool({ type: "select" });
      this.commit();
      return;
    }

    // select tool clicking empty space (prop/marker pointerdown already stopped propagation)
    this.deselect();
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    this.events.emit("cursor-moved", this.worldPointer(pointer));

    if (this.isPanning && this.isPointerDown) {
      const cam = this.cameras.main;
      cam.scrollX -= (pointer.x - this.lastPanPoint.x) / cam.zoom;
      cam.scrollY -= (pointer.y - this.lastPanPoint.y) / cam.zoom;
      this.lastPanPoint = { x: pointer.x, y: pointer.y };
      return;
    }

    if (this.isPainting && this.tool.type === "tile") {
      const wp = this.worldPointer(pointer);
      const cx = Math.floor(wp.x / TILE_SIZE);
      const cy = Math.floor(wp.y / TILE_SIZE);
      this.paintLineTo(cx, cy, pointer.rightButtonDown() ? -1 : this.tool.tileIndex);
      return;
    }

    if (this.isDraggingProp) {
      const wp = this.worldPointer(pointer);
      const target = this.snapPoint(wp.x - this.dragOffset.x, wp.y - this.dragOffset.y);
      if (this.selectedPropIndex !== null) {
        const spec = this.level.props[this.selectedPropIndex];
        spec.x = target.x;
        spec.y = target.y;
        this.refreshPropSprite(this.selectedPropIndex);
        this.updateSelectionBox();
      } else if (this.selectedMarker) {
        this.level = { ...this.level, [this.selectedMarker]: target };
        this.rebuildMarkers();
      }
    }
  }

  private onPointerUp(): void {
    this.isPointerDown = false;
    this.isPanning = false;
    if (this.isPainting || this.isDraggingProp) {
      this.isPainting = false;
      this.isDraggingProp = false;
      // a whole paint/drag stroke is one undo step, and a stroke that
      // never actually changed anything (e.g. picked up and put back down
      // in place) shouldn't clutter the history at all
      if (this.strokeSnapshot !== null && this.strokeSnapshot !== JSON.stringify(this.level)) {
        this.commit();
      }
      this.strokeSnapshot = null;
    }
  }

  // ---- history plumbing ----

  private commit(pushHistory = true): void {
    if (pushHistory) this.history.push(this.level);
    this.events.emit("level-changed", this.level);
  }

  private applyHistoryState(state: EditorLevelData): void {
    this.level = state;
    this.selectedPropIndex = null;
    this.selectedMarker = null;
    this.rebuildTileComposite();
    this.rebuildProps();
    this.rebuildMarkers();
    this.rebuildGrid();
    this.selectionGfx.clear();
    this.events.emit("level-changed", this.level);
    this.events.emit("selection-changed", null);
  }
}
