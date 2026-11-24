'use strict';
/* ==========================================================================
   town.js — the town "mind": what to build, who does which job, and the
   random events that give the story texture. Villagers decide WHEN and HOW.
   ========================================================================== */
function makeBp(w, type, x, y, extra) {
  const tb = type === 'upgrade' ? w.buildings.get(extra.target) : null, [bw, bh] = type === 'road' ? [1, 1] : tb ? [tb.w, tb.h] : CFG.SIZE[type];
  const cost = type === 'upgrade' ? ([null, { wood: 6, stone: 0 }, { wood: 4, stone: 8 }, { wood: 3, stone: 10 }, { wood: 4, stone: 12 }, { wood: 4, stone: 16 }][extra.toStyle] || { wood: 6, stone: 0 }) : CFG.COST[type];
  const bp = { id: w.bpnext++, type, x, y, w: bw, h: bh, idx: y * CFG.W + x, cost, ...(extra || {}), have: { wood: 0, stone: 0 }, inc: { wood: 0, stone: 0 }, prog: 0, time: CFG.BUILD_TIME[type], workers: 0, alive: true, ready() { return this.have.wood >= this.cost.wood && this.have.stone >= this.cost.stone } };
  w.bps.push(bp); for (let dy = 0; dy < bh; dy++) for (let dx = 0; dx < bw; dx++) w.bpAt.set((y + dy) * CFG.W + x + dx, bp);
  return bp;
}
function placeBuilding(w, type, wide, at) {       // `at` (a hamlet) restricts the search to the ground around it
  const [bw, bh] = CFG.SIZE[type], L = CFG.LATTICE, cands = [], { W, H } = CFG, k = wide ? 1.9 : 1, dmax = at ? 200 : wide ? 74 : 40, pop = w.vills.length;
  const ax0 = at ? at.x - 10 : w.cx - Math.round(45 * k), ax1 = at ? at.x + 10 : w.cx + Math.round(45 * k), ay0 = at ? at.y - 8 : w.cy - Math.round(36 * k), ay1 = at ? at.y + 8 : w.cy + Math.round(36 * k);
  for (let y = ay0; y <= ay1; y += L) for (let x = ax0; x <= ax1; x += L) {
    if (x < 2 || y < 2 || x + bw >= W - 2 || y + bh >= H - 2) continue;
    let ok = true;
    for (let dy = 0; dy < bh && ok; dy++) for (let dx = 0; dx < bw; dx++) {
      const i = (y + dy) * W + x + dx;
      if (w.terr[i] !== TERR.GRASS || w.feat[i] || w.bmap[i] || w.road[i] || w.bpAt.has(i) || w.claim[i] >= 0) { ok = false; break }
    }
    if (!ok) continue;
    const d = Math.hypot(x - w.cx, y - w.cy); if (d < 2.5 || d > dmax) continue;
    const score = at ? Math.hypot(x - at.x, y - at.y) + w.r() * 2 : type === 'house' ? houseScore(w, x, y, d, pop) : type === 'farm' ? farmScore(w, x, y, d, pop) : type === 'workshop' ? workshopScore(w, x, y, d) : type === 'store' ? Math.abs(d - 5) + w.r() * 2 : type === 'market' ? Math.abs(d - 5.5) + w.r() * 2 : type === 'plaza' ? Math.abs(d - 4.5) + w.r() * 1.5 : type === 'tavern' ? Math.abs(d - 7) + w.r() * 2 : Math.abs(d - 9) + w.r() * 3;
    cands.push({ x, y, score });
  }
  cands.sort((a, b) => a.score - b.score);
  if (cands.length) {
    const s0 = w._st; w.search(w.cx - 1, w.cy, () => false, wide ? 320 : 120); if (w._st === s0) return null;       // one flood from camp tells which sites can be walked to (many floods for the best few used to fail together when they were all cut off)
    const seen = w._seen, st = w._st;
    for (const c of cands.slice(0, 80)) {
      let ok = false; for (let dy = -1; dy <= bh && !ok; dy++) for (let dx = -1; dx <= bw; dx++) { if ((dx < 0 || dx >= bw) && (dy < 0 || dy >= bh)) continue; const xx = c.x + dx, yy = c.y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && seen[yy * W + xx] === st) { ok = true; break } }
      if (ok) { if (wide) w.sprawl = (w.sprawl || 0) + 1; return makeBp(w, type, c.x, c.y) }
    }
  }
  if (!wide && !at && (type === 'house' || type === 'farm' || type === 'store')) { const r = placeBuilding(w, type, true); if (!r && type === 'house' && !w.deferredSearch) w.noRoom = w.day; return r }   // the close ground is full: look further out, in suburbs and hamlets
  return null;
}
/* why can no home be placed? Counts every lattice site by the first thing that rules it out, then how many of the free ones can be walked to from camp. Read only; used by concerns, the diagnostics and the probes. */
function placeFunnel(w, type, wide) {
  type = type || 'house'; const [bw, bh] = CFG.SIZE[type], L = CFG.LATTICE, { W, H } = CFG, k = wide ? 1.9 : 1, dmax = wide ? 74 : 40, f = { cells: 0, edge: 0, water: 0, tree: 0, built: 0, road: 0, plan: 0, claimed: 0, near: 0, far: 0, free: 0, reach: 0, unreach: 0 }, free = [];
  for (let y = w.cy - Math.round(36 * k); y <= w.cy + Math.round(36 * k); y += L) for (let x = w.cx - Math.round(45 * k); x <= w.cx + Math.round(45 * k); x += L) {
    f.cells++; if (x < 2 || y < 2 || x + bw >= W - 2 || y + bh >= H - 2) { f.edge++; continue }
    let why = null;
    for (let dy = 0; dy < bh && !why; dy++) for (let dx = 0; dx < bw; dx++) {
      const i = (y + dy) * W + x + dx;
      if (w.terr[i] !== TERR.GRASS) why = 'water'; else if (w.feat[i]) why = 'tree'; else if (w.bmap[i]) why = 'built'; else if (w.road[i]) why = 'road'; else if (w.bpAt.has(i)) why = 'plan'; else if (w.claim[i] >= 0) why = 'claimed';
      if (why) break;
    }
    if (why) { f[why]++; continue }
    const d = Math.hypot(x - w.cx, y - w.cy); if (d < 2.5) { f.near++; continue } if (d > dmax) { f.far++; continue }
    f.free++; free.push([x, y]);
  }
  if (free.length) {
    w.search(w.cx - 1, w.cy, () => false, wide ? 320 : 120); const seen = w._seen, st = w._st;       // one flood from camp: every tile it touched can be walked to
    for (const [x, y] of free) { let ok = false; for (let dy = -1; dy <= bh && !ok; dy++) for (let dx = -1; dx <= bw; dx++) { if ((dx < 0 || dx >= bw) && (dy < 0 || dy >= bh)) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && seen[yy * W + xx] === st) { ok = true; break } } if (ok) f.reach++; else f.unreach++ }
  }
  return f;
}
/* the housing diagnosis: when beds run short, what is actually in the way? Cached for six days; also kept in w.hdiag for the diagnostics report. */
function housingDiag(w) {
  if (w.hdiag && w.day - w.hdiag.day < 6) return w.hdiag;
  const pop = w.vills.length, bps = w.bps.filter(b => b.type !== 'road'), cap = 2 + Math.floor(pop / 8) + (ordersOf(w).build ? 4 : 0), hb = bps.filter(b => b.type === 'house'), cost = CFG.COST.house, why = [];
  const wait = bps.filter(b => !b.ready()).length, f = placeFunnel(w, 'house', true), fc = placeFunnel(w, 'house', false);
  if (bps.length >= cap) why.push(`${bps.length} building projects are already open, which is as many as the village can run at once (${cap})${wait ? `; ${wait} of them still wait for materials` : ''}`);
  if (w.stock.wood < cost.wood || w.stock.stone < cost.stone) why.push(`there is not enough ${w.stock.wood < cost.wood ? 'wood' : 'stone'} in store for another home`);
  if (!f.reach) why.push(`there is no free ground that people can walk to (${f.free} sites are free, but cut off by water, trees or buildings)`);
  else if (!fc.reach) why.push('the ground close to the village is full; homes now go up further out');
  if (hb.length && hb.every(b => !b.workers) && w.day > 3) why.push('homes are planned, but nobody is working on them');
  const d = { day: w.day, pop, beds: w.beds(), homes: w.houses().length, open: hb.length, cap, wait, stock: { wood: Math.floor(w.stock.wood), stone: Math.floor(w.stock.stone), food: Math.floor(w.stock.food) }, close: fc, wide: f, why }; w.hdiag = d; return d;
}
/* camps: built beside dense resources once the village has the know-how */
const CAMP_INFO = {
  logcamp: { tech: 'forestry', res: 'wood', limit: pop => Math.min(3, 1 + Math.floor(pop / 45)), min: 16, r: 8, count: (w, x, y, r) => countFeat(w, x, y, r, f => f === FEAT.OAK || f === FEAT.PINE) },
  minecamp: { tech: 'mining', res: 'stone', limit: pop => Math.min(2, 1 + Math.floor(pop / 60)), min: 8, r: 7, count: (w, x, y, r) => countFeat(w, x, y, r, f => f === FEAT.STONE) },
  lodge: { tech: 'lodges', res: 'food', limit: pop => Math.min(2, 1 + Math.floor(pop / 70)), min: 3, r: 12, count: (w, x, y, r) => w.animals.reduce((n, a) => n + (a.alive && a.kind !== 'wolf' && Math.hypot(a.x - x, a.y - y) <= r ? 1 : 0), 0) },
};
function countFeat(w, x, y, r, pred) {
  let n = 0; for (let yy = Math.max(0, y - r); yy <= Math.min(CFG.H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(CFG.W - 1, x + r); xx++) if (pred(w.feat[yy * CFG.W + xx])) n++;
  return n;
}
function placeCamp(w, type) {
  const info = CAMP_INFO[type], { W, H } = CFG, same = w.of(type), cands = [];
  for (let y = 4; y < H - 5; y += 2) for (let x = 4; x < W - 5; x += 2) {
    const d = Math.hypot(x - w.cx, y - w.cy); if (d < 10 || d > 52 || same.some(c => Math.hypot(c.x - x, c.y - y) < 14)) continue;
    let ok = true;
    for (let dy = 0; dy < 2 && ok; dy++) for (let dx = 0; dx < 2; dx++) { const i = (y + dy) * W + x + dx, t = w.terr[i]; if (!(t === TERR.GRASS || t === TERR.ROCK || t === TERR.SAND) || w.feat[i] || w.bmap[i] || w.road[i] || w.bpAt.has(i) || w.claim[i] >= 0) { ok = false; break } }
    if (!ok) continue;
    const sc = info.count(w, x + 1, y + 1, info.r); if (sc < info.min) continue;
    cands.push({ x, y, score: sc - d * 0.35 + w.r() });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands.slice(0, 6)) if (w.search(w.cx - 1, w.cy, (x, y) => w.nearRect(x, y, { x: c.x, y: c.y, w: 2, h: 2 }), 180)) return makeBp(w, type, c.x, c.y);
  return null;
}
function planCamps(w) {
  const pop = w.vills.length, count = type => w.bps.filter(b => b.type === type).length;
  for (const type of Object.keys(CAMP_INFO)) {
    const info = CAMP_INFO[type]; if (!w.has(info.tech) || w.day < (w['next_' + type] || 0)) continue;
    if (w.of(type).length + count(type) >= info.limit(pop) || w.stock.wood < CFG.COST[type].wood + 12 || w.stock.food < pop * 2) continue;
    w['next_' + type] = w.day + 2; if (placeCamp(w, type)) return;
  }
}
function placeDock(w) {
  const { W, H } = CFG, docks = w.of('dock'), cands = [];
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    const i = y * W + x, t = w.terr[i]; if ((t !== TERR.SAND && t !== TERR.GRASS) || w.feat[i] || w.bmap[i] || w.road[i] || w.bpAt.has(i)) continue;
    const d = Math.hypot(x - w.cx, y - w.cy); if (d > 48 || docks.some(k => Math.hypot(k.x - x, k.y - y) < 7)) continue;
    for (const [ux, uy] of NB) {
      let n = 0, deep = 0; for (let k = 1; k <= 8; k++) { const xx = x + ux * k, yy = y + uy * k; if (xx < 0 || yy < 0 || xx >= W || yy >= H || w.terr[yy * W + xx] > TERR.SHALLOW) break; n = k; if (w.terr[yy * W + xx] === TERR.DEEP) deep++ }
      if (n >= 5 && deep >= 2) { cands.push({ x, y, dir: [ux, uy], score: d - deep * 0.5 + w.r() * 3 }); break }
    }
  }
  if (w.neigh) { const sea = seaMask(w), open = cands.filter(c => sea[(c.y + c.dir[1]) * W + c.x + c.dir[0]]); if (open.length) cands.splice(0, cands.length, ...open) }     // with other islands out there, prefer docks on the open sea over an inland lake
  cands.sort((a, b) => a.score - b.score);
  for (const c of cands.slice(0, 6)) {
    if (w.search(w.cx - 1, w.cy, (x, y) => x === c.x && y === c.y, 160)) return makeBp(w, 'dock', c.x, c.y, { dir: c.dir });       // must be reachable on foot from the camp
  }
  return null;
}
function planRoads(w) {
  if (w.bps.filter(b => b.type === 'road').length >= 8) return;
  const targets = [...w.houses(), ...w.of('farm'), ...w.of('store'), ...w.of('logcamp'), ...w.of('minecamp'), ...w.of('lodge'), ...w.of('market'), ...w.of('plaza'), ...w.of('tavern'), ...w.of('workshop')];
  for (const b of targets) {
    if (w.connected.has(b.id)) continue; w.connected.add(b.id);
    const path = w.search(b.x, b.y, (x, y, i) => w.storeAdj[i] === 1 && !(w.bmap[i] && w.blk[i])); if (!path) continue;
    for (const i of path) { if (w.bmap[i] || w.bpAt.has(i) || w.road[i]) continue; makeBp(w, 'road', i % CFG.W, (i / CFG.W) | 0) }
    return;
  }
}
/* ---------- growth: how forgiving the world is, and how well life is going ---------- */
const HARDSHIP = [
  { name: 'Gentle', fert: 1.25, imm: 1.4, wolf: 0.6, sick: 0.7, cold: 0.7, note: 'more births and newcomers, fewer wolves, fevers and hard winters' },
  { name: 'Normal', fert: 1, imm: 1, wolf: 1, sick: 1, cold: 1, note: 'the usual balance' },
  { name: 'Harsh', fert: 0.8, imm: 0.7, wolf: 1.4, sick: 1.3, cold: 1.3, note: 'fewer births and newcomers, more wolves, fevers and hard winters' },
];
const hardOf = w => HARDSHIP[w.settings.hardship == null ? 1 : w.settings.hardship] || HARDSHIP[1];
/* prosperity 0.3..1.8, refreshed daily: food in store, spare beds, mood and health. It nudges births, newcomers and how far ahead builders plan. */
function prosperityDay(w) {
  const pop = Math.max(1, w.vills.length), food = clamp(w.stock.food / pop / 6, 0, 1.5), room = clamp((w.beds() - pop) / (pop * 0.15 + 2), 0, 1);
  let mood = 0, hp = 0; for (const v of w.vills) { mood += v.mood; hp += v.health } mood /= pop * 100; hp /= pop * 100;
  const fa = w.vills.filter(v => v.isAdult() && v.age <= CFG.FERTILE_MAX * (w.lifeScale || 1)); w.pairNeed = fa.length >= 6 ? clamp(1 - (fa.filter(v => v.partner != null).length / fa.length) / 0.55, 0, 1) : 0;       // few couples among the fertile: people are readier to settle down
  w.lifeScale = 1 + 0.5 * Math.min(0.75, techFx(w, 'health'));       // medicine, nutrition and sanitation stretch a life by up to about 37%
  w.prosp = clamp(0.4 + 0.35 * food + 0.35 * room + 0.5 * (mood - 0.5) + 0.3 * (hp - 0.7), 0.3, 1.8);
}
const fertilityMult = w => clamp(w.prosp == null ? 1 : w.prosp, 0.5, 1.6);
function planTown(w) {
  const pop = w.vills.length, count = t => w.bps.filter(b => b.type === t).length;
  const houses = w.houses().length + count('house'), farms = w.of('farm').length + count('farm'), stores = w.of('store').length + count('store'), cap = w.beds() + count('house') * bedsOf({ style: styleNow(w) });
  const structBps = w.bps.filter(b => b.type !== 'road').length;
  const drive = ordersOf(w).build;
  if (structBps < 2 + Math.floor(pop / 8) + (drive ? 4 : 0)) {
    const room = w.cap(), full = (w.stock.food > room * 0.8 || w.stock.wood > room * 0.9) && stores < Math.ceil(pop / 9) + 1;
    if (cap < pop + 1) placeHouse(w);
    else if (farms < Math.min(30, Math.ceil((pop + 1) / (3.2 / (1 + 0.15 * lesson(w, 'famine'))))) && !(w.stock.food > room * 0.85 && farms >= Math.ceil(pop / 5))) placeBuilding(w, 'farm');
    else if (full && stores < 10) placeBuilding(w, 'store');
    else if (cap < pop * (1.1 + 0.2 * clamp((w.prosp || 1) - 0.8, 0, 1) + (drive ? 0.3 : 0)) + 3 && w.stock.food > pop * 3 && w.stock.wood >= 10) placeHouse(w);       // build ahead when life is good
  }
  if (w.has('boats') && w.fishOK && !w.bps.some(b => b.type === 'dock') && w.of('dock').length < Math.min(3, 1 + Math.floor(pop / 40)) && w.stock.wood > 30) placeDock(w);
  if (w.has('trade') && pop >= 20 && w.of('market').length + count('market') < Math.min(3, 1 + Math.floor(pop / 70)) && w.stock.wood > 30) placeBuilding(w, 'market');
  if (w.has('carpentry') && pop >= 14 && !w.of('plaza').length && !count('plaza') && w.stock.wood >= 14) placeBuilding(w, 'plaza');
  if (w.has('trade') && w.of('plaza').length && pop >= 30 && w.of('tavern').length + count('tavern') < Math.min(3, 1 + Math.floor(pop / 90)) && w.stock.wood > 40) placeBuilding(w, 'tavern');
  planWorkshops(w);
  planCamps(w);
  planUpgrades(w);
  planRoads(w);
}

/* ----- resource targets: what the village wants in stock, and what it has coming ----- */
function resourceTargets(w) {
  const pop = w.vills.length, pend = w.pending(), s = w.season, cap = w.cap();
  const tgt = {
    wood: 16 + 3 * pop + pend.wood + ((s === 2 ? pop * 3 + w.houses().length * 6 : 0) + (s === 3 ? pop * 2 : 0)) * (1 + 0.4 * lesson(w, 'cold')), stone: 6 + 2 * pop + pend.stone,
    food: (10 + 4 * pop + (s === 2 ? pop * 8 : 0) + (s === 1 ? pop * 3 : 0)) * (1 + 0.5 * lesson(w, 'famine'))
  };
  for (const k in tgt) tgt[k] = Math.min(tgt[k], cap * 0.95);
  const eff = { wood: w.stock.wood + w.inbound.wood, stone: w.stock.stone + w.inbound.stone, food: w.stock.food + w.inbound.food };
  return { tgt, eff };
}

/* ----- roles ----- */
const AFFINITY = {
  builder: v => v.skill.build + v.trait.ind + v.trait.cur * 0.5, farmer: v => v.skill.farm + v.trait.ind * 0.8 + (1 - v.trait.brave) * 0.2,
  hunter: v => v.skill.hunt + v.trait.brave * 1.2 + (1 - v.trait.soc) * 0.3, fisher: v => v.skill.fish + (1 - v.trait.soc) * 0.6 + (1 - v.trait.brave) * 0.3,
  woodcutter: v => v.skill.wood + v.trait.ind * 0.8 + v.trait.brave * 0.2, miner: v => v.skill.stone + v.trait.ind * 0.7 + (1 - v.trait.soc) * 0.3
};
const DESIRE_ROLE = { wood: 'woodcutter', stone: 'miner', farm: 'farmer', build: 'builder', hunt: 'hunter', fish: 'fisher' };
const HEAVY = new Set(['builder', 'hunter', 'miner', 'woodcutter']);
const aff = (r, v) => AFFINITY[r](v) + (v.desire && v.desire.kind === 'master' && DESIRE_ROLE[v.desire.key] === r ? 0.5 : 0);
function assignRoles(w) {
  const adults = w.vills.filter(v => !v.isChild() && !v.trade), n = adults.length; if (!n) return;       // people with a trade of their own are not conscripted into the heavy roles
  const winter = w.season === 3, wolves = w.animals.some(a => a.kind === 'wolf' && a.alive);
  const farms = w.of('farm').length, building = w.bps.length, watch = Math.max(0, w.gov.policy.defense);
  const q = {
    builder: n >= 3 ? clamp(Math.round(n * 0.14) + (building > 3 ? 1 : 0) + (ordersOf(w).build ? Math.ceil(n * 0.1) : 0), 1, ordersOf(w).build ? 10 : 6) : 0,
    farmer: winter ? 0 : Math.min(farms, Math.round(n * 0.3)),
    hunter: n >= 5 ? clamp(Math.round(n * 0.1) + (wolves ? 2 : 0) + Math.round(watch * 2), 1, 7) : 0,
    fisher: w.fishOK && n >= 6 ? clamp(Math.round(n * 0.09), 1, 5) : 0,
    woodcutter: Math.max(1, Math.round(n * (w.season >= 2 ? 0.27 : 0.2))),
    miner: Math.max(n >= 4 ? 1 : 0, Math.round(n * 0.13)),
  };
  const O = ordersOf(w), hands = O.allhands;
  const { tgt, eff } = resourceTargets(w), ratio = k => eff[k] / Math.max(1, tgt[k]);       // self-correct: fewer hands on a surplus, more on a shortage
  if (ratio('wood') > 1.4) q.woodcutter = Math.max(1, Math.round(q.woodcutter * 0.5)); else if (ratio('wood') < 0.5) q.woodcutter = Math.min(Math.ceil(q.woodcutter * 1.5), Math.round(n * 0.3));
  if (ratio('stone') > 1.6) q.miner = Math.max(n >= 4 ? 1 : 0, Math.round(q.miner * 0.5)); else if (ratio('stone') < 0.5) q.miner = Math.ceil(q.miner * 1.5);
  if (ratio('food') > 1.6) { q.hunter = Math.max(1, Math.round(q.hunter * 0.5)); q.fisher = Math.round(q.fisher * 0.5) } else if (ratio('food') < 0.6) { q.hunter = Math.ceil(q.hunter * 1.5); q.fisher = Math.ceil(q.fisher * 1.5) }
  if (O.food || hands) { if (!winter) q.farmer = Math.min(farms, Math.round(n * (hands ? 0.5 : 0.42))); q.hunter = Math.min(Math.round(n * 0.25), Math.ceil(q.hunter * (hands ? 2 : 1.6))); if (q.fisher) q.fisher = Math.min(Math.round(n * 0.2), Math.ceil(q.fisher * (hands ? 2 : 1.6))) }       // standing orders from the player
  if (O.fuel || hands) q.woodcutter = Math.min(Math.round(n * 0.4), Math.ceil(q.woodcutter * (hands ? 1.8 : 1.7)));
  for (const v of adults) if (v.role && HEAVY.has(v.role) && v.isElder()) v.role = null;     // elders step back from heavy labor
  const cnt = {}; for (const r of ROLES) cnt[r] = 0;
  for (const v of adults) if (v.role) cnt[v.role]++;
  for (const r of ROLES) if (cnt[r] > q[r]) {
    const mem = adults.filter(v => v.role === r).sort((a, b) => aff(r, a) - aff(r, b));
    while (cnt[r] > q[r]) { mem.shift().role = null; cnt[r]-- }
  }
  for (const r of ['builder', 'farmer', 'hunter', 'fisher', 'woodcutter', 'miner']) {
    while (cnt[r] < q[r]) {
      const pool = adults.filter(v => !v.role && !(HEAVY.has(r) && v.isElder()) && !(r === 'hunter' && !v.isAdult())); if (!pool.length) break;
      pool.sort((a, b) => aff(r, b) - aff(r, a)); const v = pool[0]; v.role = r; cnt[r]++;
      if (w.tick > 0) { w.say(`${v.name} takes up work as a ${r}.`); v.story(`Took up work as a ${r}.`) }
    }
  }
}

/* ----- events ----- */
function ringSpot(w, d0, d1) {
  for (let k = 0; k < 40; k++) {
    const a = w.r() * 6.28, d = d0 + w.r() * (d1 - d0), x = Math.round(w.cx + Math.cos(a) * d), y = Math.round(w.cy + Math.sin(a) * d);
    if (x > 2 && y > 2 && x < CFG.W - 2 && y < CFG.H - 2 && w.walkable(y * CFG.W + x) && w.search(w.cx - 1, w.cy, (xx, yy) => xx === x && yy === y, d1 * 2.6)) return { x, y };   // must be able to walk to the village
  } return null;
}
function fire(w) {
  const hs = w.houses(), st = w.of('store'); if (!hs.length) return;
  const b = w.r() < 0.2 && st.length > 1 ? st[(w.r() * st.length) | 0] : hs[(w.r() * hs.length) | 0], who = b.occ.map(id => (w.vills.find(v => v.id === id) || {}).name).filter(Boolean);
  if (b.type === 'store') for (const k of ['wood', 'stone', 'food']) w.stock[k] = Math.floor(w.stock[k] * 0.7);
  const gone = damageBuilding(w, b, baseHp(b) * (0.8 + 0.7 * w.r()), 'fire'), what = b.type === 'house' ? 'cabin' : 'storehouse';       // stone and timber stand up to flames better than log and thatch
  w.emit('event', gone ? `Fire! A ${what} burned to the ground${who.length ? ', leaving ' + who.slice(0, 3).join(', ') + ' homeless' : ''}.` : `Fire! A ${what} is badly scorched but still stands${who.length ? '; ' + who.slice(0, 3).join(', ') + ' put it out' : ''}.`, { kind: 'fire' });
}
function storm(w) {
  let n = 0; for (const b of w.of('farm')) if (b.state === 1 && w.r() < 0.6 * (1 - 0.5 * lesson(w, 'storm'))) { b.state = 0; b.g = 0; n++ }
  let roofs = 0; for (const b of [...w.buildings.values()]) if (b.type !== 'campfire' && (b.style || 0) < 2 && w.r() < 0.3) { damageBuilding(w, b, baseHp(b) * (0.05 + 0.13 * w.r()), 'storm'); roofs++ }
  if (n) w.emit('event', `A violent storm tears across the island and flattens the young crops in ${n} field${n > 1 ? 's' : ''}${roofs ? ' and batters ' + roofs + ' roofs' : ''}.`, { kind: 'storm' });
  else if (roofs) w.emit('event', `A storm batters ${roofs} roofs and fences.`, { kind: 'storm' });
}
function townNewDay(w) {
  prosperityDay(w);
  const pop = w.vills.length, s = w.season, d = w.day, sv = w.settings.survival ? 2 : 1, dis = w.settings.disasters, hd = hardOf(w);
  if (w.seasonDay === 1 && dis) {
    if (s === 3 && w.r() < 0.3 * sv * hd.cold) { w.harsh = true; w.emit('event', 'A bitter winter sets in. The cold will be harsh this year.', { kind: 'harsh' }) }
    if (s === 1 && w.r() < 0.25 * sv) { w.drought = true; w.emit('event', 'The summer is dry. The crops grow slowly.', { kind: 'drought' }) }
  }
  if (d < 4) return;
  if (dis && s >= 1 && s <= 2) { if (w.houses().length && w.r() < 0.012 * sv * (w.drought ? 2 : 1) * (1 - 0.5 * lesson(w, 'fire'))) fire(w); if (w.r() < 0.02 * sv * (1 - 0.4 * lesson(w, 'storm'))) storm(w) }
  const cap = w.beds(), gp = w.gov.policy.growth;
  if (cap > pop + 1 && gp > -0.75 && w.r() < 0.1 * (projBuilt(w, 'monument') ? 1.35 : 1) * (1 + 0.8 * gp) / (w.settings.survival ? 2 : 1) * hardOf(w).imm * clamp(((w.prosp == null ? 1 : w.prosp) - 0.5) * 1.3, 0, 1.4) * (pop < 70 ? 1 : 120 / (120 + pop - 70))) {            // travelers seek a home
    const sp = ringSpot(w, 24, 32), n = 1 + ((w.r() * 3) | 0);
    if (sp) {
      const names = []; for (let k = 0; k < n; k++) { const v = new Villager(w, w.r() < 0.5 ? 'f' : 'm', 12 + w.r() * 20, sp.x, sp.y); v.hunger = 85; v.story('Arrived at the village as a traveler seeking shelter.'); w.vills.push(v); names.push(v.name) }
      noteFlow(w, 'arrived', n); w.emit('event', `${names.join(', ')} arrive${n === 1 ? 's' : ''} seeking shelter, and ${n === 1 ? 'is' : 'are'} welcomed.`, { kind: 'newcomers', names });
    }
  }
  if (dis && pop >= 14 && s >= 2 && w.r() < 0.045 * sv * hd.sick * (1 - 0.3 * lesson(w, 'fever'))) {               // a fever sweeps through; the weak and hungry suffer most
    let sick = 0;
    for (const v of w.vills) if (w.r() < 0.28) { const frail = v.isChild() || v.isElder() ? 1.25 : 1; v.health -= (35 + w.r() * 50) * frail * (1.15 - 0.4 * v.hunger / 100) * (w.has('medicine') ? 0.6 : 1) * (1 - 0.3 * lesson(w, 'fever')) * (1 - Math.min(0.75, techFx(w, 'health'))); v.cause = 'fever'; sick++ }
    w.emit('event', `A fever sweeps through the village; ${sick} fall ill.`, { kind: 'fever', sick });
  }
  const preyN = w.animals.filter(a => a.alive && a.kind === 'deer').length, wolfChance = (s >= 2 ? 0.14 : s === 0 ? 0.03 : 0.05) * sv * hd.wolf * (projBuilt(w, 'bastion') ? 0.5 : 1) * clamp(preyN / 25, 0.3, 1.4) * (1 - (w.liv ? w.liv.fx.guard : 0));       // packs return to where there is game
  if (pop >= 6 && w.r() < wolfChance && !w.animals.some(a => a.kind === 'wolf' && a.alive)) {
    const sp = ringSpot(w, 24, 32), n = 2 + ((w.r() * 3) | 0);
    if (sp) { for (let k = 0; k < n; k++) w.animals.push(new Animal(w, 'wolf', sp.x, sp.y)); w.emit('event', `A pack of ${n} wolves has been spotted near the village!`, { kind: 'wolves' }) }
  }
}
function chatTopic(w, a, b) {
  const s = w.season, pool = [];
  pool.push(`${a.name} and ${b.name} talked about the ${['sowing', 'long days', 'harvest', 'cold'][s]}.`);
  if (a.trait.cur > 0.6 && b.trait.cur > 0.6) pool.push(`${a.name} and ${b.name} argued late into the evening about why the stars move.`, `${a.name} and ${b.name} wondered what lies beyond the far hills.`, `${a.name} and ${b.name} debated how to build a stronger granary.`);
  if (a.trait.kind > 0.6 || b.trait.kind > 0.6) pool.push(`${a.name} and ${b.name} shared stories of old friends.`);
  if (w.animals.some(x => x.kind === 'wolf' && x.alive)) pool.push(`${a.name} and ${b.name} whispered about the wolves.`);
  if (w.stock.food < w.vills.length * 3) pool.push(`${a.name} and ${b.name} worried about the food stores.`);
  return pool[(w.r() * pool.length) | 0];
}
