// Tiny WebAudio sound effects, no assets. Safe if audio is unavailable or muted.
let ctx: AudioContext | null = null; let muted = false;
export const setMuted = (m: boolean) => { muted = m; };
export const isMuted = () => muted;
const tone = (f: number, d: number, type: OscillatorType = 'sine', v = 0.05, at = 0) => {
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + d);
  } catch { /* no audio */ }
};
export function sfx(kind: 'tick' | 'buy' | 'bad' | 'good' | 'month' | 'quest') {
  if (muted) return;
  if (kind === 'tick') tone(660, 0.05, 'square', 0.025);
  else if (kind === 'buy') { tone(520, 0.08, 'triangle', 0.06); tone(780, 0.14, 'triangle', 0.06, 0.07); }
  else if (kind === 'bad') { tone(180, 0.22, 'sawtooth', 0.05); }
  else if (kind === 'good') { tone(600, 0.1, 'triangle', 0.06); tone(900, 0.18, 'triangle', 0.06, 0.09); }
  else if (kind === 'month') tone(300, 0.07, 'sine', 0.05);
  else if (kind === 'quest') { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, i * 0.08)); }
}
