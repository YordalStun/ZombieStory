import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_NAME } from "@/config/constants";
import { MwTex, GLASS } from "@/gfx/motorway";
import { FxTex } from "@/gfx/fx";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { ObjectiveManager } from "@/core/managers/ObjectiveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  MOTORWAY_ARRIVAL_LINES,
  MOTORWAY_ENDING_LINES,
  RADIO_STAGES,
  RADIO_DEAD_LINES,
  RADIO_OFF_LINES,
  HORN_LINES,
  WHEEL_LINES,
  MIRROR_LINES,
} from "@/data/dialogue/motorwayLines";
import { EventBus, Events } from "@/core/EventBus";
import type { PromptShowPayload } from "@/ui/dom/HUDUI";
import { setHudVisible } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { showEndSlate, hideMenu } from "@/ui/dom/MenuUI";
import { worldToScreen } from "@/ui/dom/UIRoot";

const DEPTH = {
  BACKDROP: 0,
  CAR: 5,
  RAIN: 12,
  GRIME: 16,
  DROPLET: 20,
  WIPER: 24,
  CABIN: 30,
  MIRROR: 34,
} as const;

/** Right-hand drive: driver on the right, radio over on the left of the dash. */
const WHEEL_X = 342;
const RADIO_X = 92;

interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
}

/** Where the queue of cars sits — further up the screen reads as further away. */
const CAR_LAYOUT: Array<{ tex: string; x: number; y: number; tint: number }> = [
  { tex: MwTex.CAR_FAR, x: 176, y: 104, tint: 0x6d7580 },
  { tex: MwTex.CAR_FAR, x: 292, y: 101, tint: 0x7a6a58 },
  { tex: MwTex.CAR_FAR, x: 356, y: 106, tint: 0x5d6a72 },
  { tex: MwTex.CAR_MID, x: 128, y: 120, tint: 0x8a8f96 },
  { tex: MwTex.CAR_MID, x: 322, y: 124, tint: 0x6a5f7a },
  { tex: MwTex.CAR_NEAR, x: 226, y: 146, tint: 0xffffff },
  { tex: MwTex.CAR_NEAR, x: 372, y: 152, tint: 0x74808a },
];

export class MotorwayScene extends Phaser.Scene {
  private hotspots: Hotspot[] = [];
  private focusIndex = 0;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private radioOn = false;
  private radioStage = 0;
  private radioSprite!: Phaser.GameObjects.Image;
  private radioGlow!: Phaser.GameObjects.Rectangle;
  private busy = true;
  private finished = false;

  private droplets: Phaser.GameObjects.Image[] = [];
  private dropletTimer?: Phaser.Time.TimerEvent;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super(SceneKeys.MOTORWAY);
  }

  init(): void {
    this.hotspots = [];
    this.focusIndex = 0;
    this.radioOn = false;
    this.radioStage = 0;
    this.busy = true;
    this.finished = false;
    this.droplets = [];
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(false);
    ObjectiveManager.clear();
    SaveManager.saveCheckpoint("MOTORWAY");

    this.add.image(0, 0, MwTex.BACKDROP).setOrigin(0, 0).setDepth(DEPTH.BACKDROP);

    for (const car of CAR_LAYOUT) {
      const img = this.add.image(car.x, car.y, car.tex).setDepth(DEPTH.CAR + car.y / 100);
      if (car.tint !== 0xffffff) img.setTint(car.tint);
    }
    this.addBrakeLightGlow();

    this.add
      .image(GLASS.x, GLASS.y, MwTex.GLASS_GRIME)
      .setOrigin(0, 0)
      .setDepth(DEPTH.GRIME);

    this.createWeather();
    this.createCabin();
    this.createWipers();
    this.setupInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.rain?.destroy();
      this.dropletTimer?.remove();
      AudioManager.stopLoop("rain_glass");
      AudioManager.stopLoop("engine_idle");
      EventBus.emit(Events.PROMPT_HIDE);
    });

    void this.openingBeat();
  }

  /** The nearest cars ride their brakes, so their lights breathe rather than sit flat. */
  private addBrakeLightGlow(): void {
    for (const car of CAR_LAYOUT.slice(-2)) {
      for (const dx of [-22, 22]) {
        const glow = this.add.rectangle(car.x + dx, car.y + 2, 9, 4, 0xff5a45, 0.5);
        glow.setDepth(DEPTH.CAR + 1);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.28, to: 0.72 },
          duration: 1400 + Math.random() * 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }
  }

  private createWeather(): void {
    this.rain = this.add.particles(0, 0, FxTex.RAIN_STREAK, {
      x: { min: GLASS.x - 20, max: GLASS.x + GLASS.w + 20 },
      y: GLASS.y - 10,
      lifespan: 900,
      speedY: { min: 300, max: 420 },
      speedX: { min: -70, max: -30 },
      scaleY: { min: 1, max: 1.8 },
      alpha: { start: 0.55, end: 0.2 },
      quantity: 3,
      frequency: 22,
    });
    this.rain.setDepth(DEPTH.RAIN);

    // beads forming on the glass between wiper passes
    this.dropletTimer = this.time.addEvent({
      delay: 130,
      loop: true,
      callback: () => this.addDroplet(),
    });

    AudioManager.startLoop("rain_glass", SfxKey.RAIN_GLASS, 0.5);
    AudioManager.startLoop("engine_idle", SfxKey.CAR_ENGINE, 0.1);
  }

  private addDroplet(): void {
    if (this.droplets.length > 90) return;
    const drop = this.add.image(
      Phaser.Math.Between(GLASS.x + 2, GLASS.x + GLASS.w - 2),
      Phaser.Math.Between(GLASS.y + 2, GLASS.y + GLASS.h - 2),
      FxTex.RAIN_DROP,
    );
    drop.setDepth(DEPTH.DROPLET).setAlpha(Phaser.Math.FloatBetween(0.35, 0.8));
    this.droplets.push(drop);

    // most beads just sit; a few gather enough weight to run down the glass
    if (Math.random() < 0.25) {
      this.tweens.add({
        targets: drop,
        y: drop.y + Phaser.Math.Between(10, 30),
        duration: Phaser.Math.Between(1800, 3600),
        ease: "Sine.easeIn",
      });
    }
  }

  private clearDroplets(): void {
    for (const drop of this.droplets) {
      this.tweens.add({ targets: drop, alpha: 0, duration: 120, onComplete: () => drop.destroy() });
    }
    this.droplets = [];
  }

  private createCabin(): void {
    this.add.image(0, 0, MwTex.HEADLINER).setOrigin(0, 0).setDepth(DEPTH.CABIN);
    this.add.image(0, GLASS.y, MwTex.PILLAR).setOrigin(0, 0).setDepth(DEPTH.CABIN);
    this.add
      .image(GAME_WIDTH, GLASS.y, MwTex.PILLAR)
      .setOrigin(0, 0)
      .setFlipX(true)
      .setDepth(DEPTH.CABIN)
      .setX(GAME_WIDTH - 20);
    this.add.image(0, GAME_HEIGHT, MwTex.DASH).setOrigin(0, 1).setDepth(DEPTH.CABIN);
    // right-hand drive — driver, wheel and binnacle are all on the right
    this.add.image(WHEEL_X, 196, MwTex.WHEEL).setOrigin(0.5, 0).setDepth(DEPTH.CABIN + 1);
    this.add.image(GAME_WIDTH / 2, GLASS.y, MwTex.MIRROR).setOrigin(0.5, 0).setDepth(DEPTH.MIRROR);

    this.radioSprite = this.add.image(RADIO_X, 198, MwTex.RADIO_OFF).setOrigin(0, 0).setDepth(DEPTH.CABIN + 1);
    // a soft pool of light on the dash around the unit, breathing very slightly
    const radioGlow = this.add.rectangle(RADIO_X + 28, 208, 74, 30, 0xffb765, 0.07);
    radioGlow.setDepth(DEPTH.CABIN);
    this.tweens.add({
      targets: radioGlow,
      alpha: { from: 0.05, to: 0.11 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.radioGlow = radioGlow;

    this.hotspots = [
      { id: "radio", label: "Radio", x: RADIO_X + 28, y: 198 },
      { id: "mirror", label: "Check the mirror", x: GAME_WIDTH / 2, y: GLASS.y + 12 },
      { id: "wheel", label: "Grip the wheel", x: WHEEL_X, y: 206 },
      { id: "horn", label: "Sound the horn", x: WHEEL_X, y: 244 },
    ];
  }

  private createWipers(): void {
    // parked low and just under the glass line, sweeping up and over — a long
    // blade pivoting from mid-glass just reads as a diagonal slash
    // pivot sits well below the glass line so the parked blade tucks away
    // behind the dash instead of lying across the view
    for (const pivotX of [172, 330]) {
      const wiper = this.add.image(pivotX, GLASS.y + GLASS.h + 18, MwTex.WIPER);
      wiper.setOrigin(0.5, 1).setDepth(DEPTH.WIPER).setAngle(-78);
      this.tweens.add({
        targets: wiper,
        angle: 6,
        duration: 620,
        ease: "Sine.easeInOut",
        yoyo: true,
        hold: 90,
        repeat: -1,
        repeatDelay: 2300,
        onRepeat: () => this.clearDroplets(),
      });
    }
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.leftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private async openingBeat(): Promise<void> {
    await fadeIn(1200);
    await DialoguePlayer.play(MOTORWAY_ARRIVAL_LINES);
    this.busy = false;
    this.showFocus();
  }

  update(): void {
    if (this.busy || this.finished || DialoguePlayer.isActive()) return;

    const left = Phaser.Input.Keyboard.JustDown(this.leftKey) || Phaser.Input.Keyboard.JustDown(this.cursors.left);
    const right = Phaser.Input.Keyboard.JustDown(this.rightKey) || Phaser.Input.Keyboard.JustDown(this.cursors.right);
    if (left || right) {
      const step = right ? 1 : -1;
      this.focusIndex = (this.focusIndex + step + this.hotspots.length) % this.hotspots.length;
      AudioManager.playSfx(SfxKey.UI_HOVER, { volume: 0.35 });
      this.showFocus();
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      void this.interact(this.hotspots[this.focusIndex]);
    }
  }

  private showFocus(): void {
    const spot = this.hotspots[this.focusIndex];
    const screen = worldToScreen(this.cameras.main, spot.x, spot.y);
    const payload: PromptShowPayload = {
      text: `[E] ${spot.label}`,
      screenX: screen.x,
      screenY: screen.y,
    };
    EventBus.emit(Events.PROMPT_SHOW, payload);
  }

  private async say(script: DialogueScript): Promise<void> {
    this.busy = true;
    EventBus.emit(Events.PROMPT_HIDE);
    await DialoguePlayer.play(script);
    this.busy = false;
    if (!this.finished) this.showFocus();
  }

  private async interact(spot: Hotspot): Promise<void> {
    switch (spot.id) {
      case "wheel":
        await this.say(WHEEL_LINES);
        break;
      case "horn":
        AudioManager.playSfx(SfxKey.CAR_ENGINE, { volume: 0.5 });
        await this.say(HORN_LINES);
        break;
      case "mirror":
        await this.say(MIRROR_LINES);
        break;
      case "radio":
        await this.useRadio();
        break;
    }
  }

  private async useRadio(): Promise<void> {
    if (!this.radioOn) {
      this.radioOn = true;
      this.radioSprite.setTexture(MwTex.RADIO_ON);
      this.radioGlow.setFillStyle(0x8ce0a4, 0.1);
      AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.5 });
    }

    if (this.radioStage >= RADIO_STAGES.length) {
      await this.say(RADIO_DEAD_LINES);
      return;
    }

    const stage = RADIO_STAGES[this.radioStage];
    this.radioStage += 1;
    await this.say(stage);

    // the last broadcast cuts out — that's the cue the scene ends on
    if (this.radioStage >= RADIO_STAGES.length) {
      this.radioSprite.setTexture(MwTex.RADIO_OFF);
      this.radioGlow.setFillStyle(0xffb765, 0.07);
      this.radioOn = false;
      await this.say(RADIO_OFF_LINES);
      await this.endScene();
    }
  }

  private async endScene(): Promise<void> {
    this.finished = true;
    this.busy = true;
    EventBus.emit(Events.PROMPT_HIDE);

    await this.wait(700);
    await DialoguePlayer.play(MOTORWAY_ENDING_LINES);

    await fadeOut(1400);
    showEndSlate(
      "TO BE CONTINUED",
      `${PLAYER_NAME} is nine miles from work and has just realised he is never getting there.`,
    );
    await fadeIn(600);
    await this.wait(3200);

    hideMenu();
    this.scene.start(SceneKeys.MAIN_MENU);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
