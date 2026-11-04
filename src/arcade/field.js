// Drawing the arcade field on a canvas. The offense always drives up the screen. px/yd comes from
// the canvas width (the whole width of the field fits), the camera follows the ball up the field.
import { HALF } from "./play.js";

export function makeCamera(W, H) {
  const s = (W - 6) / 53.3;
  return { W, H, s, cx: W / 2, camX: 50, toScreen(x, y) { return [this.cx + y * s, H * 0.62 - (x - this.camX) * s]; }, toField(px, py) { return { x: this.camX + (H * 0.62 - py) / s, y: (px - this.cx) / s }; } };
}

const NUM = ["10", "20", "30", "40", "50", "40", "30", "20", "10"];

export function drawField(ctx, cam, S, teams, opts = {}) {
  const { W, H, s } = cam;
  ctx.clearRect(0, 0, W, H);
  // grass, light and dark every five yards
  const yTop = cam.toScreen(110, 0)[1], yBot = cam.toScreen(-10, 0)[1];
  ctx.fillStyle = "#2f7d3a"; ctx.fillRect(0, 0, W, H);
  for (let yd = -10; yd < 110; yd += 5) {
    const [, y1] = cam.toScreen(yd + 5, 0), [, y0] = cam.toScreen(yd, 0);
    if (y0 < -s * 5 || y1 > H + s * 5) continue;
    ctx.fillStyle = yd < 0 || yd >= 100 ? (yd < 0 ? teams.user.clr : teams.opp.clr) : ((yd / 5) % 2 ? "#2f7d3a" : "#33873f");
    ctx.fillRect(0, y1, W, y0 - y1);
  }
  // sidelines and yard lines
  const xL = cam.toScreen(0, -HALF)[0], xR = cam.toScreen(0, HALF)[0];
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = Math.max(1, s * 0.25);
  for (let yd = 0; yd <= 100; yd += 5) { const [, y] = cam.toScreen(yd, 0); if (y < -4 || y > H + 4) continue; ctx.beginPath(); ctx.moveTo(xL, y); ctx.lineTo(xR, y); ctx.stroke(); }
  ctx.lineWidth = Math.max(1.5, s * 0.35); ctx.beginPath(); ctx.moveTo(xL, Math.max(0, yTop)); ctx.lineTo(xL, Math.min(H, yBot)); ctx.moveTo(xR, Math.max(0, yTop)); ctx.lineTo(xR, Math.min(H, yBot)); ctx.stroke();
  // hashes
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1;
  for (let yd = 1; yd < 100; yd++) { if (yd % 5 === 0) continue; const [, y] = cam.toScreen(yd, 0); if (y < 0 || y > H) continue; for (const h of [-10, 10, -HALF + 0.8, HALF - 0.8]) { const [x] = cam.toScreen(0, h); ctx.beginPath(); ctx.moveTo(x - s * 0.4, y); ctx.lineTo(x + s * 0.4, y); ctx.stroke(); } }
  // numbers
  ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = `bold ${Math.round(s * 2.4)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  NUM.forEach((n, i) => { const yd = 10 + i * 10, [, y] = cam.toScreen(yd, 0); if (y < -20 || y > H + 20) return; for (const side of [-1, 1]) { const [x] = cam.toScreen(0, side * 19); ctx.save(); ctx.translate(x, y); ctx.rotate(side > 0 ? Math.PI / 2 : -Math.PI / 2); ctx.fillText(n, 0, 0); ctx.restore(); } });
  // end zone names
  ctx.font = `bold ${Math.round(s * 4)}px system-ui, sans-serif`; ctx.fillStyle = "rgba(255,255,255,.9)";
  for (const [yd, t, rot] of [[-5, teams.user, 0], [105, teams.opp, Math.PI]]) { const [x, y] = cam.toScreen(yd, 0); if (y < -40 || y > H + 40) continue; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillText((t.name || "").toUpperCase(), 0, 0); ctx.restore(); }
  if (!S) return;
  // line of scrimmage and the line to gain
  const line = (yd, color) => { const [, y] = cam.toScreen(yd, 0); if (y < 0 || y > H) return; ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s * 0.3); ctx.beginPath(); ctx.moveTo(xL, y); ctx.lineTo(xR, y); ctx.stroke(); };
  line(S.los, "rgba(40,90,255,.75)"); if (S.firstDown < 100) line(S.firstDown, "rgba(255,230,0,.85)");
  // the aim: a reticle where the ball will come down and a dotted line from the quarterback
  if (S.aim && S.phase === "live" && S.ball.holder === "QB") {
    const [ax, ay] = cam.toScreen(S.aim.x, S.aim.y), [qx, qy] = cam.toScreen(S.ents.QB.x, S.ents.QB.y);
    ctx.setLineDash([s * 0.5, s * 0.5]); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, s * 1.6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(ax, ay, s * 0.3, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  }
  // players: offense in the user's colors, defense in the opponent's; the carrier ringed
  const ents = Object.values(S.ents).sort((a, b) => b.x - a.x);
  const r = s * 0.95;
  for (const e of ents) {
    const [x, y] = cam.toScreen(e.x, e.y); if (y < -r * 2 || y > H + r * 2) continue;
    const t = e.side === "off" ? teams.user : teams.opp;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 0.9, r * 0.45, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = t.clr; ctx.fill(); ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.strokeStyle = t.ac; ctx.stroke();
    if (S.ball.holder === e.key) { ctx.beginPath(); ctx.arc(x, y, r * 1.45, 0, Math.PI * 2); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
    if (opts.eligible && e.side === "off" && ["X", "Z", "SLOT", "TE", "RB"].includes(e.key) && S.phase === "live") { ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(r * 1.05)}px system-ui, sans-serif`; ctx.fillText(String(e.p.num ?? ""), x, y + 0.5);
  }
  // the ball, lifted on its arc with a shadow underneath
  const b = S.ball; if (b.holder == null || S.phase === "ball") {
    const [bx, by] = cam.toScreen(b.x, b.y), lift = (b.h || 0) * s * 1.2;
    ctx.beginPath(); ctx.ellipse(bx, by, s * 0.45, s * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx, by - lift, s * 0.55 * (1 + (b.h || 0) * 0.08), s * 0.32 * (1 + (b.h || 0) * 0.08), 0, 0, Math.PI * 2); ctx.fillStyle = "#8b4a1c"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
  }
}
