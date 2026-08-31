import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  create(): void {
    this.scene.start(SceneKeys.PRELOAD);
  }
}
