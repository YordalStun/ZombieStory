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
} as const;

export const MusicKey = {
  MENU: "music_menu",
  TENSION: "music_tension",
} as const;

interface LoopingBed {
  sound: Phaser.Sound.BaseSound;
  baseVolume: number;
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
      [MusicKey.MENU, synth.synthPad(8, synth.MENU_THEME_FREQS, 0.22)],
      [MusicKey.TENSION, synth.synthPad(10, synth.TENSION_BED_FREQS, 0.16)],
    ];

    const buffers = await Promise.all(entries.map(([, p]) => p));
    entries.forEach(([key], i) => {
      if (!scene.cache.audio.has(key)) {
        scene.cache.audio.add(key, buffers[i]);
      }
    });

    EventBus.on(Events.SETTINGS_CHANGED, () => this.refreshVolumes());
    this.ready = true;
  }

  private get settings() {
    return SaveManager.loadSettings();
  }

  playSfx(key: string, opts: Phaser.Types.Sound.SoundConfig = {}): void {
    if (!this.scene || !this.ready) return;
    const s = this.settings;
    this.scene.sound.play(key, {
      ...opts,
      volume: (opts.volume ?? 1) * s.sfxVolume * s.masterVolume,
    });
  }

  /** Looping ambience bed (TV hum, etc), independent of the music channel and addressed by id so callers can start/stop it by name. */
  startLoop(id: string, key: string, volume = 1): void {
    if (!this.scene || !this.ready) return;
    this.stopLoop(id);
    const s = this.settings;
    const sound = this.scene.sound.add(key, {
      loop: true,
      volume: volume * s.sfxVolume * s.masterVolume,
    });
    sound.play();
    this.loopingBeds.set(id, { sound, baseVolume: volume });
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
    const next = this.scene.sound.add(key, { loop: true, volume: 0 });
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

  /** Re-applies current settings to whatever is already playing (called on SETTINGS_CHANGED). */
  refreshVolumes(): void {
    const s = this.settings;
    if (this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).volume = s.musicVolume * s.masterVolume;
    }
    for (const bed of this.loopingBeds.values()) {
      (bed.sound as Phaser.Sound.WebAudioSound).volume = bed.baseVolume * s.sfxVolume * s.masterVolume;
    }
  }
}

export const AudioManager = new AudioManagerClass();
