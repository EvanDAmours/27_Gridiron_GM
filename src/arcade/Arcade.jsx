// Arcade mode (prototype), Retro Bowl style: you play your offense on a side-on pixel field, on
// top of the real engine. Pull back from anywhere to throw; swipe up and down to steer a runner.
import { useEffect, useRef, useState, useCallback } from "react";
import { TEAMS, newGame, lineups, runPlay, simOpponentDrive, situation } from "./bridge.js";
import { setupPlay, snap, tick, throwTo, PLAY_NAMES } from "./play.js";
import { makeCamera, drawRetro, drawHud, drawDownBox, drawBanner, preload, pixText } from "./retro.js";

const BG = "#0b0e14", TXT = "#eef2f5", MUTED = "#9aa7b2";
const PIX = { fontFamily: "'Courier New', ui-monospace, monospace", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" };
const btn = (extra = {}) => ({ ...PIX, background: "#1b2230", color: TXT, border: "3px solid #3d4a56", boxShadow: "inset -3px -3px 0 #0b0e14, inset 3px 3px 0 #2c3744", borderRadius: 0, padding: "12px 10px", fontSize: 13, cursor: "pointer", touchAction: "manipulation", ...extra });
const spotOf = (yard) => (yard === 50 ? "the 50" : yard < 50 ? `own ${yard}` : `opp ${100 - yard}`);
const ordinal = (n) => ["1st", "2nd", "3rd", "4th"][n - 1] || `${n}th`;
const PULL = 2.6; // yards of throw per yard of pull-back

export default function Arcade() {
  const [userTi, setUser] = useState(0), [oppTi, setOpp] = useState(1);
  const [game, setGame] = useState(null);
  if (!game) {
    const sel = (v, set) => (
      <select value={v} onChange={(e) => set(+e.target.value)} style={{ ...btn(), width: "100%", appearance: "auto", textTransform: "none", letterSpacing: 0, fontWeight: 700 }}>
        {TEAMS.map((t, i) => <option key={t.ab} value={i}>{t.city} {t.name}</option>)}
      </select>
    );
    return (
      <div style={{ minHeight: "100dvh", background: BG, color: TXT, fontFamily: PIX.fontFamily, padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ ...PIX, margin: "20px 0 0", fontSize: 26, color: "#ffd166", textShadow: "3px 3px 0 #000" }}>Gridiron Arcade</h1>
        <div style={{ color: MUTED, fontSize: 13, lineHeight: 1.4 }}>Beta. You run the offense; the engine plays everything else. Touch the field to snap, pull back to throw, release to let it fly. Swipe up or down to steer a runner.</div>
        <label style={{ fontSize: 12, color: MUTED, ...PIX }}>Your team{sel(userTi, setUser)}</label>
        <label style={{ fontSize: 12, color: MUTED, ...PIX }}>Opponent{sel(oppTi, setOpp)}</label>
        <button style={btn({ background: TEAMS[userTi].clr, borderColor: TEAMS[userTi].ac, fontSize: 18, padding: 16 })} onClick={() => setGame(newGame(userTi, oppTi))}>Kick off</button>
        <a href={import.meta.env.BASE_URL} style={{ color: MUTED, fontSize: 12, textAlign: "center", marginTop: 6, ...PIX }}>← Back to Football GM</a>
      </div>
    );
  }
  return <GameView game={game} teams={{ user: TEAMS[userTi], opp: TEAMS[oppTi] }} onQuit={() => setGame(null)} />;
}

function GameView({ game, teams, onQuit }) {
  const { g } = game;
  const canvasRef = useRef(null), wrapRef = useRef(null), camRef = useRef(null), S = useRef(null), raf = useRef(0), last = useRef(0), touch = useRef(null);
  const modeRef = useRef("start"), sitRef = useRef(situation(g)), feedRef = useRef({ list: [], shown: 0, at: 0 }), bannerRef = useRef(null);
  const [mode, setModeState] = useState("start"); // start | pick | play | result | opp | kick | final
  const [sit, setSit] = useState(sitRef.current);
  const setMode = useCallback((m) => { modeRef.current = m; setModeState(m); }, []);
  const refresh = useCallback(() => { sitRef.current = situation(g); setSit(sitRef.current); }, [g]);
  useEffect(() => { preload(teams.user); preload(teams.opp); }, [teams]);

  // what happens next: the other team's drive (and any kickoff), or your next call
  const advance = useCallback(() => {
    bannerRef.current = null;
    if (g.done) { setMode("final"); refresh(); return; }
    if (g.koNext || g.poss !== "h") {
      const evs = simOpponentDrive(g).filter((e) => e.text);
      feedRef.current = { list: evs, shown: 0, at: performance.now() }; setMode("opp"); refresh();
      return;
    }
    S.current = null; setMode("pick"); refresh();
  }, [g, refresh, setMode]);
  useEffect(() => { if (mode === "start") advance(); }, [mode, advance]);

  const call = (c) => {
    if (c === "punt" || c === "fg") { const ev = runPlay(g, c); S.current = null; bannerRef.current = ev ? { title: resultTitle(ev), text: ev.text, sub: null } : null; setMode("kick"); refresh(); return; }
    const P = setupPlay(g, lineups(g), c); S.current = P; camRef.current.camX = P.ball.x + camRef.current.lead; setMode("play"); refresh();
  };

  // the canvas: sized to its box, drawn every frame
  const draw = useCallback(() => {
    const cv = canvasRef.current, cam = camRef.current; if (!cv || !cam) return;
    const ctx = cv.getContext("2d"); ctx.save(); ctx.scale(cv.width / cam.W, cv.height / cam.H);
    const m = modeRef.current, P = S.current, st = sitRef.current;
    drawRetro(ctx, cam, P, teams, g, { ring: true });
    drawHud(ctx, cam, st, teams);
    if (m === "play" && P) {
      const line = P.phase === "presnap" ? `${ordinal(st.down)} & ${st.toGo >= 100 - st.yard ? "goal" : st.toGo} - ${PLAY_NAMES[P.call]}` : P.phase === "live" && P.ball.holder === "QB" ? "PULL BACK TO THROW" : P.phase === "run" || P.phase === "yac" ? "SWIPE TO STEER" : null;
      if (line) drawDownBox(ctx, cam, line, P.phase === "presnap" ? "#fff" : "#ffd166");
      if (P.phase === "presnap") pixText(ctx, "TOUCH THE FIELD TO SNAP", cam.W / 2, cam.H - Math.round(cam.s * 0.9), Math.max(2, Math.round(cam.s * 0.1)), "#fff", "center");
    }
    if (m === "opp") {
      const f = feedRef.current, px = Math.max(2, Math.round(cam.s * 0.08)), lines = f.list.slice(Math.max(0, f.shown - 5), f.shown);
      ctx.fillStyle = "rgba(8,10,16,.9)"; ctx.fillRect(0, cam.H - px * 8 * 6.5, cam.W, px * 8 * 6.5);
      pixText(ctx, `${teams.opp.name} ball`, px * 2, cam.H - px * 8 * 6.2, px, "#9aa7b2");
      lines.forEach((e, i) => pixText(ctx, e.text.slice(0, Math.floor((cam.W - px * 4) / (6 * px))), px * 2, cam.H - px * 8 * 5 + i * px * 8, px, e.td || e.turnover ? "#ffd166" : "#fff"));
      pixText(ctx, "TAP TO SKIP", cam.W - px * 2, cam.H - px * 8 * 6.2, px, "rgba(255,255,255,.6)", "right");
    }
    if ((m === "result" || m === "kick" || m === "final") && bannerRef.current) { const b = bannerRef.current; drawBanner(ctx, cam, b.title, b.text, b.sub, teams.user.clr); }
    ctx.restore();
  }, [teams, g]);
  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    const fit = () => { const W = wrap.clientWidth, H = wrap.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; const cam = makeCamera(W, H); cam.camX = camRef.current?.camX ?? (S.current ? S.current.ball.x : g.yard) + cam.lead; camRef.current = cam; draw(); };
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, [draw, g]);
  useEffect(() => {
    const loop = (now) => {
      const dt = Math.min(0.05, (now - (last.current || now)) / 1000); last.current = now;
      const P = S.current, cam = camRef.current, m = modeRef.current;
      if (P && cam) {
        const live = tick(P, dt);
        const want = P.ball.x + cam.lead; cam.camX += (want - cam.camX) * Math.min(1, dt * 5);
        if (!live && P.phase === "done" && m === "play") {
          const ev = P.result || P.ev; bannerRef.current = { title: resultTitle(ev), text: P.text || ev?.text || "", sub: P.pick ? pickNote(P.pick) : null };
          setMode("result"); refresh();
        }
      }
      if (m === "opp") { const f = feedRef.current; if (now - f.at > 650 && f.shown < f.list.length) { f.shown++; f.at = now; } else if (f.shown >= f.list.length && now - f.at > 900) advance(); }
      if (m === "final" && !bannerRef.current) { const st = sitRef.current, lead = st.score.h - st.score.a; bannerRef.current = { title: lead > 0 ? "YOU WIN!" : lead < 0 ? "YOU LOSE" : "TIE GAME", text: `${teams.user.name} ${st.score.h}, ${teams.opp.name} ${st.score.a}`, sub: null }; }
      draw(); raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf.current);
  }, [draw, refresh, advance, teams, setMode]);

  // Touch: at the line, a touch snaps the ball and starts the pull-back. Pulling back from where
  // you touched aims the throw the other way (Retro Bowl); release to throw. With a runner, your
  // finger's height on the field is where he heads.
  const pt = (e) => { const r = canvasRef.current.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; };
  const onDown = (e) => {
    const m = modeRef.current, P = S.current;
    if (m === "result" || m === "kick") { advance(); return; }
    if (m === "final") { onQuit(); return; }
    if (m === "opp") { feedRef.current.shown = feedRef.current.list.length; feedRef.current.at = 0; return; }
    if (m !== "play" || !P) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = pt(e);
    if (P.phase === "presnap") snap(P);
    touch.current = { ...p, moved: 0 };
    if (P.phase === "run" || P.phase === "yac") P.steer = camRef.current.toField(p.px, p.py).y;
  };
  const onMove = (e) => {
    const t = touch.current, P = S.current, cam = camRef.current; if (!t || !P) return;
    const p = pt(e); t.moved = Math.max(t.moved, Math.hypot(p.px - t.px, p.py - t.py));
    if (P.phase === "live" && P.ball.holder === "QB") {
      const qb = P.ents.QB, a = cam.toField(t.px, t.py), b = cam.toField(p.px, p.py);
      const dx = (a.x - b.x) * PULL, dy = (a.y - b.y) * PULL;
      P.aim = t.moved > 6 ? { x: qb.x + Math.max(2, dx), y: Math.max(-26, Math.min(26, qb.y + dy)) } : null;
    } else if (P.phase === "run" || P.phase === "yac") P.steer = cam.toField(p.px, p.py).y;
  };
  const onUp = () => {
    const t = touch.current, P = S.current; touch.current = null; if (!t || !P) return;
    if (P.phase === "live" && P.ball.holder === "QB" && P.aim && t.moved > 6) throwTo(P, P.aim);
    P.aim = null; P.steer = null;
  };

  const fourth = sit.down === 4;
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: BG, color: TXT, fontFamily: PIX.fontFamily, userSelect: "none" }}>
      <div ref={wrapRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ display: "block", touchAction: "none", imageRendering: "pixelated" }} />
        <button onClick={onQuit} style={{ ...btn({ padding: "4px 8px", fontSize: 10 }), position: "absolute", right: 6, bottom: 6, opacity: 0.7 }}>Quit</button>
      </div>
      {mode === "pick" && (
        <div style={{ background: "#11161f", padding: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, borderTop: "3px solid #2c3744" }}>
          <div style={{ gridColumn: "1 / -1", ...PIX, fontSize: 11, color: "#ffd166", textAlign: "center", padding: "2px 0 4px" }}>{ordinal(sit.down)} & {sit.toGo >= 100 - sit.yard ? "goal" : sit.toGo} · {spotOf(sit.yard)} · pick a play</div>
          <button style={btn()} onClick={() => call("pass_quick")}>Quick</button>
          <button style={btn()} onClick={() => call("pass_medium")}>Medium</button>
          <button style={btn()} onClick={() => call("pass_deep")}>Deep</button>
          <button style={btn()} onClick={() => call("run_inside")}>Inside run</button>
          <button style={btn()} onClick={() => call("run_outside")}>Outside run</button>
          {fourth ? <button style={btn({ background: "#3b2f1f" })} onClick={() => call(sit.yard >= 58 ? "fg" : "punt")}>{sit.yard >= 58 ? `FG ${100 - sit.yard + 17}` : "Punt"}</button> : <div />}
        </div>
      )}
    </div>
  );
}

const resultTitle = (ev) => !ev ? "" : ev.td ? "TOUCHDOWN!" : ev.type === "int" ? "INTERCEPTED" : ev.type === "sack" ? "SACKED" : ev.type === "fumble" ? "FUMBLE" : ev.type === "inc" ? "INCOMPLETE" : ev.type === "fg" ? "FIELD GOAL" : ev.type === "fg_miss" ? "NO GOOD" : ev.type === "punt" ? "PUNT" : ev.type === "penalty" ? "FLAG" : ev.firstDown ? "FIRST DOWN" : `${ev.yards >= 0 ? "+" : ""}${ev.yards} YARDS`;
const pickNote = (p) => `${p.open ? "OPEN" : "COVERED"} BY ${p.sep} YD - ${p.err <= 1.5 ? "PERFECT THROW" : p.err <= 3 ? "CATCHABLE" : "OFF TARGET"}${p.why === "hurried" ? " - HURRIED" : p.why === "late" ? " - HELD IT TOO LONG" : ""}`;
