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

export function synthTVHum(duration = 2.5): Promise<AudioBuffer> {
  return render(duration, (ctx) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoiseBuffer(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2200, 0);
    filter.Q.setValueAtTime(0.7, 0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, 0);
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

export function synthRain(duration = 4): Promise<AudioBuffer> {
  return render(duration, (ctx) => {
    const hiss = ctx.createBufferSource();
    hiss.buffer = whiteNoiseBuffer(ctx, duration);
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.setValueAtTime(3400, 0);
    hissFilter.Q.setValueAtTime(0.5, 0);
    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0.22, 0);
    hiss.connect(hissFilter).connect(hissGain).connect(ctx.destination);
    hiss.start(0);

    const body = ctx.createBufferSource();
    body.buffer = whiteNoiseBuffer(ctx, duration);
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.setValueAtTime(500, 0);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.13, 0);
    body.connect(bodyFilter).connect(bodyGain).connect(ctx.destination);
    body.start(0);
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
