import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH } from "@/config/constants";
import { TILESET_KEY, WALL_TILE_INDICES } from "@/gfx/tileset";
import { buildLeaveBuildingLevel, type LeaveBuildingVariant } from "@/data/levels/leaveBuildingLevel";
import type { PropSpec } from "@/data/levels/apartmentLevel";
import type { CoworkerSpec } from "@/data/levels/officeLevel";
import { Player, type MoveInput } from "@/core/entities/Player";
import { Zombie } from "@/core/entities/Zombie";
import { LightingManager } from "@/core/managers/LightingManager";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  CARPARK_ENTER_LINES,
  CARPARK_ZOMBIE_SEEN_LINES,
  CARPARK_GATEWAY_LINES,
  FORECOURT_DAD_SHOUT_LINES,
  GET_IN_CAR_LINES,
} from "@/data/dialogue/leaveBuildingLines";
import { EventBus, Events } from "@/core/EventBus";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { setHudVisible, type PromptShowPayload } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";

interface PropEntry {
  spec: PropSpec;
  sprite: Phaser.GameObjects.Image;
}

interface LeaveBuildingData {
  variant?: LeaveBuildingVariant;
}

const GATE_CENTER_TILE = { tx: 11, ty: 16 };

/**
 * Shared "walk past a zombie that does nothing, then reach the car" beat —
 * Path 1's car park and Path 2's forecourt are structurally identical
 * (dormant Zombie obstacle, then an interactable car), just dressed
 * differently, so one parameterized scene covers both.
 */
export class LeaveBuildingScene extends Phaser.Scene {
  private variant: LeaveBuildingVariant = "carpark";
  private lighting!: LightingManager;
  private player!: Player;
  private moveInput!: MoveInput;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private propsById = new Map<string, PropEntry>();
  private zombie!: Zombie;
  private focusedInteractable: string | null = null;
  private busy = true;
  private zombieSeen = false;
  private gatewaySeen = false;
  private dadShouted = false;

  constructor() {
    super(SceneKeys.LEAVE_BUILDING);
  }

  init(data: LeaveBuildingData): void {
    this.variant = data?.variant ?? "carpark";
    this.propsById.clear();
    this.focusedInteractable = null;
    this.busy = true;
    this.zombieSeen = false;
    this.gatewaySeen = false;
    this.dadShouted = false;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(true);

    const level = buildLeaveBuildingLevel(this.variant);
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

    this.lighting = new LightingManager(this, 0xb8bcc4, level.ambientLevel);
    this.lighting.makeLit(groundLayer);

    for (const spec of level.props) this.createProp(spec);
    for (const npc of level.npcs) this.createNpc(npc);

    this.zombie = new Zombie(this, level.zombieSpawn.x, level.zombieSpawn.y, { state: "dormant" });
    this.lighting.makeLit(this.zombie);

    this.player = new Player(this, level.playerStart.x, level.playerStart.y);
    this.player.setOutfit("dressed");
    this.lighting.makeLit(this.player);
    this.player.setControlsEnabled(false);

    this.physics.add.collider(this.player, this.wallLayer);
    this.physics.add.collider(this.player, this.zombie);
    this.physics.add.collider(this.zombie, this.wallLayer);
    for (const entry of this.propsById.values()) {
      if (!entry.spec.solid) continue;
      this.physics.add.collider(this.player, entry.sprite as Phaser.Physics.Arcade.Image);
    }

    this.setupInput();
    this.cameras.main.setZoom(1.8);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting.destroy();
      EventBus.emit(Events.PROMPT_HIDE);
    });

    void this.openingBeat();
  }

  private async openingBeat(): Promise<void> {
    SaveManager.saveCheckpoint("LEAVE_BUILDING");
    await fadeIn(900);
    this.busy = false;
    this.player.setControlsEnabled(true);
    if (this.variant === "carpark") {
      await this.playLinesBlocking(CARPARK_ENTER_LINES);
    }
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
    this.lighting.makeLit(sprite);

    if (spec.light) {
      this.lighting.addLight(spec.id, spec.x, spec.y, spec.light.radius, spec.light.color, spec.light.intensity);
    }

    this.propsById.set(spec.id, { spec, sprite });
  }

  private createNpc(spec: CoworkerSpec): void {
    const img = this.add.image(spec.x, spec.y, spec.tex);
    img.setDepth(DEPTH.ACTOR_SORT_BASE + spec.y);
    if (spec.flip) img.setFlipX(true);
    this.lighting.makeLit(img);
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta, this.moveInput);
    this.zombie.update(time, delta, this.player.x, this.player.y);
    this.lighting.update(time, delta);
    EventBus.emit(Events.LIGHT_LEVEL, this.lighting.getLightLevelAt(this.player.x, this.player.y));

    if (this.busy) return;

    this.updateInteractionFocus();

    const distToZombie = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.zombie.x, this.zombie.y);

    if (!this.zombieSeen && distToZombie < 60) {
      this.zombieSeen = true;
      if (this.variant === "carpark") void this.playLinesBlocking(CARPARK_ZOMBIE_SEEN_LINES);
    }

    if (this.variant === "forecourt" && !this.dadShouted && distToZombie < 70) {
      this.dadShouted = true;
      void this.playLinesBlocking(FORECOURT_DAD_SHOUT_LINES);
    }

    if (this.variant === "carpark" && !this.gatewaySeen) {
      const gate = { x: GATE_CENTER_TILE.tx * TILE_SIZE, y: GATE_CENTER_TILE.ty * TILE_SIZE };
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, gate.x, gate.y) < 40) {
        this.gatewaySeen = true;
        void this.playLinesBlocking(CARPARK_GATEWAY_LINES);
      }
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.interactKey) &&
      !DialoguePlayer.isActive() &&
      this.player.areControlsEnabled()
    ) {
      void this.handleInteract(this.focusedInteractable);
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

    this.focusedInteractable = closestId;

    if (closestId) {
      const screen = worldToScreen(this.cameras.main, closestX, closestY - 16);
      const payload: PromptShowPayload = { text: `[E] ${closestPrompt}`, screenX: screen.x, screenY: screen.y };
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
    if (id === "car") await this.enterCar();
  }

  private async enterCar(): Promise<void> {
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    await this.playLinesBlocking(GET_IN_CAR_LINES);
    AudioManager.playSfx(SfxKey.DOOR, { volume: 0.5 });
    await fadeOut(1000);
    const next = this.variant === "carpark" ? SceneKeys.RETURN_DRIVE : SceneKeys.DAD_DRIVE;
    this.scene.start(next);
  }
}
