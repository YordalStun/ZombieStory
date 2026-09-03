import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { TILE_SIZE, DEPTH } from "@/config/constants";
import { TILESET_KEY, WALL_TILE_INDICES } from "@/gfx/tileset";
import {
  buildFamilyHouseGroundFloor,
  buildFamilyHouseUpperFloor,
  type FloorLevel,
  type SwitchSpec,
  type SwitchId,
  type FamilyMemberId,
  type PropSpec,
} from "@/data/levels/familyHouseLevel";
import { PropTex } from "@/gfx/props";
import { Player, type MoveInput } from "@/core/entities/Player";
import { Zombie, type AggroGate } from "@/core/entities/Zombie";
import { FamilyMemberController } from "@/core/entities/FamilyMember";
import { LightingManager } from "@/core/managers/LightingManager";
import { AudioManager, SfxKey, MusicKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { ObjectiveManager } from "@/core/managers/ObjectiveManager";
import { WeaponManager } from "@/core/managers/WeaponManager";
import { PlayerHealth } from "@/core/managers/PlayerHealth";
import { swingWeapon } from "@/core/combat/swing";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  HOUSE_DEFENSE_START_LINES,
  HORDE_ARRIVES_LINES,
  UPSTAIRS_FIRST_LINES,
  HALFWAY_LINES,
  HOUSE_DEFENSE_WIN_LINES,
  FAMILY_MEMBER_NAMES,
} from "@/data/dialogue/houseDefenseLines";
import { EventBus, Events } from "@/core/EventBus";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { setHudVisible, type PromptShowPayload } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { showEndSlate, hideMenu } from "@/ui/dom/MenuUI";

type FloorId = "ground" | "upper";

interface PropEntry {
  spec: PropSpec;
  sprite: Phaser.GameObjects.Image;
}

/** Persisted per-zombie state that survives a floor being torn down and rebuilt. */
interface ZombieRecord {
  breachIndex: number;
  health: number;
}

interface LiveZombie {
  zombie: Zombie;
  record: ZombieRecord;
}

const PLAYER_MAX_HP = 5;
const ZOMBIE_START_HEALTH = 3;
const TOTAL_ZOMBIES = 8;
const ZOMBIES_PER_FLOOR = 4;
const AGGRO_RANGE = 90;
const ATTACK_RANGE = 14;
const ATTACK_COOLDOWN_MS = 900;
const ATTACK_DAMAGE = 1;
const FAMILY_KILL_RADIUS = 10;
const FIRST_SPAWN_DELAY_MS = 1400;
const SPAWN_INTERVAL_MS = 7000;
const STAIRS_ARRIVAL_OFFSET = 14;

const FAMILY_TINT: Record<FamilyMemberId, number> = {
  mum: 0xe0a0c0,
  dad: 0x7fa0d8,
  sister: 0xf0c860,
  brother: 0x82c87a,
};

/**
 * "Turn off every light before the horde gets through" — Danny holds a
 * multi-floor house while Mum, Dad and the kids each go dark one room at a
 * time (FamilyMemberController). Zombies are gated by AggroGate (light +
 * proximity to Danny, see Zombie.ts) rather than always-on, and a fixed
 * total (TOTAL_ZOMBIES) spawn across both floors so there's a real "all
 * clear" to reach. Only one floor's worth of Phaser objects exists at a
 * time — ZombieRecord/lightsOff/familyDone are the plain-data state that
 * survives a loadFloor() teardown, so leaving and re-entering a floor never
 * resets its progress or resurrects a zombie that's already dead.
 */
export class HouseDefenseScene extends Phaser.Scene {
  private lighting!: LightingManager;
  private player!: Player;
  private moveInput!: MoveInput;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private swingKey!: Phaser.Input.Keyboard.Key;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private currentFloor: FloorId = "ground";
  private currentFloorData!: FloorLevel;

  private propsById = new Map<string, PropEntry>();
  private switchSprites = new Map<SwitchId, Phaser.GameObjects.Image>();
  private liveZombies: LiveZombie[] = [];
  private familyMembers: FamilyMemberController[] = [];
  private zombieLastAttack = new Map<Zombie, number>();
  private focusedInteractable: string | null = null;
  /** Arcade colliders don't clean themselves up when a tilemap layer they reference is destroyed — a stale one left over from the previous floor crashes the physics step on its next update(). Tracked explicitly so loadFloor() can destroy every one of them before tearing down the geometry they point at. */
  private colliders: Phaser.Physics.Arcade.Collider[] = [];

  private lightsOff: Record<SwitchId, boolean> = { living_room: false, kitchen: false, bedroom_a: false, bedroom_b: false };
  private familyDone: Record<FamilyMemberId, boolean> = { mum: false, dad: false, sister: false, brother: false };
  private groundRecords: ZombieRecord[] = [];
  private upperRecords: ZombieRecord[] = [];
  private groundSpawnedCount = 0;
  private upperSpawnedCount = 0;
  private spawnCountdown = 0;
  private zombiesKilled = 0;
  private hordeAnnounced = false;
  private halfwaySaid = false;
  private upperVisited = false;

  private busy = true;
  private ended = false;

  constructor() {
    super(SceneKeys.HOUSE_DEFENSE);
  }

  init(): void {
    this.propsById.clear();
    this.switchSprites.clear();
    this.liveZombies = [];
    this.familyMembers = [];
    this.zombieLastAttack = new Map();
    this.focusedInteractable = null;
    this.colliders = [];

    this.lightsOff = { living_room: false, kitchen: false, bedroom_a: false, bedroom_b: false };
    this.familyDone = { mum: false, dad: false, sister: false, brother: false };
    this.groundRecords = [];
    this.upperRecords = [];
    this.groundSpawnedCount = 0;
    this.upperSpawnedCount = 0;
    this.spawnCountdown = 0;
    this.zombiesKilled = 0;
    this.hordeAnnounced = false;
    this.halfwaySaid = false;
    this.upperVisited = false;
    this.currentFloor = "ground";

    this.busy = true;
    this.ended = false;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(true);
    PlayerHealth.reset(PLAYER_MAX_HP);

    this.lighting = new LightingManager(this, 0x3a3244, 0.3);

    this.player = new Player(this, 0, 0);
    this.player.setOutfit("dressed");
    this.lighting.makeLit(this.player);
    this.player.setControlsEnabled(false);

    this.setupInput();

    this.loadFloor("ground");
    this.player.setPosition(this.currentFloorData.entryAt.x, this.currentFloorData.entryAt.y);

    this.cameras.main.setZoom(1.8);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.lighting.destroy();
      EventBus.emit(Events.PROMPT_HIDE);
      ObjectiveManager.clear();
      AudioManager.stopMusic();
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

  // -------------------------------------------------------------------
  // Floor build / teardown
  // -------------------------------------------------------------------

  private loadFloor(floor: FloorId): void {
    if (this.wallLayer) {
      // Colliders don't clean themselves up when the geometry they
      // reference is destroyed — an old one left dangling crashes the next
      // physics step trying to read the now-gone tilemap layer.
      for (const collider of this.colliders) collider.destroy();
      this.colliders = [];
      for (const { zombie, record } of this.liveZombies) {
        if (zombie.state !== "dead") record.health = zombie.health;
        zombie.destroy();
      }
      this.liveZombies = [];
      for (const fm of this.familyMembers) fm.destroy();
      this.familyMembers = [];
      for (const entry of this.propsById.values()) entry.sprite.destroy();
      this.propsById.clear();
      for (const spr of this.switchSprites.values()) spr.destroy();
      this.switchSprites.clear();
      this.wallLayer.destroy();
    }

    this.currentFloor = floor;
    const data = floor === "ground" ? buildFamilyHouseGroundFloor() : buildFamilyHouseUpperFloor();
    this.currentFloorData = data;

    const worldW = data.width * TILE_SIZE;
    const worldH = data.height * TILE_SIZE;

    const map = this.make.tilemap({ data: data.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const groundLayer = map.createLayer(0, tileset, 0, 0)!;
    groundLayer.setDepth(DEPTH.FLOOR);
    groundLayer.setCollision(WALL_TILE_INDICES);
    this.wallLayer = groundLayer;

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.lighting.setAmbient(0x3a3244, data.ambientLevel);
    this.lighting.makeLit(groundLayer);

    for (const spec of data.props) this.createProp(spec);

    for (const sw of data.switches) {
      const off = this.lightsOff[sw.id];
      const spr = this.add.image(sw.x, sw.y, off ? PropTex.SWITCH_OFF : PropTex.SWITCH_ON);
      spr.setDepth(DEPTH.ACTOR_SORT_BASE + sw.y);
      this.lighting.makeLit(spr);
      this.switchSprites.set(sw.id, spr);

      this.lighting.addLight(sw.lightId, sw.lightX, sw.lightY, 70, 0xfff1d0, 0.85);
      this.lighting.setEnabled(sw.lightId, !off);
    }

    this.colliders.push(this.physics.add.collider(this.player, this.wallLayer));
    for (const entry of this.propsById.values()) {
      if (!entry.spec.solid) continue;
      this.colliders.push(this.physics.add.collider(this.player, entry.sprite as Phaser.Physics.Arcade.Image));
    }

    const records = floor === "ground" ? this.groundRecords : this.upperRecords;
    for (const record of records) this.spawnZombieFromRecord(record, data);

    for (const sw of data.switches) {
      if (this.lightsOff[sw.id]) continue;
      this.spawnFamilyMember(sw);
    }

    this.spawnCountdown = FIRST_SPAWN_DELAY_MS;
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

  // -------------------------------------------------------------------
  // Zombies
  // -------------------------------------------------------------------

  private spawnZombieFromRecord(record: ZombieRecord, data: FloorLevel): Zombie {
    const point = data.breachPoints[record.breachIndex % data.breachPoints.length];
    const zombie = new Zombie(this, point.x, point.y, { state: "dormant", health: record.health, alwaysHittable: true });
    this.lighting.makeLit(zombie);
    this.colliders.push(this.physics.add.collider(zombie, this.wallLayer));
    this.colliders.push(this.physics.add.collider(this.player, zombie));
    for (const entry of this.propsById.values()) {
      if (entry.spec.solid) this.colliders.push(this.physics.add.collider(zombie, entry.sprite as Phaser.Physics.Arcade.Image));
    }
    this.liveZombies.push({ zombie, record });
    return zombie;
  }

  private spawnNewZombie(): void {
    const records = this.currentFloor === "ground" ? this.groundRecords : this.upperRecords;
    const record: ZombieRecord = { breachIndex: records.length, health: ZOMBIE_START_HEALTH };
    records.push(record);
    const zombie = this.spawnZombieFromRecord(record, this.currentFloorData);

    AudioManager.playSfx(SfxKey.BANG, { volume: 0.5 });
    zombie.setScale(0.5);
    this.tweens.add({ targets: zombie, scale: 1, duration: 250, ease: "Back.Out" });

    if (!this.hordeAnnounced && !DialoguePlayer.isActive()) {
      this.hordeAnnounced = true;
      void this.playLinesBlocking(HORDE_ARRIVES_LINES);
    }
  }

  private updateSpawning(delta: number): void {
    const spawnedCount = this.currentFloor === "ground" ? this.groundSpawnedCount : this.upperSpawnedCount;
    if (spawnedCount >= ZOMBIES_PER_FLOOR) return;

    this.spawnCountdown -= delta;
    if (this.spawnCountdown > 0) return;
    this.spawnCountdown = SPAWN_INTERVAL_MS;

    this.spawnNewZombie();
    if (this.currentFloor === "ground") this.groundSpawnedCount++;
    else this.upperSpawnedCount++;
  }

  private reapDeadZombies(): void {
    const stillAlive: LiveZombie[] = [];
    let killedAny = false;
    for (const lz of this.liveZombies) {
      if (lz.zombie.state === "dead") {
        this.removeRecord(lz.record);
        this.zombiesKilled++;
        killedAny = true;
      } else {
        stillAlive.push(lz);
      }
    }
    this.liveZombies = stillAlive;
    if (killedAny) {
      this.refreshObjectives();
      this.checkWin();
    }
  }

  private removeRecord(record: ZombieRecord): void {
    const arr = this.currentFloor === "ground" ? this.groundRecords : this.upperRecords;
    const idx = arr.indexOf(record);
    if (idx >= 0) arr.splice(idx, 1);
  }

  private updateZombieAttacks(time: number): boolean {
    for (const { zombie } of this.liveZombies) {
      if (zombie.state !== "aggressive") continue;
      const dist = Phaser.Math.Distance.Between(zombie.x, zombie.y, this.player.x, this.player.y);
      if (dist > ATTACK_RANGE) continue;
      const last = this.zombieLastAttack.get(zombie) ?? -Infinity;
      if (time - last < ATTACK_COOLDOWN_MS) continue;

      this.zombieLastAttack.set(zombie, time);
      PlayerHealth.damage(ATTACK_DAMAGE);
      AudioManager.playSfx(SfxKey.BANG, { volume: 0.5 });
      this.cameras.main.shake(120, 0.006);
      if (PlayerHealth.isDead()) return true;
    }
    return false;
  }

  // -------------------------------------------------------------------
  // Family members / lights
  // -------------------------------------------------------------------

  private spawnFamilyMember(sw: SwitchSpec): void {
    const spawn = { x: sw.spawnX, y: sw.spawnY };
    const controller = new FamilyMemberController(
      this,
      spawn,
      { x: sw.x, y: sw.y },
      spawn,
      FAMILY_TINT[sw.familyMemberId],
      () => this.onLightFlipped(sw),
      () => undefined,
    );
    this.lighting.makeLit(controller.player);
    this.familyMembers.push(controller);
  }

  private updateFamilyMembers(time: number, delta: number): void {
    for (const fm of this.familyMembers) fm.update(time, delta);
    this.familyMembers = this.familyMembers.filter((fm) => fm.atRisk);
  }

  private checkFamilyKilled(): boolean {
    for (const { zombie } of this.liveZombies) {
      if (zombie.state !== "aggressive") continue;
      for (const fm of this.familyMembers) {
        if (!fm.atRisk) continue;
        const dist = Phaser.Math.Distance.Between(zombie.x, zombie.y, fm.x, fm.y);
        if (dist <= FAMILY_KILL_RADIUS) return true;
      }
    }
    return false;
  }

  private onLightFlipped(sw: SwitchSpec): void {
    this.lightsOff[sw.id] = true;
    this.familyDone[sw.familyMemberId] = true;
    this.lighting.setEnabled(sw.lightId, false);
    this.switchSprites.get(sw.id)?.setTexture(PropTex.SWITCH_OFF);
    AudioManager.playSfx(SfxKey.INTERACT, { volume: 0.6 });

    this.refreshObjectives();

    const remaining = Object.values(this.lightsOff).filter((off) => !off).length;
    if (!this.halfwaySaid && remaining <= 2 && !DialoguePlayer.isActive()) {
      this.halfwaySaid = true;
      void this.playLinesBlocking(HALFWAY_LINES);
    }

    this.checkWin();
  }

  private refreshObjectives(): void {
    const doneIds: string[] = [];
    for (const [memberId, done] of Object.entries(this.familyDone)) {
      if (done) doneIds.push(`light_${memberId}`);
    }
    if (this.zombiesKilled >= TOTAL_ZOMBIES) doneIds.push("zombies");

    ObjectiveManager.start(
      "Kill the lights",
      [
        { id: "light_mum", label: `${FAMILY_MEMBER_NAMES.mum}'s light off` },
        { id: "light_dad", label: `${FAMILY_MEMBER_NAMES.dad}'s light off` },
        { id: "light_sister", label: `${FAMILY_MEMBER_NAMES.sister}'s light off` },
        { id: "light_brother", label: `${FAMILY_MEMBER_NAMES.brother}'s light off` },
        { id: "zombies", label: `Zombies down (${this.zombiesKilled}/${TOTAL_ZOMBIES})` },
      ],
      doneIds,
    );
  }

  // -------------------------------------------------------------------
  // Win / loss
  // -------------------------------------------------------------------

  private checkWin(): void {
    if (this.ended) return;
    const allLightsOff = Object.values(this.lightsOff).every(Boolean);
    if (allLightsOff && this.zombiesKilled >= TOTAL_ZOMBIES) void this.triggerWin();
  }

  private async triggerWin(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    AudioManager.stopMusic();

    await this.say(HOUSE_DEFENSE_WIN_LINES);
    await fadeOut(1400);
    SaveManager.saveCheckpoint("HOUSE_DEFENSE");
    showEndSlate("SAFE. FOR NOW.", "Every light in the house is out, and everyone in it is still breathing.");
    await fadeIn(600);
    await this.wait(4500);
    hideMenu();
    this.scene.start(SceneKeys.MAIN_MENU);
  }

  private async triggerLoss(reason: "hp" | "family"): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    AudioManager.stopMusic();

    await fadeOut(1000);
    const subtitle = reason === "family" ? "Danny didn't get there in time." : "Danny didn't make it through the night.";
    showEndSlate("NOT TONIGHT.", subtitle);
    await fadeIn(500);
    await this.wait(3000);
    hideMenu();
    this.scene.start(SceneKeys.HOME_ARRIVAL);
  }

  // -------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------

  private async openingBeat(): Promise<void> {
    SaveManager.saveCheckpoint("HOUSE_DEFENSE");
    this.refreshObjectives();
    AudioManager.playMusic(MusicKey.TENSION);

    await fadeIn(1000);
    await this.say(HOUSE_DEFENSE_START_LINES);
    this.busy = false;
    this.player.setControlsEnabled(true);
  }

  update(time: number, delta: number): void {
    this.player.update(time, delta, this.moveInput);
    this.lighting.update(time, delta);
    const lightLevel = this.lighting.getLightLevelAt(this.player.x, this.player.y);
    EventBus.emit(Events.LIGHT_LEVEL, lightLevel);

    if (this.busy || this.ended) return;

    this.updateInteractionFocus();

    const aggroGate: AggroGate = { lightLevel, range: AGGRO_RANGE };
    for (const { zombie } of this.liveZombies) {
      zombie.update(time, delta, this.player.x, this.player.y, aggroGate);
    }

    this.updateFamilyMembers(time, delta);
    this.updateSpawning(delta);

    if (this.updateZombieAttacks(time)) {
      void this.triggerLoss("hp");
      return;
    }
    if (this.checkFamilyKilled()) {
      void this.triggerLoss("family");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.swingKey) && this.player.areControlsEnabled()) {
      const weapon = WeaponManager.getEquipped();
      if (weapon) {
        swingWeapon(
          this,
          this.player,
          weapon,
          this.liveZombies.map((lz) => lz.zombie),
        );
        this.reapDeadZombies();
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

  private async handleInteract(id: string | null): Promise<void> {
    if (id === "stairs_up" || id === "stairs_down") await this.useStairs();
  }

  private async useStairs(): Promise<void> {
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    AudioManager.playSfx(SfxKey.FOOTSTEP, { volume: 0.6 });

    await fadeOut(500);
    const dest: FloorId = this.currentFloor === "ground" ? "upper" : "ground";
    this.loadFloor(dest);
    this.player.setPosition(this.currentFloorData.stairsAt.x, this.currentFloorData.stairsAt.y - STAIRS_ARRIVAL_OFFSET);
    await fadeIn(500);

    this.player.setControlsEnabled(true);
    if (dest === "upper" && !this.upperVisited) {
      this.upperVisited = true;
      await this.playLinesBlocking(UPSTAIRS_FIRST_LINES);
    }
  }

  private async playLinesBlocking(script: DialogueScript): Promise<void> {
    const wasEnabled = this.player.areControlsEnabled();
    this.player.setControlsEnabled(false);
    EventBus.emit(Events.PROMPT_HIDE);
    await DialoguePlayer.play(script);
    if (wasEnabled) this.player.setControlsEnabled(true);
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
