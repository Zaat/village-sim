/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
/* ===== districts.js: the town as districts (v0.37 Metropolis) =====
   A district is a 16x16 tile block with homes in it. Nothing here is stored: every few days the town is read off the buildings
   (homes, beds, styles, farms, shops) and the crowd is shared out by free beds, so the counts always add up to w.pop.
   The sim uses it for one thing: in Play, a group order on a district sends that district's hands to food, wood or stone
   (crowdWork asks districtHands). The overlay and the card are the player's window on it. No random numbers; the cache
   is rebuilt on a fixed day schedule so a saved and reloaded game gives the same answer. */
const DIST = { cell: 16, every: 4, orders: { farm: 'food', wood: 'wood', stone: 'stone' } };
const DIST_RING = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const distKey = (gx, gy) => gy * 100 + gx;
/* read the town into districts; crowd residents go where beds are free */
function districtsBuild(w) {
  const c = DIST.cell, map = new Map(), get = (x, y) => { const gx = Math.floor(x / c), gy = Math.floor(y / c), k = distKey(gx, gy); let d = map.get(k); if (!d) map.set(k, d = { key: k, gx, gy, homes: 0, beds: 0, focus: 0, tiers: [0, 0, 0, 0, 0, 0, 0], farms: 0, stores: 0, shops: 0, camps: 0, sx: 0, sy: 0 }); return d };
  for (const b of w.buildings.values()) {
    if (b.type === 'house') { const d = get(b.x, b.y); d.homes++; d.beds += bedsOf(b); d.focus += b.occ.length; d.tiers[b.style || 0]++; d.sx += b.x; d.sy += b.y }
    else if (b.type === 'farm' || b.type === 'store' || b.type === 'workshop' || b.type === 'power' || b.type === 'market' || b.type === 'logcamp' || b.type === 'minecamp' || b.type === 'lodge') { const d = get(b.x, b.y); if (b.type === 'farm') d.farms++; else if (b.type === 'store') d.stores++; else if (b.type === 'workshop' || b.type === 'market' || b.type === 'power') d.shops++; else d.camps++ }
  }
  const list = [...map.values()].filter(d => d.homes > 0).sort((a, b) => a.key - b.key), C = w.crowd, n = (C ? C.n : 0) + Math.max(0, w.vills.length - list.reduce((a, d) => a + d.focus, 0));       // villagers without a home of their own (newcomers waiting for a bed) are counted with the crowd
  // the crowd goes where beds are free (largest remainder, so the parts add up to the whole)
  const free = list.map(d => Math.max(0, d.beds - d.focus)), fs = free.reduce((a, x) => a + x, 0), wt = fs > 0 ? free : list.map(d => d.beds), ws = wt.reduce((a, x) => a + x, 0) || 1, part = wt.map(x => x * n / ws), whole = part.map(Math.floor);
  let rest = n - whole.reduce((a, x) => a + x, 0); part.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (rest > 0) { whole[i]++; rest-- } });
  const names = {};
  list.forEach((d, i) => {
    d.crowd = whole[i]; d.pop = d.focus + d.crowd; d.cx = d.sx / d.homes; d.cy = d.sy / d.homes; d.dist = Math.hypot(d.cx - w.cx, d.cy - w.cy);
    const ang = Math.atan2(d.cy - w.cy, d.cx - w.cx), dir = DIST_RING[(Math.round(ang / (Math.PI / 4)) + 8) % 8], base = d.dist < 10 ? 'The core' : d.dist < 24 ? `${dir[0].toUpperCase()}${dir.slice(1)} quarter` : `${dir[0].toUpperCase()}${dir.slice(1)} edge`;
    names[base] = (names[base] || 0) + 1; d.name = names[base] > 1 ? `${base} ${names[base]}` : base;
    d.top = d.tiers.reduce((m, x, j) => x > d.tiers[m] ? j : m, 0); d.full = d.pop >= d.beds - 1; d.density = d.beds / (c * c / 100);
  });
  return { day: w.day, list, total: list.reduce((a, d) => a + d.pop, 0) };
}
/* the sim's copy, rebuilt every DIST.every days by crowdDay; the page's copy is separate so looking never changes the game */
function districtsDay(w) { if (!w._dist || w.day - w._dist.day >= DIST.every || w._dist.day > w.day) w._dist = districtsBuild(w) }
function districtsView(w) { const a = w._dist; if (a && w.day - a.day < DIST.every && a.day <= w.day) return a; const u = w._distUI; if (u && u.day === w.day) return u; return (w._distUI = districtsBuild(w)) }
const districtAt = (w, tx, ty) => districtsView(w).list.find(d => d.gx === Math.floor(tx / DIST.cell) && d.gy === Math.floor(ty / DIST.cell)) || null;
const districtOrders = w => (w.play && w.play.on && w.play.dorders) || {};
/* share of the crowd that lives in districts with a group order: { food: 0.2, wood: 0, stone: 0.1 } */
function districtHands(w) {
  const o = districtOrders(w), out = { food: 0, wood: 0, stone: 0 }, D = w._dist, C = w.crowd; if (!D || !C || C.n <= 0) return out;
  for (const d of D.list) { const k = DIST.orders[o[d.key]]; if (k) out[k] += d.crowd / C.n }
  return out;
}
function districtOrder(w, key, order) { const P = w.play || (w.play = { on: false, auto: { build: true, research: true, jobs: true }, orders: {}, zones: {}, nz: 0, share: null, did: 0 }); P.dorders = P.dorders || {}; if (order && DIST.orders[order]) P.dorders[key] = order; else delete P.dorders[key] }
