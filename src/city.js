/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   city.js (v0.33): how the village grows into a town and a city.

   • Land value (0-100) on a grid of 4x4 tiles, refreshed every few days: the
     pull of the camp, market, plaza, tavern, hall and other services, roads
     and neighbours' buildings, the shore, minus the nuisance of farms, camps,
     mines and foundries.
   • Density follows value: the best ground gets the best style the village
     knows (towers in the core), the edge keeps log cabins; old homes are
     rebuilt in place as the ground gets dearer (see planUpgrades in tech.js).
   • Redevelopment: ruins are cleared, and bare farmland that the city has
     grown around is given up and the field is moved outward.
   • Hamlets: satellite clusters of homes, founded when the close ground fills
     up or the people prefer to spread out; each gets a store of its own.
   • Desire paths: villagers' footsteps are counted; the most walked ground is
     paved, and the most walked roads get the best surface first.
   • Layout character comes from regime authority, philosophy and danger.

   Pure simulation: no page access, no w.r() calls (decisions are
   deterministic from the world's state). State in w.city is saved; the
   value grid and the footfall counts are rebuilt after a load.
   ========================================================================== */
const CITY_CELL = 4;
const SERVICE_W = { plaza: 30, market: 26, tavern: 18, hall: 24, library: 16, temple: 18, amphitheatre: 14, monument: 10, store: 8, dock: 12, workshop: 6 };
const NUISANCE = { farm: 9, logcamp: 14, minecamp: 14, lodge: 8, foundry: 16, workshop: 8, barracks: 6 };
Object.assign(CFG.COST, { workshop: { wood: 18, stone: 6 } }); Object.assign(CFG.BUILD_TIME, { workshop: 170 }); Object.assign(CFG.SIZE, { workshop: [3, 2] }); Object.assign(CFG.SOLID, { workshop: true });
const COMPASS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];

function cityState(w) { return w.city || (w.city = { hamlets: [], cleared: { farm: 0, ruin: 0 }, nextRenew: 0, nextHam: 0, lvDay: -99, placed: 0, vmax: 40, paved: 0, surfaced: 0 }) }
const lvGrid = w => { const g = Math.ceil(CFG.W / CITY_CELL); return { gw: g, gh: Math.ceil(CFG.H / CITY_CELL) } };
/* land value at a tile, or -1 before the first count */
function lvAt(w, x, y) { if (!w._lv) return -1; const { gw } = lvGrid(w); return w._lv[((y / CITY_CELL) | 0) * gw + ((x / CITY_CELL) | 0)] }
/* how the people like to lay the place out: compact (tight, walled, orderly) against spread out (hamlets, wide lanes) */
function layoutBias(w) {
  const A = w.rx ? Math.min(1, w.rx.A || 0) : 0.3, ph = (w.settings && w.settings.philosophy) || 'balanced', threat = typeof threatLevel === 'function' ? Math.min(1, threatLevel(w)) : 0;
  const compact = clamp(0.35 + 0.4 * A + (ph === 'martial' ? 0.2 : 0) + 0.3 * threat - (ph === 'practical' ? 0.08 : 0), 0.1, 1);
  return { compact, shore: ph === 'mercantile' ? 1.6 : 1, spread: 1 - compact };
}
const waterAt = (w, x, y) => x < 0 || y < 0 || x >= CFG.W || y >= CFG.H ? false : w.terr[y * CFG.W + x] <= TERR.SHALLOW;

function landValueDay(w) {
  const C = cityState(w); if (w._lv && w.day - C.lvDay < 6) return; C.lvDay = w.day;
  const { W, H } = CFG, { gw, gh } = lvGrid(w), lv = w._lv && w._lv.length === gw * gh ? w._lv : (w._lv = new Float32Array(gw * gh));
  const pts = [[w.cx, w.cy, 22]], bad = [], pop = w.pop;
  for (const b of w.buildings.values()) { const s = SERVICE_W[b.type]; if (s) pts.push([b.x + b.w / 2, b.y + b.h / 2, s]); const n = NUISANCE[b.type]; if (n) bad.push([b.x + b.w / 2, b.y + b.h / 2, n]) }
  const R = 12 + Math.min(14, pop / 35), bias = layoutBias(w); let vmax = 0;
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const cx = gx * CITY_CELL + 2, cy = gy * CITY_CELL + 2, g = gy * gw + gx; if (cx >= W || cy >= H || w.terr[cy * W + cx] < TERR.SAND) { lv[g] = 0; continue }
    let v = 0; for (const p of pts) { const d = Math.hypot(p[0] - cx, p[1] - cy); if (d < R) v += p[2] * (1 - d / R) } v = Math.min(70, v);
    let roads = 0, built = 0; for (let dy = 0; dy < CITY_CELL; dy++) for (let dx = 0; dx < CITY_CELL; dx++) { const j = (gy * CITY_CELL + dy) * W + gx * CITY_CELL + dx; if (j < W * H) { if (w.road[j]) roads++; if (w.bmap[j]) built++ } }
    v += Math.min(14, roads * 2.5) + Math.min(8, built * 0.8);
    for (const p of bad) { const d = Math.hypot(p[0] - cx, p[1] - cy); if (d < 7) v -= p[2] * (1 - d / 7) }
    if (waterAt(w, cx + 6, cy) || waterAt(w, cx - 6, cy) || waterAt(w, cx, cy + 6) || waterAt(w, cx, cy - 6)) v += 6 * bias.shore;
    v = clamp(v, 0, 100); lv[g] = v; if (v > vmax) vmax = v;
  }
  C.vmax = Math.max(35, vmax);
}
/* the best style that fits a site: the top style the village knows on the dearest ground, falling off with value; log cabins at the edge */
function siteStyle(w, x, y) {
  const top = styleNow(w), v = lvAt(w, x, y); if (v < 0 || !w.city) return top;
  return clamp(Math.round(top * clamp((v / w.city.vmax - 0.15) / 0.7, 0, 1)), 0, top);
}

/* ---------- where homes and fields go ---------- */
function houseScore(w, x, y, d, pop) {
  const b = layoutBias(w), v = lvAt(w, x, y);
  return d * (0.35 + 0.65 * b.compact) - (v > 0 ? v * 0.18 : 0) + w.r() * 2 + (pop > 40 ? w.r() * Math.min(10, pop / 12) : 0);
}
function farmScore(w, x, y, d, pop) { const v = lvAt(w, x, y), rel = v > 0 && w.city ? v / w.city.vmax : 0; return Math.abs(d - (9 + Math.min(26, pop / 12))) + (v > 0 ? v * 0.1 : 0) + (pop >= 60 && rel > 0.5 ? 30 : 0) + w.r() * 3 }       // fields keep out of the dear ground once the town has grown
function homesNear(w, x, y, r) { let n = 0, p = 0; for (const b of w.buildings.values()) if (b.type === 'house' && Math.hypot(b.x - x, b.y - y) <= r) { n++; p += b.occ.length } return { n, p } }
/* houses alternate between the main town and the hamlets in proportion to how spread out the people like to live */
function placeHouse(w) {
  const C = cityState(w), b = layoutBias(w); C.placed++;
  if (C.hamlets.length && (C.placed % 5) < Math.round(5 * b.spread * 0.5)) {
    const hs = C.hamlets.map(h => ({ h, n: homesNear(w, h.x, h.y, 11).n })).sort((a, c) => a.n - c.n);
    for (const { h } of hs) { const r = placeBuilding(w, 'house', true, h); if (r) return r }
  }
  return placeBuilding(w, 'house');
}
/* workshops: a trade quarter on cheaper ground a little way from the centre (smoke and noise), where the crafts work together */
function workshopScore(w, x, y, d) { const v = lvAt(w, x, y), rel = v > 0 && w.city ? v / w.city.vmax : 0.5; return Math.abs(d - 11) + Math.abs(rel - 0.45) * 12 + w.r() * 2 }
function planWorkshops(w) {
  const pop = w.pop; if (pop < 30 || !w.has('tools') || w.stock.wood < 40 || w.bps.some(b => b.type === 'workshop')) return;
  if (w.of('workshop').length >= Math.min(5, 1 + Math.floor(pop / 55))) return; placeBuilding(w, 'workshop');
}
function foundHamlet(w) {
  const C = cityState(w), pop = w.pop, { W, H } = CFG, L = CFG.LATTICE, b = layoutBias(w), sc = clamp(Math.sqrt(pop / 1200), 1, 2), RR = Math.round(62 * sc);
  if (pop < 50 || C.hamlets.length >= Math.min(Math.round(6 * sc), 1 + Math.floor(pop / 110)) || w.day < C.nextHam || !w._lv) return null;
  const closeFree = placeFunnel(w, 'house', false); const squeezed = closeFree.reach < 25 || (w.noRoom != null && w.day - w.noRoom < 24);
  if (!squeezed && !(b.spread > 0.5 && pop >= 80)) return null;
  C.nextHam = w.day + 24;
  const cands = [];
  for (let y = w.cy - RR; y <= w.cy + RR; y += L * 2) for (let x = w.cx - RR; x <= w.cx + RR; x += L * 2) {
    const d = Math.hypot(x - w.cx, y - w.cy); if (d < 20 || d > 58 * sc || x < 6 || y < 6 || x + 12 >= W - 2 || y + 9 >= H - 2) continue;
    if (C.hamlets.some(h => Math.hypot(h.x - x, h.y - y) < 18)) continue;
    let free = 0, tot = 0; for (let dy = 0; dy < 9; dy += 2) for (let dx = 0; dx < 12; dx += 2) { tot++; const i = (y + dy) * W + x + dx; if (w.terr[i] === TERR.GRASS && !w.feat[i] && !w.bmap[i] && !w.road[i] && !w.bpAt.has(i) && w.claim[i] < 0) free++ }
    if (free < tot * 0.75) continue;
    const wet = waterAt(w, x - 4, y + 4) || waterAt(w, x + 16, y + 4) || waterAt(w, x + 6, y - 4) || waterAt(w, x + 6, y + 13);
    cands.push({ x: x + 5, y: y + 4, score: Math.abs(d - 32) - (wet ? 5 : 0) - (lvAt(w, x, y) > 0 ? lvAt(w, x, y) * 0.05 : 0) + (hash2(x, y) % 7) * 0.4 });
  }
  cands.sort((a, c) => a.score - c.score); if (!cands.length) return null;
  const s0 = w._st; w.search(w.cx - 1, w.cy, () => false, 420); if (w._st === s0) return null; const seen = w._seen, st = w._st;
  for (const c of cands.slice(0, 24)) {
    if (seen[c.y * W + c.x] !== st) continue;
    const ang = Math.atan2(c.y - w.cy, c.x - w.cx), dir = COMPASS[(Math.round(ang / (Math.PI / 4)) + 8) % 8], same = C.hamlets.filter(h => h.dir === dir).length;
    const h = { x: c.x, y: c.y, day: w.day, dir, name: `${dir} hamlet${same ? ' ' + (same + 1) : ''}` }; C.hamlets.push(h);
    w.emit('event', `Families are settling at a new spot to the ${dir}: the ${h.name}.`, { kind: 'city' }); return h;
  }
  return null;
}
/* a hamlet with enough homes gets its own store */
function hamletStores(w) {
  const C = cityState(w); if (w.stock.wood < 24 || w.bps.some(b => b.type === 'store')) return;
  for (const h of C.hamlets) {
    if (homesNear(w, h.x, h.y, 12).n < 6) continue; if (w.of('store').some(s => Math.hypot(s.x - h.x, s.y - h.y) < 14)) continue;
    if (placeBuilding(w, 'store', true, h)) return;
  }
}

/* ---------- redevelopment ---------- */
function renewalDay(w) {
  const C = cityState(w), pop = w.pop; if (pop < 40 || w.day < C.nextRenew || !w._lv) return; C.nextRenew = w.day + 3;
  for (const b of w.buildings.values()) if (b.type === 'house' && b.maxHp && b.hp < b.maxHp * 0.18 && !b.occ.length && !w.bpAt.has(b.y * CFG.W + b.x)) { w.removeBuilding(b); C.cleared.ruin++; return }
  const pressure = (w.noRoom != null && w.day - w.noRoom < 20) || w.beds() < pop + 4, thr = pressure ? 0.5 : 0.8;
  if (w.stock.wood < 20 || w.season === 1) return;
  let best = null, bv = 0;
  for (const f of w.of('farm')) { if (f.state !== 0) continue; const v = lvAt(w, f.x, f.y) / C.vmax; if (v >= thr && v > bv) { best = f; bv = v } }
  if (best && w.of('farm').length >= 3 && w.day - (C.lastFarm || -99) >= 12) { C.lastFarm = w.day; w.removeBuilding(best); C.cleared.farm++; w.emit('event', 'A field at the heart of the town is given up for building; the farmers will plough new ground further out.', { kind: 'city' }) }
}

/* ---------- desire paths ---------- */
function cityTick(w) {
  const { W, H } = CFG, h = w._heat && w._heat.length === W * H ? w._heat : (w._heat = new Uint16Array(W * H));
  for (const v of w.vills) { if (v.sleeping) continue; const x = v.x | 0, y = v.y | 0; if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (!w.bmap[i] && h[i] < 60000) h[i]++ }
}
function pathDay(w) {
  const { W, H } = CFG, h = w._heat; if (!h) return; for (let i = 0; i < h.length; i++) if (h[i]) h[i] -= (h[i] >> 3) + 1;
  const C = cityState(w), pop = w.pop; if (pop < 25 || w.stock.stone < 3) return;
  const thr = 18, level = w.has('concrete') ? 4 : w.has('roads') ? 3 : w.has('masonry') ? 2 : 1, open = w.bps.filter(b => b.type === 'road').length;
  const hot = []; for (let i = 0; i < h.length; i++) if (h[i] >= thr) hot.push(i);
  hot.sort((a, b) => h[b] - h[a] || a - b);
  let made = 0, up = 0;
  for (const i of hot) {
    const x = i % W, y = (i / W) | 0;
    if (w.road[i]) { if (w.road[i] < level && up < 4 && w.stock.stone >= 3) { w.road[i] = level; w.stock.stone -= 1; up++; C.surfaced++ } continue }
    if (made >= 2 || open + made >= 10 || !autoOn(w, 'build')) continue;
    if (w.terr[i] !== TERR.GRASS && w.terr[i] !== TERR.SAND) continue; if (w.feat[i] || w.bmap[i] || w.bpAt.has(i) || w.claim[i] >= 0) continue;
    let touch = false; for (let dy = -1; dy <= 1 && !touch; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (w.road[j] || w.bmap[j] || w.bpAt.has(j)) { touch = true; break } }
    if (!touch) continue; makeBp(w, 'road', x, y); made++; C.paved++;
  }
}

/* ---------- daily hook ---------- */
function cityDay(w) {
  landValueDay(w); pathDay(w);
  if (w.day % 3 === 0 && autoOn(w, 'build')) { foundHamlet(w); renewalDay(w); hamletStores(w) }
}
/* what the city looks like, for the card and the diagnostics */
function cityStats(w) {
  const C = cityState(w), houses = w.houses(), byStyle = [0, 0, 0, 0, 0, 0, 0], beds = [0, 0, 0, 0, 0, 0, 0]; let core = 0, inner = 0, outer = 0, hamlet = 0, lvSum = 0, lvN = 0;
  for (const b of houses) {
    const s = b.style || 0; byStyle[s]++; beds[s] += bedsOf(b); const d = Math.hypot(b.x - w.cx, b.y - w.cy);
    if (C.hamlets.some(h => Math.hypot(h.x - b.x, h.y - b.y) < 12)) hamlet++; else if (d < 10) core++; else if (d < 22) inner++; else outer++;
    const v = lvAt(w, b.x, b.y); if (v >= 0) { lvSum += v; lvN++ }
  }
  return { houses: houses.length, byStyle, beds, core, inner, outer, hamlet, avgLv: lvN ? Math.round(lvSum / lvN) : 0, vmax: Math.round(C.vmax), hamlets: C.hamlets.map(h => ({ ...h, ...homesNear(w, h.x, h.y, 12) })), cleared: C.cleared, paved: C.paved, surfaced: C.surfaced, bias: layoutBias(w) };
}
