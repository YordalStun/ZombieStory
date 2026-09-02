import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH, PLAYER_NAME } from "@/config/constants";
import { TILESET_KEY, WALL_TILE_INDICES } from "@/gfx/tileset";
import { buildApartmentLevel, type PropSpec } from "@/data/levels/apartmentLevel";
import { Player, type MoveInput } from "@/core/entities/Player";
import { Zombie } from "@/core/entities/Zombie";
import { LightingManager } from "@/core/managers/LightingManager";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { ObjectiveManager } from "@/core/managers/ObjectiveManager";
import { WeaponManager } from "@/core/managers/WeaponManager";
import { swingWeapon } from "@/core/combat/swing";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  HOME_ARRIVAL_START_LINES,
  NOT_SAFE_LINES,
  ZOMBIE_DEAD_LINES,
  GO_INSIDE_LINES,
} from "@/data/dialogue/homeArrivalLines";
import { EventBus, Events } from "@/core/EventBus";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { setHudVisible, type PromptShowPayload } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { showEndSlate, hideMenu } from "@/ui/dom/MenuUI";

interface PropEntry {
  spec: PropSpec;
  sprite: Phaser.GameObjects.Image;
}

const PLAYER_SPAWN_TILE = { tx: 30, ty: 11 };
const ZOMBIE_SPAWN_TILE = { tx: 27, ty: 8 };

/**
 * Where both paths rejoin: a real, aggressive Zombie stands between the
 * street and the front door — the first time the player actually has to
 * fight, using the swing they only practiced on nothing until now. Reuses
 * buildApartmentLevel()'s exterior wholesale (same house the game opened
 * in) rather than modelling a second copy of it.
 */
export class HomeArrivalScene extends Phaser.Scene {
  private lighting!: LightingManager;
  private player!: Player;
  private moveInput!: MoveInput;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private swingKey!: Phaser.Input.Keyboard.Key;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private propsById = new Map<string, PropEntry>();
  private zombie!: Zombie;
  private focusedInteractable: string | null = null;
  private busy = true;
  private zombieDead = false;

  constructor() {
    super(SceneKeys.HOME_ARRIVAL);
  }

  init(): void {
    this.propsById.clear();
    this.focusedInteractable = null;
    this.busy = true;
    this.zombieDead = false;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(true);

    const level = buildApartmentLevel();
    const doorSpec = level.props.find((p) => p.id === "front_door");
    if (doorSpec?.interactable) doorSpec.interactable.prompt = "Go inside";

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

    // see CombatTutorialScene for why this needs to be a lighter color, not
    // a lower ambientLevel — the level float only feeds the HUD reading
    this.lighting = new LightingManager(this, 0x4a5060, 0.25);
    this.lighting.makeLit(groundLayer);

    for (const spec of level.props) this.createProp(spec);

    const zombieSpawn = { x: ZOMBIE_SPAWN_TILE.tx * TILE_SIZE + TILE_SIZE / 2, y: ZOMBIE_SPAWN_TILE.ty * TILE_SIZE + TILE_SIZE / 2 };
    this.zombie = new Zombie(this, zombieSpawn.x, zombieSpawn.y, { state: "aggressive" });
    this.lighting.makeLit(this.zombie);

    const playerSpawn = { x: PLAYER_SPAWN_TILE.tx * TILE_SIZE + TILE_SIZE / 2, y: PLAYER_SPAWN_TILE.ty * TILE_SIZE + TILE_SIZE / 2 };
    this.player = new Player(this, playerSpawn.x, playerSpawn.y);
    this.player.setOutfit("dressed");
    this.lighting.makeLit(this.player);
    this.player.setControlsEnabled(false);

    this.physics.add.collider(this.player, this.wallLayer);
    this.physics.add.collider(this.zombie, this.wallLayer);
    this.physics.add.collider(this.player, this.zombie);
    for (const entry of this.propsById.values()) {
      if (!entry.spec.solid) continue;
      this.physics.add.collider(this.player, entry.sprite as Phaser.Physics.Arcade.Image);
      this.physics.add.collider(this.zombie, entry.sprite as Phaser.Physics.Arcade.Image);
    }

    this.setupInput();
    this.cameras.main.setZoom(1.8);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting.destroy();
      EventBus.emit(Events.PROMPT_HIDE);
      ObjectiveManager.clear();
    });

    void this.openingBeat();
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
    this.swingKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
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

    if (spec.light) {
      this.lighting.addLight(spec.id, spec.x, spec.y, spec.light.radius, spec.light.color, spec.light.intensity, spec.light.flicker);
    }

    this.propsById.set(spec.id, { spec, sprite });
  }

  private async openingBeat(): Promise<void> {
    SaveManager.saveCheckpoint("HOME_ARRIVAL");
    ObjectiveManager.start("Get inside", [{ id: "kill_zombie", label: "Deal with it (F to swing)" }], []);

    await fadeIn(1000);
    await this.say(HOME_ARRIVAL_START_LINES);
    this.busy = false;
    this.player.setControlsEnabled(true);
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta, this.moveInput);
    // held off until controls are actually enabled — it was reaching the
    // player and "attacking" (colliding) mid-dialogue otherwise, before
    // there was any way to respond
    if (!this.busy && !this.zombieDead) this.zombie.update(time, delta, this.player.x, this.player.y);
    this.lighting.update(time, delta);
    EventBus.emit(Events.LIGHT_LEVEL, this.lighting.getLightLevelAt(this.player.x, this.player.y));

    if (this.busy) return;

    this.updateInteractionFocus();

    if (Phaser.Input.Keyboard.JustDown(this.swingKey) && this.player.areControlsEnabled() && !this.zombieDead) {
      const weapon = WeaponManager.getEquipped();
      if (weapon) {
        swingWeapon(this, this.player, weapon, [this.zombie]);
        if (this.zombie.state === "dead") {
          this.zombieDead = true;
          void this.onZombieDead();
        }
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

  private async onZombieDead(): Promise<void> {
    ObjectiveManager.complete("kill_zombie");
    await this.wait(700);
    await this.say(ZOMBIE_DEAD_LINES);
    ObjectiveManager.start("Get inside", [{ id: "go_inside", label: "Head through the front door" }], []);
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
    if (id !== "front_door") return;

    if (!this.zombieDead) {
      await this.playLinesBlocking(NOT_SAFE_LINES);
      return;
    }

    await this.goInside();
  }

  private async goInside(): Promise<void> {
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    ObjectiveManager.complete("go_inside");

    await this.say(GO_INSIDE_LINES);
    AudioManager.playSfx(SfxKey.DOOR, { volume: 0.5 });

    await fadeOut(1400);
    SaveManager.saveCheckpoint("HOME_ARRIVAL");
    showEndSlate("HOME.", `${PLAYER_NAME} is inside. For now, that's enough.`);
    await fadeIn(600);
    await this.wait(4000);
    hideMenu();
    this.scene.start(SceneKeys.MAIN_MENU);
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
