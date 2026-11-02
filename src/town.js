'use strict';
/* ==========================================================================
   town.js — the town "mind": what to build, who does which job, and the
   random events that give the story texture. Villagers decide WHEN and HOW.
   ========================================================================== */
function makeBp(w, type, x, y, extra) {
  const tb = type === 'upgrade' ? w.buildings.get(extra.target) : null, [bw, bh] = type === 'road' ? [1, 1] : tb ? [tb.w, tb.h] : CFG.SIZE[type];
  const cost = type === 'upgrade' ? (extra.toStyle === 2 ? { wood: 4, stone: 8 } : { wood: 6, stone: 0 }) : CFG.COST[type];
  const bp = { id: w.bpnext++, type, x, y, w: bw, h: bh, idx: y * CFG.W + x, cost, ...(extra || {}), have: { wood: 0, stone: 0 }, inc: { wood: 0, stone: 0 }, prog: 0, time: CFG.BUILD_TIME[type], workers: 0, alive: true, ready() { return this.have.wood >= this.cost.wood && this.have.stone >= this.cost.stone } };
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
    const score = type === 'house' ? d + w.r() * 2 : type === 'store' ? Math.abs(d - 5) + w.r() * 2 : type === 'market' ? Math.abs(d - 5.5) + w.r() * 2 : Math.abs(d - 9) + w.r() * 3;
    cands.push({ x, y, score });
  }
  cands.sort((a, b) => a.score - b.score);
  for (const c of cands.slice(0, 8)) {
    const p = w.search(w.cx - 1, w.cy, (x, y) => w.nearRect(x, y, { x: c.x, y: c.y, w: bw, h: bh }), 120);   // must be reachable from camp
    if (p) return makeBp(w, type, c.x, c.y);
  }
  return null;
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
  cands.sort((a, b) => a.score - b.score);
  for (const c of cands.slice(0, 6)) {
    if (w.search(w.cx - 1, w.cy, (x, y) => x === c.x && y === c.y, 160)) return makeBp(w, 'dock', c.x, c.y, { dir: c.dir });       // must be reachable on foot from the camp
  }
  return null;
}
function planRoads(w) {
  if (w.bps.filter(b => b.type === 'road').length >= 8) return;
  const targets = [...w.houses(), ...w.of('farm'), ...w.of('store'), ...w.of('logcamp'), ...w.of('minecamp'), ...w.of('lodge'), ...w.of('market')];
  for (const b of targets) {
    if (w.connected.has(b.id)) continue; w.connected.add(b.id);
    const path = w.search(b.x, b.y, (x, y, i) => w.storeAdj[i] === 1 && !(w.bmap[i] && w.blk[i])); if (!path) continue;
    for (const i of path) { if (w.bmap[i] || w.bpAt.has(i) || w.road[i]) continue; makeBp(w, 'road', i % CFG.W, (i / CFG.W) | 0) }
    return;
  }
}
function planTown(w) {
  const pop = w.vills.length, count = t => w.bps.filter(b => b.type === t).length;
  const houses = w.houses().length + count('house'), farms = w.of('farm').length + count('farm'), stores = w.of('store').length + count('store'), cap = w.beds() + count('house') * (CFG.HOUSE_CAP + styleNow(w));
  const structBps = w.bps.filter(b => b.type !== 'road').length;
  if (structBps < 2 + Math.floor(pop / 8)) {
    const room = w.cap(), full = (w.stock.food > room * 0.8 || w.stock.wood > room * 0.9) && stores < Math.ceil(pop / 9) + 1;
    if (cap < pop + 1) placeBuilding(w, 'house');
    else if (farms < Math.min(30, Math.ceil((pop + 1) / (3.2 / (1 + 0.15 * lesson(w, 'famine'))))) && !(w.stock.food > room * 0.85 && farms >= Math.ceil(pop / 5))) placeBuilding(w, 'farm');
    else if (full && stores < 10) placeBuilding(w, 'store');
    else if (cap < pop + 4 && w.stock.food > pop * 4 && w.stock.wood >= 10) placeBuilding(w, 'house');
  }
  if (w.has('boats') && w.fishOK && !w.bps.some(b => b.type === 'dock') && w.of('dock').length < Math.min(3, 1 + Math.floor(pop / 40)) && w.stock.wood > 30) placeDock(w);
  if (w.has('trade') && pop >= 20 && w.of('market').length + count('market') < Math.min(3, 1 + Math.floor(pop / 70)) && w.stock.wood > 30) placeBuilding(w, 'market');
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
  const adults = w.vills.filter(v => !v.isChild()), n = adults.length; if (!n) return;
  const winter = w.season === 3, wolves = w.animals.some(a => a.kind === 'wolf' && a.alive);
  const farms = w.of('farm').length, building = w.bps.length, watch = Math.max(0, w.gov.policy.defense);
  const q = {
    builder: n >= 3 ? clamp(Math.round(n * 0.14) + (building > 3 ? 1 : 0), 1, 6) : 0,
    farmer: winter ? 0 : Math.min(farms, Math.round(n * 0.3)),
    hunter: n >= 5 ? clamp(Math.round(n * 0.1) + (wolves ? 2 : 0) + Math.round(watch * 2), 1, 7) : 0,
    fisher: w.fishOK && n >= 6 ? clamp(Math.round(n * 0.09), 1, 5) : 0,
    woodcutter: Math.max(1, Math.round(n * (w.season >= 2 ? 0.27 : 0.2))),
    miner: Math.max(n >= 4 ? 1 : 0, Math.round(n * 0.13)),
  };
  const { tgt, eff } = resourceTargets(w), ratio = k => eff[k] / Math.max(1, tgt[k]);       // self-correct: fewer hands on a surplus, more on a shortage
  if (ratio('wood') > 1.4) q.woodcutter = Math.max(1, Math.round(q.woodcutter * 0.5)); else if (ratio('wood') < 0.5) q.woodcutter = Math.min(Math.ceil(q.woodcutter * 1.5), Math.round(n * 0.3));
  if (ratio('stone') > 1.6) q.miner = Math.max(n >= 4 ? 1 : 0, Math.round(q.miner * 0.5)); else if (ratio('stone') < 0.5) q.miner = Math.ceil(q.miner * 1.5);
  if (ratio('food') > 1.6) { q.hunter = Math.max(1, Math.round(q.hunter * 0.5)); q.fisher = Math.round(q.fisher * 0.5) } else if (ratio('food') < 0.6) { q.hunter = Math.ceil(q.hunter * 1.5); q.fisher = Math.ceil(q.fisher * 1.5) }
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
  w.removeBuilding(b);
  w.emit('event', `Fire! A ${b.type === 'house' ? 'cabin' : 'storehouse'} burned to the ground${who.length ? ', leaving ' + who.slice(0, 3).join(', ') + (who.length > 3 ? ' and others' : '') + ' homeless' : ''}.`, { kind: 'fire' });
}
function storm(w) {
  let n = 0; for (const b of w.of('farm')) if (b.state === 1 && w.r() < 0.6 * (1 - 0.5 * lesson(w, 'storm'))) { b.state = 0; b.g = 0; n++ }
  if (n) w.emit('event', `A violent storm tears across the island and flattens the young crops in ${n} field${n > 1 ? 's' : ''}.`, { kind: 'storm' });
}
function townNewDay(w) {
  const pop = w.vills.length, s = w.season, d = w.day, sv = w.settings.survival ? 2 : 1, dis = w.settings.disasters;
  if (w.seasonDay === 1 && dis) {
    if (s === 3 && w.r() < 0.3 * sv) { w.harsh = true; w.emit('event', 'A bitter winter sets in. The cold will be harsh this year.', { kind: 'harsh' }) }
    if (s === 1 && w.r() < 0.25 * sv) { w.drought = true; w.emit('event', 'The summer is dry. The crops grow slowly.', { kind: 'drought' }) }
  }
  if (d < 4) return;
  if (dis && s >= 1 && s <= 2) { if (w.houses().length && w.r() < 0.012 * sv * (w.drought ? 2 : 1) * (1 - 0.5 * lesson(w, 'fire'))) fire(w); if (w.r() < 0.02 * sv * (1 - 0.4 * lesson(w, 'storm'))) storm(w) }
  const cap = w.beds(), gp = w.gov.policy.growth;
  if (pop < 70 && cap > pop + 1 && gp > -0.75 && w.r() < 0.1 * (projBuilt(w, 'monument') ? 1.35 : 1) * (1 + 0.8 * gp) / (w.settings.survival ? 2 : 1)) {            // travelers seek a home
    const sp = ringSpot(w, 24, 32), n = 1 + ((w.r() * 3) | 0);
    if (sp) {
      const names = []; for (let k = 0; k < n; k++) { const v = new Villager(w, w.r() < 0.5 ? 'f' : 'm', 12 + w.r() * 20, sp.x, sp.y); v.hunger = 85; v.story('Arrived at the village as a traveler seeking shelter.'); w.vills.push(v); names.push(v.name) }
      w.emit('event', `${names.join(', ')} arrive${n === 1 ? 's' : ''} seeking shelter, and ${n === 1 ? 'is' : 'are'} welcomed.`, { kind: 'newcomers', names });
    }
  }
  if (dis && pop >= 14 && s >= 2 && w.r() < 0.045 * sv * (1 - 0.3 * lesson(w, 'fever'))) {               // a fever sweeps through; the weak and hungry suffer most
    let sick = 0;
    for (const v of w.vills) if (w.r() < 0.28) { const frail = v.isChild() || v.isElder() ? 1.25 : 1; v.health -= (35 + w.r() * 50) * frail * (1.15 - 0.4 * v.hunger / 100) * (w.has('medicine') ? 0.6 : 1) * (1 - 0.3 * lesson(w, 'fever')); v.cause = 'fever'; sick++ }
    w.emit('event', `A fever sweeps through the village; ${sick} fall ill.`, { kind: 'fever', sick });
  }
  const wolfChance = (s >= 2 ? 0.14 : s === 0 ? 0.03 : 0.05) * sv * (projBuilt(w, 'bastion') ? 0.5 : 1);
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
