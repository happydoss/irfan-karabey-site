// 3B sahne: dizüstü, telefon, oyun kolu ve teknoloji tuşları.
// Her bölüm için bir "durum" tanımlı; kaydırdıkça nesneler durumlar arasında uçar.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ICONS } from './icons.js';

const N = 9; // bölümler: giriş, hakkımda, web, mobil, oyun, yetenekler, projeler, özgeçmiş, iletişim
const ACCENT = 0x4a3aff;
const ACCENT_DARK = 0x9a90ff;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- yardımcılar ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData = { g, w, h };
  return t;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// ShapeGeometry UV'leri ham koordinattır; 0..1 aralığına çek
function normalizeUV(geo, w, h) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) + w / 2) / w, (uv.getY(i) + h / 2) / h);
  }
  uv.needsUpdate = true;
  return geo;
}

const S = (px, py, pz, rx = 0, ry = 0, rz = 0, s = 1) => ({ p: [px, py, pz], r: [rx, ry, rz], s });

/* ---------- ekran çizimleri ---------- */
const CODE = [
  [['const ', 'kw'], ['irfan', 'pl'], [' = {', 'pu']],
  [['  role', 'pr'], [': ', 'pu'], ["'Computer Engineer'", 'st'], [',', 'pu']],
  [['  web', 'pr'], [': [', 'pu'], ["'Next.js'", 'st'], [', ', 'pu'], ["'Django'", 'st'], ['],', 'pu']],
  [['  mobile', 'pr'], [': [', 'pu'], ["'Flutter'", 'st'], [', ', 'pu'], ["'React Native'", 'st'], ['],', 'pu']],
  [['  games', 'pr'], [': [', 'pu'], ["'Unity'", 'st'], [', ', 'pu'], ["'Unreal'", 'st'], ['],', 'pu']],
  [['};', 'pu']],
  [],
  [['export function ', 'kw'], ['build', 'fn'], ['(idea) {', 'pu']],
  [['  return ', 'kw'], ['ship', 'fn'], ['(', 'pu'], ['design', 'fn'], ['(idea));', 'pu']],
  [['}', 'pu']],
];
const CODE_COLORS = { kw: '#b7a6ff', st: '#ffb672', pr: '#7fd4ff', pl: '#eeeef6', pu: '#8d8ea6', fn: '#7fe3ad' };
const CODE_TOTAL = CODE.reduce((n, l) => n + l.reduce((m, t) => m + t[0].length, 0), 0);

function drawEditor(g, w, h, chars, cursorOn) {
  g.fillStyle = '#0b0c13';
  g.fillRect(0, 0, w, h);
  // başlık çubuğu
  g.fillStyle = '#13141e';
  g.fillRect(0, 0, w, 52);
  ['#ff6159', '#ffbd2e', '#28c941'].forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath(); g.arc(30 + i * 26, 26, 7, 0, 7); g.fill();
  });
  g.fillStyle = '#0b0c13';
  rr(g, 130, 10, 190, 42, [10, 10, 0, 0]); g.fill();
  g.fillStyle = '#4a3aff';
  g.fillRect(130, 10, 190, 3);
  g.font = '500 20px "JetBrains Mono", ui-monospace, monospace';
  g.textBaseline = 'middle';
  g.fillStyle = '#d7d7e4';
  g.fillText('irfan.ts', 158, 33);
  g.fillStyle = '#5c5d73';
  g.fillText('portfolio.tsx', 350, 33);
  // yan şerit
  g.fillStyle = '#0f1019';
  g.fillRect(0, 52, 62, h - 52);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i === 0 ? '#8f84ff' : '#2b2c3c';
    rr(g, 19, 78 + i * 46, 24, 24, 6); g.fill();
  }
  // kod
  g.font = '500 27px "JetBrains Mono", ui-monospace, monospace';
  const cw = g.measureText('M').width;
  let left = chars, cx = 0, cy = 0;
  const x0 = 136, y0 = 108, lh = 44;
  CODE.forEach((line, li) => {
    g.fillStyle = '#3a3b50';
    g.fillText(String(li + 1).padStart(2, ' '), 80, y0 + li * lh);
    let x = x0;
    for (const [txt, col] of line) {
      if (left <= 0) break;
      const part = txt.slice(0, left);
      g.fillStyle = CODE_COLORS[col];
      g.fillText(part, x, y0 + li * lh);
      x += part.length * cw;
      left -= part.length;
      cx = x; cy = y0 + li * lh;
    }
  });
  if (cursorOn) {
    g.fillStyle = '#8f84ff';
    g.fillRect(cx + 2 || x0, (cy || y0) - 16, 3, 32);
  }
  // durum çubuğu
  g.fillStyle = '#4a3aff';
  g.fillRect(0, h - 30, w, 30);
  g.font = '500 16px "JetBrains Mono", ui-monospace, monospace';
  g.fillStyle = '#ffffff';
  g.fillText('main', 20, h - 14);
  g.fillText('TypeScript', w - 130, h - 14);
}

// Projeler bölümünde dizüstü ekranında gösterilen proje görselleri
const PROJECT_SCREENS = [
  { bar: 'myanibase.com/evren', src: 'assets/myanibase-evren.jpg' },
  { bar: 'myanibase.com', src: 'assets/myanibase-evren.jpg' },
  { bar: 'Kırık Saat', src: 'assets/kirik-saat.jpg' },
  { bar: 'Kırık Pusula', src: 'assets/kirik-pusula.jpg' },
  { bar: 'render --lang 10 --fps 30', src: null },
];

function drawPipelineArt(g, x, y, w, h) {
  const bg = g.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, '#191032'); bg.addColorStop(1, '#090912');
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  g.textBaseline = 'alphabetic';
  g.font = 'italic 400 230px "Instrument Serif", Georgia, serif';
  g.fillStyle = '#f3f2ee';
  g.fillText('60\u2033', x + 70, y + 290);
  g.font = '500 22px "JetBrains Mono", ui-monospace, monospace';
  g.fillStyle = '#9a90ff';
  g.fillText('SVG  \u2192  TTS  \u2192  FFmpeg  \u2192  MP4', x + 78, y + 350);
  // ses dalgası
  for (let i = 0; i < 64; i++) {
    const a = Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.17)) * 0.85 + 0.12;
    g.fillStyle = i % 9 === 0 ? '#ff8a3d' : 'rgba(154,144,255,.75)';
    rr(g, x + 78 + i * 13.6, y + 440 - a * 46, 7, a * 92, 3.5); g.fill();
  }
  // zaman çizelgesi blokları
  const cols = ['#4a3aff', '#a05bff', '#ff8a3d', '#33d6a6'];
  let bx = x + 520;
  [150, 96, 190].forEach((bw, i) => { g.fillStyle = cols[i]; rr(g, bx, y + 110, bw - 8, 34, 9); g.fill(); bx += bw; });
  bx = x + 560;
  [110, 170, 120].forEach((bw, i) => { g.fillStyle = cols[(i + 2) % 4]; rr(g, bx, y + 156, bw - 8, 34, 9); g.fill(); bx += bw; });
  g.fillStyle = '#ffffff';
  g.fillRect(x + 742, y + 92, 2, 116);
}

function drawProject(g, w, h, proj, img) {
  g.fillStyle = '#0b0c13';
  g.fillRect(0, 0, w, h);
  const bar = 52;
  if (img) {
    // kırpmadan ekranı dolduracak şekilde ortala
    const s = Math.max(w / img.width, (h - bar) / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.drawImage(img, (w - dw) / 2, bar + (h - bar - dh) / 2, dw, dh);
  } else {
    drawPipelineArt(g, 0, bar, w, h - bar);
  }
  g.fillStyle = '#13141e';
  g.fillRect(0, 0, w, bar);
  ['#ff6159', '#ffbd2e', '#28c941'].forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath(); g.arc(30 + i * 26, 26, 7, 0, 7); g.fill();
  });
  g.fillStyle = '#0b0c13';
  rr(g, 130, 11, w - 260, 30, 15); g.fill();
  g.font = '500 17px "JetBrains Mono", ui-monospace, monospace';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillStyle = '#b9b9cb';
  g.fillText(proj.bar, w / 2, 27);
  g.textAlign = 'left';
}

function drawPhone(g, w, h) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0d0e17'); bg.addColorStop(1, '#15152a');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.textBaseline = 'middle';
  // dinamik çentik
  g.fillStyle = '#000';
  rr(g, w / 2 - 62, 26, 124, 34, 17); g.fill();
  g.font = '700 46px "Inter Tight", system-ui, sans-serif';
  g.fillStyle = '#f4f3ee';
  g.fillText('Keşfet', 36, 132);
  g.fillStyle = '#8f84ff';
  g.beginPath(); g.arc(w - 62, 130, 26, 0, 7); g.fill();
  // arama
  g.fillStyle = 'rgba(255,255,255,.07)';
  rr(g, 36, 180, w - 72, 60, 30); g.fill();
  g.fillStyle = 'rgba(255,255,255,.28)';
  rr(g, 64, 205, 150, 10, 5); g.fill();
  // öne çıkan kart
  const card = g.createLinearGradient(36, 270, w - 36, 590);
  card.addColorStop(0, '#4a3aff'); card.addColorStop(0.55, '#a05bff'); card.addColorStop(1, '#ff8a3d');
  g.fillStyle = card;
  rr(g, 36, 270, w - 72, 320, 34); g.fill();
  g.fillStyle = 'rgba(255,255,255,.2)';
  g.beginPath(); g.arc(w - 120, 350, 110, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.14)';
  g.beginPath(); g.arc(w - 60, 470, 150, 0, 7); g.fill();
  g.fillStyle = '#fff';
  rr(g, 64, 480, 230, 18, 9); g.fill();
  g.fillStyle = 'rgba(255,255,255,.65)';
  rr(g, 64, 518, 150, 12, 6); g.fill();
  rr(g, 64, 300, 96, 34, 17); g.fillStyle = 'rgba(0,0,0,.28)'; g.fill();
  // liste
  const thumbs = [['#ff8a3d', '#ffcf6b'], ['#33d6a6', '#3a8dff'], ['#ff5c8a', '#a05bff']];
  thumbs.forEach(([a, b], i) => {
    const y = 640 + i * 124;
    g.fillStyle = 'rgba(255,255,255,.05)';
    rr(g, 36, y, w - 72, 106, 26); g.fill();
    const tg = g.createLinearGradient(52, y, 126, y + 80);
    tg.addColorStop(0, a); tg.addColorStop(1, b);
    g.fillStyle = tg;
    rr(g, 50, y + 14, 78, 78, 20); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    rr(g, 150, y + 34, 190 - i * 26, 14, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)';
    rr(g, 150, y + 62, 120 + i * 20, 10, 5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.beginPath(); g.arc(w - 82, y + 53, 18, 0, 7); g.fill();
  });
  // alt sekme çubuğu
  g.fillStyle = 'rgba(255,255,255,.07)';
  rr(g, 36, h - 110, w - 72, 78, 39); g.fill();
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i === 0 ? '#8f84ff' : 'rgba(255,255,255,.3)';
    const x = 36 + ((w - 72) / 4) * (i + 0.5);
    if (i === 0) { rr(g, x - 30, h - 86, 60, 30, 15); g.fill(); } else { g.beginPath(); g.arc(x, h - 71, 9, 0, 7); g.fill(); }
  }
}

function drawKeyboard(g, w, h) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#17181f';
  const rows = [14, 14, 13, 12];
  const kx = 40, ky = 34, kw = w - 80, rh = 72, gap = 9;
  rows.forEach((n, r) => {
    const cw = (kw - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) { rr(g, kx + i * (cw + gap), ky + r * (rh + gap), cw, rh, 10); g.fill(); }
  });
  const y5 = ky + 4 * (rh + gap);
  const small = (kw - gap * 9) / 14;
  for (let i = 0; i < 4; i++) { rr(g, kx + i * (small + gap), y5, small, rh, 10); g.fill(); }
  rr(g, kx + 4 * (small + gap), y5, small * 6 + gap * 5, rh, 10); g.fill();
  for (let i = 0; i < 4; i++) { rr(g, kx + 4 * (small + gap) + small * 6 + gap * 6 + i * (small + gap), y5, small, rh, 10); g.fill(); }
  // dokunmatik yüzey
  g.fillStyle = 'rgba(0,0,0,.09)';
  rr(g, w / 2 - 190, y5 + rh + 30, 380, h - (y5 + rh + 30) - 26, 16); g.fill();
}

/* ---------- modeller ---------- */
function buildLaptop() {
  const group = new THREE.Group();
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xcfd0d8, metalness: 1, roughness: 0.32, clearcoat: 0.2 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.12, 2.1, 5, 0.055), metal);
  group.add(base);

  const keysTex = canvasTex(1024, 672, drawKeyboard);
  const keys = new THREE.Mesh(
    new THREE.PlaneGeometry(3.06, 2.0),
    new THREE.MeshStandardMaterial({ map: keysTex, transparent: true, roughness: 0.7, metalness: 0.1 })
  );
  keys.rotation.x = -Math.PI / 2;
  keys.position.y = 0.064;
  group.add(keys);

  const hinge = new THREE.Group();
  hinge.position.set(0, 0.06, -1.03);
  group.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(3.2, 2.06, 0.07, 5, 0.034), metal);
  lid.position.y = 1.03;
  hinge.add(lid);
  const bezel = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(3.12, 1.98, 0.06), 8),
    new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.25, metalness: 0.2 })
  );
  bezel.position.set(0, 1.03, 0.0372);
  hinge.add(bezel);
  const screenTex = canvasTex(1024, 640, (g, w, h) => drawEditor(g, w, h, 0, true));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 1.875),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screen.position.set(0, 1.035, 0.0396);
  hinge.add(screen);
  // kapak arkasındaki küçük amblem
  const logo = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 40),
    new THREE.MeshPhysicalMaterial({ color: ACCENT, metalness: 0.6, roughness: 0.2 })
  );
  logo.position.set(0, 1.03, -0.0372);
  logo.rotation.y = Math.PI;
  hinge.add(logo);

  group.userData = { hinge, screenTex };
  return group;
}

function buildPhone() {
  const group = new THREE.Group();
  const W = 1.3, H = 2.65;
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(W - 0.06, H - 0.06, 0.2), {
    depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 5, curveSegments: 18,
  });
  bodyGeo.center();
  const body = new THREE.Mesh(
    bodyGeo,
    new THREE.MeshPhysicalMaterial({ color: 0x1b1c24, metalness: 0.95, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 })
  );
  group.add(body);
  const sw = W - 0.1, sh = H - 0.1;
  const screen = new THREE.Mesh(
    normalizeUV(new THREE.ShapeGeometry(roundedRectShape(sw, sh, 0.17), 14), sw, sh),
    new THREE.MeshBasicMaterial({ map: canvasTex(540, 1148, drawPhone), toneMapped: false })
  );
  screen.position.z = 0.073;
  group.add(screen);
  // arka kamera adası
  const bump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40),
    new THREE.MeshPhysicalMaterial({ color: 0x0c0c12, metalness: 0.9, roughness: 0.15 })
  );
  bump.rotation.x = Math.PI / 2;
  bump.position.set(0.32, 0.9, -0.08);
  group.add(bump);
  return group;
}

function buildGamepad() {
  const group = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.75, 0.55);
  s.bezierCurveTo(-0.3, 0.62, 0.3, 0.62, 0.75, 0.55);
  s.bezierCurveTo(1.25, 0.6, 1.5, 0.2, 1.55, -0.35);
  s.bezierCurveTo(1.6, -0.95, 1.25, -1.1, 1.0, -0.8);
  s.bezierCurveTo(0.8, -0.5, 0.5, -0.35, 0, -0.35);
  s.bezierCurveTo(-0.5, -0.35, -0.8, -0.5, -1.0, -0.8);
  s.bezierCurveTo(-1.25, -1.1, -1.6, -0.95, -1.55, -0.35);
  s.bezierCurveTo(-1.5, 0.2, -1.25, 0.6, -0.75, 0.55);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.22, bevelEnabled: true, bevelThickness: 0.13, bevelSize: 0.11, bevelSegments: 10, curveSegments: 28,
  });
  geo.translate(0, 0.2, -0.11);
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({ color: ACCENT, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 })
  );
  group.add(body);

  const front = 0.24;
  const dark = new THREE.MeshPhysicalMaterial({ color: 0x14141c, roughness: 0.45, metalness: 0.2 });
  const light = new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.35, clearcoat: 0.6 });
  const warm = new THREE.MeshPhysicalMaterial({ color: 0xff8a3d, roughness: 0.35, clearcoat: 0.6 });
  const disc = (r, hgt, mat, x, y, z = front) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 40), mat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y + 0.2, z + hgt / 2);
    group.add(m);
    return m;
  };
  // analog çubuklar
  for (const [x, y] of [[-0.88, 0.1], [0.4, -0.22]]) {
    disc(0.24, 0.03, dark, x, y);
    disc(0.1, 0.12, dark, x, y);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), dark);
    cap.rotation.x = Math.PI / 2;
    cap.scale.z = 0.55;
    cap.position.set(x, y + 0.2, front + 0.1);
    group.add(cap);
  }
  // yön tuşları
  for (const [w, h] of [[0.36, 0.12], [0.12, 0.36]]) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.07, 3, 0.03), dark);
    m.position.set(-0.4, -0.02, front + 0.02);
    group.add(m);
  }
  // eylem tuşları
  const bx = 0.88, by = 0.1, d = 0.16;
  disc(0.075, 0.05, light, bx - d, by);
  disc(0.075, 0.05, light, bx + d, by);
  disc(0.075, 0.05, warm, bx, by + d);
  disc(0.075, 0.05, light, bx, by - d);
  // orta tuşlar
  for (const x of [-0.14, 0.14]) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.055, 0.04, 3, 0.02), light);
    m.position.set(x, 0.52, front + 0.01);
    group.add(m);
  }
  return group;
}

// [logo, grup, tuş rengi, alt yazı]
const CAPS = [
  ['typescript', 'web', 'light'], ['react', 'web', 'accent'], ['nextdotjs', 'web', 'dark'], ['tailwindcss', 'web', 'dark'], ['threedotjs', 'web', 'dark'],
  ['python', 'back', 'warm'], ['django', 'back', 'light'], ['firebase', 'back', 'dark'],
  ['flutter', 'mobile', 'accent'], ['react', 'mobile', 'dark', 'Native'], ['dart', 'mobile', 'light'],
  ['unity', 'game', 'dark'], ['unrealengine', 'game', 'accent'], ['csharp', 'game', 'light'], ['cplusplus', 'game', 'dark'],
];

function buildCaps() {
  const geo = new RoundedBoxGeometry(0.56, 0.36, 0.56, 5, 0.075);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ty = (pos.getY(i) + 0.18) / 0.36;
    const k = 1 - 0.2 * ty;
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const mats = {
    dark: new THREE.MeshPhysicalMaterial({ color: 0x20212a, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    light: new THREE.MeshPhysicalMaterial({ color: 0xf4f2ec, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    accent: new THREE.MeshPhysicalMaterial({ color: ACCENT, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    warm: new THREE.MeshPhysicalMaterial({ color: 0xff8a3d, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  };
  const labelGeo = new THREE.PlaneGeometry(0.43, 0.43);
  return CAPS.map(([icon, tag, tone, caption]) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mats[tone]));
    const tex = canvasTex(256, 256, (c) => {
      c.clearRect(0, 0, 256, 256);
      c.fillStyle = tone === 'light' ? '#16161d' : '#ffffff';
      const size = caption ? 132 : 168;
      c.save();
      c.translate((256 - size) / 2, caption ? 34 : (256 - size) / 2);
      c.scale(size / 24, size / 24);
      c.fill(new Path2D(ICONS[icon]));
      c.restore();
      if (caption) {
        c.font = '700 44px "Inter Tight", system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(caption, 128, 208);
      }
    });
    const label = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    label.rotation.x = -Math.PI / 2;
    label.position.y = 0.186;
    g.add(label);
    g.userData.tag = tag;
    return g;
  });
}

/* ---------- sahne ---------- */
export async function createScene(canvas) {
  // tuval yazıları için fontların hazır olmasını bekle (en fazla 1.5 sn)
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 64px "Inter Tight"'),
        document.fonts.load('500 27px "JetBrains Mono"'),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch { /* yedek fontla devam */ }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 60);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0x6a5cff, 60, 30);
  rim.position.set(-5, -2, 4);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  /* ana nesneler ve bölüm durumları */
  const laptop = buildLaptop();
  const phone = buildPhone();
  const gamepad = buildGamepad();
  const actors = [
    { obj: laptop, phase: 0.0, states: [
      S(2.5, -0.8, 0, 0.32, -0.55, 0, 1),
      S(-3.3, -0.9, -0.5, 0.35, 0.6, 0, 0.85),
      S(2.8, -0.95, 0.8, 0.28, -0.5, 0, 1.12),
      S(12.5, 3.6, -4, 0.8, -1.4, 0.2, 0.5),
      S(-12.5, 3.8, -4, 0.8, 1.2, 0, 0.5),
      S(0, 6.5, -5, 1, 0, 0, 0.5),
      { ...S(2.75, -0.95, 0.6, 0.27, -0.45, 0, 1.12), alt: S(3.7, -0.5, -1.6, 0.3, -0.62, 0, 0.82) },
      S(3.2, 1.5, -0.5, 0.3, -0.5, 0, 0.5),
      S(-4.25, 1.0, -0.5, 0.35, 0.55, 0, 0.7),
    ] },
    { obj: phone, phase: 2.1, states: [
      S(4.75, -0.2, 1.2, 0.05, -0.5, 0.1, 0.62),
      S(-1.55, -1.25, 0.8, 0.1, 0.5, -0.1, 0.55),
      S(12.5, -3.8, -3, 0, -1, 0, 0.5),
      S(-2.9, -0.1, 1, 0.05, 0.45, -0.06, 1.18),
      S(12.5, -3.5, -4, 0, 1, 0, 0.5),
      S(0, -6.5, -5, 0, 0, 0, 0.5),
      { ...S(4.8, -1.3, 1.2, 0.05, -0.55, 0.08, 0.5), alt: S(1.95, -0.2, 1.6, 0.04, -0.3, -0.04, 1.12) },
      S(4.35, -0.2, 0, 0.05, -0.5, 0.08, 0.5),
      S(4.2, 1.1, 0, 0.05, -0.5, 0.08, 0.66),
    ] },
    { obj: gamepad, phase: 4.2, states: [
      S(1.15, 1.55, -0.6, -0.25, -0.35, 0.18, 0.52),
      S(-4.5, 1.25, -0.5, -0.2, 0.5, -0.15, 0.48),
      S(-12.5, 3.8, -4, 0, 1, 0.4, 0.5),
      S(12.5, 3.8, -4, 0, -1, -0.4, 0.5),
      S(2.35, -0.15, 0.6, -0.3, -0.4, 0.12, 1.0),
      S(-12.5, -4, -4, 0, 0.6, 0, 0.5),
      S(0, 6.5, -5, 0, 0, 0, 0.5),
      S(3.1, -1.85, -0.3, -0.3, -0.4, 0.12, 0.46),
      S(0, 2.3, -0.5, -0.35, 0, 0, 0.5),
    ] },
  ];
  actors.forEach((a) => world.add(a.obj));

  /* teknoloji tuşları */
  const rnd = mulberry32(11);
  const caps = buildCaps();
  const webIdx = [], mobIdx = [], gameIdx = [];
  caps.forEach((c, k) => {
    const t = c.userData.tag;
    if (t === 'web' || t === 'back') webIdx.push(k);
    if (t === 'mobile') mobIdx.push(k);
    if (t === 'game') gameIdx.push(k);
  });
  const capActors = caps.map((obj, k) => {
    const R = rnd;
    const scat = (x0, x1) => ({
      p: [lerp(x0, x1, R()), lerp(-2.7, 2.7, R()), lerp(-3.2, -0.9, R())],
      r: [R() * 6, R() * 6, R() * 6], s: 0.5 + R() * 0.25,
    });
    const off = () => { const a = R() * 6.283; return { p: [Math.cos(a) * 10.5, Math.sin(a) * 7, -4], r: [R() * 6, R() * 6, 0], s: 0.3 }; };
    const orb = (list, c, rx, ry, sp, s = 0.62) => {
      const i = list.indexOf(k);
      if (i < 0) return off();
      return { orbit: true, c, rx, ry, a: (i / list.length) * 6.283, sp, r: [1.0, 0, 0], s };
    };
    const row = Math.floor(k / 5), col = k % 5;
    const grid = { p: [2.75 + (col - 2) * 0.84 + (row - 1) * 0.22, (1 - row) * 0.7 - 0.05, (row - 1) * 0.42], r: [1.02, 0, 0], s: 1.2 };
    const all = caps.map((_, i) => i);
    world.add(obj);
    return { obj, phase: R() * 6.283, states: [
      scat(0.3, 5.4),
      scat(-5.4, -0.4),
      orb(webIdx, [2.8, -0.2, 0], 2.55, 2.1, 0.16),
      orb(mobIdx, [-2.9, -0.1, 1], 1.75, 2.0, 0.22, 0.7),
      orb(gameIdx, [2.35, -0.1, 0.6], 2.3, 1.75, 0.2, 0.66),
      grid,
      off(),
      off(),
      orb(all, [0, 2.0, -1.5], 5.9, 1.15, 0.07, 0.48),
    ] };
  });

  /* yörünge halkaları + karanlık bölüm halesi */
  const ringMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.4, depthWrite: false });
  const rings = new THREE.Group();
  const orbitRings = [1.9, 2.5, 3.1].map((r, i) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.011, 6, 160), ringMat));
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), ringMat);
    sat.position.x = r;
    g.add(sat);
    g.rotation.set(1.1 + i * 0.35, 0.3 * i - 0.2, 0);
    rings.add(g);
    return g;
  });
  const haloMat = new THREE.MeshBasicMaterial({ color: ACCENT_DARK, transparent: true, opacity: 0, depthWrite: false });
  const halos = [1.7, 2.1, 2.5, 2.9, 3.3, 3.7, 4.1].map((r) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.009, 6, 200), haloMat);
    m.position.z = -0.6;
    rings.add(m);
    return m;
  });
  const glowTex = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(120,104,255,.85)');
    gr.addColorStop(0.4, 'rgba(84,60,255,.32)');
    gr.addColorStop(1, 'rgba(60,40,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(9);
  glow.position.z = -1.2;
  rings.add(glow);
  world.add(rings);
  // her bölümde halkaların (ve mobilde kameranın) odaklandığı nokta
  const focus = [
    { p: [2.6, -0.2, -1.5], s: 1.15, o: 0.34 },
    { p: [-3.1, -0.4, -1.5], s: 1.0, o: 0.26 },
    { p: [2.8, -0.2, -1], s: 1.2, o: 0.4 },
    { p: [-2.9, -0.1, -1], s: 1.12, o: 0.4 },
    { p: [2.35, -0.1, -1], s: 1.15, o: 0.75 },
    { p: [2.75, -0.05, -2], s: 1.45, o: 0.22 },
    { p: [2.75, -0.3, -1.5], s: 1.2, o: 0.3 },
    { p: [3.5, -0.2, -1.5], s: 1.3, o: 0.24 },
    { p: [0, 1.9, -2], s: 1.35, o: 0.55 },
  ];

  /* durum */
  let target = 0, f = 0, dark = 0, darkTarget = 0;
  let mx = 0, my = 0, smx = 0, smy = 0;
  let aspect = 1, portrait = false, fit = 1;
  const t0 = performance.now();
  let last = t0;
  let typed = 0, typeAcc = 0, hold = 0, lastBlink = true;
  // proje vitrini
  let project = 0, projFocus = 0, projFocusTarget = 0, screenMode = 'editor', screenDirty = false;
  const projImages = PROJECT_SCREENS.map((p) => {
    if (!p.src) return null;
    const img = new Image();
    img.onload = () => { screenDirty = true; };
    img.src = p.src;
    return img;
  });

  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    portrait = aspect < 0.95;
    fit = portrait ? 0.56 : clamp(aspect / 1.65, 0.62, 1);
  }
  window.addEventListener('resize', resize);
  resize();

  const tmp = { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
  function resolve(st, time, phase) {
    if (st.alt) {
      const b = st.alt, m = projFocus;
      return {
        p: [lerp(st.p[0], b.p[0], m), lerp(st.p[1], b.p[1], m), lerp(st.p[2], b.p[2], m)],
        r: [lerp(st.r[0], b.r[0], m), lerp(st.r[1], b.r[1], m), lerp(st.r[2], b.r[2], m)],
        s: lerp(st.s, b.s, m),
      };
    }
    if (!st.orbit) return st;
    const a = st.a + time * st.sp;
    tmp.p = [st.c[0] + Math.cos(a) * st.rx, st.c[1] + Math.sin(a) * st.ry, st.c[2] + Math.sin(a + 0.9) * 0.9];
    tmp.r = [st.r[0] + Math.sin(time * 0.7 + phase) * 0.18, Math.sin(time * 0.5 + phase) * 0.35, Math.cos(time * 0.6 + phase) * 0.2];
    tmp.s = st.s;
    return { p: tmp.p, r: tmp.r, s: tmp.s };
  }

  function segment() {
    const i = Math.min(Math.floor(f), N - 2);
    const raw = f - i;
    return { i, t: ease(clamp((raw - 0.12) / 0.76)), bump: Math.sin(Math.PI * clamp((raw - 0.12) / 0.76)) };
  }

  function place(a, seg, time, intro, isCap) {
    const A = resolve(a.states[seg.i], time, a.phase);
    const B = resolve(a.states[seg.i + 1], time, a.phase);
    const o = a.obj, t = seg.t;
    const idle = reduceMotion ? 0 : 1;
    const dir = seg.i % 2 ? -1 : 1;
    o.position.set(
      lerp(A.p[0], B.p[0], t),
      lerp(A.p[1], B.p[1], t) + Math.sin(time * 0.8 + a.phase) * 0.07 * idle - (1 - intro) * 3.2,
      lerp(A.p[2], B.p[2], t) + seg.bump * (isCap ? 0.4 : 0.9)
    );
    o.rotation.set(
      lerp(A.r[0], B.r[0], t) + seg.bump * (isCap ? 1.6 : 0.25) + Math.sin(time * 0.6 + a.phase) * 0.03 * idle,
      lerp(A.r[1], B.r[1], t) + seg.bump * dir * (isCap ? 1.2 : 1.0) + Math.sin(time * 0.45 + a.phase) * 0.06 * idle + (1 - intro) * 2.2,
      lerp(A.r[2], B.r[2], t) + Math.cos(time * 0.5 + a.phase) * 0.02 * idle
    );
    o.scale.setScalar(lerp(A.s, B.s, t) * Math.max(0.0001, easeOutBack(intro)));
  }

  const ringColorA = new THREE.Color(ACCENT), ringColorB = new THREE.Color(ACCENT_DARK);

  function frame(now) {
    const time = (now - t0) / 1000;
    // kare hızından bağımsız yumuşatma
    const dt = Math.min(0.25, Math.max(0.001, (now - last) / 1000));
    last = now;
    const k = (rate) => 1 - Math.exp(-dt * rate);
    f += (target - f) * (reduceMotion ? 1 : k(4.8));
    dark += (darkTarget - dark) * k(3.8);
    smx += (mx - smx) * k(3.2);
    smy += (my - smy) * k(3.2);
    projFocus += (projFocusTarget - projFocus) * k(4);
    const seg = segment();

    actors.forEach((a, k) => {
      const intro = reduceMotion ? 1 : clamp((time - 0.15 - k * 0.14) / 1.25);
      place(a, seg, time, 1 - Math.pow(1 - intro, 3), false);
    });
    capActors.forEach((a, k) => {
      const intro = reduceMotion ? 1 : clamp((time - 0.5 - k * 0.045) / 1.1);
      place(a, seg, time, 1 - Math.pow(1 - intro, 3), true);
    });

    // dizüstü kapağı açılışta açılır
    const open = reduceMotion ? 1 : ease(clamp((time - 0.5) / 1.4));
    laptop.userData.hinge.rotation.x = lerp(Math.PI / 2, -0.24, open);

    // dizüstü ekranı: projeler bölümünde seçili proje, diğer yerlerde kod editörü
    const mode = f > 5.5 && f < 6.5 ? 'project' : 'editor';
    if (mode !== screenMode) { screenMode = mode; screenDirty = true; }
    if (mode === 'project') {
      if (screenDirty) {
        screenDirty = false;
        const tx = laptop.userData.screenTex, u = tx.userData, img = projImages[project];
        drawProject(u.g, u.w, u.h, PROJECT_SCREENS[project], img && img.complete && img.naturalWidth ? img : null);
        tx.needsUpdate = true;
      }
    } else if (f < 2.7 || f > 6.5) {
      const blink = Math.floor(time * 2) % 2 === 0;
      let dirty = blink !== lastBlink || screenDirty;
      screenDirty = false;
      lastBlink = blink;
      if (typed < CODE_TOTAL) {
        typeAcc += dt * 26;
        const n = reduceMotion ? CODE_TOTAL : Math.floor(typeAcc);
        if (n > 0) { typeAcc -= Math.floor(typeAcc); typed = Math.min(CODE_TOTAL, typed + n); dirty = true; }
      } else if (!reduceMotion && (hold += dt) > 7) { hold = 0; typed = 0; typeAcc = 0; dirty = true; }
      if (dirty) {
        const tx = laptop.userData.screenTex, u = tx.userData;
        drawEditor(u.g, u.w, u.h, typed, blink);
        tx.needsUpdate = true;
      }
    }

    // halkalar
    const A = focus[seg.i], B = focus[seg.i + 1];
    const fx = lerp(A.p[0], B.p[0], seg.t), fy = lerp(A.p[1], B.p[1], seg.t);
    rings.position.set(fx, fy, lerp(A.p[2], B.p[2], seg.t));
    rings.scale.setScalar(lerp(A.s, B.s, seg.t));
    ringMat.opacity = lerp(A.o, B.o, seg.t) * clamp(time - 0.8);
    ringMat.color.copy(ringColorA).lerp(ringColorB, dark);
    orbitRings.forEach((g, i) => { g.rotation.z = time * (0.12 + i * 0.05) * (i % 2 ? -1 : 1); });
    haloMat.opacity = dark * 0.3;
    halos.forEach((h, i) => h.scale.setScalar(1 + Math.sin(time * 0.6 - i * 0.5) * 0.025));
    glow.material.opacity = dark * 0.85;

    // ekran oranına göre sahneyi sığdır; dikey ekranda odak noktasını üst yarıya taşı
    world.scale.setScalar(fit);
    if (portrait) world.position.set(-fx * fit, 1.25 - fy * fit, 0);
    else world.position.set(0, 0, 0);
    world.rotation.set(smy * 0.045, smx * 0.07, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setScroll(v) { target = clamp(v, 0, N - 1); },
    setDark(v) { darkTarget = v ? 1 : 0; },
    showProject(i) { project = clamp(i, 0, PROJECT_SCREENS.length - 1); projFocusTarget = i === 1 ? 1 : 0; screenDirty = true; },
  };
}
