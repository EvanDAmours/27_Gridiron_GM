// Game feel: screen shake, hit-stop, particles (turf, dust, confetti, sparkles), floating text
// and a little camera zoom on the big moments. All of it lives in screen space and is drawn as
// square pixels so it matches the sprites.
const rand = (a, b) => a + Math.random() * (b - a);

export class FX {
  constructor() { this.k = 1; this.parts = []; this.texts = []; this.shake = 0; this.stop = 0; this.zoom = 1; this.zoomTo = 1; this.flash = 0; this.flashColor = "#fff"; this.time = 0; }
  // ---- triggers ----
  hit(power = 1) { this.shake = Math.max(this.shake, 2 * this.k * power); this.stop = Math.max(this.stop, 0.06 * power); }
  burst(x, y, { n = 12, colors = ["#c9b79c", "#8f7f66", "#5d8a3c"], speed = 120, up = 60, size = 3, life = 0.6, grav = 300 } = {}) {
    const k = this.k / 2; speed *= k; up *= k; size *= k; grav *= k;
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(0.3, 1) * speed; this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - up * rand(0.5, 1), g: grav, c: colors[i % colors.length], s: size * rand(0.7, 1.3), life: life * rand(0.7, 1.2), t: 0 }); }
  }
  confetti(W, colors) {
    const k = this.k / 2;
    for (let i = 0; i < 220; i++) this.parts.push({ x: rand(0, W), y: rand(-80 * k, -5), vx: rand(-40, 40) * k, vy: rand(40, 150) * k, g: 40 * k, c: colors[i % colors.length], s: rand(3, 6) * k, life: rand(2.2, 3.4), t: 0, spin: rand(0, 6), flutter: rand(2, 5) });
  }
  sparkle(x, y, color = "#ffd166") { const k = this.k / 2; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; this.parts.push({ x, y, vx: Math.cos(a) * 90 * k, vy: Math.sin(a) * 90 * k, g: 0, c: color, s: 3 * k, life: 0.45, t: 0 }); } }
  float(text, x, y, color = "#fff", size = 1) { this.texts.push({ text, x, y, color, size, t: 0, life: 1.3 }); }
  punch(z = 1.06, hold = 0.6) { this.zoomTo = z; this.zoomHold = hold; }
  flashScreen(color = "#fff", a = 0.35) { this.flash = a; this.flashColor = color; }

  // ---- per frame ----
  // returns the time step the game should use (hit-stop freezes it for a beat)
  step(dt) {
    this.time += dt;
    const live = this.stop > 0 ? dt * 0.08 : dt; this.stop = Math.max(0, this.stop - dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 1.4);
    if (this.zoomHold > 0) this.zoomHold -= dt; else this.zoomTo = 1;
    this.zoom += (this.zoomTo - this.zoom) * Math.min(1, dt * 6);
    for (const p of this.parts) { p.t += dt; p.vy += p.g * dt; p.x += (p.vx + (p.flutter ? Math.sin(p.t * p.flutter) * 30 : 0)) * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < t.life);
    return live;
  }
  offset() { return this.shake > 0 ? [rand(-this.shake, this.shake), rand(-this.shake, this.shake) * 0.6] : [0, 0]; }
  draw(ctx, W, H, pixText) {
    for (const p of this.parts) { const a = 1 - p.t / p.life; ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = p.c; const s = Math.max(1, Math.round(p.s)); ctx.fillRect(Math.round(p.x), Math.round(p.y), s, p.spin ? Math.max(1, Math.round(s * Math.abs(Math.cos(p.t * p.spin)))) : s); }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const u = t.t / t.life, px = Math.max(2, Math.round(t.size * this.k * 1.3)), y = t.y - u * 20 * this.k;
      ctx.globalAlpha = u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25;
      pixText(ctx, t.text, t.x + px, y + px, px, "rgba(0,0,0,.6)", "center"); pixText(ctx, t.text, t.x, y, px, t.color, "center");
    }
    ctx.globalAlpha = 1;
    if (this.flash > 0) { ctx.globalAlpha = this.flash; ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
}
