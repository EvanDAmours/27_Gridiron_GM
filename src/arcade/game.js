// The arcade game on a canvas, with no framework: the title screen, the play call, the field, the
// result, the other team's drive, and the pause menu. Arcade.jsx mounts it; scripts/arcade-dev/
// loads it straight into a browser for playtesting.
//
// Two ways to play, picked by what you last touched it with:
//  - TOUCH (phones, tablets): touch the field to snap, pull back like a slingshot and let go to
//    throw; swipe up and down to steer a runner, flick to juke; flick up the field to kick.
//  - MOUSE + KEYBOARD (computers): click or Space to snap; the throw goes where the pointer is;
//    click to throw, right-click (or Shift-click) to lob; the runner follows the pointer (or W/S),
//    Space jukes; to kick, aim with the pointer and hold the button, let go at the top of the meter.
// Either way, the pass button (Q on a keyboard) switches AUTO / BULLET / LOB, and the arc you see
// while aiming is the throw you'll get.
import { TEAMS, newGame, franchiseGame, lineups, runPlay, simOpponentDrive, situation, snapshot, restore, patWaiting, bookPat, flipSides } from "./bridge.js";
import { autoState, autoStep, autoCall } from "./autopilot.js";
import { backForSnap } from "../playsim.js";
import { setupPlay, snap, tick, throwTo, juke, dive, windNow, conceptChoices, playName, CONCEPTS, PLAY_NAMES, PASS_KINDS, passPlan, BULLET_RANGE } from "./play.js";
import { setupKick, kickFlick, tickKick, kickPlan, POSTS_X, kickMeter, kickAuto, meterZones, outOfRange } from "./kick.js";
import { sbName, sbNumber } from "../data/superbowls.js";
const sbTitle = () => { const d = new Date(), season = d.getMonth() < 2 ? d.getFullYear() - 1 : d.getFullYear(); return sbName(sbNumber(season)); };
import { sfx, unlock, toggleMute, isMuted, ambient, ambientHype } from "./sfx.js";
import { FX } from "./fx.js";
import * as K from "./ratings.js";
import { rollWeather, WX, wxOf } from "../weather.js";
import { teamKey } from "../teamUniforms.js";
import { makeCamera, drawRetro, drawLowerThird, drawHud, drawDownBox, drawBanner, drawPlayCards, drawChip, drawSwitch, drawHint, drawWeather, drawWxChip, drawBoxScore, pixWidth, drawMenu, drawNameTags, drawReplayTag, drawCeremony, drawSbCard, perfStats, drawPause, preload, pixText, KIND_COLOR, uiPx } from "./retro.js";

const PULL = 3.2; // touch: the throw goes this many times the pull-back, the other way, on the screen
const spotOf = (yard) => (yard === 50 ? "MIDFIELD" : yard < 50 ? `OWN ${yard}` : `OPP ${100 - yard}`);
const ordinal = (n) => ["1ST", "2ND", "3RD", "4TH"][n - 1] || `${n}TH`;
// quarter lengths on offer (minutes): short like Retro Bowl by default, up to a full NFL quarter
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const QMINS = [3, 5, 8, 15];
// the weather setting: AUTO rolls the home club's own city (a dome stays a dome)
// the wind for a day like this: a breeze most days, a real wind on a windy one (rough in a storm),
// none indoors; from any direction (yards a second along and across the field; 1 mph = 0.49 yd/s)
export function windFor(wx, R = Math.random) {
  const mph = wx === "dome" ? 0 : Math.round(wx === "wind" ? 16 + R() * 10 : /heavy/i.test(wx) ? 8 + R() * 10 : R() * 9), ang = R() * Math.PI * 2;
  return mph ? { mph, x: Math.cos(ang) * mph * 0.49, y: Math.sin(ang) * mph * 0.49 } : null;
}
const wxName = (k) => (k === "auto" ? "AUTO" : (WX[k]?.label || k).toUpperCase());
const WXPICKS = ["auto", "clear", "lightRain", "heavyRain", "lightSnow", "heavySnow", "wind", "frigid", "dome"];
const CALLS = [["pass_quick", "QUICK"], ["pass_medium", "MEDIUM"], ["pass_deep", "DEEP"], ["run_inside", "INSIDE RUN"], ["run_outside", "OUTSIDE RUN"]];
const KICK_CYCLE = 1.1; // seconds for the kick meter to fill (then it falls back)
const inside = (p, b) => b && p.px >= b.x && p.px <= b.x + b.w && p.py >= b.y && p.py <= b.y + b.h;

// where the camera sits while the quarterback has the ball: the line of scrimmage 25% in from the left
const holdX = (cam, P) => (P.los ?? P.ball.x) + Math.max(cam.lead, 0.17 * cam.W / cam.s);
export class ArcadeGame {
  // A franchise game (Play in Arcade): game is the prebuilt engine game (your club as "h"), teams
  // the two clubs (user, opp, and userAway when you're the visitors); locked keeps its weather and
  // length as they are (the real ones); onPlay(g) after every play (the app saves the game so a
  // reload picks it up); onFinish(g) when you leave the final box score; onSimRest() from the
  // pause menu (the rest of the game is played out by the engine and still counts).
  constructor(canvas, { userTi = 17, oppTi = 8, teams, onQuit, rand, skipMenu = false, game = null, locked = false, onPlay = null, onFinish = null, onSimRest = null, live = null } = {}) {
    this.cv = canvas; this.onQuit = onQuit; this.rand = rand;
    // live: the franchise's live game shown on this field (App.jsx): { g, userSide, watch, teams: { h, a },
    // onEvent(ev, offSide) } -- the engine game itself, the real way round between snaps
    this.live = live; this.speed = 1;
    this.franchise = game; this.locked = locked || !!game || !!live; this.onPlay = onPlay; this.onFinish = onFinish; this.onSimRest = onSimRest;
    this.userTi = userTi; this.oppTi = oppTi; this.teams = teams || { user: TEAMS[userTi], opp: TEAMS[oppTi] };
    this.fx = new FX(); this.time = 0; this.hype = 0; this.fade = 1;
    this.sbMode = false; try { this.sbMode = localStorage.getItem("arcade_sb") === "1"; } catch { /* storage unavailable */ } this.wxPick = "auto"; try { const w = localStorage.getItem("arcade_wx"); if (WXPICKS.includes(w)) this.wxPick = w; } catch { /* storage unavailable */ } this.qMin = 5; try { const q = +localStorage.getItem("arcade_qmin"); if (QMINS.includes(q)) this.qMin = q; } catch { /* storage unavailable */ } this.passKind = "bullet"; try { const k = localStorage.getItem("arcade_pass"); if (k === "bullet" || k === "lob") this.passKind = k; } catch { /* storage unavailable */ } this.input = matchMedia?.("(pointer: coarse)").matches ? "touch" : "mouse";
    this.touch = null; this.mouse = null; this.keys = new Set(); this.buttons = []; this.chips = {}; this.menuFocus = "user"; this.paused = false;
    this.S = null; this.g = null; this.mode = "menu"; this.banner = null; this.feed = { list: [], shown: 0, at: 0 };
    for (const n of ["onDown", "onMove", "onUp", "onKey", "onKeyUp", "fit", "noMenu"]) this[n] = this[n].bind(this);
    canvas.addEventListener("pointerdown", this.onDown); canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp); canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("contextmenu", this.noMenu);
    window.addEventListener("keydown", this.onKey); window.addEventListener("keyup", this.onKeyUp); window.addEventListener("resize", this.fit); document.addEventListener("fullscreenchange", this.fit); document.addEventListener("webkitfullscreenchange", this.fit);
    this.fit();
    if (skipMenu) this.start();
    this.last = 0; this.raf = requestAnimationFrame((t) => this.loop(t));
  }
  destroy() { ambient(false);
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.fit); document.removeEventListener("fullscreenchange", this.fit); document.removeEventListener("webkitfullscreenchange", this.fit); window.removeEventListener("keydown", this.onKey); window.removeEventListener("keyup", this.onKeyUp);
    for (const [n, f] of [["pointerdown", this.onDown], ["pointermove", this.onMove], ["pointerup", this.onUp], ["pointercancel", this.onUp], ["contextmenu", this.noMenu]]) this.cv.removeEventListener(n, f);
  }
  noMenu(e) { e.preventDefault(); }
  // ---- full screen ----
  // Desktop browsers and Android: the real thing (no tabs, no address bar), turned sideways on a
  // phone. iPhone Safari can't do it for a page; added to the Home Screen it opens with no browser.
  get fsState() {
    const d = document, on = !!(d.fullscreenElement || d.webkitFullscreenElement);
    if (on) return "on";
    if (d.fullscreenEnabled || d.webkitFullscreenEnabled) return "off";
    return navigator.standalone ? null : "ios";
  }
  async fullscreen(want = true) {
    const d = document, el = this.live && !this.live.solo ? this.cv.parentElement : d.documentElement; // (a live game: just the field, not the whole app)
    try {
      if (want && !(d.fullscreenElement || d.webkitFullscreenElement)) { await (el.requestFullscreen?.({ navigationUI: "hide" }) ?? el.webkitRequestFullscreen?.()); await screen.orientation?.lock?.("landscape").catch(() => {}); }
      else if (!want) await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
    } catch { /* not allowed here: carry on in the window */ }
    setTimeout(this.fit, 120);
  }
  get mobile() { return this.input === "touch"; }

  fit() {
    const cv = this.cv, wrap = cv.parentElement, dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = wrap.clientWidth, H = wrap.clientHeight;
    // on a desktop window the game sits in a 16:9 frame (at most ~1000 px wide) in the middle of the
    // page, like a console game in a browser; on a phone, or in full screen, it fills the screen
    const full = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (this.input === "mouse" && !full && (!this.live || this.live.solo)) { // (inside the live game screen it fills the box the app gives it)
      const fw = Math.min(1000, W * 0.9, (H * 0.9) * 16 / 9); W = Math.round(fw); H = Math.round(fw * 9 / 16);
      Object.assign(wrap.style, { display: "flex", alignItems: "center", justifyContent: "center" });
      cv.style.borderRadius = "6px"; cv.style.boxShadow = "0 0 0 2px #1d2433, 0 20px 60px rgba(0,0,0,.6)";
    } else { cv.style.borderRadius = ""; cv.style.boxShadow = ""; }
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
    const cam = makeCamera(W, H, { span: this.live ? 54 : 66 }); cam.camX = this.cam?.camX ?? (this.S ? this.S.ball.x : this.g?.yard ?? 25) + cam.lead; this.cam = cam;
  }
  // the scoreboard at the 50 shows the game as of the last booked play the app has (taken here, when
  // the play is handed over): the engine books a play at the tackle, before the runner is down, and the
  // board mustn't move on ahead of the app's
  // ---- the instant replay (a live game): every frame of a scrimmage play is kept (the players and the
  // ball as they were, and the camera); after a score, a turnover or a long gain the play runs again in
  // slow motion with a REPLAY tag. A click skips it.
  recFrame(P) {
    let r = this.rec; if (!r || r.S !== P) r = this.rec = { S: P, teams: this.teams, board: this.board, frames: [] };
    if (r.frames.length > 1200 || P.phase === "presnap") return;
    const ents = {}; for (const k in P.ents) ents[k] = { ...P.ents[k] };
    const top = {}; for (const k in P) { if (k === "ents" || k === "ball" || k === "g" || k === "L") continue; const v = P[k]; top[k] = Array.isArray(v) ? v.slice() : v; }
    r.frames.push({ top, ents, ball: { ...P.ball, flight: P.ball.flight ? { ...P.ball.flight } : null }, camX: this.cam.camX, time: this.time });
  }
  startReplay() { const r = this.pendingReplay; this.pendingReplay = null; if (!r) return this.advance(); const end = r.frames[r.frames.length - 1].time, frames = r.frames.filter((f) => f.time >= end - 3.6); this.replay = { ...r, frames, i: 0, clock: 0, t0: frames[0].time }; /* (the end of the play: the catch and the run, the score) */ this.banner = null; this.mode = "replay"; this.fade = Math.max(this.fade, 0.5); }
  stepReplay(dt) {
    const rp = this.replay; if (!rp) return this.endReplay();
    rp.clock += dt * 0.6; const fr = rp.frames;
    while (rp.i < fr.length - 1 && fr[rp.i + 1].time - rp.t0 <= rp.clock) rp.i++;
    if (rp.i >= fr.length - 1 && rp.clock > fr[fr.length - 1].time - rp.t0 + 0.7) this.endReplay();
  }
  endReplay() { this.replay = null; this.pendingReplay = null; if (this.mode === "replay") { this.mode = "result"; this.fade = Math.max(this.fade, 0.5); this.advance(); } }
  // ---- the trophy ceremony (the app asks for it when you win the Super Bowl) ----
  startCeremony(c) { if (this.ceremony || this.cerNext) return; this.cerNext = c; this.cerAt = this.time + 2.4; }
  beginCeremony() {
    const c = this.cerNext; this.cerNext = null; this.held = false;
    this.S = null; this.auto = null; this.replay = null; this.pendingReplay = null; this.rec = null; this.banner = null; this.unflip();
    this.ceremony = { ...c, t0: this.time, team: c.team || this.live.teams[c.winner], away: c.away ?? c.winner === "a", last: -1, handed: false };
    this.mode = "ceremony"; this.fade = 1; this.cam.camX = 50 - (this.cam.W * 0.08) / this.cam.s; this.push = 1;
    sfx.touchdown(); this.fx.flashScreen("#fff", 0.5);
  }
  stepCeremony(dt) {
    const c = this.ceremony, t = this.time - c.t0, cam = this.cam; this.hype = 1;
    const colors = [c.team.clr || "#1e3a8a", c.team.ac || "#ffffff", "#fbbf24", "#fde68a", "#ffffff"];
    const beat = Math.floor(t / 0.7); if (beat !== c.last && this.fx.parts.length < 1400) { c.last = beat; this.fx.confetti(cam.W, colors); }
    // the stage's cannons fire gold and white streamers every couple of seconds (screen space: through the
    // same close-in on the stage the picture has)
    const shot = Math.floor((t - 1) / 1.7); if (t > 1 && shot !== c.shot) { c.shot = shot; const k = 1 + 0.22 * Math.min(1, t / 3), [fx, fy] = cam.toScreen(50, -6);
      for (const x of [42.6, 57.4]) { const [px, py] = cam.toScreen(x, -6.3), sx = fx + (px - fx) * k, sy = fy + (py - cam.s * 1.1 - cam.s * 1.2 - fy) * k; this.fx.burst(sx, sy, { n: 26, colors: ["#fde68a", "#fbbf24", "#ffffff", c.team.clr || "#fff"], speed: 220, up: 260, size: 4, life: 1.4, grav: 260 }); } }
    if (t >= 8.2 && !c.handed) { c.handed = true; sfx.touchdown(); this.fx.flashScreen("#fff8dc", 0.45); this.fx.punch(1.05, 0.8); }
    cam.camX += (50 - (cam.W * 0.08) / cam.s - cam.camX) * Math.min(1, dt * 3); // (midfield in the middle of the screen)
  }
  refresh() { this.sit = situation(this.g); const g = this.g; this.board = g ? { score: { ...g.score }, to: g.to ? { ...g.to } : null, clock: g.clock, qtr: g.qtr, ot: g.ot, done: g.done, koNext: g.koNext, poss: g.poss, down: g.down, toGo: g.toGo, yard: g.yard } : null; }

  // ---- the flow ----
  start() {
    if (this.live) { const L = this.live; preload(L.teams.h); preload(L.teams.a); this.g = L.g; this.flipped = false; this.teams = this.viewTeams(); this.sit = situation(this.g); this.fade = 1; this.advance(); ambient(true); return; }
    if (this.franchise) { preload(this.teams.user); preload(this.teams.opp); this.g = this.franchise; this.sit = situation(this.g); this.fade = 1; this.advance(); ambient(true); return; }
    this.teams = { user: TEAMS[this.userTi], opp: TEAMS[this.oppTi] };
    preload(this.teams.user); preload(this.teams.opp);
    const R = this.rand || Math.random, pick = this.wxPick;
    const wx = pick === "auto" ? rollWeather(teamKey(this.teams.user), R) : pick;
    this.sb = this.sbMode && !this.franchise ? sbTitle() : null; if (this.sb) this.sbCardAt = this.time;
    this.mode = "loading"; this.S = null; this.ceremony = null; this.cerNext = null; this.box = null; this.banner = null;
    const opts = { ...(this.rand ? { rand: this.rand } : {}), qLen: this.qMin * 60, wx, wind: windFor(wx, R), playoff: !!this.sb }, seq = (this.startSeq = (this.startSeq || 0) + 1);
    franchiseGame(this.userTi, this.oppTi, opts).catch((e) => { console.error("arcade: franchise setup failed, using the plain rosters", e); return newGame(this.userTi, this.oppTi, opts).g; }).then((g) => {
      if (seq !== this.startSeq) return; // (started again meanwhile)
      this.live = { solo: true, g, userSide: "h", watch: false, night: false, teams: { h: { ...TEAMS[this.userTi], isAway: false }, a: { ...TEAMS[this.oppTi], isAway: true } }, onEvent: null };
      this.g = g; this.flipped = false; this.teams = this.viewTeams(); this.sit = situation(g); this.refresh(); this.fade = 1; this.advance(); ambient(true);
    });
  }
  // what happens next: the other team's drive (and any kickoff), or your next call
  advance() {
    if (this.live) return this.liveNext();
    const g = this.g; this.banner = null;
    if (this.onPlay && !this.two) try { this.onPlay(g); } catch { /* saving is best effort */ }
    if (patWaiting(g)) { this.S = null; this.mode = "pat"; this.fade = Math.max(this.fade, 0.6); this.refresh(); return; } // your try after a touchdown
    if (g.done) { this.refresh(); if (this.sb && this.sit.score.h > this.sit.score.a && !this.ceremony) { this.cerNext = { winner: "h", name: this.sb, team: this.teams.user, away: false }; this.beginCeremony(); return; } this.mode = "final"; this.endBanner(); return; }
    if (g.koNext || g.poss !== "h") {
      const before = { ...g.score };
      const evs = simOpponentDrive(g); if (this.onPlay) try { this.onPlay(g); } catch { /* best effort */ }
      const shown = evs.filter((e) => e.text).flatMap((e) => (e.note ? [e, { text: `-- ${e.note} --`, note: true }] : [e]));
      this.feed = { list: shown, shown: 0, at: performance.now(), scored: g.score.a > before.a };
      this.mode = "opp"; this.refresh(); return;
    }
    this.S = null; this.mode = "pick"; this.snapRB = backForSnap(g); this.fade = Math.max(this.fade, 0.6); this.refresh();
  }
  // Something went wrong mid-play: drop the play on the field (it hasn't been booked, so the game is as
  // it was before the snap) and carry on with the next one.
  recover(e) {
    console.error("arcade: recovered from", e);
    this.errors = (this.errors || 0) + 1;
    try { if (this.two) { restore(this.g, this.two.snap); this.two = null; } this.S = null; this.auto = null; if (this.live) { this.unflip(); this.mode = "idle"; this.liveNext(); } else { this.advance(); } } catch (e2) { console.error("arcade: recovery failed", e2); }
  }
  // ---- the franchise's live game ----
  // The team with the ball is always side h on this field (it drives left to right): for the other
  // team's snaps the game is turned round (flipSides) and turned back the moment the play is booked,
  // so between snaps it's always the real way round for the app.
  // the benches: your club near, theirs far, the whole game (never the field's way round for a snap)
  benchTeams() { const L = this.live; if (L?.teams) { const me = L.userSide || "h"; return { near: L.teams[me], far: L.teams[me === "h" ? "a" : "h"] }; } return this.teams ? { near: this.teams.user, far: this.teams.opp } : null; }
  viewTeams() { const t = this.live.teams; return this.flipped ? { user: t.a, opp: t.h } : { user: t.h, opp: t.a }; }
  flip() { flipSides(this.g); this.flipped = !this.flipped; this.teams = this.viewTeams(); this.refresh(); }
  unflip() { if (this.flipped) this.flip(); if (this.g) this.g.patDefer = null; }
  emit(ev, off) { if (ev) try { this.live.onEvent?.(ev, off); } catch (e) { console.error(e); } }
  liveNext() {
    if (this.mode === "ceremony" || this.cerNext) { if (this.cerNext && this.g?.done) { this.S = null; this.mode = "idle"; } return; }
    const g = this.g, L = this.live; this.banner = null; this.auto = null;
    if (!g || this.held) return;
    if (g.done) { this.unflip(); this.S = null; this.mode = "idle"; this.refresh(); if (L.solo) this.finishSolo(); return; }
    if (patWaiting(g)) { this.offReal = g.patPending.off; if (g.patPending.off !== "h") this.flip(); this.S = null; this.mode = "pat"; this.fade = Math.max(this.fade, 0.6); this.refresh(); return; } // your try after your touchdown
    this.unflip();
    if (g.koNext) { const off = g.poss, ev = runPlay(g); this.emit(ev, off); this.showEngine(ev); return; } // the kickoff: the engine's
    const off = g.poss; this.offReal = off;
    if (off !== "h") this.flip();
    const mine = off === L.userSide && !L.watch;
    g.patDefer = mine ? { h: true } : null;
    if (mine) { this.S = null; this.mode = "pick"; this.snapRB = backForSnap(g); this.fade = Math.max(this.fade, 0.6); this.refresh(); return; }
    // the computer's snap: the engine's coach makes the call (run or pass, or a kick, a kneel, a spike)
    const snap = snapshot(g), ev = runPlay(g);
    const k = ev?.k, scrim = ev && !ev.kneel && !ev.spike && ev.type !== "penalty" && ["run", "pass", "inc", "int", "sack"].includes(k);
    // a punt or a field goal: played out on the field (the engine kicks it again from the same spot)
    if (ev && !ev.kneel && !ev.spike && ["punt", "fg", "fg_miss"].includes(ev.type)) { restore(g, snap); this.call(ev.type === "punt" ? "punt" : "fg"); this.meter = null; this.autoKick = { at: this.time + 1.3 / (this.speed || 1) }; return; }
    if (!scrim) { const o = this.offReal; this.unflip(); this.emit(ev, o); this.showEngine(ev); return; } // a kneel, a flag: as the engine called it
    restore(g, snap);
    this.snapRB = backForSnap(g);
    const c = autoCall(k === "run" ? "run" : "pass");
    this.call(c); this.auto = { call: CONCEPTS[c]?.cat || c, state: autoState(), snapAt: this.time + 1.5 / this.speed };
  }
  // a play the engine ran without the field (a kickoff, a punt, a field goal, a kneel): its result
  showEngine(ev) { this.S = null; this.banner = ev ? withFlag({ engine: true, title: resultTitle(ev), text: ev.text || "", sub: [whyNote(ev), ev.note ? String(ev.note).toUpperCase() : null].filter(Boolean).join(" - ") || null, at: performance.now(), accent: ev.td || ev.type === "fg" ? "#ffd166" : "#fff" }, ev) : null; this.mode = "result"; this.refresh(); }
  // the app needs the game (Finish game, Sim to the end of the quarter): drop the play on the field
  // (it hasn't been booked) and hand the game back the real way round; resume() picks it up again
  release() { if (this.two) { restore(this.g, this.two.snap); this.two = null; } this.S = null; this.auto = null; this.replay = null; this.pendingReplay = null; this.rec = null; this.unflip(); this.held = true; this.mode = "idle"; this.refresh(); }
  resume() { this.held = false; if (this.live && (this.mode === "idle" || this.mode === "result")) this.liveNext(); }
  setWatch(w) { if (this.live) this.live.watch = !!w; }
  call(c) {
    const g = this.g; this.fade = this.live ? 0.22 : 0.5; // (a live game: just a soft cut between snaps)
    const P = c === "xp" ? setupKick(g, lineups(g), "fg", { pat: true }) : c === "punt" || c === "fg" ? setupKick(g, lineups(g), c) : setupPlay(g, lineups(g, { rb: this.snapRB }), c);
    P.view = this.teams; // (the field keeps this play's way round, uniforms and sidelines, until the next snap: the tackle hands the game back the real way round, and the picture mustn't flip with it)
    this.S = P; this.cam.camX = P.kind ? P.ball.x + this.cam.lead : holdX(this.cam, P); this.mode = "play"; this.kick = null; this.refresh();
    this.meter = P.kind ? { t: 0, stop: null } : null; this.autoKick = null; // (your kick: the meter starts sweeping)
    sfx.select?.();
  }
  // the weather setting: on the title screen it's for the next game; in the pause menu it changes
  // the game in progress on the spot (AUTO there rolls the home city again)
  cycleWx(now = false) {
    this.wxPick = WXPICKS[(WXPICKS.indexOf(this.wxPick) + 1) % WXPICKS.length];
    try { localStorage.setItem("arcade_wx", this.wxPick); } catch { /* ignore */ }
    sfx.select?.();
    if (now && this.g) { const R = this.rand || Math.random, wx = this.wxPick === "auto" ? rollWeather(teamKey(this.teams.user), R) : this.wxPick; this.g.wx = wx; this.g.wxE = wxOf(wx); this.g.wind = windFor(wx, R); }
  }
  // the try: kick it, or go for two (a real snap from the 2, played on a copy of the game)
  patChoice(k) {
    const g = this.g;
    if (k === "xp") return this.call("xp");
    this.two = { snap: snapshot(g) }; delete g.patPending; g.done = false; g.yard = 98; g.down = 1; g.toGo = 2;
    this.S = null; this.mode = "pick"; this.snapRB = backForSnap(g); this.refresh(); sfx.select?.();
  }
  // the final box score from the engine's own book of the game
  makeBox() {
    const g = this.g, T = g.stats || {}, h = T.h || {}, a = T.a || {}, lines = Object.values(g.box?.h || {});
    const tot = (t) => (t.passYds || 0) + (t.rushYds || 0), lead = (k) => lines.filter((l) => l[k]).sort((p, q) => q[k] - p[k])[0];
    const qb = lead("passYds"), rb = lead("rushYds"), wr = lead("recYds");
    const leaders = [];
    if (qb) leaders.push(["PASSING", `${qb.name.toUpperCase()} ${qb.comp || 0}/${qb.att || 0} ${qb.passYds} YD${qb.passTD ? `, ${qb.passTD} TD` : ""}${qb.passInt ? `, ${qb.passInt} INT` : ""}`]);
    if (rb) leaders.push(["RUSHING", `${rb.name.toUpperCase()} ${rb.rushAtt} CAR ${rb.rushYds} YD${rb.rushTD ? `, ${rb.rushTD} TD` : ""}`]);
    if (wr) leaders.push(["RECEIVING", `${wr.name.toUpperCase()} ${wr.rec} REC ${wr.recYds} YD${wr.recTD ? `, ${wr.recTD} TD` : ""}`]);
    // the player of the game: most yards plus twenty a touchdown, on your side
    const val = (l) => (l.passYds || 0) * 0.5 + (l.rushYds || 0) + (l.recYds || 0) + 20 * ((l.passTD || 0) + (l.rushTD || 0) + (l.recTD || 0)) - 25 * (l.passInt || 0);
    const pog = lines.slice().sort((p, q) => val(q) - val(p))[0];
    const st = this.sit, lead_ = st.score.h - st.score.a;
    this.box = {
      title: lead_ > 0 ? "YOU WIN!" : lead_ < 0 ? "YOU LOSE" : "TIE GAME", sub: `${this.teams.user.name.toUpperCase()} ${st.score.h} - ${st.score.a} ${this.teams.opp.name.toUpperCase()}`,
      rows: [["TOTAL YARDS", tot(h), tot(a)], ["PASSING", h.passYds || 0, a.passYds || 0], ["RUSHING", h.rushYds || 0, a.rushYds || 0], ["TURNOVERS", (h.ints || 0) + (h.fumLost || 0), (a.ints || 0) + (a.fumLost || 0)], ["SACKED", h.sacks || 0, a.sacks || 0]],
      leaders, pog: pog && val(pog) > 0 ? pog.name.toUpperCase() : null,
    };
  }
  endHint() { return this.franchise ? (this.mobile ? "TAP TO CONTINUE" : "CLICK OR ENTER TO CONTINUE") : this.mobile ? "TAP FOR A NEW GAME" : "CLICK OR ENTER FOR A NEW GAME"; }
  // leaving the final box score: a franchise game goes back to the season; otherwise the title screen
  leaveFinal() { if (this.franchise) { if (!this.left) { this.left = true; ambient(false); this.onFinish?.(this.g); } return; } this.mode = "menu"; this.S = null; if (this.live?.solo) this.live = null; }
  // the pause menu's SIM TO THE END: the engine plays out the rest (it counts), then the box score
  simRest() {
    const g = this.g; if (!g) return;
    if (this.two) { restore(g, this.two.snap); this.two = null; }
    if (this.live) this.unflip(); this.auto = null; this.replay = null; this.pendingReplay = null;
    this.S = null; let n = 0;
    while (!g.done && n++ < 900) runPlay(g);
    this.onPlay?.(g); this.refresh();
    if (this.sb && this.sit.score.h > this.sit.score.a && !this.ceremony) { this.cerNext = { winner: "h", name: this.sb, team: this.teams.user, away: false }; this.beginCeremony(); } else { this.mode = "final"; this.endBanner(); }
    this.onSimRest?.(g);
  }
  finishSolo() {
    if (this.sb && this.sit.score.h > this.sit.score.a && !this.ceremony) { this.cerNext = { winner: "h", name: this.sb, team: this.live.teams.h, away: false }; this.beginCeremony(); return; }
    this.mode = "final"; this.endBanner();
  }
  // out of the ceremony (the standalone arcade): the box score, as after any game
  leaveCeremony() { if ((this.live && !this.live.solo) || this.mode !== "ceremony") return; this.mode = "final"; this.refresh(); this.endBanner(); this.banner.title = "WORLD CHAMPIONS!"; }
  endBanner() { this.makeBox(); const st = this.sit, lead = st.score.h - st.score.a; this.banner = { title: lead > 0 ? "YOU WIN!" : lead < 0 ? "YOU LOSE" : "TIE GAME", text: `${this.teams.user.name} ${st.score.h}, ${this.teams.opp.name} ${st.score.a}`, sub: null, at: performance.now(), hint: this.endHint() }; if (lead > 0) { this.fx.confetti(this.cam.W, [this.teams.user.clr, this.teams.user.ac, "#ffd166", "#fff"]); sfx.touchdown(); } }

  get perf() { return perfStats; }
  // ---- the loop ----
  loop(now) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    const t0 = performance.now();
    try { this.advanceTime(dt, now); this.draw(); } catch (e) { this.recover(e); } // (one bad frame never freezes the field)
    (this.frameMs ||= []).push(performance.now() - t0); if (this.frameMs.length > 600) this.frameMs.shift();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }
  // the live game's speed: faster is more steps a frame (each the normal size, so a tackle is never
  // stepped over), slower is shorter steps
  advanceTime(dt, now = performance.now()) {
    const sp = this.live ? this.speed || 1 : 1;
    if (sp <= 1) return this.update(dt * sp, now);
    for (let i = 0, n = Math.round(sp); i < n; i++) this.update(dt, now);
  }
  // one step of the game (the browser loop and the playtest harness both use it)
  update(dt, now = performance.now()) {
    this.time += dt; this.fade = Math.max(0, this.fade - dt * 2.5); this.hype = Math.max(0, this.hype - dt * 0.5); ambientHype(this.hype);
    if (this.paused || this.mode === "menu" || this.mode === "loading") { this.fx.step(dt); return; }
    if (this.mode === "replay") { this.fx.step(dt); this.stepReplay(dt); return; }
    if (this.cerNext && this.time >= this.cerAt) this.beginCeremony();
    if (this.mode === "ceremony") { this.fx.step(dt); this.stepCeremony(dt); return; }
    const live = this.fx.step(dt); // (hit-stop slows the field for a beat)
    const P = this.S, cam = this.cam, m = this.mode;
    if (P && cam) {
      if (this.auto && !P.kind) { if (P.phase === "presnap" && this.time >= this.auto.snapAt) snap(P); autoStep(P, this.auto.call, this.auto.state); } else this.controls(P, dt);
      if (P.kind && this.autoKick && P.phase === "presnap" && this.time >= this.autoKick.at) { this.autoKick = null; try { kickAuto(P); } catch (e) { console.error(e); } }
      const going = P.kind ? tickKick(P, live) : tick(P, live);
      this.react(P);
      if (this.live && !P.kind && m === "play") this.recFrame(P);
      // the camera leads the ball a little; with a throw in the air it frames the ball and where it's going
      const f = P.ball.flight, over = P.phase === "tackle" || P.phase === "fall" || P.phase === "done";
      // until the ball leaves the quarterback's hands the camera holds still, with the line of
      // scrimmage a quarter of the way in, so the routes stay on screen as they develop; after
      // that it leads the runner, and with a throw in the air it frames the ball and its spot
      const qbHas = !P.kind && !over && (P.ball.holder === "QB" || Math.max(P.ball.x + cam.lead, 0) < holdX(cam, P)); // (a back behind the line too)
      // (before a field goal: the kicker and the posts both in the picture, if they fit)
      const kickView = P.kind === "fg" && P.phase === "presnap" ? Math.min(P.ball.x - 4 + (cam.W * 0.42) / cam.s, Math.max(P.ball.x + cam.lead, POSTS_X + 5 - (cam.W * 0.58) / cam.s)) : null;
      const want = kickView ?? (f ? (P.ball.x + f.to.x) / 2 + 2 : qbHas ? holdX(cam, P) : P.ball.x + (over ? 0 : cam.lead));
      cam.camX += (want - cam.camX) * Math.min(1, dt * (f ? 3.5 : 5));
      cam.camX = Math.max(-21 + (cam.W * 0.42) / cam.s, Math.min(121 - (cam.W * 0.58) / cam.s, cam.camX)); // never far past the end zones: the goalposts and the crowd behind them stay in the picture
      if (!going && P.phase === "done" && m === "play") {
        let ev = P.result || P.ev;
        // a two-point try was played on a scratch copy of the game from the 2: put the game back and book the try
        if (this.two) { const good = !!ev?.td; restore(this.g, this.two.snap); this.two = null; ev = bookPat(this.g, true, good); P.text = ev?.text; P.pick = null; this.refresh(); }
        this.banner = withFlag({ title: resultTitle(ev), text: P.text || ev?.text || "", sub: [whyNote(ev), ev?.note ? String(ev.note).toUpperCase() : P.kind ? kickNote(P) : P.pick ? pickNote(P.pick) : null].filter(Boolean).join(" - ") || null, at: now, accent: ev?.td || ev?.type === "fg" ? "#ffd166" : ev?.turnover || ev?.type === "int" || ev?.type === "fumble" ? "#ff8a7a" : ev?.firstDown ? "#ffd166" : "#fff" }, ev);
        this.mode = "result"; this.refresh();
        // saved the moment it's booked, so leaving now can't take the play back
        if (this.onPlay && !this.two) try { this.onPlay(this.g); } catch { /* best effort */ }
        this.pendingReplay = this.live && this.rec?.S === P && (this.speed || 1) < 2 && this.rec.frames.length > 30 && (ev?.td || ev?.turnover || ev?.type === "int" || ev?.type === "fumble" || (Number.isFinite(ev?.yards) && ev.yards >= 30)) ? this.rec : null;
        if (this.live) { const o = this.offReal; this.unflip(); this.emit(ev, o); }
      }
    }
    if (m === "opp") { const f = this.feed; if (now - f.at > 600 && f.shown < f.list.length) { f.shown++; f.at = now; if (f.list[f.shown - 1]?.td) { sfx.turnover(); this.fx.hit(0.6); } } else if (f.shown >= f.list.length && now - f.at > 1100) this.advance(); }
    if ((m === "result") && this.banner && now - this.banner.at > (this.banner.stages ? this.banner.stages[0].dur * 1000 + 2600 : /TOUCHDOWN/.test(this.banner.title) ? 3400 : this.live ? 1300 / this.speed : 1700)) { if (this.pendingReplay) this.startReplay(); else this.advance(); }
  }

  // held keys and the pointer, every frame: the runner's steering, the mouse aim, the kick meter
  controls(P, dt) {
    const up = this.keys.has("w") || this.keys.has("arrowup"), down = this.keys.has("s") || this.keys.has("arrowdown");
    if (P.phase === "carry" && P.ents[P.ball.holder]?.side === "off") {
      const c = P.ents[P.ball.holder];
      if (up || down) { this.keySteer = (this.keySteer ?? c.y) + (down ? 1 : -1) * 22 * dt; this.keySteer = Math.max(-26, Math.min(26, this.keySteer)); P.steer = this.keySteer; }
      else if (this.input === "mouse" && this.mouse) { this.keySteer = null; P.steer = this.cam.toField(this.mouse.px, this.mouse.py).y; }
    } else this.keySteer = null;
    if (!P.kind && P.phase === "live" && P.ball.holder === "QB" && P.call?.startsWith("pass") && this.input === "mouse" && this.mouse) {
      const f = this.cam.toField(this.mouse.px, this.mouse.py), qb = P.ents.QB;
      P.aim = { x: Math.max(qb.x - 1, f.x), y: Math.max(-26, Math.min(26, f.y)) };
    }
    if (P.kind && this.kick?.charging) this.kick.t += dt;
    if (P.kind && this.meter && this.meter.stop == null && P.phase === "presnap") this.meter.t += dt;
  }

  // sound and effects on what just happened on the field (compared with last frame)
  react(P) {
    const was = this.heard || {}, now = { phase: P.phase, flight: !!P.ball.flight, holder: P.ball.holder, broke: P.broke || 0 }, fx = this.fx, cam = this.cam;
    if (was.play !== P) { this.heard = { ...now, play: P }; return; }
    const at = (e) => cam.toScreen(e.x, e.y);
    if (was.phase === "presnap" && now.phase !== "presnap" && !P.kind) sfx.snap();
    if (!was.flight && now.flight) (P.kind ? sfx.kick : sfx.throw)();
    if (now.phase === "carry" && was.phase !== "carry") {
      const h = P.ents[now.holder], [x, y] = at(h);
      if (h.side === "def") { sfx.turnover(); fx.flashScreen("#ff5a4a", 0.25); fx.hit(0.8); this.hype = 0.6; }
      else if (P.call?.startsWith("pass")) { sfx.catch(); fx.sparkle(x, y - cam.s * 2, "#fff"); }
    }
    if (now.broke > was.broke) { const h = P.ents[now.holder]; if (h) { const [x, y] = at(h); fx.burst(x, y, { n: 10, colors: ["#6aa84f", "#c9b79c", "#3f7f2f"], speed: 90 }); fx.float(P.log[P.log.length - 1]?.includes("juked") ? "JUKE!" : "BROKEN TACKLE!", x, y - cam.s * 4, "#7fe3ff", 1); } sfx.juke(); this.hype = Math.max(this.hype, 0.4); }
    if ((now.phase === "tackle" || now.phase === "fall") && was.phase !== now.phase) {
      const ev = P.result, h = P.ents[P.ball.holder] || P.ents.QB, [x, y] = at(h), gain = ev?.yards;
      if (ev?.td) { sfx.touchdown(); sfx.crowd?.(); fx.punch(1.07, 1.2); fx.flashScreen("#fff", 0.3); this.hype = 1; }
      else if (ev?.type === "fg") { sfx.good(); sfx.crowd?.(); fx.sparkle(x, y, "#ffd166"); this.hype = 0.7; }
      else if (ev?.type === "fumble") { sfx.turnover(); fx.hit(1); }
      else if (now.phase === "tackle") {
        const big = ev?.type === "sack" ? 1.3 : 0.8; sfx.tackle(); fx.hit(big); fx.burst(x, y, { n: ev?.type === "sack" ? 18 : 12 });
        if (ev?.type === "sack") { fx.float("SACK!", x, y - cam.s * 4, "#ff8a7a", 1.3); }
        else if (gain != null && !P.kind) fx.float(`${gain >= 0 ? "+" : ""}${gain}`, x, y - cam.s * 4, ev?.firstDown ? "#ffd166" : "#fff", 1.2);
        if (ev?.firstDown) { setTimeout(sfx.firstDown, 300); this.hype = Math.max(this.hype, 0.35); }
        if (gain >= 20) this.hype = Math.max(this.hype, 0.7);
      }
      else if (ev?.type === "inc" || ev?.type === "fg_miss") { sfx.incomplete(); fx.burst(x, y, { n: 6, colors: ["#8a4a22", "#c9b79c"], speed: 60 }); }
      setTimeout(sfx.whistle, 450);
    }
    this.heard = { ...now, play: P };
  }

  // ---- drawing ----
  draw() {
    const cv = this.cv, cam = this.cam; if (!cv || !cam) return;
    const ctx = cv.getContext("2d"); ctx.setTransform(cv.width / cam.W, 0, 0, cv.height / cam.H, 0, 0); ctx.imageSmoothingEnabled = false;
    this.fx.k = uiPx(cam); // effects scale with the screen
    this.buttons = []; this.chips = {};
    if (this.mode === "menu") { this.buttons = drawMenu(ctx, cam, { teams: TEAMS, user: this.userTi, opp: this.oppTi, time: this.time, focus: this.menuFocus, mobile: this.mobile, fs: this.fsState, qMin: this.qMin, wxPick: wxName(this.wxPick), sb: this.sbMode ? sbTitle() : null }); this.fx.draw(ctx, cam.W, cam.H, pixText); return; }
    if (this.mode === "loading") { ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, cam.W, cam.H); const px = uiPx(cam); pixText(ctx, "SETTING UP THE GAME...", cam.W / 2, cam.H / 2 - px * 3, px, "rgba(255,255,255,.75)", "center"); return; }
    const m = this.mode, P = this.S, st = this.sit, teams = this.teams;
    // the field, with the shake and the zoom punch
    const [ox, oy] = this.fx.offset(), z = this.fx.zoom;
    ctx.save(); ctx.translate(cam.W / 2 + ox, cam.H / 2 + oy); ctx.scale(z, z); ctx.translate(-cam.W / 2, -cam.H / 2);
    const full = !!(typeof document !== "undefined" && (document.fullscreenElement || document.webkitFullscreenElement)) || !!this.live?.fill || !!this.live?.solo; // (full screen, or a phone's full-screen field: the page's scoreboard is out of sight)
    const rp = m === "replay" ? this.replay : null, fr = rp?.frames[rp.i];
    if (fr) cam.camX = fr.camX;
    const PP = fr ? { ...fr.top, ents: fr.ents, ball: fr.ball, g: this.g } : P, cer = m === "ceremony" ? this.ceremony : null;
    // the camera pushes in on a ball carrier in the open field and at the goal line (a live game)
    { const c = PP && !PP.kind && PP.ball?.holder && PP.ents?.[PP.ball.holder], open = c && ["carry", "tackle", "fall"].includes(PP.phase) && (PP.ball.x > 88 || !Object.values(PP.ents).some((d) => d.side !== c.side && !d.down && Math.hypot(d.x - c.x, d.y - c.y) < 6));
      const want = this.live && open ? 1.14 : 1; this.push = (this.push ?? 1) + (want - (this.push ?? 1)) * (want > (this.push ?? 1) ? 0.03 : 0.06);
      if (cer) { const k = 1 + 0.22 * Math.min(1, (this.time - cer.t0) / 3), [fx, fy] = cam.toScreen(50, -6); ctx.translate(fx, fy); ctx.scale(k, k); ctx.translate(-fx, -fy); }
      else if (this.push > 1.002 && c) { const [bx, by] = cam.toScreen(c.x, c.y); const fx = Math.max(cam.W * 0.2, Math.min(cam.W * 0.8, bx)), fy = Math.max(cam.H * 0.3, Math.min(cam.H * 0.75, by)); ctx.translate(fx, fy); ctx.scale(this.push, this.push); ctx.translate(-fx, -fy); } }
    drawRetro(ctx, cam, cer ? null : PP, fr ? rp.teams : cer ? teams : P?.view || teams, this.g, { dpr: cv.width / cam.W, bench: this.benchTeams(), boardTeams: fr ? rp.teams : teams, noBoard: (!this.live || full) && !cer, sb: this.sb, board: fr ? rp.board : this.board, ring: true, time: fr ? fr.time : this.time, hype: this.hype, passKind: this.passKind, wx: this.g?.wxE, night: !!this.live?.night });
    if (this.live && P && !P.kind && !fr && P.phase === "presnap" && m === "play") drawNameTags(ctx, cam, P);
    if (cer) drawCeremony(ctx, cam, cer.team, cer.away, this.time - cer.t0, { sb: cer.name });
    ctx.restore();
    if (fr) drawReplayTag(ctx, cam, this.time);
    if (this.sb && this.sbCardAt != null && m !== "ceremony") { const a = this.time - this.sbCardAt; if (a < 3.6) drawSbCard(ctx, cam, this.sb, teams, a); }
    if (cer && (!this.live || this.live.solo) && this.time - cer.t0 > 9) drawHint(ctx, cam, this.mobile ? "TAP TO CONTINUE" : "CLICK OR ENTER TO CONTINUE", cam.H * 0.72);
    if (cer) { const t = this.time - cer.t0; drawLowerThird(ctx, cam, `${String(cer.name || "SUPER BOWL").toUpperCase()} CHAMPIONS`, t < 8.2 ? "HERE COMES THE LOMBARDI TROPHY" : `THE ${String(cer.team.name || "").toUpperCase()} ARE WORLD CHAMPIONS`, cer.team.clr, { age: t, accent: "#ffd166" }); }
    drawWeather(ctx, cam, { wx: this.g?.wxE, time: this.time, wind: windNow(this.g) });
    this.fx.draw(ctx, cam.W, cam.H, pixText);
    if (!this.live || (full && !fr)) { // (the scorebug stays put too: your club on the left all game, whoever has the ball)
      const F = this.flipped && st, fl = (v) => (v === "h" ? "a" : v === "a" ? "h" : v), to = this.g?.to;
      drawHud(ctx, cam, F ? { ...st, score: { h: st.score.a, a: st.score.h }, poss: fl(st.poss), yard: st.yard } : st, F ? { user: teams.opp, opp: teams.user } : teams, { to: F && to ? { h: to.a, a: to.h } : to });
    } // (a live game: the app's scoreboard, and the stadium's at the 50; in full screen, this strip) // (a live game: the app's scoreboard, and the stadium's at the 50)
    if (this.g && m !== "final") drawWxChip(ctx, cam, this.g.wxE, windNow(this.g));
    const px = uiPx(cam), hintY = cam.H - px * 9;
    if (m === "play" && P && P.kind && !this.auto) this.drawKick(ctx, P, hintY);
    else if (m === "play" && P && !this.auto) {
      const toGo = st.toGo >= 100 - st.yard ? "GOAL" : st.toGo;
      drawDownBox(ctx, cam, P.phase === "presnap" ? `${ordinal(st.down)} & ${toGo} - ${playName(P.concept || P.call)}` : `${ordinal(st.down)} & ${toGo}`, P.phase === "presnap" ? "#fff" : "#ffd166", { left: !!this.live && !full });
      const throwing = P.phase === "live" && P.ball.holder === "QB" && P.call?.startsWith("pass"), isPass = P.call.startsWith("pass");
      // the pass type button: always there on a pass play, until the ball is thrown
      if (isPass && !this.auto && (P.phase === "presnap" || throwing)) { // (not on the computer's snaps)
        const big = this.mobile, ch = big ? Math.max(px * 19, 48) : px * 11;
        this.chips.kinds = drawSwitch(ctx, cam, px * 3, hintY - px * 4 - ch, [{ key: "bullet", label: "BULLET", color: KIND_COLOR.bullet }, { key: "lob", label: "LOB", color: KIND_COLOR.lob }], this.passKind, { big });
      }
      const hint = P.phase === "presnap" ? (this.mobile ? "TOUCH THE FIELD TO SNAP" : "CLICK OR SPACE TO SNAP")
        : throwing ? (this.mobile ? "PULL BACK - LET GO TO THROW" : "AIM - CLICK TO THROW - Q SWITCHES BULLET/LOB")
        : P.phase === "carry" && P.ents[P.ball.holder]?.side === "off" ? (this.mobile ? "FLICK SIDEWAYS: JUKE - AHEAD: DIVE" : "STEER WITH MOUSE OR W/S - SPACE JUKES - E DIVES") : null;
      if (hint && !this.auto) drawHint(ctx, cam, hint, hintY);
    }
    if (m === "pick") {
      // four pass concepts, drawn fresh each down (one quick, two intermediate, one shot), and the two runs
      const key = `${this.g.plays}|${this.two ? 2 : 0}`; if (this.choicesFor !== key) { this.choicesFor = key; this.choices = conceptChoices(); }
      const items = [...this.choices.map((k) => [k, CONCEPTS[k].name, "play"]), ...CALLS.filter(([k]) => k.startsWith("run")).map(([k, l]) => [k, l, "play"])]; if (st.down === 4) items.push(st.yard >= 58 ? ["fg", `FIELD GOAL ${100 - st.yard + 17}`, "kick"] : ["punt", "PUNT", "kick"]);
      const hover = this.input === "mouse" && this.mouse ? this.lastButtons?.find((b) => inside(this.mouse, b))?.key : null;
      this.buttons = drawPlayCards(ctx, cam, this.two ? "TWO-POINT TRY - PICK A PLAY" : `${ordinal(st.down)} & ${st.toGo >= 100 - st.yard ? "GOAL" : st.toGo} - ${spotOf(st.yard)} - PICK A PLAY`, items, teams.user.clr, { keys: !this.mobile, hover, sub: this.snapRB ? `IN THE BACKFIELD: ${String(this.snapRB.name || "").toUpperCase()}  ${this.snapRB.pos || "RB"} ${this.snapRB.ovr ?? ""}` : null });
      this.lastButtons = this.buttons;
    }
    if (m === "pat") {
      const hover = this.input === "mouse" && this.mouse ? this.lastButtons?.find((b) => inside(this.mouse, b))?.key : null;
      this.buttons = drawPlayCards(ctx, cam, "TOUCHDOWN! - THE TRY", [["xp", "KICK THE PAT", "kick"], ["two", "GO FOR TWO", "play", "slant_flat"]], teams.user.clr, { keys: !this.mobile, hover });
      this.lastButtons = this.buttons;
    }
    if (m === "opp") this.drawDrive(ctx);
    if (m === "final" && this.box) { drawBoxScore(ctx, cam, this.box, teams, { time: this.time, hint: this.endHint() }); return; }
    if ((m === "result" || (m === "final" && !this.live?.solo)) && this.banner && this.live) { const b = stageOf(this.banner), big = /TOUCHDOWN|INTERCEPT|FUMBLE|FIELD GOAL|NO GOOD|SAFETY|SACK|TWO POINTS|IT'S GOOD|FLAG|TURNOVER/.test(b.title || ""); if (big || b.engine || !(this.live.watch || this.auto)) drawLowerThird(ctx, cam, b.title, b.text, teams.user.clr, { age: (performance.now() - b.at) / 1000, accent: b.accent || "#ffd166", sub: b.sub }); }
    else if ((m === "result" || m === "final") && this.banner) { const b = stageOf(this.banner); drawBanner(ctx, cam, b.title, b.text, b.sub, teams.user.clr, { age: (performance.now() - b.at) / 1000, accent: b.accent || "#ffd166", hint: b.hint || (this.live && (this.live.watch || this.auto) ? "" : this.mobile ? "TAP TO CONTINUE" : "CLICK OR SPACE TO CONTINUE") }); }
    // the pause button, and the menu
    if (!this.paused && (!this.live || this.live.solo)) this.chips.pause = drawChip(ctx, cam, cam.W - px * 2, Math.round(px * 20.5), this.mobile ? "II" : "II  ESC", { align: "right", big: this.mobile });
    if (this.fade > 0) { ctx.globalAlpha = this.fade; ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, cam.W, cam.H); ctx.globalAlpha = 1; }
    if (this.paused && (!this.live || this.live.solo)) this.buttons = drawPause(ctx, cam, [["resume", "RESUME"], ["mute", isMuted() ? "SOUND: OFF" : "SOUND: ON"], ...(this.locked ? [] : [["wx", `WEATHER: ${wxName(this.wxPick)}`]]), ...(this.fsState && this.fsState !== "ios" ? [["fs", this.fsState === "on" ? "EXIT FULL SCREEN" : "FULL SCREEN"]] : []), this.franchise ? ["sim", "SIM TO THE END"] : ["quit", "QUIT GAME"]], { mobile: this.mobile });
  }
  drawKick(ctx, P, hintY) {
    const cam = this.cam, px = uiPx(cam);
    // just after the kick, the meter stays up a moment where you stopped it
    if (P.phase !== "presnap") { if (this.meter?.stop != null && this.time - (this.meter.at || 0) < 0.9) drawKickMeter(ctx, cam, px, this.meter.zones, this.meter.stop, true, hintY, this); return; }
    drawDownBox(ctx, cam, P.pat ? "EXTRA POINT" : P.kind === "fg" ? `${P.dist} YARD FIELD GOAL` : "PUNT", "#fff", { left: !!this.live && !(document.fullscreenElement || document.webkitFullscreenElement || this.live.fill) });
    // the kick meter (yours): a pixel arc, red at the ends, orange, then green in the middle as wide as his accuracy
    if (this.meter) drawKickMeter(ctx, cam, px, this.meter.zones || meterZones(P), this.meter.stop ?? this.meterPos(P), this.meter.stop != null, hintY, this);
    if (this.meter && outOfRange(P)) pixText(ctx, "OUT OF HIS RANGE", cam.W / 2, Math.round(hintY - px * 76), px, "#ff8a5a", "center");
    // who's kicking: his name, overall, leg and accuracy (what decides how far and how true)
    { const kp = P.kicker, cp = Math.max(1, Math.round(px * 0.8)); if (kp) { const lines = [`${String(kp.name || "").toUpperCase()}  ${kp.ovr ?? ""} OVR`, `LEG ${Math.round(K.kickLeg(kp))}  ACC ${Math.round(K.kickAccuracy(kp))}${P.kind === "fg" ? `  RANGE ${Math.round(50 + (K.kickLeg(kp) - 70) * 0.6)} YD` : ""}`]; const w = Math.max(...lines.map((l) => pixWidth(l, cp))) + cp * 8, h = cp * 22, x = Math.round(cam.W - w - px * 3), y = Math.round(px * 24); ctx.fillStyle = "rgba(8,10,16,.82)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = this.teams.user.clr; ctx.fillRect(x, y, cp, h); pixText(ctx, lines[0], x + cp * 4, y + cp * 3, cp, "#fff"); pixText(ctx, lines[1], x + cp * 4, y + cp * 12, cp, "#ffd166"); } }
    if (this.meter) drawHint(ctx, cam, this.mobile ? "TAP WHEN THE NEEDLE IS IN THE GREEN" : "CLICK OR SPACE WHEN THE NEEDLE IS IN THE GREEN", hintY);
  }
  // the needle: from the left end to the right and back; a long field goal sweeps faster
  meterPos(P) { const T = P.kind === "fg" ? 1.45 - Math.min(0.5, (P.dist || 30) / 110) : 1.4, u = ((this.meter?.t || 0) / (T / 2)) % 2; return u < 1 ? -1 + 2 * u : 3 - 2 * u; }
  fireKick(P) {
    const M = this.meter; if (!M || this.autoKick || P.phase !== "presnap" || M.stop != null) return;
    M.stop = this.meterPos(P); M.zones = meterZones(P); M.at = this.time; sfx.select?.();
    try { kickMeter(P, M.stop); } catch (e) { console.error(e); }
  }
  kickPower() { if (!this.kick?.charging) return 0; const u = (this.kick.t / KICK_CYCLE) % 2; return u < 1 ? u : 2 - u; }
  // the other team's drive: a panel in their colours, the plays as they come in
  drawDrive(ctx) {
    const cam = this.cam, f = this.feed, t = this.teams.opp, px = uiPx(cam), rows = 5, rh = px * 9;
    const h = rows * rh + px * 16, y = cam.H - h;
    ctx.fillStyle = "rgba(8,10,16,.92)"; ctx.fillRect(0, y, cam.W, h); ctx.fillStyle = t.clr; ctx.fillRect(0, y, cam.W, px * 11); ctx.fillStyle = t.ac; ctx.fillRect(0, y + px * 11, cam.W, px);
    pixText(ctx, `${t.city} ${t.name} - ON OFFENSE`, px * 3, y + px * 2.5, px, "#fff");
    pixText(ctx, this.mobile ? "TAP TO SKIP" : "SPACE TO SKIP", cam.W - px * 3, y + px * 2.5, px, "rgba(255,255,255,.75)", "right");
    const lines = f.list.slice(Math.max(0, f.shown - rows), f.shown), maxc = Math.floor((cam.W - px * 6) / (6 * px));
    lines.forEach((e, i) => { const last = i === lines.length - 1; pixText(ctx, e.text.slice(0, maxc), px * 3, y + px * 15 + i * rh, px, e.td ? "#ffd166" : e.turnover ? "#7fe3ff" : e.note ? "#9aa7b2" : last ? "#fff" : "rgba(255,255,255,.6)"); });
  }

  // ---- input ----
  pt(e) { const r = this.cv.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
  // a tap or click on a menu, a card, the banner or a button: true when it was used
  tapUI(p) {
    if (this.paused) { const b = this.buttons.find((b) => inside(p, b)); if (b) this.pauseAction(b.key); return true; }
    if (inside(p, this.chips.pause)) { this.paused = true; return true; }
    for (const [k, b] of Object.entries(this.chips.kinds || {})) if (inside(p, b)) { this.setKind(k); return true; }
    const m = this.mode;
    if (m === "menu") { const b = this.buttons.find((b) => inside(p, b)); if (b) this.menuAction(b.key); return true; }
    if (m === "ceremony" && (!this.live || this.live.solo)) { if (this.time - this.ceremony.t0 > 2) this.leaveCeremony(); return true; }
    if (m === "pick") { const b = this.buttons.find((b) => inside(p, b)); if (b) this.call(b.key); return true; }
    if (m === "pat") { const b = this.buttons.find((b) => inside(p, b)); if (b) this.patChoice(b.key); return true; }
    if (m === "result") { const b = this.banner; if (b?.stages && performance.now() - b.at < b.stages[0].dur * 1000) { b.at = performance.now() - b.stages[0].dur * 1000; return true; } this.pendingReplay = null; this.advance(); return true; }
    if (m === "replay") { this.endReplay(); return true; }
    if (m === "final") { this.leaveFinal(); return true; }
    if (m === "opp") { this.feed.shown = this.feed.list.length; this.feed.at = 0; return true; }
    return false;
  }
  setKind(k) { if (this.passKind !== k) sfx.select?.(); this.passKind = k; try { localStorage.setItem("arcade_pass", k); } catch { /* ignore */ } }
  cycleKind() { this.setKind(this.passKind === "bullet" ? "lob" : "bullet"); }
  menuAction(k) {
    if (k === "fs") { this.fullscreen(this.fsState !== "on"); return; }
    if (k === "wx") { this.cycleWx(); return; }
    if (k === "sb") { this.sbMode = !this.sbMode; try { localStorage.setItem("arcade_sb", this.sbMode ? "1" : "0"); } catch { /* ignore */ } sfx.select?.(); return; }
    if (k === "len") { this.qMin = QMINS[(QMINS.indexOf(this.qMin) + 1) % QMINS.length]; try { localStorage.setItem("arcade_qmin", this.qMin); } catch { /* ignore */ } sfx.select?.(); return; }
    if (k === "go") { if (this.fsState === "off") this.fullscreen(true); this.start(); return; }
    if (k === "gm") { this.onQuit ? this.onQuit() : (location.href = import.meta.env?.BASE_URL ?? "/"); return; }
    const which = k.startsWith("user") ? "userTi" : "oppTi", d = k.endsWith("-1") ? -1 : 1;
    this.menuFocus = which === "userTi" ? "user" : "opp";
    let v = (this[which] + d + TEAMS.length) % TEAMS.length; if (v === (which === "userTi" ? this.oppTi : this.userTi)) v = (v + d + TEAMS.length) % TEAMS.length;
    this[which] = v; preload(TEAMS[v]); sfx.select?.();
  }
  pauseAction(k) { if (k === "sim") { this.paused = false; this.simRest(); return; } if (k === "wx") { this.cycleWx(true); return; } if (k === "fs") { this.fullscreen(this.fsState !== "on"); return; } if (k === "resume") this.paused = false; else if (k === "mute") toggleMute(); else if (k === "quit") { this.paused = false; this.mode = "menu"; this.S = null; this.replay = null; this.pendingReplay = null; if (this.live?.solo) { this.live = null; this.flipped = false; } } }

  onDown(e) {
    unlock();
    this.input = e.pointerType === "mouse" ? "mouse" : "touch";
    const p = this.pt(e); this.mouse = p;
    if (this.tapUI(p)) return;
    const P = this.S; if (this.mode !== "play" || !P) return;
    try { this.cv.setPointerCapture?.(e.pointerId); } catch { /* a pointer the browser no longer tracks */ }
    if (this.input === "mouse") return this.mouseDown(P, e, p);
    // touch: one finger plays; a second finger only taps buttons
    if (this.touch && this.touch.id !== e.pointerId) return;
    if (P.kind) { this.fireKick(P); return; } // a kick: tap to stop the meter
    if (P.phase === "presnap") snap(P);
    this.touch = { id: e.pointerId, ...p, moved: 0 };
    if (P.phase === "carry") P.steer = this.cam.toField(p.px, p.py).y;
  }
  mouseDown(P, e, p) {
    const lob = e.button === 2 || e.shiftKey;
    if (P.kind) { this.fireKick(P); return; }
    if (P.phase === "presnap") { snap(P); return; }
    if (P.phase === "live" && P.ball.holder === "QB" && P.call?.startsWith("pass")) { const f = this.cam.toField(p.px, p.py), qb = P.ents.QB; throwTo(P, { x: Math.max(qb.x - 1, f.x), y: f.y }, null, lob ? "lob" : this.passKind); P.aim = null; return; }
    if (P.phase === "carry") { if (lob) dive(P); else juke(P); } // right-click dives
  }
  onMove(e) {
    const p = this.pt(e);
    if (this.kickDrag && this.kickDrag.id === e.pointerId) { this.kickDrag.cx = p.px; this.kickDrag.cy = p.py; }
    if (e.pointerType === "mouse") { this.mouse = p; if (this.input !== "mouse" && !this.touch) this.input = "mouse"; return; }
    const t = this.touch, P = this.S, cam = this.cam; if (!t || !P || t.id !== e.pointerId) return;
    t.moved = Math.max(t.moved, Math.hypot(p.px - t.px, p.py - t.py)); t.cx = p.px; t.cy = p.py;
    if (P.kind) return;
    if (P.phase === "live" && P.ball.holder === "QB" && P.call?.startsWith("pass")) {
      // pulling back from where you touched aims the throw the other way, mirrored on the screen
      const qb = P.ents.QB, [qx, qy] = cam.toScreen(qb.x, qb.y);
      const land = cam.toField(qx + (t.px - p.px) * PULL, qy + (t.py - p.py) * PULL);
      P.aim = t.moved > 6 ? { x: Math.max(qb.x - 1, land.x), y: Math.max(-26, Math.min(26, land.y)) } : null;
    } else if (P.phase === "carry") {
      P.steer = cam.toField(p.px, p.py).y;
      // a quick flick across the field is a juke; a quick flick up the field (toward the goal) is a dive
      const now = performance.now(); t.hist = (t.hist || []).filter((h) => now - h.t < 140); t.hist.push({ t: now, px: p.px, py: p.py });
      const fx_ = p.px - t.hist[0].px, fy_ = p.py - t.hist[0].py;
      if (t.hist.length > 1 && fx_ > 40 && fx_ > Math.abs(fy_) * 1.5) { if (dive(P)) t.hist = []; }
      else if (t.hist.length > 1 && Math.abs(fy_) > 34) { if (juke(P) !== null) t.hist = []; }
    }
  }
  onUp(e) {
    const P = this.S;
    if (this.kickDrag && this.kickDrag.id === e.pointerId) { const d = this.kickDrag; this.kickDrag = null; if (P?.kind && P.phase === "presnap") this.releaseKick(P, d); return; }
    if (e.pointerType === "mouse") return;
    const t = this.touch; if (!t || t.id !== e.pointerId) return; this.touch = null; if (!P) return;
    if (P.phase === "live" && P.ball.holder === "QB" && P.call?.startsWith("pass") && P.aim && t.moved > 6) throwTo(P, P.aim, null, this.passKind);
    P.aim = null; P.steer = null;
  }
  // the mouse kick: direction toward the pointer, length from the meter (a full meter is a long flick)
  // the drag (screen pixels) as a kick: up the field and across it, scaled so a drag of about a
  // third of the screen is a full-strength kick
  kickVec(d) {
    const cam = this.cam, full = Math.min(cam.W, cam.H) * 0.36, dx = d.cx - d.px, dy = d.cy - d.py, L = Math.hypot(dx, dy);
    if (L < 10) return null;
    // direction: the drag's true angle on the field (the field's depth is squashed on screen);
    // strength: its length on the screen
    const fx = dx, fy = dy / 0.42, fl = Math.hypot(fx, fy) || 1, len = 11 * Math.min(1.15, L / full);
    return [(fx / fl) * len, (fy / fl) * len];
  }
  releaseKick(P, d) { const v = this.kickVec(d); if (v && v[0] > 0) kickFlick(P, v[0], v[1]); }

  onKey(e) {
    const k = e.key.toLowerCase(); if (["input", "select", "textarea"].includes(document.activeElement?.tagName?.toLowerCase())) return;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(k)) e.preventDefault();
    if (e.repeat && k !== "w" && k !== "s" && k !== "arrowup" && k !== "arrowdown") return;
    this.keys.add(k); unlock();
    if (k !== "w" && k !== "s" && !k.startsWith("arrow")) this.input = this.input === "touch" && !e.repeat ? "mouse" : this.input;
    if (k === "escape" || k === "p") { if (this.live && !this.live.solo) return; if (this.mode !== "menu") this.paused = !this.paused; return; } // (a live game: the app's own Pause)
    if (k === "m") { toggleMute(); return; }
    if (k === "f") { this.fullscreen(this.fsState !== "on"); return; }
    if (this.paused) { if ((!this.live || this.live.solo) && (k === "enter" || k === " ")) this.paused = false; return; }
    const m = this.mode, P = this.S;
    if (m === "menu") {
      if (k === "tab") this.menuFocus = this.menuFocus === "user" ? "opp" : "user";
      else if (k === "arrowleft" || k === "a") this.menuAction(`${this.menuFocus}-1`);
      else if (k === "arrowright" || k === "d") this.menuAction(`${this.menuFocus}1`);
      else if (k === "enter" || k === " ") this.start();
      return;
    }
    if (m === "pick") { const n = +k; if (n >= 1 && n <= this.buttons.length) this.call(this.buttons[n - 1].key); return; }
    if (m === "pat") { const n = +k; if (n >= 1 && n <= this.buttons.length) this.patChoice(this.buttons[n - 1].key); return; }
    if (m === "result" || m === "opp" || m === "ceremony") { if (k === " " || k === "enter") this.tapUI({ px: -1, py: -1 }); return; }
    if (m === "final") { if (k === " " || k === "enter") this.leaveFinal(); return; }
    if (m !== "play" || !P) return;
    if (k === "q" && !P.kind) { this.cycleKind(); return; }
    if (k === "e" && !P.kind && P.phase === "carry") { dive(P); return; }
    if (P.kind) { if (k === " " || k === "enter") this.fireKick(P); return; } // (a kick: stop the meter)
    if (k === " " || k === "enter") {
      if (P.phase === "presnap") snap(P);
      else if (P.phase === "live" && P.ball.holder === "QB" && P.call?.startsWith("pass") && P.aim) { throwTo(P, P.aim, null, e.shiftKey ? "lob" : this.passKind); P.aim = null; }
      else if (P.phase === "carry") juke(P);
    }
  }
  onKeyUp(e) { const k = e.key.toLowerCase(); this.keys.delete(k); }
}

export const kickNote = (P) => P.kind === "fg" && P.flick ? (P.flick.made ? "RIGHT DOWN THE MIDDLE" : P.flick.short ? "SHORT - KICK IT HARDER" : P.flick.wide ? "WIDE - AIM STRAIGHTER" : "PUSHED IT") : "";
export const resultTitle = (ev) => !ev ? "" : ev.type === "kickoff" ? (ev.onside ? "ONSIDE KICK" : "KICKOFF") : ev.kneel ? "KNEEL" : ev.spike ? "SPIKE" : ev.type === "pat" ? (ev.pat?.good ? (ev.pat.two ? "TWO POINTS!" : "IT'S GOOD!") : "NO GOOD") : ev.td ? "TOUCHDOWN!" : ev.type === "int" ? "INTERCEPTED" : ev.type === "sack" ? "SACKED" : ev.type === "fumble" ? "FUMBLE" : ev.type === "inc" ? "INCOMPLETE" : ev.type === "fg" ? "FIELD GOAL!" : ev.type === "fg_miss" ? "NO GOOD" : ev.type === "punt" ? "PUNT" : ev.type === "penalty" ? "FLAG" : ev.firstDown ? "FIRST DOWN" : `${ev.yards >= 0 ? "+" : ""}${ev.yards} YARDS`;
export const pickNote = (p) => p.why === "sacked" ? "THE RUSH GOT HOME" : p.target == null ? "" : `${p.open ? "OPEN" : "COVERED"}${p.def != null ? ` BY ${p.def} YD` : ""}${p.err != null ? ` - ${p.err <= 1 ? "ON THE MONEY" : p.err <= 2.2 ? "CATCHABLE" : "OFF TARGET"}` : ""}${p.why === "hurried" ? " - HURRIED" : p.why === "late" ? " - HELD IT TOO LONG" : ""}`;
export { passPlan, BULLET_RANGE };

// The kick meter: an arc of chunky pixels (cached; it only changes with the kicker and the distance),
// green in the middle, orange where it still squeezes inside an upright, red where it misses; a white
// needle with a dark outline. stopped: the needle where you stopped it, blinking.
const meterCache = { key: "", cv: null };
function drawKickMeter(ctx, cam, px, zones, pos, stopped, hintY, game) {
  const cell = Math.max(2, Math.round(px * 1.6)), R = Math.round(px * 52), T = Math.round(px * 10), A = 1.05;
  const W = (R + cell * 3) * 2, H = R + cell * 4, key = `${cell}|${R}|${zones.green.toFixed(3)}|${zones.good.toFixed(3)}`;
  if (meterCache.key !== key) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"), cx = W / 2, cy = H - cell;
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const G0 = [70, 230, 110], G1 = [160, 235, 70], Y = [255, 214, 60], O = [255, 140, 40], RD = [214, 38, 38];
    const col = (a) => (a <= zones.green ? mix(G0, G1, a / zones.green) : a <= zones.good ? mix(Y, O, (a - zones.green) / Math.max(0.01, zones.good - zones.green)) : mix(O, RD, Math.min(1, (a - zones.good) / Math.max(0.05, 1 - zones.good) * 1.6)));
    for (let y = 0; y < H; y += cell) for (let x = 0; x < W; x += cell) {
      const dx = x + cell / 2 - cx, dy = cy - (y + cell / 2), r = Math.hypot(dx, dy), ang = Math.atan2(dx, dy);
      if (dy < -cell) continue;
      const inBand = r >= R - T && r <= R && Math.abs(ang) <= A, edge = !inBand && r >= R - T - cell && r <= R + cell && Math.abs(ang) <= A + cell / R;
      if (inBand) { const u = Math.abs(ang) / A, [r0, g0, b0] = col(u), lit = r > R - T * 0.38 ? 1.18 : r < R - T * 0.8 ? 0.82 : 1; c.fillStyle = `rgb(${Math.min(255, r0 * lit)},${Math.min(255, g0 * lit)},${Math.min(255, b0 * lit)})`; c.fillRect(x, y, cell, cell); }
      else if (edge) { c.fillStyle = "#0b0e14"; c.fillRect(x, y, cell, cell); }
    }
    meterCache.key = key; meterCache.cv = cv;
  }
  const ox = Math.round(cam.W / 2 - W / 2), oy = Math.round(hintY - px * 12 - H), cx = cam.W / 2, cy = oy + H - cell;
  ctx.drawImage(meterCache.cv, ox, oy);
  // the needle: pixel steps out along its angle, white with a dark rim
  if (stopped && Math.floor((game.time || 0) * 8) % 2) return;
  const ang = pos * A;
  for (let r = R - T - cell * 2; r <= R + cell * 3; r += cell * 0.7) {
    const x = Math.round(cx + Math.sin(ang) * r - cell / 2), y = Math.round(cy - Math.cos(ang) * r - cell / 2);
    ctx.fillStyle = "#0b0e14"; ctx.fillRect(x - cell, y - cell, cell * 3, cell * 3);
  }
  for (let r = R - T - cell * 2; r <= R + cell * 3; r += cell * 0.7) {
    const x = Math.round(cx + Math.sin(ang) * r - cell / 2), y = Math.round(cy - Math.cos(ang) * r - cell / 2);
    ctx.fillStyle = "#fff"; ctx.fillRect(x, y, cell, cell);
  }
}

// Why a pass didn't connect, from the engine's own book of the play
export const whyNote = (ev) => !ev ? "" : ev.type === "inc" ? (ev.db ? `BROKEN UP BY ${String(ev.db.name || "").toUpperCase()}` : ev.drop ? `DROPPED - A CATCHABLE BALL` : ev.offTarget ? "OFF TARGET - NOT CATCHABLE" : "") : ev.type === "int" ? "PICKED OFF" : "";
// A play with a flag on it, in two cards: first what the play did, then the flag and what it costs,
// so the yards that come off the board make sense. (A flag before the snap has just the one card.)
export function withFlag(b, ev) {
  const pen = ev?.pen;
  if (!b || !pen || !pen.accepted || pen.pre || !pen.play || !pen.label) return b;
  const t = ev.text || "", i = t.indexOf(pen.label), pl = pen.play;
  const playTitle = pl.td ? "TOUCHDOWN!" : pl.type === "inc" ? "INCOMPLETE" : pl.type === "sack" ? "SACKED" : pl.type === "int" ? "INTERCEPTED" : `${pl.yards >= 0 ? "+" : ""}${pl.yards} YARDS`;
  const flagSub = `ON THE ${pen.side === "off" ? "OFFENSE" : "DEFENSE"}${ev.type === "penalty" ? (pen.side === "off" ? (pl.td ? " - THE TOUCHDOWN IS WIPED OUT" : " - THE PLAY COMES BACK") : " - AUTOMATIC FIRST DOWN") : pen.tack ? " - 15 YARDS ADDED ON" : ""}`;
  return { ...b, stages: [{ title: playTitle, text: i > 0 ? t.slice(0, i).trim().replace(/,$/, ".") : "", sub: b.sub, dur: 1.7 }, { title: `FLAG - ${pen.label.toUpperCase()}`, text: i >= 0 ? t.slice(i) : t, sub: flagSub, accent: "#ffd23a" }] };
}
// the card on screen now (a flag's two cards one after the other; each slides in when it starts)
export function stageOf(b) {
  if (!b?.stages) return b;
  const age = (performance.now() - b.at) / 1000, first = age < b.stages[0].dur, st = b.stages[first ? 0 : 1];
  return { ...b, ...st, accent: st.accent || b.accent, at: first ? b.at : b.at + b.stages[0].dur * 1000 };
}

