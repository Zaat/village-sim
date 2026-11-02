'use strict';
/* ==========================================================================
   town.js — the town "mind": what to build, who does which job, and the
   random events that give the story texture. Villagers decide WHEN and HOW.
   ========================================================================== */
function makeBp(w, type, x, y) {
  const [bw, bh] = type === 'road' ? [1, 1] : CFG.SIZE[type];
  const bp = { id: w.bpnext++, type, x, y, w: bw, h: bh, idx: y * CFG.W + x, cost: CFG.COST[type], have: { wood: 0, stone: 0 }, inc: { wood: 0, stone: 0 }, prog: 0, time: CFG.BUILD_TIME[type], workers: 0, alive: true, ready() { return this.have.wood >= this.cost.wood && this.have.stone >= this.cost.stone } };
  w.bps.push(bp); for (let dy = 0; dy < bh; dy++) for (let dx = 0; dx < bw; dx++) w.bpAt.set((y + dy) * CFG.W + x + dx, bp);
  return bp;
}
function placeBuilding(w, type) {
  const [bw, bh] = CFG.SIZE[type], L = CFG.LATTICE, cands = [], { W, H } = CFG;
  for (let y = w.cy - 36; y <= w.cy + 36; y += L) for (let x = w.cx - 45; x <= w.cx + 45; x += L) {
    if (x < 2 || y < 2 || x + bw >= W - 2 || y + bh >= H - 2) continue;
    let ok = true;
    for (let dy = 0; dy < bh && ok; dy++) for (let dx = 0; dx < bw; dx++) {
      const i = (y + dy) * W + x + dx;
      if (w.terr[i] !== TERR.GRASS || w.feat[i] || w.bmap[i] || w.road[i] || w.bpAt.has(i) || w.claim[i] >= 0) { ok = false; break }
    }
    if (!ok) continue;
    const d = Math.hypot(x - w.cx, y - w.cy); if (d < 2.5 || d > 40) continue;
    const score = type === 'house' ? d + w.r() * 2 : type === 'store' ? Math.abs(d - 5) + w.r() * 2 : Math.abs(d - 9) + w.r() * 3;
    cands.push({ x, y, score });
  }
  cands.sort((a, b) => a.score - b.score);
  for (const c of cands.slice(0, 8)) {
    const p = w.search(w.cx - 1, w.cy, (x, y) => w.nearRect(x, y, { x: c.x, y: c.y, w: bw, h: bh }), 120);   // must be reachable from camp
    if (p) return makeBp(w, type, c.x, c.y);
  }
  return null;
}
function planRoads(w) {
  if (w.bps.filter(b => b.type === 'road').length >= 8) return;
  const targets = [...w.houses(), ...w.of('farm'), ...w.of('store')];
  for (const b of targets) {
    if (w.connected.has(b.id)) continue; w.connected.add(b.id);
    const path = w.search(b.x, b.y, (x, y, i) => w.storeAdj[i] === 1 && !(w.bmap[i] && w.blk[i])); if (!path) continue;
    for (const i of path) { if (w.bmap[i] || w.bpAt.has(i) || w.road[i]) continue; makeBp(w, 'road', i % CFG.W, (i / CFG.W) | 0) }
    return;
  }
}
function planTown(w) {
  const pop = w.vills.length, count = t => w.bps.filter(b => b.type === t).length;
  const houses = w.houses().length + count('house'), farms = w.of('farm').length + count('farm'), stores = w.of('store').length + count('store'), cap = houses * CFG.HOUSE_CAP;
  const structBps = w.bps.filter(b => b.type !== 'road').length;
  if (structBps < 2 + Math.floor(pop / 8)) {
    const room = w.cap(), full = (w.stock.food > room * 0.8 || w.stock.wood > room * 0.9) && stores < Math.ceil(pop / 7) + 1;
    if (cap < pop + 1) placeBuilding(w, 'house');
    else if (farms < Math.min(30, Math.ceil((pop + 1) / 3.2))) placeBuilding(w, 'farm');
    else if (full && stores < 10) placeBuilding(w, 'store');
    else if (cap < pop + 4 && w.stock.food > pop * 4 && w.stock.wood >= 10) placeBuilding(w, 'house');
  }
  planRoads(w);
}

/* ----- roles ----- */
const AFFINITY = {
  builder: v => v.skill.build + v.trait.ind + v.trait.cur * 0.5, farmer: v => v.skill.farm + v.trait.ind * 0.8 + (1 - v.trait.brave) * 0.2,
  hunter: v => v.skill.hunt + v.trait.brave * 1.2 + (1 - v.trait.soc) * 0.3, fisher: v => v.skill.fish + (1 - v.trait.soc) * 0.6 + (1 - v.trait.brave) * 0.3,
  woodcutter: v => v.skill.wood + v.trait.ind * 0.8 + v.trait.brave * 0.2, miner: v => v.skill.stone + v.trait.ind * 0.7 + (1 - v.trait.soc) * 0.3
};
function assignRoles(w) {
  const adults = w.vills.filter(v => !v.isChild()), n = adults.length; if (!n) return;
  const winter = w.season === 3, wolves = w.animals.some(a => a.kind === 'wolf' && a.alive);
  const farms = w.of('farm').length, building = w.bps.length;
  const q = {
    builder: n >= 3 ? clamp(Math.round(n * 0.14) + (building > 3 ? 1 : 0), 1, 6) : 0,
    farmer: winter ? 0 : Math.min(farms, Math.round(n * 0.3)),
    hunter: n >= 5 ? clamp(Math.round(n * 0.1) + (wolves ? 2 : 0), 1, 6) : 0,
    fisher: w.fishOK && n >= 6 ? clamp(Math.round(n * 0.09), 1, 5) : 0,
    woodcutter: Math.max(1, Math.round(n * (w.season >= 2 ? 0.27 : 0.2))),
    miner: Math.max(n >= 4 ? 1 : 0, Math.round(n * 0.13)),
  };
  const cnt = {}; for (const r of ROLES) cnt[r] = 0;
  for (const v of adults) if (v.role) cnt[v.role]++;
  for (const r of ROLES) if (cnt[r] > q[r]) {
    const mem = adults.filter(v => v.role === r).sort((a, b) => AFFINITY[r](a) - AFFINITY[r](b));
    while (cnt[r] > q[r]) { mem.shift().role = null; cnt[r]-- }
  }
  for (const r of ['builder', 'farmer', 'hunter', 'fisher', 'woodcutter', 'miner']) {
    while (cnt[r] < q[r]) {
      const pool = adults.filter(v => !v.role); if (!pool.length) break;
      pool.sort((a, b) => AFFINITY[r](b) - AFFINITY[r](a)); const v = pool[0]; v.role = r; cnt[r]++;
      if (w.tick > 0) w.say(`${v.name} takes up work as a ${r}.`);
    }
  }
}

/* ----- events ----- */
function ringSpot(w, d0, d1) {
  for (let k = 0; k < 40; k++) {
    const a = w.r() * 6.28, d = d0 + w.r() * (d1 - d0), x = Math.round(w.cx + Math.cos(a) * d), y = Math.round(w.cy + Math.sin(a) * d);
    if (x > 2 && y > 2 && x < CFG.W - 2 && y < CFG.H - 2 && w.walkable(y * CFG.W + x)) return { x, y };
  } return null;
}
function townNewDay(w) {
  const pop = w.vills.length, s = w.season, d = w.day; w.festival = false;
  if (w.seasonDay === 1) {
    if (s === 3 && w.r() < 0.3) { w.harsh = true; w.emit('event', 'A bitter winter sets in. The cold will be harsh this year.', { kind: 'harsh' }) }
    if (s === 1 && w.r() < 0.25) { w.drought = true; w.emit('event', 'The summer is dry. The crops grow slowly.', { kind: 'drought' }) }
  }
  if (s === 2 && w.seasonDay === CFG.DPS && w.stock.food >= pop * 3) { w.festival = true; w.emit('event', 'The village holds a harvest festival tonight!', { kind: 'festival' }) }
  if (d < 4) return;
  const cap = w.houses().length * CFG.HOUSE_CAP;
  if (pop < 70 && cap > pop + 1 && w.r() < 0.1) {            // travelers seek a home
    const sp = ringSpot(w, 34, 44), n = 1 + ((w.r() * 3) | 0);
    if (sp) {
      const names = []; for (let k = 0; k < n; k++) { const v = new Villager(w, w.r() < 0.5 ? 'f' : 'm', 12 + w.r() * 20, sp.x, sp.y); v.hunger = 60; w.vills.push(v); names.push(v.name) }
      w.emit('event', `${names.join(', ')} arrive${n === 1 ? 's' : ''} seeking shelter, and ${n === 1 ? 'is' : 'are'} welcomed.`, { kind: 'newcomers', names });
    }
  }
  if (pop >= 14 && s >= 2 && w.r() < 0.045) {               // a fever sweeps through; the weak and hungry suffer most
    let sick = 0;
    for (const v of w.vills) if (w.r() < 0.28) { const frail = v.isChild() || v.age > CFG.OLD_DAYS * 0.6 ? 1.25 : 1; v.health -= (35 + w.r() * 50) * frail * (1.15 - 0.4 * v.hunger / 100); v.cause = 'fever'; sick++ }
    w.emit('event', `A fever sweeps through the village; ${sick} fall ill.`, { kind: 'fever', sick });
  }
  const wolfChance = s >= 2 ? 0.14 : s === 0 ? 0.03 : 0.05;
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
