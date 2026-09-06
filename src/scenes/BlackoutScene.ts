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
  BLACKOUT_PLANNING_LINES,
  JACK_PHONE_MESSAGES,
} from "@/data/dialogue/blackoutLines";
import { setHudVisible } from "@/ui/dom/HUDUI";
import { fadeIn, fadeOut, setFadeInstant } from "@/ui/dom/FadeUI";
import { createStreetCutscene, type StreetCutsceneHandle } from "@/gfx3d/streetCutscene";
import { playPhoneFlash } from "@/ui/dom/PhoneFlashUI";
import { SpeakerRegistry } from "@/core/managers/SpeakerRegistry";
import { worldToScreen } from "@/ui/dom/UIRoot";
import { PLAYER_NAME } from "@/config/constants";

type FamilyId = "mum" | "dad" | "sister" | "brother";
type Pos = { x: number; y: number };

const FAMILY_TINT: Record<FamilyId, number> = {
  mum: 0xe0a0c0,
  dad: 0x7fa0d8,
  sister: 0xf0c860,
  brother: 0x82c87a,
};

// Everyone's `y` here has to stay clear of the dialogue box, which covers
// roughly the bottom fifth of the game canvas as a DOM overlay (see
// #dialogue-box in ui.css: bottom:16px, min-height:100px) — the canvas
// itself doesn't know the box exists, so anything positioned low enough
// on screen still gets *drawn*, just invisibly, behind an opaque div. That
// ceiling is tighter than it looks once PERSON_SCALE makes everyone taller.
const LIVING_ROOM_FAMILY_POS: Record<FamilyId, Pos> = {
  dad: { x: 150, y: 205 },
  mum: { x: 205, y: 212 },
  sister: { x: 262, y: 205 },
  brother: { x: 315, y: 216 },
};
const DANNY_LIVING_ROOM_POS: Pos = { x: 230, y: 220 };
const WINDOW_POS: Pos = { x: 380, y: 68 };
const LILY_WINDOW_POS: Pos = { x: 368, y: 150 };
const STAIRS_LIVING_POS: Pos = { x: 452, y: 160 };

const LANDING_FAMILY_POS: Record<FamilyId, Pos> = {
  dad: { x: 150, y: 160 },
  mum: { x: 250, y: 160 },
  sister: { x: 150, y: 212 },
  brother: { x: 250, y: 212 },
};
const DANNY_LANDING_POS: Pos = { x: 350, y: 190 };
const JACK_CHASE_EXIT_POS: Pos = { x: 460, y: 190 };

const STREET_CUTSCENE_HOLD_MS = 6200;

const FAMILY_DISPLAY_NAME: Record<FamilyId, string> = { mum: "mum", dad: "dad", sister: "lily", brother: "jack" };

// Every other populated scene renders Danny's native 16x24 sprite through a
// ~1.8-2.1x camera zoom (see HouseDefenseScene/ApartmentScene/etc). This
// scene never zooms — it's a fixed tableau, not a scrolling level — so at
// native scale everyone read as dollhouse-tiny next to a wall band sized
// for an actual room. PERSON_SCALE applies that same factor directly to
// the sprites instead; PROP_SCALE gives the furniture a smaller bump so
// people end up the dominant scale reference, not furniture.
const PERSON_SCALE = 2;
const PROP_SCALE = 1.3;
const STAIRS_SCALE = 1.8;

/** Distinct silhouette per family member, not four recolors of the same body — see gfx/playerSpriteGen.ts. */
const FAMILY_OUTFIT: Record<FamilyId, "pajama" | "pajama_hoodie" | "pajama_dress" | "pajama_longhair"> = {
  dad: "pajama",
  mum: "pajama_longhair",
  sister: "pajama_dress",
  brother: "pajama_hoodie",
};

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
  /** Not tracked via track()/clearRoom() — it survives the living-room->landing room swap, since Dad actually carries it upstairs (see goUpstairs()). */
  private radioSprite?: Phaser.GameObjects.Image;
  /** Jack's phone-in-hand + the light it throws on the floor — live for the phone-check beat through to when he walks off (jackChaseBeat destroys them), not tracked/cleared with the room since nothing else touches the landing room again after this. */
  private jackPhoneProps: Phaser.GameObjects.GameObject[] = [];

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

    SpeakerRegistry.set(
      new Map<string, () => { x: number; y: number } | null>([
        [PLAYER_NAME.toLowerCase(), () => (this.danny.visible ? worldToScreen(this.cameras.main, this.danny.x, this.danny.y - 18) : null)],
        ...(Object.keys(FAMILY_DISPLAY_NAME) as FamilyId[]).map((id): [string, () => { x: number; y: number } | null] => [
          FAMILY_DISPLAY_NAME[id],
          () => {
            const sprite = this.familySprites.get(id);
            return sprite?.visible ? worldToScreen(this.cameras.main, sprite.x, sprite.y - 18) : null;
          },
        ]),
      ]),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      SpeakerRegistry.set(null);
      AudioManager.stopLoop("radio_static");
    });

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
      sprite.setOutfit(FAMILY_OUTFIT[id]);
      sprite.setTint(FAMILY_TINT[id]);
      sprite.setScale(PERSON_SCALE);
      this.familySprites.set(id, sprite);
    }
    this.danny = new Player(this, 0, 0);
    this.danny.setOutfit("dressed");
    this.danny.setScale(PERSON_SCALE);
  }

  private positionFamily(positions: Record<FamilyId, Pos>, dannyPos: Pos): void {
    for (const [id, sprite] of this.familySprites) {
      const pos = positions[id];
      sprite.setPosition(pos.x, pos.y).setDepth(DEPTH.ACTOR_SORT_BASE + pos.y);
    }
    this.danny.setPosition(dannyPos.x, dannyPos.y).setDepth(DEPTH.ACTOR_SORT_BASE + dannyPos.y);
  }

  /** A darker recessed frame plus a couple of banister posts behind/around the stairs prop, so it reads as an actual stairwell opening in the house rather than one scaled-up icon floating in a corner. */
  private buildStairwell(x: number, y: number): void {
    this.track(this.add.rectangle(x, y - 6, 46, 92, 0x141014).setDepth(DEPTH.ACTOR_SORT_BASE + y - 40));
    this.track(this.add.rectangle(x - 24, y - 6, 5, 92, 0x2a2018).setDepth(DEPTH.ACTOR_SORT_BASE + y + 5));
    this.track(this.add.rectangle(x + 24, y - 6, 5, 92, 0x2a2018).setDepth(DEPTH.ACTOR_SORT_BASE + y + 5));
    this.track(
      this.add.image(x, y, PropTex.STAIRS).setScale(STAIRS_SCALE).setDepth(DEPTH.ACTOR_SORT_BASE + y),
    );
  }

  private buildLivingRoom(): void {
    // both oversized past the canvas edge — cheap insurance against the
    // crash-beat camera shake exposing an exactly-edge-to-edge seam against
    // the flat backstop colour (see DadDriveScene, which hit exactly this)
    this.track(this.add.rectangle(GAME_WIDTH / 2, 195, GAME_WIDTH + 40, 190, 0x3a2c22).setDepth(DEPTH.FLOOR));
    this.track(this.add.rectangle(GAME_WIDTH / 2, 55, GAME_WIDTH + 40, 120, 0x241f2c).setDepth(DEPTH.WALL));

    this.track(this.add.image(90, 60, PropTex.PICTURE_FRAME).setScale(PROP_SCALE).setDepth(DEPTH.WALL + 1));
    this.track(this.add.image(WINDOW_POS.x, WINDOW_POS.y, PropTex.WINDOW).setScale(PROP_SCALE).setDepth(DEPTH.WALL + 1));
    this.track(this.add.rectangle(WINDOW_POS.x - 42, WINDOW_POS.y, 12, 78, 0x5a2c34).setDepth(DEPTH.WALL + 1));
    this.track(this.add.rectangle(WINDOW_POS.x + 42, WINDOW_POS.y, 12, 78, 0x5a2c34).setDepth(DEPTH.WALL + 1));
    this.track(this.add.image(40, 100, PropTex.SWITCH_OFF).setScale(PROP_SCALE).setDepth(DEPTH.WALL + 1));

    this.track(this.add.image(150, 220, PropTex.RUG).setScale(PROP_SCALE).setDepth(DEPTH.FLOOR_DECAL));
    this.track(this.add.image(85, 195, PropTex.SOFA).setScale(PROP_SCALE).setDepth(DEPTH.ACTOR_SORT_BASE + 195));
    this.track(this.add.image(415, 178, PropTex.TV_OFF).setScale(PROP_SCALE).setDepth(DEPTH.ACTOR_SORT_BASE + 178));
    this.buildStairwell(STAIRS_LIVING_POS.x, STAIRS_LIVING_POS.y);
  }

  private buildLanding(): void {
    this.track(this.add.rectangle(GAME_WIDTH / 2, 195, GAME_WIDTH + 40, 190, 0x342820).setDepth(DEPTH.FLOOR));
    this.track(this.add.rectangle(GAME_WIDTH / 2, 55, GAME_WIDTH + 40, 120, 0x201c28).setDepth(DEPTH.WALL));
    this.track(this.add.image(130, 105, PropTex.DOOR).setScale(PROP_SCALE).setDepth(DEPTH.ACTOR_SORT_BASE + 105));
    this.track(this.add.image(340, 105, PropTex.DOOR).setScale(PROP_SCALE).setDepth(DEPTH.ACTOR_SORT_BASE + 105));
    this.track(this.add.image(445, 58, PropTex.WINDOW).setScale(PROP_SCALE * 0.55).setDepth(DEPTH.WALL + 1));
    this.buildStairwell(35, 175);
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
    this.reactToBang();
    await this.wait(250);
    await this.say(BLACKOUT_CRASH_LINES);
    await this.wait(400);

    await this.lilyToWindow();
    await this.wait(300);

    await this.playStreetCutscene();
    await this.wait(300);
    await this.say(BLACKOUT_WINDOW_REACTION_LINES);
    for (const id of ["mum", "dad", "brother"] as FamilyId[]) face(this.familySprites.get(id)!, "down");
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
    AudioManager.stopLoop("radio_static");
    SaveManager.saveCheckpoint("BLACKOUT");
    this.scene.start(SceneKeys.HOUSE_DEFENSE);
  }

  /**
   * Everyone but Lily used to just keep facing the player through the whole
   * bang/window beat, like mannequins — a flinch and a turn toward the
   * noise sells "something just happened to them" without needing every
   * one of them to walk somewhere. Lily's own turn-and-walk (lilyToWindow)
   * is left alone; this only touches the three who otherwise never react.
   */
  private reactToBang(): void {
    for (const id of ["mum", "dad", "brother"] as FamilyId[]) {
      const sprite = this.familySprites.get(id)!;
      face(sprite, "up");
      this.tweens.add({ targets: sprite, y: sprite.y - 4, duration: 100, yoyo: true, ease: "Sine.easeOut" });
    }
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
    this.radioSprite = this.add
      .image(dad.x + 22, dad.y - 14, PropTex.POCKET_RADIO)
      .setScale(PROP_SCALE)
      .setDepth(DEPTH.ACTOR_SORT_BASE + dad.y + 1);
    AudioManager.startLoop("radio_static", SfxKey.RADIO_STATIC, 0.55);
    await this.wait(400);

    await DialoguePlayer.playAuto(BLACKOUT_RADIO_SCAN_LINES);
    await this.say(BLACKOUT_RADIO_HUSH_LINES);
    AudioManager.setLoopVolume("radio_static", 0.15, 400);
  }

  /** Non-interactive walk-off (tweened, not player-driven) to the stairs, then the room swap happens entirely behind the fade — same trick DadDriveScene uses for its own scene-within-a-scene cut. */
  private async goUpstairs(): Promise<void> {
    await this.say(BLACKOUT_UPSTAIRS_LINES);

    const dad = this.familySprites.get("dad")!;
    const walkers = [...this.familySprites.values(), this.danny];
    const walkScale = PERSON_SCALE * 0.75; // reads as receding toward/up the stairs, not literally shrinking
    await Promise.all(
      walkers.map(
        (sprite, i) =>
          new Promise<void>((resolve) => {
            face(sprite, "right");
            this.tweens.add({
              targets: sprite,
              x: STAIRS_LIVING_POS.x - 24 + (i - walkers.length / 2) * 6,
              y: STAIRS_LIVING_POS.y + (i % 2) * 4,
              scaleX: walkScale,
              scaleY: walkScale,
              duration: 750 + i * 70,
              delay: i * 60,
              ease: "Sine.easeIn",
              onComplete: () => resolve(),
            });
          }),
      ),
    );

    // he wouldn't leave a working radio on downstairs for anything outside
    // to hear — it goes upstairs with him, just turned right down, not off
    AudioManager.setLoopVolume("radio_static", 0.05, 300);
    if (this.radioSprite) {
      this.tweens.add({ targets: this.radioSprite, x: dad.x + 22, y: dad.y - 14, duration: 700, ease: "Sine.easeIn" });
    }

    await fadeOut(700);
    this.clearRoom();
    this.buildLanding();
    this.positionFamily(LANDING_FAMILY_POS, DANNY_LANDING_POS);
    for (const sprite of [...this.familySprites.values(), this.danny]) {
      sprite.setScale(PERSON_SCALE);
      face(sprite, "down");
    }
    const newDad = this.familySprites.get("dad")!;
    this.radioSprite?.setPosition(newDad.x + 22, newDad.y - 14).setDepth(DEPTH.ACTOR_SORT_BASE + newDad.y + 1);
    await fadeIn(700);
  }

  /** Repositions Jack's held phone + its floor glow onto his current spot — called whenever he moves so the light doesn't lag behind him. */
  private updateJackPhoneProps(): void {
    if (this.jackPhoneProps.length === 0) return;
    const jack = this.familySprites.get("brother")!;
    const [body, screen, glow] = this.jackPhoneProps as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle, Phaser.GameObjects.Arc];
    body.setPosition(jack.x + 20, jack.y - 30).setDepth(DEPTH.ACTOR_SORT_BASE + jack.y + 1);
    screen.setPosition(jack.x + 20, jack.y - 30).setDepth(DEPTH.ACTOR_SORT_BASE + jack.y + 2);
    glow.setPosition(jack.x + 10, jack.y + 12).setDepth(DEPTH.FLOOR_DECAL + 1);
  }

  private async phoneCheckBeat(): Promise<void> {
    await this.say(BLACKOUT_PHONE_CHECK_LINES);
    await this.say(BLACKOUT_JACK_SIGNAL_LINES);

    const jack = this.familySprites.get("brother")!;
    const baseX = jack.x;
    const buzz = this.tweens.add({ targets: jack, x: baseX + 1.5, duration: 55, yoyo: true, repeat: -1 });

    // held up in shot, screen lighting his hand and a soft pool of light on
    // the floor beneath him — not just a full-screen popup with no source
    const body = this.add.rectangle(jack.x + 20, jack.y - 30, 11, 19, 0x141416).setDepth(DEPTH.ACTOR_SORT_BASE + jack.y + 1);
    const screen = this.add.rectangle(jack.x + 20, jack.y - 30, 8, 15, 0xaeeaff).setDepth(DEPTH.ACTOR_SORT_BASE + jack.y + 2);
    const glow = this.add.circle(jack.x + 10, jack.y + 12, 22, 0xaeeaff, 0.55).setDepth(DEPTH.FLOOR_DECAL + 1).setBlendMode(Phaser.BlendModes.ADD);
    this.jackPhoneProps = [body, screen, glow];
    this.tweens.add({ targets: screen, alpha: { from: 0.6, to: 1 }, duration: 180, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: glow, alpha: { from: 0.7, to: 1 }, duration: 220, yoyo: true, repeat: -1 });

    await playPhoneFlash(JACK_PHONE_MESSAGES);

    buzz.stop();
    jack.setPosition(baseX, jack.y);
    this.updateJackPhoneProps();
    await this.say(BLACKOUT_JACK_SIGNAL_LOST_LINES);
  }

  /** Jack heads for the window and stays there — see blackoutLines.ts's doc comment on BLACKOUT_JACK_CHASE_LINES for why he never walks back into this scene. */
  private async jackChaseBeat(): Promise<void> {
    await this.say(BLACKOUT_JACK_CHASE_LINES);

    const jack = this.familySprites.get("brother")!;
    face(jack, "right");
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: jack,
        x: JACK_CHASE_EXIT_POS.x,
        y: JACK_CHASE_EXIT_POS.y,
        duration: 700,
        ease: "Sine.easeIn",
        onUpdate: () => this.updateJackPhoneProps(),
        onComplete: () => resolve(),
      });
    });
    face(jack, "up");
    this.updateJackPhoneProps();
  }

  private say(script: DialogueScript): Promise<void> {
    return DialoguePlayer.play(script);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }
}
