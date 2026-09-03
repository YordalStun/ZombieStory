import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { GAME_WIDTH } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import { FigureTex } from "@/gfx/zombieFigure";
import { DadDrivePovTex, DAD_DRIVE_ROAD } from "@/gfx/dadDrivePov";
import { AudioManager, SfxKey, MusicKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  DAD_DRIVE_START_LINES,
  DAD_DRIVE_SWERVE_LINES,
  DAD_DRIVE_CLOSE_LINES,
  DAD_CRASH_LINES,
} from "@/data/dialogue/dadDriveLines";
import { setHudVisible } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";

interface Passer {
  img: Phaser.GameObjects.Image;
  t: number;
  speed: number;
  laneStart: number;
  laneEnd: number;
  isZombie: boolean;
}

const DASH_COUNT = 5;
const DASH_SPEED = 0.85;

/**
 * Path 2: entirely non-interactive — a fast backseat POV montage of Dad's
 * driving, then a cut to an external shot of him "parking" the car through
 * the side of the house wall. Nobody's hurt; it's played for laughs. Hands
 * off to CombatTutorialScene once Danny's out of the car.
 *
 * The road is a static horizon (sky/treeline/tarmac) behind the dashboard
 * frame, with a handful of small sprites (lane dashes, passing cars and the
 * odd zombie) animated growing-and-sliding from the horizon toward the
 * viewer to sell forward speed — not flying sideways across the screen,
 * which read as nonsensical rather than "overtaking".
 */
export class DadDriveScene extends Phaser.Scene {
  private sky?: Phaser.GameObjects.Image;
  private dashboard?: Phaser.GameObjects.Image;
  private dashes: Phaser.GameObjects.Image[] = [];
  private dashT: number[] = [];
  private passers: Passer[] = [];
  private passerSpawnTimer = 400;
  private roadAnimActive = false;

  constructor() {
    super(SceneKeys.DAD_DRIVE);
  }

  init(): void {
    this.dashes = [];
    this.dashT = [];
    this.passers = [];
    this.passerSpawnTimer = 400;
    this.roadAnimActive = false;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(false);
    // guaranteed opaque backstop behind everything, in case any future
    // layer here ever falls short of covering the full viewport
    this.cameras.main.setBackgroundColor(0x0a0a0c);

    // scaled up a touch beyond the canvas-exact texture size — camera.shake()
    // isn't clamped by anything, so an edge-to-edge image here left the
    // flat backstop colour peeking through at the seams during the swerve
    // shake below; this just gives it margin to shake into
    this.sky = this.add.image(GAME_WIDTH / 2, 135, DadDrivePovTex.SKY).setDepth(1).setScale(1.08);

    for (let i = 0; i < DASH_COUNT; i++) {
      const img = this.add.image(DAD_DRIVE_ROAD.centerX, DAD_DRIVE_ROAD.horizonY, DadDrivePovTex.LANE_DASH).setDepth(2);
      this.dashes.push(img);
      this.dashT.push(i / DASH_COUNT);
    }

    // scaled together with the sky above, by the same factor, so the
    // windshield cutout stays aligned with what's visible through it
    this.dashboard = this.add.image(GAME_WIDTH / 2, 135, DadDrivePovTex.DASHBOARD).setDepth(5).setScale(1.08);
    this.roadAnimActive = true;

    void this.run();
  }

  update(_time: number, delta: number): void {
    if (this.roadAnimActive) this.updateRoadAnim(delta);
  }

  private updateRoadAnim(delta: number): void {
    const dt = delta / 1000;
    const { horizonY, bottomY, centerX } = DAD_DRIVE_ROAD;

    for (let i = 0; i < this.dashes.length; i++) {
      let t = this.dashT[i] + dt * DASH_SPEED;
      if (t > 1) t -= 1;
      this.dashT[i] = t;

      const tt = t * t;
      const img = this.dashes[i];
      img.setPosition(centerX, horizonY + tt * (bottomY - horizonY));
      const scale = 0.3 + t * 2.4;
      img.setScale(scale * 0.5, scale);
      img.setAlpha(t < 0.08 ? t / 0.08 : 1);
    }

    this.passerSpawnTimer -= delta;
    if (this.passerSpawnTimer <= 0) {
      this.spawnPasser();
      this.passerSpawnTimer = 550 + Math.random() * 500;
    }

    for (let i = this.passers.length - 1; i >= 0; i--) {
      const p = this.passers[i];
      p.t += dt * p.speed;
      if (p.t >= 1) {
        p.img.destroy();
        this.passers.splice(i, 1);
        continue;
      }
      const tt = p.t * p.t;
      const y = horizonY + tt * (bottomY + 40 - horizonY);
      const x = centerX + p.laneStart + (p.laneEnd - p.laneStart) * p.t;
      p.img.setPosition(x, y);
      p.img.setScale(0.12 + p.t * (p.isZombie ? 0.6 : 0.95));
    }
  }

  /** A car (occasionally a zombie at the verge) approaching from the horizon and peeling off as we overtake it. */
  private spawnPasser(): void {
    const isZombie = Math.random() < 0.3;
    const side = Math.random() < 0.5 ? -1 : 1;
    const img = this.add
      .image(DAD_DRIVE_ROAD.centerX, DAD_DRIVE_ROAD.horizonY, isZombie ? FigureTex.ZOMBIE : DadDrivePovTex.CAR_AHEAD)
      .setDepth(3);
    if (!isZombie) {
      img.setTint(Phaser.Math.RND.pick([0x8a1f2b, 0x2a5a9a, 0x4a4a4a, 0x9d9074]));
    }
    this.passers.push({
      img,
      t: 0,
      speed: 0.55 + Math.random() * 0.25,
      laneStart: (Math.random() - 0.5) * 16,
      laneEnd: isZombie ? side * (150 + Math.random() * 30) : side * (120 + Math.random() * 90),
      isZombie,
    });
  }

  private clearRoadAnim(): void {
    this.roadAnimActive = false;
    for (const d of this.dashes) d.destroy();
    this.dashes = [];
    this.dashT = [];
    for (const p of this.passers) p.img.destroy();
    this.passers = [];
  }

  private async run(): Promise<void> {
    SaveManager.saveCheckpoint("DAD_DRIVE");
    AudioManager.playMusic(MusicKey.TENSION, 600);
    await fadeIn(1000);

    await this.say(DAD_DRIVE_START_LINES);
    await this.wait(1200);

    this.cameras.main.shake(180, 0.008);
    await this.say(DAD_DRIVE_SWERVE_LINES);
    await this.wait(1400);

    await this.say(DAD_DRIVE_CLOSE_LINES);
    await this.wait(900);

    await fadeOut(700);
    AudioManager.stopMusic(400);
    this.clearRoadAnim();
    this.sky?.destroy();
    this.dashboard?.destroy();
    this.sky = undefined;
    this.dashboard = undefined;

    await this.crashBeat();
  }

  private async crashBeat(): Promise<void> {
    const wallY = 90;
    this.cameras.main.setBackgroundColor(0x596b3e);
    // both oversized beyond the canvas — the impact shake below is strong
    // enough (0.012) to otherwise expose their exactly-edge-to-edge borders
    // against the flat backstop colour, which reads as a visible seam
    this.add.rectangle(GAME_WIDTH / 2, 210, GAME_WIDTH + 100, 320, 0x4a5a34).setDepth(1); // driveway/lawn below
    const wall = this.add.image(GAME_WIDTH / 2, wallY, DadDrivePovTex.HOUSE_WALL).setDepth(2).setScale(1.1);

    await fadeIn(700);

    const car = this.add
      .image(-40, wallY + 55, PropTex.CAR)
      .setAngle(90)
      .setScale(0.8)
      .setDepth(5);
    const carTargetX = GAME_WIDTH / 2 - 10;

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: car,
        x: carTargetX,
        duration: 850,
        ease: "Cubic.easeIn",
        onComplete: () => resolve(),
      });
    });

    this.impactDamage(car, wall, carTargetX, wallY);

    await this.wait(700);
    await this.say(DAD_CRASH_LINES);

    await fadeOut(900);
    SaveManager.saveCheckpoint("DAD_DRIVE");
    this.scene.start(SceneKeys.COMBAT_TUTORIAL, { variant: "garden" });
  }

  /** Both the car and the wall visibly take the hit — not just a bang and a shake. */
  private impactDamage(car: Phaser.GameObjects.Image, wall: Phaser.GameObjects.Image, impactX: number, impactY: number): void {
    AudioManager.playSfx(SfxKey.BANG, { volume: 0.75 });
    this.cameras.main.shake(340, 0.012);

    // the car crumples — squashed along its direction of travel and left that way
    this.tweens.add({ targets: car, scaleX: 0.52, x: car.x + 8, duration: 90, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: car, angle: car.angle + 14, duration: 160, delay: 90, yoyo: true, repeat: 1 });
    const dent = this.add.rectangle(impactX + 16, impactY + 55, 14, 26, 0x2a2020, 0.55).setDepth(6);
    dent.setAngle(90);

    // the wall takes a hole and cracks radiating out from the impact point
    this.add.rectangle(impactX, impactY + 30, 34, 40, 0x5a5040, 0.85).setDepth(3);
    const cracks = this.add.graphics().setDepth(4);
    cracks.lineStyle(2, 0x4a4030, 0.9);
    const cx = impactX;
    const cy = impactY + 30;
    for (const [dx, dy] of [
      [-26, -20],
      [28, -18],
      [-20, 18],
      [24, 20],
      [4, -28],
    ] as const) {
      cracks.beginPath();
      cracks.moveTo(cx, cy);
      cracks.lineTo(cx + dx, cy + dy);
      cracks.lineTo(cx + dx + (Math.random() - 0.5) * 10, cy + dy + (Math.random() - 0.5) * 10);
      cracks.strokePath();
    }
    this.tweens.add({ targets: wall, angle: -2.5, duration: 160, yoyo: true, repeat: 1 });

    // dust + debris kicked up from the wall
    for (let i = 0; i < 8; i++) {
      const chip = this.add.rectangle(cx, cy, 2 + Math.random() * 3, 2 + Math.random() * 3, 0xcfc6ae).setDepth(7);
      this.tweens.add({
        targets: chip,
        x: cx + (Math.random() - 0.5) * 70,
        y: cy + 20 + Math.random() * 50,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        ease: "Cubic.easeOut",
        onComplete: () => chip.destroy(),
      });
    }
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
