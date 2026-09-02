import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import { FigureTex } from "@/gfx/zombieFigure";
import { ReturnDriveTex, ROAD_TILE_SIZE } from "@/gfx/returnDrive";
import { DadDrivePovTex } from "@/gfx/dadDrivePov";
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

const SCROLL_SPEED = 260;

/**
 * Path 2: entirely non-interactive — a fast backseat POV montage of Dad's
 * driving, then a cut to an external shot of him "parking" the car through
 * the side of the house wall. Nobody's hurt; it's played for laughs. Hands
 * off to CombatTutorialScene once Danny's out of the car.
 */
export class DadDriveScene extends Phaser.Scene {
  private road?: Phaser.GameObjects.TileSprite;
  private dashboard?: Phaser.GameObjects.Image;

  constructor() {
    super(SceneKeys.DAD_DRIVE);
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(false);
    this.cameras.main.setBackgroundColor(0x1a1a1e);

    this.road = this.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, ROAD_TILE_SIZE.w * 2, GAME_HEIGHT, ReturnDriveTex.ROAD_TILE)
      .setDepth(1)
      .setScale(1.4);
    this.dashboard = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, DadDrivePovTex.DASHBOARD).setDepth(5);

    void this.run();
  }

  update(_time: number, delta: number): void {
    if (this.road) this.road.tilePositionY -= SCROLL_SPEED * (delta / 1000);
  }

  private async run(): Promise<void> {
    SaveManager.saveCheckpoint("DAD_DRIVE");
    AudioManager.playMusic(MusicKey.TENSION, 600);
    await fadeIn(1000);

    await this.say(DAD_DRIVE_START_LINES);
    this.spawnPassers();
    await this.wait(1200);

    this.cameras.main.shake(180, 0.008);
    await this.say(DAD_DRIVE_SWERVE_LINES);
    this.spawnPassers();
    await this.wait(1400);

    this.spawnPassers();
    await this.say(DAD_DRIVE_CLOSE_LINES);
    await this.wait(900);

    await fadeOut(700);
    AudioManager.stopMusic(400);
    this.road?.destroy();
    this.dashboard?.destroy();
    this.road = undefined;
    this.dashboard = undefined;

    await this.crashBeat();
  }

  /** Cars and the odd zombie glimpsed flashing past the windows either side. */
  private spawnPassers(): void {
    for (let i = 0; i < 3; i++) {
      const isZombie = Math.random() < 0.4;
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? -20 : GAME_WIDTH + 20;
      const endX = fromLeft ? GAME_WIDTH + 20 : -20;
      const y = 50 + Math.random() * 90;
      const img = this.add
        .image(startX, y, isZombie ? FigureTex.ZOMBIE : PropTex.CAR)
        .setDepth(3)
        .setScale(isZombie ? 0.7 : 0.45)
        .setAlpha(0.9);
      if (!isZombie) img.setAngle(fromLeft ? 100 : 80).setTint(0x9098a0);
      this.tweens.add({
        targets: img,
        x: endX,
        duration: 450 + Math.random() * 250,
        delay: i * 140,
        onComplete: () => img.destroy(),
      });
    }
  }

  private async crashBeat(): Promise<void> {
    this.cameras.main.setBackgroundColor(0x3a3f2c);
    const wall = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, GAME_WIDTH, 90, 0xb8a888).setDepth(2);
    wall.setStrokeStyle(3, 0x8f8168);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, GAME_WIDTH, 130, 0x596b3e).setDepth(1);

    await fadeIn(700);

    const car = this.add
      .image(-40, GAME_HEIGHT / 2 + 10, PropTex.CAR)
      .setAngle(90)
      .setScale(0.8)
      .setDepth(5);

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: car,
        x: GAME_WIDTH / 2 + 6,
        duration: 850,
        ease: "Cubic.easeIn",
        onComplete: () => resolve(),
      });
    });

    AudioManager.playSfx(SfxKey.BANG, { volume: 0.7 });
    this.cameras.main.shake(320, 0.011);
    this.tweens.add({ targets: car, angle: car.angle + 20, duration: 180, yoyo: true, repeat: 1 });
    this.tweens.add({ targets: wall, angle: -3, duration: 180, yoyo: true, repeat: 1 });

    await this.wait(600);
    await this.say(DAD_CRASH_LINES);

    await fadeOut(900);
    SaveManager.saveCheckpoint("DAD_DRIVE");
    this.scene.start(SceneKeys.COMBAT_TUTORIAL, { variant: "garden" });
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
