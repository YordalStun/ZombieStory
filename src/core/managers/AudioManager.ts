import Phaser from "phaser";
import { SaveManager } from "@/core/managers/SaveManager";
import { EventBus, Events } from "@/core/EventBus";
import * as synth from "@/core/audio/synth";

export const SfxKey = {
  UI_CLICK: "sfx_ui_click",
  UI_HOVER: "sfx_ui_hover",
  FOOTSTEP: "sfx_footstep",
  INTERACT: "sfx_interact",
  DOOR: "sfx_door",
  CAR_ENGINE: "sfx_car_engine",
  TV_HUM: "sfx_tv_hum",
  TV_OFF: "sfx_tv_off",
  RAIN: "sfx_rain",
  RAIN_GLASS: "sfx_rain_glass",
  WIND: "sfx_wind",
  DRIP: "sfx_drip",
  BANG: "sfx_bang",
  GROAN: "sfx_groan",
  ELEVATOR_DING: "sfx_elevator_ding",
  OFFICE_AMBIENCE: "sfx_office_ambience",
  TALK_BLIP: "sfx_talk_blip",
  SWING: "sfx_swing",
} as const;

export const MusicKey = {
  MENU: "music_menu",
  TENSION: "music_tension",
} as const;

/**
 * Real-audio alternative for the "Pack A" setting (see Settings menu).
 * Only keys listed here have a pack alternative; anything missing quietly
 * falls back to the generated version even when "pack" is selected — see
 * public/audio/CREDITS.md for what's covered and where each file came from.
 * Paths are relative (no leading slash) so they resolve correctly under
 * Vite's `base: "./"` regardless of where the built site is served from.
 */
const PACK_URLS: Partial<Record<string, string>> = {
  [SfxKey.UI_CLICK]: "audio/sfx/sfx_ui_click.wav",
  [SfxKey.UI_HOVER]: "audio/sfx/sfx_ui_hover.wav",
  [SfxKey.FOOTSTEP]: "audio/sfx/sfx_footstep.wav",
  [SfxKey.INTERACT]: "audio/sfx/sfx_interact.wav",
  [SfxKey.DOOR]: "audio/sfx/sfx_door.wav",
  [SfxKey.TV_HUM]: "audio/sfx/sfx_tv_hum.ogg",
  [SfxKey.TV_OFF]: "audio/sfx/sfx_tv_off.wav",
  [SfxKey.RAIN]: "audio/sfx/sfx_rain.ogg",
  [SfxKey.RAIN_GLASS]: "audio/sfx/sfx_rain_glass.ogg",
  [SfxKey.WIND]: "audio/sfx/sfx_wind.ogg",
  [SfxKey.BANG]: "audio/sfx/sfx_bang.wav",
  [SfxKey.GROAN]: "audio/sfx/sfx_groan.wav",
  [SfxKey.ELEVATOR_DING]: "audio/sfx/sfx_elevator_ding.wav",
  [SfxKey.OFFICE_AMBIENCE]: "audio/sfx/sfx_office_ambience.ogg",
  [SfxKey.TALK_BLIP]: "audio/sfx/sfx_talk_blip.wav",
  [MusicKey.MENU]: "audio/music/music_menu.ogg",
};

/**
 * Real-audio alternative for the "Pack B" setting — a second, deliberately
 * different-sounding option (crunchier/chiptune rather than Pack A's
 * cleaner UI-kit-and-field-recording mix) so the two aren't just the same
 * thing twice. Covers a smaller key set than PACK_URLS — the ambience/loop
 * textures (rain, wind, TV hum, office chatter) aren't a good fit for this
 * pack's short one-shots, so those keys fall back to generated even when
 * Pack B is selected, same as any key either pack doesn't cover.
 */
const PACK2_URLS: Partial<Record<string, string>> = {
  [SfxKey.UI_CLICK]: "audio/pack2/sfx/sfx_ui_click.wav",
  [SfxKey.UI_HOVER]: "audio/pack2/sfx/sfx_ui_hover.wav",
  [SfxKey.FOOTSTEP]: "audio/pack2/sfx/sfx_footstep.wav",
  [SfxKey.INTERACT]: "audio/pack2/sfx/sfx_interact.wav",
  [SfxKey.DOOR]: "audio/pack2/sfx/sfx_door.wav",
  [SfxKey.TV_OFF]: "audio/pack2/sfx/sfx_tv_off.wav",
  [SfxKey.BANG]: "audio/pack2/sfx/sfx_bang.wav",
  [SfxKey.GROAN]: "audio/pack2/sfx/sfx_groan.wav",
  [SfxKey.ELEVATOR_DING]: "audio/pack2/sfx/sfx_elevator_ding.wav",
};

const PACK_SOURCES = { pack: PACK_URLS, pack2: PACK2_URLS } as const;
type PackSource = keyof typeof PACK_SOURCES;

function packKeyFor(logicalKey: string, source: PackSource): string {
  return `${logicalKey}__${source}`;
}

interface LoopingBed {
  sound: Phaser.Sound.BaseSound;
  baseVolume: number;
  logicalKey: string;
}

/**
 * Every sound the game plays is procedurally generated (see core/audio/synth.ts)
 * and registered here under a stable key. Swapping in real audio later just
 * means loading a real file into the same key in PreloadScene instead of
 * calling the synth — nothing that calls AudioManager.playSfx(...) changes.
 */
class AudioManagerClass {
  private scene?: Phaser.Scene;
  private ready = false;
  private currentMusic?: Phaser.Sound.BaseSound;
  private currentMusicKey?: string;
  private loopingBeds = new Map<string, LoopingBed>();
  /** Temporary multiplier on top of the user's own volume settings — see duck(). */
  private duckFactor = 1;

  async init(scene: Phaser.Scene): Promise<void> {
    if (this.ready) return;
    this.scene = scene;

    const entries: Array<[string, Promise<AudioBuffer>]> = [
      [SfxKey.UI_CLICK, synth.synthUIClick()],
      [SfxKey.UI_HOVER, synth.synthUIHover()],
      [SfxKey.FOOTSTEP, synth.synthFootstep()],
      [SfxKey.INTERACT, synth.synthInteract()],
      [SfxKey.DOOR, synth.synthDoor()],
      [SfxKey.DRIP, synth.synthDrip()],
      [SfxKey.CAR_ENGINE, synth.synthCarEngine()],
      [SfxKey.TV_HUM, synth.synthTVHum(2.5)],
      [SfxKey.TV_OFF, synth.synthTVOff()],
      [SfxKey.RAIN, synth.synthRain(8, "steady")],
      // bed turned down to a quarter — picked over the fuller mix specifically
      // because the drops read better without a hum competing under them
      [SfxKey.RAIN_GLASS, synth.synthRain(8, "windscreen", 0.25)],
      [SfxKey.WIND, synth.synthWind(6)],
      [SfxKey.BANG, synth.synthBang()],
      [SfxKey.GROAN, synth.synthGroan()],
      [SfxKey.ELEVATOR_DING, synth.synthElevatorDing()],
      [SfxKey.OFFICE_AMBIENCE, synth.synthOfficeAmbience(10)],
      [SfxKey.TALK_BLIP, synth.synthTalkBlip()],
      [SfxKey.SWING, synth.synthSwing()],
      [MusicKey.MENU, synth.synthPad(8, synth.MENU_THEME_FREQS, 0.22)],
      [MusicKey.TENSION, synth.synthPad(10, synth.TENSION_BED_FREQS, 0.16)],
    ];

    const buffers = await Promise.all(entries.map(([, p]) => p));
    entries.forEach(([key], i) => {
      if (!scene.cache.audio.has(key)) {
        scene.cache.audio.add(key, buffers[i]);
      }
    });

    await this.loadPackAssets(scene);

    EventBus.on(Events.SETTINGS_CHANGED, () => this.refreshVolumes());
    this.ready = true;
  }

  /** Queues every real-audio file listed in both PACK_URLS and PACK2_URLS and waits for the loader to finish (successes and failures alike — a missing/broken file just never lands in the cache, so resolveKey() falls back silently). */
  private loadPackAssets(scene: Phaser.Scene): Promise<void> {
    return new Promise((resolve) => {
      let queued = 0;
      for (const [source, urls] of Object.entries(PACK_SOURCES) as Array<[PackSource, Partial<Record<string, string>>]>) {
        for (const [key, url] of Object.entries(urls)) {
          if (!url) continue;
          scene.load.audio(packKeyFor(key, source), url);
          queued++;
        }
      }
      if (queued === 0) {
        resolve();
        return;
      }
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      scene.load.start();
    });
  }

  private get settings() {
    return SaveManager.loadSettings();
  }

  /** Real pack file if the setting asks for one and that key actually has it loaded for the chosen pack; the generated key otherwise. */
  private resolveKey(logicalKey: string): string {
    const source = this.settings.soundSource;
    if ((source === "pack" || source === "pack2") && this.scene?.cache.audio.has(packKeyFor(logicalKey, source))) {
      return packKeyFor(logicalKey, source);
    }
    return logicalKey;
  }

  playSfx(key: string, opts: Phaser.Types.Sound.SoundConfig = {}): void {
    if (!this.scene || !this.ready) return;
    const s = this.settings;
    this.scene.sound.play(this.resolveKey(key), {
      ...opts,
      volume: (opts.volume ?? 1) * s.sfxVolume * s.masterVolume * this.duckFactor,
    });
  }

  /** Looping ambience bed (TV hum, etc), independent of the music channel and addressed by id so callers can start/stop it by name. */
  startLoop(id: string, key: string, volume = 1): void {
    if (!this.scene || !this.ready) return;
    this.stopLoop(id);
    const s = this.settings;
    const sound = this.scene.sound.add(this.resolveKey(key), {
      loop: true,
      volume: volume * s.sfxVolume * s.masterVolume * this.duckFactor,
    });
    sound.play();
    this.loopingBeds.set(id, { sound, baseVolume: volume, logicalKey: key });
  }

  /**
   * Temporarily scales every loop/music bed down by `factor` (on top of the
   * user's own volume settings) — used while the desk computer is open, so
   * its own distinct sound effects aren't fighting the office ambience
   * underneath. One-shot sfx triggered *after* this call also come out
   * quieter (world sfx don't fire while controls are disabled anyway, but
   * playSfx respects it regardless); call unduck() to restore.
   */
  duck(factor: number, tweenMs = 300): void {
    this.duckFactor = factor;
    if (!this.scene) return;
    const s = this.settings;
    if (this.currentMusic) {
      this.scene.tweens.add({ targets: this.currentMusic, volume: s.musicVolume * s.masterVolume * factor, duration: tweenMs });
    }
    for (const bed of this.loopingBeds.values()) {
      this.scene.tweens.add({ targets: bed.sound, volume: bed.baseVolume * s.sfxVolume * s.masterVolume * factor, duration: tweenMs });
    }
  }

  unduck(tweenMs = 300): void {
    this.duck(1, tweenMs);
  }

  /** Smoothly retargets a loop's base volume — e.g. rain/wind swelling as the player steps outside. */
  setLoopVolume(id: string, volume: number, tweenMs = 800): void {
    const bed = this.loopingBeds.get(id);
    if (!this.scene || !bed) return;
    bed.baseVolume = volume;
    const s = this.settings;
    this.scene.tweens.add({
      targets: bed.sound,
      volume: volume * s.sfxVolume * s.masterVolume,
      duration: tweenMs,
    });
  }

  stopLoop(id: string): void {
    const existing = this.loopingBeds.get(id);
    if (existing) {
      existing.sound.stop();
      existing.sound.destroy();
      this.loopingBeds.delete(id);
    }
  }

  isLoopPlaying(id: string): boolean {
    return this.loopingBeds.has(id);
  }

  playMusic(key: string, fadeMs = 900): void {
    if (!this.scene || !this.ready || this.currentMusicKey === key) return;
    const s = this.settings;
    const next = this.scene.sound.add(this.resolveKey(key), { loop: true, volume: 0 });
    next.play();
    this.scene.tweens.add({ targets: next, volume: s.musicVolume * s.masterVolume * this.duckFactor, duration: fadeMs });

    const prev = this.currentMusic;
    if (prev) {
      this.scene.tweens.add({
        targets: prev,
        volume: 0,
        duration: fadeMs,
        onComplete: () => prev.destroy(),
      });
    }
    this.currentMusic = next;
    this.currentMusicKey = key;
  }

  stopMusic(fadeMs = 900): void {
    if (!this.scene || !this.currentMusic) return;
    const prev = this.currentMusic;
    this.scene.tweens.add({
      targets: prev,
      volume: 0,
      duration: fadeMs,
      onComplete: () => prev.destroy(),
    });
    this.currentMusic = undefined;
    this.currentMusicKey = undefined;
  }

  /**
   * Re-applies current settings to whatever is already playing (called on
   * SETTINGS_CHANGED). Volume-only changes just retarget the existing Sound
   * object, but a soundSource flip means anything already looping/playing is
   * bound to the *other* key's buffer — those get stopped and recreated on
   * the newly-resolved key (from the same position isn't preserved, but
   * these are all ambient loops/music beds, so restarting reads as seamless).
   */
  refreshVolumes(): void {
    const s = this.settings;

    if (this.currentMusic && this.currentMusicKey) {
      const desiredKey = this.resolveKey(this.currentMusicKey);
      if (this.currentMusic.key !== desiredKey && this.scene) {
        const volume = (this.currentMusic as Phaser.Sound.WebAudioSound).volume;
        this.currentMusic.stop();
        this.currentMusic.destroy();
        const next = this.scene.sound.add(desiredKey, { loop: true, volume });
        next.play();
        this.currentMusic = next;
      } else {
        (this.currentMusic as Phaser.Sound.WebAudioSound).volume = s.musicVolume * s.masterVolume * this.duckFactor;
      }
    }

    for (const [id, bed] of this.loopingBeds) {
      const desiredKey = this.resolveKey(bed.logicalKey);
      if (bed.sound.key !== desiredKey && this.scene) {
        bed.sound.stop();
        bed.sound.destroy();
        const sound = this.scene.sound.add(desiredKey, {
          loop: true,
          volume: bed.baseVolume * s.sfxVolume * s.masterVolume * this.duckFactor,
        });
        sound.play();
        this.loopingBeds.set(id, { ...bed, sound });
      } else {
        (bed.sound as Phaser.Sound.WebAudioSound).volume = bed.baseVolume * s.sfxVolume * s.masterVolume * this.duckFactor;
      }
    }
  }
}

export const AudioManager = new AudioManagerClass();
