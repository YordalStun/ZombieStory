import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { AudioManager, SfxKey, MusicKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import { DAD_DRIVE_START_LINES, DAD_DRIVE_SWERVE_LINES, DAD_DRIVE_CLOSE_LINES, DAD_CRASH_LINES } from "@/data/dialogue/dadDriveLines";
import { setHudVisible } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { createDriveCutscene, createCrashCutscene, type DriveCutsceneHandle } from "@/gfx3d/dadDrive3d";

const ENGINE_LOOP_ID = "dad_drive_engine";

/**
 * Path 2: entirely non-interactive — a fast backseat POV of Dad's reckless
 * driving, then a cut to an exterior shot of him "parking" the car through
 * the side of the house wall. Nobody's hurt; it's played for laughs. Hands
 * off to CombatTutorialScene once Danny's out of the car.
 *
 * Real 3D now (see gfx3d/dadDrive3d.ts) rather than flat sprites scaling
 * toward the viewer against a static image: a continuously scrolling
 * street the camera actually swerves through, then an exterior shot of the
 * car genuinely sliding into the wall — crumple, cracks, debris, all one
 * continuous scene rather than a tween between two pictures.
 */
export class DadDriveScene extends Phaser.Scene {
  private drive?: DriveCutsceneHandle;

  constructor() {
    super(SceneKeys.DAD_DRIVE);
  }

  init(): void {
    this.drive = undefined;
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(false);
    this.cameras.main.setBackgroundColor(0x0a0c14);
    void this.run();
  }

  private async run(): Promise<void> {
    SaveManager.saveCheckpoint("DAD_DRIVE");
    AudioManager.playMusic(MusicKey.TENSION, 600);

    this.drive = createDriveCutscene();
    AudioManager.startLoop(ENGINE_LOOP_ID, SfxKey.CAR_ENGINE, 0.4);
    await fadeIn(1000);

    await this.say(DAD_DRIVE_START_LINES);
    await this.wait(1000);

    this.drive.speedUp();
    void this.drive.swerve();
    AudioManager.playSfx(SfxKey.THUD, { volume: 0.5, rate: 1.3 });
    await this.say(DAD_DRIVE_SWERVE_LINES);
    await this.wait(900);

    await this.say(DAD_DRIVE_CLOSE_LINES);
    await this.wait(700);

    await fadeOut(700);
    AudioManager.stopMusic(400);
    AudioManager.stopLoop(ENGINE_LOOP_ID);
    this.drive.dispose();
    this.drive = undefined;

    await this.crashBeat();
  }

  private async crashBeat(): Promise<void> {
    let resolveImpact = () => {};
    const impactHappened = new Promise<void>((resolve) => {
      resolveImpact = resolve;
    });
    const crash = createCrashCutscene(() => {
      AudioManager.playSfx(SfxKey.BANG, { volume: 0.8 });
      resolveImpact();
    });

    await fadeIn(700);
    await impactHappened;

    await this.wait(500);
    await this.say(DAD_CRASH_LINES);

    await fadeOut(900);
    crash.dispose();
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
