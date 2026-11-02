'use strict';
/* ==========================================================================
   render.js — camera, seasonal terrain cache, pixel art drawn in code,
   day/night lighting, snow and the minimap. Reads world state only.
   ========================================================================== */
const R = { cam: { x: 0, y: 0, z: 2 }, vw: 800, vh: 600, dpr: 1, cv: null, g: null, terr: null, terrKey: '', mini: null, snow: [], flash: 0 };
const rc = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h) };

/* season palettes: spring, summer, autumn, winter */
const PAL = [
  { grass: ['#6fae52', '#74b356', '#69a84d', '#79b95a', '#6cab50'], tuft: '#5a9a42', sand: '#dccb94', rock: '#8d9288', shallow: '#3f7fb5', deep: '#2a5a8c', foam: '#a9d3ec' },
  { grass: ['#5c9a45', '#609f48', '#579440', '#64a34c', '#5a9843'], tuft: '#4a8537', sand: '#e2cf90', rock: '#8d9288', shallow: '#3a82b8', deep: '#285f8f', foam: '#a9d3ec' },
  { grass: ['#a39a45', '#a89f48', '#9c9340', '#ada24c', '#a19843'], tuft: '#8a7f35', sand: '#d6c28a', rock: '#8a8a80', shallow: '#3b768f', deep: '#27546f', foam: '#9fc3cf' },
  { grass: ['#e8eef2', '#e9eff3', '#e6ecf0', '#eaf0f4', '#e7edf1'], tuft: '#cdd8df', sand: '#ece6d6', rock: '#aeb6bd', shallow: '#a9cfe2', deep: '#4f82a8', foam: '#f2f8fb' },
];

function initRender(canvas, mini) {
  R.cv = canvas; R.g = canvas.getContext('2d'); R.mini = mini; resizeRender();
  for (let i = 0; i < 160; i++) R.snow.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 0.9, d: Math.random() * 6 });
}
function resizeRender() {
  const r = R.cv.getBoundingClientRect(); R.dpr = Math.min(2, window.devicePixelRatio || 1);
  R.vw = Math.max(200, r.width); R.vh = Math.max(200, r.height);
  R.cv.width = Math.round(R.vw * R.dpr); R.cv.height = Math.round(R.vh * R.dpr);
}
function clampCam() {
  const c = R.cam, mw = CFG.W * CFG.T, mh = CFG.H * CFG.T, hw = R.vw / (2 * c.z), hh = R.vh / (2 * c.z);
  c.x = hw * 2 > mw ? mw / 2 : clamp(c.x, hw, mw - hw); c.y = hh * 2 > mh ? mh / 2 : clamp(c.y, hh, mh - hh);
}
function screenToWorld(sx, sy) { const c = R.cam; return { x: (sx - R.vw / 2) / c.z + c.x, y: (sy - R.vh / 2) / c.z + c.y } }
function zoomAt(f, sx, sy) {
  const c = R.cam, b = screenToWorld(sx, sy); c.z = clamp(c.z * f, 0.45, 5);
  c.x = b.x - (sx - R.vw / 2) / c.z; c.y = b.y - (sy - R.vh / 2) / c.z; clampCam();
}

/* ---------- terrain cache (one canvas for the whole map, rebuilt each season) ---------- */
function buildTerrain(w) {
  const { W, H, T } = CFG, s = w.season, P = PAL[s];
  if (!R.terr) { R.terr = document.createElement('canvas'); R.terr.width = W * T; R.terr.height = H * T }
  const g = R.terr.getContext('2d'), isW = i => w.terr[i] <= TERR.SHALLOW;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, t = w.terr[i], X = x * T, Y = y * T, h = hash2(x, y);
    if (t === TERR.DEEP || t === TERR.SHALLOW) {
      rc(g, t === TERR.DEEP ? P.deep : P.shallow, X, Y, T, T);
      if (s === 3 && t === TERR.SHALLOW) { rc(g, '#d8ecf5', X + (h & 7), Y + ((h >> 3) & 7) + 2, 5, 1); rc(g, '#8fb9cf', X + ((h >> 6) & 7), Y + ((h >> 9) & 7), 1, 5) }
      for (const [dx, dy, ex, ey, ew, eh] of [[1, 0, T - 2, 0, 2, T], [-1, 0, 0, 0, 2, T], [0, 1, 0, T - 2, T, 2], [0, -1, 0, 0, T, 2]]) {
        const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && !isW(ny * W + nx)) rc(g, P.foam, X + ex, Y + ey, ew, eh);
      }
      continue;
    }
    if (t === TERR.SAND) {
      rc(g, P.sand, X, Y, T, T); rc(g, 'rgba(0,0,0,.07)', X + (h & 15), Y + ((h >> 4) & 15), 2, 1); rc(g, 'rgba(255,255,255,.18)', X + ((h >> 8) & 15), Y + ((h >> 12) & 15), 2, 1); continue;
    }
    if (t === TERR.ROCK || t === TERR.PEAK) {
      rc(g, t === TERR.PEAK ? (s === 3 ? '#f0f4f7' : '#c4cacf') : P.rock, X, Y, T, T);
      rc(g, 'rgba(0,0,0,.16)', X + (h & 15), Y + ((h >> 4) & 15), 4, 1); rc(g, 'rgba(0,0,0,.12)', X + ((h >> 8) & 15), Y + ((h >> 11) & 15), 1, 4);
      rc(g, 'rgba(255,255,255,.2)', X + ((h >> 14) & 15), Y + ((h >> 18) & 15), 3, 1);
      if (t === TERR.PEAK) { rc(g, '#e8edf0', X + 3, Y + 3, 10, 5); rc(g, '#8d949a', X + 1, Y + 11, 14, 4) }
      continue;
    }
    rc(g, P.grass[w.shade[i]], X, Y, T, T);
    for (let k = 0; k < 3; k++) rc(g, P.tuft, X + ((h >> (k * 5)) & 15), Y + ((h >> (k * 5 + 2)) & 14), 1, 2);
    if (s === 0 && h % 6 === 0) rc(g, ['#ffffff', '#ffd84a', '#ff8fb1', '#b48cff'][h % 4], X + ((h >> 9) & 14), Y + ((h >> 13) & 14), 2, 2);
    if (s === 1 && h % 11 === 0) rc(g, '#ffe27a', X + ((h >> 9) & 14), Y + ((h >> 13) & 14), 1, 1);
    if (s === 2 && h % 5 === 0) rc(g, ['#c9782a', '#b9482a', '#d4a82f'][h % 3], X + ((h >> 9) & 14), Y + ((h >> 13) & 14), 2, 1);
    if (s === 3 && h % 9 === 0) rc(g, '#ffffff', X + ((h >> 9) & 14), Y + ((h >> 13) & 14), 1, 1);
  }
  const m = R.mini; if (m) { m.width = W; m.height = H; const mg = m.getContext('2d'); mg.imageSmoothingEnabled = true; mg.drawImage(R.terr, 0, 0, W, H); R.miniBase = document.createElement('canvas'); R.miniBase.width = W; R.miniBase.height = H; R.miniBase.getContext('2d').drawImage(m, 0, 0) }
}

/* ---------- pixel art ---------- */
function oak(g, X, Y, h, s) {
  rc(g, 'rgba(0,0,0,.18)', X + 3, Y + 13, 10, 2); rc(g, '#5b3d24', X + 7, Y + 7, 2, 7);
  if (s === 3) { rc(g, '#4a3220', X + 5, Y + 4, 1, 5); rc(g, '#4a3220', X + 10, Y + 3, 1, 6); rc(g, '#4a3220', X + 7, Y + 2, 2, 6); rc(g, '#4a3220', X + 4, Y + 3, 3, 1); rc(g, '#4a3220', X + 9, Y + 2, 3, 1); rc(g, '#fff', X + 4, Y + 2, 3, 1); rc(g, '#fff', X + 10, Y + 1, 2, 1); rc(g, '#fff', X + 7, Y + 1, 2, 1); return }
  const C = s === 0 ? ['#5aa84a', '#478f3a', '#86cf6b'] : s === 1 ? ['#3f8f3a', '#2f7a30', '#5fb04a'] : [['#c9782a', '#a8561f', '#e0a23a'], ['#b9482a', '#933620', '#d97a3a'], ['#d4a82f', '#b3862a', '#ecce5e']][h % 3];
  const rows = [[5, 6], [3, 10], [2, 12], [2, 12], [2, 12], [3, 10], [4, 8]];
  rows.forEach(([x0, wd], r) => rc(g, C[0], X + x0, Y + r, wd, 1));
  rows.slice(3).forEach(([x0, wd], r) => rc(g, C[1], X + x0 + 3, Y + 3 + r, wd - 3, 1));
  rc(g, C[2], X + 4, Y + 1, 3, 1); rc(g, C[2], X + 3, Y + 2, 2, 2); rc(g, C[2], X + 9, Y + 2, 2, 1);
  if (s === 2 && h % 4 === 0) rc(g, C[2], X + 6, Y + 14, 3, 1);
}
function pine(g, X, Y, h, s) {
  rc(g, 'rgba(0,0,0,.18)', X + 3, Y + 13, 10, 2); rc(g, '#4e3420', X + 7, Y + 11, 2, 4);
  const c1 = s === 2 ? '#3a6a3a' : '#2c5e3a', c2 = s === 2 ? '#2f5a33' : '#23502f';
  for (let k = 0; k < 4; k++) { const wd = 4 + k * 3, y = Y + 1 + k * 3; rc(g, c1, X + 8 - wd / 2, y, wd, 3); rc(g, c2, X + 8 - wd / 2 + 1, y + 2, wd - 2, 1); if (s === 3) { rc(g, '#fff', X + 8 - wd / 2, y, wd, 1); rc(g, '#e6eef2', X + 8 - wd / 2 + 1, y + 1, wd - 2, 1) } }
}
function rocks(g, X, Y, res) {
  const n = Math.max(1, Math.ceil(res / 3));
  const R_ = [[2, 8, 7, 5], [8, 6, 6, 5], [5, 3, 6, 5]];
  for (let k = 0; k < n; k++) { const [x, y, w, h] = R_[k]; rc(g, '#5f656b', X + x, Y + y + h - 1, w, 1); rc(g, '#8a9097', X + x, Y + y, w, h - 1); rc(g, '#b5bbc2', X + x, Y + y, w - 1, 1); rc(g, '#aab0b6', X + x, Y + y, 1, h - 1) }
}
function bush(g, X, Y, res, s, h) {
  rc(g, 'rgba(0,0,0,.15)', X + 3, Y + 12, 10, 2);
  const c = s === 3 ? '#7a6a58' : s === 2 ? '#b0702a' : '#3b8a3e'; rc(g, c, X + 3, Y + 6, 10, 6); rc(g, c, X + 4, Y + 4, 8, 3); rc(g, 'rgba(255,255,255,.14)', X + 4, Y + 5, 4, 1);
  if (s === 3) rc(g, '#fff', X + 4, Y + 4, 8, 1);
  if (res > 0 && s < 3) { rc(g, '#d0443c', X + 5, Y + 6, 2, 2); rc(g, '#d0443c', X + 9, Y + 8, 2, 2); rc(g, '#c23a8a', X + 7, Y + 10, 2, 2) }
}
function drawFeature(g, w, x, y, now) {
  const i = y * CFG.W + x, f = w.feat[i], X = x * CFG.T, Y = y * CFG.T, s = w.season, h = hash2(x, y);
  if (f === FEAT.OAK) oak(g, X, Y, h, s); else if (f === FEAT.PINE) pine(g, X, Y, h, s); else if (f === FEAT.STONE) rocks(g, X, Y, w.res[i]); else if (f === FEAT.BUSH) bush(g, X, Y, w.res[i], s, h);
}
function roadTile(g, w, x, y) {
  const X = x * CFG.T, Y = y * CFG.T, h = hash2(x, y), s = w.season;
  rc(g, s === 3 ? '#cbc9c0' : '#b99d6c', X, Y, CFG.T, CFG.T); rc(g, s === 3 ? '#b7b5ad' : '#a58a5b', X + (h & 11), Y + ((h >> 4) & 11), 3, 2); rc(g, s === 3 ? '#e8e6df' : '#cdb383', X + ((h >> 8) & 11), Y + ((h >> 12) & 11), 2, 1);
  const i = y * CFG.W + x; if (!w.road[i - 1]) rc(g, 'rgba(0,0,0,.1)', X, Y, 1, CFG.T); if (!w.road[i + 1]) rc(g, 'rgba(0,0,0,.1)', X + CFG.T - 1, Y, 1, CFG.T);
}
function farmArt(g, w, b) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, Wd = b.w * CFG.T, Ht = b.h * CFG.T, s = w.season;
  rc(g, '#6b4a2c', X, Y, Wd, Ht); for (let r = 3; r < Ht; r += 4) rc(g, '#573a21', X, Y + r, Wd, 1);
  for (let r = 0; r < Ht; r += 4) for (let c = 2; c < Wd; c += 4) {
    if (b.state === 1) { const hh = 1 + Math.round(b.g * 5); rc(g, b.g > 0.6 ? '#8fd45a' : '#6cc04a', X + c, Y + r + 4 - hh, 2, hh) }
    else if (b.state === 2) { rc(g, '#e6c04a', X + c, Y + r - 1, 2, 5); rc(g, '#f4dc7a', X + c, Y + r - 1, 2, 1) }
  }
  rc(g, '#5a3d22', X, Y, 2, 3); rc(g, '#5a3d22', X + Wd - 2, Y, 2, 3); rc(g, '#5a3d22', X, Y + Ht - 3, 2, 3); rc(g, '#5a3d22', X + Wd - 2, Y + Ht - 3, 2, 3);
  if (s === 3) { rc(g, 'rgba(255,255,255,.6)', X, Y, Wd, Ht) }
}
function houseArt(g, w, b, night, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, s = w.season, lit = b.occ.length > 0;
  rc(g, 'rgba(0,0,0,.22)', X + 2, Y + 29, 30, 3);
  rc(g, '#b88a58', X + 3, Y + 15, 26, 15); for (let i = 0; i < 5; i++) rc(g, '#9c7346', X + 3, Y + 18 + i * 3, 26, 1); rc(g, '#7a5632', X + 3, Y + 15, 1, 15); rc(g, '#7a5632', X + 28, Y + 15, 1, 15);
  const rcol = b.id % 3 === 0 ? ['#9a3b2c', '#7f2e22'] : b.id % 3 === 1 ? ['#7b4a2a', '#623a20'] : ['#4f6b7a', '#3d5461'];
  for (let r = 0; r < 13; r++) { const l = Math.round(10 - r * 10 / 12); rc(g, r % 3 === 2 ? rcol[1] : rcol[0], X + l, Y + 3 + r, 32 - 2 * l, 1) }
  rc(g, rcol[1], X, Y + 15, 32, 1);
  if (s === 3) { for (let r = 0; r < 4; r++) { const l = Math.round(10 - r * 10 / 12); rc(g, '#fff', X + l, Y + 3 + r, 32 - 2 * l, 1) } rc(g, '#eef3f6', X + 1, Y + 15, 30, 1); rc(g, '#fff', X + 4, Y + 10, 6, 1); rc(g, '#fff', X + 21, Y + 10, 6, 1) }
  rc(g, '#7a7f85', X + 22, Y + 1, 4, 7); rc(g, '#5b6066', X + 22, Y + 1, 4, 1);
  rc(g, '#5a3a22', X + 13, Y + 21, 6, 9); rc(g, '#d8b56a', X + 17, Y + 25, 1, 1);
  const wc = lit && night ? '#ffd76a' : '#9fc4d8'; for (const wx of [5, 22]) { rc(g, '#5a3a22', X + wx - 1, Y + 18, 7, 7); rc(g, wc, X + wx, Y + 19, 5, 5); rc(g, '#5a3a22', X + wx + 2, Y + 19, 1, 5); rc(g, '#5a3a22', X + wx, Y + 21, 5, 1) }
  if (lit && (night || s === 3 || w.tod > 0.55)) for (let k = 0; k < 3; k++) { const t = ((now / 700) + k / 3) % 1; g.fillStyle = `rgba(210,210,215,${0.5 * (1 - t)})`; g.fillRect(X + 22 + Math.sin(t * 5 + k) * 2, Y - t * 10, 3 + t * 3, 3 + t * 3) }
}
function storeArt(g, w, b, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, s = w.season;
  rc(g, 'rgba(0,0,0,.22)', X + 1, Y + 29, 31, 3);
  rc(g, '#a88a5a', X + 2, Y + 13, 28, 17); for (let i = 0; i < 6; i++) rc(g, '#8d7248', X + 2, Y + 16 + i * 3, 28, 1);
  for (let r = 0; r < 11; r++) { const l = Math.round(8 - r * 8 / 10); rc(g, r % 3 === 2 ? '#52463a' : '#6b5a4a', X + l, Y + 3 + r, 32 - 2 * l, 1) } rc(g, '#3e352c', X, Y + 14, 32, 1);
  if (s === 3) for (let r = 0; r < 4; r++) { const l = Math.round(8 - r * 0.8); rc(g, '#fff', X + l, Y + 3 + r, 32 - 2 * l, 1) }
  rc(g, '#4b3a2a', X + 9, Y + 19, 14, 11); rc(g, '#3a2c20', X + 15, Y + 19, 2, 11); rc(g, '#6b5640', X + 9, Y + 19, 14, 1);
  const full = Math.min(1, w.stock.food / w.cap());
  if (full > 0.15) { rc(g, '#d9c48a', X + 3, Y + 25, 5, 5); rc(g, '#c4ad70', X + 3, Y + 25, 5, 1) } if (full > 0.45) { rc(g, '#d9c48a', X + 24, Y + 25, 5, 5); rc(g, '#c4ad70', X + 24, Y + 25, 5, 1) } if (full > 0.75) rc(g, '#d9c48a', X + 24, Y + 21, 5, 4);
  rc(g, '#7a5a30', X + 1, Y + 26, 3, 4); rc(g, '#4a3a20', X + 1, Y + 27, 3, 1);
}
function campfireArt(g, w, b, now, dark) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, f = ((now / 110) | 0) % 3;
  rc(g, '#7d858c', X + 2, Y + 11, 3, 3); rc(g, '#7d858c', X + 11, Y + 11, 3, 3); rc(g, '#7d858c', X + 5, Y + 13, 6, 2);
  rc(g, '#5a3a22', X + 3, Y + 10, 10, 2); rc(g, '#6b4a2a', X + 5, Y + 8, 6, 2);
  const fl = [['#e8672a', '#f7b733', '#fff1a8'], ['#e8582a', '#f9a825', '#ffe58a'], ['#ef7a30', '#f7c040', '#fff4b8']][f];
  rc(g, fl[0], X + 5, Y + 4 + (f === 1 ? 1 : 0), 6, 5); rc(g, fl[1], X + 6, Y + 2 + f % 2, 4, 6); rc(g, fl[2], X + 7, Y + 5, 2, 3);
}
function bpArt(g, w, bp, now) {
  const X = bp.x * CFG.T, Y = bp.y * CFG.T, Wd = bp.w * CFG.T, Ht = bp.h * CFG.T;
  g.fillStyle = bp.type === 'road' ? 'rgba(255,230,160,.35)' : 'rgba(255,255,255,.16)'; g.fillRect(X, Y, Wd, Ht);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.strokeRect(X + .5, Y + .5, Wd - 1, Ht - 1); g.setLineDash([]);
  if (bp.type === 'road') return;
  const need = bp.cost.wood + bp.cost.stone, have = bp.have.wood + bp.have.stone, f = (need ? have / need : 1) * 0.5 + bp.prog / bp.time * 0.5;
  rc(g, '#000', X + 1, Y + Ht - 4, Wd - 2, 3); rc(g, '#ffd45a', X + 1, Y + Ht - 4, (Wd - 2) * f, 3);
  if (bp.prog > 0) { const hgt = Math.round(Ht * 0.6 * bp.prog / bp.time); rc(g, 'rgba(150,110,70,.75)', X + 3, Y + Ht - 6 - hgt, Wd - 6, hgt) }
}
function drawBuilding(g, w, b, now, dark) {
  if (b.type === 'house') houseArt(g, w, b, dark > 0.3, now); else if (b.type === 'store') storeArt(g, w, b, now); else if (b.type === 'campfire') campfireArt(g, w, b, now, dark);
}

/* ---------- animals & villagers ---------- */
function flipped(g, x, y, dir, fn) { g.save(); g.translate(x, y); g.scale(dir, 1); fn(); g.restore() }
function drawAnimal(g, a, w, now, sel) {
  const x = Math.round(a.x * CFG.T), y = Math.round(a.y * CFG.T), bob = a.moving ? (((now / 90) | 0) % 2) : 0;
  rc(g, 'rgba(0,0,0,.22)', x - 5, y - 1, 10, 2);
  if (sel === a) { g.strokeStyle = '#fff'; g.beginPath(); g.ellipse(x, y, 8, 4, 0, 0, 7); g.stroke() }
  flipped(g, x, y, a.dir, () => {
    if (a.kind === 'deer') {
      const c = w.season === 3 ? '#9c8068' : '#a8744a';
      rc(g, c, -5, -9, 10, 5); rc(g, '#d8b890', -4, -5, 7, 1); rc(g, '#7a5232', -5, -4 + bob, 1, 4 - bob); rc(g, '#7a5232', -2, -4, 1, 4); rc(g, '#7a5232', 2, -4 + bob, 1, 4 - bob); rc(g, '#7a5232', 4, -4, 1, 4);
      rc(g, c, 4, -12, 3, 4); rc(g, c, 6, -11, 3, 2); rc(g, '#222', 7, -11, 1, 1); rc(g, '#fff', -6, -9, 1, 2);
      if (a.sex === 'm') { rc(g, '#d9cdb0', 4, -15, 1, 3); rc(g, '#d9cdb0', 6, -15, 1, 3); rc(g, '#d9cdb0', 3, -15, 1, 1); rc(g, '#d9cdb0', 7, -15, 1, 1) }
    } else if (a.kind === 'rabbit') {
      const c = w.season === 3 ? '#f0f0ee' : '#b9a98e';
      rc(g, c, -3, -5 - bob, 6, 4); rc(g, c, 2, -7 - bob, 3, 3); rc(g, c, 3, -10 - bob, 1, 3); rc(g, c, 4, -10 - bob, 1, 2); rc(g, '#fff', -4, -5 - bob, 2, 2); rc(g, '#222', 4, -6 - bob, 1, 1);
    } else {
      rc(g, '#6d7278', -7, -10, 12, 5); rc(g, '#8b9096', -6, -10, 10, 1); rc(g, '#4f5358', -7, -5, 1, 4 - bob); rc(g, '#4f5358', -3, -5, 1, 4); rc(g, '#4f5358', 1, -5 + bob, 1, 4 - bob); rc(g, '#4f5358', 4, -5, 1, 4);
      rc(g, '#6d7278', 5, -13, 5, 5); rc(g, '#4f5358', 9, -11, 2, 2); rc(g, '#e8d24a', 7, -12, 1, 1); rc(g, '#6d7278', 5, -15, 1, 2); rc(g, '#6d7278', 8, -15, 1, 2); rc(g, '#555a5f', -9, -10, 3, 2);
    }
  });
}
const SHIRTS_M = ['#6a8fd0', '#5a7fb0', '#7a9a6a', '#a07850', '#8a6aa8'], SHIRTS_F = ['#d77a8f', '#c46a9a', '#e0a050', '#7aa8a0', '#b06a6a'], SKIN = ['#f0cfa8', '#e0b48a', '#c8935f', '#a8714a', '#7a4f33'], HAIR = ['#3d2b1f', '#6b3a2a', '#c9a24a', '#a8a8a8', '#1d1d1d', '#9a4a1f'];
const HATS = { farmer: '#d8b84a', woodcutter: '#b0562a', miner: '#8a929a', builder: '#e8a03a', hunter: '#3f7d4a', fisher: '#4aa3d8' };
function drawVillager(g, v, w, now, sel) {
  const x = Math.round(v.x * CFG.T), y = Math.round(v.y * CFG.T), k = v.isChild() ? 0.72 : 1, s = w.season;
  rc(g, 'rgba(0,0,0,.22)', x - 4 * k, y - 1, 8 * k, 2);
  if (sel === v) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, 7, 3.5, 0, 0, 7); g.stroke() }
  const shirt = (v.sex === 'f' ? SHIRTS_F : SHIRTS_M)[v.look % 5], skin = SKIN[(v.look >> 3) % 5], hair = HAIR[(v.look >> 5) % 6];
  g.save(); g.translate(x, y); g.scale(v.dir * k, k);
  if (v.sleeping) {
    rc(g, '#8a6a4a', -6, -3, 12, 3); rc(g, shirt, -5, -6, 7, 4); rc(g, skin, 3, -6, 4, 4); rc(g, hair, 3, -7, 4, 2); g.restore();
    const t = (now / 500) % 3; g.fillStyle = '#fff'; g.font = '6px sans-serif'; g.fillText('z', x + 4 + t, y - 9 - t * 2); return;
  }
  const mv = v.cur && v.cur.type === 'go' && v.path.length > 0, ph = mv ? ((now / 140) | 0) % 2 : 0, work = v.cur && v.cur.type === 'work' && !v.fighting && v.label !== 'Idling' && !/Chat|Talk|Feast|Eat|Hid/.test(v.label), sw = work ? ((now / 160) | 0) % 2 : 0;
  rc(g, '#3b3f4a', -2, -4, 2, 4 - (ph ? 1 : 0)); rc(g, '#3b3f4a', 1, -4, 2, 4 - (ph ? 0 : 1));
  rc(g, shirt, -3, -9, 6, 6); rc(g, 'rgba(0,0,0,.15)', -3, -4, 6, 1); if (s === 3) rc(g, '#e8edf0', -3, -9, 6, 1);
  rc(g, skin, -4, -8 + (ph ? 1 : 0), 1, 3); rc(g, skin, 3, -8 - (work ? sw * 2 : (ph ? 0 : 1)), 1, 3);
  rc(g, skin, -2, -13, 5, 5); rc(g, hair, -2, -14, 5, 2); rc(g, hair, -3, -13, 1, 3); rc(g, '#222', 1, -11, 1, 1);
  const hc = HATS[v.role]; if (hc && !v.isChild()) { if (v.role === 'farmer' || v.role === 'fisher') { rc(g, hc, -4, -14, 9, 1); rc(g, hc, -2, -16, 5, 2) } else if (v.role === 'hunter') { rc(g, hc, -3, -15, 6, 3); rc(g, hc, -3, -12, 1, 3) } else { rc(g, hc, -3, -15, 6, 2); if (v.role === 'miner') rc(g, '#ffe27a', 1, -16, 2, 1) } }
  if (v.carry) { const c = v.carry.kind === 'wood' ? '#8a5a2b' : v.carry.kind === 'stone' ? '#aab2b8' : '#e0623a'; rc(g, c, -6, -10, 4, 3); rc(g, 'rgba(0,0,0,.25)', -6, -8, 4, 1) }
  if (v.preg > 0) rc(g, shirt, -4, -6, 8, 2);
  g.restore();
  let em = v.emote; if (v.fighting) em = '!'; else if (/Chat|Talk|Feast/.test(v.label)) em = '…'; else if (w.cold && s === 3) em = '*'; else if (v.hunger < 20) em = '?';
  if (em) { const hy = y - 18 * k - 2; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - 4, hy - 6, 8, 8); g.fillStyle = em === '!' ? '#d33' : em === '*' ? '#4a90d9' : '#333'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText(em, x, hy + 1); g.textAlign = 'left' }
}

/* ---------- main draw ---------- */
function render(w, sel, now) {
  const { W, H, T } = CFG, g = R.g, c = R.cam, z = c.z, d = R.dpr, key = w.seed + ':' + w.season;
  if (R.terrKey !== key) { buildTerrain(w); R.terrKey = key }
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0d1114'; g.fillRect(0, 0, R.cv.width, R.cv.height);
  const tlx = c.x - R.vw / (2 * z), tly = c.y - R.vh / (2 * z);
  g.setTransform(z * d, 0, 0, z * d, -tlx * z * d, -tly * z * d); g.imageSmoothingEnabled = false;
  g.drawImage(R.terr, 0, 0);
  const x0 = Math.max(0, Math.floor(tlx / T) - 2), x1 = Math.min(W - 1, Math.ceil((tlx + R.vw / z) / T) + 2), y0 = Math.max(0, Math.floor(tly / T) - 3), y1 = Math.min(H - 1, Math.ceil((tly + R.vh / z) / T) + 2);
  const t = w.tod; let dark = 0; if (t > 0.6 && t < 0.75) dark = (t - 0.6) / 0.15; else if (t >= 0.75 && t < 0.95) dark = 1; else if (t >= 0.95) dark = (1 - t) / 0.05;
  const tick = (now / 450) | 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x; if (w.terr[i] <= TERR.SHALLOW) { if ((hash2(x, y) + tick) % 13 === 0) rc(g, w.season === 3 ? '#fff' : 'rgba(255,255,255,.35)', x * T + (hash2(y, x) & 7), y * T + ((hash2(y, x) >> 3) & 7) + 3, 4, 1) }
    else if (w.road[i]) roadTile(g, w, x, y);
  }
  const rows = []; for (let y = y0; y <= y1 + 3; y++) rows[y] = [];
  const inView = (bx, by, bw, bh) => bx + bw >= x0 && bx <= x1 && by + bh >= y0 && by <= y1 + 3;
  for (const b of w.buildings.values()) { if (!inView(b.x, b.y, b.w, b.h)) continue; if (b.type === 'farm') farmArt(g, w, b); else rows[b.y + b.h - 1].push({ y: (b.y + b.h) * T, fn: () => drawBuilding(g, w, b, now, dark) }) }
  for (const bp of w.bps) if (inView(bp.x, bp.y, bp.w, bp.h)) bpArt(g, w, bp, now);
  for (const a of w.animals) { if (!a.alive) continue; const ty = Math.floor(a.y); if (rows[ty] && a.x / 1 >= x0 - 1 && a.x <= x1 + 1) rows[ty].push({ y: a.y * T, fn: () => drawAnimal(g, a, w, now, sel) }) }
  for (const v of w.vills) { const ty = Math.floor(v.y); if (rows[ty] && v.x >= x0 - 1 && v.x <= x1 + 1) rows[ty].push({ y: v.y * T, fn: () => drawVillager(g, v, w, now, sel) }) }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) if (w.feat[y * W + x]) drawFeature(g, w, x, y, now);
    const r = rows[y]; if (r && r.length) { r.sort((a, b) => a.y - b.y); for (const it of r) it.fn() }
  }
  if (sel instanceof Villager && sel.alive && sel.path.length) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sel.x * T, sel.y * T); for (const p of sel.path) g.lineTo((p % W + .5) * T, ((p / W | 0) + .5) * T); g.stroke() }
  if (sel && sel.type && sel.w) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(sel.x * T - .5, sel.y * T - .5, sel.w * T + 1, sel.h * T + 1) }
  // light & atmosphere (screen space)
  g.setTransform(d, 0, 0, d, 0, 0);
  const tint = [null, 'rgba(255,225,120,.04)', 'rgba(255,140,40,.05)', 'rgba(180,210,255,.05)'][w.season]; if (tint) { g.fillStyle = tint; g.fillRect(0, 0, R.vw, R.vh) }
  if (dark > 0) { g.fillStyle = `rgba(8,14,46,${0.55 * dark})`; g.fillRect(0, 0, R.vw, R.vh) }
  if (dark > 0.05) {
    g.save(); g.globalCompositeOperation = 'lighter'; const gl = (wx, wy, r, a) => { const sx = (wx - tlx) * z, sy = (wy - tly) * z, rr = r * z, gr = g.createRadialGradient(sx, sy, 2, sx, sy, rr); gr.addColorStop(0, `rgba(255,170,70,${a * dark})`); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(sx - rr, sy - rr, rr * 2, rr * 2) };
    for (const b of w.buildings.values()) { if (b.type === 'campfire') gl((b.x + .5) * T, (b.y + .5) * T, 90, 0.5 + 0.06 * Math.sin(now / 90)); else if (b.type === 'house' && b.occ.length && inView(b.x, b.y, b.w, b.h)) gl((b.x + 1) * T, (b.y + 1.2) * T, 26, 0.22) }
    g.restore();
  }
  if (w.season === 3) {
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (const p of R.snow) { p.y += p.s * 0.004 * (R.vh / 600 + 0.5); p.x += Math.sin(now / 1500 + p.d) * 0.0004 + 0.0003; if (p.y > 1) { p.y = -0.02; p.x = Math.random() } if (p.x > 1) p.x = 0; g.fillRect(p.x * R.vw, p.y * R.vh, 1.5 + p.s, 1.5 + p.s) }
  }
}
function drawMinimap(w, sel) {
  const m = R.mini; if (!m || !R.miniBase) return; const g = m.getContext('2d');
  g.drawImage(R.miniBase, 0, 0);
  for (const b of w.buildings.values()) { g.fillStyle = b.type === 'farm' ? '#d9b34a' : '#f4f0e0'; g.fillRect(b.x, b.y, b.w, b.h) }
  g.fillStyle = '#b99d6c'; for (let i = 0; i < w.road.length; i++) if (w.road[i]) g.fillRect(i % CFG.W, (i / CFG.W) | 0, 1, 1);
  for (const a of w.animals) if (a.alive && a.kind === 'wolf') { g.fillStyle = '#ff3b3b'; g.fillRect(a.x - 1, a.y - 1, 2, 2) }
  for (const v of w.vills) { g.fillStyle = v === sel ? '#fff' : '#ffe24a'; g.fillRect(v.x - 0.5, v.y - 0.5, 1.5, 1.5) }
  const c = R.cam, T = CFG.T; g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect((c.x - R.vw / (2 * c.z)) / T, (c.y - R.vh / (2 * c.z)) / T, R.vw / c.z / T, R.vh / c.z / T);
}
