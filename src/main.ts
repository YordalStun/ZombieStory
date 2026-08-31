import Phaser from "phaser";
import "@/styles.css";
import "@/ui/dom/ui.css";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/constants";
import { BootScene } from "@/scenes/BootScene";
import { PreloadScene } from "@/scenes/PreloadScene";
import { MainMenuScene } from "@/scenes/MainMenuScene";
import { ApartmentScene } from "@/scenes/ApartmentScene";
import { MotorwayScene } from "@/scenes/MotorwayScene";
import { initUIRoot, syncViewport } from "@/ui/dom/UIRoot";
import { initDialogueBoxUI } from "@/ui/dom/DialogueBoxUI";
import { initHUDUI } from "@/ui/dom/HUDUI";
import { initFadeUI } from "@/ui/dom/FadeUI";

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
  scene: [BootScene, PreloadScene, MainMenuScene, ApartmentScene, MotorwayScene],
};

const game = new Phaser.Game(config);

initUIRoot();
initDialogueBoxUI();
initHUDUI();
initFadeUI();

const resync = () => syncViewport(game);
window.addEventListener("resize", resync);
game.scale.on(Phaser.Scale.Events.RESIZE, resync);
resync();
// layout can settle a frame late on first load (fonts/scrollbars) — one more pass
window.setTimeout(resync, 50);
