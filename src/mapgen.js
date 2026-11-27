/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   mapgen.js — map types (v0.19)

   island       the original map: one island in open sea, other islands beyond
   archipelago  a smaller home island among several others in the same sea
   continent    land across the whole map, with coast on one or two sides
   peninsula    a tongue of land joined to a mainland by a narrow neck
   lakeland     landlocked, with big lakes
   river        land divided by one or two rivers, crossed at fords

   The first two draw inside the fixed 160x112 home window (as before). The
   others draw across the whole map and meet their neighbours on foot.
   ========================================================================== */
const MAP_TYPES = {
  island: { label: 'Island', blurb: 'One island in open sea. Other lands lie across the water.' },
  archipelago: { label: 'Archipelago', blurb: 'A smaller home island among many others; boats matter early.' },
  continent: { label: 'Continent', blurb: 'Broad land with a coast on one or two sides. Neighbours can be walked to.' },
  peninsula: { label: 'Peninsula', blurb: 'A tongue of land with sea on three sides and a narrow neck to the mainland.' },
  lakeland: { label: 'Lakeland', blurb: 'Landlocked, with big lakes. Boats work the lakes; neighbours are on foot.' },
  river: { label: 'River land', blurb: 'Land divided by rivers. They can be crossed only at fords.' }
};
const FULL_MAPS = new Set(['continent', 'peninsula', 'lakeland', 'river']);
const MAP_ORDER = ['island', 'archipelago', 'continent', 'peninsula', 'lakeland', 'river'];
const pickMapType = seed => MAP_ORDER[hash2(seed >>> 0, 977) % MAP_ORDER.length];
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) };

/* ----- archipelago: the "distance from the nearest island" in place of the original single-island falloff ----- */
function archipelagoShape(rng) {
  const isl = [{ x: 80 + (rng() - 0.5) * 20, y: 56 + (rng() - 0.5) * 14, rx: 38 + rng() * 6, ry: 27 + rng() * 5 }], n = 4 + ((rng() * 3) | 0);
  for (let k = 0; k < n; k++) for (let g = 0; g < 60; g++) {
    const a = rng() * 6.283, d = 44 + rng() * 26, x = 80 + Math.cos(a) * d * 1.25, y = 56 + Math.sin(a) * d * 0.8, rx = 10 + rng() * 11, ry = rx * (0.6 + rng() * 0.4);
    if (x < rx + 14 || x > 146 - rx || y < ry + 14 || y > 98 - ry) continue;
    if (isl.some(o => Math.hypot((o.x - x) / (o.rx + rx), (o.y - y) / (o.ry + ry)) < 0.95)) continue;
    isl.push({ x, y, rx, ry }); break;
  }
  return (xx, yy) => { let m = 9; for (const o of isl) { const dx = (xx - o.x) / o.rx, dy = (yy - o.y) / o.ry, r = dx * dx + dy * dy; if (r < m) m = r } return Math.sqrt(m / 1.45) };       // a little generous, so islands keep their land
}

/* ----- the whole-map shapes: a per-tile change to elevation ----- */
function fullShape(w, rng) {
  const { W, H } = CFG, A = w.arch, coast = [0, 0, 0, 0], bw = [0, 0, 0, 0];                   // sides: west, east, north, south
  if (A === 'continent') { const k = 1 + ((rng() * 2) | 0), order = [0, 1, 2, 3].sort(() => rng() - 0.5); for (let i = 0; i < k; i++) coast[order[i]] = 1 }
  else if (A === 'river') { if (rng() < 0.6) coast[(rng() * 4) | 0] = 1 }
  else if (A === 'peninsula') { coast[1] = coast[2] = coast[3] = 1 }
  for (let s = 0; s < 4; s++) bw[s] = 24 + rng() * 14;
  w.coastSides = coast.slice();
  const lakes = []; if (A === 'lakeland') { const n = 2 + (rng() < 0.5 ? 1 : 0); for (let k = 0; k < n; k++) for (let g = 0; g < 40; g++) { const x = W * (0.25 + 0.5 * rng()), y = H * (0.25 + 0.5 * rng()), rx = 14 + rng() * 10, ry = 10 + rng() * 7; if (lakes.some(o => Math.hypot(o.x - x, o.y - y) < 46)) continue; lakes.push({ x, y, rx, ry }); break } }
  const phi = rng() * 6.283, py0 = H * (0.5 + (rng() - 0.5) * 0.2), py1 = H * (0.5 + (rng() - 0.5) * 0.3);
  return (x, y) => {
    let d = 0; const dl = [x, W - 1 - x, y, H - 1 - y];
    for (let s = 0; s < 4; s++) { if (coast[s]) d -= 0.8 * smooth01(0, bw[s], bw[s] - dl[s]); else d += 0.32 * smooth01(0, 9, 9 - dl[s]) }
    if (A === 'continent' || A === 'river') d += 0.0;
    if (A === 'lakeland') { d += 0.04; for (const o of lakes) { const dx = (x - o.x) / o.rx, dy = (y - o.y) / o.ry, r = Math.sqrt(dx * dx + dy * dy); d -= 0.95 * (1 - smooth01(0.5, 1.15, r)) } }
    if (A === 'peninsula') {
      const main = 1 - smooth01(0.4 * W, 0.52 * W, x), x0 = 0.3 * W, x1 = 0.9 * W; let pen = 0;
      if (x > x0 && x < x1) { const t = (x - x0) / (x1 - x0), cy = py0 + (py1 - py0) * t + Math.sin(t * 3 + phi) * 0.05 * H, hw = 10 + 15 * smooth01(0.4, 0.75, t) + 4 * (1 - smooth01(0, 0.2, t)); pen = clamp((1 - Math.abs(y - cy) / hw) * 2, 0, 1) * (1 - smooth01(0.82, 1, t)) }
      const mask = Math.max(main, pen); d += 0.55 * (mask - 1) + 0.12 * mask;
    }
    return d;
  };
}

/* ----- rivers: winding bands of water crossing the map, with fords where people can wade across ----- */
function carveRivers(w, rng) {
  const { W, H } = CFG, n = rng() < 0.55 ? 1 : 2, rivers = [];
  for (let r = 0; r < n; r++) {
    const vertical = rng() < 0.5, side = rng() < 0.5 ? -1 : 1, off = (22 + rng() * 26) * side + (r ? -side * 60 : 0);
    const len = vertical ? H : W, A = vertical ? { x: W / 2 + off + (rng() - 0.5) * 30, y: 0 } : { x: 0, y: H / 2 + off * 0.7 + (rng() - 0.5) * 24 }, B = vertical ? { x: W / 2 + off + (rng() - 0.5) * 30, y: H - 1 } : { x: W - 1, y: H / 2 + off * 0.7 + (rng() - 0.5) * 24 };
    const amp = 8 + rng() * 10, ph = rng() * 6.283, fr = 1.2 + rng() * 1.2, pts = [];
    for (let s = 0; s <= len * 2; s++) { const t = s / (len * 2), lat = Math.sin(t * Math.PI * fr + ph) * amp * Math.sin(Math.PI * Math.min(1, t * 1.15)) + (rng() - 0.5) * 0.6; pts.push({ x: A.x + (B.x - A.x) * t + (vertical ? lat : 0), y: A.y + (B.y - A.y) * t + (vertical ? 0 : lat) }) }
    rivers.push(pts);
    const set = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return; const i = y * W + x; if (v === TERR.DEEP || w.terr[i] > TERR.SHALLOW) w.terr[i] = v; w.feat[i] = 0; w.res[i] = 0 };
    for (const p of pts) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const d = Math.hypot(dx, dy); if (d <= 1.3) set(p.x + dx, p.y + dy, TERR.DEEP); else if (d <= 2.6) set(p.x + dx, p.y + dy, TERR.SHALLOW) }
    const k = 2 + (rng() < 0.5 ? 1 : 0), fords = [];
    for (let f = 0; f < k; f++) fords.push(0.12 + 0.76 * (f + 0.3 + 0.4 * rng()) / k);
    for (const t of fords) { const p = pts[Math.round(t * (pts.length - 1))]; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { if (Math.hypot(dx, dy) > 3.6) continue; const x = Math.round(p.x + dx), y = Math.round(p.y + dy); if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const i = y * W + x; if (w.terr[i] <= TERR.SHALLOW) w.terr[i] = TERR.FORD } }
  }
  w.rivers = rivers.length;
}

/* ----- which walkable ground is connected to which (computed from the terrain, never saved) ----- */
function landRegions(w) {
  if (w._reg) return w._reg; const { W, H } = CFG, N = W * H, label = new Int32Array(N), q = new Int32Array(N), sizes = [0]; let next = 1;
  const ok = i => { const t = w.terr[i]; return t === TERR.GRASS || t === TERR.SAND || t === TERR.ROCK || t === TERR.FORD || t === TERR.BRIDGE };
  for (let s = 0; s < N; s++) {
    if (label[s] || !ok(s)) continue; let h = 0, t = 0; q[t++] = s; label[s] = next;
    while (h < t) { const u = q[h++], x = u % W, y = (u / W) | 0; for (const [dx, dy] of NB) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const v = ny * W + nx; if (!label[v] && ok(v)) { label[v] = next; q[t++] = v } } }
    sizes[next] = t; next++;
  }
  return (w._reg = { label, sizes });
}
const sameLand = (w, ax, ay, bx, by) => { const R = landRegions(w), a = R.label[ay * CFG.W + ax], b = R.label[by * CFG.W + bx]; return a > 0 && a === b };

/* ----- neighbours that can be walked to (plus an island or two across any sea) ----- */
function genFullNeighbours(w) {
  const { W, H } = CFG, nrng = mulberry32((w.seed ^ 0x51ED270B) >>> 0), R = () => nrng(), reg = landRegions(w), home = reg.label[w.cy * W + w.cx], A = w.arch;
  const kinds = Object.keys(NEIGH_KINDS); for (let i = kinds.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0;[kinds[i], kinds[j]] = [kinds[j], kinds[i]] }
  const used = new Set(), out = [], minD = A === 'lakeland' ? 40 : 48, maxD = 135, land = i => w.terr[i] === TERR.GRASS;
  const name = () => { let n = '', g = 0; do n = NEIGH_NAMES[(R() * NEIGH_NAMES.length) | 0] + NEIGH_TAIL[(R() * NEIGH_TAIL.length) | 0]; while (used.has(n) && g++ < 20); used.add(n); return n };
  for (let tries = 0; tries < 900 && out.length < 4; tries++) {
    const x = 8 + ((R() * (W - 16)) | 0), y = 8 + ((R() * (H - 16)) | 0), i = y * W + x; if (!land(i) || reg.label[i] !== home) continue;
    const d = Math.hypot(x - w.cx, y - w.cy); if (d < minD || d > maxD || out.some(o => Math.hypot(o.x - x, o.y - y) < 34)) continue;
    let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (!land((y + dy) * W + x + dx)) { ok = false; break } if (!ok) continue;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = (y + dy) * W + x + dx; if (Math.hypot(dx, dy) < 3.4 && w.terr[j] >= TERR.SAND) { w.feat[j] = 0; w.res[j] = 0 } }
    out.push({ id: out.length + 1, name: name(), kind: kinds[out.length % kinds.length], x, y, cx: x, cy: y, r: 8, pop: 10 + ((R() * 18) | 0), found: false, foundDay: 0, dist: Math.round(d), reach: 'land' });
  }
  // a sea island off each coast (reached by boat), where the map has sea at all
  const seaSides = (w.coastSides || []).map((c, s) => c ? s : -1).filter(s => s >= 0).slice(0, 2);
  for (const s of seaSides) {
    const t = 0.35 + 0.3 * R(), cx = s === 0 ? 14 : s === 1 ? W - 15 : W * t, cy = s === 2 ? 14 : s === 3 ? H - 15 : H * t, r = 7 + 2.5 * R(); let wet = 0, n = 0;
    for (let y = Math.round(cy - r - 3); y <= cy + r + 3; y++) for (let x = Math.round(cx - r - 3); x <= cx + r + 3; x++) { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; n++; if (w.terr[y * W + x] <= TERR.SHALLOW) wet++ }
    if (wet < n * 0.85) continue;
    for (let y = Math.round(cy - r - 3); y <= cy + r + 3; y++) for (let x = Math.round(cx - r - 3); x <= cx + r + 3; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const dd = Math.hypot(x - cx, y - cy) / r, i = y * W + x; if (dd > 1.35) continue;
      const e = 0.72 - 0.62 * dd * dd + (R() - 0.5) * 0.1, t = e < 0.28 ? TERR.DEEP : e < 0.34 ? TERR.SHALLOW : e < 0.37 ? TERR.SAND : TERR.GRASS; if (t <= TERR.SHALLOW && w.terr[i] > TERR.SHALLOW) continue; w.terr[i] = t;
      if (t === TERR.GRASS && R() < 0.3) { w.feat[i] = R() < 0.5 ? FEAT.OAK : FEAT.PINE; w.res[i] = 4 }
    }
    let site = null, bd = 1e9; for (let y = Math.round(cy - r); y <= cy + r; y++) for (let x = Math.round(cx - r); x <= cx + r; x++) { if (w.terr[y * W + x] !== TERR.GRASS) continue; let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (w.terr[(y + dy) * W + x + dx] !== TERR.GRASS) { ok = false; break } const dd = Math.hypot(x - cx, y - cy); if (ok && dd < bd) { bd = dd; site = { x, y } } }
    if (!site) continue;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = (site.y + dy) * W + site.x + dx; if (Math.hypot(dx, dy) < 3.4 && w.terr[j] >= TERR.SAND) { w.feat[j] = 0; w.res[j] = 0 } }
    out.push({ id: out.length + 1, name: name(), kind: kinds[out.length % kinds.length], x: site.x, y: site.y, cx: Math.round(cx), cy: Math.round(cy), r, pop: 10 + ((R() * 18) | 0), found: false, foundDay: 0, dist: Math.round(Math.hypot(site.x - w.cx, site.y - w.cy)), reach: out.some(o => o.reach === 'boats') ? 'navigation' : 'boats' });
  }
  w._reg = null; for (const nb of out) initNeighbour(w, nb, R);
  w.neigh = out; w.fog = true; w.seen = new Uint8Array(W * H); revealCircle(w, w.cx, w.cy, 55);
}
