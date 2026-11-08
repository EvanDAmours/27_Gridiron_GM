// The drone shot before kickoff: a filmed pixel-art flyover of the home club's stadium (flyovers.js
// lists the stadiums that have one; nobody else gets a flyover), the clip for the day's weather. It
// holds a beat on the wide shot, pushes in toward the field, and cuts into the game before the
// close-up lingers. A broadcast lower third in the arcade's own pixel font says where we are and
// who's playing. A tap (or any key) skips it. It covers the screen from the very first frame, so
// the field never shows before it.
import React, { useEffect, useRef, useState } from "react";
import { STADIUMS } from "./stadiumData.js";
import { flyoverClip } from "./flyovers.js";
import { pixText, pixShadow, pixWidth } from "./arcade/pixfont.js";

const HOLD = 900, RATE = 1, CUT = 2.25, FADE = 280; // ms on the wide shot; clip speed; seconds of the clip shown; ms of the cut to the game
const LEN = HOLD + (CUT * 1000) / RATE + FADE;

// the lower third, drawn the way the arcade draws its banners: a dark box, the club's colour down the
// left edge, "LIVE FROM" in gold, the stadium big, the matchup under it (whole pixels, no smoothing)
function PixelBanner({ top, name, matchup, clr, show }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const draw = () => {
      const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(3, window.devicePixelRatio || 1), u = Math.max(2, Math.round(Math.min(W / 380, H / 215)));
      const big = Math.max(2, Math.round(u * 1.5)), small = Math.max(1, Math.round(u * 0.8)), pad = u * 6;
      const lines = [[top, small, "#ffd166"], [name, big, "#ffffff"], [matchup, small, "#cbd5e1"]].filter((l) => l[0]);
      const w = Math.min(W - u * 4, Math.max(...lines.map(([t, p]) => pixWidth(t, p))) + pad * 2), h = u * 4 + lines.reduce((a, [, p]) => a + p * 7 + u * 3, 0);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = `${w}px`; cv.style.height = `${h}px`;
      const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "rgba(6,8,14,.92)"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = clr || "#334155"; ctx.fillRect(0, 0, Math.max(3, u * 1.5), h);
      ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.fillRect(0, 0, w, Math.max(1, Math.round(u / 2)));
      let y = u * 3;
      for (const [t, p, c] of lines) { (p === big ? pixShadow : pixText)(ctx, t, w / 2 + u, y, p, c, "center"); y += p * 7 + u * 3; }
    };
    draw(); window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [top, name, matchup, clr]);
  // it steps up into place a few pixels at a time, the way the arcade's banners arrive
  return <canvas ref={ref} aria-hidden style={{ display: "block", margin: "0 auto", imageRendering: "pixelated", transform: show ? "none" : "translateY(140%)", opacity: show ? 1 : 0, transition: "transform .32s steps(5), opacity .1s" }} />;
}
function SkipTag() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const u = Math.max(1, Math.round(Math.min(window.innerWidth / 380, window.innerHeight / 215) * 0.8)), dpr = Math.min(3, window.devicePixelRatio || 1), t = "TAP TO SKIP", w = pixWidth(t, u) + 2 * u, h = 9 * u;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = `${w}px`; cv.style.height = `${h}px`;
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); pixShadow(ctx, t, u, u, u, "rgba(255,255,255,.75)");
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", right: 12, bottom: 10, imageRendering: "pixelated" }} />;
}

export default function StadiumFlyover({ home, away, night = false, label, wx, onDone }) {
  const src = flyoverClip(home?.ab, wx);
  const done = useRef(false), vid = useRef(null), [go, setGo] = useState(false), [leaving, setLeaving] = useState(false);
  const finish = () => { if (!done.current) { done.current = true; onDone?.(); } };
  useEffect(() => { if (!src) finish(); }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => setGo(true), 1500); return () => clearTimeout(t); }, []); // (a slow connection: don't wait for ever)
  useEffect(() => {
    if (!go) return;
    const p = setTimeout(() => { const v = vid.current; if (v) { v.playbackRate = RATE; v.play?.()?.catch?.(() => {}); } }, HOLD);
    const l = setTimeout(() => setLeaving(true), LEN - FADE), t = setTimeout(finish, LEN), key = () => finish();
    window.addEventListener("keydown", key);
    return () => { clearTimeout(p); clearTimeout(l); clearTimeout(t); window.removeEventListener("keydown", key); };
  }, [go]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!src) return null;
  const st = STADIUMS[home?.ab], matchup = away && home ? `${away.name || away.ab || ""} AT ${home.name || home.ab || ""}` : null;
  return (
    <div onClick={finish} role="presentation" style={{ position: "fixed", inset: 0, zIndex: 9600, background: "#0b0e14", overflow: "hidden", cursor: "pointer", opacity: leaving ? 0 : 1, transition: `opacity ${FADE}ms ease-in` }}>
      <video ref={vid} muted playsInline preload="auto" onCanPlay={() => setGo(true)} onError={() => setGo(true)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated", opacity: go ? 1 : 0, transition: "opacity .3s", filter: night ? "brightness(.5) saturate(.85) contrast(1.08)" : "none" }}>
        <source src={import.meta.env.BASE_URL + src + ".webm"} type="video/webm" /><source src={import.meta.env.BASE_URL + src + ".mp4"} type="video/mp4" />
      </video>
      {night && <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0a1240aa, #0a124033 45%, #0a124055)", pointerEvents: "none" }} />}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: "8%", pointerEvents: "none" }}>
        <PixelBanner top={label || "LIVE FROM"} name={st?.name || `${home?.city || ""}`} matchup={matchup} clr={home?.clr} show={go && !leaving} />
      </div>
      <SkipTag />
    </div>
  );
}
