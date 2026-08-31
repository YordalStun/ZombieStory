import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH, GAME_WIDTH } from "@/config/constants";
import { TILESET_KEY, WALL_TILE_INDICES } from "@/gfx/tileset";
import { OfficeTex } from "@/gfx/office";
import { buildOfficeLevel, type OfficeLevel, type CoworkerSpec } from "@/data/levels/officeLevel";
import type { PropSpec } from "@/data/levels/apartmentLevel";
import { Player, type MoveInput } from "@/core/entities/Player";
import { LightingManager } from "@/core/managers/LightingManager";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  PRIYA_LINES,
  MARK_LINES,
  GREG_LINES,
  ANNOYED_COWORKER_LINES,
  SAM_LINES,
  ELENA_LINES,
  PRINTER_LINES,
  WATER_COOLER_LINES,
  OFFICE_BROADCAST_LINES,
  TV_REPEAT_LINES,
  LOBBY_LINES,
} from "@/data/dialogue/officeLines";
import { EventBus, Events } from "@/core/EventBus";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { setHudVisible, type PromptShowPayload } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";

interface PropEntry {
  spec: PropSpec;
  sprite: Phaser.GameObjects.Image;
}

interface CoworkerEntry {
  spec: CoworkerSpec;
  sprite: Phaser.GameObjects.Image;
}

const COWORKER_LINES: Record<string, DialogueScript> = {
  priya: PRIYA_LINES,
  mark: MARK_LINES,
  annoyed: ANNOYED_COWORKER_LINES,
  sam: SAM_LINES,
  greg: GREG_LINES,
  elena: ELENA_LINES,
};

export class OfficeScene extends Phaser.Scene {
  private lighting!: LightingManager;
  private player!: Player;
  private moveInput!: MoveInput;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private propsById = new Map<string, PropEntry>();
  private coworkersById = new Map<string, CoworkerEntry>();
  private focusedInteractable: string | null = null;
  private level!: OfficeLevel;
  private broadcastPlayed = false;
  private busy = true;

  constructor() {
    super(SceneKeys.OFFICE);
  }

  init(): void {
    this.propsById.clear();
    this.coworkersById.clear();
    this.focusedInteractable = null;
    this.broadcastPlayed = false;
    this.busy = true;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(true);

    const level = buildOfficeLevel();
    this.level = level;
    const worldW = level.width * TILE_SIZE;
    const worldH = level.height * TILE_SIZE;

    const map = this.make.tilemap({ data: level.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const groundLayer = map.createLayer(0, tileset, 0, 0)!;
    groundLayer.setDepth(DEPTH.FLOOR);
    groundLayer.setCollision(WALL_TILE_INDICES);
    this.wallLayer = groundLayer;

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // flat, bright fluorescent-office lighting — no moody shadows here
    this.lighting = new LightingManager(this, 0xd6dbe2, 0.92);
    this.lighting.makeLit(groundLayer);
    this.lighting.addLight("tv_glow", level.tvWorldPos.x, level.tvWorldPos.y, 70, 0xaeeaff, 0.7);

    for (const spec of level.props) this.createProp(spec);
    this.createCoworkers(level);

    this.player = new Player(this, level.playerStart.x, level.playerStart.y);
    this.player.setOutfit("dressed");
    this.lighting.makeLit(this.player);
    this.player.setControlsEnabled(false);
    this.player.setVisible(false);

    this.physics.add.collider(this.player, this.wallLayer);
    for (const entry of this.propsById.values()) {
      if (!entry.spec.solid) continue;
      this.physics.add.collider(this.player, entry.sprite as Phaser.Physics.Arcade.Image);
    }

    this.setupInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting.destroy();
      AudioManager.stopLoop("office_hum");
      EventBus.emit(Events.PROMPT_HIDE);
    });

    void this.openingBeat(level);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    const cursors = kb.createCursorKeys();
    const w = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const a = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const s = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const d = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.moveInput = {
      left: () => cursors.left.isDown || a.isDown,
      right: () => cursors.right.isDown || d.isDown,
      up: () => cursors.up.isDown || w.isDown,
      down: () => cursors.down.isDown || s.isDown,
    };
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private createProp(spec: PropSpec): void {
    let sprite: Phaser.GameObjects.Image;

    if (spec.solid) {
      const img = this.physics.add.staticImage(spec.x, spec.y, spec.tex);
      const texW = img.width;
      const texH = img.height;
      const body = img.body as Phaser.Physics.Arcade.StaticBody;
      const w = spec.fullBody ? texW : Math.max(6, texW * 0.75);
      const h = spec.fullBody ? texH : Math.max(6, texH * 0.4);
      body.setSize(w, h);
      body.setOffset((texW - w) / 2, texH - h);
      body.updateFromGameObject();
      sprite = img;
    } else {
      sprite = this.add.image(spec.x, spec.y, spec.tex);
    }

    sprite.setDepth(spec.floorDecal ? DEPTH.FLOOR_DECAL : DEPTH.ACTOR_SORT_BASE + spec.y);
    if (spec.tint !== undefined) sprite.setTint(spec.tint);
    if (spec.flipX) sprite.setFlipX(true);
    if (spec.flipY) sprite.setFlipY(true);
    this.lighting.makeLit(sprite);

    this.propsById.set(spec.id, { spec, sprite });
  }

  private createCoworkers(level: OfficeLevel): void {
    for (const c of level.coworkers) {
      const img = this.add.image(c.x, c.y, c.tex);
      img.setDepth(DEPTH.ACTOR_SORT_BASE + c.y);
      if (c.flip) img.setFlipX(true);
      this.lighting.makeLit(img);
      if (c.interactable) {
        this.coworkersById.set(c.id, { spec: c, sprite: img });
      }
    }
  }

  /**
   * Doors-closed elevator, pinned to the camera (scrollFactor 0) and drawn
   * at a huge depth so it fully covers the tile world underneath while it's
   * up — same "build the next beat behind a black curtain" technique as
   * ApartmentScene's night->morning swap, just with an extra shot in front.
   */
  private async openingBeat(level: OfficeLevel): Promise<void> {
    const wall = this.add.image(0, 0, OfficeTex.ELEVATOR_WALL).setOrigin(0, 0).setScrollFactor(0).setDepth(100000);
    const doorL = this.add.image(0, 0, OfficeTex.ELEVATOR_DOOR).setOrigin(0, 0).setScrollFactor(0).setDepth(100001);
    const doorR = this.add
      .image(GAME_WIDTH / 2, 0, OfficeTex.ELEVATOR_DOOR)
      .setOrigin(0, 0)
      .setFlipX(true)
      .setScrollFactor(0)
      .setDepth(100001);

    this.cameras.main.centerOn(level.playerStart.x, level.playerStart.y);

    await fadeIn(1000);
    await this.wait(650);
    AudioManager.playSfx(SfxKey.ELEVATOR_DING, { volume: 0.7 });
    await this.wait(550);

    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: doorL, x: -GAME_WIDTH / 2 - 10, duration: 900, ease: "Cubic.easeInOut" });
      this.tweens.add({
        targets: doorR,
        x: GAME_WIDTH + 10,
        duration: 900,
        ease: "Cubic.easeInOut",
        onComplete: () => resolve(),
      });
    });
    await this.wait(500);

    await fadeOut(900);
    wall.destroy();
    doorL.destroy();
    doorR.destroy();

    this.player.setVisible(true);
    this.player.setControlsEnabled(true);
    this.cameras.main.setZoom(1.8);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    SaveManager.saveCheckpoint("OFFICE");
    AudioManager.startLoop("office_hum", SfxKey.TV_HUM, 0.05);

    await fadeIn(1000);
    this.busy = false;

    await this.playLinesBlocking(LOBBY_LINES);
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta, this.moveInput);
    this.lighting.update(time, delta);
    EventBus.emit(Events.LIGHT_LEVEL, this.lighting.getLightLevelAt(this.player.x, this.player.y));

    if (this.busy) return;

    this.updateInteractionFocus();

    if (
      Phaser.Input.Keyboard.JustDown(this.interactKey) &&
      !DialoguePlayer.isActive() &&
      this.player.areControlsEnabled()
    ) {
      void this.handleInteract(this.focusedInteractable);
    }

    if (!this.broadcastPlayed && !DialoguePlayer.isActive() && this.player.y > this.level.breakRoomTriggerY) {
      void this.triggerBroadcast();
    }
  }

  private updateInteractionFocus(): void {
    if (!this.player.areControlsEnabled() || DialoguePlayer.isActive()) {
      if (this.focusedInteractable) {
        this.focusedInteractable = null;
        EventBus.emit(Events.PROMPT_HIDE);
      }
      return;
    }

    let closestId: string | null = null;
    let closestDist = Infinity;
    let closestX = 0;
    let closestY = 0;
    let closestPrompt = "";

    for (const [id, entry] of this.propsById) {
      if (!entry.spec.interactable) continue;
      const dist = Phaser.Math.Distance.Between(entry.spec.x, entry.spec.y, this.player.x, this.player.y);
      if (dist <= entry.spec.interactable.range && dist < closestDist) {
        closestDist = dist;
        closestId = id;
        closestX = entry.spec.x;
        closestY = entry.spec.y;
        closestPrompt = entry.spec.interactable.prompt;
      }
    }

    for (const [id, entry] of this.coworkersById) {
      const interactable = entry.spec.interactable!;
      const dist = Phaser.Math.Distance.Between(entry.spec.x, entry.spec.y, this.player.x, this.player.y);
      if (dist <= interactable.range && dist < closestDist) {
        closestDist = dist;
        closestId = id;
        closestX = entry.spec.x;
        closestY = entry.spec.y;
        closestPrompt = interactable.prompt;
      }
    }

    this.focusedInteractable = closestId;

    if (closestId) {
      const screen = worldToScreen(this.cameras.main, closestX, closestY - 16);
      const payload: PromptShowPayload = {
        text: `[E] ${closestPrompt}`,
        screenX: screen.x,
        screenY: screen.y,
      };
      EventBus.emit(Events.PROMPT_SHOW, payload);
    } else {
      EventBus.emit(Events.PROMPT_HIDE);
    }
  }

  private async playLinesBlocking(script: DialogueScript): Promise<void> {
    const wasEnabled = this.player.areControlsEnabled();
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    await DialoguePlayer.play(script);
    if (wasEnabled) this.player.setControlsEnabled(true);
  }

  private async handleInteract(id: string | null): Promise<void> {
    if (!id) return;
    if (id === "tv") {
      await this.interactTV();
      return;
    }
    if (id === "water_cooler") {
      await this.playLinesBlocking(WATER_COOLER_LINES);
      return;
    }
    if (id === "printer") {
      await this.playLinesBlocking(PRINTER_LINES);
      return;
    }
    const lines = COWORKER_LINES[id];
    if (lines) await this.playLinesBlocking(lines);
  }

  private async interactTV(): Promise<void> {
    if (!this.broadcastPlayed) {
      await this.triggerBroadcast();
    } else {
      await this.playLinesBlocking(TV_REPEAT_LINES);
    }
  }

  /** Fires once, whichever comes first — walking into range or interacting with the TV directly. */
  private async triggerBroadcast(): Promise<void> {
    if (this.broadcastPlayed) return;
    this.broadcastPlayed = true;
    const wasEnabled = this.player.areControlsEnabled();
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    await DialoguePlayer.playAuto(OFFICE_BROADCAST_LINES);
    if (wasEnabled) this.player.setControlsEnabled(true);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
