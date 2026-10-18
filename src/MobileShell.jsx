// Phone navigation: a bottom tab bar (Home, Roster, Scouting, whatever the season phase is
// about, More) and a full-screen "More" sheet with every other screen and the settings.
import React from "react";
import { C, CloseX } from "./ui.jsx";

const PHASE_ITEM = {
  preseason: { icon: "🏋️", label: "Camp", tab: "roster", sub: "camp" },
  regular: { icon: "📊", label: "Standings", tab: "standings" },
  playoffs: { icon: "🏆", label: "Playoffs", tab: "playoffs" },
  combine: { icon: "📊", label: "Standings", tab: "standings" },
  resign: { icon: "✍️", label: "Re-sign", tab: "freeagency" },
  freeagency: { icon: "✍️", label: "Free Agency", tab: "freeagency" },
  draft: { icon: "🎯", label: "Draft", tab: "draft" },
};

export function MobileNav({ tab, sp, rosterView, go, onMore, moreOpen }) {
  const ph = PHASE_ITEM[sp] || PHASE_ITEM.regular;
  const items = [
    { icon: "🏠", label: "Home", tab: "dashboard" },
    { icon: "👥", label: "Roster", tab: "depth" }, // opens the depth chart; the roster list is its neighbor tab
    { icon: "🔎", label: "Scouting", tab: "scouting" },
    ph,
  ];
  return (
    <nav aria-label="Main" data-tour="nav" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 400, display: "flex", background: "#0b1220f7", borderTop: `1px solid ${C.bd}`, paddingBottom: "env(safe-area-inset-bottom)", backdropFilter: "blur(8px)" }}>
      {[...items, { icon: "☰", label: "More", more: true }].map((it) => {
        // Roster and Camp share a screen: Camp is lit only on its own view.
        const on = it.more ? moreOpen : !moreOpen && (it.tab === "depth" ? tab === "depth" || (tab === "roster" && rosterView !== "camp") : tab === it.tab && (it.tab !== "roster" || (it.sub === "camp") === (rosterView === "camp")));
        return (
          <button key={it.label} onClick={() => (it.more ? onMore() : go(it.tab, it.sub))} aria-current={on ? "page" : undefined} style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, padding: "8px 2px 7px", color: on ? "#fff" : "#94a3b8", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 20, lineHeight: 1, filter: on ? "none" : "grayscale(0.4)", opacity: on ? 1 : 0.85 }}>{it.icon}</span>
            <span style={{ fontSize: 11, fontWeight: on ? 800 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{it.label}</span>
            <span style={{ width: 18, height: 3, borderRadius: 2, background: on ? C.gn : "transparent" }} />
          </button>
        );
      })}
    </nav>
  );
}

export function MoreSheet({ tabs, labels, tab, go, onClose, actions }) {
  return (
    <div role="dialog" aria-label="More" style={{ position: "fixed", inset: 0, zIndex: 390, background: C.bg, overflowY: "auto", padding: "14px 14px 96px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 900 }}>More</span>
        <CloseX onClick={onClose} style={{ position: "static", marginLeft: "auto" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => go(t)} style={{ textAlign: "left", padding: "14px 12px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", background: tab === t ? `${C.bl}33` : C.cd, color: tab === t ? "#fff" : C.tx, border: `1px solid ${tab === t ? C.bl : C.bd}` }}>{labels[t] || t}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: C.mt, margin: "4px 0 8px" }}>SETTINGS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((a) => (
          <button key={a.label} onClick={a.onClick} style={{ textAlign: "left", padding: "14px 12px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", background: C.cd, color: C.tx, border: `1px solid ${C.bd}` }}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}

// Phones: the week's main action sits right above the tab bar, where your thumb is. Anything else
// (Sim All, Sim to Deadline, draft speed...) is one tap away behind the ▾.
// actions: [{ label, onClick, bg, c, small }], first = the main one; small = a compact pill
// on the left, over names rather than the Offer / Draft buttons down the right edge (for steps
// like Finish Re-signing that shouldn't shout, and for the week's action off the Home screen).
export function MobileActionBar({ actions }) {
  const [open, setOpen] = React.useState(false);
  if (!actions?.length) return null;
  const [main, ...rest] = actions;
  const bar = { position: "fixed", left: 0, right: 0, bottom: "calc(58px + env(safe-area-inset-bottom))", zIndex: 395, padding: "8px 10px 12px", background: "linear-gradient(180deg, #0b122000, #0b1220f2 35%)", display: "flex", gap: 8 };
  return (
    <>
      {open && rest.length > 0 && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 396, background: "#0007" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 10, right: 10, bottom: "calc(120px + env(safe-area-inset-bottom))", background: C.cd, border: `1px solid ${C.bd}`, borderRadius: 14, padding: 8, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 -10px 40px #000a" }}>
            {rest.map((a) => (
              <button key={a.label} onClick={() => { setOpen(false); a.onClick(); }} style={{ minHeight: 48, borderRadius: 10, border: 0, background: a.bg || C.bd, color: a.c || "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>{a.label}</button>
            ))}
          </div>
        </div>
      )}
      <div data-tour="actions" style={main.small ? { ...bar, background: "transparent", pointerEvents: "none" } : bar}>
        <button onClick={main.onClick} style={{ flex: main.small ? "0 0 auto" : 1, marginLeft: 0, padding: main.small ? "0 18px" : 0, minHeight: main.small ? 40 : 48, borderRadius: main.small ? 999 : 12, border: 0, background: main.bg || C.gn, color: main.c || "#fff", fontSize: main.small ? 15 : 17, fontWeight: 900, cursor: "pointer", boxShadow: "0 6px 20px #0008", pointerEvents: "auto" }}>{main.label}</button>
        {rest.length > 0 && <button onClick={() => setOpen((o) => !o)} aria-label="More actions" style={{ pointerEvents: "auto", width: 56, minHeight: 48, borderRadius: 12, border: `1px solid ${C.bd}`, background: open ? C.bl : C.cd, color: "#fff", fontSize: 18, fontWeight: 900, cursor: "pointer" }}>{open ? "✕" : "▾"}</button>}
      </div>
    </>
  );
}

// Phones can't hover, so the explanations that live in `title` (badges, chips, notes) never show.
// A tap on a plain element with a title, or a long-press on anything with one (buttons too), shows
// that text in a small popover by your finger. The next tap or a few seconds closes it.
const INTERACTIVE = "button, a, input, select, textarea, label, [role=button], [onclick]";
export function TapTips() {
  const [tip, setTip] = React.useState(null);
  React.useEffect(() => {
    let timer = 0, hide = 0, start = null, longShown = false;
    const titled = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) if (n.getAttribute?.("title")) return n; return null; };
    const show = (el, x, y) => {
      const text = el.getAttribute("title");
      if (!text) return;
      clearTimeout(hide);
      setTip({ text, x, y });
      hide = setTimeout(() => setTip(null), 4500);
    };
    const down = (e) => {
      const t = e.touches[0]; start = { x: t.clientX, y: t.clientY }; longShown = false;
      setTip(null);
      const el = titled(e.target);
      clearTimeout(timer);
      if (el) timer = setTimeout(() => { longShown = true; show(el, start.x, start.y); }, 450);
    };
    const move = (e) => { const t = e.touches[0]; if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) clearTimeout(timer); };
    const up = (e) => {
      clearTimeout(timer);
      if (longShown) { e.preventDefault(); return; } // the long-press already answered; don't also fire the button
      const el = titled(e.target);
      if (!el || !start) return;
      const ct = e.changedTouches[0];
      if (Math.hypot(ct.clientX - start.x, ct.clientY - start.y) > 10) return;
      // a plain tap explains only things that do nothing else when tapped
      if (e.target.closest(INTERACTIVE) || el.closest(INTERACTIVE)) return;
      show(el, ct.clientX, ct.clientY);
    };
    document.addEventListener("touchstart", down, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", up, { passive: false });
    return () => { clearTimeout(timer); clearTimeout(hide); document.removeEventListener("touchstart", down); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up); };
  }, []);
  if (!tip) return null;
  const w = Math.min(280, window.innerWidth - 24);
  const left = Math.max(12, Math.min(tip.x - w / 2, window.innerWidth - w - 12));
  const above = tip.y > 140;
  return (
    <div role="tooltip" style={{ position: "fixed", zIndex: 2000, left, width: w, ...(above ? { bottom: window.innerHeight - tip.y + 14 } : { top: tip.y + 18 }), background: "#0f172af7", border: `1px solid ${C.bl}`, borderRadius: 10, padding: "9px 12px", color: "#e2e8f0", fontSize: 14, lineHeight: 1.4, fontWeight: 600, boxShadow: "0 10px 30px #000c", pointerEvents: "none", whiteSpace: "pre-line" }}>{tip.text}</div>
  );
}
