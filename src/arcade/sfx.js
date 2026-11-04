// Chiptune sound effects, synthesized with Web Audio (no files): square and triangle blips and a
// little noise, the way an 8-bit football game sounds. Muted state is remembered per browser.
let ctx = null, muted = false;
try { muted = localStorage.getItem("arcade_muted") === "1"; } catch { /* storage unavailable */ }

function ac() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC(); return ctx;
}
// browsers only start audio after a touch: call this from the first pointer event
export function unlock() { const a = ac(); if (a && a.state === "suspended") a.resume(); }
export const isMuted = () => muted;
export function toggleMute() { muted = !muted; try { localStorage.setItem("arcade_muted", muted ? "1" : "0"); } catch { /* ignore */ } return muted; }

function tone(freq, dur, { type = "square", vol = 0.08, at = 0, slide = 0 } = {}) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.12, at = 0, lp = 1200 } = {}) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + at, n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = "lowpass"; f.frequency.value = lp; g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start(t);
}

export const sfx = {
  snap: () => { noise(0.06, { vol: 0.15, lp: 600 }); tone(110, 0.08, { type: "triangle", vol: 0.12 }); },
  throw: () => tone(520, 0.18, { type: "triangle", vol: 0.07, slide: 500 }),
  kick: () => { noise(0.05, { vol: 0.2, lp: 900 }); tone(160, 0.12, { type: "square", vol: 0.07, slide: -60 }); },
  catch: () => { tone(880, 0.05, { vol: 0.06 }); tone(1320, 0.07, { vol: 0.06, at: 0.05 }); },
  incomplete: () => { tone(330, 0.1, { vol: 0.06 }); tone(220, 0.16, { vol: 0.06, at: 0.1 }); },
  tackle: () => { noise(0.14, { vol: 0.22, lp: 500 }); tone(70, 0.12, { type: "triangle", vol: 0.14 }); },
  juke: () => tone(660, 0.06, { type: "triangle", vol: 0.06, slide: 300 }),
  whistle: () => { tone(2100, 0.22, { vol: 0.035 }); tone(2180, 0.22, { vol: 0.03 }); },
  firstDown: () => { tone(660, 0.07, { vol: 0.06 }); tone(990, 0.1, { vol: 0.06, at: 0.08 }); },
  touchdown: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.4 : 0.12, { vol: 0.07, at: i * 0.11 })),
  turnover: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.14, { vol: 0.07, at: i * 0.12 })),
  select: () => tone(988, 0.04, { type: "square", vol: 0.04 }),
  // the crowd: a swell of noise, rising then falling
  crowd: () => { const a = ac(); if (!a || muted) return; const t = a.currentTime, n = Math.floor(a.sampleRate * 2.4), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.6; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4); src.connect(f).connect(g).connect(a.destination); src.start(t); },
  good: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.15, { vol: 0.07, at: i * 0.1 })),
};
