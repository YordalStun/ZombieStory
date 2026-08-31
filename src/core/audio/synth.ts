/**
 * Procedural sound effects and music beds, baked to AudioBuffers via
 * OfflineAudioContext at boot. No audio files ship with the game — this
 * is placeholder sound designed to be swapped out later (see
 * AudioManager, which registers each buffer under a stable key; a real
 * asset just needs to load into the same key).
 */

function whiteNoiseBuffer(ctx: BaseAudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.max(1, Math.floor(sr * duration));
  const buffer = ctx.createBuffer(1, len, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

async function render(
  duration: number,
  build: (ctx: OfflineAudioContext) => void,
  sampleRate = 44100,
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
  build(ctx);
  return ctx.startRendering();
}

export function synthDrip(): Promise<AudioBuffer> {
  return render(0.35, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, 0);
    osc.frequency.exponentialRampToValueAtTime(500, 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, 0);
    gain.gain.exponentialRampToValueAtTime(0.2, 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(0.35);
  });
}

export function synthUIClick(): Promise<AudioBuffer> {
  return render(0.09, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, 0);
    osc.frequency.exponentialRampToValueAtTime(660, 0.06);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, 0);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(0.09);
  });
}

export function synthUIHover(): Promise<AudioBuffer> {
  return render(0.05, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, 0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, 0);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(0.05);
  });
}

export function synthFootstep(): Promise<AudioBuffer> {
  return render(0.12, (ctx) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoiseBuffer(ctx, 0.12);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, 0);
    filter.frequency.exponentialRampToValueAtTime(120, 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, 0);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.12);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(0);
  });
}

export function synthInteract(): Promise<AudioBuffer> {
  return render(0.18, (ctx) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, 0);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.18);
    gain.connect(ctx.destination);
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(660, 0);
    o1.connect(gain);
    o1.start(0);
    o1.stop(0.09);
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(880, 0.09);
    o2.connect(gain);
    o2.start(0.09);
    o2.stop(0.18);
  });
}

export function synthDoor(): Promise<AudioBuffer> {
  return render(0.5, (ctx) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoiseBuffer(ctx, 0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(8, 0);
    filter.frequency.setValueAtTime(900, 0);
    filter.frequency.exponentialRampToValueAtTime(220, 0.45);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.exponentialRampToValueAtTime(0.3, 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.5);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(0);
  });
}

export function synthCarEngine(): Promise<AudioBuffer> {
  return render(1.1, (ctx) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, 0);
    osc.frequency.linearRampToValueAtTime(95, 0.5);
    osc.frequency.linearRampToValueAtTime(70, 1.1);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, 0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.exponentialRampToValueAtTime(0.3, 0.15);
    gain.gain.exponentialRampToValueAtTime(0.18, 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, 1.1);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(0);
    osc.stop(1.1);

    const nsrc = ctx.createBufferSource();
    nsrc.buffer = whiteNoiseBuffer(ctx, 1.1);
    const nfilter = ctx.createBiquadFilter();
    nfilter.type = "lowpass";
    nfilter.frequency.setValueAtTime(300, 0);
    const ngain = ctx.createGain();
    ngain.gain.setValueAtTime(0.0001, 0);
    ngain.gain.exponentialRampToValueAtTime(0.15, 0.15);
    ngain.gain.exponentialRampToValueAtTime(0.0001, 1.1);
    nsrc.connect(nfilter).connect(ngain).connect(ctx.destination);
    nsrc.start(0);
  });
}

/** A fist hitting a car body/window — a low thump plus a sharp, brief knuckle-on-glass crack. */
export function synthBang(): Promise<AudioBuffer> {
  return render(0.22, (ctx) => {
    const thump = ctx.createOscillator();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(140, 0);
    thump.frequency.exponentialRampToValueAtTime(60, 0.16);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.001, 0);
    thumpGain.gain.exponentialRampToValueAtTime(0.55, 0.012);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, 0.2);
    thump.connect(thumpGain).connect(ctx.destination);
    thump.start(0);
    thump.stop(0.22);

    const crack = ctx.createBufferSource();
    crack.buffer = whiteNoiseBuffer(ctx, 0.05);
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = "bandpass";
    crackFilter.frequency.setValueAtTime(1800, 0);
    crackFilter.Q.setValueAtTime(2.5, 0);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.35, 0);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, 0.045);
    crack.connect(crackFilter).connect(crackGain).connect(ctx.destination);
    crack.start(0);
  });
}

/** A low, wavering, distorted groan — two close-detuned oscillators beating against each other. */
export function synthGroan(): Promise<AudioBuffer> {
  const duration = 1.6;
  return render(duration, (ctx) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.exponentialRampToValueAtTime(0.22, 0.35);
    gain.gain.exponentialRampToValueAtTime(0.16, duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, 0);
    filter.connect(gain).connect(ctx.destination);

    for (const [freq, detune] of [
      [72, 0],
      [76, -6],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, 0);
      osc.detune.setValueAtTime(detune, 0);
      // pitch wobbles unevenly rather than a clean vibrato — reads as pained/wrong
      osc.frequency.setValueAtTime(freq, 0.4);
      osc.frequency.linearRampToValueAtTime(freq - 14, 0.75);
      osc.frequency.linearRampToValueAtTime(freq + 8, 1.15);
      osc.frequency.linearRampToValueAtTime(freq - 5, duration);
      osc.connect(filter);
      osc.start(0);
      osc.stop(duration);
    }

    // a rasp of noise underneath, for throat texture rather than a clean tone
    const rasp = ctx.createBufferSource();
    rasp.buffer = whiteNoiseBuffer(ctx, duration);
    const raspFilter = ctx.createBiquadFilter();
    raspFilter.type = "bandpass";
    raspFilter.frequency.setValueAtTime(300, 0);
    raspFilter.Q.setValueAtTime(0.8, 0);
    const raspGain = ctx.createGain();
    raspGain.gain.setValueAtTime(0.05, 0);
    rasp.connect(raspFilter).connect(raspGain).connect(ctx.destination);
    rasp.start(0);
  });
}

export function synthTVHum(duration = 2.5): Promise<AudioBuffer> {
  return render(duration, (ctx) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoiseBuffer(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2200, 0);
    filter.Q.setValueAtTime(1.1, 0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02, 0);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(0);

    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.setValueAtTime(120, 0);
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.025, 0);
    hum.connect(humGain).connect(ctx.destination);
    hum.start(0);
    hum.stop(duration);
  });
}

export function synthTVOff(): Promise<AudioBuffer> {
  return render(0.2, (ctx) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoiseBuffer(ctx, 0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1500, 0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, 0);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.18);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(0);
  });
}

export type RainFlavor = "soft" | "steady" | "windscreen";

const RAIN_FLAVORS: Record<RainFlavor, {
  topHz: number;
  topGain: number;
  bodyHz: number;
  bodyGain: number;
  drift: number;
  drops: number;
}> = {
  // heard through a wall or window — muffled, no top end
  soft: { topHz: 850, topGain: 0.13, bodyHz: 260, bodyGain: 0.1, drift: 0.35, drops: 0 },
  // out in it: fuller and wetter, still no sibilance
  steady: { topHz: 2000, topGain: 0.16, bodyHz: 380, bodyGain: 0.13, drift: 0.3, drops: 0 },
  // rain striking glass right in front of you. The bed is deliberately way
  // down on the other two — here the individual drops are the sound, and the
  // noise underneath is only there to stop them reading as clicks in silence.
  windscreen: { topHz: 1500, topGain: 0.045, bodyHz: 300, bodyGain: 0.05, drift: 0.25, drops: 170 },
};

/**
 * Rain beds. The first version leaned on a bright bandpass hiss, which read
 * as a harsh "sssss" and got grating fast under a permanent loop. These use
 * lowpassed noise instead (a soft "shhh"), sit on a low rumble so there's
 * weight rather than only air, and drift slowly in level so the bed breathes
 * — a dead-static noise loop is most of what makes synthetic rain annoying.
 *
 * The drift LFO runs at exactly one cycle per buffer so it starts and ends at
 * the same point and the loop seam stays inaudible.
 */
export function synthRain(
  duration = 8,
  flavor: RainFlavor = "steady",
  /** Scales the noise bed without touching the drops, for dialling in the mix. */
  bedLevel = 1,
): Promise<AudioBuffer> {
  const base = RAIN_FLAVORS[flavor];
  const cfg = { ...base, topGain: base.topGain * bedLevel, bodyGain: base.bodyGain * bedLevel };
  return render(duration, (ctx) => {
    const bed = ctx.createBufferSource();
    bed.buffer = whiteNoiseBuffer(ctx, duration);
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = "lowpass";
    bedFilter.frequency.setValueAtTime(cfg.topHz, 0);
    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(cfg.topGain, 0);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(1 / duration, 0);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(cfg.topGain * cfg.drift, 0);
    lfo.connect(lfoDepth).connect(bedGain.gain);
    lfo.start(0);
    lfo.stop(duration);

    bed.connect(bedFilter).connect(bedGain).connect(ctx.destination);
    bed.start(0);

    const body = ctx.createBufferSource();
    body.buffer = whiteNoiseBuffer(ctx, duration);
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.setValueAtTime(cfg.bodyHz, 0);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(cfg.bodyGain, 0);
    body.connect(bodyFilter).connect(bodyGain).connect(ctx.destination);
    body.start(0);

    // individual drops striking the glass — this is what makes it read as rain
    // hitting something rather than rain in the distance. They're deliberately
    // mixed: mostly light ticks, with roughly one in five a fatter, slower drop
    // landing lower down, so a dense patter still sounds like weather rather
    // than one sample retriggering.
    for (let i = 0; i < cfg.drops; i++) {
      const heavy = Math.random() < 0.18;
      const decay = heavy ? 0.09 + Math.random() * 0.05 : 0.022 + Math.random() * 0.03;
      const at = Math.random() * (duration - decay - 0.02);

      const drop = ctx.createBufferSource();
      drop.buffer = whiteNoiseBuffer(ctx, decay + 0.02);
      const dropFilter = ctx.createBiquadFilter();
      dropFilter.type = "bandpass";
      dropFilter.frequency.setValueAtTime(
        heavy ? 380 + Math.random() * 420 : 1100 + Math.random() * 1700,
        0,
      );
      dropFilter.Q.setValueAtTime(heavy ? 2.5 : 4.5, 0);

      // gains look high next to the bed's, but a narrow bandpass throws away
      // most of a noise burst's energy — these are pre-filter values, and the
      // drops land far quieter than the numbers suggest
      const dropGain = ctx.createGain();
      dropGain.gain.setValueAtTime(
        heavy ? 0.42 + Math.random() * 0.28 : 0.18 + Math.random() * 0.22,
        at,
      );
      dropGain.gain.exponentialRampToValueAtTime(0.0001, at + decay);

      drop.connect(dropFilter).connect(dropGain).connect(ctx.destination);
      drop.start(at);
      drop.stop(at + decay + 0.02);
    }
  });
}

export function synthWind(duration = 6): Promise<AudioBuffer> {
  return render(duration, (ctx) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoiseBuffer(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, 0);
    filter.Q.setValueAtTime(3, 0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, 0);

    // slow gust — a low-frequency oscillator sweeping the filter cutoff
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.09, 0);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(120, 0);
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start(0);
    lfo.stop(duration);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(0);
  });
}

/** A slow, breathing pad built from a handful of detuned partials — used for both music beds. */
export function synthPad(duration: number, freqs: number[], volume: number): Promise<AudioBuffer> {
  return render(duration, (ctx) => {
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, 0);
    master.connect(ctx.destination);

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(f, 0);
      osc.detune.setValueAtTime((i - freqs.length / 2) * 4, 0);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(1 / freqs.length, 0);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.06 + i * 0.015, 0);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.4 / freqs.length, 0);
      lfo.connect(lfoGain).connect(oscGain.gain);

      osc.connect(oscGain).connect(master);
      osc.start(0);
      osc.stop(duration);
      lfo.start(0);
      lfo.stop(duration);
    });
  });
}

export const MENU_THEME_FREQS = [220, 261.63, 329.63, 440];
export const TENSION_BED_FREQS = [55, 58.27, 82.41];

/** Classic two-tone lift chime — a falling major third, each note with a bell-like decay. */
export function synthElevatorDing(): Promise<AudioBuffer> {
  const duration = 1.3;
  return render(duration, (ctx) => {
    const notes: Array<[freq: number, start: number]> = [
      [1046.5, 0], // C6
      [830.6, 0.22], // Ab5
    ];
    for (const [freq, start] of notes) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      gain.connect(ctx.destination);

      for (const [mult, amp] of [
        [1, 1],
        [2.01, 0.25],
        [3.03, 0.1],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * mult, start);
        const partialGain = ctx.createGain();
        partialGain.gain.setValueAtTime(amp, 0);
        osc.connect(partialGain).connect(gain);
        osc.start(start);
        osc.stop(Math.min(duration, start + 0.95));
      }
    }
  });
}
