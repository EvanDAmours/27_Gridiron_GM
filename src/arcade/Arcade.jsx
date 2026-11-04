// Arcade mode (prototype): you play your offense, drag-and-throw, on top of the real engine.
import { useEffect, useRef, useState, useCallback } from "react";
import { TEAMS, newGame, lineups, runPlay, simOpponentDrive, situation } from "./bridge.js";
import { setupPlay, snap, tick, throwTo, PLAY_NAMES } from "./play.js";
import { makeCamera, drawField } from "./field.js";

const BG = "#0f1418", PANEL = "#1b232a", TXT = "#eef2f5", MUTED = "#9aa7b2";
const btn = (extra = {}) => ({ background: "#2b3640", color: TXT, border: "1px solid #3d4a56", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", ...extra });
const clockOf = (c) => `${Math.floor(c / 60)}:${String(c % 60).padStart(2, "0")}`;
const spotOf = (yard) => (yard === 50 ? "the 50" : yard < 50 ? `own ${yard}` : `opp ${100 - yard}`);
const ordinal = (n) => ["1st", "2nd", "3rd", "4th"][n - 1] || `${n}th`;

export default function Arcade() {
  const [userTi, setUser] = useState(0), [oppTi, setOpp] = useState(1);
  const [game, setGame] = useState(null);
  if (!game) {
    const sel = (v, set) => (
      <select value={v} onChange={(e) => set(+e.target.value)} style={{ ...btn(), width: "100%", appearance: "auto" }}>
        {TEAMS.map((t, i) => <option key={t.ab} value={i}>{t.city} {t.name}</option>)}
      </select>
    );
    return (
      <div style={{ minHeight: "100dvh", background: BG, color: TXT, fontFamily: "system-ui, sans-serif", padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ margin: "20px 0 0", fontSize: 28 }}>Gridiron Arcade</h1>
        <div style={{ color: MUTED, fontSize: 14 }}>Prototype. You call and throw for your offense; the engine plays everything else. Drag from the quarterback to a spot and let go to throw.</div>
        <label style={{ fontSize: 13, color: MUTED }}>Your team{sel(userTi, setUser)}</label>
        <label style={{ fontSize: 13, color: MUTED }}>Opponent{sel(oppTi, setOpp)}</label>
        <button style={btn({ background: TEAMS[userTi].clr, borderColor: TEAMS[userTi].ac, fontSize: 18 })} onClick={() => setGame(newGame(userTi, oppTi))}>Kick off</button>
        <a href={import.meta.env.BASE_URL} style={{ color: MUTED, fontSize: 13, textAlign: "center", marginTop: 6 }}>← Back to Football GM</a>
      </div>
    );
  }
  return <GameView game={game} teams={{ user: TEAMS[userTi], opp: TEAMS[oppTi] }} onQuit={() => setGame(null)} />;
}

function GameView({ game, teams, onQuit }) {
  const { g } = game;
  const canvasRef = useRef(null), wrapRef = useRef(null), camRef = useRef(null), S = useRef(null), raf = useRef(0), last = useRef(0), aiming = useRef(null);
  const [mode, setMode] = useState("start"); // start | pick | play | result | opp | final
  const [sit, setSit] = useState(() => situation(g));
  const [feed, setFeed] = useState([]);
  const [shown, setShown] = useState(0);
  const refresh = useCallback(() => setSit(situation(g)), [g]);

  // what happens next: the other team's drive (and any kickoff), or your next call
  const advance = useCallback(() => {
    if (g.done) { setMode("final"); refresh(); return; }
    if (g.koNext || g.poss !== "h") {
      const evs = simOpponentDrive(g);
      setFeed(evs.filter((e) => e.text)); setShown(0); setMode("opp"); refresh();
      return;
    }
    S.current = null; setMode("pick"); refresh();
  }, [g, refresh]);
  useEffect(() => { if (mode === "start") advance(); }, [mode, advance]);

  // the opponent's plays, one at a time
  useEffect(() => {
    if (mode !== "opp") return;
    if (shown >= feed.length) { const t = setTimeout(advance, 700); return () => clearTimeout(t); }
    const t = setTimeout(() => setShown((n) => n + 1), 550);
    return () => clearTimeout(t);
  }, [mode, shown, feed, advance]);

  // canvas sizing and the draw loop
  const draw = useCallback(() => {
    const cv = canvasRef.current, cam = camRef.current; if (!cv || !cam) return;
    const ctx = cv.getContext("2d"); ctx.save(); ctx.scale(cv.width / cam.W, cv.height / cam.H);
    drawField(ctx, cam, S.current, teams, { eligible: true });
    ctx.restore();
  }, [teams]);
  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    const fit = () => { const W = wrap.clientWidth, H = wrap.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; const cam = makeCamera(W, H); cam.camX = camRef.current?.camX ?? (S.current ? S.current.ball.x + 12 : g.yard + 12); camRef.current = cam; draw(); };
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, [draw, g]);
  useEffect(() => {
    const loop = (now) => {
      const dt = Math.min(0.05, (now - (last.current || now)) / 1000); last.current = now;
      const P = S.current, cam = camRef.current;
      if (P && cam) {
        const live = tick(P, dt);
        const want = P.ball.x + 12; cam.camX += (want - cam.camX) * Math.min(1, dt * 4);
        if (!live && P.phase === "done" && mode === "play") { setMode("result"); refresh(); }
      }
      draw(); raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf.current);
  }, [draw, mode, refresh]);

  const call = (c) => {
    if (c === "punt" || c === "fg") { const ev = runPlay(g, c); S.current = null; setFeed(ev ? [ev] : []); setShown(1); setMode("kick"); refresh(); return; }
    const P = setupPlay(g, lineups(g), c); S.current = P; camRef.current.camX = P.ball.x + 12; setMode("play"); refresh();
  };
  const hike = () => { const P = S.current; if (P && P.phase === "presnap") snap(P); };

  // drag from anywhere: the reticle is where the ball comes down
  const onDown = (e) => { const P = S.current; if (!P || P.phase !== "live" || P.ball.holder !== "QB") return; e.currentTarget.setPointerCapture?.(e.pointerId); aiming.current = { x0: e.clientX, y0: e.clientY }; setAim(e); };
  const setAim = (e) => { const P = S.current, cam = camRef.current, r = canvasRef.current.getBoundingClientRect(); if (!P || !cam) return; P.aim = cam.toField(e.clientX - r.left, e.clientY - r.top); };
  const onMove = (e) => { if (aiming.current) setAim(e); };
  const onUp = (e) => {
    const P = S.current, a = aiming.current; aiming.current = null; if (!P || !a) return;
    const moved = Math.hypot(e.clientX - a.x0, e.clientY - a.y0);
    if (moved > 10 && P.aim) throwTo(P, P.aim);
    P.aim = null;
  };

  const lead = sit.score.h - sit.score.a;
  const P = S.current;
  const fourth = sit.down === 4;
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: BG, color: TXT, fontFamily: "system-ui, sans-serif", userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: PANEL, fontSize: 14 }}>
        <Score t={teams.user} n={sit.score.h} poss={sit.poss === "h"} />
        <div style={{ flex: 1, textAlign: "center", color: MUTED, fontSize: 12, lineHeight: 1.3 }}>
          <div>{sit.ot ? "OT" : `Q${sit.qtr}`} · {clockOf(sit.clock)}</div>
          <div style={{ color: TXT, fontWeight: 700 }}>{sit.poss === "h" && !sit.koNext && !sit.done ? `${ordinal(sit.down)} & ${sit.toGo >= 100 - sit.yard ? "goal" : sit.toGo} · ${spotOf(sit.yard)}` : sit.done ? "Final" : "Defense"}</div>
        </div>
        <Score t={teams.opp} n={sit.score.a} poss={sit.poss === "a"} right />
        <button onClick={onQuit} style={btn({ padding: "6px 10px", fontSize: 12 })}>Quit</button>
      </div>
      <div ref={wrapRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ display: "block", touchAction: "none" }} />
        {mode === "play" && P?.phase === "presnap" && (
          <button onClick={hike} style={{ ...btn({ background: teams.user.clr, borderColor: teams.user.ac, fontSize: 20, padding: "14px 30px" }), position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)" }}>HIKE</button>
        )}
        {mode === "play" && P && P.phase !== "presnap" && P.phase !== "done" && (
          <div style={{ position: "absolute", top: 8, left: 0, right: 0, textAlign: "center", color: "#fff", fontWeight: 800, fontSize: 13, textShadow: "0 1px 3px #000" }}>
            {P.ball.holder === "QB" && P.phase === "live" ? "Drag to a spot and release to throw" : PLAY_NAMES[P.call]}
          </div>
        )}
        {(mode === "result" || mode === "kick") && (
          <Card onNext={advance} title={resultTitle(mode === "kick" ? feed[0] : P?.result)} text={(mode === "kick" ? feed[0]?.text : P?.text) || ""} sub={mode !== "kick" && P?.pick ? pickNote(P.pick) : null} color={teams.user.clr} />
        )}
        {mode === "opp" && (
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, background: "rgba(10,14,18,.92)", borderRadius: 12, padding: 12, maxHeight: "55%", overflow: "auto" }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{teams.opp.name} have the ball</div>
            {feed.slice(0, shown).map((e, i) => <div key={i} style={{ fontSize: 13, padding: "3px 0", borderTop: i ? "1px solid #26303a" : "none", color: e.td || e.turnover ? "#ffd166" : TXT }}>{e.text}</div>)}
            <button onClick={() => setShown(feed.length)} style={{ ...btn({ padding: "6px 10px", fontSize: 12 }), marginTop: 8 }}>Skip</button>
          </div>
        )}
        {mode === "final" && (
          <Card title={lead > 0 ? "You win!" : lead < 0 ? "You lose" : "Tie"} text={`${teams.user.name} ${sit.score.h}, ${teams.opp.name} ${sit.score.a}`} onNext={onQuit} nextLabel="New game" color={teams.user.clr} />
        )}
      </div>
      {mode === "pick" && (
        <div style={{ background: PANEL, padding: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <button style={btn()} onClick={() => call("pass_quick")}>Quick pass</button>
          <button style={btn()} onClick={() => call("pass_medium")}>Medium pass</button>
          <button style={btn()} onClick={() => call("pass_deep")}>Deep pass</button>
          <button style={btn()} onClick={() => call("run_inside")}>Inside run</button>
          <button style={btn()} onClick={() => call("run_outside")}>Outside run</button>
          {fourth ? <button style={btn({ background: "#3b2f1f" })} onClick={() => call(sit.yard >= 58 ? "fg" : "punt")}>{sit.yard >= 58 ? `FG (${100 - sit.yard + 17} yd)` : "Punt"}</button> : <div />}
        </div>
      )}
    </div>
  );
}

const Score = ({ t, n, poss, right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: right ? "row-reverse" : "row" }}>
    <div style={{ width: 34, height: 34, borderRadius: 8, background: t.clr, border: `2px solid ${t.ac}`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12 }}>{t.ab}</div>
    <div style={{ fontSize: 22, fontWeight: 800 }}>{n}</div>
    {poss && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#ffd166" }} />}
  </div>
);

const resultTitle = (ev) => !ev ? "" : ev.td ? "TOUCHDOWN" : ev.type === "int" ? "INTERCEPTED" : ev.type === "sack" ? "SACKED" : ev.type === "fumble" ? "FUMBLE" : ev.type === "inc" ? "Incomplete" : ev.type === "fg" ? "Field goal" : ev.type === "fg_miss" ? "No good" : ev.type === "punt" ? "Punt" : ev.type === "penalty" ? "Flag" : ev.firstDown ? "First down" : `${ev.yards >= 0 ? "+" : ""}${ev.yards} yards`;
const pickNote = (p) => `${p.open ? "Open" : "Covered"} by ${p.sep} yd · throw ${p.err <= 1.5 ? "on the money" : p.err <= 3 ? "catchable" : "off target"}${p.why === "hurried" ? " · hurried by the rush" : p.why === "late" ? " · held it too long" : ""}`;

function Card({ title, text, sub, onNext, nextLabel = "Next play", color }) {
  return (
    <div onClick={onNext} style={{ position: "absolute", left: 12, right: 12, bottom: 16, background: "rgba(10,14,18,.94)", borderRadius: 14, padding: 14, borderLeft: `6px solid ${color}` }}>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.5 }}>{title}</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>{text}</div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{sub}</div>}
      <button style={{ ...btn({ padding: "8px 14px", fontSize: 13 }), marginTop: 10 }}>{nextLabel}</button>
    </div>
  );
}
