import { SAVE_KEYS, type Checkpoint } from "@/config/constants";

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  fullscreen: boolean;
}

export interface Progress {
  version: number;
  checkpoint: Checkpoint;
  flags: Record<string, boolean>;
}

const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  fullscreen: false,
};

const SAVE_VERSION = 1;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently,
    // the game just won't persist between sessions.
  }
}

class SaveManagerClass {
  private settingsCache: Settings | null = null;

  loadSettings(): Settings {
    if (this.settingsCache) return this.settingsCache;
    const stored = readJSON<Partial<Settings>>(SAVE_KEYS.SETTINGS);
    this.settingsCache = { ...DEFAULT_SETTINGS, ...stored };
    return this.settingsCache;
  }

  saveSettings(settings: Settings): void {
    this.settingsCache = settings;
    writeJSON(SAVE_KEYS.SETTINGS, settings);
  }

  updateSettings(partial: Partial<Settings>): Settings {
    const merged = { ...this.loadSettings(), ...partial };
    this.saveSettings(merged);
    return merged;
  }

  hasProgress(): boolean {
    return readJSON<Progress>(SAVE_KEYS.PROGRESS) !== null;
  }

  loadProgress(): Progress | null {
    return readJSON<Progress>(SAVE_KEYS.PROGRESS);
  }

  saveCheckpoint(checkpoint: Checkpoint, flags: Record<string, boolean> = {}): void {
    const existing = this.loadProgress();
    const merged: Progress = {
      version: SAVE_VERSION,
      checkpoint,
      flags: { ...(existing?.flags ?? {}), ...flags },
    };
    writeJSON(SAVE_KEYS.PROGRESS, merged);
  }

  setFlag(flag: string, value = true): void {
    const existing = this.loadProgress();
    if (!existing) return;
    existing.flags[flag] = value;
    writeJSON(SAVE_KEYS.PROGRESS, existing);
  }

  clearProgress(): void {
    try {
      localStorage.removeItem(SAVE_KEYS.PROGRESS);
    } catch {
      // ignore
    }
  }
}

export const SaveManager = new SaveManagerClass();
