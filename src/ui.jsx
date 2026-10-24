// Shared look: colors, badges, buttons and faces used across the app.
import React from "react";
import { createPortal } from "react-dom";

export { Face } from "./Face.jsx";
// The one close button every popup uses: round, top-right, same size everywhere. The popup's box
// needs position: relative.
// Phones: popups slide up from the bottom as a sheet (drag the grip down to close).
export const sheetWrap=(m)=>m?{alignItems:"flex-end",justifyContent:"stretch",padding:0}:{};
export const sheetBox=(m)=>m?{width:"100%",maxWidth:"none",borderRadius:"18px 18px 0 0",maxHeight:"92vh",paddingBottom:"calc(16px + env(safe-area-inset-bottom))",animation:"sheetUp .22s ease-out",borderBottom:0}:{};
export function SheetGrip({onClose}){const st=React.useRef(null);return<div onTouchStart={e=>{st.current=e.touches[0].clientY;}} onTouchEnd={e=>{const y=e.changedTouches[0].clientY;if(st.current!=null&&y-st.current>70)onClose();st.current=null;}} style={{display:"flex",justifyContent:"center",padding:"2px 0 10px",margin:"-6px 0 0",touchAction:"none"}} aria-hidden="true"><span style={{width:44,height:5,borderRadius:3,background:"#ffffff40"}}/></div>;}
export const CloseX=({onClick,label="Close",style:st})=><button onClick={onClick} aria-label={label} title={label} style={{position:"absolute",top:10,right:10,zIndex:5,width:36,height:36,borderRadius:18,background:"#000a",color:"#fff",border:"1px solid #ffffff33",fontSize:18,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",...(st||{})}}>✕</button>;
// Phone primitives (mobile redo). Sheet: a bottom sheet over everything, tap outside or drag the
// grip down to close. Row: one line, label left, a short value right, tap for more. Segments: a
// pill switch between a few views.
export function Sheet({ title, onClose, children }) {
  // drawn at the top of the page, so a sheet opened inside a sticky or stacked block still sits over everything.
  // The grip, title and close button stay put and only the body scrolls, and the sheet is sized to
  // the screen you can actually see (dvh: not the space under a phone browser's address bar), so
  // the ✕ is always in reach.
  return createPortal(
    <div className="keep-dark" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 450, background: "#000000a6", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", fontFamily: C.f, ...sheetWrap(true) }}>
      <div role="dialog" aria-label={title} className="gm-sheet" onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "#0d1424", border: `1px solid ${C.bd}`, color: C.tx, padding: "14px 0 0", display: "flex", flexDirection: "column", overflow: "hidden", ...sheetBox(true), maxHeight: undefined }}>
        <div style={{ flexShrink: 0, padding: "0 14px" }}>
          <SheetGrip onClose={onClose} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 20, fontWeight: 900, padding: "0 2px" }}>{title}</div>
            <CloseX onClick={onClose} style={{ position: "static", width: 40, height: 40, borderRadius: 20, flexShrink: 0 }} />
          </div>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", padding: "0 14px" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
export function Row({ label, value, tone, onClick, first, tour }) {
  return (
    <button onClick={onClick} data-tour={tour} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 52, textAlign: "left", background: "transparent", border: 0, borderTop: first ? 0 : "1px solid #ffffff14", padding: "0 4px", color: "#fff", cursor: "pointer" }}>
      <span style={{ fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: tone || "#94a3b8", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      <span style={{ fontSize: 20, color: "#64748b", lineHeight: 1 }}>›</span>
    </button>
  );
}
export function Segments({ items, value, onChange }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "#ffffff0f", marginBottom: 12 }}>
      {items.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} style={{ flex: 1, minHeight: 38, borderRadius: 8, border: 0, background: value === k ? "linear-gradient(180deg, #ffffff2b, #ffffff1a)" : "transparent", boxShadow: value === k ? "0 1px 3px #0007, inset 0 1px 0 #ffffff1f" : "none", color: value === k ? "#fff" : "#94a3b8", fontSize: 15, fontWeight: 800, cursor: "pointer", transition: "background .18s, color .18s" }}>{l}</button>)}
    </div>
  );
}
// The phone look (Home's): a full-width hero in the club's colors with one big headline, then big
// section titles over soft cards. Hero: eyebrow, title, a line under it, an optional right side and
// anything below (a button). Section: a title with an optional link on the right.
export function Hero({ clr = "#1e3a8a", eyebrow, title, sub, right, children, compact, logo }) {
  return (
    <div className="keep-dark" style={{ position: "relative", overflow: "hidden", margin: "-6px -8px 0", padding: compact ? "14px 16px 12px" : "22px 16px 20px", color: "#fff", background: `linear-gradient(180deg, transparent 45%, ${C.bg} 100%), radial-gradient(120% 100% at 0% 0%, ${clr}cc, ${clr}22 70%)` }}>
      {/* the club's mark, big and faint behind the headline */}
      {logo && <span aria-hidden="true" style={{ position: "absolute", right: -28, top: -18, opacity: 0.07, pointerEvents: "none", transform: "rotate(-8deg)", filter: "grayscale(1) brightness(4)" }}><TeamLogo t={logo} sz={compact ? 150 : 190} /></span>}
      {eyebrow && <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: "#ffffffb3" }}>{eyebrow}</div>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: compact ? 24 : 30, fontWeight: 900, lineHeight: 1.05, letterSpacing: -0.5, position: "relative" }}>{title}</div>
          {sub && <div style={{ fontSize: 15, color: "#ffffffb3", marginTop: 6 }}>{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
export function Section({ title, action, onAction, children, style }) {
  return (
    <div style={{ marginTop: 26, ...(style || {}) }}>
      <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10, padding: "0 2px" }}>
        <span style={{ fontSize: 20, fontWeight: 900 }}>{title}</span>
        {action && <button onClick={onAction} style={{ marginLeft: "auto", background: "transparent", border: 0, color: "#7dd3fc", fontSize: 15, fontWeight: 700, cursor: "pointer", padding: "6px 0" }}>{action}</button>}
      </div>
      {children}
    </div>
  );
}
// a strip of choices you swipe sideways (positions, filters): one is on
export function Chips({ items, value, onChange }) {
  return (
    <div className="pill-row" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -8px", padding: "0 8px 2px", scrollbarWidth: "none" }}>
      {items.map(([k, l]) => <button key={k} onClick={() => onChange(k)} style={{ flexShrink: 0, minHeight: 38, borderRadius: 999, border: 0, padding: "0 16px", background: value === k ? "#fff" : "#ffffff12", color: value === k ? "#0b1220" : "#cbd5e1", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{l}</button>)}
    </div>
  );
}
// Line icons for the phone chrome (tab bar, header): one stroke weight, so nothing looks like an emoji.
const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M10 20v-6h4v6",
  roster: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6",
  scout: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21",
  camp: "M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11",
  standings: "M4 20V11M10 20V4M16 20v-7M22 20H2",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4.5a3.5 3.5 0 0 0 3.5 4M16 6h3.5A3.5 3.5 0 0 1 16 10M12 13v4M8 20h8M9.5 17h5",
  pen: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  more: "M4 7h16M4 12h16M4 17h16",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  box: "M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2M8.5 12h7M8.5 16h5",
  forward: "M4 6l7 6-7 6zM12 6l7 6-7 6z",
  play: "M7 6v12M11 6v12M15 8.5l5 3.5-5 3.5z",
  camera: "M4 8h3l2-2h6l2 2h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
};
export const Icon = ({ k, size = 24, color = "currentColor", w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[k] || ICONS.more} /></svg>
);
export const C={bg:"#080c14",cd:"#111827",bd:"#1e293b",tx:"#e0e6f0",mt:"#64748b",gn:"#22c55e",bl:"#3b82f6",gd:"#eab308",rd:"#ef4444",f:"'Segoe UI',system-ui,sans-serif"};
export const oC=o=>o>=80?"#22c55e":o>=68?"#84cc16":o>=55?"#eab308":o>=42?"#f97316":"#ef4444";
export const pC=p=>({QB:"#e74c3c",RB:"#3498db",WR:"#f39c12",TE:"#9b59b6",LT:"#1abc9c",LG:"#17a589",C:"#0e8c73",RG:"#17a589",RT:"#1abc9c",DL:"#e67e22",EDGE:"#d35400",DT:"#e67e22",LB:"#2ecc71",CB:"#e91e63",S:"#00bcd4",K:"#795548",P:"#8d6e63"}[p]||"#999");
export const PA_LABELS={coffin:"Coffin Corner",armStr:"Arm Str",accuracy:"Accuracy",pocketAwr:"Pocket",decisions:"Decisions",mobility:"Mobility",touch:"Touch",readDef:"Read Def",vision:"Vision",elusiveness:"Elusive",breakTkl:"Break Tkl",passBlock:"Pass Blk",receiving:"Receiving",burst:"Burst",balance:"Balance",stiffArm:"Stiff Arm",routeRun:"Route Run",catching:"Catching",separation:"Separate",release:"Release",bodyCtrl:"Body Ctrl",yac:"YAC",deepSpd:"Deep Spd",catchTraffic:"Traffic",blocking:"Blocking",redZone:"Red Zone",seaming:"Seaming",toughness:"Toughness",footwork:"Footwork",anchor:"Anchor",awareness:"Awareness",handUse:"Hand Use",reach:"Reach",agility:"Agility",runBlock:"Run Blk",pulling:"Pulling",strength:"Strength",drive:"Drive",snapping:"Snapping",leadership:"Leadrshp",athleticism:"Athletic",power:"Power",passRush:"Pass Rush",runStop:"Run Stop",motor:"Motor",getOff:"Get Off",bullRush:"Bull Rush",swim:"Swim",spin:"Spin",tackling:"Tackling",coverage:"Coverage",blitzing:"Blitzing",runFit:"Run Fit",instincts:"Instinct",pursuit:"Pursuit",shedBlock:"Shed Blk",zoneAwr:"Zone Awr",manCov:"Man Cov",zoneCov:"Zone Cov",press:"Press",ballSkills:"Ball Sklls",recovery:"Recovery",playRec:"Play Rec",range:"Range",runSupport:"Run Supp",ballHawk:"Ball Hawk",comms:"Comms",versatility:"Versatile",legStr:"Leg Str",clutch:"Clutch",distance:"Distance",hangTime:"Hang Time",consistency:"Consist",coldWx:"Cold Wx",pressure:"Pressure"};
export const Bdg=({pos})=><span style={{background:pC(pos),color:"#fff",padding:"1px 5px",borderRadius:3,fontSize:11,fontWeight:800}}>{pos}</span>;
export const Btn=({children,onClick,disabled,bg,c:co,style:st})=><button onClick={onClick} disabled={disabled} style={{background:bg||C.bl,color:co||"#fff",border:"none",padding:"4px 10px",borderRadius:4,fontWeight:700,fontSize:13,cursor:disabled?"default":"pointer",opacity:disabled?.5:1,...(st||{})}}>{children}</button>;
export const PN=({p,setSel,style:st})=><span onClick={e=>{e.stopPropagation();setSel(p);}} style={{cursor:"pointer",fontWeight:600,textDecoration:"none",...(st||{})}} onMouseOver={e=>e.target.style.textDecoration="underline"} onMouseOut={e=>e.target.style.textDecoration="none"}>{p.name}</span>;

// Team logos ship with the game (public/logos, 256px, from ESPN's logo CDN) so they show offline
// too (NFL marks belong to the NFL and its clubs). If one is missing (an expansion club), the
// team's colors and abbreviation stand in.
export const logoUrl = (ab) => `${import.meta.env.BASE_URL}logos/${String(ab || "").toUpperCase()}.png`;
// glow: a thin light outline so dark logos (Giants, Bears, Texans) read on dark or team-color
// backgrounds without sitting on a white tile.
const GLOW = "drop-shadow(0 0 1px #ffffffd9) drop-shadow(0 0 1px #ffffffb3) drop-shadow(0 2px 6px #0008)";
export function TeamLogo({ t, sz = 40, glow = false }) {
  const [bad, setBad] = React.useState(false);
  if (!t) return null;
  const box = { width: sz, height: sz, flexShrink: 0, borderRadius: Math.round(sz / 5), display: "inline-flex", alignItems: "center", justifyContent: "center" };
  if (bad) return <span style={{ ...box, background: `linear-gradient(135deg,${t.clr},${t.ac})`, fontWeight: 900, fontSize: Math.max(9, Math.round(sz / 3)), color: "#fff" }}>{t.ab}</span>;
  return <img src={logoUrl(t.ab)} alt={`${t.city || ""} ${t.name || t.ab}`.trim()} title={`${t.city || ""} ${t.name || ""}`.trim()} width={sz} height={sz} loading="lazy" onError={() => setBad(true)} style={{ ...box, objectFit: "contain", ...(glow ? { filter: GLOW } : {}) }} />;
}

// "Thu, Sep 10 · 8:20 PM ET" from a real schedule's kickoff time (UTC), or "" without one.
export function kickoff(g) {
  if (!g?.date) return "";
  const d = new Date(g.date);
  if (isNaN(d)) return "";
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  // the league hasn't set it yet (late-season flex games come through as midnight)
  if (time === "12:00 AM") return `${day} · time TBD`;
  return `${day} · ${time} ET`;
}

// A "⋯" button that opens a small menu of rarer, riskier actions (Fire...), each asking first.
// items: [{ label, onClick, confirm?, danger? }]
export function OverflowMenu({ items, label = "More actions" }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen((o) => !o)} aria-label={label} title={label} style={{ background: open ? C.bd : "transparent", border: `1px solid ${C.bd}`, color: "#cbd5e1", borderRadius: 6, padding: "2px 8px", fontSize: 15, fontWeight: 900, cursor: "pointer", lineHeight: 1.2 }}>⋯</button>
      {open && <>
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 51, background: "#0d1424", border: "1px solid #334155", borderRadius: 10, padding: 4, minWidth: 170, boxShadow: "0 14px 34px #000c" }}>
          {items.map((it) => (
            <button key={it.label} onMouseEnter={(e) => { e.currentTarget.style.background = "#1e293b"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }} onClick={() => { setOpen(false); if (!it.confirm || window.confirm(it.confirm)) it.onClick(); }} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, color: it.danger ? "#fca5a5" : "#e2e8f0", fontSize: 14, fontWeight: 700, padding: "8px 10px", borderRadius: 6, cursor: "pointer" }}>{it.label}</button>
          ))}
        </div>
      </>}
    </span>
  );
}
