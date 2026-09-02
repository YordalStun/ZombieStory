import * as synth from "@/core/audio/synth";
import { SaveManager } from "@/core/managers/SaveManager";

/**
 * The desk computer's own tiny sound world — a separate AudioContext, not
 * routed through AudioManager/Phaser at all. Its effects are meant to read
 * as coming *from the machine itself*, distinct from the office around it,
 * so they're deliberately NOT subject to AudioManager.duck() (that call
 * turns down everything else specifically so these can be heard clearly).
 */

let ctx: AudioContext | null = null;
let buffers: {
  startup?: AudioBuffer;
  click?: AudioBuffer;
  open?: AudioBuffer;
  error?: AudioBuffer;
} = {};
let ready = false;

async function ensureReady(): Promise<void> {
  if (ready) return;
  ctx = new AudioContext();
  const [startup, click, open, error] = await Promise.all([
    synth.synthComputerStartup(),
    synth.synthComputerClick(),
    synth.synthComputerOpen(),
    synth.synthComputerError(),
  ]);
  buffers = { startup, click, open, error };
  ready = true;
}

function play(buf: AudioBuffer | undefined, volume: number): void {
  if (!ctx || !buf) return;
  if (ctx.state === "suspended") void ctx.resume();
  const settings = SaveManager.loadSettings();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = volume * settings.sfxVolume * settings.masterVolume;
  src.connect(gain).connect(ctx.destination);
  src.start();
}

/** Call once at app startup — cheap, and gets the AudioContext created early. */
export function initComputerAudio(): void {
  void ensureReady();
}

export function playStartup(): void {
  void ensureReady().then(() => play(buffers.startup, 0.55));
}
export function playClick(): void {
  play(buffers.click, 0.45);
}
export function playOpen(): void {
  play(buffers.open, 0.45);
}
export function playError(): void {
  play(buffers.error, 0.45);
}
