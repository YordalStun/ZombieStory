import Phaser from "phaser";
import { SceneKeys } from "@/core/SceneKeys";
import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from "@/config/constants";
import { PropTex } from "@/gfx/props";
import { Player } from "@/core/entities/Player";
import type { Direction } from "@/gfx/playerSpriteGen";
import { AudioManager, SfxKey, MusicKey } from "@/core/managers/AudioManager";
import { SaveManager } from "@/core/managers/SaveManager";
import { DialoguePlayer } from "@/core/dialogue/DialoguePlayer";
import type { DialogueScript } from "@/core/dialogue/DialogueTypes";
import {
  BLACKOUT_GATHER_LINES,
  BLACKOUT_CRASH_LINES,
  BLACKOUT_TO_WINDOW_LINES,
  BLACKOUT_WINDOW_REACTION_LINES,
  BLACKOUT_RADIO_START_LINES,
  BLACKOUT_RADIO_SCAN_LINES,
  BLACKOUT_RADIO_HUSH_LINES,
  BLACKOUT_UPSTAIRS_LINES,
  BLACKOUT_PHONE_CHECK_LINES,
  BLACKOUT_JACK_SIGNAL_LINES,
  BLACKOUT_JACK_SIGNAL_LOST_LINES,
  BLACKOUT_JACK_CHASE_LINES,
  BLACKOUT_JACK_RETURN_LINES,
  BLACKOUT_PLANNING_LINES,
  JACK_PHONE_MESSAGES,
} from "@/data/dialogue/blackoutLines";
import { setHudVisible } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { createStreetCutscene, type StreetCutsceneHandle } from "@/gfx3d/streetCutscene";
import { playPhoneFlash } from "@/ui/dom/PhoneFlashUI";

type FamilyId = "mum" | "dad" | "sister" | "brother";
type Pos = { x: number; y: number };

const FAMILY_TINT: Record<FamilyId, number> = {
  mum: 0xe0a0c0,
  dad: 0x7fa0d8,
  sister: 0xf0c860,
  brother: 0x82c87a,
};

const LIVING_ROOM_FAMILY_POS: Record<FamilyId, Pos> = {
  dad: { x: 190, y: 200 },
  mum: { x: 222, y: 205 },
  sister: { x: 255, y: 200 },
  brother: { x: 285, y: 210 },
};
const DANNY_LIVING_ROOM_POS: Pos = { x: 225, y: 225 };
const WINDOW_POS: Pos = { x: 350, y: 62 };
const LILY_WINDOW_POS: Pos = { x: 340, y: 138 };
const STAIRS_LIVING_POS: Pos = { x: 455, y: 155 };

const LANDING_FAMILY_POS: Record<FamilyId, Pos> = {
  dad: { x: 185, y: 180 },
  mum: { x: 215, y: 185 },
  sister: { x: 185, y: 205 },
  brother: { x: 215, y: 205 },
};
const DANNY_LANDING_POS: Pos = { x: 245, y: 195 };
const JACK_CHASE_EXIT_POS: Pos = { x: 460, y: 190 };

const STREET_CUTSCENE_HOLD_MS = 6200;

/** Turns a static Player instance to face a direction without moving it — setOutfit already refreshes the idle frame from .facing/.outfit, so re-calling it after changing .facing is the cheapest way to reuse that without a new export. */
function face(sprite: Player, dir: Direction): void {
  sprite.facing = dir;
  sprite.setOutfit(sprite.outfit);
}

/**
 * The power cuts, and for a few minutes nobody's fighting anything — a
 * downed transformer outside, a street the family used to know now full of
 * zombies, a radio hunting for a signal, one bar of the wrong kind of good
 * news. Entirely non-interactive (matching DadDriveScene's montage style,
 * not a walkable level): a family tableau built from plain Player instances
 * and a couple of hand-composed room backdrops, book-ended by the one real
 * 3D moment in the game (see gfx3d/streetCutscene.ts). Flows straight into
 * HouseDefenseScene's existing opening line, which now lands as payoff
 * rather than a cold open.
 */
export class BlackoutScene extends Phaser.Scene {
  private familySprites = new Map<FamilyId, Player>();
  private danny!: Player;
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private powerOutOverlay!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(SceneKeys.BLACKOUT);
  }

  init(): void {
    this.familySprites.clear();
    this.roomObjects = [];
  }

  create(): void {
    setFadeInstant(true);
    setHudVisible(false);
    this.cameras.main.setBackgroundColor(0x08080a);

    this.powerOutOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x00030a)
      .setDepth(DEPTH.OVERLAY_DARKNESS)
      .setAlpha(0);

    this.spawnFamily();
    this.buildLivingRoom();
    this.positionFamily(LIVING_ROOM_FAMILY_POS, DANNY_LIVING_ROOM_POS);

    void this.run();
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.roomObjects.push(obj);
    return obj;
  }

  private clearRoom(): void {
    for (const obj of this.roomObjects) obj.destroy();
    this.roomObjects = [];
  }

  private spawnFamily(): void {
    for (const id of Object.keys(FAMILY_TINT) as FamilyId[]) {
      const sprite = new Player(this, 0, 0);
      sprite.setOutfit("pajama");
      sprite.setTint(FAMILY_TINT[id]);
      this.familySprites.set(id, sprite);
    }
    this.danny = new Player(this, 0, 0);
    this.danny.setOutfit("dressed");
  }

  private positionFamily(positions: Record<FamilyId, Pos>, dannyPos: Pos): void {
    for (const [id, sprite] of this.familySprites) {
      const pos = positions[id];
      sprite.setPosition(pos.x, pos.y).setDepth(DEPTH.ACTOR_SORT_BASE + pos.y);
    }
    this.danny.setPosition(dannyPos.x, dannyPos.y).setDepth(DEPTH.ACTOR_SORT_BASE + dannyPos.y);
  }

  private buildLivingRoom(): void {
    // both oversized past the canvas edge — cheap insurance against the
    // crash-beat camera shake exposing an exactly-edge-to-edge seam against
    // the flat backstop colour (see DadDriveScene, which hit exactly this)
    this.track(this.add.rectangle(GAME_WIDTH / 2, 195, GAME_WIDTH + 40, 190, 0x3a2c22).setDepth(DEPTH.FLOOR));
    this.track(this.add.rectangle(GAME_WIDTH / 2, 55, GAME_WIDTH + 40, 120, 0x241f2c).setDepth(DEPTH.WALL));

    this.track(this.add.image(90, 55, PropTex.PICTURE_FRAME).setDepth(DEPTH.WALL + 1));
    this.track(this.add.image(WINDOW_POS.x, WINDOW_POS.y, PropTex.WINDOW).setDepth(DEPTH.WALL + 1));
    this.track(this.add.rectangle(WINDOW_POS.x - 34, WINDOW_POS.y, 10, 60, 0x5a2c34).setDepth(DEPTH.WALL + 1));
    this.track(this.add.rectangle(WINDOW_POS.x + 34, WINDOW_POS.y, 10, 60, 0x5a2c34).setDepth(DEPTH.WALL + 1));
    this.track(this.add.image(40, 95, PropTex.SWITCH_OFF).setDepth(DEPTH.WALL + 1));

    this.track(this.add.image(150, 212, PropTex.RUG).setDepth(DEPTH.FLOOR_DECAL));
    this.track(this.add.image(85, 188, PropTex.SOFA).setDepth(DEPTH.ACTOR_SORT_BASE + 188));
    this.track(this.add.image(410, 172, PropTex.TV_OFF).setDepth(DEPTH.ACTOR_SORT_BASE + 172));
    this.track(this.add.image(STAIRS_LIVING_POS.x, STAIRS_LIVING_POS.y, PropTex.STAIRS).setScale(2.2).setDepth(DEPTH.ACTOR_SORT_BASE + STAIRS_LIVING_POS.y));
  }

  private buildLanding(): void {
    this.track(this.add.rectangle(GAME_WIDTH / 2, 195, GAME_WIDTH + 40, 190, 0x342820).setDepth(DEPTH.FLOOR));
    this.track(this.add.rectangle(GAME_WIDTH / 2, 55, GAME_WIDTH + 40, 120, 0x201c28).setDepth(DEPTH.WALL));
    this.track(this.add.image(130, 100, PropTex.DOOR).setDepth(DEPTH.ACTOR_SORT_BASE + 100));
    this.track(this.add.image(330, 100, PropTex.DOOR).setDepth(DEPTH.ACTOR_SORT_BASE + 100));
    this.track(this.add.image(440, 55, PropTex.WINDOW).setScale(0.7).setDepth(DEPTH.WALL + 1));
    this.track(this.add.image(25, 165, PropTex.STAIRS).setScale(2.2).setDepth(DEPTH.ACTOR_SORT_BASE + 165));
  }

  private async run(): Promise<void> {
    SaveManager.saveCheckpoint("BLACKOUT");
    await fadeIn(700);

    AudioManager.playSfx(SfxKey.UI_CLICK, { volume: 0.3 });
    await this.say(BLACKOUT_GATHER_LINES);
    await this.wait(600);

    AudioManager.playSfx(SfxKey.BANG, { volume: 0.7, rate: 0.65 });
    this.cameras.main.shake(140, 0.004);
    AudioManager.playMusic(MusicKey.TENSION, 900);
    await this.wait(250);
    await this.say(BLACKOUT_CRASH_LINES);
    await this.wait(400);

    await this.lilyToWindow();
    await this.wait(300);

    await this.playStreetCutscene();
    await this.wait(300);
    await this.say(BLACKOUT_WINDOW_REACTION_LINES);
    await this.wait(400);

    await this.radioBeat();
    await this.wait(400);

    await this.goUpstairs();
    await this.wait(400);

    await this.phoneCheckBeat();
    await this.wait(500);

    await this.jackChaseBeat();
    await this.wait(500);

    await this.say(BLACKOUT_PLANNING_LINES);

    await fadeOut(900);
    AudioManager.stopMusic(500);
    SaveManager.saveCheckpoint("BLACKOUT");
    this.scene.start(SceneKeys.HOUSE_DEFENSE);
  }

  /** Deliberately hers, not Danny's — the doc comment on BLACKOUT_TO_WINDOW_LINES is explicit about that. Danny's protest plays over the tween, not before it; she's already moving. */
  private async lilyToWindow(): Promise<void> {
    const lily = this.familySprites.get("sister")!;
    const tween = new Promise<void>((resolve) => {
      this.tweens.add({
        targets: lily,
        x: LILY_WINDOW_POS.x,
        y: LILY_WINDOW_POS.y,
        duration: 750,
        ease: "Sine.easeOut",
        onComplete: () => resolve(),
      });
    });
    await this.say(BLACKOUT_TO_WINDOW_LINES);
    await tween;
    face(lily, "up");
    lily.setDepth(DEPTH.ACTOR_SORT_BASE + LILY_WINDOW_POS.y);
  }

  /** Fade to black, mount the Three.js street shot, hold on the slow zoom, then fade back with the power visibly out. */
  private async playStreetCutscene(): Promise<void> {
    await fadeOut(700);
    const cutscene: StreetCutsceneHandle = createStreetCutscene();
    await fadeIn(700);
    await this.wait(STREET_CUTSCENE_HOLD_MS);

    AudioManager.playSfx(SfxKey.TV_OFF, { volume: 0.6, rate: 0.55 });
    await fadeOut(700);
    cutscene.dispose();
    this.powerOutOverlay.setAlpha(0.55);
    await fadeIn(700);
  }

  private async radioBeat(): Promise<void> {
    await this.say(BLACKOUT_RADIO_START_LINES);

    const dad = this.familySprites.get("dad")!;
    this.track(this.add.image(dad.x + 12, dad.y - 6, PropTex.POCKET_RADIO).setDepth(DEPTH.ACTOR_SORT_BASE + dad.y + 1));
    AudioManager.startLoop("radio_static", SfxKey.RADIO_STATIC, 0.55);
    await this.wait(400);

    await DialoguePlayer.playAuto(BLACKOUT_RADIO_SCAN_LINES);
    await this.say(BLACKOUT_RADIO_HUSH_LINES);
    AudioManager.setLoopVolume("radio_static", 0.15, 400);
  }

  /** Non-interactive walk-off (tweened, not player-driven) to the stairs, then the room swap happens entirely behind the fade — same trick DadDriveScene uses for its own scene-within-a-scene cut. */
  private async goUpstairs(): Promise<void> {
    await this.say(BLACKOUT_UPSTAIRS_LINES);

    const walkers = [...this.familySprites.values(), this.danny];
    await Promise.all(
      walkers.map(
        (sprite, i) =>
          new Promise<void>((resolve) => {
            face(sprite, "right");
            this.tweens.add({
              targets: sprite,
              x: STAIRS_LIVING_POS.x - 24 + (i - walkers.length / 2) * 6,
              y: STAIRS_LIVING_POS.y + (i % 2) * 4,
              scaleX: 0.75,
              scaleY: 0.75,
              duration: 750 + i * 70,
              delay: i * 60,
              ease: "Sine.easeIn",
              onComplete: () => resolve(),
            });
          }),
      ),
    );

    AudioManager.stopLoop("radio_static");
    await fadeOut(700);
    this.clearRoom();
    this.buildLanding();
    this.positionFamily(LANDING_FAMILY_POS, DANNY_LANDING_POS);
    for (const sprite of [...this.familySprites.values(), this.danny]) {
      sprite.setScale(1);
      face(sprite, "down");
    }
    await fadeIn(700);
  }

  private async phoneCheckBeat(): Promise<void> {
    await this.say(BLACKOUT_PHONE_CHECK_LINES);
    await this.say(BLACKOUT_JACK_SIGNAL_LINES);

    const jack = this.familySprites.get("brother")!;
    const baseX = jack.x;
    const buzz = this.tweens.add({ targets: jack, x: baseX + 1.5, duration: 55, yoyo: true, repeat: -1 });

    await playPhoneFlash(JACK_PHONE_MESSAGES);

    buzz.stop();
    jack.setPosition(baseX, jack.y);
    await this.say(BLACKOUT_JACK_SIGNAL_LOST_LINES);
  }

  private async jackChaseBeat(): Promise<void> {
    await this.say(BLACKOUT_JACK_CHASE_LINES);

    const jack = this.familySprites.get("brother")!;
    const homePos = LANDING_FAMILY_POS.brother;
    face(jack, "right");
    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: jack, x: JACK_CHASE_EXIT_POS.x, y: JACK_CHASE_EXIT_POS.y, duration: 700, ease: "Sine.easeIn", onComplete: () => resolve() });
    });
    jack.setVisible(false);

    await this.wait(1500);

    jack.setPosition(JACK_CHASE_EXIT_POS.x, JACK_CHASE_EXIT_POS.y).setVisible(true);
    face(jack, "left");
    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: jack, x: homePos.x, y: homePos.y, duration: 700, ease: "Sine.easeOut", onComplete: () => resolve() });
    });
    face(jack, "down");

    await this.say(BLACKOUT_JACK_RETURN_LINES);
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
