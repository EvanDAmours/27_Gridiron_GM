// The arcade game on a canvas, with no framework: modes, the loop, touch, and the Retro Bowl
// controls. Arcade.jsx mounts it; scripts/arcade-dev/ loads it straight into a browser for
// playtesting. Touch the field to snap and pull back to throw; swipe up and down to steer a runner.
import { newGame, lineups, runPlay, simOpponentDrive, situation } from "./bridge.js";
import { setupPlay, snap, tick, throwTo, juke, PLAY_NAMES } from "./play.js";
import { setupKick, kickFlick, tickKick } from "./kick.js";
import { makeCamera, drawRetro, drawHud, drawDownBox, drawBanner, drawButtons, preload, pixText } from "./retro.js";

const PULL = 3.2; // the throw goes this many times the pull-back, the other way, on the screen
const spotOf = (yard) => (yard === 50 ? "the 50" : yard < 50 ? `own ${yard}` : `opp ${100 - yard}`);
const ordinal = (n) => ["1st", "2nd", "3rd", "4th"][n - 1] || `${n}th`;
const CALLS = [["pass_quick", "QUICK"], ["pass_medium", "MEDIUM"], ["pass_deep", "DEEP"], ["run_inside", "INSIDE"], ["run_outside", "OUTSIDE"]];

export class ArcadeGame {
  constructor(canvas, { userTi, oppTi, teams, onQuit, rand } = {}) {
    this.cv = canvas; this.teams = teams; this.onQuit = onQuit;
    const game = newGame(userTi, oppTi, rand ? { rand } : {});
    this.g = game.g; this.S = null; this.mode = "start"; this.sit = situation(this.g);
    this.feed = { list: [], shown: 0, at: 0 }; this.banner = null; this.touch = null; this.buttons = []; this.dpr = 1;
    preload(teams.user); preload(teams.opp);
    this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this); this.fit = this.fit.bind(this);
    canvas.addEventListener("pointerdown", this.onDown); canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp); canvas.addEventListener("pointercancel", this.onUp);
    window.addEventListener("resize", this.fit);
    this.fit(); this.advance();
    this.last = 0; this.raf = requestAnimationFrame((t) => this.loop(t));
  }
  destroy() { cancelAnimationFrame(this.raf); window.removeEventListener("resize", this.fit); for (const [n, f] of [["pointerdown", this.onDown], ["pointermove", this.onMove], ["pointerup", this.onUp], ["pointercancel", this.onUp]]) this.cv.removeEventListener(n, f); }

  fit() {
    const cv = this.cv, wrap = cv.parentElement, W = wrap.clientWidth, H = wrap.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; this.dpr = dpr;
    const cam = makeCamera(W, H); cam.camX = this.cam?.camX ?? (this.S ? this.S.ball.x : this.g.yard) + cam.lead; this.cam = cam;
  }
  refresh() { this.sit = situation(this.g); }

  // what happens next: the other team's drive (and any kickoff), or your next call
  advance() {
    const g = this.g; this.banner = null;
    if (g.done) { this.mode = "final"; this.refresh(); return; }
    if (g.koNext || g.poss !== "h") {
      const evs = simOpponentDrive(g).filter((e) => e.text).flatMap((e) => (e.note ? [e, { text: `-- ${e.note} --`, note: true }] : [e]));
      this.feed = { list: evs, shown: 0, at: performance.now() }; this.mode = "opp"; this.refresh(); return;
    }
    this.S = null; this.mode = "pick"; this.refresh();
  }
  call(c) {
    const g = this.g;
    if (c === "punt" || c === "fg") { const K = setupKick(g, lineups(g), c); this.S = K; this.cam.camX = K.ball.x + this.cam.lead; this.mode = "play"; this.refresh(); return; }
    const P = setupPlay(g, lineups(g), c); this.S = P; this.cam.camX = P.ball.x + this.cam.lead; this.mode = "play"; this.refresh();
  }

  loop(now) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    const t0 = performance.now(); this.update(dt, now); this.draw();
    (this.frameMs ||= []).push(performance.now() - t0); if (this.frameMs.length > 600) this.frameMs.shift();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }
  // one step of the game at a fixed dt (the browser loop and the playtest harness both use it)
  update(dt, now = performance.now()) {
    const P = this.S, cam = this.cam, m = this.mode;
    if (P && cam) {
      const live = P.kind ? tickKick(P, dt) : tick(P, dt);
      // the camera leads the ball a little; with a throw in the air it frames the ball and where it's going
      const f = P.ball.flight, over = P.phase === "tackle" || P.phase === "fall" || P.phase === "done";
      const want = f ? (P.ball.x + f.to.x) / 2 + 2 : P.ball.x + (over ? 0 : cam.lead);
      cam.camX += (want - cam.camX) * Math.min(1, dt * (f ? 3.5 : 5));
      cam.camX = Math.max(-10 + (cam.W * 0.42) / cam.s, Math.min(112 - (cam.W * 0.58) / cam.s, cam.camX)); // never past the end zones
      if (!live && P.phase === "done" && m === "play") {
        const ev = P.result || P.ev; this.banner = { title: resultTitle(ev), text: P.text || ev?.text || "", sub: ev?.note ? String(ev.note).toUpperCase() : P.kind ? kickNote(P) : P.pick ? pickNote(P.pick) : null };
        this.mode = "result"; this.refresh();
      }
    }
    if (m === "opp") { const f = this.feed; if (now - f.at > 650 && f.shown < f.list.length) { f.shown++; f.at = now; } else if (f.shown >= f.list.length && now - f.at > 900) this.advance(); }
    if ((m === "result" || m === "kick") && this.banner) { this.banner.at ||= now; if (now - this.banner.at > (this.banner.title.includes("TOUCHDOWN") ? 3200 : 2300)) this.advance(); }
    if (m === "final" && !this.banner) { const st = this.sit, lead = st.score.h - st.score.a; this.banner = { title: lead > 0 ? "YOU WIN!" : lead < 0 ? "YOU LOSE" : "TIE GAME", text: `${this.teams.user.name} ${st.score.h}, ${this.teams.opp.name} ${st.score.a}`, sub: null }; }
  }
  draw() {
    const cv = this.cv, cam = this.cam; if (!cv || !cam) return;
    const ctx = cv.getContext("2d"); ctx.save(); ctx.scale(cv.width / cam.W, cv.height / cam.H);
    const m = this.mode, P = this.S, st = this.sit, teams = this.teams;
    drawRetro(ctx, cam, P, teams, this.g, { ring: true });
    drawHud(ctx, cam, st, teams);
    this.buttons = [];
    if (m === "play" && P && P.kind) {
      if (P.phase === "presnap") { drawDownBox(ctx, cam, P.kind === "fg" ? `${P.dist} YARD FIELD GOAL` : "PUNT", "#fff"); pixText(ctx, "FLICK UP THE FIELD TO KICK", cam.W / 2, cam.H - Math.round(cam.s * 0.9), Math.max(2, Math.round(cam.s * 0.1)), "#fff", "center"); }
      if (this.touch && P.phase === "presnap") { const [bx, by] = cam.toScreen(P.ball.x, P.ball.y); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (this.touch.cx - this.touch.px), by + (this.touch.cy - this.touch.py)); ctx.stroke(); ctx.setLineDash([]); }
    } else if (m === "play" && P) {
      const line = P.phase === "presnap" ? `${ordinal(st.down)} & ${st.toGo >= 100 - st.yard ? "goal" : st.toGo} - ${PLAY_NAMES[P.call]}` : P.phase === "live" && P.ball.holder === "QB" ? "PULL BACK TO THROW" : P.phase === "carry" ? "SWIPE TO STEER" : null;
      if (line) drawDownBox(ctx, cam, line, P.phase === "presnap" ? "#fff" : "#ffd166");
      if (P.phase === "presnap") pixText(ctx, "TOUCH THE FIELD TO SNAP", cam.W / 2, cam.H - Math.round(cam.s * 0.9), Math.max(2, Math.round(cam.s * 0.1)), "#fff", "center");
    }
    if (m === "pick") {
      const items = [...CALLS]; if (st.down === 4) items.push(st.yard >= 58 ? ["fg", `FG ${100 - st.yard + 17}`] : ["punt", "PUNT"]);
      this.buttons = drawButtons(ctx, cam, `${ordinal(st.down)} & ${st.toGo >= 100 - st.yard ? "goal" : st.toGo} - ${spotOf(st.yard)}`, items, teams.user.clr);
    }
    if (m === "opp") {
      const f = this.feed, px = Math.max(2, Math.round(cam.s * 0.08)), lines = f.list.slice(Math.max(0, f.shown - 5), f.shown);
      ctx.fillStyle = "rgba(8,10,16,.9)"; ctx.fillRect(0, cam.H - px * 8 * 6.5, cam.W, px * 8 * 6.5);
      pixText(ctx, `${teams.opp.name} ball`, px * 2, cam.H - px * 8 * 6.2, px, "#9aa7b2");
      lines.forEach((e, i) => pixText(ctx, e.text.slice(0, Math.floor((cam.W - px * 4) / (6 * px))), px * 2, cam.H - px * 8 * 5 + i * px * 8, px, e.td || e.turnover || e.note ? "#ffd166" : "#fff"));
      pixText(ctx, "TAP TO SKIP", cam.W - px * 2, cam.H - px * 8 * 6.2, px, "rgba(255,255,255,.6)", "right");
    }
    if ((m === "result" || m === "kick" || m === "final") && this.banner) { const b = this.banner; drawBanner(ctx, cam, b.title, b.text, b.sub, teams.user.clr); }
    ctx.restore();
  }

  // ---- touch ----
  pt(e) { const r = this.cv.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
  onDown(e) {
    const m = this.mode, P = this.S, p = this.pt(e);
    if (m === "pick") { const b = this.buttons.find((b) => p.px >= b.x && p.px <= b.x + b.w && p.py >= b.y && p.py <= b.y + b.h); if (b) this.call(b.key); return; }
    if (m === "result" || m === "kick") { this.advance(); return; }
    if (m === "final") { this.onQuit?.(); return; }
    if (m === "opp") { this.feed.shown = this.feed.list.length; this.feed.at = 0; return; }
    if (m !== "play" || !P) return;
    this.cv.setPointerCapture?.(e.pointerId);
    if (P.kind) { this.touch = { ...p, cx: p.px, cy: p.py, moved: 0 }; return; } // a kick: the flick is read when you let go
    if (P.phase === "presnap") snap(P);
    this.touch = { ...p, moved: 0 };
    if (P.phase === "carry") P.steer = this.cam.toField(p.px, p.py).y;
  }
  onMove(e) {
    const t = this.touch, P = this.S, cam = this.cam; if (!t || !P) return;
    const p = this.pt(e); t.moved = Math.max(t.moved, Math.hypot(p.px - t.px, p.py - t.py)); t.cx = p.px; t.cy = p.py;
    if (P.kind) return;
    if (P.phase === "live" && P.ball.holder === "QB") {
      // pulling back from where you touched aims the throw the other way, mirrored on the screen
      const qb = P.ents.QB, [qx, qy] = cam.toScreen(qb.x, qb.y);
      const land = cam.toField(qx + (t.px - p.px) * PULL, qy + (t.py - p.py) * PULL);
      P.aim = t.moved > 6 ? { x: Math.max(qb.x - 1, land.x), y: Math.max(-26, Math.min(26, land.y)) } : null;
    } else if (P.phase === "carry") {
      P.steer = cam.toField(p.px, p.py).y;
      // a quick flick across the field is a juke
      const now = performance.now(); t.hist = (t.hist || []).filter((h) => now - h.t < 140); t.hist.push({ t: now, py: p.py });
      if (t.hist.length > 1 && Math.abs(p.py - t.hist[0].py) > 34) { if (juke(P) !== null) t.hist = []; }
    }
  }
  onUp() {
    const t = this.touch, P = this.S; this.touch = null; if (!t || !P) return;
    if (P.kind) { if (t.moved > 12 && P.phase === "presnap") { const cam = this.cam; kickFlick(P, (t.cx - t.px) / cam.s, (t.cy - t.py) / (cam.s * 0.42)); } return; }
    if (P.phase === "live" && P.ball.holder === "QB" && P.aim && t.moved > 6) throwTo(P, P.aim);
    P.aim = null; P.steer = null;
  }
}

export const kickNote = (P) => P.kind === "fg" && P.flick ? (P.flick.made ? "RIGHT DOWN THE MIDDLE" : P.flick.short ? "SHORT - FLICK HARDER" : P.flick.wide ? "WIDE - FLICK STRAIGHTER" : "PUSHED IT") : "";
export const resultTitle = (ev) => !ev ? "" : ev.td ? "TOUCHDOWN!" : ev.type === "int" ? "INTERCEPTED" : ev.type === "sack" ? "SACKED" : ev.type === "fumble" ? "FUMBLE" : ev.type === "inc" ? "INCOMPLETE" : ev.type === "fg" ? "FIELD GOAL" : ev.type === "fg_miss" ? "NO GOOD" : ev.type === "punt" ? "PUNT" : ev.type === "penalty" ? "FLAG" : ev.firstDown ? "FIRST DOWN" : `${ev.yards >= 0 ? "+" : ""}${ev.yards} YARDS`;
export const pickNote = (p) => p.why === "sacked" ? "THE RUSH GOT HOME" : p.target == null ? "" : `${p.open ? "OPEN" : "COVERED"}${p.def != null ? ` BY ${p.def} YD` : ""}${p.err != null ? ` - ${p.err <= 1 ? "ON THE MONEY" : p.err <= 2.2 ? "CATCHABLE" : "OFF TARGET"}` : ""}${p.why === "hurried" ? " - HURRIED" : p.why === "late" ? " - HELD IT TOO LONG" : ""}`;
