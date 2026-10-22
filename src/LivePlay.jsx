// A play acted out on the live field (livePlays.js picks which ones): the camera pushes in on the
// ball, the snap, routes, the throw or the handoff, the chase and the tackle, all from the engine's
// result (playScript.js), so it can't play out any other way than the play-by-play says. Drawn
// inside the field's camera group; the KEY PLAY banner and the result card sit over the field
// (LiveField draws them, told which part of the play it's in by onPhase).
import React, { useEffect, useMemo, useRef, useState } from "react";
import TeamSprite, { teamSpriteHeight } from "./pixel/TeamSprite.jsx";
import { buildPlay } from "./playScript.js";

// banner: how long the field holds at the snap under the KEY PLAY banner; card: how long the final
// picture holds under the result (longer for a headline)
const BANNER = 1100, LEAD_IN = 450, CARD = 1700, CARD_SHORT = 800;

// anim: { ev, key, id, card }; slots: the 22 men at the snap (LiveField), with the team, side and
// uniform each wears; X, Y: yards to field units; cam: the camera group (a ref); W, H: the field;
// zoom: how far the camera pushes in; speed: play speed (1 normal); onPhase("play" | "card");
// onDone: the play's over.
// paused: the game's paused, so the play holds where it is
export default function LivePlay({ anim, slots, X, Y, cam, W, H, zoom = 2.1, speed = 1, paused = false, onPhase, onDone }) {
  const sc = useMemo(() => buildPlay(anim.ev, slots, anim.id * 7919 + 13), [anim.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [t, setT] = useState(0);
  const done = useRef(onDone), phase = useRef(onPhase), hold = useRef(paused);
  done.current = onDone; phase.current = onPhase; hold.current = paused;
  useEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const lead = anim.key ? BANNER : LEAD_IN, cardMs = anim.card?.head ? CARD : CARD_SHORT;
    const playMs = (sc.T * 1000) / speed;
    let raf = 0, start = performance.now(), last = start, said = "";
    const c = { x: W / 2, y: H / 2, k: 1 };
    const tell = (p) => { if (said !== p) { said = p; phase.current?.(p); } };
    const frame = (now) => {
      if (hold.current) { start += now - last; last = now; raf = requestAnimationFrame(frame); return; }
      const ms = now - start, dt = Math.min(0.05, (now - last) / 1000); last = now;
      const tt = still ? sc.T : Math.max(0, ((ms - lead) / 1000) * speed);
      setT(Math.min(tt, sc.T));
      if (ms >= lead) tell(ms >= lead + playMs ? "card" : "play");
      // the camera follows the ball, a little ahead of it, and never shows past the edge of the field
      const b = ballAt(sc, Math.min(tt, sc.T));
      const k = zoom, tx = X(b.x) + 30, ty = Y(b.y);
      const a = ms < lead ? 1 - Math.exp(-dt * 7) : 1 - Math.exp(-dt * 4.5);
      c.k += (k - c.k) * a; c.x += (tx - c.x) * a; c.y += (ty - c.y) * a;
      const hw = W / (2 * c.k), hh = H / (2 * c.k);
      const cx = Math.max(hw, Math.min(W - hw, c.x)), cy = Math.max(hh, Math.min(H - hh, c.y));
      if (cam.current) { cam.current.style.transition = "none"; cam.current.style.transform = `translate(${W / 2 - c.k * cx}px, ${H / 2 - c.k * cy}px) scale(${c.k})`; }
      if (ms >= lead + playMs + cardMs) { done.current?.(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [anim.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ball = ballAt(sc, t);
  const men = slots.map((s) => {
    const [x, y] = sc.f[s.key](t), [px] = sc.f[s.key](Math.max(0, t - 0.06));
    const vx = x - px, moving = Math.hypot(vx, y - sc.f[s.key](Math.max(0, t - 0.06))[1]) > 0.08;
    const h = teamSpriteHeight(s.team, s.pos) || 30;
    // running flat out the other way (a return, a corner turning to run with his man) turns him
    // around; backpedalling (a dropback, pass protection, a linebacker's drop) doesn't
    const facing = Math.abs(vx) > 0.25 ? (vx > 0 ? "right" : "left") : s.side === "off" ? "right" : "left";
    const fall = sc.down[s.key] != null ? Math.max(0, Math.min(1, (t - sc.down[s.key]) / 0.22)) : 0;
    const hop = sc.hop?.key === s.key && t > sc.hop.at ? Math.abs(Math.sin((t - sc.hop.at) * 9)) * 6 : 0;
    const bob = moving && !fall ? Math.abs(Math.sin(t * 19 + s.y)) * 1.6 : 0;
    return { s, sx: X(x), sy: Y(y) - bob - hop, h, facing, fall };
  }).sort((a, b) => a.sy - b.sy);
  const holder = ball.held ? men.find((m) => m.s.key === ball.held) : null;
  const bx = holder ? holder.sx + (holder.facing === "right" ? 3 : -3) : X(ball.x);
  const by = holder ? holder.sy + 1 : Y(ball.y) + (1.2 - ball.h) * 12;
  return (
    <g pointerEvents="none">
      {!holder && <ellipse cx={X(ball.x)} cy={Y(ball.y) + 16} rx="3.2" ry="1.3" fill="#000" opacity={0.3 / (1 + ball.h * 0.4)} />}
      {men.map(({ s, sx, sy, h, facing, fall }) => (
        <g key={s.key} transform={`translate(${sx} ${sy})${fall ? ` rotate(${(facing === "right" ? 1 : -1) * fall * 78} 0 ${h * 0.5})` : ""}`}>
          <TeamSprite y={Math.round(h * 0.5)} team={s.team} pos={s.pos} away={s.away} facing={facing} />
        </g>
      ))}
      <g transform={`translate(${bx} ${by}) rotate(${holder ? 0 : -18})`}>
        <ellipse rx="3.6" ry="2.2" fill="#7c3f12" stroke="#2b1405" strokeWidth=".6" />
        <line x1="-1.4" y1="0" x2="1.4" y2="0" stroke="#fff" strokeWidth=".6" />
      </g>
      {/* the names that matter on this play, over their heads */}
      {men.filter((m) => sc.stars.includes(m.s.key) && (sc.who[m.s.key] || m.s.p)).map(({ s, sx, sy, h }) => {
        const full = (sc.who[s.key] || s.p).name, nm = full.split(" ").slice(1).join(" ") || full;
        return <text key={`n${s.key}`} x={sx} y={sy - h * 0.5 - 4} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff" stroke="#000b" strokeWidth="2.2" paintOrder="stroke" fontFamily="system-ui">{nm}</text>;
      })}
    </g>
  );
}

// the ball at time t: in someone's hands (held: his key) or loose / in the air (x, y, h yards)
function ballAt(sc, t) {
  const b = sc.ball(t);
  if (!b.held) return b;
  const [x, y] = sc.f[b.held](t);
  return { x, y, h: 1.2, held: b.held };
}
