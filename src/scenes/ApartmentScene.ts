import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH, PLAYER_NAME, STORY_FLAGS, type Checkpoint } from "@/config/constants";
import { TILESET_KEY, TILE, WALL_TILE_INDICES } from "@/gfx/tileset";
import { PropTex } from "@/gfx/props";
import {
  buildApartmentLevel,
  type ApartmentLevel,
  type PropSpec,
  BEDROOM_RECT,
  BATHROOM_RECT,
  KITCHEN_RECT,
  HALLWAY_RECT,
} from "@/data/levels/apartmentLevel";
import { Player, type MoveInput } from "@/core/entities/Player";
import { Dog } from "@/core/entities/Dog";
import { RainEffect } from "@/core/fx/RainEffect";
import { FxTex } from "@/gfx/fx";
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
  PICTURE_LINES,
  LAVA_LAMP_ON_LINES,
  LAVA_LAMP_OFF_LINES,
  COMPUTER_LINES,
  DOG_PET_LINES,
  DOG_WAKE_LINES,
  SHOWER_OFF_LINES,
  DOOR_LOCKED_HINTS,
} from "@/data/dialogue/routineLines";
import { EventBus, Events } from "@/core/EventBus";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { setHudVisible, type PromptShowPayload } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { showEndSlate, hideMenu } from "@/ui/dom/MenuUI";

const DOG_PET_RANGE = 24;

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
  private lavaLampOn = true;
  private dog!: Dog;
  private dogWoken = false;
  private rain?: RainEffect;
  private outsideThresholdX = 0;
  private isOutside = false;
  private doorUnlocked = false;
  private showerDripping = true;
  private showerDrip?: Phaser.Time.TimerEvent;
  private showerDripParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private roomOverlays = new Map<string, Phaser.GameObjects.Rectangle>();
  private currentRoomId: string | null = null;

  constructor() {
    super(SceneKeys.APARTMENT);
  }

  init(data: { checkpoint?: Checkpoint }): void {
    this.checkpoint = data.checkpoint ?? "NIGHT_CUTSCENE";
    this.propsById.clear();
    this.tvOn = true;
    this.lavaLampOn = true;
    this.focusedInteractable = null;
    this.dogWoken = false;
    this.isOutside = false;
    this.doorUnlocked = false;
    this.showerDripping = true;
    this.currentRoomId = null;
    this.roomOverlays.clear();
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
    this.lighting.setEnabled("kitchen_window_glow", false);
    this.setupShowerDrip();
    this.setupRoomOverlays();

    const dressed = !!SaveManager.loadProgress()?.flags[STORY_FLAGS.DRESSED];
    this.player = new Player(this, level.playerStartBedroom.x, level.playerStartBedroom.y);
    this.player.setOutfit(dressed ? "dressed" : "pajama");
    this.lighting.makeLit(this.player);
    this.player.setControlsEnabled(false);

    this.dog = new Dog(this, level.dogBedWorldPos.x, level.dogBedWorldPos.y);
    this.lighting.makeLit(this.dog);

    this.physics.add.collider(this.player, this.wallLayer);
    this.physics.add.collider(this.dog, this.wallLayer);
    for (const entry of this.propsById.values()) {
      if (!entry.spec.solid) continue;
      this.physics.add.collider(this.player, entry.sprite as Phaser.Physics.Arcade.Image);
      this.physics.add.collider(this.dog, entry.sprite as Phaser.Physics.Arcade.Image);
    }

    this.outsideThresholdX = level.outsideThresholdX;

    this.setupInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting.destroy();
      this.rain?.destroy();
      AudioManager.stopLoop("tv");
      AudioManager.stopLoop("rain");
      AudioManager.stopLoop("wind");
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
      this.lighting.addLight(
        spec.id,
        spec.x,
        spec.y,
        spec.light.radius,
        spec.light.color,
        spec.light.intensity,
        spec.light.flicker,
        spec.light.colorCycle,
      );
    }

    if (spec.sway) {
      const angle = 2.5 + Math.random() * 1.5;
      this.tweens.add({
        targets: sprite,
        angle: { from: -angle, to: angle },
        duration: 1800 + Math.random() * 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * 1000,
      });
    }

    this.propsById.set(spec.id, { spec, sprite });
  }

  private async runNightSequence(level: ApartmentLevel): Promise<void> {
    this.sleepingFigure = this.add.image(level.bedCenter.x, level.bedCenter.y - 2, PropTex.SLEEPING_FIGURE);
    this.sleepingFigure.setDepth(DEPTH.ACTOR_SORT_BASE + level.bedCenter.y + 1);
    this.lighting.makeLit(this.sleepingFigure);
    this.player.setVisible(false);
    this.cameras.main.centerOn(level.bedCenter.x, level.bedCenter.y - 10);

    AudioManager.startLoop("tv", SfxKey.TV_HUM, 0.24);
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
    AudioManager.startLoop("tv", SfxKey.TV_HUM, 0.24);
    this.beginMorningFree();
    await fadeIn(900);
  }

  private transitionToMorningLighting(level: ApartmentLevel): void {
    // gloomy, overcast, rainy morning — cool gray daylight, not warm sunshine
    this.lighting.setAmbient(0x3a4148, 0.26);
    this.lighting.setEnabled("tv", this.tvOn);
    this.wallLayer.putTileAt(TILE.WINDOW_DAY, this.windowTile.x, this.windowTile.y);
    this.lighting.remove("window");
    this.lighting.addLight("window", level.windowWorldPos.x, level.windowWorldPos.y, 95, 0xaab4bc, 0.55);

    const plants = level.props
      .filter((p) => p.tex === PropTex.TREE || p.tex === PropTex.BUSH)
      .map((p) => ({ x: p.x, y: p.y + (p.tex === PropTex.TREE ? 8 : 3) }));

    this.rain = new RainEffect(
      this,
      { xMin: level.outsideThresholdX, xMax: level.width * TILE_SIZE, yMin: 0, yMax: level.height * TILE_SIZE },
      [level.windowWorldPos, level.kitchenWindowWorldPos],
      plants,
    );

    AudioManager.startLoop("rain", SfxKey.RAIN, 0.18);
    AudioManager.startLoop("wind", SfxKey.WIND, 0.12);
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

  private setupShowerDrip(): void {
    const tub = this.propsById.get("bathtub");
    if (!tub) return;
    const x = tub.spec.x;
    const y = tub.spec.y - 10;

    const emitter = this.add.particles(0, 0, FxTex.RAIN_DROP, {
      x,
      y,
      lifespan: 350,
      speedY: { min: 20, max: 35 },
      alpha: { start: 0.7, end: 0 },
      scale: { min: 0.6, max: 0.9 },
      quantity: 1,
      frequency: 1500,
    });
    emitter.setDepth(DEPTH.WEATHER);
    this.showerDripParticles = emitter;

    this.showerDrip = this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (!this.showerDripping) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
        // tight enough to stay inside the bathroom — it was previously audible
        // through the wall from the bedroom and hallway
        if (dist < 58) AudioManager.playSfx(SfxKey.DRIP, { volume: 0.13 });
      },
    });
  }

  /** Rooms the player isn't currently in read as dimmer — a soft "can't really see in there" cue rather than true fog of war. */
  private setupRoomOverlays(): void {
    const rooms: Record<string, { x: number; y: number; w: number; h: number }> = {
      bedroom: BEDROOM_RECT,
      bathroom: BATHROOM_RECT,
      kitchen: KITCHEN_RECT,
      hallway: HALLWAY_RECT,
    };
    for (const [id, r] of Object.entries(rooms)) {
      const px = r.x * TILE_SIZE;
      const py = r.y * TILE_SIZE;
      const pw = r.w * TILE_SIZE;
      const ph = r.h * TILE_SIZE;
      const rect = this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x05050a, 1);
      rect.setDepth(DEPTH.WEATHER - 1);
      rect.setAlpha(0);
      this.roomOverlays.set(id, rect);
    }
  }

  private updateRoomDarkness(): void {
    const rooms: Record<string, { x: number; y: number; w: number; h: number }> = {
      bedroom: BEDROOM_RECT,
      bathroom: BATHROOM_RECT,
      kitchen: KITCHEN_RECT,
      hallway: HALLWAY_RECT,
    };
    let current: string | null = null;
    for (const [id, r] of Object.entries(rooms)) {
      const x0 = r.x * TILE_SIZE;
      const y0 = r.y * TILE_SIZE;
      const x1 = (r.x + r.w) * TILE_SIZE;
      const y1 = (r.y + r.h) * TILE_SIZE;
      if (this.player.x >= x0 && this.player.x <= x1 && this.player.y >= y0 && this.player.y <= y1) {
        current = id;
        break;
      }
    }

    if (current === this.currentRoomId) return;
    this.currentRoomId = current;
    for (const [id, rect] of this.roomOverlays) {
      const target = current === null || id === current ? 0 : 0.55;
      this.tweens.add({ targets: rect, alpha: target, duration: 350 });
    }
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta, this.moveInput);
    this.dog.update(time, delta, this.player.x, this.player.y);
    this.lighting.update(time, delta);

    if (this.lavaLampOn) {
      const color = this.lighting.getCurrentColor("lava_lamp");
      if (color !== undefined) this.propsById.get("lava_lamp")?.sprite.setTint(color);
    }

    const lightLevel = this.lighting.getLightLevelAt(this.player.x, this.player.y);
    EventBus.emit(Events.LIGHT_LEVEL, lightLevel);

    this.updateRoomDarkness();

    if (
      !this.dogWoken &&
      !DialoguePlayer.isActive() &&
      this.player.x >= KITCHEN_RECT.x * TILE_SIZE &&
      this.player.x <= (KITCHEN_RECT.x + KITCHEN_RECT.w) * TILE_SIZE &&
      this.player.y >= KITCHEN_RECT.y * TILE_SIZE &&
      this.player.y <= (KITCHEN_RECT.y + KITCHEN_RECT.h) * TILE_SIZE
    ) {
      this.dogWoken = true;
      this.dog.wake();
      void this.playLinesBlocking(DOG_WAKE_LINES);
    }

    if (this.outsideThresholdX > 0) {
      const outsideNow = this.player.x > this.outsideThresholdX;
      if (outsideNow !== this.isOutside) {
        this.isOutside = outsideNow;
        AudioManager.setLoopVolume("rain", outsideNow ? 0.55 : 0.18);
        AudioManager.setLoopVolume("wind", outsideNow ? 0.32 : 0.12);
      }
    }

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

    if (this.dog.isPettable()) {
      const dist = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, this.player.x, this.player.y);
      if (dist <= DOG_PET_RANGE && dist < closestDist) {
        closestDist = dist;
        closestId = "dog";
        closestX = this.dog.x;
        closestY = this.dog.y;
        closestPrompt = "Pet dog";
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
        await this.interactFrontDoor();
        break;
      case "car":
        await this.interactCar();
        break;
      case "picture":
        await this.playLinesBlocking(PICTURE_LINES);
        break;
      case "desk":
        await this.playLinesBlocking(COMPUTER_LINES);
        break;
      case "lava_lamp":
        await this.interactLavaLamp();
        break;
      case "dog":
        await this.interactDog();
        break;
      case "bathtub":
        await this.interactShower();
        break;
    }
  }

  /** The door is a real obstacle (physically solid) until the morning routine is done — it isn't just flavor text. */
  private async interactFrontDoor(): Promise<void> {
    const flags = SaveManager.loadProgress()?.flags ?? {};
    const required = [STORY_FLAGS.DRESSED, STORY_FLAGS.WASHED_UP, STORY_FLAGS.ATE, STORY_FLAGS.GRABBED_KEYS];
    const missing = required.find((flag) => !flags[flag]);

    if (missing) {
      await this.playLinesBlocking(DOOR_LOCKED_HINTS[missing]);
      return;
    }

    if (!this.doorUnlocked) {
      this.doorUnlocked = true;
      const door = this.propsById.get("front_door");
      const body = door?.sprite.body as Phaser.Physics.Arcade.StaticBody | undefined;
      if (body) body.enable = false;
      AudioManager.playSfx(SfxKey.DOOR, { volume: 0.6 });
    }
    await this.playLinesBlocking(FRONT_DOOR_LINES);
  }

  private async interactShower(): Promise<void> {
    if (!this.showerDripping) return;
    this.showerDripping = false;
    this.showerDrip?.remove();
    this.showerDripParticles?.stop();
    AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.4 });
    await this.playLinesBlocking(SHOWER_OFF_LINES);
  }

  private async interactDog(): Promise<void> {
    this.dog.pet();
    AudioManager.playSfx(SfxKey.INTERACT, { volume: 0.5 });
    await this.playLinesBlocking(DOG_PET_LINES);
  }

  private async interactLavaLamp(): Promise<void> {
    const entry = this.propsById.get("lava_lamp")!;
    this.lavaLampOn = !this.lavaLampOn;
    entry.sprite.setTexture(this.lavaLampOn ? PropTex.LAVA_LAMP_ON : PropTex.LAVA_LAMP_OFF);
    if (!this.lavaLampOn) entry.sprite.clearTint();
    this.lighting.setEnabled("lava_lamp", this.lavaLampOn);
    AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.4 });
    await this.playLinesBlocking(this.lavaLampOn ? LAVA_LAMP_ON_LINES : LAVA_LAMP_OFF_LINES);
  }

  private async interactTV(): Promise<void> {
    const entry = this.propsById.get("tv")!;
    this.tvOn = !this.tvOn;
    entry.sprite.setTexture(this.tvOn ? PropTex.TV_ON : PropTex.TV_OFF);
    this.lighting.setEnabled("tv", this.tvOn);

    if (this.tvOn) {
      AudioManager.startLoop("tv", SfxKey.TV_HUM, 0.24);
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

    // the kitchen light is also visible from outside, spilling out its exterior window
    if (lightId === "kitchen_light") this.lighting.setEnabled("kitchen_window_glow", nowOn);
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

    // camera holds exactly where it is — the drive-off plays out in a fixed shot
    this.cameras.main.stopFollow();
    this.player.setVisible(false);

    const carEntry = this.propsById.get("car");
    SaveManager.saveCheckpoint("MORNING_ROUTINE", { [STORY_FLAGS.ENTERED_CAR]: true });

    if (carEntry) {
      const car = carEntry.sprite as Phaser.Physics.Arcade.Image;
      (car.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      car.setDepth(DEPTH.ACTOR_SORT_BASE + 100000); // stay above everything for the drive-off, not y-sorted anymore
      car.setAngle(90); // turn to drive off rightward
      AudioManager.playSfx(SfxKey.CAR_ENGINE, { volume: 0.8 });

      const targetX = this.cameras.main.scrollX + this.cameras.main.width + 60;
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: car,
          x: targetX,
          duration: 2200,
          ease: "Cubic.easeIn",
          onComplete: () => resolve(),
        });
      });
    }

    await fadeOut(1200);
    showEndSlate(
      "TO BE CONTINUED",
      `${PLAYER_NAME} pulls out of the driveway. The radio's already talking about road closures.`,
    );
    // the fade-layer sits above the menu-layer (it has to, to cover the canvas too),
    // so it has to be lifted again or the end slate it just drew is invisible under it
    await fadeIn(600);
    await this.wait(2800);

    hideMenu();
    this.scene.start(SceneKeys.MAIN_MENU);
  }
}
