import React from "react";

// A club jersey: club colors, the name across the back and the number. Held up on draft night,
// raised to the rafters when a number is retired.
const ROOKIE_NUM = { QB: [1, 19], K: [1, 19], P: [1, 19], RB: [20, 39], WR: [10, 19], TE: [80, 89], LT: [70, 79], LG: [60, 79], C: [50, 79], RG: [60, 79], RT: [70, 79], DL: [90, 99], EDGE: [90, 99], DT: [90, 99], LB: [40, 59], CB: [20, 39], S: [20, 39] };
export const rookieNum = (p) => { if (p.num) return p.num; const [a, b] = ROOKIE_NUM[p.pos] || [20, 49]; let h = 0; for (const c of String(p.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return a + (h % (b - a + 1)); };
export function Jersey({ team, name, num, size = 96 }) {
  const last = String(name || "").split(" ").slice(-1)[0].toUpperCase();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ filter: "drop-shadow(0 8px 14px #000a)" }}>
      <path d="M30 8 L42 4 Q50 12 58 4 L70 8 L92 22 L84 42 L74 36 L74 94 L26 94 L26 36 L16 42 L8 22 Z" fill={team.clr || "#1e3a8a"} stroke={team.ac || "#fff"} strokeWidth="2.5" />
      <path d="M8 22 L16 42 L26 36 L26 30 Z M92 22 L84 42 L74 36 L74 30 Z" fill={team.ac || "#fff"} opacity=".55" />
      <text x="50" y="30" textAnchor="middle" fontSize={last.length > 9 ? 7 : 9} fontWeight="900" fill="#fff" fontFamily="system-ui" letterSpacing=".5">{last}</text>
      <text x="50" y="72" textAnchor="middle" fontSize="36" fontWeight="900" fill="#fff" stroke={team.ac || "#000"} strokeWidth="1.2" fontFamily="'Arial Black', Arial, sans-serif">{num}</text>
    </svg>
  );
}

