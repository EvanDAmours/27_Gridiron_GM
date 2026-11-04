// Mobile mode: the same game laid out for phones (compact header, bottom tab bar, a "More"
// sheet for everything else). On for the mobile build (VITE_MOBILE=1, published at
// /27_Gridiron_GM/mobile/) or with ?mobile in the address.
export const MOBILE = import.meta.env?.VITE_MOBILE === "1" || (typeof location !== "undefined" && /[?&]mobile\b/.test(location.search));
export const DESKTOP_URL = "https://evandamours.github.io/27_Gridiron_GM/";
export const MOBILE_SCALE = 1;
export const MOBILE_URL = "https://evandamours.github.io/27_Gridiron_GM/mobile/";

if (MOBILE && typeof document !== "undefined") {
  document.documentElement.classList.add("gm-mobile");
  const s = document.createElement("style");
  s.textContent = `
    html.gm-mobile, html.gm-mobile body { -webkit-text-size-adjust: 100%; overscroll-behavior-y: none; }
    html.gm-mobile button, html.gm-mobile select { touch-action: manipulation; }
    html.gm-mobile input, html.gm-mobile select { font-size: 18px !important; } /* 16px+ once scaled: no zoom on focus (iOS) */
    /* a soft press on every button, so a tap always feels it landed */
    html.gm-mobile button { -webkit-tap-highlight-color: transparent; transition: transform .12s ease, filter .12s ease; }
    html.gm-mobile button:active:not(:disabled) { transform: scale(.97); filter: brightness(1.15); }
    /* screens fade in (opacity only: a transform would unpin the fixed bars inside) */
    @keyframes gmIn { from { opacity: 0 } to { opacity: 1 } }
    html.gm-mobile .gm-sheet { max-height: 86vh; max-height: 86dvh; }
    html.gm-mobile .gm-in { animation: gmIn .22s ease-out; }
    /* readability floor: no text on a phone under 12px (tags drawn at 9-11px for the desktop). Left
       alone: the 8px glyphs inside the little round rookie and count dots, and the depth chart
       field's spot labels (11.25px: the line's spots sit about 36px apart) */
    html.gm-mobile [style*="font-size: 9px"], html.gm-mobile [style*="font-size: 9.5px"], html.gm-mobile [style*="font-size: 10px"], html.gm-mobile [style*="font-size: 10.5px"], html.gm-mobile [style*="font-size: 11px"], html.gm-mobile [style*="font-size: 11.5px"] { font-size: 12px !important; }
    /* white on the bright green and orange buttons reads at 2-3:1: the deeper shades on phones */
    html.gm-mobile [style*="background: rgb(34, 197, 94)"][style*="color: rgb(255, 255, 255)"] { background: #15803d !important; }
    html.gm-mobile [style*="background: rgb(249, 115, 22)"][style*="color: rgb(255, 255, 255)"] { background: #c2410c !important; }
    /* the old slate grey reads at about 4:1 on the dark cards: the lighter grey on phones (dark mode only;
       light mode remaps its own greys) */
    html.gm-mobile:not(.light) [style*="color: rgb(100, 116, 139)"] { color: #94a3b8 !important; }
  `;
  document.head.appendChild(s);
  // Phones draw the game at full size (it used to be 90%, which shrank every label on top of
  // already small type). MOBILE_SCALE stays as one knob for the whole layout.
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute("content", `width=device-width, initial-scale=${MOBILE_SCALE}, viewport-fit=cover`);
}

