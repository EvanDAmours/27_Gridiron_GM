// Player award trophies in real 3D, like the Lombardi: polished metal on ebony bases with an
// engraved nameplate, lit by a studio environment. Each kind is rendered once, face on, to an
// image (one short-lived WebGL context per kind), so a shelf of them costs nothing to show.
//   mvp   - a gold football lying on a fluted gold column (MVP)
//   sbmvp - a sterling football on a tall black obelisk (Super Bowl MVP)
//   opoy  - a chrome helmet on a pedestal (Offensive Player of the Year)
//   dpoy  - a gold helmet on a pedestal (Defensive Player of the Year)
//   oroy / droy - a small football on a crystal pillar (Rookies of the Year), silver / gold
import React, { useEffect, useState } from "react";

const cache = new Map();
const ASPECT = 1.9;

function footballGeo(THREE, len = 1.95, rad = 0.64) {
  const prof = [];
  for (let i = 0; i <= 32; i++) { const t = i / 32; prof.push(new THREE.Vector2(rad * Math.pow(Math.sin(Math.PI * t), 0.85), (t - 0.5) * len)); }
  return new THREE.LatheGeometry(prof, 64);
}
function football(THREE, mat, { len = 1.95, rad = 0.64, laces = true } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(footballGeo(THREE, len, rad), mat));
  if (laces) for (let i = -3; i <= 3; i++) {
    const y = i * len * 0.05, r = rad * Math.pow(Math.sin(Math.PI * (y / len + 0.5)), 0.85);
    const lace = new THREE.Mesh(new THREE.BoxGeometry(rad * 0.3, 0.03, 0.05), mat);
    lace.position.set(0, y, r + 0.01);
    g.add(lace);
  }
  return g;
}
function helmet(THREE, shell, mask, stripe) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62), shell);
  dome.scale.set(1, 0.95, 1.12);
  g.add(dome);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.905, 0.07, 10, 64, Math.PI * 1.1), stripe);
  band.rotation.set(0, Math.PI / 2, Math.PI / 2 - 0.1);
  band.scale.set(1, 1.12, 0.95);
  g.add(band);
  // face mask: three bars and two uprights in front
  for (const y of [-0.15, -0.38, -0.6]) {
    const bar = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.035, 8, 40, Math.PI * 0.7), mask);
    bar.rotation.set(Math.PI / 2, 0, Math.PI * 0.15);
    bar.position.set(0, y, 0.12);
    g.add(bar);
  }
  for (const x of [-0.28, 0.28]) {
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), mask);
    up.position.set(x, -0.38, 0.86);
    g.add(up);
  }
  g.rotation.y = -1.05; // three-quarter profile: shell, stripe and face mask all show
  return g;
}

function buildAward(THREE, RoomEnvironment, renderer, w, h, kind) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
  camera.position.set(0, 2.5, 9.6);
  camera.lookAt(0, 2.0, 0);
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.18 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe9ecf1, metalness: 1, roughness: 0.12 });
  const ebony = new THREE.MeshStandardMaterial({ color: 0x14110f, metalness: 0.2, roughness: 0.28 });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, metalness: 0, roughness: 0.04, transmission: 0.92, thickness: 0.6, ior: 1.5, transparent: true, opacity: 0.9 });
  const metal = kind === "mvp" || kind === "dpoy" || kind === "droy" ? gold : chrome;
  const g = new THREE.Group();
  // the base: an ebony block with a metal nameplate on the front
  const baseH = kind === "sbmvp" ? 0.5 : 0.62;
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, baseH, 1.2), ebony);
  base.position.y = baseH / 2;
  g.add(base);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.02), metal);
  plate.position.set(0, baseH / 2, 0.61);
  g.add(plate);
  const top = baseH;
  if (kind === "mvp") {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.2, 16, 1), gold);
    col.position.y = top + 1.1; g.add(col);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.14, 24), gold);
    cap.position.y = top + 2.27; g.add(cap);
    const ball = football(THREE, gold, { len: 1.7, rad: 0.56 });
    ball.rotation.set(0, 0, Math.PI / 2); ball.position.y = top + 2.85; g.add(ball);
  } else if (kind === "sbmvp") {
    const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.5, 2.6, 4, 1), ebony);
    ob.rotation.y = Math.PI / 4; ob.position.y = top + 1.3; g.add(ob);
    const ball = football(THREE, chrome, { len: 1.6, rad: 0.52 });
    ball.rotation.z = -0.5; ball.position.y = top + 3.25; g.add(ball);
  } else if (kind === "opoy" || kind === "dpoy") {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.6, 6, 1), ebony);
    ped.position.y = top + 0.8; g.add(ped);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 24), metal);
    ring.position.y = top + 1.62; g.add(ring);
    const stripe = new THREE.MeshStandardMaterial({ color: kind === "opoy" ? 0x2563eb : 0xb91c1c, metalness: 0.5, roughness: 0.3 });
    const hm = helmet(THREE, metal, kind === "opoy" ? new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 1, roughness: 0.3 }) : gold, stripe);
    hm.position.y = top + 2.45; g.add(hm);
  } else {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.3, 0.62), crystal);
    pil.position.y = top + 1.15; g.add(pil);
    const ball = football(THREE, metal, { len: 1.1, rad: 0.36 });
    ball.rotation.z = -0.4; ball.position.y = top + 2.75; g.add(ball);
  }
  g.rotation.y = 0.18;
  scene.add(g);
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff3d6, 0.5); fill.position.set(-4, 2, 3); scene.add(fill);
  return { scene, camera, pmrem };
}

export function awardImage(kind, size) {
  const k = `${kind}|${size}`;
  if (cache.has(k)) return cache.get(k);
  const job = (async () => {
    const THREE = await import("three");
    const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = size, h = Math.round(size * ASPECT);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(dpr); renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const { scene, camera, pmrem } = buildAward(THREE, RoomEnvironment, renderer, w, h, kind);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL("image/png");
    pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    return url;
  })().catch(() => null);
  cache.set(k, job);
  return job;
}

// A still 3D award trophy. fallback: what to show if WebGL isn't available.
export default function AwardTrophy3D({ kind, size = 100, label, fallback = null }) {
  const [src, setSrc] = useState(undefined);
  useEffect(() => { let on = true; awardImage(kind, size).then((u) => on && setSrc(u)); return () => { on = false; }; }, [kind, size]);
  if (src === null) return fallback;
  return <div role="img" aria-label={label || kind} style={{ width: size, height: Math.round(size * ASPECT), backgroundImage: src ? `url(${src})` : "none", backgroundSize: "100% 100%" }} />;
}
