// Harbor Run — sound: everything synthesized with WebAudio, no audio files.
// Engine hum follows throttle, wind follows speed, chimes mark the rings.

export function newAudio() {
  return {
    ctx: null,
    engine: null,
    engineGain: null,
    wind: null,
    windGain: null,
    enabled: false,
  };
}

export function ensureAudio(audio) {
  if (audio.ctx || audio.enabled === false) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    audio.ctx = ctx;
    // Engine: two detuned saws through a low-pass filter.
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 62;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 93;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    audio.engine = { osc1, osc2, filter };
    audio.engineGain = gain;
    // Wind: looped noise through a band-pass.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    const wgain = ctx.createGain();
    wgain.gain.value = 0.0;
    noise.connect(bp);
    bp.connect(wgain);
    wgain.connect(ctx.destination);
    noise.start();
    audio.windGain = wgain;
    audio.enabled = true;
  } catch (err) {
    audio.enabled = false;
  }
}

export function updateAudio(audio, plane) {
  if (!audio.ctx || !audio.enabled) return;
  const t = audio.ctx.currentTime;
  const rpm = 46 + plane.throttle * 58;
  audio.engine.osc1.frequency.setTargetAtTime(rpm, t, 0.08);
  audio.engine.osc2.frequency.setTargetAtTime(rpm * 1.5, t, 0.08);
  audio.engine.filter.frequency.setTargetAtTime(300 + plane.throttle * 500, t, 0.1);
  audio.engineGain.gain.setTargetAtTime(0.028 + plane.throttle * 0.05, t, 0.1);
  const wind = Math.max(0, (plane.speed - 18) / 64);
  audio.windGain.gain.setTargetAtTime(wind * 0.055, t, 0.12);
}

function tone(ctx, freq, at, dur, type, vol) {
  const osc = ctx.createOscillator();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol || 0.12, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

export function playRing(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const t = audio.ctx.currentTime;
  tone(audio.ctx, 880, t, 0.35, 'sine', 0.14);
  tone(audio.ctx, 1318, t + 0.09, 0.4, 'sine', 0.12);
}

export function playCrash(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const ctx = audio.ctx;
  const len = ctx.sampleRate * 0.5;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = 0.3;
  src.connect(g);
  g.connect(ctx.destination);
  src.start();
  tone(ctx, 70, ctx.currentTime, 0.5, 'triangle', 0.2);
}

export function playLand(audio) {
  if (!audio.ctx || !audio.enabled) return;
  const t = audio.ctx.currentTime;
  tone(audio.ctx, 523, t, 0.25, 'sine', 0.12);
  tone(audio.ctx, 784, t + 0.12, 0.35, 'sine', 0.12);
  tone(audio.ctx, 1046, t + 0.24, 0.5, 'sine', 0.1);
}
