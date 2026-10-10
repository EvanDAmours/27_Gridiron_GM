// The Vince Lombardi Trophy on a turntable: polished silver, turning slowly. The trophy is close to
// round, so the turn is carried by what moves across it: the reflections, the football's laces and
// the engraving sweep around the front and disappear behind, and the platter turns underneath.
import React from "react";

const T = 9; // seconds per turn

export default function Lombardi({ size = 120 }) {
  const id = "lmb";
  // a value that sweeps across the front once per turn (left to right), fading in and out at the edges
  const sweep = (from, to) => <animateTransform attributeName="transform" type="translate" values={`${from} 0; ${to} 0`} dur={`${T}s`} repeatCount="indefinite" />;
  const fade = <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.12;.38;.5;1" dur={`${T}s`} repeatCount="indefinite" />;
  return (
    <svg viewBox="0 0 140 260" width={size} height={size * (260 / 140)} role="img" aria-label="Vince Lombardi Trophy" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}col`} x1="0" x2="1">
          <stop offset="0" stopColor="#5b6270" /><stop offset=".18" stopColor="#c5cad3" /><stop offset=".42" stopColor="#f4f6f9" /><stop offset=".6" stopColor="#aab1bc" /><stop offset=".85" stopColor="#6f7683" /><stop offset="1" stopColor="#4a505c" />
        </linearGradient>
        <radialGradient id={`${id}ball`} cx=".38" cy=".32" r=".8">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#dfe3e9" /><stop offset=".7" stopColor="#9aa1ad" /><stop offset="1" stopColor="#5a606c" />
        </radialGradient>
        <linearGradient id={`${id}shine`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}plat`} cx=".5" cy=".4" r=".7">
          <stop offset="0" stopColor="#3a4150" /><stop offset=".8" stopColor="#1b2029" /><stop offset="1" stopColor="#0d1016" />
        </radialGradient>
        <clipPath id={`${id}ballClip`}><ellipse cx="0" cy="0" rx="31" ry="47" /></clipPath>
        <clipPath id={`${id}colClip`}><path d="M54 112 L86 112 L95 232 L45 232 Z" /></clipPath>
      </defs>

      {/* platter: a dark disc turning underneath */}
      <ellipse cx="70" cy="240" rx="62" ry="15" fill="#000" opacity=".35" />
      <ellipse cx="70" cy="236" rx="60" ry="14" fill={`url(#${id}plat)`} stroke="#4b5563" strokeWidth="1" />
      <g transform="translate(70 236) scale(1 .23)">
        <g>
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-30" x2="0" y2="-56" stroke="#6b7280" strokeWidth="1.4" opacity=".55" transform={`rotate(${i * 30})`} />)}
          <animateTransform attributeName="transform" type="rotate" values="0;360" dur={`${T}s`} repeatCount="indefinite" />
        </g>
      </g>
      <ellipse cx="70" cy="233" rx="60" ry="14" fill="none" stroke="#9ca3af" strokeOpacity=".35" strokeWidth="1" />

      {/* the stand: a tapered column with concave sides */}
      <path d="M54 112 L86 112 L95 232 L45 232 Z" fill={`url(#${id}col)`} />
      <g clipPath={`url(#${id}colClip)`}>
        <rect x="-30" y="100" width="22" height="140" fill={`url(#${id}shine)`} opacity=".7">{sweep(0, 190)}</rect>
        {/* the engraving comes round the front */}
        <g opacity="0">
          {fade}
          <g>
            {sweep(-38, 38)}
            <text x="70" y="150" textAnchor="middle" fontSize="6.2" fontFamily="Georgia, serif" fill="#4b5260" letterSpacing=".5">VINCE LOMBARDI</text>
            <text x="70" y="158" textAnchor="middle" fontSize="6.2" fontFamily="Georgia, serif" fill="#4b5260" letterSpacing=".5">TROPHY</text>
            <path d="M62 168 L78 168 L78 182 Q70 190 62 182 Z" fill="none" stroke="#4b5260" strokeWidth="1.2" />
            <text x="70" y="182" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="Arial, sans-serif" fill="#4b5260">NFL</text>
          </g>
        </g>
      </g>
      <path d="M50 112 L90 112 L88 118 L52 118 Z" fill="#8e95a1" />

      {/* the football, tipped up in kicking position */}
      <g transform="translate(70 66) rotate(-22)">
        <ellipse cx="0" cy="0" rx="31" ry="47" fill={`url(#${id}ball)`} />
        <g clipPath={`url(#${id}ballClip)`}>
          <rect x="-70" y="-60" width="18" height="120" fill={`url(#${id}shine)`} opacity=".75">{sweep(0, 140)}</rect>
          {/* seam and laces sweep round the front */}
          <g opacity="0">
            {fade}
            <g>
              {sweep(-26, 26)}
              <path d="M0 -42 Q4 0 0 42" stroke="#7d8492" strokeWidth="1.4" fill="none" />
              {[-18, -11, -4, 3, 10, 17].map((y) => <line key={y} x1="-4.5" y1={y} x2="5.5" y2={y} stroke="#eef1f5" strokeWidth="2.2" strokeLinecap="round" />)}
            </g>
          </g>
        </g>
        <ellipse cx="0" cy="0" rx="31" ry="47" fill="none" stroke="#5a606c" strokeOpacity=".5" />
      </g>
    </svg>
  );
}
