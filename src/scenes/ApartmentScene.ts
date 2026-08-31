import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH, PLAYER_NAME, STORY_FLAGS, type Checkpoint } from "@/config/constants";
import { TILESET_KEY, TILE, WALL_TILE_INDICES } from "@/gfx/tileset";
import { PropTex } from "@/gfx/props";
import { buildApartmentLevel, type ApartmentLevel, type PropSpec } from "@/data/levels/apartmentLevel";
import { Player, type MoveInput } from "@/core/entities/Player";
import { LightingManager } from "@/core/managers/LightingManager";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { ObjectiveManager } from "@/core/managers/ObjectiveManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { NIGHT_BROADCAST, MORNING_BROADCAST } from "@/data/dialogue/newsBroadcast";
import {
  DRESSER_LINES,
  SINK_LINES,
  KITCHEN_LINES,
  TV_MORNING_OFF_LINES,
  TV_MORNING_ON_LINES,
  KEYS_LINES,
  FRONT_DOOR_LINES,
  CAR_ENTER_LINES,
} from "@/data/dialogue/routineLines";
import { EventBus, Events } from "@/core/EventBus";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { setHudVisible, type PromptShowPayload } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { showEndSlate, hideMenu } from "@/ui/dom/MenuUI";

interface PropEntry {
  spec: PropSpec;
  sprite: Phaser.GameObjects.Image;
}

export class ApartmentScene extends Phaser.Scene {
  private checkpoint: Checkpoint = "NIGHT_CUTSCENE";
  private lighting!: LightingManager;
  private player!: Player;
  private moveInput!: MoveInput;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private propsById = new Map<string, PropEntry>();
  private sleepingFigure?: Phaser.GameObjects.Image;
  private focusedInteractable: string | null = null;
  private windowTile = { x: 0, y: 0 };
  private tvOn = true;

  constructor() {
    super(SceneKeys.APARTMENT);
  }

  init(data: { checkpoint?: Checkpoint }): void {
    this.checkpoint = data.checkpoint ?? "NIGHT_CUTSCENE";
    this.propsById.clear();
    this.tvOn = true;
    this.focusedInteractable = null;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(true);

    const level = buildApartmentLevel();
    const worldW = level.width * TILE_SIZE;
    const worldH = level.height * TILE_SIZE;

    const map = this.make.tilemap({ data: level.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const groundLayer = map.createLayer(0, tileset, 0, 0)!;
    groundLayer.setDepth(DEPTH.FLOOR);
    groundLayer.setCollision(WALL_TILE_INDICES);
    this.wallLayer = groundLayer;

    this.windowTile = {
      x: Math.floor(level.windowWorldPos.x / TILE_SIZE),
      y: Math.floor(level.windowWorldPos.y / TILE_SIZE),
    };

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    this.lighting = new LightingManager(this, 0x14141f, 0.08);
    this.lighting.makeLit(groundLayer);

    this.lighting.addLight("window", level.windowWorldPos.x, level.windowWorldPos.y, 50, 0x8fa8ff, 0.35);
    this.lighting.addLight("bathroom_light", level.bathroomLightPos.x, level.bathroomLightPos.y, 70, 0xdff4ff, 1.1);
    this.lighting.setEnabled("bathroom_light", false);
    this.lighting.addLight("kitchen_light", level.kitchenLightPos.x, level.kitchenLightPos.y, 90, 0xfff1d0, 1.1);
    this.lighting.setEnabled("kitchen_light", false);

    for (const spec of level.props) this.createProp(spec);

    const dressed = !!SaveManager.loadProgress()?.flags[STORY_FLAGS.DRESSED];
    this.player = new Player(this, level.playerStartBedroom.x, level.playerStartBedroom.y);
    this.player.setOutfit(dressed ? "dressed" : "pajama");
    this.lighting.makeLit(this.player);
    this.player.setControlsEnabled(false);

    this.physics.add.collider(this.player, this.wallLayer);
    for (const entry of this.propsById.values()) {
      if (entry.spec.solid) this.physics.add.collider(this.player, entry.sprite as Phaser.Physics.Arcade.Image);
    }

    this.setupInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting.destroy();
      AudioManager.stopLoop("tv");
      EventBus.emit(Events.PROMPT_HIDE);
      ObjectiveManager.clear();
    });

    if (this.checkpoint === "NIGHT_CUTSCENE") {
      void this.runNightSequence(level);
    } else {
      void this.startAtMorning(level);
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
      const w = Math.max(6, texW * 0.75);
      const h = Math.max(6, texH * 0.4);
      body.setSize(w, h);
      body.setOffset((texW - w) / 2, texH - h);
      body.updateFromGameObject();
      sprite = img;
    } else {
      sprite = this.add.image(spec.x, spec.y, spec.tex);
    }

    sprite.setDepth(DEPTH.ACTOR_SORT_BASE + spec.y);
    this.lighting.makeLit(sprite);

    if (spec.light) {
      this.lighting.addLight(spec.id, spec.x, spec.y, spec.light.radius, spec.light.color, spec.light.intensity, spec.light.flicker);
    }

    this.propsById.set(spec.id, { spec, sprite });
  }

  private async runNightSequence(level: ApartmentLevel): Promise<void> {
    this.sleepingFigure = this.add.image(level.bedCenter.x, level.bedCenter.y - 2, PropTex.SLEEPING_FIGURE);
    this.sleepingFigure.setDepth(DEPTH.ACTOR_SORT_BASE + level.bedCenter.y + 1);
    this.lighting.makeLit(this.sleepingFigure);
    this.player.setVisible(false);
    this.cameras.main.centerOn(level.bedCenter.x, level.bedCenter.y - 10);

    AudioManager.startLoop("tv", SfxKey.TV_HUM, 0.5);
    await fadeIn(1400);

    await DialoguePlayer.play(NIGHT_BROADCAST);

    await fadeOut(1600);
    await this.wait(500);

    this.sleepingFigure.destroy();
    this.sleepingFigure = undefined;
    this.player.setVisible(true);
    this.player.setPosition(level.playerStartBedroom.x, level.playerStartBedroom.y);

    this.transitionToMorningLighting(level);

    await fadeIn(1400);
    await DialoguePlayer.play(MORNING_BROADCAST);

    this.beginMorningFree();
  }

  private async startAtMorning(level: ApartmentLevel): Promise<void> {
    this.transitionToMorningLighting(level);
    AudioManager.startLoop("tv", SfxKey.TV_HUM, 0.5);
    this.beginMorningFree();
    await fadeIn(900);
  }

  private transitionToMorningLighting(level: ApartmentLevel): void {
    this.lighting.setAmbient(0x3a3f4a, 0.34);
    this.lighting.setEnabled("tv", this.tvOn);
    this.wallLayer.putTileAt(TILE.WINDOW_DAY, this.windowTile.x, this.windowTile.y);
    this.lighting.remove("window");
    this.lighting.addLight("window", level.windowWorldPos.x, level.windowWorldPos.y, 95, 0xffe9b0, 0.9);
  }

  private beginMorningFree(): void {
    this.player.setControlsEnabled(true);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    ObjectiveManager.set("Get ready for work.");
    SaveManager.saveCheckpoint("MORNING_ROUTINE");
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta, this.moveInput);
    this.lighting.update(time, delta);

    const lightLevel = this.lighting.getLightLevelAt(this.player.x, this.player.y);
    EventBus.emit(Events.LIGHT_LEVEL, lightLevel);

    this.updateInteractionFocus();

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
    for (const [id, entry] of this.propsById) {
      if (!entry.spec.interactable) continue;
      const dist = Phaser.Math.Distance.Between(entry.spec.x, entry.spec.y, this.player.x, this.player.y);
      if (dist <= entry.spec.interactable.range && dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    }

    this.focusedInteractable = closestId;

    if (closestId) {
      const entry = this.propsById.get(closestId)!;
      const screen = worldToScreen(this.cameras.main, entry.spec.x, entry.spec.y - 16);
      const payload: PromptShowPayload = {
        text: `[E] ${entry.spec.interactable!.prompt}`,
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
    switch (id) {
      case "tv":
        await this.interactTV();
        break;
      case "dresser":
        await this.interactFlagged(STORY_FLAGS.DRESSED, DRESSER_LINES, () => this.player.setOutfit("dressed"));
        break;
      case "sink":
        await this.interactFlagged(STORY_FLAGS.WASHED_UP, SINK_LINES);
        break;
      case "counter":
        await this.interactFlagged(STORY_FLAGS.ATE, KITCHEN_LINES);
        break;
      case "bathroom_switch":
        this.toggleRoomLight("bathroom_switch", "bathroom_light");
        break;
      case "kitchen_switch":
        this.toggleRoomLight("kitchen_switch", "kitchen_light");
        break;
      case "keys":
        await this.interactKeys();
        break;
      case "front_door":
        await this.playLinesBlocking(FRONT_DOOR_LINES);
        break;
      case "car":
        await this.interactCar();
        break;
    }
  }

  private async interactTV(): Promise<void> {
    const entry = this.propsById.get("tv")!;
    this.tvOn = !this.tvOn;
    entry.sprite.setTexture(this.tvOn ? PropTex.TV_ON : PropTex.TV_OFF);
    this.lighting.setEnabled("tv", this.tvOn);

    if (this.tvOn) {
      AudioManager.startLoop("tv", SfxKey.TV_HUM, 0.5);
      AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.4 });
      await this.playLinesBlocking(TV_MORNING_ON_LINES);
    } else {
      AudioManager.stopLoop("tv");
      AudioManager.playSfx(SfxKey.TV_OFF, { volume: 0.6 });
      await this.playLinesBlocking(TV_MORNING_OFF_LINES);
    }
  }

  private async interactFlagged(
    flag: string,
    lines: { first: DialogueScript; repeat: DialogueScript },
    onFirst?: () => void,
  ): Promise<void> {
    const already = !!SaveManager.loadProgress()?.flags[flag];
    if (already) {
      await this.playLinesBlocking(lines.repeat);
      return;
    }
    await this.playLinesBlocking(lines.first);
    SaveManager.setFlag(flag, true);
    onFirst?.();
  }

  private toggleRoomLight(switchId: string, lightId: string): void {
    const entry = this.propsById.get(switchId)!;
    const nowOn = !this.lighting.isEnabled(lightId);
    this.lighting.setEnabled(lightId, nowOn);
    entry.sprite.setTexture(nowOn ? PropTex.SWITCH_ON : PropTex.SWITCH_OFF);
    AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.5 });
  }

  private async interactKeys(): Promise<void> {
    await this.playLinesBlocking(KEYS_LINES);
    if (!SaveManager.loadProgress()?.flags[STORY_FLAGS.GRABBED_KEYS]) {
      SaveManager.setFlag(STORY_FLAGS.GRABBED_KEYS, true);
      ObjectiveManager.set("Head out to the car.");
    }
  }

  private async interactCar(): Promise<void> {
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    ObjectiveManager.clear();

    await DialoguePlayer.play(CAR_ENTER_LINES);
    AudioManager.playSfx(SfxKey.CAR_ENGINE, { volume: 0.8 });
    SaveManager.saveCheckpoint("MORNING_ROUTINE", { [STORY_FLAGS.ENTERED_CAR]: true });

    await fadeOut(1400);
    AudioManager.stopLoop("tv");
    showEndSlate(
      "TO BE CONTINUED",
      `${PLAYER_NAME} pulls out of the driveway. The radio's already talking about road closures.`,
    );
    await this.wait(2800);

    hideMenu();
    this.scene.start(SceneKeys.MAIN_MENU);
  }
}
