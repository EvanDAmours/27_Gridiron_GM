// A player's render (src/playerArt.js) at a given width, or `fallback` while it loads and for a
// team without art yet.
import React, { useEffect, useState } from "react";
import { loadArt, artFor, renderArt } from "./playerArt.js";

export function usePlayerArt(p, ab) {
  const [src, setSrc] = useState(null);
  const look = `${ab}|${p?.name}|${p?.num}|${p?.pos}|${p?.face?.espn ?? p?.face?.pid ?? p?.face?.sk ?? ""}`;
  useEffect(() => {
    let live = true; setSrc(null);
    loadArt().then((m) => { const a = artFor(p, ab, m); return a && renderArt(a, m); }).then((u) => { if (live && u) setSrc(u); });
    return () => { live = false; };
  }, [look]); // eslint-disable-line react-hooks/exhaustive-deps
  return src;
}

// width: px; the picture is 3:4 (helmet to mid-thigh). crop: the share of its height to show.
export default function PlayerArt({ p, ab, width, crop = 1, fallback = null, style }) {
  const src = usePlayerArt(p, ab);
  if (!src) return fallback;
  return (
    <div style={{ width, height: Math.round(width * (4 / 3) * crop), overflow: "hidden", flexShrink: 0, ...style }}>
      <img src={src} alt={p.name} draggable="false" style={{ width, height: Math.round(width * 4 / 3), display: "block", animation: "artIn .45s ease-out" }} />
      <style>{"@keyframes artIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"}</style>
    </div>
  );
}
