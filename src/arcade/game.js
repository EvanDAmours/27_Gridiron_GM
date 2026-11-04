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
import { TEAMS, newGame, lineups, runPlay, simOpponentDrive, situation, snapshot, restore, patWaiting, bookPat } from "./bridge.js";
import { setupPlay, snap, tick, throwTo, juke, dive, conceptChoices, playName, CONCEPTS, PLAY_NAMES, PASS_KINDS, passPlan, BULLET_RANGE } from "./play.js";
import { setupKick, kickFlick, tickKick } from "./kick.js";
import { sfx, unlock, toggleMute, isMuted } from "./sfx.js";
import { FX } from "./fx.js";
import { makeCamera, drawRetro, drawHud, drawDownBox, drawBanner, drawPlayCards, drawChip, drawSwitch, drawHint, drawMenu, drawPause, preload, pixText, KIND_COLOR, uiPx } from "./retro.js";

const PULL = 3.2; // touch: the throw goes this many times the pull-back, the other way, on the screen
const spotOf = (yard) => (yard === 50 ? "MIDFIELD" : yard < 50 ? `OWN ${yard}` : `OPP ${100 - yard}`);
const ordinal = (n) => ["1ST", "2ND", "3RD", "4TH"][n - 1] || `${n}TH`;
const CALLS = [["pass_quick", "QUICK"], ["pass_medium", "MEDIUM"], ["pass_deep", "DEEP"], ["run_inside", "INSIDE RUN"], ["run_outside", "OUTSIDE RUN"]];
const KICK_CYCLE = 1.1; // seconds for the kick meter to fill (then it falls back)
const inside = (p, b) => b && p.px >= b.x && p.px <= b.x + b.w && p.py >= b.y && p.py <= b.y + b.h;

// where the camera sits while the quarterback has the ball: the line of scrimmage 25% in from the left
const holdX = (cam, P) => (P.los ?? P.ball.x) + Math.max(cam.lead, 0.17 * cam.W / cam.s);
export class ArcadeGame {
  constructor(canvas, { userTi = 17, oppTi = 8, teams, onQuit, rand, skipMenu = false } = {}) {
    this.cv = canvas; this.onQuit = onQuit; this.rand = rand;
    this.userTi = userTi; this.oppTi = oppTi; this.teams = teams || { user: TEAMS[userTi], opp: TEAMS[oppTi] };
    this.fx = new FX(); this.time = 0; this.hype = 0; this.fade = 1;
    this.passKind = "bullet"; try { const k = localStorage.getItem("arcade_pass"); if (k === "bullet" || k === "lob") this.passKind = k; } catch { /* storage unavailable */ } this.input = matchMedia?.("(pointer: coarse)").matches ? "touch" : "mouse";
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
  destroy() {
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
    const d = document, el = d.documentElement;
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
    if (this.input === "mouse" && !full) {
      const fw = Math.min(1000, W * 0.9, (H * 0.9) * 16 / 9); W = Math.round(fw); H = Math.round(fw * 9 / 16);
      Object.assign(wrap.style, { display: "flex", alignItems: "center", justifyContent: "center" });
      cv.style.borderRadius = "6px"; cv.style.boxShadow = "0 0 0 2px #1d2433, 0 20px 60px rgba(0,0,0,.6)";
    } else { cv.style.borderRadius = ""; cv.style.boxShadow = ""; }
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
    const cam = makeCamera(W, H); cam.camX = this.cam?.camX ?? (this.S ? this.S.ball.x : this.g?.yard ?? 25) + cam.lead; this.cam = cam;
  }
  refresh() { this.sit = situation(this.g); }

  // ---- the flow ----
  start() {
    this.teams = { user: TEAMS[this.userTi], opp: TEAMS[this.oppTi] };
    preload(this.teams.user); preload(this.teams.opp);
    this.g = newGame(this.userTi, this.oppTi, this.rand ? { rand: this.rand, pat: true } : { pat: true }).g; this.sit = situation(this.g);
    this.fade = 1; this.advance();
  }
  // what happens next: the other team's drive (and any kickoff), or your next call
  advance() {
    const g = this.g; this.banner = null;
    if (patWaiting(g)) { this.S = null; this.mode = "pat"; this.fade = Math.max(this.fade, 0.6); this.refresh(); return; } // your try after a touchdown
    if (g.done) { this.mode = "final"; this.refresh(); this.endBanner(); return; }
    if (g.koNext || g.poss !== "h") {
      const before = { ...g.score };
      const evs = simOpponentDrive(g).filter((e) => e.text).flatMap((e) => (e.note ? [e, { text: `-- ${e.note} --`, note: true }] : [e]));
      this.feed = { list: evs, shown: 0, at: performance.now(), scored: g.score.a > before.a };
      this.mode = "opp"; this.refresh(); return;
    }
    this.S = null; this.mode = "pick"; this.fade = Math.max(this.fade, 0.6); this.refresh();
  }
  call(c) {
    const g = this.g; this.fade = 0.5;
    const P = c === "xp" ? setupKick(g, lineups(g), "fg", { pat: true }) : c === "punt" || c === "fg" ? setupKick(g, lineups(g), c) : setupPlay(g, lineups(g), c);
    this.S = P; this.cam.camX = P.kind ? P.ball.x + this.cam.lead : holdX(this.cam, P); this.mode = "play"; this.kick = null; this.refresh();
    sfx.select?.();
  }
  // the try: kick it, or go for two (a real snap from the 2, played on a copy of the game)
  patChoice(k) {
    const g = this.g;
    if (k === "xp") return this.call("xp");
    this.two = { snap: snapshot(g) }; delete g.patPending; g.done = false; g.yard = 98; g.down = 1; g.toGo = 2;
    this.S = null; this.mode = "pick"; this.refresh(); sfx.select?.();
  }
  endBanner() { const st = this.sit, lead = st.score.h - st.score.a; this.banner = { title: lead > 0 ? "YOU WIN!" : lead < 0 ? "YOU LOSE" : "TIE GAME", text: `${this.teams.user.name} ${st.score.h}, ${this.teams.opp.name} ${st.score.a}`, sub: null, at: performance.now(), hint: this.mobile ? "TAP FOR A NEW GAME" : "CLICK OR ENTER FOR A NEW GAME" }; if (lead > 0) { this.fx.confetti(this.cam.W, [this.teams.user.clr, this.teams.user.ac, "#ffd166", "#fff"]); sfx.touchdown(); } }

  // ---- the loop ----
  loop(now) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    const t0 = performance.now(); this.update(dt, now); this.draw();
    (this.frameMs ||= []).push(performance.now() - t0); if (this.frameMs.length > 600) this.frameMs.shift();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }
  // one step of the game (the browser loop and the playtest harness both use it)
  update(dt, now = performance.now()) {
    this.time += dt; this.fade = Math.max(0, this.fade - dt * 2.5); this.hype = Math.max(0, this.hype - dt * 0.5);
    if (this.paused || this.mode === "menu") { this.fx.step(dt); return; }
    const live = this.fx.step(dt); // (hit-stop slows the field for a beat)
    const P = this.S, cam = this.cam, m = this.mode;
    if (P && cam) {
      this.controls(P, dt);
      const going = P.kind ? tickKick(P, live) : tick(P, live);
      this.react(P);
      // the camera leads the ball a little; with a throw in the air it frames the ball and where it's going
      const f = P.ball.flight, over = P.phase === "tackle" || P.phase === "fall" || P.phase === "done";
      // until the ball leaves the quarterback's hands the camera holds still, with the line of
      // scrimmage a quarter of the way in, so the routes stay on screen as they develop; after
      // that it leads the runner, and with a throw in the air it frames the ball and its spot
      const qbHas = !P.kind && !over && (P.ball.holder === "QB" || Math.max(P.ball.x + cam.lead, 0) < holdX(cam, P)); // (a back behind the line too)
      const want = f ? (P.ball.x + f.to.x) / 2 + 2 : qbHas ? holdX(cam, P) : P.ball.x + (over ? 0 : cam.lead);
      cam.camX += (want - cam.camX) * Math.min(1, dt * (f ? 3.5 : 5));
      cam.camX = Math.max(-10 + (cam.W * 0.42) / cam.s, Math.min(112 - (cam.W * 0.58) / cam.s, cam.camX)); // never past the end zones
      if (!going && P.phase === "done" && m === "play") {
        let ev = P.result || P.ev;
        // a two-point try was played on a scratch copy of the game from the 2: put the game back and book the try
        if (this.two) { const good = !!ev?.td; restore(this.g, this.two.snap); this.two = null; ev = bookPat(this.g, true, good); P.text = ev?.text; P.pick = null; this.refresh(); }
        this.banner = { title: resultTitle(ev), text: P.text || ev?.text || "", sub: ev?.note ? String(ev.note).toUpperCase() : P.kind ? kickNote(P) : P.pick ? pickNote(P.pick) : null, at: now, accent: ev?.td || ev?.type === "fg" ? "#ffd166" : ev?.turnover || ev?.type === "int" || ev?.type === "fumble" ? "#ff8a7a" : ev?.firstDown ? "#ffd166" : "#fff" };
        this.mode = "result"; this.refresh();
      }
    }
    if (m === "opp") { const f = this.feed; if (now - f.at > 600 && f.shown < f.list.length) { f.shown++; f.at = now; if (f.list[f.shown - 1]?.td) { sfx.turnover(); this.fx.hit(0.6); } } else if (f.shown >= f.list.length && now - f.at > 1100) this.advance(); }
    if ((m === "result") && this.banner && now - this.banner.at > (/TOUCHDOWN/.test(this.banner.title) ? 3400 : 1700)) this.advance();
  }

  // held keys and the pointer, every frame: the runner's steering, the mouse aim, the kick meter
  controls(P, dt) {
    const up = this.keys.has("w") || this.keys.has("arrowup"), down = this.keys.has("s") || this.keys.has("arrowdown");
    if (P.phase === "carry" && P.ents[P.ball.holder]?.side === "off") {
      const c = P.ents[P.ball.holder];
      if (up || down) { this.keySteer = (this.keySteer ?? c.y) + (down ? 1 : -1) * 22 * dt; this.keySteer = Math.max(-26, Math.min(26, this.keySteer)); P.steer = this.keySteer; }
      else if (this.input === "mouse" && this.mouse) { this.keySteer = null; P.steer = this.cam.toField(this.mouse.px, this.mouse.py).y; }
    } else this.keySteer = null;
    if (!P.kind && P.phase === "live" && P.ball.holder === "QB" && this.input === "mouse" && this.mouse) {
      const f = this.cam.toField(this.mouse.px, this.mouse.py), qb = P.ents.QB;
      P.aim = { x: Math.max(qb.x - 1, f.x), y: Math.max(-26, Math.min(26, f.y)) };
    }
    if (P.kind && this.kick?.charging) this.kick.t += dt;
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
      if (ev?.td) { sfx.touchdown(); sfx.crowd?.(); fx.confetti(cam.W, [this.teams.user.clr, this.teams.user.ac, "#ffd166", "#fff"]); fx.punch(1.07, 1.2); fx.flashScreen("#fff", 0.3); this.hype = 1; }
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
    if (this.mode === "menu") { this.buttons = drawMenu(ctx, cam, { teams: TEAMS, user: this.userTi, opp: this.oppTi, time: this.time, focus: this.menuFocus, mobile: this.mobile, fs: this.fsState }); this.fx.draw(ctx, cam.W, cam.H, pixText); return; }
    const m = this.mode, P = this.S, st = this.sit, teams = this.teams;
    // the field, with the shake and the zoom punch
    const [ox, oy] = this.fx.offset(), z = this.fx.zoom;
    ctx.save(); ctx.translate(cam.W / 2 + ox, cam.H / 2 + oy); ctx.scale(z, z); ctx.translate(-cam.W / 2, -cam.H / 2);
    drawRetro(ctx, cam, P, teams, this.g, { ring: true, time: this.time, hype: this.hype, passKind: this.passKind });
    ctx.restore();
    this.fx.draw(ctx, cam.W, cam.H, pixText);
    drawHud(ctx, cam, st, teams, { to: this.g?.to });
    const px = uiPx(cam), hintY = cam.H - px * 9;
    if (m === "play" && P && P.kind) this.drawKick(ctx, P, hintY);
    else if (m === "play" && P) {
      const toGo = st.toGo >= 100 - st.yard ? "GOAL" : st.toGo;
      drawDownBox(ctx, cam, P.phase === "presnap" ? `${ordinal(st.down)} & ${toGo} - ${playName(P.concept || P.call)}` : `${ordinal(st.down)} & ${toGo}`, P.phase === "presnap" ? "#fff" : "#ffd166");
      const throwing = P.phase === "live" && P.ball.holder === "QB", isPass = P.call.startsWith("pass");
      // the pass type button: always there on a pass play, until the ball is thrown
      if (isPass && (P.phase === "presnap" || throwing)) {
        const big = this.mobile, ch = big ? Math.max(px * 19, 48) : px * 11;
        this.chips.kinds = drawSwitch(ctx, cam, px * 3, hintY - px * 4 - ch, [{ key: "bullet", label: "BULLET", color: KIND_COLOR.bullet }, { key: "lob", label: "LOB", color: KIND_COLOR.lob }], this.passKind, { big });
      }
      const hint = P.phase === "presnap" ? (this.mobile ? "TOUCH THE FIELD TO SNAP" : "CLICK OR SPACE TO SNAP")
        : throwing ? (this.mobile ? "PULL BACK - LET GO TO THROW" : "AIM - CLICK TO THROW - Q SWITCHES BULLET/LOB")
        : P.phase === "carry" && P.ents[P.ball.holder]?.side === "off" ? (this.mobile ? "FLICK SIDEWAYS: JUKE - AHEAD: DIVE" : "STEER WITH MOUSE OR W/S - SPACE JUKES - E DIVES") : null;
      if (hint) drawHint(ctx, cam, hint, hintY);
    }
    if (m === "pick") {
      // four pass concepts, drawn fresh each down (one quick, two intermediate, one shot), and the two runs
      const key = `${this.g.plays}|${this.two ? 2 : 0}`; if (this.choicesFor !== key) { this.choicesFor = key; this.choices = conceptChoices(); }
      const items = [...this.choices.map((k) => [k, CONCEPTS[k].name, "play"]), ...CALLS.filter(([k]) => k.startsWith("run")).map(([k, l]) => [k, l, "play"])]; if (st.down === 4) items.push(st.yard >= 58 ? ["fg", `FIELD GOAL ${100 - st.yard + 17}`, "kick"] : ["punt", "PUNT", "kick"]);
      const hover = this.input === "mouse" && this.mouse ? this.lastButtons?.find((b) => inside(this.mouse, b))?.key : null;
      this.buttons = drawPlayCards(ctx, cam, this.two ? "TWO-POINT TRY - PICK A PLAY" : `${ordinal(st.down)} & ${st.toGo >= 100 - st.yard ? "GOAL" : st.toGo} - ${spotOf(st.yard)} - PICK A PLAY`, items, teams.user.clr, { keys: !this.mobile, hover });
      this.lastButtons = this.buttons;
    }
    if (m === "pat") {
      const hover = this.input === "mouse" && this.mouse ? this.lastButtons?.find((b) => inside(this.mouse, b))?.key : null;
      this.buttons = drawPlayCards(ctx, cam, "TOUCHDOWN! - THE TRY", [["xp", "KICK THE PAT", "kick"], ["two", "GO FOR TWO", "play", "slant_flat"]], teams.user.clr, { keys: !this.mobile, hover });
      this.lastButtons = this.buttons;
    }
    if (m === "opp") this.drawDrive(ctx);
    if ((m === "result" || m === "final") && this.banner) { const b = this.banner; drawBanner(ctx, cam, b.title, b.text, b.sub, teams.user.clr, { age: (performance.now() - b.at) / 1000, accent: b.accent || "#ffd166", hint: b.hint || (this.mobile ? "TAP TO CONTINUE" : "CLICK OR SPACE TO CONTINUE") }); }
    // the pause button, and the menu
    if (!this.paused) this.chips.pause = drawChip(ctx, cam, cam.W - px * 2, Math.round(px * 13.5), this.mobile ? "II" : "II  ESC", { align: "right", big: this.mobile });
    if (this.fade > 0) { ctx.globalAlpha = this.fade; ctx.fillStyle = "#0b0e14"; ctx.fillRect(0, 0, cam.W, cam.H); ctx.globalAlpha = 1; }
    if (this.paused) this.buttons = drawPause(ctx, cam, [["resume", "RESUME"], ["mute", isMuted() ? "SOUND: OFF" : "SOUND: ON"], ...(this.fsState && this.fsState !== "ios" ? [["fs", this.fsState === "on" ? "EXIT FULL SCREEN" : "FULL SCREEN"]] : []), ["quit", "QUIT GAME"]], { mobile: this.mobile });
  }
  drawKick(ctx, P, hintY) {
    const cam = this.cam;
    if (P.phase !== "presnap") return;
    drawDownBox(ctx, cam, P.pat ? "EXTRA POINT" : P.kind === "fg" ? `${P.dist} YARD FIELD GOAL` : "PUNT", "#fff");
    const [bx, by] = cam.toScreen(P.ball.x, P.ball.y);
    // the aim: a dotted line from the ball (the touch flick's direction, or toward the pointer)
    let dir = null;
    if (this.mobile && this.touch) dir = [this.touch.cx - this.touch.px, this.touch.cy - this.touch.py];
    else if (!this.mobile && this.mouse) dir = [this.mouse.px - bx, this.mouse.py - by];
    if (dir && Math.hypot(...dir) > 4) {
      const n = Math.hypot(...dir), L = cam.s * 14; ctx.fillStyle = "#ffd166";
      for (let i = 1; i < 12; i++) { const u = i / 12; ctx.fillRect(Math.round(bx + dir[0] / n * L * u) - 2, Math.round(by + dir[1] / n * L * u - cam.s * 1.5 * Math.sin(u * Math.PI)) - 2, 4, 4); }
    }
    // the power meter (mouse and keyboard): fills while you hold, then falls back; let go near the top
    if (!this.mobile) {
      const px = uiPx(cam), w = px * 60, h = px * 6, x = Math.round(cam.W / 2 - w / 2), y = Math.round(hintY - px * 16);
      const pw = this.kickPower();
      ctx.fillStyle = "rgba(8,10,16,.85)"; ctx.fillRect(x - px, y - px, w + px * 2, h + px * 2);
      const grad = ctx.createLinearGradient(x, 0, x + w, 0); grad.addColorStop(0, "#4caf50"); grad.addColorStop(0.75, "#ffd166"); grad.addColorStop(1, "#ff5a4a");
      ctx.fillStyle = grad; ctx.fillRect(x, y, Math.round(w * pw), h);
      ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(x + w * 0.9), y - px, px, h + px * 2);
    }
    drawHint(ctx, cam, this.mobile ? "FLICK UP THE FIELD TO KICK" : "AIM WITH THE MOUSE - HOLD, LET GO AT THE TOP", hintY);
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
    if (m === "pick") { const b = this.buttons.find((b) => inside(p, b)); if (b) this.call(b.key); return true; }
    if (m === "pat") { const b = this.buttons.find((b) => inside(p, b)); if (b) this.patChoice(b.key); return true; }
    if (m === "result") { this.advance(); return true; }
    if (m === "final") { this.mode = "menu"; this.S = null; return true; }
    if (m === "opp") { this.feed.shown = this.feed.list.length; this.feed.at = 0; return true; }
    return false;
  }
  setKind(k) { if (this.passKind !== k) sfx.select?.(); this.passKind = k; try { localStorage.setItem("arcade_pass", k); } catch { /* ignore */ } }
  cycleKind() { this.setKind(this.passKind === "bullet" ? "lob" : "bullet"); }
  menuAction(k) {
    if (k === "fs") { this.fullscreen(this.fsState !== "on"); return; }
    if (k === "go") { if (this.fsState === "off") this.fullscreen(true); this.start(); return; }
    if (k === "gm") { this.onQuit ? this.onQuit() : (location.href = import.meta.env?.BASE_URL ?? "/"); return; }
    const which = k.startsWith("user") ? "userTi" : "oppTi", d = k.endsWith("-1") ? -1 : 1;
    this.menuFocus = which === "userTi" ? "user" : "opp";
    let v = (this[which] + d + TEAMS.length) % TEAMS.length; if (v === (which === "userTi" ? this.oppTi : this.userTi)) v = (v + d + TEAMS.length) % TEAMS.length;
    this[which] = v; preload(TEAMS[v]); sfx.select?.();
  }
  pauseAction(k) { if (k === "fs") { this.fullscreen(this.fsState !== "on"); return; } if (k === "resume") this.paused = false; else if (k === "mute") toggleMute(); else if (k === "quit") { this.paused = false; this.mode = "menu"; this.S = null; } }

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
    if (P.kind) { this.touch = { id: e.pointerId, ...p, cx: p.px, cy: p.py, moved: 0 }; return; } // a kick: the flick is read when you let go
    if (P.phase === "presnap") snap(P);
    this.touch = { id: e.pointerId, ...p, moved: 0 };
    if (P.phase === "carry") P.steer = this.cam.toField(p.px, p.py).y;
  }
  mouseDown(P, e, p) {
    const lob = e.button === 2 || e.shiftKey;
    if (P.kind) { if (P.phase === "presnap") this.kick = { charging: true, t: 0 }; return; }
    if (P.phase === "presnap") { snap(P); return; }
    if (P.phase === "live" && P.ball.holder === "QB") { const f = this.cam.toField(p.px, p.py), qb = P.ents.QB; throwTo(P, { x: Math.max(qb.x - 1, f.x), y: f.y }, null, lob ? "lob" : this.passKind); P.aim = null; return; }
    if (P.phase === "carry") { if (lob) dive(P); else juke(P); } // right-click dives
  }
  onMove(e) {
    const p = this.pt(e);
    if (e.pointerType === "mouse") { this.mouse = p; if (this.input !== "mouse" && !this.touch) this.input = "mouse"; return; }
    const t = this.touch, P = this.S, cam = this.cam; if (!t || !P || t.id !== e.pointerId) return;
    t.moved = Math.max(t.moved, Math.hypot(p.px - t.px, p.py - t.py)); t.cx = p.px; t.cy = p.py;
    if (P.kind) return;
    if (P.phase === "live" && P.ball.holder === "QB") {
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
    if (e.pointerType === "mouse") { if (P?.kind && this.kick?.charging) this.releaseKick(P); return; }
    const t = this.touch; if (!t || t.id !== e.pointerId) return; this.touch = null; if (!P) return;
    if (P.kind) { if (t.moved > 12 && P.phase === "presnap") { const cam = this.cam; kickFlick(P, (t.cx - t.px) / cam.s, (t.cy - t.py) / (cam.s * 0.42)); } return; }
    if (P.phase === "live" && P.ball.holder === "QB" && P.aim && t.moved > 6) throwTo(P, P.aim, null, this.passKind);
    P.aim = null; P.steer = null;
  }
  // the mouse kick: direction toward the pointer, length from the meter (a full meter is a long flick)
  releaseKick(P) {
    const pw = this.kickPower(); this.kick = null; if (P.phase !== "presnap") return;
    const cam = this.cam, [bx, by] = cam.toScreen(P.ball.x, P.ball.y), m = this.mouse || { px: bx + 100, py: by };
    let dx = (m.px - bx) / cam.s, dy = (m.py - by) / (cam.s * 0.42); const n = Math.hypot(dx, dy) || 1; if (dx < 0.5) { dx = 1; dy = 0; }
    const len = 11 * Math.min(1.15, pw / 0.9); // the white line on the meter (90%) is a full-strength kick
    kickFlick(P, (dx / n) * len, (dy / n) * len);
  }
  onKey(e) {
    const k = e.key.toLowerCase(); if (["input", "select", "textarea"].includes(document.activeElement?.tagName?.toLowerCase())) return;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(k)) e.preventDefault();
    if (e.repeat && k !== "w" && k !== "s" && k !== "arrowup" && k !== "arrowdown") return;
    this.keys.add(k); unlock();
    if (k !== "w" && k !== "s" && !k.startsWith("arrow")) this.input = this.input === "touch" && !e.repeat ? "mouse" : this.input;
    if (k === "escape" || k === "p") { if (this.mode !== "menu") this.paused = !this.paused; return; }
    if (k === "m") { toggleMute(); return; }
    if (k === "f") { this.fullscreen(this.fsState !== "on"); return; }
    if (this.paused) { if (k === "enter" || k === " ") this.paused = false; return; }
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
    if (m === "result" || m === "opp") { if (k === " " || k === "enter") this.tapUI({ px: -1, py: -1 }); return; }
    if (m === "final") { if (k === " " || k === "enter") { this.mode = "menu"; this.S = null; } return; }
    if (m !== "play" || !P) return;
    if (k === "q" && !P.kind) { this.cycleKind(); return; }
    if (k === "e" && !P.kind && P.phase === "carry") { dive(P); return; }
    if (P.kind) { if (k === " " && P.phase === "presnap") this.kick = { charging: true, t: 0 }; return; }
    if (k === " " || k === "enter") {
      if (P.phase === "presnap") snap(P);
      else if (P.phase === "live" && P.ball.holder === "QB" && P.aim) { throwTo(P, P.aim, null, e.shiftKey ? "lob" : this.passKind); P.aim = null; }
      else if (P.phase === "carry") juke(P);
    }
  }
  onKeyUp(e) { const k = e.key.toLowerCase(); this.keys.delete(k); if (k === " " && this.S?.kind && this.kick?.charging) this.releaseKick(this.S); }
}

export const kickNote = (P) => P.kind === "fg" && P.flick ? (P.flick.made ? "RIGHT DOWN THE MIDDLE" : P.flick.short ? "SHORT - KICK IT HARDER" : P.flick.wide ? "WIDE - AIM STRAIGHTER" : "PUSHED IT") : "";
export const resultTitle = (ev) => !ev ? "" : ev.type === "pat" ? (ev.pat?.good ? (ev.pat.two ? "TWO POINTS!" : "IT'S GOOD!") : "NO GOOD") : ev.td ? "TOUCHDOWN!" : ev.type === "int" ? "INTERCEPTED" : ev.type === "sack" ? "SACKED" : ev.type === "fumble" ? "FUMBLE" : ev.type === "inc" ? "INCOMPLETE" : ev.type === "fg" ? "FIELD GOAL!" : ev.type === "fg_miss" ? "NO GOOD" : ev.type === "punt" ? "PUNT" : ev.type === "penalty" ? "FLAG" : ev.firstDown ? "FIRST DOWN" : `${ev.yards >= 0 ? "+" : ""}${ev.yards} YARDS`;
export const pickNote = (p) => p.why === "sacked" ? "THE RUSH GOT HOME" : p.target == null ? "" : `${p.open ? "OPEN" : "COVERED"}${p.def != null ? ` BY ${p.def} YD` : ""}${p.err != null ? ` - ${p.err <= 1 ? "ON THE MONEY" : p.err <= 2.2 ? "CATCHABLE" : "OFF TARGET"}` : ""}${p.why === "hurried" ? " - HURRIED" : p.why === "late" ? " - HELD IT TOO LONG" : ""}`;
export { passPlan, BULLET_RANGE };
