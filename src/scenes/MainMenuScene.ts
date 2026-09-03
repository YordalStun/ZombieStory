import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { BACKDROP_KEY } from "@/gfx/backdrop";
import { GAME_WIDTH, GAME_HEIGHT, type Checkpoint } from "@/config/constants";
import { AudioManager, MusicKey } from "@/core/managers/AudioManager";
import { EventBus, Events } from "@/core/EventBus";
import { showMainMenu, showSettingsMenu, hideMenu } from "@/ui/dom/MenuUI";
import { showBrightnessCalibration } from "@/ui/dom/BrightnessUI";
import { SaveManager } from "@/core/managers/SaveManager";
import { fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";

/** Module-level, not per-scene-instance: HouseDefenseScene's win/loss beats route back through this scene, and the calibration screen should only ever greet the player once per session, not on every return to the menu. */
let calibrationShown = false;

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.MAIN_MENU);
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, BACKDROP_KEY);
    AudioManager.playMusic(MusicKey.MENU);
    setFadeInstant(false);

    if (calibrationShown) {
      showMainMenu();
    } else {
      calibrationShown = true;
      showBrightnessCalibration(() => showMainMenu());
    }

    const onNewGame = () => void this.startGame("NIGHT_CUTSCENE");
    const onContinue = () => {
      const progress = SaveManager.loadProgress();
      void this.startGame(progress?.checkpoint ?? "NIGHT_CUTSCENE");
    };
    const onOpenSettings = () => showSettingsMenu(() => showMainMenu());

    EventBus.on(Events.MENU_NEW_GAME, onNewGame);
    EventBus.on(Events.MENU_CONTINUE, onContinue);
    EventBus.on(Events.MENU_OPEN_SETTINGS, onOpenSettings);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(Events.MENU_NEW_GAME, onNewGame);
      EventBus.off(Events.MENU_CONTINUE, onContinue);
      EventBus.off(Events.MENU_OPEN_SETTINGS, onOpenSettings);
    });
  }

  private async startGame(checkpoint: Checkpoint): Promise<void> {
    if (checkpoint === "NIGHT_CUTSCENE") {
      SaveManager.clearProgress();
    }
    await fadeOut(700);
    hideMenu();
    AudioManager.stopMusic(300);
    if (checkpoint === "MOTORWAY") {
      this.scene.start(SceneKeys.MOTORWAY);
      return;
    }
    if (checkpoint === "OFFICE") {
      this.scene.start(SceneKeys.OFFICE);
      return;
    }
    this.scene.start(SceneKeys.APARTMENT, { checkpoint });
  }
}
