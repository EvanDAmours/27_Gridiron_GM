// Shared look: colors, badges, buttons and faces used across the app.
import React from "react";

export { Face } from "./Face.jsx";
// The one close button every popup uses: round, top-right, same size everywhere. The popup's box
// needs position: relative.
// Phones: popups slide up from the bottom as a sheet (drag the grip down to close).
export const sheetWrap=(m)=>m?{alignItems:"flex-end",justifyContent:"stretch",padding:0}:{};
export const sheetBox=(m)=>m?{width:"100%",maxWidth:"none",borderRadius:"18px 18px 0 0",maxHeight:"92vh",paddingBottom:"calc(16px + env(safe-area-inset-bottom))",animation:"sheetUp .22s ease-out",borderBottom:0}:{};
export function SheetGrip({onClose}){const st=React.useRef(null);return<div onTouchStart={e=>{st.current=e.touches[0].clientY;}} onTouchEnd={e=>{const y=e.changedTouches[0].clientY;if(st.current!=null&&y-st.current>70)onClose();st.current=null;}} style={{display:"flex",justifyContent:"center",padding:"2px 0 10px",margin:"-6px 0 0",touchAction:"none"}} aria-hidden="true"><span style={{width:44,height:5,borderRadius:3,background:"#ffffff40"}}/></div>;}
export const CloseX=({onClick,label="Close",style:st})=><button onClick={onClick} aria-label={label} title={label} style={{position:"absolute",top:10,right:10,zIndex:5,width:36,height:36,borderRadius:18,background:"#000a",color:"#fff",border:"1px solid #ffffff33",fontSize:18,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",...(st||{})}}>✕</button>;
export const C={bg:"#080c14",cd:"#111827",bd:"#1e293b",tx:"#e0e6f0",mt:"#64748b",gn:"#22c55e",bl:"#3b82f6",gd:"#eab308",rd:"#ef4444",f:"'Segoe UI',system-ui,sans-serif"};
export const oC=o=>o>=80?"#22c55e":o>=68?"#84cc16":o>=55?"#eab308":o>=42?"#f97316":"#ef4444";
export const pC=p=>({QB:"#e74c3c",RB:"#3498db",WR:"#f39c12",TE:"#9b59b6",LT:"#1abc9c",LG:"#17a589",C:"#0e8c73",RG:"#17a589",RT:"#1abc9c",DL:"#e67e22",EDGE:"#d35400",DT:"#e67e22",LB:"#2ecc71",CB:"#e91e63",S:"#00bcd4",K:"#795548",P:"#8d6e63"}[p]||"#999");
export const PA_LABELS={coffin:"Coffin Corner",armStr:"Arm Str",accuracy:"Accuracy",pocketAwr:"Pocket",decisions:"Decisions",mobility:"Mobility",touch:"Touch",readDef:"Read Def",vision:"Vision",elusiveness:"Elusive",breakTkl:"Break Tkl",passBlock:"Pass Blk",receiving:"Receiving",burst:"Burst",balance:"Balance",stiffArm:"Stiff Arm",routeRun:"Route Run",catching:"Catching",separation:"Separate",release:"Release",bodyCtrl:"Body Ctrl",yac:"YAC",deepSpd:"Deep Spd",catchTraffic:"Traffic",blocking:"Blocking",redZone:"Red Zone",seaming:"Seaming",toughness:"Toughness",footwork:"Footwork",anchor:"Anchor",awareness:"Awareness",handUse:"Hand Use",reach:"Reach",agility:"Agility",runBlock:"Run Blk",pulling:"Pulling",strength:"Strength",drive:"Drive",snapping:"Snapping",leadership:"Leadrshp",athleticism:"Athletic",power:"Power",passRush:"Pass Rush",runStop:"Run Stop",motor:"Motor",getOff:"Get Off",bullRush:"Bull Rush",swim:"Swim",spin:"Spin",tackling:"Tackling",coverage:"Coverage",blitzing:"Blitzing",runFit:"Run Fit",instincts:"Instinct",pursuit:"Pursuit",shedBlock:"Shed Blk",zoneAwr:"Zone Awr",manCov:"Man Cov",zoneCov:"Zone Cov",press:"Press",ballSkills:"Ball Sklls",recovery:"Recovery",playRec:"Play Rec",range:"Range",runSupport:"Run Supp",ballHawk:"Ball Hawk",comms:"Comms",versatility:"Versatile",legStr:"Leg Str",clutch:"Clutch",distance:"Distance",hangTime:"Hang Time",consistency:"Consist",coldWx:"Cold Wx",pressure:"Pressure"};
export const Bdg=({pos})=><span style={{background:pC(pos),color:"#fff",padding:"1px 5px",borderRadius:3,fontSize:11,fontWeight:800}}>{pos}</span>;
export const Btn=({children,onClick,disabled,bg,c:co,style:st})=><button onClick={onClick} disabled={disabled} style={{background:bg||C.bl,color:co||"#fff",border:"none",padding:"4px 10px",borderRadius:4,fontWeight:700,fontSize:13,cursor:disabled?"default":"pointer",opacity:disabled?.5:1,...(st||{})}}>{children}</button>;
export const PN=({p,setSel,style:st})=><span onClick={e=>{e.stopPropagation();setSel(p);}} style={{cursor:"pointer",fontWeight:600,textDecoration:"none",...(st||{})}} onMouseOver={e=>e.target.style.textDecoration="underline"} onMouseOut={e=>e.target.style.textDecoration="none"}>{p.name}</span>;

// Team logos, loaded from ESPN's public logo CDN (NFL marks belong to the NFL and its clubs).
// If a logo can't load, the team's colors and abbreviation stand in.
const ESPN_AB = { WAS: "wsh" };
export const logoUrl = (ab) => `https://a.espncdn.com/i/teamlogos/nfl/500/${ESPN_AB[ab] || String(ab || "").toLowerCase()}.png`;
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
