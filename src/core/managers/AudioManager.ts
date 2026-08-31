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
} as const;

export const MusicKey = {
  MENU: "music_menu",
  TENSION: "music_tension",
} as const;

/**
 * Real-audio alternative for the "Sound pack" setting (see Settings menu).
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
  [MusicKey.MENU]: "audio/music/music_menu.ogg",
};

function packKeyFor(logicalKey: string): string {
  return `${logicalKey}__pack`;
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

  /** Queues every real-audio file listed in PACK_URLS and waits for the loader to finish (successes and failures alike — a missing/broken file just never lands in the cache, so resolveKey() falls back silently). */
  private loadPackAssets(scene: Phaser.Scene): Promise<void> {
    return new Promise((resolve) => {
      let queued = 0;
      for (const [key, url] of Object.entries(PACK_URLS)) {
        if (!url) continue;
        scene.load.audio(packKeyFor(key), url);
        queued++;
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

  /** Real pack file if the setting asks for it and that key actually has one loaded; the generated key otherwise. */
  private resolveKey(logicalKey: string): string {
    if (this.settings.soundSource === "pack" && this.scene?.cache.audio.has(packKeyFor(logicalKey))) {
      return packKeyFor(logicalKey);
    }
    return logicalKey;
  }

  playSfx(key: string, opts: Phaser.Types.Sound.SoundConfig = {}): void {
    if (!this.scene || !this.ready) return;
    const s = this.settings;
    this.scene.sound.play(this.resolveKey(key), {
      ...opts,
      volume: (opts.volume ?? 1) * s.sfxVolume * s.masterVolume,
    });
  }

  /** Looping ambience bed (TV hum, etc), independent of the music channel and addressed by id so callers can start/stop it by name. */
  startLoop(id: string, key: string, volume = 1): void {
    if (!this.scene || !this.ready) return;
    this.stopLoop(id);
    const s = this.settings;
    const sound = this.scene.sound.add(this.resolveKey(key), {
      loop: true,
      volume: volume * s.sfxVolume * s.masterVolume,
    });
    sound.play();
    this.loopingBeds.set(id, { sound, baseVolume: volume, logicalKey: key });
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
    this.scene.tweens.add({ targets: next, volume: s.musicVolume * s.masterVolume, duration: fadeMs });

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
        (this.currentMusic as Phaser.Sound.WebAudioSound).volume = s.musicVolume * s.masterVolume;
      }
    }

    for (const [id, bed] of this.loopingBeds) {
      const desiredKey = this.resolveKey(bed.logicalKey);
      if (bed.sound.key !== desiredKey && this.scene) {
        bed.sound.stop();
        bed.sound.destroy();
        const sound = this.scene.sound.add(desiredKey, {
          loop: true,
          volume: bed.baseVolume * s.sfxVolume * s.masterVolume,
        });
        sound.play();
        this.loopingBeds.set(id, { ...bed, sound });
      } else {
        (bed.sound as Phaser.Sound.WebAudioSound).volume = bed.baseVolume * s.sfxVolume * s.masterVolume;
      }
    }
  }
}

export const AudioManager = new AudioManagerClass();
