import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_NAME } from "@/config/constants";
import { MwTex, GLASS, QUEUE_CARS, ZOMBIE_TARGET_CAR_ID, carTexKey } from "@/gfx/motorway";
import { FigureTex } from "@/gfx/zombieFigure";
import { FxTex } from "@/gfx/fx";
import { AudioManager, SfxKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { ObjectiveManager } from "@/core/managers/ObjectiveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  MOTORWAY_ARRIVAL_LINES,
  MOTORWAY_ENDING_LINES,
  MOTORWAY_NOTICE_LINES,
  RADIO_BROADCAST_LINES,
  RADIO_OFF_LINES,
  ZOMBIE_BANG_LINES,
  ZOMBIE_DRAG_LINES,
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


export class MotorwayScene extends Phaser.Scene {
  private hotspots: Hotspot[] = [];
  private focusIndex = 0;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private radioOn = false;
  private radioNarrationPlayed = false;
  private radioSprite!: Phaser.GameObjects.Image;
  private radioGlow!: Phaser.GameObjects.Rectangle;
  private busy = true;
  private finished = false;

  private carSpritesById = new Map<string, Phaser.GameObjects.Image>();
  private zombieEventStarted = false;

  private droplets: Phaser.GameObjects.Image[] = [];
  private dropletTimer?: Phaser.Time.TimerEvent;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;

  // random per-playthrough so the buzz doesn't line up the same way every time
  private idleShakeSeed = Math.random() * 1000;

  constructor() {
    super(SceneKeys.MOTORWAY);
  }

  init(): void {
    this.hotspots = [];
    this.focusIndex = 0;
    this.radioOn = false;
    this.radioNarrationPlayed = false;
    this.busy = true;
    this.finished = false;
    this.carSpritesById.clear();
    this.zombieEventStarted = false;
    this.droplets = [];
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(false);
    ObjectiveManager.clear();
    SaveManager.saveCheckpoint("MOTORWAY");

    this.add.image(0, 0, MwTex.BACKDROP).setOrigin(0, 0).setDepth(DEPTH.BACKDROP);

    for (const car of QUEUE_CARS) {
      const sprite = this.add.image(car.x, car.y, carTexKey(car.id)).setDepth(DEPTH.CAR + car.y / 100);
      this.carSpritesById.set(car.id, sprite);
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
    this.scheduleEngineJolt();

    // if the player never touches the radio at all, the scene still has to
    // go somewhere eventually rather than sit in the queue forever
    this.time.delayedCall(50000, () => {
      if (!this.radioNarrationPlayed) void this.beginZombieSequence();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.rain?.destroy();
      this.dropletTimer?.remove();
      AudioManager.stopLoop("rain_glass");
      AudioManager.stopLoop("engine_idle");
      EventBus.emit(Events.PROMPT_HIDE);
    });

    void this.openingBeat();
  }

  /** The lead car in each lane rides its brakes, so its lights breathe rather than sit flat. */
  private addBrakeLightGlow(): void {
    for (const car of QUEUE_CARS.filter((c) => c.brakeLit)) {
      for (const dx of [-car.w * 0.36, car.w * 0.36]) {
        const glow = this.add.rectangle(car.x + dx, car.y + car.h * 0.02, 9, 4, 0xff5a45, 0.5);
        // above this car's own depth, not a flat DEPTH.CAR+1 — that sat below
        // any car whose y put it past depth 6, hiding the glow behind it
        glow.setDepth(DEPTH.CAR + car.y / 100 + 0.5);
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

    // the patter bed carries much less steady energy than the old hiss did, so
    // it needs a higher playback level to sit in the same perceived place
    AudioManager.startLoop("rain_glass", SfxKey.RAIN_GLASS, 0.7);
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

  /**
   * Nothing in this scene scrolls or moves — the queue is stopped dead, so
   * the only motion is the whole cabin (and the world seen through the
   * glass) buzzing on the engine's idle, which reads as "not going anywhere"
   * far more clearly than a static frame does.
   */
  private applyIdleShake(timeMs: number): void {
    const t = timeMs / 1000 + this.idleShakeSeed;
    // two detuned sines so it doesn't land as a perfect metronome
    const buzzX = Math.sin(t * 46) * 0.24 + Math.sin(t * 71 + 1.7) * 0.13;
    const buzzY = Math.sin(t * 53 + 0.6) * 0.2 + Math.sin(t * 84 + 2.4) * 0.11;
    // idle RPM drifts a little rather than holding dead steady
    const surge = 0.5 + 0.3 * Math.sin(t * 0.7);
    this.cameras.main.setScroll(buzzX * surge, buzzY * surge);
  }

  /** An occasional bigger jolt on top of the buzz — the engine catching unevenly. */
  private scheduleEngineJolt(): void {
    this.time.addEvent({
      delay: Phaser.Math.Between(5500, 10000),
      callback: () => {
        this.cameras.main.shake(110, 0.0011);
        this.scheduleEngineJolt();
      },
    });
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

  update(time: number): void {
    // idles constantly — it shouldn't pause just because a dialogue line is up
    this.applyIdleShake(time);

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

  /** Like say(), but the lines advance on their own — see DialoguePlayer.playAuto(). */
  private async sayAuto(script: DialogueScript): Promise<void> {
    this.busy = true;
    EventBus.emit(Events.PROMPT_HIDE);
    await DialoguePlayer.playAuto(script);
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

  private setRadioTexture(on: boolean): void {
    this.radioSprite.setTexture(on ? MwTex.RADIO_ON : MwTex.RADIO_OFF);
    this.radioGlow.setFillStyle(on ? 0x8ce0a4 : 0xffb765, on ? 0.1 : 0.07);
  }

  private async useRadio(): Promise<void> {
    AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.5 });

    if (!this.radioNarrationPlayed) {
      // first press: the broadcast plays through on its own — no clicking
      // required, though a click still skips a line ahead if you want to
      this.radioNarrationPlayed = true;
      this.radioOn = true;
      this.setRadioTexture(true);
      await this.sayAuto(RADIO_BROADCAST_LINES);
      // it's Danny's own line that stops it, not the radio dying — it
      // stays on and can now be freely toggled
      this.armZombieEvent(Phaser.Math.Between(6000, 9000));
      return;
    }

    // every press after that is a plain on/off toggle
    this.radioOn = !this.radioOn;
    this.setRadioTexture(this.radioOn);
    if (!this.radioOn) await this.say(RADIO_OFF_LINES);
  }

  private armZombieEvent(delayMs: number): void {
    this.time.delayedCall(delayMs, () => void this.beginZombieSequence());
  }

  /**
   * The scene's actual ending: a figure works its way to the red car in the
   * right lane, drags its driver out, and the pair are gone off the right of
   * the screen before the fade. Runs entirely on tweens against the same
   * static queue art — nothing here needed a new animated sprite sheet.
   */
  private async beginZombieSequence(): Promise<void> {
    if (this.zombieEventStarted || this.finished) return;
    // let whatever the player's mid-interaction with finish naturally
    // instead of cutting it off
    while (this.busy) await this.wait(250);
    if (this.zombieEventStarted || this.finished) return;
    this.zombieEventStarted = true;
    this.finished = true;
    EventBus.emit(Events.PROMPT_HIDE);

    const target = QUEUE_CARS.find((c) => c.id === ZOMBIE_TARGET_CAR_ID)!;
    const targetSprite = this.carSpritesById.get(target.id)!;

    await this.say(MOTORWAY_NOTICE_LINES);

    // emerges from further back in the same lane and closes in on the car
    const zombie = this.add.image(target.x + 10, target.y - 40, FigureTex.ZOMBIE);
    zombie.setDepth(DEPTH.CAR + target.y / 100 + 0.3).setScale(0.45);
    AudioManager.playSfx(SfxKey.GROAN, { volume: 0.4 });

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: zombie,
        x: target.x - target.w * 0.5 - 7,
        y: target.y - 2,
        scale: 1,
        duration: 3200,
        ease: "Sine.easeIn",
        onComplete: () => resolve(),
      });
    });

    await this.say(ZOMBIE_BANG_LINES);

    for (let i = 0; i < 3; i++) {
      AudioManager.playSfx(SfxKey.BANG, { volume: 0.55 });
      this.tweens.add({ targets: targetSprite, angle: { from: -1.5, to: 1.5 }, duration: 90, yoyo: true, repeat: 1 });
      await new Promise<void>((resolve) => {
        this.tweens.add({ targets: zombie, x: zombie.x + 4, duration: 90, yoyo: true, onComplete: () => resolve() });
      });
      await this.wait(320);
    }
    targetSprite.setAngle(0);

    const driver = this.add.image(target.x - target.w * 0.25, target.y - 4, FigureTex.DRIVER);
    driver.setDepth(zombie.depth + 0.1);
    AudioManager.playSfx(SfxKey.GROAN, { volume: 0.3 });

    await this.say(ZOMBIE_DRAG_LINES);

    // gone limp — tipped onto its side and hauled along, not marched upright
    driver.setAngle(92);

    const dragMs = 2200;
    this.tweens.add({ targets: [zombie, driver], x: `+=${GAME_WIDTH}`, duration: dragMs, ease: "Cubic.easeIn" });
    const struggleTimer = this.time.addEvent({
      delay: 70,
      repeat: Math.floor(dragMs / 70),
      callback: () => {
        driver.setY(target.y - 4 + Phaser.Math.Between(-2, 2));
        driver.setAngle(92 + Phaser.Math.Between(-7, 7));
      },
    });
    await this.wait(dragMs);
    struggleTimer.remove();
    zombie.destroy();
    driver.destroy();

    await this.say(MOTORWAY_ENDING_LINES);

    await fadeOut(1400);
    showEndSlate(
      "TO BE CONTINUED",
      `${PLAYER_NAME} is nine miles from work, and something is walking between the cars.`,
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
