import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { generateTileset } from "@/gfx/tileset";
import { generatePropTextures } from "@/gfx/props";
import { generatePlayerTextures, createPlayerAnimations } from "@/gfx/playerSpriteGen";
import { generateMenuBackdrop } from "@/gfx/backdrop";
import { generateFxTextures } from "@/gfx/fx";
import { generateMotorwayTextures } from "@/gfx/motorway";
import { generateFigureTextures } from "@/gfx/zombieFigure";
import { generateDogTextures, createDogAnimations } from "@/gfx/dogSpriteGen";
import { AudioManager } from "@/core/managers/AudioManager";
import { showLoading, hideMenu } from "@/ui/dom/MenuUI";

/**
 * Generates every placeholder texture and bakes every procedural sound
 * effect before the game is playable. All of it is synchronous except
 * audio (OfflineAudioContext rendering), hence the async create().
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.PRELOAD);
  }

  async create(): Promise<void> {
    showLoading();

    generateTileset(this);
    generatePropTextures(this);
    generatePlayerTextures(this);
    generateMenuBackdrop(this);
    generateFxTextures(this);
    generateMotorwayTextures(this);
    generateFigureTextures(this);
    generateDogTextures(this);
    createPlayerAnimations(this);
    createDogAnimations(this);

    await AudioManager.init(this);

    hideMenu();
    this.scene.start(SceneKeys.MAIN_MENU);
  }
}
