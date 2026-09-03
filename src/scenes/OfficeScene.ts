import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH, GAME_WIDTH, GAME_HEIGHT, STORY_FLAGS } from "@/config/constants";
import { TILESET_KEY, WALL_TILE_INDICES } from "@/gfx/tileset";
import { OfficeTex } from "@/gfx/office";
import { CoworkerTex } from "@/gfx/coworkerFigure";
import { PropTex } from "@/gfx/props";
import { CitySunsetTex } from "@/gfx/citySunset";
import { buildOfficeLevel, type OfficeLevel, type CoworkerSpec } from "@/data/levels/officeLevel";
import type { PropSpec } from "@/data/levels/apartmentLevel";
import { Player, type MoveInput } from "@/core/entities/Player";
import { LightingManager } from "@/core/managers/LightingManager";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { ObjectiveManager } from "@/core/managers/ObjectiveManager";
import { WeaponManager } from "@/core/managers/WeaponManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  PRIYA_LINES,
  MARK_LINES,
  GREG_LINES,
  BEN_LINES,
  SAM_LINES,
  ELENA_LINES,
  DANA_LINES,
  OWEN_LINES,
  FATIMA_LINES,
  CHRIS_LINES,
  PRINTER_LINES,
  WATER_COOLER_LINES,
  OFFICE_BROADCAST_LINES,
  TV_REPEAT_LINES,
  LOBBY_LINES,
  FIND_DESK_LINES,
  AT_DESK_LINES,
  NOT_YET_LINES,
} from "@/data/dialogue/officeLines";
import {
  HEAD_HOME_LINES,
  CHOSEN_DRIVE_LINES,
  CHOSEN_PICKUP_LINES,
  WINDOW_POV_LINES,
  DAD_OUTSIDE_LINES,
  DANA_GREETING_LINES,
  DANA_HEADS_UP_LINES,
  DANA_BAT_LINES,
  BOSS_STOP_LINES,
  DANNY_DEFIANT_LINES,
} from "@/data/dialogue/officeExitLines";
import { EventBus, Events } from "@/core/EventBus";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { setHudVisible, type PromptShowPayload } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { openComputer } from "@/ui/dom/ComputerUI";
import { showPathChoice } from "@/ui/dom/PathChoiceUI";

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
  ben: BEN_LINES,
  sam: SAM_LINES,
  greg: GREG_LINES,
  elena: ELENA_LINES,
  dana: DANA_LINES,
  owen: OWEN_LINES,
  fatima: FATIMA_LINES,
  chris: CHRIS_LINES,
};

const ARROW_DEPTH = 99999;

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
  private findingDesk = false;
  private deskArrow?: Phaser.GameObjects.Image;
  private deskComputerUnlocked = false;
  private emailsRead = false;
  private newsRead = false;
  private pathChosen = false;
  private pathDrive = false;

  constructor() {
    super(SceneKeys.OFFICE);
  }

  init(): void {
    this.findingDesk = false;
    this.deskArrow = undefined;
    this.propsById.clear();
    this.coworkersById.clear();
    this.focusedInteractable = null;
    this.broadcastPlayed = false;
    this.busy = true;
    this.deskComputerUnlocked = false;
    this.emailsRead = false;
    this.newsRead = false;
    this.pathChosen = false;
    this.pathDrive = false;
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
      ObjectiveManager.clear();
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

      // makes the floor feel occupied rather than staged — seated figures
      // get a tiny typing bob, standing ones a weight-shift sway, each on
      // its own random cycle so the room doesn't move in lockstep
      const baseY = img.y;
      const baseX = img.x;
      if (c.seated) {
        this.tweens.add({
          targets: img,
          y: baseY - 1,
          duration: 380 + Math.random() * 260,
          delay: Math.random() * 1000,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else {
        this.tweens.add({
          targets: img,
          x: baseX + (Math.random() < 0.5 ? -1 : 1),
          duration: 900 + Math.random() * 700,
          delay: Math.random() * 1200,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    // a small pulsing glow over each occupied desk's monitor — the cubicle
    // texture's own screen rect is static, this is what reads as "on"
    for (const c of level.coworkers) {
      if (!c.seated || !c.monitorPos) continue;
      const glow = this.add.image(c.monitorPos.x, c.monitorPos.y, OfficeTex.MONITOR_GLOW);
      glow.setDepth(DEPTH.ACTOR_SORT_BASE + c.monitorPos.y + 0.5);
      glow.setAlpha(0.7);
      this.lighting.makeLit(glow);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.45, to: 0.85 },
        duration: 900 + Math.random() * 600,
        delay: Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
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
    AudioManager.startLoop("office_hum", SfxKey.OFFICE_AMBIENCE, 0.5);

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

    if (
      !this.broadcastPlayed &&
      !DialoguePlayer.isActive() &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.level.tvWorldPos.x, this.level.tvWorldPos.y) <
        this.level.tvTriggerRadius
    ) {
      void this.triggerBroadcast();
    }

    this.updateDeskArrow();
  }

  /** Points above the player's head toward Danny's own desk until he's back at it. */
  private updateDeskArrow(): void {
    if (!this.findingDesk || !this.deskArrow) return;
    const target = this.level.playerDeskWorldPos;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    this.deskArrow.setPosition(this.player.x, this.player.y - 22);
    this.deskArrow.setRotation(angle);

    if (dist < 30) {
      this.findingDesk = false;
      this.deskArrow.destroy();
      this.deskArrow = undefined;
      ObjectiveManager.complete("return_desk");
      void this.playLinesBlocking(AT_DESK_LINES).then(() => {
        this.deskComputerUnlocked = true;
        ObjectiveManager.start(
          "At your desk",
          [
            { id: "read_emails", label: "Read your emails" },
            { id: "read_news", label: "Check the news" },
          ],
          [],
        );
      });
    }
  }

  private async useComputer(): Promise<void> {
    if (!this.deskComputerUnlocked) {
      await this.playLinesBlocking(NOT_YET_LINES);
      return;
    }
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);

    await openComputer({
      onEmailsRead: () => {
        this.emailsRead = true;
        ObjectiveManager.complete("read_emails");
      },
      onNewsRead: () => {
        this.newsRead = true;
        ObjectiveManager.complete("read_news");
      },
    });

    this.player.setControlsEnabled(true);
    if (this.emailsRead && this.newsRead && !this.pathChosen) {
      void this.beginHeadHomeSequence();
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
    if (id === "player_computer") {
      await this.useComputer();
      return;
    }
    if (id === "office_exit") {
      await this.handleExit();
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

  /**
   * Fires once, whichever comes first — walking into range or interacting
   * with the TV directly. Cuts away to a close-up "on the screen" shot for
   * the broadcast itself (same scrollFactor(0)-overlay technique as the
   * elevator intro), then cuts back and hands the player a new goal.
   */
  private async triggerBroadcast(): Promise<void> {
    if (this.broadcastPlayed) return;
    this.broadcastPlayed = true;
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);

    // scrollFactor(0) only cancels scroll — the main camera's 1.8x world
    // zoom still scales/clips it around the camera center, which crops off
    // the outer ~22% of the texture on every edge (this is where the
    // banner side-text and the live dot were disappearing to). Drop zoom
    // to 1 for the duration of the cutaway so the full 480x270 image maps
    // 1:1 onto the canvas, then restore it once we cut back to gameplay —
    // both changes happen while the screen is faded to black.
    const worldZoom = this.cameras.main.zoom;
    await fadeOut(500);
    this.cameras.main.setZoom(1);
    const screen = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, OfficeTex.TV_BROADCAST_SCREEN)
      .setScrollFactor(0)
      .setDepth(100000);
    await fadeIn(500);

    await DialoguePlayer.playAuto(OFFICE_BROADCAST_LINES);

    await fadeOut(500);
    screen.destroy();
    this.cameras.main.setZoom(worldZoom);
    await fadeIn(500);

    await this.beginFindDeskObjective();
  }

  private async beginFindDeskObjective(): Promise<void> {
    EventBus.emit(Events.PROMPT_HIDE);
    await DialoguePlayer.play(FIND_DESK_LINES);
    this.player.setControlsEnabled(true);

    ObjectiveManager.start("After the broadcast", [{ id: "return_desk", label: "Find your desk" }], []);
    this.findingDesk = true;
    this.deskArrow = this.add.image(this.player.x, this.player.y - 22, OfficeTex.DESK_ARROW).setDepth(ARROW_DEPTH);
    this.lighting.makeLit(this.deskArrow);
  }

  /** Fires once both emails and the news have been read — decide how to get home, then unlock the exit. */
  private async beginHeadHomeSequence(): Promise<void> {
    ObjectiveManager.clear();
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);

    await DialoguePlayer.play(HEAD_HOME_LINES);

    const choice = await showPathChoice("How do you want to get home?", [
      { id: "drive", label: "Text Mum & Dad", hint: "Drive yourself." },
      { id: "pickup", label: "Text Dad", hint: "Get him to come and collect you." },
    ]);
    this.pathDrive = choice === "drive";
    SaveManager.setFlag(STORY_FLAGS.PATH_DRIVE, this.pathDrive);

    if (this.pathDrive) {
      await DialoguePlayer.play(CHOSEN_DRIVE_LINES);
    } else {
      await DialoguePlayer.play(CHOSEN_PICKUP_LINES);
      // Right after Danny texts Dad, not after he's already left the
      // building — the timelapse is the time it takes Dad to drive over,
      // so cutting straight to seeing him waiting outside the window
      // afterwards actually tracks.
      await this.citySunsetCutscene();
      await this.windowWaitBeat();
    }

    this.pathChosen = true;
    this.player.setControlsEnabled(true);
    ObjectiveManager.start("Head home", [{ id: "leave_office", label: "Get to the exit" }], []);
  }

  /** Path 2 only: a short "waiting for Dad to reply" beat — moody pause, then his text comes through. */
  private async windowWaitBeat(): Promise<void> {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05060a, 0.5);
    overlay.setScrollFactor(0).setDepth(90000).setAlpha(0);

    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: overlay, alpha: 1, duration: 500, onComplete: () => resolve() });
    });
    await this.wait(500);
    await DialoguePlayer.play(WINDOW_POV_LINES);
    await this.wait(700);
    AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.5, rate: 0.6 });
    await DialoguePlayer.play(DAD_OUTSIDE_LINES);
    await this.wait(300);
    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: overlay, alpha: 0, duration: 500, onComplete: () => resolve() });
    });
    overlay.destroy();
  }

  /** Path 2 only: Dana jogs over and tosses Danny the cricket bat before he heads out. */
  private async giveBatBeat(): Promise<void> {
    const dana = this.coworkersById.get("dana");
    if (dana) {
      this.tweens.killTweensOf(dana.sprite);
      const letter = dana.spec.tex.slice(-1).toUpperCase();
      const standTex = CoworkerTex[`STAND_${letter}` as keyof typeof CoworkerTex];
      dana.sprite.setTexture(standTex);
      // stops a proper throwing distance away rather than right on top of
      // Danny — the whole point is a visible arc between the two of them
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: dana.sprite,
          x: this.player.x + 42,
          y: this.player.y,
          duration: 900,
          ease: "Sine.easeInOut",
          onComplete: () => resolve(),
        });
      });
    }

    await DialoguePlayer.play(DANA_GREETING_LINES);
    await DialoguePlayer.play(DANA_HEADS_UP_LINES);

    if (dana) {
      await this.throwBatVisual(dana.sprite.x, dana.sprite.y, this.player.x, this.player.y);
    }
    WeaponManager.pickUp("cricket_bat");

    await DialoguePlayer.play(DANA_BAT_LINES);
    await this.wait(200);

    if (dana) {
      this.tweens.add({ targets: dana.sprite, alpha: 0, duration: 400 });
    }
  }

  /** A real bat sprite, thrown in a visible two-stage arc (up, then down) and caught. */
  private throwBatVisual(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    return new Promise((resolve) => {
      const bat = this.add.image(fromX, fromY - 14, PropTex.BAT);
      bat.setDepth(DEPTH.ACTOR_SORT_BASE + Math.max(fromY, toY) + 20);
      this.lighting.makeLit(bat);
      AudioManager.playSfx(SfxKey.SWING, { volume: 0.45, rate: 1.15 });

      const midX = (fromX + toX) / 2;
      const peakY = Math.min(fromY, toY) - 30;

      this.tweens.add({
        targets: bat,
        x: midX,
        y: peakY,
        angle: 280,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: bat,
            x: toX,
            y: toY - 14,
            angle: 560,
            duration: 260,
            ease: "Sine.easeIn",
            onComplete: () => {
              AudioManager.playSfx(SfxKey.INTERACT, { volume: 0.45 });
              this.cameras.main.shake(120, 0.003);
              bat.destroy();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Path 1 only: the boss physically intercepts Danny at the door — Danny goes anyway. */
  private async bossInterceptBeat(): Promise<void> {
    const exit = this.propsById.get("office_exit")!;
    const boss = this.add.image(exit.spec.x, exit.spec.y + 18, CoworkerTex.STAND_K);
    boss.setDepth(DEPTH.ACTOR_SORT_BASE + exit.spec.y + 18);
    this.lighting.makeLit(boss);

    await this.wait(250);
    await DialoguePlayer.play(BOSS_STOP_LINES);
    await DialoguePlayer.play(DANNY_DEFIANT_LINES);

    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: boss, alpha: 0, x: boss.x - 16, duration: 500, onComplete: () => resolve() });
    });
    boss.destroy();
  }

  /**
   * Path 2 only, right before the office fades out for the day: a hard cut
   * away to a high-up view across the city, a timelapse sunset, then a hard
   * cut back to the office — now visibly dimmer, evening having fallen
   * while we were looking away — before the scene's own fade-to-black runs.
   * Hard cuts (set alpha straight to 1, then destroy) bookend the beat;
   * only the sky-to-sky progression itself crossfades, since that's the
   * one part that's actually meant to read as time passing smoothly.
   */
  private async citySunsetCutscene(): Promise<void> {
    const frames = [CitySunsetTex.DAY, CitySunsetTex.GOLDEN, CitySunsetTex.SUNSET, CitySunsetTex.DUSK, CitySunsetTex.NIGHT];
    const images = frames.map((tex) =>
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, tex).setScrollFactor(0).setDepth(200000).setAlpha(0),
    );
    images[0].setAlpha(1);

    await this.wait(600);
    for (let i = 1; i < images.length; i++) {
      await new Promise<void>((resolve) => {
        this.tweens.add({ targets: images[i], alpha: 1, duration: 1000, onComplete: () => resolve() });
      });
      await this.wait(450);
    }
    await this.wait(500);

    // ambient COLOR (not just the level float, which only drives the HUD
    // reading) is what actually controls rendered brightness — see
    // CombatTutorialScene for the fuller explanation
    this.lighting.setAmbient(0x2c3040, 0.12);
    images.forEach((img) => img.destroy());
  }

  private async handleExit(): Promise<void> {
    if (!this.pathChosen) {
      await this.playLinesBlocking(NOT_YET_LINES);
      return;
    }

    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);

    if (this.pathDrive) {
      await this.bossInterceptBeat();
    } else {
      await this.giveBatBeat();
    }

    ObjectiveManager.complete("leave_office");
    await fadeOut(1000);
    SaveManager.saveCheckpoint("LEAVE_BUILDING", { [STORY_FLAGS.PATH_DRIVE]: this.pathDrive });
    this.scene.start(SceneKeys.LEAVE_BUILDING, { variant: this.pathDrive ? "carpark" : "forecourt" });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
