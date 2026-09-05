import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import { FigureTex } from "@/gfx/zombieFigure";
import { ReturnDriveTex, ROAD_TILE_SIZE } from "@/gfx/returnDrive";
import { PovTex } from "@/gfx/returnDrivePov";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { WeaponManager } from "@/core/managers/WeaponManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  RETURN_DRIVE_START_LINES,
  BREAKDOWN_LINES,
  PHONE_NO_SIGNAL_LINES,
  DIRT_PATH_SPOTTED_LINES,
  REMEMBER_BAT_LINES,
  GET_BAT_LINES,
} from "@/data/dialogue/returnDriveLines";
import { setHudVisible } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { createBootCutscene } from "@/gfx3d/bootCutscene";

const ROAD_X = GAME_WIDTH / 2;
const CAR_Y = 190;
const MIN_SPEED = 40;
const MAX_SPEED = 170;
const START_SPEED = 95;
const BREAKDOWN_DISTANCE = 3800;
const CUTSCENE_DEPTH = 90000;
const LANE_OFFSET = 55;

interface RoadObstacle {
  distance: number;
  laneX: number;
  isZombie: boolean;
  img?: Phaser.GameObjects.Image;
  hit: boolean;
  resolved: boolean;
}

/** Broken-down cars and the odd zombie, left in the road — something to actually steer around rather than just holding a direction for a minute straight. */
const OBSTACLE_PLAN: Array<{ distance: number; lane: number; isZombie: boolean }> = [
  { distance: 850, lane: -1, isZombie: false },
  { distance: 1550, lane: 1, isZombie: true },
  { distance: 2250, lane: 0, isZombie: false },
  { distance: 2900, lane: -1, isZombie: true },
  { distance: 3450, lane: 1, isZombie: false },
];

interface DecorPlanEntry {
  distance: number;
  x: number;
  tex: string;
  scale: number;
  tint?: number;
  angle?: number;
  idleSway?: boolean;
}

interface ScrollingDecor extends DecorPlanEntry {
  img?: Phaser.GameObjects.Image;
  resolved: boolean;
}

const ROAD_EDGE = ROAD_TILE_SIZE.w / 2;
const ROUTE_END = BREAKDOWN_DISTANCE + 150;

/** Small seeded RNG so the roadside scatter is stable across reloads instead of reshuffling every playthrough. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

/**
 * Everything alongside the road — this used to be nothing but a flat
 * colour either side of the tarmac, which also meant camera shake had
 * nothing to hide behind but empty background. Barriers run continuously
 * (they're what actually reads as "motorway"); everything else scatters
 * along the verge behind them.
 */
function buildDecorPlan(): DecorPlanEntry[] {
  const plan: DecorPlanEntry[] = [];
  const rng = makeRng(50321);

  for (let d = 30; d < ROUTE_END; d += 26) {
    for (const side of [-1, 1] as const) {
      plan.push({ distance: d, x: ROAD_X + side * (ROAD_EDGE + 10), tex: ReturnDriveTex.BARRIER, scale: 1 });
    }
  }

  for (let d = 80; d < ROUTE_END; ) {
    const side = rng() < 0.5 ? -1 : 1;
    plan.push({
      distance: d,
      x: ROAD_X + side * (ROAD_EDGE + 40 + rng() * 60),
      tex: PropTex.TREE,
      scale: 0.8 + rng() * 0.35,
    });
    d += 55 + rng() * 70;
  }

  for (let d = 200, i = 0; d < ROUTE_END; d += 340, i++) {
    const side = i % 2 === 0 ? -1 : 1;
    plan.push({ distance: d, x: ROAD_X + side * (ROAD_EDGE + 22), tex: PropTex.STREET_LAMP, scale: 0.85 });
  }

  [400, 1400, 2400, 3300].forEach((d, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    plan.push({ distance: d, x: ROAD_X + side * (ROAD_EDGE + 26), tex: ReturnDriveTex.SIGN, scale: 1 });
  });

  // crashed cars, well clear of the drivable lanes — abandoned, not obstacles
  [520, 1180, 2050, 2700, 3550].forEach((d, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    plan.push({
      distance: d,
      x: ROAD_X + side * (ROAD_EDGE + 30 + rng() * 20),
      tex: PropTex.CAR,
      scale: 0.7,
      tint: 0x3a3632,
      angle: Math.round(rng() * 80 - 40),
    });
  });

  // shambling on the verge, beyond the barrier — visible threat, not a hazard you can hit
  [300, 950, 1700, 2450, 3150, 3700].forEach((d, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    plan.push({
      distance: d,
      x: ROAD_X + side * (ROAD_EDGE + 35 + rng() * 50),
      tex: FigureTex.ZOMBIE,
      scale: 0.7,
      idleSway: true,
    });
  });

  // survivors waving for help from behind the barrier — DRIVER's pose is
  // already both arms up ("resisting, not resigned"), reused as-is
  [650, 1850, 3000].forEach((d, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    plan.push({ distance: d, x: ROAD_X + side * (ROAD_EDGE + 24), tex: FigureTex.DRIVER, scale: 0.75, idleSway: true });
  });

  return plan;
}

/**
 * Path 1: a limited top-down drive (lane position + speed only — no U-turn,
 * no leaving the road, since there's nowhere else for this stretch to go)
 * that ends in a scripted breakdown, then a POV cutscene retrieving the
 * bat from the boot. Hands off to CombatTutorialScene once Danny's back on
 * his feet with it.
 */
export class ReturnDriveScene extends Phaser.Scene {
  private road!: Phaser.GameObjects.TileSprite;
  private car!: Phaser.GameObjects.Image;
  private speedText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdLeft!: Phaser.Input.Keyboard.Key;
  private wasdRight!: Phaser.Input.Keyboard.Key;
  private wasdUp!: Phaser.Input.Keyboard.Key;
  private wasdDown!: Phaser.Input.Keyboard.Key;

  private carX = ROAD_X;
  private speed = START_SPEED;
  private distance = 0;
  private busy = true;
  private brokenDown = false;
  private obstacles: RoadObstacle[] = [];
  private decor: ScrollingDecor[] = [];

  constructor() {
    super(SceneKeys.RETURN_DRIVE);
  }

  init(): void {
    this.carX = ROAD_X;
    this.speed = START_SPEED;
    this.distance = 0;
    this.busy = true;
    this.brokenDown = false;
    this.obstacles = OBSTACLE_PLAN.map((o) => ({
      distance: o.distance,
      laneX: ROAD_X + o.lane * LANE_OFFSET,
      isZombie: o.isZombie,
      hit: false,
      resolved: false,
    }));
    this.decor = buildDecorPlan().map((d) => ({ ...d, resolved: false }));
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(false);
    this.cameras.main.setBackgroundColor(0x2f3a26);

    this.road = this.add
      .tileSprite(ROAD_X, GAME_HEIGHT / 2, ROAD_TILE_SIZE.w, GAME_HEIGHT, ReturnDriveTex.ROAD_TILE)
      .setDepth(1);
    this.car = this.add.image(this.carX, CAR_Y, PropTex.CAR).setDepth(5).setScale(0.85);

    this.speedText = this.add
      .text(10, GAME_HEIGHT - 20, "", { fontFamily: "monospace", fontSize: "12px", color: "#f0ece2" })
      .setScrollFactor(0)
      .setDepth(10);

    this.setupInput();
    void this.openingBeat();
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasdLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.wasdRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.wasdUp = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.wasdDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  }

  private async openingBeat(): Promise<void> {
    SaveManager.saveCheckpoint("RETURN_DRIVE");
    await fadeIn(1000);
    await DialoguePlayer.play(RETURN_DRIVE_START_LINES);
    this.busy = false;
  }

  update(_time: number, delta: number): void {
    // Capped: delta can spike hugely after a stretch without regular frames
    // (a backgrounded tab, a device hitch, a long unattended dialogue wait)
    // — without a ceiling, a single such frame could silently fast-forward
    // `distance` most of the way to the breakdown, skipping almost the
    // entire drive. 100ms is generous for any real frame, so this never
    // touches normal play.
    const dt = Math.min(delta, 100) / 1000;
    this.road.tilePositionY -= this.speed * dt;

    const bars = Math.round(((this.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 10);
    this.speedText.setText(`SPEED [${"#".repeat(Math.max(0, bars))}${"-".repeat(Math.max(0, 10 - bars))}]`);

    if (this.busy) return;

    let vx = 0;
    if (this.cursors.left.isDown || this.wasdLeft.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasdRight.isDown) vx += 1;
    this.carX = Phaser.Math.Clamp(
      this.carX + vx * 80 * dt,
      ROAD_X - ROAD_TILE_SIZE.w / 2 + 22,
      ROAD_X + ROAD_TILE_SIZE.w / 2 - 22,
    );
    this.car.x = this.carX;
    this.car.setAngle(Phaser.Math.Linear(this.car.angle, vx * -7, 0.2));

    if (this.cursors.up.isDown || this.wasdUp.isDown) this.speed = Math.min(MAX_SPEED, this.speed + 70 * dt);
    if (this.cursors.down.isDown || this.wasdDown.isDown) this.speed = Math.max(MIN_SPEED, this.speed - 70 * dt);

    this.distance += this.speed * dt;
    this.updateObstacles();
    this.updateDecor();

    if (this.distance >= BREAKDOWN_DISTANCE) {
      void this.beginBreakdown();
    }
  }

  /** Each obstacle's screen Y is driven purely by (its target distance minus distance travelled), so it scrolls in perfect sync with the road tile without needing its own tween. */
  private updateObstacles(): void {
    for (const ob of this.obstacles) {
      if (ob.resolved) continue;
      const y = CAR_Y - (ob.distance - this.distance);
      if (y < -40) continue;

      if (!ob.img) {
        const img = this.add.image(ob.laneX, y, ob.isZombie ? FigureTex.ZOMBIE : PropTex.CAR).setDepth(4);
        if (ob.isZombie) {
          img.setScale(0.8);
        } else {
          img.setScale(0.75).setAngle(90 + Phaser.Math.Between(-20, 20)).setTint(0x8a8a86);
        }
        ob.img = img;
      }
      ob.img.y = y;

      if (!ob.hit && Math.abs(y - CAR_Y) < 14 && Math.abs(ob.laneX - this.carX) < 22) {
        ob.hit = true;
        this.onObstacleHit();
      }

      if (y > GAME_HEIGHT + 40) {
        ob.img.destroy();
        ob.resolved = true;
      }
    }
  }

  /**
   * Roadside scenery — barriers, trees, lamps, signs, wrecked cars, shambling
   * zombies and survivors waving from the verge. Same lazy create-on-approach
   * / destroy-on-pass scrolling as updateObstacles(), but purely decorative:
   * everything here sits outside the drivable lane range, so there's no hit
   * check.
   */
  private updateDecor(): void {
    for (const d of this.decor) {
      if (d.resolved) continue;
      const y = CAR_Y - (d.distance - this.distance);
      if (y < -60) continue;

      if (!d.img) {
        const img = this.add.image(d.x, y, d.tex).setDepth(2).setScale(d.scale);
        if (d.tint !== undefined) img.setTint(d.tint);
        if (d.angle !== undefined) img.setAngle(d.angle);
        if (d.idleSway) {
          this.tweens.add({
            targets: img,
            angle: { from: -3, to: 3 },
            duration: 1100 + Math.random() * 600,
            delay: Math.random() * 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        }
        d.img = img;
      }
      d.img.y = y;

      if (y > GAME_HEIGHT + 60) {
        d.img.destroy();
        d.resolved = true;
      }
    }
  }

  /** No player-health system in this game — a miss just costs speed and a scare, not a fail state. */
  private onObstacleHit(): void {
    AudioManager.playSfx(SfxKey.BANG, { volume: 0.5 });
    this.cameras.main.shake(150, 0.006);
    this.speed = Math.max(MIN_SPEED, this.speed - 35);
  }

  private async beginBreakdown(): Promise<void> {
    if (this.brokenDown) return;
    this.brokenDown = true;
    this.busy = true;

    AudioManager.playSfx(SfxKey.BANG, { volume: 0.6 });
    this.cameras.main.shake(220, 0.006);
    this.spawnSmoke();

    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: this, speed: 0, duration: 2200, ease: "Cubic.easeOut", onComplete: () => resolve() });
    });

    await this.say(BREAKDOWN_LINES);
    await this.wait(400);
    await this.runPovCutscene();
  }

  private spawnSmoke(): void {
    for (let i = 0; i < 5; i++) {
      const puff = this.add
        .image(this.car.x + Phaser.Math.Between(-6, 6), this.car.y - 26, ReturnDriveTex.SMOKE_PUFF)
        .setDepth(6)
        .setAlpha(0.8)
        .setScale(0.6);
      this.tweens.add({
        targets: puff,
        y: puff.y - 30 - Math.random() * 20,
        x: puff.x + Phaser.Math.Between(-15, 15),
        alpha: 0,
        scale: 1.6,
        duration: 1400 + Math.random() * 600,
        delay: i * 120,
        onComplete: () => puff.destroy(),
      });
    }
  }

  private async runPovCutscene(): Promise<void> {
    const phone = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, PovTex.PHONE).setScrollFactor(0).setDepth(CUTSCENE_DEPTH).setAlpha(0);
    await this.fadeTo(phone, 1, 500);
    await this.wait(500);

    const noSignal = this.add
      .text(GAME_WIDTH - 10, 10, "NO SIGNAL", { fontFamily: "monospace", fontSize: "13px", color: "#ff5a5a" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(CUTSCENE_DEPTH + 1);
    this.tweens.add({ targets: noSignal, alpha: { from: 1, to: 0.15 }, duration: 420, yoyo: true, repeat: -1 });

    await this.say(PHONE_NO_SIGNAL_LINES);

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: phone,
        angle: { from: -4, to: 4 },
        duration: 260,
        yoyo: true,
        repeat: 3,
        onComplete: () => resolve(),
      });
    });
    noSignal.destroy();
    await this.fadeTo(phone, 0, 400);
    phone.destroy();

    const dirt = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, PovTex.DIRT_PATH).setScrollFactor(0).setDepth(CUTSCENE_DEPTH).setAlpha(0);
    await this.fadeTo(dirt, 1, 600);
    await this.wait(500);
    await this.say(DIRT_PATH_SPOTTED_LINES);
    await this.wait(300);
    await this.say(REMEMBER_BAT_LINES);
    await this.fadeTo(dirt, 0, 400);
    dirt.destroy();

    AudioManager.playSfx(SfxKey.DOOR, { volume: 0.5 });
    await fadeOut(500);
    const bootCutscene = createBootCutscene();
    await fadeIn(500);
    await this.wait(700);
    await this.say(GET_BAT_LINES);
    AudioManager.playSfx(SfxKey.SWING, { volume: 0.4 });
    await this.wait(500);
    await fadeOut(500);
    bootCutscene.dispose();

    WeaponManager.pickUp("cricket_bat");

    await fadeOut(1000);
    SaveManager.saveCheckpoint("RETURN_DRIVE");
    this.scene.start(SceneKeys.COMBAT_TUTORIAL, { variant: "dirtTrack" });
  }

  private fadeTo(target: Phaser.GameObjects.Image, alpha: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({ targets: target, alpha, duration, onComplete: () => resolve() });
    });
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
