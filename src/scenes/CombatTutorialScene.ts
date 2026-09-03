import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH } from "@/config/constants";
import { TILESET_KEY, WALL_TILE_INDICES } from "@/gfx/tileset";
import {
  buildCombatTutorialLevel,
  type CombatTutorialVariant,
} from "@/data/levels/combatTutorialLevel";
import type { PropSpec } from "@/data/levels/apartmentLevel";
import { Player, type MoveInput } from "@/core/entities/Player";
import { LightingManager } from "@/core/managers/LightingManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { ObjectiveManager } from "@/core/managers/ObjectiveManager";
import { WeaponManager } from "@/core/managers/WeaponManager";
import { swingWeapon, updateHeldWeapon } from "@/core/combat/swing";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  DIRT_TRACK_START_LINES,
  GARDEN_START_LINES,
  SWING_TUTORIAL_LINES,
  LIGHT_TUTORIAL_LINES,
  TRACK_END_LINES,
  GATE_END_LINES,
} from "@/data/dialogue/combatTutorialLines";
import { EventBus, Events } from "@/core/EventBus";
import { setHudVisible } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";

interface PropEntry {
  spec: PropSpec;
  sprite: Phaser.GameObjects.Image;
}

interface CombatTutorialData {
  variant?: CombatTutorialVariant;
}

/**
 * Shared by both paths: a walk with nothing to fight (Danny "never has to
 * hit anyone" here) that exists purely to teach the swing control and point
 * out the light-level HUD indicator before the real encounter waiting at
 * home. Dirt track (Path 1) and garden-to-gate (Path 2) are the same scene
 * with different level data.
 */
export class CombatTutorialScene extends Phaser.Scene {
  private variant: CombatTutorialVariant = "dirtTrack";
  private lighting!: LightingManager;
  private player!: Player;
  private moveInput!: MoveInput;
  private swingKey!: Phaser.Input.Keyboard.Key;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private endPoint = { x: 0, y: 0 };
  private busy = true;
  private hasSwung = false;
  private ended = false;

  constructor() {
    super(SceneKeys.COMBAT_TUTORIAL);
  }

  init(data: CombatTutorialData): void {
    this.variant = data?.variant ?? "dirtTrack";
    this.busy = true;
    this.hasSwung = false;
    this.ended = false;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(true);
    // both variants are narrower than the camera's effective view width at
    // this zoom, so the world edges show through at the far left/right —
    // matches the tutorial's own dark mood rather than reading as a glitch
    this.cameras.main.setBackgroundColor(0x05060a);

    const level = buildCombatTutorialLevel(this.variant);
    this.endPoint = level.endPoint;
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

    // ambient COLOR (not just the ambientLevel float, which only drives the
    // HUD reading) is what actually controls rendered brightness — a near
    // black color here meant total darkness the instant you stepped out of
    // a lamp's pool, which read as broken rather than "night"
    this.lighting = new LightingManager(this, 0x4a5060, level.ambientLevel);
    this.lighting.makeLit(groundLayer);

    const propEntries: PropEntry[] = [];
    for (const spec of level.props) {
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
      propEntries.push({ spec, sprite });
    }

    this.player = new Player(this, level.playerStart.x, level.playerStart.y);
    this.player.setOutfit("dressed");
    this.lighting.makeLit(this.player);
    this.player.setControlsEnabled(false);

    this.physics.add.collider(this.player, this.wallLayer);
    for (const entry of propEntries) {
      if (!entry.spec.solid) continue;
      this.physics.add.collider(this.player, entry.sprite as Phaser.Physics.Arcade.Image);
    }

    this.setupInput();
    this.cameras.main.setZoom(2.1);
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
    this.swingKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
  }

  private async openingBeat(): Promise<void> {
    SaveManager.saveCheckpoint("COMBAT_TUTORIAL");
    ObjectiveManager.start(
      "Get moving",
      [
        { id: "practice_swing", label: "Swing the bat (F)" },
        { id: "reach_end", label: this.variant === "dirtTrack" ? "Follow the track" : "Get to the gate" },
      ],
      [],
    );

    await fadeIn(1000);
    await this.say(this.variant === "dirtTrack" ? DIRT_TRACK_START_LINES : GARDEN_START_LINES);
    await this.say(SWING_TUTORIAL_LINES);
    await this.say(LIGHT_TUTORIAL_LINES);
    this.busy = false;
    this.player.setControlsEnabled(true);
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta, this.moveInput);
    this.lighting.update(time, delta);
    EventBus.emit(Events.LIGHT_LEVEL, this.lighting.getLightLevelAt(this.player.x, this.player.y));

    if (this.busy || this.ended) return;

    const equippedWeapon = WeaponManager.getEquipped();
    updateHeldWeapon(this, this.player, equippedWeapon);

    if (Phaser.Input.Keyboard.JustDown(this.swingKey) && this.player.areControlsEnabled() && equippedWeapon) {
      swingWeapon(this, this.player, equippedWeapon, []);
      if (!this.hasSwung) {
        this.hasSwung = true;
        ObjectiveManager.complete("practice_swing");
      }
    }

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.endPoint.x, this.endPoint.y);
    if (dist < 24) {
      void this.finish();
    }
  }

  private async finish(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    ObjectiveManager.complete("reach_end");
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);

    await this.say(this.variant === "dirtTrack" ? TRACK_END_LINES : GATE_END_LINES);

    await fadeOut(1000);
    SaveManager.saveCheckpoint("COMBAT_TUTORIAL");
    this.scene.start(SceneKeys.HOME_ARRIVAL);
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }
}
