// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
let actx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let noiseBuf: AudioBuffer | null = null;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!actx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.5;
      master.connect(actx.destination);
    }
    if (actx.state === 'suspended') void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.1, slide?: number, delay = 0) {
  const a = ac();
  if (!a || !master) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.2, freq = 1000, delay = 0) {
  const a = ac();
  if (!a || !master) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur);
}

const last: Record<string, number> = {};
function ready(key: string, ms: number) {
  const now = performance.now();
  if ((last[key] ?? 0) + ms > now) return false;
  last[key] = now;
  return true;
}

export const sfx = {
  coin() {
    if (!ready('coin', 45)) return;
    tone(1046, 0.05, 'square', 0.035);
    tone(1568, 0.09, 'square', 0.035, undefined, 0.05);
  },
  shoot() {
    if (!ready('shoot', 70)) return;
    tone(420, 0.07, 'triangle', 0.045, 180);
  },
  hit() {
    noise(0.3, 0.25, 900);
    tone(220, 0.3, 'sawtooth', 0.08, 70);
  },
  pop() {
    if (!ready('pop', 40)) return;
    tone(520, 0.09, 'sine', 0.1, 1100);
    noise(0.08, 0.08, 3000);
  },
  enemyHit() {
    if (!ready('ehit', 60)) return;
    tone(300, 0.04, 'square', 0.03, 200);
  },
  skill() {
    tone(523, 0.1, 'square', 0.05, 1046);
    tone(784, 0.18, 'square', 0.04, 1568, 0.08);
  },
  pickup() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'triangle', 0.07, undefined, i * 0.07));
  },
  heal() {
    [659, 880, 1175].forEach((f, i) => tone(f, 0.12, 'sine', 0.08, undefined, i * 0.06));
  },
  warn() {
    if (!ready('warn', 250)) return;
    tone(880, 0.09, 'square', 0.035);
    tone(880, 0.09, 'square', 0.035, undefined, 0.14);
  },
  zap() {
    if (!ready('zap', 120)) return;
    noise(0.25, 0.18, 4000);
    tone(1200, 0.2, 'sawtooth', 0.05, 200);
  },
  boom() {
    if (!ready('boom', 90)) return;
    noise(0.5, 0.28, 500);
    tone(120, 0.4, 'sine', 0.14, 40);
  },
  thunder() {
    noise(1.2, 0.22, 300);
  },
  boss() {
    [196, 185, 175, 165].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.06, undefined, i * 0.3));
  },
  screech() {
    if (!ready('screech', 300)) return;
    tone(1800, 0.35, 'sawtooth', 0.025, 900);
  },
  win() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.05, undefined, i * 0.11));
  },
  lose() {
    [392, 349, 311, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, undefined, i * 0.22));
  },
  nova() {
    noise(0.8, 0.3, 1500);
    tone(200, 0.8, 'sawtooth', 0.08, 1200);
  },
  buy() {
    tone(784, 0.08, 'square', 0.05);
    tone(1175, 0.15, 'square', 0.05, undefined, 0.08);
  },
  click() {
    tone(660, 0.04, 'triangle', 0.05);
  },
};
