import Phaser from "phaser";
import "@/styles.css";
import "@/ui/dom/ui.css";
import "@/ui/dom/computer.css";
import "@/ui/dom/weapon.css";
import "@/ui/dom/debugmenu.css";
import "@/ui/dom/brightness.css";
import "@/ui/dom/phoneflash.css";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";
import { BootScene } from "@/scenes/BootScene";
import { PreloadScene } from "@/scenes/PreloadScene";
import { MainMenuScene } from "@/scenes/MainMenuScene";
import { ApartmentScene } from "@/scenes/ApartmentScene";
import { MotorwayScene } from "@/scenes/MotorwayScene";
import { OfficeScene } from "@/scenes/OfficeScene";
import { LeaveBuildingScene } from "@/scenes/LeaveBuildingScene";
import { ReturnDriveScene } from "@/scenes/ReturnDriveScene";
import { DadDriveScene } from "@/scenes/DadDriveScene";
import { CombatTutorialScene } from "@/scenes/CombatTutorialScene";
import { HomeArrivalScene } from "@/scenes/HomeArrivalScene";
import { BlackoutScene } from "@/scenes/BlackoutScene";
import { HouseDefenseScene } from "@/scenes/HouseDefenseScene";
import { initUIRoot, syncViewport } from "@/ui/dom/UIRoot";
import { initDialogueBoxUI } from "@/ui/dom/DialogueBoxUI";
import { initHUDUI } from "@/ui/dom/HUDUI";
import { initFadeUI } from "@/ui/dom/FadeUI";
import { initComputerUI } from "@/ui/dom/ComputerUI";
import { initWeaponUI } from "@/ui/dom/WeaponUI";
import { initPathChoiceUI } from "@/ui/dom/PathChoiceUI";
import { initDebugMenuUI } from "@/ui/dom/DebugMenuUI";
import { applyBrightness } from "@/ui/dom/BrightnessUI";
import { SaveManager } from "@/core/managers/SaveManager";

// Lighting (Light2D) is WebGL-only in Phaser 3, hence an explicit WEBGL
// context rather than AUTO — see LightingManager.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: "game-root",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    ApartmentScene,
    MotorwayScene,
    OfficeScene,
    LeaveBuildingScene,
    ReturnDriveScene,
    DadDriveScene,
    CombatTutorialScene,
    HomeArrivalScene,
    BlackoutScene,
    HouseDefenseScene,
  ],
};

const game = new Phaser.Game(config);

applyBrightness(SaveManager.loadSettings().brightness);
initUIRoot();
initDialogueBoxUI();
initHUDUI();
initFadeUI();
initComputerUI();
initWeaponUI();
initPathChoiceUI();
initDebugMenuUI(game);

const resync = () => syncViewport(game);
window.addEventListener("resize", resync);
game.scale.on(Phaser.Scale.Events.RESIZE, resync);
resync();
// layout can settle a frame late on first load (fonts/scrollbars) — one more pass
window.setTimeout(resync, 50);
