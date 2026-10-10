// A club's star in real 3D, standing beside his team's logo on the home screen: sculpted limbs,
// shoulder pads under a fabric jersey with his number, a glossy clearcoat helmet with the team logo,
// a facemask built bar by bar, and his own gear (sleeves, tape, wristbands, gloves, eye black, visor,
// towel, cleats), which comes from his id so it never changes week to week. three.js loads only when
// this mounts, lit by a studio environment with a rim light in the team's accent color.
import React, { useEffect, useRef } from "react";
import { gearFor, jerseyNum } from "./PlayerFigure.jsx";
import { logoUrl } from "./ui.jsx";

const BIG = new Set(["LT", "LG", "C", "RG", "RT", "DL", "DT", "DE"]);
const SKILL = new Set(["WR", "CB", "S", "RB", "FS", "SS"]);
const lum = (hex) => { const n = parseInt((hex || "#888").replace("#", "").padEnd(6, "0").slice(0, 6), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

export default function Player3D({ p, t, away = false, flip = false, h = 180, label = true }) {
  const ref = useRef(null);
  const w = Math.round(h * 0.56);
  const key = `${p?.id}|${t?.ab}|${away}|${flip}|${h}`;
  useEffect(() => {
    if (!p || !t) return;
    let stop = false, cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const el = ref.current;
      if (!el || stop) return;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.42;
      const camera = new THREE.PerspectiveCamera(21, w / h, 0.1, 50);
      camera.position.set(0, 0.42, 6.0); // a low hero angle, looking up at him
      camera.lookAt(0, 1.0, 0);
      const disposables = [];
      const keep = (x) => { disposables.push(x); return x; };

      // ---- colors and gear
      const g = gearFor(p);
      const clr = t.clr || "#334155", ac = t.ac || "#e2e8f0";
      const tc = (c) => (c === "team" ? clr : c);
      const J = away ? "#eef1f5" : clr;
      const numFill = away ? clr : lum(clr) > 0.7 ? clr : "#f8fafc";
      const numEdge = away ? ac : ac;
      const pantsC = away ? "#e6e9ee" : lum(ac) > 0.85 || lum(ac) < 0.12 ? "#e6e9ee" : ac;
      const sockC = away ? "#eef1f5" : clr;
      const skinC = p.face?.sk || "#a86b3c";
      const big = BIG.has(p.pos), skill = SKILL.has(p.pos);
      const W = big ? 1.12 : skill ? 0.94 : 1; // build

      const mat = (c, o = {}) => keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), roughness: 0.6, metalness: 0, ...o }));
      const skin = mat(skinC, { roughness: 0.55, sheen: 0.15, sheenColor: new THREE.Color("#ffe8dc") });
      const pantsM = mat(pantsC, { roughness: 0.42, sheen: 0.6, sheenColor: new THREE.Color("#ffffff"), clearcoat: 0.15 });
      const sockM = mat(sockC, { roughness: 0.85 });
      const white = mat("#f4f5f7", { roughness: 0.8 });
      const black = mat("#121418", { roughness: 0.5 });
      const sleeveM = mat(tc(g.sleeveClr), { roughness: 0.35, sheen: 0.4 });
      const gloveM = mat(tc(g.gloveClr), { roughness: 0.55 });
      const bandM = mat(tc(g.bandClr), { roughness: 0.9 });
      const cleatM = mat(tc(g.cleats), { roughness: 0.3, clearcoat: 0.6 });
      const helmetM = mat(clr, { roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
      const maskM = mat(lum(ac) < 0.2 ? "#2a2d33" : ac, { roughness: 0.35, metalness: 0.3, clearcoat: 0.6 });
      const trimM = mat(away ? clr : ac, { roughness: 0.7 });

      // the jersey: a canvas texture wrapped around the torso, number front and back, collar trim
      const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 512;
      const cx = cv.getContext("2d");
      cx.fillStyle = J; cx.fillRect(0, 0, 1024, 512);
      // subtle mesh-fabric grain
      for (let i = 0; i < 2600; i++) { cx.fillStyle = `rgba(${Math.random() < 0.5 ? "0,0,0" : "255,255,255"},0.05)`; cx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2); }
      cx.fillStyle = away ? clr : ac; cx.fillRect(0, 0, 1024, 34); // collar
      const num = String(jerseyNum(p)).slice(0, 2);
      cx.font = "900 230px 'Arial Black', Impact, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.lineJoin = "round";
      for (const x of [512, 0, 1024]) {
        cx.save(); cx.translate(x, 250); cx.scale(0.82, 1);
        cx.lineWidth = 18; cx.strokeStyle = numEdge; cx.strokeText(num, 0, 0);
        cx.fillStyle = numFill; cx.fillText(num, 0, 0); cx.restore();
      }
      const jTex = keep(new THREE.CanvasTexture(cv)); jTex.colorSpace = THREE.SRGBColorSpace; jTex.anisotropy = 4;
      const jersey = mat("#ffffff", { map: jTex, roughness: 0.78, sheen: 0.5, sheenColor: new THREE.Color("#ffffff") });

      // ---- geometry helpers
      const Y = new THREE.Vector3(0, 1, 0);
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      // a sculpted limb from a to b: tapered, with a muscle bulge, rounded ends
      const limb = (a, b, r1, r2, bulge, m, peak = 0.4) => {
        const dir = b.clone().sub(a), len = dir.length();
        const pts = [];
        for (let k = 0; k <= 6; k++) { const th = -Math.PI / 2 + (k / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(r1 * Math.cos(th) + 1e-4, r1 * Math.sin(th))); }
        for (let k = 1; k < 14; k++) { const s = k / 14; const bump = bulge * Math.pow(Math.sin(Math.PI * Math.min(1, s / (2 * peak))), 1.4) * (s < 2 * peak ? 1 : 0); pts.push(new THREE.Vector2(r1 + (r2 - r1) * s + bump, s * len)); }
        for (let k = 0; k <= 6; k++) { const th = (k / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(r2 * Math.cos(th) + 1e-4, len + r2 * Math.sin(th))); }
        const mesh = new THREE.Mesh(keep(new THREE.LatheGeometry(pts, 28)), m);
        mesh.position.copy(a); mesh.quaternion.setFromUnitVectors(Y, dir.normalize());
        return mesh;
      };
      const ball = (r, m, sx = 1, sy = 1, sz = 1) => { const s = new THREE.Mesh(keep(new THREE.SphereGeometry(r, 32, 24)), m); s.scale.set(sx, sy, sz); return s; };
      const band = (a, b, t0, t1, r, m) => { const p0 = a.clone().lerp(b, t0), p1 = a.clone().lerp(b, t1); return limb(p0, p1, r, r, 0, m); };
      const tube = (pts, r, m) => new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8)), m);

      const body = new THREE.Group();
      const S = (x) => x * W; // width scaled by build

      // ---- legs
      for (const s of [-1, 1]) {
        const hip = V(s * S(0.11), 0.95, 0), knee = V(s * S(0.16), 0.53, 0.03), ankle = V(s * S(0.19), 0.1, -0.005);
        body.add(limb(hip, knee, S(0.112), S(0.076), S(0.024), pantsM, 0.35));
        body.add(ball(S(0.068), pantsM, 1, 0.9, 1.05).translateX(knee.x).translateY(knee.y + 0.01).translateZ(knee.z + 0.012)); // knee pad
        // pants stripe
        body.add(tube([V(s * S(0.215), 0.93, 0), V(s * S(0.225), 0.72, 0.01), V(s * S(0.225), 0.5, 0.03)], 0.009, trimM));
        const shin = limb(knee, ankle, S(0.068), 0.047, S(0.02), sockM, 0.3); body.add(shin);
        if (g.socks === "low") body.add(band(knee, ankle, 0.45, 1.02, 0.05, white));
        else body.add(band(knee, ankle, 0.1, 0.18, S(0.072), white));
        // cleat
        const shoe = ball(0.06, cleatM, 1.05, 0.62, 2.1); shoe.position.set(ankle.x, 0.045, 0.06); body.add(shoe);
        const sole = new THREE.Mesh(keep(new THREE.BoxGeometry(0.11, 0.02, 0.25)), black); sole.position.set(ankle.x, 0.012, 0.06); body.add(sole);
        const swoosh = ball(0.012, white, 3, 0.6, 3); swoosh.position.set(ankle.x + s * 0.06, 0.05, 0.06); body.add(swoosh);
      }
      // hips
      const pelvis = ball(S(0.16), pantsM, 1.18, 0.6, 0.8); pelvis.position.set(0, 0.97, 0); body.add(pelvis);
      const belt = new THREE.Mesh(keep(new THREE.TorusGeometry(S(0.2), 0.016, 8, 40)), black); belt.rotation.x = Math.PI / 2; belt.scale.set(1.02, 0.7, 1); belt.position.y = 1.03; body.add(belt);

      // ---- torso: a lathe of the jersey over pads, wider than deep
      const tor = [];
      const prof = [[0.0, 0.165], [0.08, 0.17], [0.2, 0.19], [0.3, 0.215], [0.4, 0.23], [0.48, 0.225], [0.54, 0.19], [0.58, 0.11], [0.6, 0.08]];
      for (const [yy, r] of prof) tor.push(new THREE.Vector2(r, yy));
      const torsoGeo = keep(new THREE.LatheGeometry(tor, 48, -Math.PI, Math.PI * 2));
      const torso = new THREE.Mesh(torsoGeo, jersey);
      torso.position.y = 0.99; torso.scale.set(S(1.3), 1, 0.7);
      const chest = new THREE.Group(); chest.add(torso);
      // shoulder pads under the jersey, with sleeve stripes
      for (const s of [-1, 1]) {
        const pad = ball(0.15, jersey, S(1.1), 0.62, 1.02); pad.position.set(s * S(0.225), 1.5, 0); chest.add(pad);
        const cap = ball(0.12, jersey, 0.9, 0.95, 0.95); cap.position.set(s * S(0.315), 1.45, 0); chest.add(cap);
        const st = new THREE.Mesh(keep(new THREE.TorusGeometry(0.098, 0.012, 8, 32)), trimM); st.position.set(s * S(0.345), 1.39, 0); st.rotation.set(0, Math.PI / 2, s * 0.6); chest.add(st);
      }
      // neck and neck roll
      chest.add(limb(V(0, 1.5, 0), V(0, 1.66, 0.01), 0.082, 0.07, 0, skin));
      for (const s of [-1, 1]) { const trap = ball(0.08, skin, 1.3, 0.55, 0.8); trap.position.set(s * 0.07, 1.57, -0.02); trap.rotation.z = s * -0.5; chest.add(trap); }
      if (g.neckRoll) { const nr = new THREE.Mesh(keep(new THREE.TorusGeometry(0.1, 0.035, 12, 32)), jersey); nr.rotation.x = Math.PI / 2; nr.position.y = 1.56; chest.add(nr); }

      // ---- arms: one hangs loose, the other cradles the football
      const armGear = (s, sh, el, wr, hand, sleeveOn) => {
        chest.add(limb(sh, el, 0.08 * W, 0.06 * W, 0.024 * W, sleeveOn ? sleeveM : skin, 0.42));
        chest.add(limb(el, wr, 0.062 * W, 0.043 * W, 0.018 * W, sleeveOn ? sleeveM : skin, 0.25));
        if (g.armTape) chest.add(band(el, wr, 0.55, 0.85, 0.05 * W, white));
        if (g.wristbands) chest.add(band(el, wr, 0.86, 1.0, 0.05 * W, bandM));
        const gloved = g.gloves === "both" || (g.gloves === "one" && s === 1);
        const hm = ball(0.054, gloved ? gloveM : skin, 0.95, 1.1, 0.95); // a clenched fist hm.position.copy(hand); chest.add(hm);
      };
      const sleeveFor = (s) => g.sleeves === "both" || (g.sleeves === "one" && s === -1);
      // loose arm (side -1)
      armGear(-1, V(-S(0.33), 1.43, 0), V(-S(0.43), 1.17, -0.03), V(-S(0.46), 0.96, 0.04), V(-S(0.465), 0.9, 0.05), sleeveFor(-1));
      // ball arm (side +1): elbow back, forearm forward across the hip
      armGear(1, V(S(0.33), 1.43, 0), V(S(0.43), 1.17, -0.03), V(S(0.46), 0.96, 0.04), V(S(0.465), 0.9, 0.05), sleeveFor(1));
      // the football
      const fp = [];
      for (let i = 0; i <= 24; i++) { const s = i / 24; fp.push(new THREE.Vector2(0.088 * Math.pow(Math.sin(Math.PI * s), 0.85) + 1e-4, (s - 0.5) * 0.29)); }
      const fb = new THREE.Group();
      fb.add(new THREE.Mesh(keep(new THREE.LatheGeometry(fp, 32)), mat("#7a3b1c", { roughness: 0.55, clearcoat: 0.3 })));
      for (let i = -3; i <= 3; i++) { const l = new THREE.Mesh(keep(new THREE.BoxGeometry(0.035, 0.007, 0.012)), white); l.position.set(0, i * 0.018, 0.086); fb.add(l); }
      fb.rotation.set(0.25, 0, -0.15); // gripped at his side
      fb.position.set(S(0.475), 0.84, 0.1); fb.scale.setScalar(1.2);
      chest.add(fb);

      // towel tucked in the waistband
      if (g.towel) {
        const tw = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.1, 0.22, 2, 6)), mat("#f8fafc", { roughness: 1, side: THREE.DoubleSide }));
        const pos = tw.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.02 * Math.sin((pos.getY(i) + 0.11) * 9));
        tw.position.set(-S(0.08), 0.92, S(0.14)); tw.rotation.set(-0.1, 0, 0.08); chest.add(tw);
      }

      // ---- head and helmet
      const head = new THREE.Group(); head.position.set(0, 1.76, 0.02); head.rotation.x = 0.16; // chin tucked
      const face = ball(0.1, skin, 0.9, 1.08, 1); face.position.set(0, -0.025, 0.02); head.add(face);
      for (const s of [-1, 1]) {
        const eye = ball(0.012, black, 1.3, 0.8, 0.6); eye.position.set(s * 0.035, -0.005, 0.112); head.add(eye);
        if (g.eyeBlack !== "none") { const eb = new THREE.Mesh(keep(new THREE.BoxGeometry(g.eyeBlack === "sticker" ? 0.04 : 0.032, g.eyeBlack === "sticker" ? 0.016 : 0.009, 0.004)), black); eb.position.set(s * 0.037, -0.03, 0.11); eb.rotation.y = s * 0.3; head.add(eb); }
      }
      const R = 0.145;
      const inner = mat("#15171b", { side: THREE.BackSide, roughness: 0.9 });
      const shellTop = new THREE.Mesh(keep(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.4)), helmetM);
      const gap = 0.62; // the face opening
      const shellLow = new THREE.Mesh(keep(new THREE.SphereGeometry(R, 48, 16, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap, Math.PI * 0.4, Math.PI * 0.27)), helmetM);
      const shellIn = new THREE.Mesh(keep(new THREE.SphereGeometry(R * 0.985, 32, 16, Math.PI / 2 + gap, Math.PI * 2 - 2 * gap, 0, Math.PI * 0.67)), inner);
      const shell = new THREE.Group(); shell.add(shellTop, shellLow, shellIn); shell.scale.set(0.93, 1, 1.1); shell.position.set(0, 0.02, -0.005); head.add(shell);
      // center stripe
      head.add(tube(Array.from({ length: 9 }, (_, i) => { const a = -0.25 + (i / 8) * 1.75; return V(0, 0.02 + Math.cos(a) * R * 1.005, -0.005 + Math.sin(a) * R * 1.1 * 1.005); }), 0.01, trimM));
      // jaw pads and ear holes
      for (const s of [-1, 1]) {
        const jaw = ball(0.05, helmetM, 0.5, 0.9, 1.1); jaw.position.set(s * 0.115, -0.065, 0.045); head.add(jaw);
        const ear = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16)), black); ear.rotation.z = Math.PI / 2; ear.position.set(s * 0.134, -0.005, -0.005); head.add(ear);
      }
      // facemask, bar by bar
      const arc = (y, rr, a0, a1, zc = 0.02) => Array.from({ length: 11 }, (_, i) => { const a = a0 + (i / 10) * (a1 - a0); return V(Math.sin(a) * rr, y, zc + Math.cos(a) * rr * 1.08); });
      head.add(tube(arc(0.0, 0.142, -1.15, 1.15), 0.0075, maskM));
      if (g.mask !== "open") head.add(tube(arc(-0.055, 0.135, -1.0, 1.0), 0.0075, maskM));
      if (g.mask === "bar3" || g.mask === "cage") head.add(tube(arc(-0.105, 0.115, -0.85, 0.85), 0.0075, maskM));
      if (g.mask === "cage") { head.add(tube([V(0, 0.005, 0.175), V(0, -0.05, 0.168), V(0, -0.11, 0.143)], 0.007, maskM)); for (const s of [-1, 1]) head.add(tube([V(s * 0.05, 0.002, 0.168), V(s * 0.05, -0.055, 0.155), V(s * 0.045, -0.108, 0.13)], 0.007, maskM)); }
      for (const s of [-1, 1]) head.add(tube([V(s * 0.13, 0.0, 0.08), V(s * 0.125, -0.06, 0.09), V(s * 0.1, -0.11, 0.08)], 0.007, maskM));
      // chin strap
      head.add(tube(arc(-0.13, 0.08, -1.2, 1.2, 0.0), 0.009, white));
      // visor
      if (g.visor !== "none") {
        const vm = mat(g.visor === "clear" ? "#cfe3ff" : g.visor === "smoke" ? "#0b1220" : "#7c5cff", { transparent: true, opacity: g.visor === "clear" ? 0.25 : 0.82, roughness: 0.05, metalness: g.visor === "iridescent" ? 0.6 : 0.1, clearcoat: 1, iridescence: g.visor === "iridescent" ? 1 : 0 });
        const vis = new THREE.Mesh(keep(new THREE.SphereGeometry(R * 0.97, 32, 8, Math.PI / 2 - gap * 0.95, gap * 1.9, Math.PI * 0.42, Math.PI * 0.13)), vm);
        vis.scale.set(0.93, 1, 1.1); vis.position.set(0, 0.02, -0.005); head.add(vis);
      }
      // team logo decals on both sides of the helmet
      new THREE.TextureLoader().setCrossOrigin("anonymous").load(logoUrl(t.ab), (tex) => {
        if (stop) return tex.dispose();
        keep(tex); tex.colorSpace = THREE.SRGBColorSpace;
        const lm = mat("#ffffff", { map: tex, transparent: true, roughness: 0.25, clearcoat: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
        for (const s of [-1, 1]) {
          const d = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.105, 0.105)), lm);
          d.position.set(s * 0.137, 0.035, -0.01); d.rotation.y = s * Math.PI / 2; if (s < 0) d.scale.x = -1;
          head.add(d);
        }
      }, undefined, () => {});
      chest.add(head);
      body.add(chest);

      // contact shadow
      const sc = document.createElement("canvas"); sc.width = sc.height = 128;
      const sx = sc.getContext("2d"); const gr = sx.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
      const shadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.8, 0.5)), keep(new THREE.MeshBasicMaterial({ map: keep(new THREE.CanvasTexture(sc)), transparent: true, depthWrite: false })));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002;
      scene.add(shadow);

      const turn = flip ? -0.5 : 0.5;
      body.rotation.y = turn;
      scene.add(body);

      // lights: warm key, cool fill, a rim in the team's accent color
      scene.add(new THREE.HemisphereLight(0xc8d4ff, 0x0a0c10, 0.28));
      const keyL = new THREE.DirectionalLight(0xffffff, 1.9); keyL.position.set(flip ? -2.5 : 2.5, 6, 3); scene.add(keyL); // hard top light: shadowed eyes
      const rimC = new THREE.Color(lum(ac) < 0.15 ? "#9fb4ff" : ac);
      const rim = new THREE.DirectionalLight(rimC, 4.2); rim.position.set(flip ? 3 : -3, 2.5, -3.5); scene.add(rim);
      const rim2 = new THREE.DirectionalLight(0xffffff, 2.2); rim2.position.set(flip ? -3 : 3, 2, -4); scene.add(rim2);
      // a team-color glow behind him
      const gc = document.createElement("canvas"); gc.width = gc.height = 128;
      const gx = gc.getContext("2d"), gg = gx.createRadialGradient(64, 64, 2, 64, 64, 64);
      gg.addColorStop(0, `${lum(clr) < 0.12 ? ac : clr}cc`); gg.addColorStop(0.45, `${lum(clr) < 0.12 ? ac : clr}40`); gg.addColorStop(0.8, `${clr}00`); gg.addColorStop(1, `${clr}00`); gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
      const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(new THREE.CanvasTexture(gc)), transparent: true, depthWrite: false, opacity: 0.55 })));
      glow.scale.set(1.7, 2.3, 1); glow.position.set(0, 1.2, -1.2); scene.add(glow);

      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      let raf = 0; const t0 = performance.now(), ph = g.sway * 6.28;
      const loop = (now) => {
        const s = (now - t0) / 1000;
        if (!reduce) {
          const br = Math.sin(s * 1.6 + ph);
          chest.position.y = br * 0.004; chest.scale.set(1 + br * 0.006, 1, 1 + br * 0.008);
          body.rotation.y = turn + Math.sin(s * 0.45 + ph) * 0.12;
          head.rotation.y = Math.sin(s * 0.7 + ph * 1.3) * 0.08; head.rotation.x = 0.16 + Math.sin(s * 0.5 + ph) * 0.02;
        }
        renderer.render(scene, camera);
        if (!reduce && !document.hidden) raf = requestAnimationFrame(loop); else if (!reduce) raf = setTimeout(() => requestAnimationFrame(loop), 500);
      };
      raf = requestAnimationFrame(loop);
      cleanup = () => { cancelAnimationFrame(raf); clearTimeout(raf); disposables.forEach((d) => d.dispose?.()); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); };
    })();
    return () => { stop = true; cleanup(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p || !t) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <div ref={ref} role="img" aria-label={`${p.name}, ${t.name} ${p.pos}`} style={{ width: w, height: h }} />
      {label && <div style={{ fontSize: Math.max(10, Math.round(h / 15)), fontWeight: 800, color: "#e2e8f0", marginTop: 2, whiteSpace: "nowrap", textAlign: "center" }}>{(p.name || "").split(" ").slice(1).join(" ") || p.name} <span style={{ color: "#94a3b8", fontWeight: 700 }}>{p.pos} {p.ovr}</span></div>}
    </div>
  );
}
