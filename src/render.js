/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
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
  if (!R.terr || R.terr.width !== W * T || R.terr.height !== H * T) { R.terr = document.createElement('canvas'); R.terr.width = W * T; R.terr.height = H * T }
  if (R.mini) R.mini.style.height = Math.round(224 * H / W) + 'px';
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
    if (t === TERR.BRIDGE) {
      const stone = w.bridgeStone && w.bridgeStone.has(i), horiz = !isW(i - 1) || !isW(i + 1), deck = stone ? '#a9a9a2' : '#a07a4a', dk = stone ? '#7e7e78' : '#7a5a34';
      rc(g, P.shallow, X, Y, T, T);
      if (horiz) { rc(g, 'rgba(0,0,0,.18)', X, Y + 4, T, 11); rc(g, deck, X, Y + 2, T, 11); for (let k = 0; k < T; k += 4) rc(g, dk, X + k, Y + 2, 1, 11); rc(g, dk, X, Y + 2, T, 1); rc(g, dk, X, Y + 12, T, 1) }
      else { rc(g, 'rgba(0,0,0,.18)', X + 4, Y, 11, T); rc(g, deck, X + 2, Y, 11, T); for (let k = 0; k < T; k += 4) rc(g, dk, X + 2, Y + k, 11, 1); rc(g, dk, X + 2, Y, 1, T); rc(g, dk, X + 12, Y, 1, T) }
      continue;
    }
    if (t === TERR.FORD) {
      rc(g, P.shallow, X, Y, T, T); rc(g, P.sand, X + 2 + (h & 3), Y + 3, 6, 3); rc(g, P.sand, X + 8 + ((h >> 3) & 3), Y + 9, 5, 3); rc(g, 'rgba(255,255,255,.35)', X + ((h >> 6) & 7), Y + ((h >> 9) & 7) + 4, 5, 1); continue;
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
  const i = y * CFG.W + x;
  if (w.road[i] >= 3) {                       // paved slabs (3) and tarmac (4)
    const t4 = w.road[i] === 4; rc(g, s === 3 ? '#d8dcdf' : t4 ? '#4a4d52' : '#a2a6ab', X, Y, CFG.T, CFG.T);
    if (t4) { if ((x + y) % 5 === 0) rc(g, s === 3 ? '#fff' : '#d9d27a', X + 7, Y + 7, 2, 2); rc(g, 'rgba(255,255,255,.07)', X + (h & 7), Y + ((h >> 4) & 7), 4, 1) }
    else { for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) rc(g, s === 3 ? '#e9ecee' : (r + c) % 2 ? '#b6bbc0' : '#aab0b5', X + c * 8 + 1, Y + r * 8 + 1, 7, 7) }
    if (!w.road[i - 1]) rc(g, 'rgba(0,0,0,.16)', X, Y, 1, CFG.T); if (!w.road[i + 1]) rc(g, 'rgba(0,0,0,.16)', X + CFG.T - 1, Y, 1, CFG.T); return;
  }
  if (w.road[i] === 2) {                      // cobbled: set stones with mortar
    rc(g, s === 3 ? '#cfd3d6' : '#8f949a', X, Y, CFG.T, CFG.T);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const ox = (r % 2) * 3 + c * 5, hh = hash2(x * 3 + c, y * 4 + r); rc(g, s === 3 ? '#e6e9eb' : ['#a9aeb3', '#9ea3a8', '#b4b9be'][hh % 3], X + ox, Y + r * 4, 4, 3) }
    if (!w.road[i - 1]) rc(g, 'rgba(0,0,0,.14)', X, Y, 1, CFG.T); if (!w.road[i + 1]) rc(g, 'rgba(0,0,0,.14)', X + CFG.T - 1, Y, 1, CFG.T); return;
  }
  rc(g, s === 3 ? '#cbc9c0' : '#b99d6c', X, Y, CFG.T, CFG.T); rc(g, s === 3 ? '#b7b5ad' : '#a58a5b', X + (h & 11), Y + ((h >> 4) & 11), 3, 2); rc(g, s === 3 ? '#e8e6df' : '#cdb383', X + ((h >> 8) & 11), Y + ((h >> 12) & 11), 2, 1); if (!w.road[i - 1]) rc(g, 'rgba(0,0,0,.1)', X, Y, 1, CFG.T); if (!w.road[i + 1]) rc(g, 'rgba(0,0,0,.1)', X + CFG.T - 1, Y, 1, CFG.T);
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
function houseArtLate(g, w, b, night, now, st) {          // brick house, townhouse, apartment block
  const X = b.x * CFG.T, Y = b.y * CFG.T, s = w.season, lit = b.occ.length > 0, win = lit && night ? '#ffd76a' : '#9fc4d8';
  rc(g, 'rgba(0,0,0,.22)', X + 2, Y + 29, 30, 3);
  if (st === 3) {                                // brick: warm red courses, orange tiles, a chimney
    rc(g, '#a65a3e', X + 3, Y + 14, 26, 16); for (let r = 0; r < 5; r++) { rc(g, '#7d4230', X + 3, Y + 16 + r * 3, 26, 1); for (let c = 0; c < 6; c++) rc(g, '#7d4230', X + 3 + (r % 2 ? 2 : 0) + c * 4, Y + 14 + r * 3, 1, 3) }
    for (let r = 0; r < 12; r++) { const l = Math.round(9 - r * 9 / 11); rc(g, r % 3 === 2 ? '#9a4a24' : '#c2652e', X + l, Y + 2 + r, 32 - 2 * l, 1) } rc(g, '#7a3a1c', X, Y + 13, 32, 1);
    if (s === 3) for (let r = 0; r < 4; r++) { const l = Math.round(9 - r * 9 / 11); rc(g, '#fff', X + l, Y + 2 + r, 32 - 2 * l, 1) }
    rc(g, '#7a4a3a', X + 22, Y, 5, 8); rc(g, '#5b2f22', X + 22, Y, 5, 1);
    rc(g, '#4a2f1c', X + 13, Y + 21, 6, 9); rc(g, '#d8b56a', X + 17, Y + 25, 1, 1);
    for (const wx of [5, 22]) { rc(g, '#e9dfc8', X + wx - 1, Y + 18, 7, 7); rc(g, win, X + wx, Y + 19, 5, 5); rc(g, '#e9dfc8', X + wx + 2, Y + 19, 1, 5); rc(g, '#3f6a4a', X + wx - 2, Y + 18, 1, 7); rc(g, '#3f6a4a', X + wx + 6, Y + 18, 1, 7) }
  } else if (st === 4) {                         // townhouse: cream plaster, stone corners, slate mansard, dormer
    rc(g, '#e6dcc0', X + 3, Y + 10, 26, 20); rc(g, '#b9ae92', X + 3, Y + 10, 3, 20); rc(g, '#b9ae92', X + 26, Y + 10, 3, 20); for (let r = 0; r < 4; r++) rc(g, '#d6cbab', X + 6, Y + 14 + r * 5, 20, 1);
    for (let r = 0; r < 8; r++) { const l = Math.round(7 - r * 7 / 7); rc(g, r % 2 ? '#3f4b58' : '#4c5a69', X + l, Y + 2 + r, 32 - 2 * l, 1) } rc(g, '#2f3943', X + 1, Y + 9, 30, 2);
    rc(g, '#4c5a69', X + 12, Y + 3, 8, 6); rc(g, win, X + 14, Y + 4, 4, 4); rc(g, '#e6dcc0', X + 13, Y + 3, 6, 1); if (s === 3) rc(g, '#fff', X + 5, Y + 2, 22, 2);
    rc(g, '#5a3a22', X + 13, Y + 21, 6, 9); rc(g, '#cfc7ae', X + 12, Y + 19, 8, 2); rc(g, '#d8b56a', X + 17, Y + 25, 1, 1);
    for (const wx of [6, 21]) for (const wy of [13, 22]) { if (wy === 22 && wx === 13) continue; rc(g, '#8a7f66', X + wx - 1, Y + wy - 1, 7, 7); rc(g, win, X + wx, Y + wy, 5, 5); rc(g, '#8a7f66', X + wx + 2, Y + wy, 1, 5) }
    rc(g, '#6a6e72', X + 24, Y, 4, 5);
  } else if (st === 6) {                         // tower block: a tall slab of steel and glass rising above the tile
    const H = 40, top = Y + 30 - H; rc(g, 'rgba(0,0,0,.28)', X + 2, Y + 29, 30, 3);
    rc(g, '#6f7a85', X + 5, top, 22, H); rc(g, '#8b97a3', X + 5, top, 22, 2); rc(g, '#59636d', X + 25, top, 2, H); rc(g, '#59636d', X + 5, Y + 29, 22, 1);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) rc(g, lit && night && ((c * 3 + r + b.id) % 4 !== 0) ? '#ffd76a' : '#a9d0e6', X + 7 + c * 5, top + 4 + r * 5, 3, 3);
    rc(g, '#3d454d', X + 12, Y + 23, 8, 7); rc(g, '#d8b56a', X + 18, Y + 26, 1, 1); rc(g, '#4a525a', X + 14, top - 5, 2, 5); rc(g, '#cc5544', X + 14, top - 5, 2, 1);
    if (s === 3) rc(g, '#fff', X + 5, top - 1, 22, 2);
  } else {                                       // apartment block: concrete, ribbon windows, flat roof with a stack
    rc(g, '#a9adb1', X + 2, Y + 4, 28, 26); rc(g, '#8e9297', X + 2, Y + 4, 28, 2); rc(g, '#8e9297', X + 2, Y + 29, 28, 1);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { rc(g, '#5f656a', X + 4 + c * 6, Y + 8 + r * 7, 5, 5); rc(g, lit && night && ((c + r + b.id) % 3 !== 0) ? '#ffd76a' : '#9fc4d8', X + 5 + c * 6, Y + 9 + r * 7, 3, 3) }
    rc(g, '#4a4f54', X + 12, Y + 23, 8, 7); rc(g, '#d8b56a', X + 18, Y + 26, 1, 1); rc(g, '#6f747a', X + 22, Y, 4, 5); rc(g, '#4a4f54', X + 22, Y, 4, 1); rc(g, '#7e8388', X + 6, Y + 2, 7, 3);
    if (s === 3) rc(g, '#fff', X + 2, Y + 3, 28, 1);
  }
  if (st !== 6 && lit && (night || s === 3 || w.tod > 0.55)) for (let k = 0; k < 3; k++) { const t = ((now / 700) + k / 3) % 1; g.fillStyle = `rgba(210,210,215,${0.5 * (1 - t)})`; g.fillRect(X + 23 + Math.sin(t * 5 + k) * 2, Y - t * 10, 3 + t * 3, 3 + t * 3) }
}
function houseArt(g, w, b, night, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, s = w.season, lit = b.occ.length > 0, st = b.style || 0;
  if (st >= 3) return houseArtLate(g, w, b, night, now, st);
  rc(g, 'rgba(0,0,0,.22)', X + 2, Y + 29, 30, 3);
  if (st === 0) { rc(g, '#b88a58', X + 3, Y + 15, 26, 15); for (let i = 0; i < 5; i++) rc(g, '#9c7346', X + 3, Y + 18 + i * 3, 26, 1); rc(g, '#7a5632', X + 3, Y + 15, 1, 15); rc(g, '#7a5632', X + 28, Y + 15, 1, 15) }
  else if (st === 1) {                           // timber frame: plaster panels between dark beams
    const wd = '#5a3a22'; rc(g, '#e0d2b4', X + 3, Y + 15, 26, 15); rc(g, wd, X + 3, Y + 15, 26, 1); rc(g, wd, X + 3, Y + 22, 26, 1); rc(g, wd, X + 3, Y + 29, 26, 1);
    for (const px of [3, 10, 21, 27]) rc(g, wd, X + px, Y + 15, 2, 15); for (let i = 0; i < 6; i++) { rc(g, wd, X + 4 + i, Y + 16 + i, 1, 1); rc(g, wd, X + 26 - i, Y + 16 + i, 1, 1) }
  } else {                                       // dressed stone
    rc(g, '#9ea4aa', X + 3, Y + 15, 26, 15); for (let r = 0; r < 4; r++) { const y = Y + 15 + r * 4; rc(g, '#7b8186', X + 3, y + 3, 26, 1); for (let c = 0; c < 5; c++) rc(g, '#7b8186', X + 3 + (r % 2 ? 3 : 0) + c * 6, y, 1, 3) }
    rc(g, '#b9bfc4', X + 3, Y + 15, 26, 1); rc(g, '#6f757a', X + 3, Y + 29, 26, 1);
  }
  const pal = st === 0 ? (b.id % 3 === 0 ? ['#9a3b2c', '#7f2e22'] : b.id % 3 === 1 ? ['#7b4a2a', '#623a20'] : ['#4f6b7a', '#3d5461']) : st === 1 ? ['#b4553a', '#8f3f29'] : ['#566472', '#43505c'];
  const top = st === 1 ? 1 : 3, rows = st === 1 ? 15 : 13;
  for (let r = 0; r < rows; r++) { const l = Math.round(10 - r * 10 / (rows - 1)); rc(g, r % 3 === 2 ? pal[1] : pal[0], X + l, Y + top + r, 32 - 2 * l, 1) }
  rc(g, pal[1], X, Y + top + rows - 1, 32, 1); if (st === 2) { rc(g, '#2f3943', X + 11, Y + top, 10, 1); rc(g, '#6a7884', X + 4, Y + top + rows - 3, 24, 1) }
  if (s === 3) { for (let r = 0; r < 4; r++) { const l = Math.round(10 - r * 10 / (rows - 1)); rc(g, '#fff', X + l, Y + top + r, 32 - 2 * l, 1) } rc(g, '#eef3f6', X + 1, Y + top + rows - 1, 30, 1) }
  if (st === 2) { rc(g, '#8a9096', X + 21, Y, 5, 9); rc(g, '#6a7076', X + 21, Y, 5, 1) } else { rc(g, st === 1 ? '#8a4a3a' : '#7a7f85', X + 22, Y + 1, 4, 7); rc(g, '#5b6066', X + 22, Y + 1, 4, 1) }
  rc(g, '#5a3a22', X + 13, Y + 21, 6, 9); rc(g, '#d8b56a', X + 17, Y + 25, 1, 1); if (st === 2) { rc(g, '#5a3a22', X + 14, Y + 20, 4, 1); rc(g, '#7b8186', X + 12, Y + 20, 1, 10); rc(g, '#7b8186', X + 19, Y + 20, 1, 10) } if (st === 1) rc(g, '#7a5632', X + 12, Y + 19, 8, 2);
  const wc = lit && night ? '#ffd76a' : '#9fc4d8';
  for (const wx of [5, 22]) { const fr = st === 2 ? '#7b8186' : '#5a3a22'; rc(g, fr, X + wx - 1, Y + 18, 7, 7); rc(g, wc, X + wx, Y + 19, 5, 5); rc(g, fr, X + wx + 2, Y + 19, 1, 5); rc(g, fr, X + wx, Y + 21, 5, 1); if (st === 1) { rc(g, '#4a6a8a', X + wx - 2, Y + 18, 1, 7); rc(g, '#4a6a8a', X + wx + 6, Y + 18, 1, 7) } }
  if (lit && (night || s === 3 || w.tod > 0.55)) for (let k = 0; k < 3; k++) { const t = ((now / 700) + k / 3) % 1; g.fillStyle = `rgba(210,210,215,${0.5 * (1 - t)})`; g.fillRect(X + 22 + Math.sin(t * 5 + k) * 2, Y - t * 10, 3 + t * 3, 3 + t * 3) }
}
function storeArt(g, w, b, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, s = w.season;
  rc(g, 'rgba(0,0,0,.22)', X + 1, Y + 29, 31, 3);
  const st = Math.min(2, b.style || 0), wallC = ['#a88a5a', '#c9b182', '#9ea4aa'][st], lineC = ['#8d7248', '#8a6a42', '#7b8186'][st], roofC = [['#6b5a4a', '#52463a'], ['#8b4a3a', '#6f3a2d'], ['#566472', '#43505c']][st];
  rc(g, wallC, X + 2, Y + 13, 28, 17); for (let i = 0; i < 6; i++) rc(g, lineC, X + 2, Y + 16 + i * 3, 28, 1); if (st === 1) { for (const px of [2, 15, 28]) rc(g, '#5a3a22', X + px, Y + 13, 2, 17); rc(g, '#d9c48a', X + 21, Y + 16, 5, 4); rc(g, '#5a3a22', X + 21, Y + 16, 5, 1) }
  for (let r = 0; r < 11; r++) { const l = Math.round(8 - r * 8 / 10); rc(g, r % 3 === 2 ? roofC[1] : roofC[0], X + l, Y + 3 + r, 32 - 2 * l, 1) } rc(g, roofC[1], X, Y + 14, 32, 1);
  if (s === 3) for (let r = 0; r < 4; r++) { const l = Math.round(8 - r * 0.8); rc(g, '#fff', X + l, Y + 3 + r, 32 - 2 * l, 1) }
  rc(g, '#4b3a2a', X + 9, Y + 19, 14, 11); rc(g, '#3a2c20', X + 15, Y + 19, 2, 11); rc(g, '#6b5640', X + 9, Y + 19, 14, 1);
  const full = Math.min(1, w.stock.food / w.cap());
  if (full > 0.15) { rc(g, '#d9c48a', X + 3, Y + 25, 5, 5); rc(g, '#c4ad70', X + 3, Y + 25, 5, 1) } if (full > 0.45) { rc(g, '#d9c48a', X + 24, Y + 25, 5, 5); rc(g, '#c4ad70', X + 24, Y + 25, 5, 1) } if (full > 0.75) rc(g, '#d9c48a', X + 24, Y + 21, 5, 4);
  rc(g, '#7a5a30', X + 1, Y + 26, 3, 4); rc(g, '#4a3a20', X + 1, Y + 27, 3, 1);
}
function logcampArt(g, w, b, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T;
  rc(g, 'rgba(0,0,0,.2)', X + 1, Y + 29, 31, 3); rc(g, '#7a5f3c', X + 1, Y + 14, 30, 16); rc(g, '#6b5232', X + 4, Y + 20, 8, 3); rc(g, '#8a6e48', X + 18, Y + 26, 10, 2);
  for (const [lx, ly, lw] of [[2, 25, 14], [3, 21, 12], [5, 17, 9]]) { rc(g, '#7a4a22', X + lx, Y + ly, lw, 4); rc(g, '#9a6632', X + lx, Y + ly, lw, 1); rc(g, '#d9b27a', X + lx, Y + ly + 1, 2, 2); rc(g, '#d9b27a', X + lx + lw - 2, Y + ly + 1, 2, 2) }
  rc(g, '#5a3d22', X + 19, Y + 11, 2, 16); rc(g, '#5a3d22', X + 29, Y + 15, 2, 12);
  for (let i = 0; i < 14; i++) { rc(g, i % 3 === 0 ? '#8a7a5a' : '#a89268', X + 18 + i, Y + 9 + Math.floor(i * 0.45), 1, 3) }
  rc(g, '#c9b182', X + 21, Y + 21, 7, 5); rc(g, '#a89268', X + 21, Y + 21, 7, 1);
  rc(g, '#6b4a2a', X + 14, Y + 24, 4, 5); rc(g, '#8a8f95', X + 13, Y + 20, 1, 6); rc(g, '#a9aeb3', X + 12, Y + 19, 3, 2);
  if (w.season === 3) { rc(g, '#fff', X + 18, Y + 9, 14, 1); rc(g, '#fff', X + 5, Y + 16, 9, 1) }
}
function minecampArt(g, w, b, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T;
  rc(g, 'rgba(0,0,0,.2)', X + 1, Y + 29, 31, 3); rc(g, '#6f6a62', X + 1, Y + 15, 30, 15);
  rc(g, '#7d8288', X + 3, Y + 1, 21, 9); rc(g, '#9aa0a6', X + 3, Y + 1, 21, 2); rc(g, '#6b7076', X + 5, Y + 6, 17, 3);
  rc(g, '#5a3d22', X + 6, Y + 8, 2, 14); rc(g, '#5a3d22', X + 17, Y + 8, 2, 14); rc(g, '#6b4a2a', X + 5, Y + 7, 15, 2); rc(g, '#17130f', X + 8, Y + 10, 9, 12);
  rc(g, '#3a3028', X + 8, Y + 10, 9, 1); rc(g, '#4a4038', X + 10, Y + 22, 20, 1); rc(g, '#4a4038', X + 10, Y + 25, 20, 1); for (let i = 0; i < 6; i++) rc(g, '#6b4a2a', X + 11 + i * 3, Y + 22, 1, 4);
  rc(g, '#7a5232', X + 19, Y + 18, 9, 6); rc(g, '#9a6a3a', X + 19, Y + 18, 9, 1); rc(g, '#aab2b8', X + 20, Y + 16, 7, 3); rc(g, '#c4cacf', X + 21, Y + 16, 3, 1); rc(g, '#222', X + 20, Y + 24, 2, 2); rc(g, '#222', X + 26, Y + 24, 2, 2);
  rc(g, '#8a9096', X + 2, Y + 24, 5, 5); rc(g, '#aab0b6', X + 2, Y + 24, 5, 1); rc(g, '#8a9096', X + 5, Y + 26, 5, 3); rc(g, '#ffe27a', X + 6, Y + 6, 2, 1);
  if (w.season === 3) rc(g, '#fff', X + 3, Y + 1, 21, 1);
}
function lodgeArt(g, w, b, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T;
  rc(g, 'rgba(0,0,0,.2)', X + 1, Y + 29, 31, 3); rc(g, '#8b6b45', X + 4, Y + 15, 18, 15); for (let i = 0; i < 4; i++) rc(g, '#6f5436', X + 4, Y + 18 + i * 3, 18, 1);
  for (let r = 0; r < 13; r++) { const l = Math.round(6 - r * 6 / 12); rc(g, r % 2 ? '#c4a24a' : '#b8963e', X + 1 + l, Y + 3 + r, 24 - 2 * l, 1) } rc(g, '#8a6a2a', X + 1, Y + 15, 24, 1);
  rc(g, '#3e2c1c', X + 10, Y + 21, 6, 9); rc(g, '#d9cdb0', X + 9, Y + 18, 1, 3); rc(g, '#d9cdb0', X + 8, Y + 17, 1, 2); rc(g, '#d9cdb0', X + 16, Y + 18, 1, 3); rc(g, '#d9cdb0', X + 17, Y + 17, 1, 2); rc(g, '#d9cdb0', X + 10, Y + 19, 6, 1);
  rc(g, '#5a3d22', X + 25, Y + 14, 2, 15); rc(g, '#5a3d22', X + 30, Y + 14, 2, 15); rc(g, '#5a3d22', X + 25, Y + 14, 7, 1); rc(g, '#b98a5a', X + 26, Y + 15, 4, 7); rc(g, '#a07a4a', X + 26, Y + 15, 4, 1); rc(g, '#c9a070', X + 28, Y + 17, 3, 5);
  if (w.season !== 1 || w.tod > 0.55) for (let k = 0; k < 2; k++) { const t = ((now / 800) + k / 2) % 1; g.fillStyle = `rgba(200,200,205,${0.5 * (1 - t)})`; g.fillRect(X + 11 + Math.sin(t * 4 + k) * 2, Y + 1 - t * 9, 3 + t * 2, 3 + t * 2) }
  if (w.season === 3) rc(g, '#fff', X + 5, Y + 3, 16, 1);
}
function dockArt(g, w, b, now) {
  const T = CFG.T, X = b.x * T, Y = b.y * T, [ux, uy] = b.dir || [1, 0], len = 3 * T;
  const plank = (x, y, wd, ht) => { rc(g, '#8a6a42', x, y, wd, ht); if (wd > ht) for (let i = 3; i < wd; i += 4) rc(g, '#6b4f30', x + i, y, 1, ht); else for (let i = 3; i < ht; i += 4) rc(g, '#6b4f30', x, y + i, wd, 1) };
  if (ux !== 0) { const x0 = ux > 0 ? X : X - 2 * T; plank(x0, Y + 5, len, 6); for (const px of [x0 + 2, x0 + len - 4]) { rc(g, '#4a3220', px, Y + 3, 2, 3); rc(g, '#4a3220', px, Y + 11, 2, 3) } }
  else { const y0 = uy > 0 ? Y : Y - 2 * T; plank(X + 5, y0, 6, len); for (const py of [y0 + 2, y0 + len - 4]) { rc(g, '#4a3220', X + 3, py, 3, 2); rc(g, '#4a3220', X + 11, py, 3, 2) } }
  const tier = b.tier || 1;
  if (tier >= 2) { const sx = ux !== 0 ? X - ux * 14 : X + 16, sy = ux !== 0 ? Y - 10 : Y - uy * 14 - 4; rc(g, 'rgba(0,0,0,.2)', sx, sy + 17, 22, 3); rc(g, '#9a8a6a', sx, sy + 5, 22, 12); rc(g, '#7a6a4a', sx - 1, sy + 2, 24, 4); rc(g, '#5a3d22', sx + 9, sy + 9, 5, 8); rc(g, '#c8b88a', sx + 2, sy + 8, 4, 4); rc(g, '#c8b88a', sx + 16, sy + 8, 4, 4); if (b.upg) rc(g, '#e8c84a', sx + 8, sy - 2, 6, 3) }
  if (tier >= 3) { const cx = ux !== 0 ? X + ux * 26 : X - 14, cy = ux !== 0 ? Y - 14 : Y + uy * 20; rc(g, '#4a4a52', cx, cy - 8, 3, 18); rc(g, '#4a4a52', cx - 8, cy - 8, 14, 3); rc(g, '#8a5a2a', cx - 8, cy - 5, 2, 7); rc(g, '#9a6a36', cx + 4, cy + 8, 6, 5); rc(g, '#b88444', cx + 10, cy + 10, 5, 4) }
  if (w.season === 3) { if (ux !== 0) rc(g, 'rgba(255,255,255,.8)', ux > 0 ? X : X - 2 * T, Y + 5, len, 1); else rc(g, 'rgba(255,255,255,.8)', X + 5, uy > 0 ? Y : Y - 2 * T, 1, len) }
}
function drawBoat(g, bt, w, now) {
  if (bt.kind === 'cargo' || bt.kind === 'carrack' || bt.kind === 'barge') { shipArt(g, bt.x * CFG.T, bt.y * CFG.T, bt.dir, now, bt.kind === 'carrack' ? '#2f7a4a' : bt.kind === 'barge' ? '#8a6a3a' : '#4a8a6a'); if (bt.hold && Object.values(bt.hold).some(v => v > 0)) { const x = Math.round(bt.x * CFG.T), y = Math.round(bt.y * CFG.T); rc(g, '#9a6a36', x - 7 * bt.dir, y - 6, 5, 4); rc(g, '#b88444', x - 1 * bt.dir, y - 6, 5, 4); rc(g, '#7a5a30', x - 4 * bt.dir, y - 9, 5, 3) } return }
  const T = CFG.T, x = Math.round(bt.x * T), y = Math.round(bt.y * T), nav = w.has('navigation'), bob = Math.round(Math.sin(now / 420 + bt.id) * 1);
  rc(g, 'rgba(255,255,255,.35)', x - 11, y + 3 + bob, 22, 1); if (bt.state === 'out') { rc(g, 'rgba(255,255,255,.3)', x - 13 * bt.dir, y + 1 + bob, 6, 1); rc(g, 'rgba(255,255,255,.2)', x - 16 * bt.dir, y + 3 + bob, 5, 1) }
  g.save(); g.translate(x, y + bob); g.scale(bt.dir, 1);
  rc(g, '#6b4426', -9, -2, 18, 4); rc(g, '#7a5230', -8, -3, 16, 1); rc(g, '#8f6338', -9, -3, 1, 1); rc(g, '#8f6338', 9, -4, 1, 2); rc(g, '#3e2a18', -7, 0, 14, 1); rc(g, '#a07a4a', -8, -4, 16, 1);
  if (nav) { rc(g, '#5a3d22', 0, -15, 1, 12); for (let i = 0; i < 9; i++) rc(g, i % 2 ? '#f0ece0' : '#fbf8ef', 1, -14 + i, 8 - Math.floor(i * 0.7), 1) } else if (bt.state === 'out') { rc(g, '#5a3d22', -3, -4, 1, 1); rc(g, '#8a6a42', -7, -2, 6, 1) }
  g.restore();
}
function marketArt(g, w, b, now) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, E = w.econ;
  rc(g, w.season === 3 ? '#d8d4c8' : '#b9a47a', X, Y, 48, 32); for (let i = 0; i < 9; i++) rc(g, w.season === 3 ? '#c8c4b8' : '#a8935f', X + 3 + (i * 11) % 44, Y + 4 + (i * 7) % 26, 3, 2);
  const stalls = [['#c8443c', '#f0e6d0'], ['#3c6fb4', '#f0e6d0'], ['#4a9a4a', '#e8d878']];
  stalls.forEach(([c1, c2], i) => {
    const sx = X + 2 + i * 15;
    rc(g, '#5a3d22', sx + 1, Y + 8, 2, 16); rc(g, '#5a3d22', sx + 11, Y + 8, 2, 16);
    for (let k = 0; k < 14; k++) rc(g, k % 2 ? c2 : c1, sx + k, Y + 3, 1, 6); for (let k = 0; k < 14; k += 2) rc(g, c1, sx + k, Y + 9, 2, 2);
    rc(g, '#8a6a42', sx + 1, Y + 17, 12, 4); rc(g, '#6b4f30', sx + 1, Y + 20, 12, 1);
    if (i === 0) { for (const [dx, dy] of [[2, 15], [5, 14], [8, 15], [10, 14]]) rc(g, '#d9433c', sx + dx, Y + dy, 2, 3) } else if (i === 1) { rc(g, '#9aa0a6', sx + 2, Y + 15, 4, 3); rc(g, '#7b8186', sx + 7, Y + 14, 5, 4); rc(g, '#8a5a2b', sx + 3, Y + 12, 7, 3) } else { rc(g, '#e6c04a', sx + 2, Y + 14, 4, 4); rc(g, '#e6c04a', sx + 8, Y + 14, 4, 4); rc(g, '#c4a02a', sx + 2, Y + 17, 10, 1) }
    rc(g, '#7a5232', sx + 2, Y + 22, 5, 5); rc(g, '#7a5232', sx + 8, Y + 23, 5, 4);
  });
  if (w.has('coinage')) { rc(g, '#5a3d22', X + 22, Y - 1, 1, 6); rc(g, '#ffd24a', X + 20, Y - 5, 5, 5); rc(g, '#c9a22a', X + 21, Y - 4, 3, 3) }
  if (E.caravan && !E.caravan.sea) {                           // a visiting merchant's wagon
    const wx = X + 34, wy = Y + 22; rc(g, 'rgba(0,0,0,.2)', wx - 1, wy + 8, 16, 2); rc(g, '#7a4a28', wx, wy + 2, 14, 5); rc(g, '#e8e0c8', wx + 1, wy - 3, 12, 5); rc(g, '#d8d0b8', wx + 2, wy - 4, 10, 1); rc(g, '#222', wx + 1, wy + 6, 3, 3); rc(g, '#222', wx + 10, wy + 6, 3, 3);
    rc(g, '#6a4a2a', wx - 6, wy + 3, 6, 4); rc(g, '#6a4a2a', wx - 7, wy + 1, 2, 3); rc(g, '#3a2a1a', wx - 6, wy + 7, 1, 2); rc(g, '#3a2a1a', wx - 2, wy + 7, 1, 2);
  }
}
function shipArt(g, x, y, dir, now, flag) {
  const bob = Math.round(Math.sin(now / 520) * 1); g.save(); g.translate(Math.round(x), Math.round(y) + bob); g.scale(dir, 1);
  rc(g, 'rgba(255,255,255,.3)', -16, 5, 32, 1);
  rc(g, '#5a3a20', -15, -2, 30, 6); rc(g, '#7a5230', -14, -3, 28, 1); rc(g, '#8f6338', 14, -5, 2, 3); rc(g, '#3e2a18', -13, 2, 26, 1); rc(g, '#c9a070', -10, -2, 3, 2); rc(g, '#c9a070', -2, -2, 3, 2); rc(g, '#c9a070', 6, -2, 3, 2);
  rc(g, '#4a3220', -6, -22, 1, 20); rc(g, '#4a3220', 5, -19, 1, 17);
  for (let i = 0; i < 11; i++) rc(g, i % 2 ? '#e8e2d0' : '#f6f2e6', -5, -21 + i, 10 - (i > 8 ? 2 : 0), 1); for (let i = 0; i < 8; i++) rc(g, i % 2 ? '#e8e2d0' : '#f6f2e6', 6, -18 + i, 7, 1);
  rc(g, flag || '#c8443c', -6, -24, 4, 2); if (flag) { rc(g, flag, -6, -26, 6, 3); rc(g, flag, -4, -14, 3, 7) } g.restore();
}
function campfireArt(g, w, b, now, dark) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, f = ((now / 110) | 0) % 3;
  if (!R.hasPlaza) { rc(g, '#6a4a2a', X - 11, Y + 5, 3, 9); rc(g, '#7a5a34', X - 10, Y + 5, 1, 9); rc(g, '#6a4a2a', X + 24, Y + 5, 3, 9); rc(g, '#7a5a34', X + 25, Y + 5, 1, 9); rc(g, '#6a4a2a', X + 2, Y + 20, 12, 3); rc(g, '#7a5a34', X + 2, Y + 20, 12, 1) }   // log benches round the fire
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
  if (bp.type === 'bridge') { const need = bp.cost.wood + bp.cost.stone, have = bp.have.wood + bp.have.stone, f = (need ? have / need : 1) * 0.5 + bp.prog / bp.time * 0.5; rc(g, 'rgba(160,122,74,.55)', X + 2, Y + 2, Wd - 4, Ht - 4); rc(g, '#000', X + 1, Y + Ht - 4, Wd - 2, 3); rc(g, '#ffd45a', X + 1, Y + Ht - 4, (Wd - 2) * f, 3); return }
  const need = bp.cost.wood + bp.cost.stone, have = bp.have.wood + bp.have.stone, f = (need ? have / need : 1) * 0.5 + bp.prog / bp.time * 0.5;
  rc(g, '#000', X + 1, Y + Ht - 4, Wd - 2, 3); rc(g, '#ffd45a', X + 1, Y + Ht - 4, (Wd - 2) * f, 3);
  if (bp.type === 'upgrade') { rc(g, '#a07a4a', X, Y, 2, Ht); rc(g, '#a07a4a', X + Wd - 2, Y, 2, Ht); for (let k = 4; k < Ht; k += 8) rc(g, '#8a6a42', X, Y + k, Wd, 1) }
  if (bp.prog > 0 && bp.type !== 'upgrade') { const hgt = Math.round(Ht * 0.6 * bp.prog / bp.time); rc(g, 'rgba(150,110,70,.75)', X + 3, Y + Ht - 6 - hgt, Wd - 6, hgt) }
}
function drawBuilding(g, w, b, now, dark) {
  if (b.type === 'house') houseArt(g, w, b, dark > 0.3, now); else if (b.type === 'store') storeArt(g, w, b, now); else if (b.type === 'campfire') campfireArt(g, w, b, now, dark); else if (b.type === 'logcamp') logcampArt(g, w, b, now); else if (b.type === 'minecamp') minecampArt(g, w, b, now); else if (b.type === 'lodge') lodgeArt(g, w, b, now); else if (PROJECTS[b.type]) projectArt(g, w, b, now, dark); else if (b.type === 'tavern') tavernArt(g, w, b, now, dark); else if (b.type === 'workshop') workshopArt(g, w, b, now, dark);
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
/* personal space (drawing only): villagers standing or walking close together are eased apart so nobody is stacked on one spot */
function separateVillagers(w) {
  const vs = w.vills, grid = new Map();
  for (const v of vs) { v._tx = 0; v._ty = 0; if (v.sleeping || v.boat) continue; const k = Math.floor(v.y) * 4096 + Math.floor(v.x); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(v) }
  for (const [k, a] of grid) {
    const gy = Math.floor(k / 4096), gx = k % 4096;
    for (let dy = 0; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dy === 0 && dx < 0) continue; const b = dy === 0 && dx === 0 ? a : grid.get((gy + dy) * 4096 + gx + dx); if (!b) continue;
      for (let i = 0; i < a.length; i++) for (let j = b === a ? i + 1 : 0; j < b.length; j++) {
        const p = a[i], q = b[j]; let ex = p.x - q.x, ey = p.y - q.y, d = Math.hypot(ex, ey); if (d >= 0.5) continue;
        if (d < 0.02) { const ang = (p.id * 2.399 + q.id) % 6.283; ex = Math.cos(ang); ey = Math.sin(ang); d = 0.02 } const push = (0.5 - d) * 0.5 / d;
        p._tx += ex * push; p._ty += ey * push * 0.6; q._tx -= ex * push; q._ty -= ey * push * 0.6;
      }
    }
  }
  for (const v of vs) { const tx = Math.max(-0.3, Math.min(0.3, v._tx)), ty = Math.max(-0.18, Math.min(0.18, v._ty)); v.sx = (v.sx || 0) + (tx - (v.sx || 0)) * 0.15; v.sy = (v.sy || 0) + (ty - (v.sy || 0)) * 0.15 }
}
/* the townsfolk beyond the villagers in play: little figures at their doors, spread over the houses; they carry no names and cannot be selected */
function drawCrowd(g, w, inView, T, now) {
  const C = w.crowd, hs = w.houses(); if (!hs.length) return;
  const per = C.n / hs.length, coat = ['#5b7fb5', '#b5655b', '#6a9b5a', '#8a6ab0', '#c99a4a', '#5b9ba5'], skin = ['#e8c9a4', '#c99a74', '#8d6240'];
  for (const h of hs) {
    if (!inView(h.x, h.y, h.w, h.h)) continue;
    const k = Math.min(8, Math.max(0, Math.round(per + ((h.id * 7919) % 5 - 2) * 0.3)));
    for (let i = 0; i < k; i++) {
      const s = (h.id * 31 + i * 17) % 97, ph = ((now / 700) + s) % 6.283, bob = Math.abs(Math.sin(ph)) < 0.35 ? 1 : 0, small = (s % 7) === 0 ? 2 : 0;
      const ax = Math.round((h.x + h.w / 2 + ((s % 9) - 4) * 0.34 + Math.sin(ph * 0.4) * 0.15) * T), ay = Math.round((h.y + h.h + 0.5 + (((s / 9) | 0) % 4) * 0.3) * T) - bob;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(ax - 2, ay + 1, 5, 1);
      g.fillStyle = '#3a3a4a'; g.fillRect(ax - 1, ay - 2, 1, 3); g.fillRect(ax + 1, ay - 2, 1, 3);
      g.fillStyle = coat[s % 6]; g.fillRect(ax - 2, ay - 7 + small, 5, 5 - small);
      g.fillStyle = skin[(s >> 3) % 3]; g.fillRect(ax - 1, ay - 10 + small, 3, 3);
    }
  }
}
function drawVillager(g, v, w, now, sel) {
  const x = Math.round((v.x + (v.sx || 0)) * CFG.T), y = Math.round((v.y + (v.sy || 0)) * CFG.T), st = v.stage(), k = { infant: 0.5, child: 0.7, youth: 0.88, adult: 1, elder: 0.96 }[st], s = w.season;
  if (!v.boat) rc(g, 'rgba(0,0,0,.22)', x - 4 * k, y - 1, 8 * k, 2);
  if (sel === v) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, 7, 3.5, 0, 0, 7); g.stroke() }
  const shirt = (v.sex === 'f' ? SHIRTS_F : SHIRTS_M)[v.look % 5], skin = SKIN[(v.look >> 3) % 5], hair = st === 'elder' ? '#b9bdc2' : HAIR[(v.look >> 5) % 6], gcol = R.gcol && R.gcol.get(v.group);
  g.save(); g.translate(x, y); g.scale(v.dir * k, k);
  if (v.sleeping) {
    rc(g, '#8a6a4a', -6, -3, 12, 3); rc(g, shirt, -5, -6, 7, 4); rc(g, skin, 3, -6, 4, 4); rc(g, hair, 3, -7, 4, 2); g.restore();
    const t = (now / 500) % 3; g.fillStyle = '#fff'; g.font = '6px sans-serif'; g.fillText('z', x + 4 + t, y - 9 - t * 2); return;
  }
  const mv = v.cur && v.cur.type === 'go' && v.path.length > 0, ph = mv ? ((now / 140) | 0) % 2 : 0, work = v.cur && v.cur.type === 'work' && !v.fighting && v.label !== 'Idling' && !/Chat|Talk|Feast|Eat|Hid/.test(v.label), sw = work ? ((now / 160) | 0) % 2 : 0;
  if (mv && ph && !v.boat) g.translate(0, -0.7);
  if (v.boat) g.translate(0, 2); else { rc(g, '#3b3f4a', -2, -4, 2, 4 - (ph ? 1 : 0)); rc(g, '#3b3f4a', 1, -4, 2, 4 - (ph ? 0 : 1)) }
  rc(g, shirt, -3, -9, 6, 6); rc(g, 'rgba(0,0,0,.15)', -3, -4, 6, 1); if (s === 3) rc(g, '#e8edf0', -3, -9, 6, 1);
  rc(g, skin, -4, -8 + (ph ? 1 : 0), 1, 3); rc(g, skin, 3, -8 - (work ? sw * 2 : (ph ? 0 : 1)), 1, 3);
  rc(g, skin, -2, -13, 5, 5); rc(g, hair, -2, -14, 5, 2); rc(g, hair, -3, -13, 1, 3); rc(g, '#222', 1, -11, 1, 1);
  if (gcol) { rc(g, gcol, -4, -9, 2, 2); rc(g, 'rgba(0,0,0,.25)', -4, -7, 2, 1) }
  const hc = HATS[v.role]; if (hc && v.age >= CFG.CHILD_DAYS) { if (v.role === 'farmer' || v.role === 'fisher') { rc(g, hc, -4, -14, 9, 1); rc(g, hc, -2, -16, 5, 2) } else if (v.role === 'hunter') { rc(g, hc, -3, -15, 6, 3); rc(g, hc, -3, -12, 1, 3) } else { rc(g, hc, -3, -15, 6, 2); if (v.role === 'miner') rc(g, '#ffe27a', 1, -16, 2, 1) } }
  const sr = w.war && w.war.rolls && w.war.rolls[v.id]; if (sr && UNITS[sr.t] && v.age >= CFG.CHILD_DAYS) { const tr = UNITS[sr.t].tier, hm = ['#7a5a3a', '#8b9096', '#9aa0a6', '#b9bfc6', '#c7ccd1', '#3a3f4a'][tr]; rc(g, hm, -3, -15, 6, 2); rc(g, hm, -3, -14, 1, 3); rc(g, 'rgba(255,255,255,.35)', -2, -15, 2, 1); rc(g, '#5a3d22', 6, -18, 1, 15); rc(g, tr >= 3 ? '#d7dbe0' : '#a9a39a', 5, -21, 3, 3) }
  if ((v.trade || v.side) && !v.carry && v.jobKind === 'craft' && v.age >= CFG.CHILD_DAYS) {
    const L = tradeLook(w, v);
    if (L) { rc(g, L[2], -3, -7, 6, 3); if (work) { rc(g, '#6b4f36', 5, -3, 7, 3); rc(g, L[1], 5, -4, 7, 1); rc(g, 'rgba(0,0,0,.25)', 6, -1, 1, 1); rc(g, 'rgba(0,0,0,.25)', 10, -1, 1, 1); const [shape, col] = L; if (shape === 'hammer') { rc(g, '#7a5a3a', 4, -11, 1, 4); rc(g, col, 3, -12, 3, 2) } else if (shape === 'needle') { rc(g, col, 4, -10, 3, 1); rc(g, '#d34', 7, -10, 1, 1) } else if (shape === 'pot') { rc(g, col, 4, -9, 3, 3); rc(g, 'rgba(0,0,0,.25)', 4, -7, 3, 1) } else if (shape === 'loaf') { rc(g, col, 4, -9, 4, 2) } else if (shape === 'book') { rc(g, col, 4, -10, 3, 3); rc(g, '#3f6fb0', 4, -10, 1, 3) } else if (shape === 'cross') { rc(g, col, 5, -11, 1, 4); rc(g, col, 4, -10, 3, 1) } else if (shape === 'gem') { rc(g, col, 5, -10, 2, 2); rc(g, '#fff', 5, -10, 1, 1) } else if (shape === 'spear') { rc(g, '#7a5a3a', 5, -15, 1, 9); rc(g, col, 4, -17, 3, 2) } else if (shape === 'coin') { rc(g, col, 4, -9, 3, 3) } else if (shape === 'note') { rc(g, col, 5, -12, 1, 4); rc(g, col, 6, -12, 2, 1) } else if (shape === 'heart') { rc(g, col, 4, -11, 2, 1); rc(g, col, 6, -11, 2, 1); rc(g, col, 4, -10, 4, 2) } else { rc(g, col, 4, -9, 3, 3) } } }
  }
  if (v.carry) { const c = v.carry.kind === 'wood' ? '#8a5a2b' : v.carry.kind === 'stone' ? '#aab2b8' : '#e0623a'; rc(g, c, -6, -10, 4, 3); rc(g, 'rgba(0,0,0,.25)', -6, -8, 4, 1) }
  if (v.preg > 0) rc(g, shirt, -4, -6, 8, 2);
  if (R.crown && R.crown.has(v.id)) { rc(g, '#ffd24a', -2, -18, 5, 1); rc(g, '#ffd24a', -2, -19, 1, 1); rc(g, '#ffd24a', 0, -20, 1, 2); rc(g, '#ffd24a', 2, -19, 1, 1) }
  if (st === 'elder') rc(g, '#8a6a4a', 4, -8, 1, 8);
  g.restore();
  let em = v.emote; if (v.fighting) em = '!'; else if (/Chat|Talk|Feast/.test(v.label)) em = '…'; else if (w.cold && s === 3) em = '*'; else if (v.hunger < 20) em = '?';
  if (em && em !== '!' && sel !== v) em = null;          // the small emote box is for the selected villager (bubbles say the rest); alarms stay for all
  if (em && !(R.vo && R.vo.prev.has(v.id))) { const hy = y - 18 * k - 2; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - 4, hy - 6, 8, 8); g.fillStyle = em === '!' ? '#d33' : em === '*' ? '#4a90d9' : '#333'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText(em, x, hy + 1); g.textAlign = 'left' }
}

/* ---------- main draw ---------- */
function render(w, sel, now) {
  const { W, H, T } = CFG, g = R.g, c = R.cam, z = c.z, d = R.dpr, key = w.seed + ':' + w.arch + ':' + w.season + ':' + W + ':' + (w.terrVer || 0);
  if (R.terrKey !== key) { buildTerrain(w); R.terrKey = key }
  R.hasPlaza = w.of('plaza').length > 0;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0d1114'; g.fillRect(0, 0, R.cv.width, R.cv.height);
  const tlx = c.x - R.vw / (2 * z), tly = c.y - R.vh / (2 * z);
  g.setTransform(z * d, 0, 0, z * d, -tlx * z * d, -tly * z * d); g.imageSmoothingEnabled = false;
  g.drawImage(R.terr, 0, 0);
  if (w.neigh) for (const n of w.neigh) if (n.found && Math.abs(n.x * T - c.x) < R.vw / z && Math.abs(n.y * T - c.y) < R.vh / z) neighArt(g, w, n, now);
  if (w.out) for (const o of w.out.list) if (o.state === 'active' && Math.abs(o.x * T - c.x) < R.vw / z + 60 && Math.abs(o.y * T - c.y) < R.vh / z + 60) outpostArt(g, w, o, now);
  if (w.disc) for (const s of w.disc.sites) if (s.known && !s.done && Math.abs(s.x * T - c.x) < R.vw / z + 40 && Math.abs(s.y * T - c.y) < R.vh / z + 40) siteMark(g, s, now);
  const x0 = Math.max(0, Math.floor(tlx / T) - 2), x1 = Math.min(W - 1, Math.ceil((tlx + R.vw / z) / T) + 2), y0 = Math.max(0, Math.floor(tly / T) - 3), y1 = Math.min(H - 1, Math.ceil((tly + R.vh / z) / T) + 2);
  const t = w.tod; let dark = 0; if (t > 0.6 && t < 0.75) dark = (t - 0.6) / 0.15; else if (t >= 0.75 && t < 0.95) dark = 1; else if (t >= 0.95) dark = (1 - t) / 0.05;
  const tick = (now / 450) | 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x; if (w.terr[i] <= TERR.SHALLOW) { if ((hash2(x, y) + tick) % 13 === 0) rc(g, w.season === 3 ? '#fff' : 'rgba(255,255,255,.35)', x * T + (hash2(y, x) & 7), y * T + ((hash2(y, x) >> 3) & 7) + 3, 4, 1) }
    else if (w.road[i]) roadTile(g, w, x, y);
  }
  if (R.lvShow && w._lv) lvOverlay(g, w, x0, x1, y0, y1);
  if (R.distShow) distOverlay(g, w, x0, x1, y0, y1);
  R.gcol = new Map(w.groups.map(gr => [gr.id, gr.color])); R.crown = new Set(w.gov.council.map(c => c.id));
  for (const sc of w.scars) if (w.tick < sc.until && inViewR(sc, x0, x1, y0, y1)) scarArt(g, sc, w);
  const rows = []; for (let y = y0; y <= y1 + 3; y++) rows[y] = [];
  const inView = (bx, by, bw, bh) => bx + bw >= x0 && bx <= x1 && by + bh >= y0 && by <= y1 + 3;
  for (const b of w.buildings.values()) { if (!inView(b.x, b.y, b.w, b.h)) continue; if (b.type === 'farm') farmArt(g, w, b); else if (b.type === 'dock') dockArt(g, w, b, now); else if (b.type === 'market') marketArt(g, w, b, now); else if (b.type === 'plaza') plazaArt(g, w, b, now, dark); else { const rr = rows[Math.max(y0, Math.min(y1 + 3, b.y + b.h - 1))]; if (rr) rr.push({ y: (b.y + b.h) * T, fn: () => { drawBuilding(g, w, b, now, dark); wearArt(g, b, now) } }) } }
  for (const bp of w.bps) if (inView(bp.x, bp.y, bp.w, bp.h)) bpArt(g, w, bp, now);
  if (w.crowd && w.crowd.n > 0) drawCrowd(g, w, inView, T, now);
  const vflag = visitorFlag(w); separateVillagers(w);
  if ((w.econ.caravan && w.econ.caravan.sea) || w.visit) for (const d of w.of('dock')) { const bt = w.boats.find(x => x.dock === d.id); if (!bt || !d.dir) continue; const sx = bt.mx + d.dir[0] * 2.2, sy = bt.my + d.dir[1] * 2.2, ty = Math.floor(sy); if (rows[ty]) rows[ty].push({ y: sy * T - 1, fn: () => shipArt(g, sx * T, sy * T, d.dir[0] >= 0 ? 1 : -1, now, vflag) }) }
  for (const bt of w.boats) { const ty = Math.floor(bt.y); if (rows[ty]) rows[ty].push({ y: bt.y * T - 2, fn: () => drawBoat(g, bt, w, now) }) }
  for (const a of w.animals) { if (!a.alive) continue; const ty = Math.floor(a.y); if (rows[ty] && a.x / 1 >= x0 - 1 && a.x <= x1 + 1) rows[ty].push({ y: a.y * T, fn: () => drawAnimal(g, a, w, now, sel) }) }
  for (const v of w.vills) { const ty = Math.floor(v.y); if (rows[ty] && v.x >= x0 - 1 && v.x <= x1 + 1) rows[ty].push({ y: v.y * T, fn: () => drawVillager(g, v, w, now, sel) }) }
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) if (w.feat[y * W + x]) drawFeature(g, w, x, y, now);
    const r = rows[y]; if (r && r.length) { r.sort((a, b) => a.y - b.y); for (const it of r) it.fn() }
  }
  if (sel instanceof Villager && sel.alive && sel.path.length) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sel.x * T, sel.y * T); for (const p of sel.path) g.lineTo((p % W + .5) * T, ((p / W | 0) + .5) * T); g.stroke() }
  if (sel && sel.type && sel.w) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(sel.x * T - .5, sel.y * T - .5, sel.w * T + 1, sel.h * T + 1); if (sel.maxHp) { const pr = Math.max(0, sel.hp / sel.maxHp); rc(g, 'rgba(0,0,0,.7)', sel.x * T, sel.y * T - 6, sel.w * T, 4); rc(g, conditionColor(sel), sel.x * T + 1, sel.y * T - 5, Math.round((sel.w * T - 2) * pr), 2) } }
  if (w.play && w.play.on && typeof playDraw === 'function') playDraw(g, w, now);
  if (w.festival) bunting(g, w, now);
  if (w.fog && w.seen) { updateFog(w); g.imageSmoothingEnabled = true; g.drawImage(R.fog, 0, 0, W * T, H * T); g.imageSmoothingEnabled = false }      // unexplored lands and sea stay in the mist, covering everything beneath
  if (w.neigh) for (const n of w.neigh) if (n.found && Math.abs(n.x * T - c.x) < R.vw / z && Math.abs(n.y * T - c.y) < R.vh / z) neighLabel(g, n);
  if (w.out) { for (const o of w.out.list) if (o.state === 'active' || o.state === 'travelling') outpostTraffic(g, w, o, now, sel === o); for (const o of w.out.list) if (o.state === 'active' && Math.abs(o.x * T - c.x) < R.vw / z + 60 && Math.abs(o.y * T - c.y) < R.vh / z + 60) outpostLabel(g, o) }
  // light & atmosphere (screen space)
  g.setTransform(d, 0, 0, d, 0, 0);
  const tint = [null, 'rgba(255,225,120,.04)', 'rgba(255,140,40,.05)', 'rgba(180,210,255,.05)'][w.season]; if (tint) { g.fillStyle = tint; g.fillRect(0, 0, R.vw, R.vh) }
  if (dark > 0) { g.fillStyle = `rgba(8,14,46,${0.55 * dark})`; g.fillRect(0, 0, R.vw, R.vh) }
  if (dark > 0.05) {
    g.save(); g.globalCompositeOperation = 'lighter'; const gl = (wx, wy, r, a) => { const sx = (wx - tlx) * z, sy = (wy - tly) * z, rr = r * z; if (!(Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(rr) && rr > 2)) return; const gr = g.createRadialGradient(sx, sy, 2, sx, sy, rr); gr.addColorStop(0, `rgba(255,170,70,${a * dark})`); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(sx - rr, sy - rr, rr * 2, rr * 2) };
    for (const b of w.buildings.values()) { if (b.type === 'campfire') gl((b.x + .5) * T, (b.y + .5) * T, 90, 0.5 + 0.06 * Math.sin(now / 90)); else if (b.type === 'house' && b.occ.length && inView(b.x, b.y, b.w, b.h)) gl((b.x + 1) * T, (b.y + 1.2) * T, 26, 0.22) }
    g.restore();
  }
  if (w.season === 3) {
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (const p of R.snow) { p.y += p.s * 0.004 * (R.vh / 600 + 0.5); p.x += Math.sin(now / 1500 + p.d) * 0.0004 + 0.0003; if (p.y > 1) { p.y = -0.02; p.x = Math.random() } if (p.x > 1) p.x = 0; g.fillRect(p.x * R.vw, p.y * R.vh, 1.5 + p.s, 1.5 + p.s) }
  }
  try { drawBubbles(g, w, sel, now, tlx, tly, z) } catch (e) { R.vo = null; console.error(e) }
}
function inViewR(b, x0, x1, y0, y1) { return b.x + b.w >= x0 && b.x <= x1 && b.y + b.h >= y0 && b.y <= y1 }
function scarArt(g, sc, w) {
  const T = CFG.T, X = sc.x * T, Y = sc.y * T, Wd = sc.w * T, Ht = sc.h * T, f = Math.min(1, (sc.until - w.tick) / (CFG.TPD * 3));
  g.globalAlpha = 0.5 + 0.5 * f; rc(g, '#2b2624', X, Y, Wd, Ht); rc(g, '#403733', X + 3, Y + 4, Wd - 8, 4); g.globalAlpha = 1;
  if (f > 0.4) for (let k = 0; k < 4; k++) rc(g, '#ff7a2a', X + ((hash2(sc.x + k, sc.y) >> 3) % (Wd - 2)), Y + ((hash2(sc.y + k, sc.x) >> 3) % (Ht - 2)), 2, 2);
}
function bunting(g, w, now) {
  const T = CFG.T, cols = ['#e06c75', '#e5c07b', '#61afef', '#98c379', '#c678dd'];
  for (const [y, x0, x1] of [[w.cy - 2, w.cx - 4, w.cx + 5], [w.cy + 4, w.cx - 4, w.cx + 5]]) {
    rc(g, '#5a3d22', x0 * T, y * T - 8, 2, 12); rc(g, '#5a3d22', x1 * T, y * T - 8, 2, 12);
    for (let i = 0, px = x0 * T + 2; px < x1 * T; px += 6, i++) { const sag = Math.sin((px - x0 * T) / ((x1 - x0) * T) * Math.PI) * 4 + Math.sin(now / 400 + i) * 0.4; rc(g, cols[i % 5], px, y * T - 8 + sag, 4, 5); rc(g, 'rgba(0,0,0,.2)', px + 1, y * T - 3 + sag, 2, 1) }
  }
}
function drawMinimap(w, sel) {
  const m = R.mini; if (!m || !R.miniBase) return; const g = m.getContext('2d');
  g.drawImage(R.miniBase, 0, 0);
  if (w.fog && w.seen) { updateFog(w); g.drawImage(R.fog, 0, 0) }
  if (w.neigh) for (const n of w.neigh) if (n.found) { g.fillStyle = '#ff8a5a'; g.fillRect(n.x - 1.5, n.y - 1.5, 3, 3) }
  if (w.out) for (const o of w.out.list) if (o.state === 'active') { g.fillStyle = '#9be37a'; g.fillRect(o.x - 1.5, o.y - 1.5, 3, 3) }
  for (const b of w.boats) if (b.state === 'out') { g.fillStyle = '#fff'; g.fillRect(b.x - 1, b.y - 1, 2, 2) }
  for (const b of w.buildings.values()) { g.fillStyle = b.type === 'farm' ? '#d9b34a' : b.type === 'dock' ? '#8fd0ff' : b.type === 'market' ? '#ffd24a' : b.type === 'plaza' ? '#e6dcb8' : b.type === 'tavern' ? '#e8805a' : PROJECTS[b.type] ? '#ffffff' : (b.type === 'logcamp' || b.type === 'minecamp' || b.type === 'lodge') ? '#ff9a5a' : '#f4f0e0'; g.fillRect(b.x, b.y, b.w, b.h) }
  g.fillStyle = '#b99d6c'; for (let i = 0; i < w.road.length; i++) if (w.road[i]) g.fillRect(i % CFG.W, (i / CFG.W) | 0, 1, 1);
  for (const a of w.animals) if (a.alive && a.kind === 'wolf') { g.fillStyle = '#ff3b3b'; g.fillRect(a.x - 1, a.y - 1, 2, 2) }
  for (const v of w.vills) { g.fillStyle = v === sel ? '#fff' : '#ffe24a'; g.fillRect(v.x - 0.5, v.y - 0.5, 1.5, 1.5) }
  const c = R.cam, T = CFG.T; g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect((c.x - R.vw / (2 * c.z)) / T, (c.y - R.vh / (2 * c.z)) / T, R.vw / c.z / T, R.vh / c.z / T);
}

/* ---- great projects ---- */
function projectArt(g, w, b, now, dark) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, Wd = b.w * CFG.T, Ht = b.h * CFG.T, snow = w.season === 3, lit = dark > 0.3;
  rc(g, 'rgba(0,0,0,.22)', X + 1, Y + Ht - 3, Wd, 4);
  if (b.type === 'hall') {
    rc(g, '#8f8a80', X + 2, Y + 30, Wd - 4, 17); for (let k = 0; k < 6; k++) rc(g, '#7c776e', X + 2 + (k * 11) % (Wd - 6), Y + 32 + (k % 3) * 5, 8, 1);
    rc(g, '#a07a4a', X + 4, Y + 18, Wd - 8, 13); for (let k = 0; k < Wd - 8; k += 6) rc(g, '#8a6a42', X + 4 + k, Y + 18, 1, 13);
    for (let r = 0; r < 16; r++) { const l = Math.round(r * 0.9); rc(g, r % 2 ? '#8a3c30' : '#9c463a', X + l, Y + 2 + r, Wd - 2 * l, 1) } rc(g, '#6e2c22', X, Y + 18, Wd, 1);
    if (snow) rc(g, '#f4f6fa', X + 10, Y + 2, Wd - 20, 2);
    rc(g, '#3e2a18', X + 26, Y + 29, 12, 18); rc(g, '#5a3d22', X + 27, Y + 30, 5, 16); rc(g, '#5a3d22', X + 33, Y + 30, 4, 16); rc(g, '#d9b34a', X + 31, Y + 38, 1, 2);
    for (const wx of [X + 9, X + 46]) { rc(g, '#3e2a18', wx, Y + 33, 8, 8); rc(g, lit ? '#ffd98a' : '#9fc4d8', wx + 1, Y + 34, 6, 6); rc(g, '#3e2a18', wx + 3, Y + 34, 1, 6) }
    rc(g, '#5a3d22', X + 31, Y - 8, 2, 12); rc(g, '#c8443c', X + 33, Y - 8, 8, 5); rc(g, '#f0d878', X + 36, Y - 7, 2, 3);
    rc(g, '#6a6a66', X + 52, Y + 3, 5, 10); if (w.season !== 1 || w.tod > 0.55) for (let k = 0; k < 2; k++) { const t = ((now / 900) + k / 2) % 1; g.fillStyle = `rgba(200,200,205,${0.5 * (1 - t)})`; g.fillRect(X + 53 + Math.sin(t * 4 + k) * 2, Y + 1 - t * 10, 3, 3) }
  } else if (b.type === 'library') {
    rc(g, '#d6d0c0', X + 2, Y + 44, Wd - 4, 3); rc(g, '#c4bdaa', X + 5, Y + 41, Wd - 10, 3);
    rc(g, '#e4dfd0', X + 5, Y + 16, Wd - 10, 25); for (let k = 0; k < 4; k++) { rc(g, '#f4f0e4', X + 8 + k * 10, Y + 14, 4, 27); rc(g, '#cfc8b6', X + 11 + k * 10, Y + 14, 1, 27); rc(g, '#d9d2c0', X + 7 + k * 10, Y + 12, 6, 2) }
    for (let r = 0; r < 10; r++) rc(g, r % 2 ? '#4c6a8c' : '#58789c', X + 3 + r * 2, Y + 2 + r, Wd - 6 - r * 4, 1); rc(g, '#3a5472', X + 3, Y + 12, Wd - 6, 1); if (snow) rc(g, '#f4f6fa', X + 14, Y + 2, Wd - 28, 2);
    rc(g, '#3e2c1c', X + 20, Y + 28, 8, 13); rc(g, '#5a4028', X + 21, Y + 29, 6, 12); rc(g, lit ? '#ffd98a' : '#b9d4e8', X + 10, Y + 24, 4, 6); rc(g, lit ? '#ffd98a' : '#b9d4e8', X + 34, Y + 24, 4, 6);
    rc(g, '#c9a22a', X + 22, Y + 6, 4, 4); rc(g, '#e8c84a', X + 23, Y + 7, 2, 2);
  } else if (b.type === 'bastion') {
    rc(g, '#7a7e84', X + 4, Y + 14, Wd - 8, Ht - 17); for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) rc(g, (r + k) % 2 ? '#8b9096' : '#70747a', X + 4 + k * 7 + (r % 2) * 3, Y + 16 + r * 5, 6, 1);
    rc(g, '#5f6368', X + 2, Y + 8, Wd - 4, 7); for (let k = 0; k < 5; k++) rc(g, '#8b9096', X + 3 + k * 9, Y + 3, 6, 6); rc(g, '#4a4e54', X + 2, Y + 14, Wd - 4, 1);
    if (snow) for (let k = 0; k < 5; k++) rc(g, '#f4f6fa', X + 3 + k * 9, Y + 3, 6, 1);
    rc(g, '#2a2c30', X + 19, Y + 30, 10, 14); rc(g, '#4a3420', X + 20, Y + 31, 8, 13); rc(g, '#2a2c30', X + 9, Y + 20, 2, 7); rc(g, '#2a2c30', X + 37, Y + 20, 2, 7);
    rc(g, '#5a3d22', X + 23, Y - 8, 2, 12); rc(g, '#3c6fb4', X + 25, Y - 8, 9, 5); rc(g, '#f0e6d0', X + 28, Y - 7, 3, 3);
  } else if (b.type === 'barracks') {
    rc(g, '#6e5a42', X + 2, Y + 18, Wd - 4, Ht - 20); for (let r = 0; r < 5; r++) rc(g, r % 2 ? '#7d6850' : '#5f4d38', X + 2, Y + 20 + r * 5, Wd - 4, 1);
    for (let r = 0; r < 8; r++) rc(g, r % 2 ? '#8a3a2e' : '#9a463a', X + 1 + r * 2, Y + 8 + r, Wd - 2 - r * 4, 1); if (snow) rc(g, '#f4f6fa', X + 12, Y + 8, Wd - 24, 2);
    rc(g, '#2e2216', X + 18, Y + 28, 10, Ht - 30); rc(g, '#4a3420', X + 19, Y + 29, 8, Ht - 31); rc(g, lit ? '#ffd98a' : '#b9c4cc', X + 6, Y + 24, 4, 5); rc(g, lit ? '#ffd98a' : '#b9c4cc', X + Wd - 12, Y + 24, 4, 5);
    rc(g, '#5a3d22', X + Wd - 8, Y + 2, 2, 14); rc(g, '#a02818', X + Wd - 6, Y + 2, 7, 4); rc(g, '#8b9096', X + 4, Y + 14, 2, 8); rc(g, '#c7ccd1', X + 4, Y + 10, 2, 4);
  } else if (b.type === 'watchtower') {
    rc(g, '#7a7e84', X + 8, Y + 14, Wd - 16, Ht - 14); for (let r = 0; r < 7; r++) for (let k = 0; k < 3; k++) rc(g, (r + k) % 2 ? '#8b9096' : '#70747a', X + 8 + k * 7 + (r % 2) * 3, Y + 16 + r * 5, 6, 1);
    rc(g, '#5f6368', X + 4, Y + 8, Wd - 8, 7); for (let k = 0; k < 3; k++) rc(g, '#8b9096', X + 5 + k * 8, Y + 4, 5, 5); rc(g, '#4a4e54', X + 4, Y + 14, Wd - 8, 1);
    rc(g, '#2a2c30', X + Wd / 2 - 3, Y + Ht - 12, 6, 12); rc(g, '#2a2c30', X + Wd / 2 - 1, Y + 22, 2, 6); rc(g, lit ? '#ffb347' : '#b9c4cc', X + Wd / 2 - 2, Y + 9, 4, 3);
    if (snow) for (let k = 0; k < 3; k++) rc(g, '#f4f6fa', X + 5 + k * 8, Y + 4, 5, 1);
  } else if (b.type === 'temple') {
    rc(g, '#a8a498', X + 2, Y + 40, Wd - 4, 6); rc(g, '#bab6aa', X + 5, Y + 36, Wd - 10, 5);
    rc(g, '#e6e0d0', X + 8, Y + 16, Wd - 16, 21); for (let k = 0; k < 5; k++) { rc(g, '#f6f2e6', X + 10 + k * 10, Y + 16, 4, 21); rc(g, '#cfc8b6', X + 13 + k * 10, Y + 16, 1, 21) }
    rc(g, '#d9d2c0', X + 6, Y + 12, Wd - 12, 5); for (let r = 0; r < 10; r++) { const l = Math.round((9 - r) * 2.6); rc(g, r % 2 ? '#c9b472' : '#d9c88a', X + 6 + l, Y + 2 + r, Wd - 12 - 2 * l, 1) }
    rc(g, '#e8c84a', X + Wd / 2 - 3, Y + 6, 6, 6); rc(g, '#fff2a8', X + Wd / 2 - 1, Y + 8, 2, 2); if (snow) rc(g, '#f4f6fa', X + 12, Y + 2, Wd - 24, 2);
    rc(g, '#3e2c1c', X + Wd / 2 - 4, Y + 26, 8, 11); rc(g, '#5a4028', X + Wd / 2 - 3, Y + 27, 6, 10); rc(g, lit ? '#ffd98a' : '#b9d4e8', X + 17, Y + 22, 3, 6); rc(g, lit ? '#ffd98a' : '#b9d4e8', X + Wd - 20, Y + 22, 3, 6);
    if (lit) { g.fillStyle = 'rgba(255,230,150,.25)'; g.fillRect(X + Wd / 2 - 8, Y + 38, 16, 8) }
  } else if (b.type === 'foundry') {
    rc(g, '#55555c', X + 2, Y + 42, Wd - 4, 4); rc(g, '#6a6a70', X + 4, Y + 20, Wd - 8, 23); for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) rc(g, (r + k) % 2 ? '#7a7a80' : '#62626a', X + 4 + k * 7 + (r % 2) * 3, Y + 22 + r * 4, 6, 1);
    for (let r = 0; r < 8; r++) rc(g, r % 2 ? '#3c3c44' : '#44444c', X + 2 + r, Y + 11 + r, Wd - 4 - 2 * r, 1); rc(g, '#2c2c32', X + 2, Y + 19, Wd - 4, 1);
    rc(g, '#4a4a52', X + Wd - 16, Y - 2, 8, 22); rc(g, '#33333a', X + Wd - 17, Y - 4, 10, 3);
    for (let k = 0; k < 3; k++) { const t = ((now / 800) + k / 3) % 1; g.fillStyle = `rgba(60,60,66,${0.55 * (1 - t)})`; g.fillRect(X + Wd - 14 + Math.sin(t * 5 + k) * 3, Y - 8 - t * 20, 4, 4) }
    rc(g, '#1c1c20', X + 10, Y + 30, 12, 13); const fl = 0.7 + 0.3 * Math.sin(now / 90); g.fillStyle = `rgba(255,${Math.round(110 + 60 * fl)},40,${0.7 + 0.3 * fl})`; g.fillRect(X + 12, Y + 33, 8, 8); rc(g, '#ffd24a', X + 14, Y + 36, 4, 4);
    rc(g, '#2c2c30', X + 30, Y + 36, 8, 3); rc(g, '#2c2c30', X + 32, Y + 39, 4, 4); if (snow) rc(g, '#f4f6fa', X + 4, Y + 11, Wd - 8, 1);
  } else if (b.type === 'citadel') {
    rc(g, '#6e7278', X + 6, Y + 14, Wd - 12, Ht - 17); for (let r = 0; r < 6; r++) for (let k = 0; k < 8; k++) rc(g, (r + k) % 2 ? '#80858c' : '#666a70', X + 6 + k * 7 + (r % 2) * 3, Y + 18 + r * 5, 6, 1);
    for (const tx of [X + 1, X + Wd - 15]) { rc(g, '#5f6368', tx, Y + 2, 14, Ht - 5); for (let k = 0; k < 3; k++) rc(g, '#80858c', tx + k * 5, Y - 2, 4, 5); rc(g, '#2a2c30', tx + 6, Y + 14, 2, 8); rc(g, '#4a4e54', tx, Y + 12, 14, 1) }
    rc(g, '#5f6368', X + 14, Y + 8, Wd - 28, 7); for (let k = 0; k < 5; k++) rc(g, '#80858c', X + 15 + k * 7, Y + 4, 5, 5);
    rc(g, '#2a2c30', X + Wd / 2 - 6, Y + 28, 12, 17); rc(g, '#4a3420', X + Wd / 2 - 5, Y + 29, 10, 16); rc(g, '#2a2c30', X + Wd / 2 - 6, Y + 28, 12, 2);
    rc(g, '#5a3d22', X + Wd / 2 - 1, Y - 12, 2, 18); rc(g, '#7a1c1c', X + Wd / 2 + 1, Y - 12, 11, 6); rc(g, '#e8d8a0', X + Wd / 2 + 4, Y - 11, 3, 3);
    if (snow) for (let k = 0; k < 5; k++) rc(g, '#f4f6fa', X + 15 + k * 7, Y + 4, 5, 1);
  } else if (b.type === 'amphitheatre') {
    rc(g, '#9a9588', X + 1, Y + 14, Wd - 2, 32); rc(g, '#b8b3a4', X + 3, Y + 16, Wd - 6, 28);
    for (let k = 0; k < 4; k++) { rc(g, k % 2 ? '#cfcabb' : '#d9d4c5', X + 5 + k * 3, Y + 18 + k * 4, Wd - 10 - k * 6, 3); rc(g, '#8f8a7c', X + 5 + k * 3, Y + 21 + k * 4, Wd - 10 - k * 6, 1) }
    rc(g, '#8a6a42', X + 22, Y + 34, 20, 8); rc(g, '#a98456', X + 23, Y + 35, 18, 2); rc(g, '#6b4f30', X + 22, Y + 42, 20, 1);
    for (let k = 0; k < 5; k++) rc(g, '#e8e0c8', X + 4 + k * 13, Y + 8, 3, 8);
    for (let k = 0; k < 5; k++) rc(g, '#cfc8b6', X + 3 + k * 13, Y + 6, 5, 2);
    for (const [fx, c] of [[X + 8, '#c8443c'], [X + 52, '#3c6fb4']]) { rc(g, '#5a3d22', fx, Y - 4, 1, 12); rc(g, c, fx + 1, Y - 4, 6, 4) }
    if (w.holiday && !w.holidayDone) for (let k = 0; k < 6; k++) rc(g, ['#ffd24a', '#c8443c', '#3c6fb4'][k % 3], X + 6 + k * 9, Y + 12 + (k % 2), 3, 3);
  } else if (b.type === 'granaryhall') {
    rc(g, '#8f8a80', X + 3, Y + 38, Wd - 6, 8); rc(g, '#a07a4a', X + 3, Y + 20, Wd - 6, 19); for (let k = 0; k < Wd - 6; k += 6) rc(g, '#8a6a42', X + 3 + k, Y + 20, 1, 19);
    for (let r = 0; r < 16; r++) { const l = Math.round(r * 1.1); rc(g, r % 2 ? '#c4a24a' : '#b8963e', X + l, Y + 3 + r, Wd - 2 * l, 1) } rc(g, '#8a6a2a', X + 1, Y + 19, Wd - 2, 1); if (snow) rc(g, '#f4f6fa', X + 8, Y + 3, Wd - 16, 2);
    rc(g, '#3e2a18', X + 17, Y + 28, 14, 18); rc(g, '#5a3d22', X + 18, Y + 29, 6, 17); rc(g, '#5a3d22', X + 25, Y + 29, 5, 17);
    for (let k = 0; k < 4; k++) { rc(g, '#d9b34a', X + 6 + k * 3, Y + 41, 2, 4); rc(g, '#e8c84a', X + 34 + k * 2, Y + 42, 2, 3) }
    rc(g, '#5a3d22', X + 8, Y + 28, 6, 6); rc(g, '#3e2a18', X + 34, Y + 26, 8, 6);
  } else if (b.type === 'lighthouse') {
    rc(g, '#8f8a80', X + 3, Y + 40, Wd - 6, 6); rc(g, '#dcd8cc', X + 8, Y + 14, 16, 27); rc(g, '#c4282c', X + 8, Y + 20, 16, 4); rc(g, '#c4282c', X + 9, Y + 30, 14, 4); rc(g, '#bdb9ac', X + 20, Y + 14, 4, 27);
    rc(g, '#3a3a40', X + 6, Y + 11, 20, 3); rc(g, '#5a5a62', X + 9, Y + 5, 14, 6); rc(g, lit || w.tod < 0.15 ? '#fff2a8' : '#cfe8f4', X + 11, Y + 6, 10, 4);
    rc(g, '#8a2a24', X + 10, Y + 1, 12, 4); rc(g, '#3a3a40', X + 15, Y - 3, 2, 4); rc(g, '#3e2c1c', X + 13, Y + 34, 6, 7); rc(g, '#8a8678', X + 12, Y + 26, 3, 3);
    if (lit) { const a = now / 600; g.fillStyle = 'rgba(255,240,160,.35)'; const bx = X + 16 + Math.cos(a) * 40, by = Y + 7 + Math.sin(a) * 6; g.beginPath(); g.moveTo(X + 16, Y + 7); g.lineTo(bx, by - 5); g.lineTo(bx, by + 5); g.fill() }
  } else {
    rc(g, '#a8a498', X + 2, Y + 38, Wd - 4, 8); rc(g, '#bab6aa', X + 6, Y + 33, Wd - 12, 6); rc(g, '#cbc7bb', X + 10, Y + 28, Wd - 20, 6);
    rc(g, '#d9d5c8', X + 19, Y + 4, 10, 25); rc(g, '#bdb9ac', X + 26, Y + 4, 3, 25); rc(g, '#e8e4d8', X + 20, Y, 8, 4); rc(g, '#f4f0e4', X + 22, Y - 3, 4, 3);
    rc(g, '#8a8678', X + 22, Y + 12, 4, 1); rc(g, '#8a8678', X + 22, Y + 16, 4, 1); rc(g, '#8a8678', X + 21, Y + 20, 6, 1);
    for (const bx of [X + 5, X + 40]) { rc(g, '#5a5a56', bx, Y + 30, 4, 5); rc(g, '#ff9a3a', bx + 1, Y + 27 + Math.round(Math.sin(now / 130 + bx) * 0.6), 2, 3); rc(g, '#ffd24a', bx + 1, Y + 28, 2, 1) }
    rc(g, '#4a8a3c', X + 9, Y + 42, 4, 3); rc(g, '#4a8a3c', X + 35, Y + 42, 4, 3); if (snow) rc(g, '#f4f6fa', X + 20, Y, 8, 1);
  }
}

/* ---- gathering places ---- */
function plazaArt(g, w, b, now, dark) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, S = b.w * CFG.T, stone = w.has('masonry'), snow = w.season === 3;
  rc(g, stone ? '#a9a395' : '#b79d6c', X, Y, S, S);
  for (let i = 0; i < 26; i++) { const h = hash2(b.x + i, b.y * 3 + i * 7); rc(g, stone ? (i % 2 ? '#bdb7a8' : '#97917f') : (i % 2 ? '#c4aa78' : '#a58c5e'), X + 3 + (h & 63) % (S - 8), Y + 3 + ((h >> 6) & 63) % (S - 8), stone ? 5 : 3, stone ? 3 : 2) }
  if (stone) { for (let k = 0; k < S; k += 8) { rc(g, 'rgba(0,0,0,.12)', X + k, Y, 1, S); rc(g, 'rgba(0,0,0,.12)', X, Y + k, S, 1) } rc(g, '#8f897a', X, Y, S, 2); rc(g, '#8f897a', X, Y + S - 2, S, 2); rc(g, '#8f897a', X, Y, 2, S); rc(g, '#8f897a', X + S - 2, Y, 2, S) }
  else { rc(g, '#7a5a34', X, Y, S, 2); rc(g, '#7a5a34', X, Y + S - 2, S, 2); rc(g, '#7a5a34', X, Y, 2, S); rc(g, '#7a5a34', X + S - 2, Y, 2, S) }
  const cx = X + S / 2 - 8, cy = Y + S / 2 - 8;                           // the well
  rc(g, 'rgba(0,0,0,.2)', cx, cy + 14, 18, 3); rc(g, '#8a8678', cx, cy + 5, 16, 11); rc(g, '#a29d8e', cx + 1, cy + 5, 14, 3); rc(g, snow ? '#cfe4ee' : '#3f78a8', cx + 3, cy + 7, 10, 4); rc(g, '#6f6a5e', cx, cy + 13, 16, 3);
  rc(g, '#5a3d22', cx + 1, cy - 4, 2, 10); rc(g, '#5a3d22', cx + 13, cy - 4, 2, 10); rc(g, '#7a5232', cx, cy - 5, 16, 2); rc(g, '#8a3c30', cx - 1, cy - 8, 18, 3); rc(g, '#6e2c22', cx + 2, cy - 10, 12, 2); rc(g, '#d9d0b0', cx + 7, cy - 3, 1, 5);
  for (const [bx, by, h] of [[X + 6, Y + S - 12, 1], [X + S - 22, Y + S - 12, 1], [X + 6, Y + 8, 0], [X + S - 22, Y + 8, 0]]) { rc(g, '#6a4a2a', bx, by, 16, 3); rc(g, '#8a6a42', bx, by, 16, 1); rc(g, '#4a331c', bx + 1, by + 3, 2, 2); rc(g, '#4a331c', bx + 13, by + 3, 2, 2); void h }
  for (const [px, py] of [[X + 4, Y + 4], [X + S - 11, Y + 4]]) { rc(g, '#5a3d22', px + 3, py + 4, 3, 4); rc(g, snow ? '#e8eef0' : '#3f8a3c', px, py, 9, 6); rc(g, snow ? '#fff' : '#4fa04a', px + 2, py - 2, 5, 3) }
  if (w.festival) for (let k = 0; k < 8; k++) rc(g, ['#c8443c', '#f0d878', '#3c6fb4', '#4a9a4a'][k % 4], X + 4 + k * 9, Y + 12 + (k % 2) * 2, 4, 5);
  if (dark > 0.3) for (const [lx, ly] of [[X + 3, Y + S / 2], [X + S - 5, Y + S / 2]]) { rc(g, '#4a331c', lx, ly, 2, 8); rc(g, '#ffe58a', lx - 1, ly - 3, 4, 4); g.fillStyle = 'rgba(255,220,130,.16)'; g.beginPath(); g.arc(lx + 1, ly - 1, 22, 0, 6.3); g.fill() }
}
function tavernArt(g, w, b, now, dark) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, Wd = b.w * CFG.T, snow = w.season === 3, lit = dark > 0.25 || w.tod > 0.55, stone = w.has('masonry');
  rc(g, 'rgba(0,0,0,.22)', X + 1, Y + 44, Wd, 4);
  rc(g, stone ? '#8f8a80' : '#7a5a34', X + 3, Y + 28, Wd - 6, 18); rc(g, '#a07a4a', X + 3, Y + 18, Wd - 6, 12); for (let k = 0; k < Wd - 6; k += 6) rc(g, '#6f5436', X + 3 + k, Y + 18, 1, 12);
  for (let r = 0; r < 15; r++) { const l = Math.round(r * 1.2); rc(g, r % 2 ? '#5a4030' : '#6a4c38', X + l, Y + 3 + r, Wd - 2 * l, 1) } rc(g, '#3e2a1c', X, Y + 18, Wd, 1); if (snow) rc(g, '#f4f6fa', X + 8, Y + 3, Wd - 16, 2);
  rc(g, '#3e2a18', X + 19, Y + 30, 10, 16); rc(g, lit ? '#ffcf6a' : '#5a3d22', X + 20, Y + 31, 8, 15); rc(g, '#3e2a18', X + 23, Y + 31, 1, 15);
  for (const wx of [X + 7, X + 34]) { rc(g, '#3e2a18', wx, Y + 32, 8, 7); rc(g, lit ? '#ffd98a' : '#9fc4d8', wx + 1, Y + 33, 6, 5); if (lit) { g.fillStyle = 'rgba(255,200,110,.14)'; g.beginPath(); g.arc(wx + 4, Y + 36, 14, 0, 6.3); g.fill() } }
  rc(g, '#5a3d22', X + Wd - 6, Y + 20, 1, 10); rc(g, '#5a3d22', X + Wd - 6, Y + 20, 6, 1); rc(g, '#c9a22a', X + Wd - 4, Y + 22, 4, 5); rc(g, '#e8c84a', X + Wd - 3, Y + 23, 2, 3);
  rc(g, '#6a4a2a', X + 1, Y + 38, 5, 7); rc(g, '#8a6a3a', X + 1, Y + 40, 5, 1); rc(g, '#6a4a2a', X + 7, Y + 41, 4, 5);
  rc(g, '#6a6a66', X + 6, Y + 1, 5, 9); if (w.season !== 1 || lit) for (let k = 0; k < 2; k++) { const t = ((now / 850) + k / 2) % 1; g.fillStyle = `rgba(200,200,205,${0.5 * (1 - t)})`; g.fillRect(X + 7 + Math.sin(t * 4 + k) * 2, Y - 1 - t * 10, 3, 3) }
}

/* ---- fog of war and neighbouring settlements ---- */
function updateFog(w) {
  const { W, H } = CFG; if (!R.fog || R.fog.width !== W || R.fog.height !== H) { R.fog = document.createElement('canvas'); R.fog.width = W; R.fog.height = H; R.fogWorld = null }
  if (R.fogWorld === w && R.fogVer === w.seenVer) return;
  const fg = R.fog.getContext('2d'), im = fg.createImageData(W, H), d = im.data;
  for (let i = 0; i < W * H; i++) if (!w.seen[i]) { const o = i * 4; d[o] = 9; d[o + 1] = 14; d[o + 2] = 22; d[o + 3] = 240 }
  fg.putImageData(im, 0, 0); R.fogWorld = w; R.fogVer = w.seenVer;
}
function neighArt(g, w, n, now) {
  const T = CFG.T, X = n.x * T, Y = n.y * T, snow = w.season === 3, roof = { traders: '#3c6fb4', scholars: '#6a4a8c', farmers: '#c4a24a', raiders: '#8a3c30' }[n.kind], wall = n.kind === 'raiders' ? '#6f5436' : '#b9a47a';
  const nh = 4 + (n.pop > 20 ? 2 : n.pop > 14 ? 1 : 0), huts = [];
  for (let k = 0; k < nh; k++) { const a = k * 2.4 + n.id, d = 22 + (k % 2) * 12; huts.push([X + Math.cos(a) * d * 1.25, Y + Math.sin(a) * d * 0.9]) }
  huts.sort((p, q) => p[1] - q[1]);
  if (n.kind === 'farmers') for (let k = 0; k < 3; k++) { rc(g, '#d9b34a', X - 52 + k * 36, Y + 30, 28, 16); for (let s = 0; s < 28; s += 4) rc(g, '#b8963e', X - 52 + k * 36 + s, Y + 30, 1, 16) }
  if (n.kind === 'raiders') { for (let k = -5; k <= 5; k++) { rc(g, '#5a3d22', X + k * 9, Y - 38, 3, 12); rc(g, '#7a5a34', X + k * 9, Y - 38, 1, 12) } rc(g, '#5a3d22', X, Y - 58, 2, 22); rc(g, '#c4282c', X + 2, Y - 58, 12, 8) }
  if (n.kind === 'scholars') { rc(g, '#cfc8b6', X - 5, Y - 40, 12, 36); rc(g, '#bdb6a2', X + 3, Y - 40, 4, 36); rc(g, '#6a4a8c', X - 8, Y - 46, 18, 7); rc(g, '#ffe58a', X - 1, Y - 30, 4, 5) }
  if (n.kind === 'traders') { for (let k = 0; k < 2; k++) { rc(g, ['#c8443c', '#4a9a4a'][k], X - 18 + k * 26, Y - 28, 18, 5); rc(g, '#5a3d22', X - 17 + k * 26, Y - 23, 2, 12); rc(g, '#5a3d22', X - 3 + k * 26, Y - 23, 2, 12); rc(g, '#8a6a42', X - 17 + k * 26, Y - 14, 16, 4) } }
  for (const [hx, hy] of huts) {
    rc(g, 'rgba(0,0,0,.2)', hx - 9, hy + 12, 22, 3); rc(g, wall, hx - 8, hy, 20, 12); rc(g, '#6f5436', hx - 8, hy + 8, 20, 1);
    for (let r2 = 0; r2 < 8; r2++) { const l = Math.round(r2 * 1.4); rc(g, roof, hx - 10 + l, hy - 8 + r2, 24 - 2 * l, 1); if (r2 % 2) rc(g, 'rgba(0,0,0,.14)', hx - 10 + l, hy - 8 + r2, 24 - 2 * l, 1) } rc(g, snow ? '#f4f6fa' : 'rgba(0,0,0,.18)', hx - 10, hy - 8, 24, 1);
    rc(g, '#3e2a18', hx, hy + 4, 5, 8);
  }
  const sx = X + 2, sy = Y + 8; rc(g, '#5a5a56', sx - 3, sy + 2, 7, 3); const f = ((now / 120) | 0) % 3; rc(g, '#e8672a', sx - 1, sy - 3 + (f === 1 ? 1 : 0), 3, 5);
  for (let k = 0; k < 2; k++) { const t = ((now / 900) + k / 2) % 1; g.fillStyle = `rgba(210,210,215,${0.5 * (1 - t)})`; g.fillRect(sx + Math.sin(t * 4 + k) * 2, sy - 6 - t * 18, 3, 3) }
}
function neighLabel(g, n) {
  const X = n.x * CFG.T, Y = n.y * CFG.T; g.font = 'bold 9px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(10,14,20,.85)'; g.strokeText(n.name, X, Y - 68); g.fillStyle = '#ffe9b0'; g.fillText(n.name, X, Y - 68); g.textAlign = 'start';
}

/* the colours a visiting neighbour's ship flies */
function visitorFlag(w) {
  if (!w.neigh) return null; const c = w.econ.caravan, id = w.visit ? w.visit.n : c && c.from !== undefined ? c.from : null; if (id === null) return null;
  if (w.visit && w.visit.type === 'raid') return '#9a1414'; const n = w.neigh.find(x => x.id === id); return n ? { traders: '#3c6fb4', farmers: '#c4a24a', scholars: '#7a5aa8', raiders: '#8a1c1c' }[n.kind] : null;
}

/* weathered, damaged buildings show it: cracks, missing planks, and a little dust */
function wearArt(g, b, now) {
  if (b.maxHp === undefined) return; const r = b.hp / b.maxHp; if (r >= 0.6) return; const T = CFG.T, X = b.x * T, Y = b.y * T, Wd = b.w * T, Ht = b.h * T, n = r < 0.2 ? 9 : r < 0.4 ? 6 : 3;
  for (let k = 0; k < n; k++) { const h = hash2(b.x * 7 + k, b.y * 5 + k * 3); rc(g, 'rgba(20,14,10,.45)', X + 3 + (h & 255) % (Wd - 8), Y + Ht * 0.35 + ((h >> 8) & 255) % (Ht * 0.6), 1, 4 + (h & 3)); rc(g, 'rgba(20,14,10,.3)', X + 3 + ((h >> 4) & 255) % (Wd - 10), Y + Ht * 0.3 + ((h >> 10) & 127) % (Ht * 0.6), 4, 1) }
  if (r < 0.35) { const t = ((now / 1100) + b.x * 0.13) % 1; g.fillStyle = `rgba(150,140,125,${0.35 * (1 - t)})`; g.fillRect(X + Wd * 0.3 + Math.sin(t * 5) * 2, Y + Ht * 0.5 - t * 10, 3, 3) }
}

/* a small flag where the village has heard of something worth a journey (gold on land, blue at sea) */
function siteMark(g, s, now) {
  const T = CFG.T, x = Math.round(s.x * T + T / 2), y = Math.round(s.y * T + T / 2), sea = SITE_KINDS[s.kind].sea, bob = sea ? Math.round(Math.sin(now / 500 + s.id)) : 0;
  rc(g, 'rgba(0,0,0,0.3)', x - 3, y + 2, 7, 2); rc(g, '#5a4630', x, y - 7 + bob, 1, 9); rc(g, sea ? '#7fd0ff' : '#ffd24a', x + 1, y - 7 + bob, 5, 3); rc(g, sea ? '#3d8fc8' : '#c8932a', x + 1, y - 5 + bob, 5, 1);
}
/* ---- outposts: camps that grow into towns, and the carts and ships that link them home ---- */
function outpostArt(g, w, o, now) {
  const T = CFG.T, X = o.x * T + 8, Y = o.y * T + 8, snow = w.season === 3, st = o.stage, roof = ['#a9824a', '#8a6a3a', '#7a5a34', '#6f4f30'][st], wall = '#c9b48a';
  const huts = Math.min(8, 2 + st * 2 + (o.pop > 25 ? 1 : 0)); const spots = [];
  for (let k = 0; k < huts; k++) { const a = k * 2.4 + o.id * 1.3, d = 14 + (k % 3) * 9 + st * 3; spots.push([X + Math.cos(a) * d * 1.2, Y + Math.sin(a) * d * 0.8]) }
  spots.sort((p, q) => p[1] - q[1]);
  if (o.role === 'farming') for (let k = 0; k < 2 + st; k++) { const fx = X - 54 + (k % 3) * 30, fy = Y + 22 + ((k / 3) | 0) * 18; rc(g, snow ? '#e8ecf0' : '#d9b34a', fx, fy, 26, 14); if (!snow) for (let s2 = 0; s2 < 26; s2 += 4) rc(g, '#b8963e', fx + s2, fy, 1, 14) }
  if (o.role === 'timber') { for (let k = 0; k < 4; k++) rc(g, '#7a5230', X + 24 + (k % 2) * 6, Y + 14 - ((k / 2) | 0) * 4, 14, 4); rc(g, '#9a7040', X + 24, Y + 6, 14, 2) }
  if (o.role === 'quarry') { for (let k = 0; k < 4; k++) rc(g, ['#8a8c90', '#9a9ca0', '#7a7c80'][k % 3], X + 22 + k * 5, Y + 12 - (k % 2) * 4, 8, 6) }
  if (o.role === 'fishing') { rc(g, '#5a3d22', X - 30, Y + 16, 2, 14); rc(g, '#5a3d22', X - 12, Y + 16, 2, 14); rc(g, '#cfc7a6', X - 29, Y + 18, 17, 6) }
  for (const [hx, hy] of spots) {
    rc(g, 'rgba(0,0,0,.2)', hx - 7, hy + 10, 18, 3); rc(g, wall, hx - 6, hy, 16, 10); rc(g, '#6f5436', hx - 6, hy + 7, 16, 1);
    for (let r2 = 0; r2 < 6; r2++) { const l = Math.round(r2 * 1.3); rc(g, roof, hx - 8 + l, hy - 6 + r2, 20 - 2 * l, 1) } rc(g, snow ? '#f4f6fa' : 'rgba(0,0,0,.16)', hx - 8, hy - 6, 20, 1); rc(g, '#3e2a18', hx, hy + 3, 4, 7);
  }
  if (st >= 2) { rc(g, '#5a3d22', X - 1, Y - 34, 2, 24); rc(g, '#4a9a4a', X + 1, Y - 34, 9, 6) }
  if (st >= 3) { for (let k = -4; k <= 4; k++) rc(g, '#6a5230', X + k * 8, Y - 26, 4, 8) }
  const f = ((now / 130) | 0) % 3; rc(g, '#5a5a56', X - 2, Y + 4, 6, 3); rc(g, '#e8672a', X, Y - 1 + (f === 1 ? 1 : 0), 3, 5);
  for (let k = 0; k < 2; k++) { const t = ((now / 900) + k / 2) % 1; g.fillStyle = `rgba(210,210,215,${0.5 * (1 - t)})`; g.fillRect(X + Math.sin(t * 4 + k) * 2, Y - 4 - t * 16, 3, 3) }
}
function outpostLabel(g, o) {
  const X = o.x * CFG.T + 8, Y = o.y * CFG.T + 8; g.font = 'bold 9px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(10,14,20,.85)'; const t = o.name + ' · ' + o.pop; g.strokeText(t, X, Y - 44); g.fillStyle = '#c8f0b0'; g.fillText(t, X, Y - 44); g.textAlign = 'start';
}
/* the party on the road and loads on their way home, drawn along the route */
function outpostTraffic(g, w, o, now, selected) {
  const T = CFG.T, W = CFG.W, tiles = outpostRouteTiles(w, o); if (tiles.length < 2) return;
  const pt = f => { const p = tiles[Math.min(tiles.length - 1, Math.max(0, Math.round(f * (tiles.length - 1))))]; return [(p % W + .5) * T, ((p / W | 0) + .5) * T] };
  const home = o.mode === 'sea' ? 0 : 0, nowD = w.day + w.tod;
  if (selected) { g.strokeStyle = 'rgba(200,240,170,.65)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); for (let k = 0; k < tiles.length; k += 2) { const [x, y] = pt(k / (tiles.length - 1)); k ? g.lineTo(x, y) : g.moveTo(x, y) } g.stroke(); g.setLineDash([]) }
  const sprite = (f, back, kind) => { const [x, y] = pt(f), bob = Math.sin(now / 160 + f * 40) * 0.6;
    if (o.mode === 'sea') { rc(g, 'rgba(0,0,0,.2)', x - 7, y + 4, 14, 3); rc(g, '#7a5230', x - 7, y + 1 + bob, 14, 4); rc(g, '#f2ead0', x - 1, y - 9 + bob, 7, 9); rc(g, '#5a3d22', x - 1, y - 10 + bob, 1, 11); if (kind === 'load') rc(g, '#b98a4a', x - 4, y - 1 + bob, 6, 3) }
    else { rc(g, 'rgba(0,0,0,.2)', x - 6, y + 3, 12, 3); rc(g, kind === 'load' ? '#8a6a3a' : '#c9b48a', x - 5, y - 2, 10, 5); rc(g, '#3a2a18', x - 5, y + 3, 3, 2); rc(g, '#3a2a18', x + 2, y + 3, 3, 2); if (kind === 'party') { rc(g, '#e8c84a', x - 2, y - 7, 2, 5); rc(g, '#4a90d9', x + 1, y - 6, 2, 4) } } };
  if (o.state === 'travelling') { const f = clamp((nowD - o.day) / Math.max(1, o.arrive - o.day), 0, 1); sprite(f, false, 'party'); return }
  for (const c of o.cargo) { const f = clamp((nowD - c.from) / Math.max(1, c.at - c.from), 0, 1); sprite(1 - f, true, 'load') }
}

/* ---------- thought and speech bubbles (screen space) ----------
   What shows depends on the speed: 1x and below full lines (6 at a time), 3x a few words (6),
   10x and 30x a single glyph (3, nearest the centre of the screen), 100x none. The selected
   villager's bubble always shows (a pinned thought stays until unpinned). */
const BUBBLE_CAP = 6, BUBBLE_CAP_FAST = 3;
function bubbleMode() { const sp = R.speed === undefined ? 1 : R.speed; return sp <= 1 ? 'long' : sp <= 3 ? 'short' : sp < 100 ? 'emo' : 'off' }
function wrapText(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > maxW) { lines.push(cur); cur = w } else cur = t }
  if (cur) lines.push(cur); return lines;
}
function drawBubbles(g, w, selV, now, tlx, tly, z) {
  const V = R.vo || (R.vo = { shown: new Map(), prev: new Set(), rects: [], pin: null }); V.rects = [];
  if (R.bubbles === false) { V.prev = new Set(); return }
  const mode = bubbleMode(), sp = R.speed === undefined ? 1 : R.speed, paused = sp <= 0, T = CFG.T, selId = selV && selV.id !== undefined && selV.stage ? selV.id : null, pin = V.pin;
  const cap = mode === 'emo' ? BUBBLE_CAP_FAST : BUBBLE_CAP, cx = R.vw / 2, cy = R.vh / 2, cand = [], act = [];
  const textOf = (th, v, forced) => forced ? (sp <= 3 ? th.long : th.short) : mode === 'long' ? th.long : mode === 'short' ? th.short : th.emo;
  for (const v of w.vills) {
    if (!v.alive) continue;
    const pinned = !!(pin && pin.id === v.id), th = pinned ? pin.th : v.th; if (!th || w.tick < th.at) continue;
    const forced = pinned || v.id === selId; if (mode === 'off' && !forced) continue;
    const sx = ((v.x + (v.sx || 0)) * T - tlx) * z, sy = ((v.y + (v.sy || 0)) * T - 16 * (v.stage() === 'child' ? 0.7 : 1) - tly) * z;
    if (sx < -30 || sy < -30 || sx > R.vw + 30 || sy > R.vh + 60) continue;
    const key = th.tick + ':' + th.kind, s = V.shown.get(v.id);
    if (s && s.key === key) { if (pinned || paused || now - s.t0 < s.life) act.push({ v, th, sx, sy, s, forced }); continue }
    if (!forced && w.tick - th.at > 240) continue;                    // a stale thought is not worth starting
    cand.push({ v, th, sx, sy, forced, d: (sx - cx) ** 2 + (sy - cy) ** 2 - (pinned ? 4e9 : forced ? 2e9 : 0) });
  }
  cand.sort((a, b) => a.d - b.d);
  const rec = V.recent || (V.recent = new Map()); if (rec.size > 300) for (const [k, t] of rec) if (now - t > 90000) rec.delete(k);
  const catN = {}; for (const b of act) catN[b.th.cat] = (catN[b.th.cat] || 0) + 1;
  for (const c of cand) {
    if (act.length >= cap && !c.forced) break;
    if (!c.forced && (catN[c.th.cat] || 0) >= 2) continue;           // never more than two bubbles on the same subject at once
    if (!c.forced && c.th.alts) {                                    // pick a wording nobody on screen used in the last minute and a half
      const opts = [[c.th.long, c.th.short, c.th.emo], ...c.th.alts], ok = opts.find(o => !rec.has(o[0]) || now - rec.get(o[0]) > 90000) || opts[0];
      c.th.long = ok[0]; c.th.short = String(ok[1]).slice(0, 14); c.th.emo = ok[2];
    }
    rec.set(c.th.long, now); catN[c.th.cat] = (catN[c.th.cat] || 0) + 1;
    const txt = textOf(c.th, c.v, c.forced), life = mode === 'long' || c.forced ? Math.min(11000, 4200 + txt.length * 70) : mode === 'short' ? 3800 : 2400;
    const s = { key: c.th.tick + ':' + c.th.kind, t0: now, life }; V.shown.set(c.v.id, s); act.push({ ...c, s });
    if (R.onBubble) R.onBubble(c.v, c.th, mode);
  }
  if (V.shown.size > 3000) V.shown.clear();
  const fs = 11, placed = [], ids = new Set(); act.sort((a, b) => b.sy - a.sy);
  g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  for (const b of act) {
    const { v, th, sx, forced } = b, pinned = !!(pin && pin.id === v.id), fade = paused || pinned ? 1 : Math.min(1, (b.s.life - (now - b.s.t0)) / 500, (now - b.s.t0) / 120 + 0.3);
    const txt = pinned ? th.long : textOf(th, v, forced), emo = mode === 'emo' && !forced;
    g.font = (emo ? 'bold 13px' : fs + 'px') + ' system-ui, sans-serif';
    const lines = emo ? [txt] : wrapText(g, (th.kind === 'dream' ? 'z z  ' : '') + txt, mode === 'long' || pinned || sp <= 3 && forced ? 150 : 100), lh = emo ? 14 : 13;
    let tw = 0; for (const l of lines) tw = Math.max(tw, g.measureText(l).width);
    const bw = Math.ceil(tw) + 10, bh = lines.length * lh + 6;
    let bx = Math.round(sx - bw / 2), by = Math.round(b.sy - bh - 8);
    for (let k = 0; k < 6; k++) { const hit = placed.find(r => bx < r.x + r.w + 2 && bx + bw + 2 > r.x && by < r.y + r.h + 2 && by + bh + 2 > r.y); if (!hit) break; by = hit.y - bh - 3 }
    if (bx < 2) bx = 2; if (bx + bw > R.vw - 2) bx = R.vw - 2 - bw; if (by < 2) by = 2;
    placed.push({ x: bx, y: by, w: bw, h: bh }); V.rects.push({ id: v.id, x: bx, y: by, w: bw, h: bh }); ids.add(v.id);
    g.globalAlpha = Math.max(0.05, fade);
    const dream = th.kind === 'dream', say = th.kind === 'say';
    g.fillStyle = dream ? 'rgba(214,222,255,.96)' : say ? 'rgba(255,252,238,.97)' : 'rgba(255,255,255,.96)'; g.strokeStyle = pinned ? '#e0a010' : 'rgba(30,36,50,.45)'; g.lineWidth = pinned ? 2 : 1;
    g.beginPath(); if (g.roundRect) g.roundRect(bx + .5, by + .5, bw, bh, dream ? 8 : say ? 5 : 7); else g.rect(bx + .5, by + .5, bw, bh); g.fill(); g.stroke();
    const tx = Math.max(bx + 6, Math.min(bx + bw - 6, sx));                      // tail towards the speaker
    if (say) { g.beginPath(); g.moveTo(tx - 3, by + bh + .5); g.lineTo(tx, by + bh + 6); g.lineTo(tx + 3, by + bh + .5); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,252,238,.97)'; g.fillRect(tx - 2.5, by + bh - 0.5, 6, 2) }
    else { g.fillStyle = dream ? 'rgba(214,222,255,.96)' : 'rgba(255,255,255,.96)'; g.beginPath(); g.arc(tx, by + bh + 3, 2.2, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(tx + 1, by + bh + 7.5, 1.3, 0, 7); g.fill(); g.stroke() }
    g.fillStyle = th.kind === 'say' && th.cat === 'talk' && /!/.test(th.emo) ? '#a02020' : dream ? '#2a3070' : '#1c222c';
    lines.forEach((l, i) => g.fillText(l, bx + 5, by + 3 + (i + 1) * lh - 3.5));
  }
  g.restore(); g.globalAlpha = 1; V.prev = ids;
}

/* land value heat map (City card button): one tinted square per 4x4 tiles, green cheap to red dear */
function lvOverlay(g, w, x0, x1, y0, y1) {
  const { T } = CFG, C = CITY_CELL, { gw, gh } = lvGrid(w), vm = w.city ? w.city.vmax : 40;
  for (let gy = Math.max(0, Math.floor(y0 / C)); gy <= Math.min(gh - 1, Math.floor(y1 / C)); gy++) for (let gx = Math.max(0, Math.floor(x0 / C)); gx <= Math.min(gw - 1, Math.floor(x1 / C)); gx++) {
    const v = w._lv[gy * gw + gx]; if (v < 3) continue; const k = clamp(v / vm, 0, 1);
    g.fillStyle = `rgba(${Math.round(60 + 190 * k)},${Math.round(190 - 130 * k)},70,${(0.2 + 0.32 * k).toFixed(2)})`; g.fillRect(gx * C * T, gy * C * T, C * T, C * T);
  }
}

/* districts (City card button): each district's block tinted by how many live there, ordered ones outlined, the chosen one framed */
function distOverlay(g, w, x0, x1, y0, y1) {
  const { T } = CFG, c = DIST.cell, D = districtsView(w), mx = Math.max(1, ...D.list.map(d => d.pop)), orders = (w.play && w.play.on && w.play.dorders) || {}, big = R.cam.z >= 0.7;
  for (const d of D.list) {
    const X = d.gx * c, Y = d.gy * c; if (X > x1 || Y > y1 || X + c < x0 || Y + c < y0) continue; const k = d.pop / mx;
    g.fillStyle = `rgba(${Math.round(80 + 170 * k)},${Math.round(150 - 70 * k)},${Math.round(210 - 150 * k)},${(0.14 + 0.34 * k).toFixed(2)})`; g.fillRect(X * T, Y * T, c * T, c * T);
    g.lineWidth = d.key === R.distSel ? 3 : orders[d.key] ? 2 : 1; g.strokeStyle = d.key === R.distSel ? '#ffe58a' : orders[d.key] ? '#8fd18b' : 'rgba(255,255,255,.28)'; g.strokeRect(X * T + 1, Y * T + 1, c * T - 2, c * T - 2);
    if (big) { g.font = 'bold 15px system-ui,sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.92)'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.strokeText(String(d.pop), (X + c / 2) * T, (Y + c / 2) * T); g.fillText(String(d.pop), (X + c / 2) * T, (Y + c / 2) * T); g.textAlign = 'start' }
  }
}

/* a workshop: low timber hall with a wide open front, a forge hearth with a glowing chimney, a bench and stacked work */
function workshopArt(g, w, b, now, dark) {
  const X = b.x * CFG.T, Y = b.y * CFG.T, Wd = b.w * CFG.T, snow = w.season === 3, stone = w.has('masonry'), lit = dark > 0.25 || w.tod > 0.55;
  rc(g, 'rgba(0,0,0,.22)', X + 1, Y + 29, Wd, 3);
  rc(g, stone ? '#8f8a80' : '#7a5a34', X + 2, Y + 14, Wd - 4, 16); for (let k = 0; k < Wd - 4; k += 6) rc(g, stone ? '#7b766d' : '#6a4c2e', X + 2 + k, Y + 14, 1, 16);
  for (let r = 0; r < 9; r++) { const l = Math.round(r * 0.9); rc(g, r % 2 ? '#6a4c38' : '#5a4030', X + l, Y + 4 + r, Wd - 2 * l, 1) } rc(g, '#3e2a1c', X, Y + 13, Wd, 1); if (snow) rc(g, '#f4f6fa', X + 6, Y + 4, Wd - 12, 2);
  rc(g, '#2a2018', X + 6, Y + 17, Wd - 20, 13); rc(g, lit ? '#d9822a' : '#4a3626', X + 8, Y + 25, 8, 5);     // open front with the hearth glowing inside
  if (lit) { g.fillStyle = 'rgba(255,150,60,.16)'; g.beginPath(); g.arc(X + 12, Y + 26, 14, 0, 6.3); g.fill() }
  rc(g, '#5a5a56', X + Wd - 12, Y + 1, 6, 12); rc(g, '#46463f', X + Wd - 12, Y + 1, 6, 1);
  rc(g, '#6a4a2a', X + Wd - 12, Y + 20, 9, 3); rc(g, '#4a3220', X + Wd - 11, Y + 23, 1, 6); rc(g, '#4a3220', X + Wd - 5, Y + 23, 1, 6);       // bench
  rc(g, '#8a6a3a', X + 1, Y + 24, 5, 3); rc(g, '#7a5a2e', X + 2, Y + 21, 4, 3);       // stacked stock
  for (let k = 0; k < 2; k++) { const t = ((now / 700) + k / 2) % 1; g.fillStyle = `rgba(190,190,195,${0.55 * (1 - t)})`; g.fillRect(X + Wd - 11 + Math.sin(t * 4 + k) * 2, Y - 2 - t * 9, 3, 3) }
}
