// The Lombardi Trophy in pixels, the arcade's Super Bowl sprite: the trophy ceremony on the field
// (retro.js) and the Super Bowl at the heart of Easy Mode's playoff tree (EasyShell.jsx). On its own
// so a screen can draw it without pulling in the field. A silver football on a tapered stand, standing
// on (x, y) bottom-centre; u is the size of one unit in pixels.
export function drawLombardi(ctx, x, y, u) {
  const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + dx * u), Math.round(y - dy * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
  R(-3, 2, 6, 2, "#2b2f36"); R(-3, 2, 6, 0.5, "#9aa3ad"); // the base
  for (let i = 0; i < 6; i++) { const w = 3.2 - i * 0.35; R(-w / 2, 3 + i, w, 1.05, i % 2 ? "#cfd5dc" : "#e5e9ee"); } // the stand, tapering up
  R(-0.3, 8.6, 0.6, 1.2, "#f8fafc");
  // the ball, tipped back, with its laces
  ctx.save(); ctx.translate(Math.round(x + 0.4 * u), Math.round(y - 10.6 * u)); ctx.rotate(-0.55);
  ctx.fillStyle = "#c7cdd4"; ctx.beginPath(); ctx.ellipse(0, 0, 2.6 * u, 1.6 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#eef2f6"; ctx.beginPath(); ctx.ellipse(-0.5 * u, -0.5 * u, 1.6 * u, 0.7 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8a939e"; ctx.fillRect(Math.round(-1.2 * u), Math.round(-0.15 * u), Math.round(2.4 * u), Math.max(1, Math.round(0.3 * u)));
  for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(i * 0.7 * u - 0.1 * u), Math.round(-0.45 * u), Math.max(1, Math.round(0.25 * u)), Math.max(1, Math.round(0.9 * u)));
  ctx.restore();
  // a glint that comes and goes
  const g = (performance.now() / 600) % 3; if (g < 0.5) { ctx.fillStyle = "rgba(255,255,255,.9)"; const a = g * 2; ctx.fillRect(Math.round(x - 1.2 * u), Math.round(y - (11.5 + a) * u), Math.max(1, Math.round(0.5 * u)), Math.max(1, Math.round(0.5 * u))); }
}
