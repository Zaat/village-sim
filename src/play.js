/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   play.js — the player's hands (v0.35). Everything the player does is plain data on w.play,
   so it saves, tests and replays like the rest of the sim; in Watch mode nothing here runs.
     orders      a villager told to gather, build, repair, work a trade or walk somewhere
     placing     buildings and roads put on the map as blueprints that builders pick up first
     zones       painted areas (home, farm, work, civic) the village's own planner builds inside
     research    the player's choice of what the village studies next
     switches    what the village still plans for itself: buildings, research, jobs
     shares      how the crowd (everyone not in play) splits its work: food, wood, stone
   The village's own planners keep running unless a switch is off; orders and placed blueprints always win.
   ========================================================================== */
const PLAY_ZONES = { home: 'Homes', farm: 'Farms', work: 'Work', civic: 'Civic' };
/* what can be placed, the technology it needs (if any) and the zone it belongs to */
const PLACE = {
  house: { zone: 'home' }, farm: { zone: 'farm' }, store: { zone: 'work' }, workshop: { tech: 'tools', zone: 'work' },
  logcamp: { tech: 'forestry', zone: 'work' }, minecamp: { tech: 'mining', zone: 'work' }, lodge: { tech: 'lodges', zone: 'work' },
  market: { tech: 'trade', zone: 'civic' }, plaza: { tech: 'carpentry', zone: 'civic' }, tavern: { tech: 'trade', zone: 'civic' },
};
const DESIRE_ROLE_NAMES = { builder: 1, farmer: 1, woodcutter: 1, miner: 1, hunter: 1, fisher: 1 };
const PLAY_GATHER = { wood: 'wood', stone: 'stone', food: 'berries' };

const playOf = w => w.play || (w.play = { on: false, auto: { build: true, research: true, jobs: true }, orders: {}, zones: {}, nz: 0, share: null, did: 0 });
/* Watch mode is always fully automatic; the switches only apply while playing, and keep their state across mode changes (v0.35.1) */
const autoOn = (w, k) => !w.play || !w.play.on || w.play.auto[k] !== false;
const playVill = (w, id) => w.vills.find(v => v.id === id && v.alive);

/* ---------- switches and shares ---------- */
function playSet(w, key, val) {
  const P = playOf(w);
  if (key === 'on') { P.on = !!val; if (P.on && !P.entered) { P.entered = 1; P.auto.build = false } }      // first time in Play: the council stops building, the player takes over
  else if (key in P.auto) P.auto[key] = !!val;
  else if (key === 'share') { P.share = val ? { food: +val.food || 0, wood: +val.wood || 0, stone: +val.stone || 0 } : null; if (P.share) { const t = P.share.food + P.share.wood + P.share.stone; if (t > 0.95) for (const k in P.share) P.share[k] *= 0.95 / t } }
  else return false;
  return true;
}

/* ---------- orders ---------- */
const ORDER_OK = { gather: 1, farm: 1, hunt: 1, fish: 1, build: 1, repair: 1, move: 1, role: 1, free: 1 };
function playOrder(w, ids, o) {
  if (!ORDER_OK[o.k]) return 0;
  const P = playOf(w); let n = 0;
  for (const id of ids) {
    const v = playVill(w, id); if (!v || v.isChild()) continue;
    P.locks = P.locks || [];
    if (o.k === 'free') { delete P.orders[id]; v.order = null; v.roleLock = false; P.locks = P.locks.filter(x => x !== id); v.abort(0); n++; continue }
    if (o.k === 'role') {
      if (o.role !== 'none' && !(o.role in DESIRE_ROLE_NAMES)) continue;
      v.role = o.role === 'none' ? null : o.role; v.roleLock = true; if (!P.locks.includes(id)) P.locks.push(id); delete P.orders[id]; v.order = null; v.abort(0); n++; continue;
    }
    const ord = { k: o.k, kind: o.kind, x: o.x, y: o.y, id: o.id, t: w.tick }; P.orders[id] = ord; v.order = ord; v.abort(0); n++;
  }
  P.did += n; return n;
}

/* what a click or tap at a tile would order, given who is selected: the default for that spot */
function playOrderAt(w, tx, ty) {
  const { W, H } = CFG; if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
  const i = ty * W + tx, bp = w.bpAt.get(i); if (bp) return { k: 'build', id: bp.id, x: bp.x, y: bp.y, label: 'Build here' };
  const bid = w.bmap[i]; if (bid) { const b = w.buildings.get(bid); if (b) { if (b.maxHp !== undefined && b.hp < b.maxHp * 0.95 && b.type !== 'campfire') return { k: 'repair', id: b.id, x: b.x, y: b.y, label: 'Repair' }; if (b.type === 'farm') return { k: 'farm', x: b.x, y: b.y, label: 'Farm this field' } } }
  const f = w.feat[i];
  if (f === FEAT.OAK || f === FEAT.PINE) return { k: 'gather', kind: 'wood', x: tx, y: ty, label: 'Cut wood here' };
  if (f === FEAT.STONE) return { k: 'gather', kind: 'stone', x: tx, y: ty, label: 'Quarry stone here' };
  if (f === FEAT.BUSH) return { k: 'gather', kind: 'food', x: tx, y: ty, label: 'Pick berries here' };
  const an = w.animals.find(a => a.alive && a.kind !== 'wolf' && Math.hypot(a.x - tx - 0.5, a.y - ty - 0.5) < 1.2); if (an) return { k: 'hunt', x: tx, y: ty, label: 'Hunt' };
  if (w.terr[i] <= TERR.SHALLOW) return { k: 'fish', x: tx, y: ty, label: 'Fish here' };
  if (w.terr[i] >= TERR.SAND && w.terr[i] !== TERR.PEAK) return { k: 'move', x: tx, y: ty, label: 'Go here' };
  return null;
}

/* the villager's planner calls this first: true when the order produced a job */
function playPlan(w, v) {
  const o = v.order; if (!o) return false;
  if (!w.play || w.play.orders[v.id] !== o) { v.order = null; return false }
  const done = (why) => { delete w.play.orders[v.id]; v.order = null; if (why) v.story(why) };
  switch (o.k) {
    case 'move': {
      if (Math.hypot(v.x - o.x - 0.5, v.y - o.y - 0.5) < 1.5) { done(); return false }
      v.steps = [go((x, y) => Math.abs(x - o.x) <= 1 && Math.abs(y - o.y) <= 1, null, 'Going where asked', { maxCost: 200, onFail: () => done() }), work(8, 'Waiting for the next order', () => done())];
      v.jobKind = 'order'; return true;
    }
    case 'gather': {
      if (v.planGather(PLAY_GATHER[o.kind] ? o.kind : 'wood', Number.isFinite(o.x) && Number.isFinite(o.y) ? { x: o.x, y: o.y, r: 12 } : null)) return true;
      done('Nothing left to gather there.'); return false;
    }
    case 'farm': if (v.planFarm()) return true; done(); return false;
    case 'hunt': if (v.planHunt()) return true; done(); return false;
    case 'fish': if (v.planBoatFish() || v.planFish()) return true; done(); return false;
    case 'build': {
      const bp = w.bps.find(b => b.id === o.id); if (!bp) { done(); return false }
      if (v.planBuild(bp)) return true; v.label = 'Waiting for materials'; return false;
    }
    case 'repair': {
      const b = w.buildings.get(o.id); if (!b || b.hp >= b.maxHp * 0.95) { done(); return false }
      if (v.planRepair(b)) return true; return false;
    }
  }
  done(); return false;
}

/* ---------- placing ---------- */
function playReach(w) {         // one flood from the camp says which ground can be walked to; shared for a few ticks
  const c = w._preach; if (c && w.tick - c.t < 40) return c;
  const s0 = w._st; w.search(w.cx - 1, w.cy, () => false, 400); return (w._preach = { t: w.tick, seen: w._seen, st: w._st, ok: w._st !== s0 });
}
function playCanPlace(w, type, x, y, cheap) {
  const sp = PLACE[type]; if (!sp) return { ok: false, why: 'That cannot be placed yet' };
  if (sp.tech && !w.has(sp.tech)) return { ok: false, why: `Needs ${TECHS[sp.tech] ? TECHS[sp.tech].name.toLowerCase() : sp.tech} first` };
  const [bw, bh] = CFG.SIZE[type], { W, H } = CFG;
  if (x < 2 || y < 2 || x + bw > W - 2 || y + bh > H - 2) return { ok: false, why: 'Too close to the edge' };
  for (let dy = 0; dy < bh; dy++) for (let dx = 0; dx < bw; dx++) {
    const i = (y + dy) * W + x + dx;
    if (w.terr[i] !== TERR.GRASS) return { ok: false, why: 'Needs open grass' };
    if (w.feat[i]) return { ok: false, why: 'Trees or rocks in the way' };
    if (w.bmap[i] || w.bpAt.has(i)) return { ok: false, why: 'Something is already here' };
    if (w.road[i]) return { ok: false, why: 'A road is in the way' };
  }
  if (!cheap) {
    const R = playReach(w); if (!R.ok) return { ok: false, why: 'Nobody can reach this ground' };
    let reach = false; for (let dy = -1; dy <= bh && !reach; dy++) for (let dx = -1; dx <= bw; dx++) { if ((dx < 0 || dx >= bw) && (dy < 0 || dy >= bh)) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && R.seen[yy * W + xx] === R.st) { reach = true; break } }
    if (!reach) return { ok: false, why: 'Nobody can reach this ground' };
  }
  const c = CFG.COST[type], short = (c.wood > w.stock.wood ? 'wood' : '') || (c.stone > w.stock.stone ? 'stone' : '');
  return { ok: true, cost: c, note: short ? `Not enough ${short} in store yet: builders will wait` : '' };
}
function playPlace(w, type, x, y) {
  const r = playCanPlace(w, type, x, y, false); if (!r.ok) return r;
  const bp = makeBp(w, type, x, y, { player: true }); w.bps.splice(w.bps.indexOf(bp), 1); w.bps.unshift(bp);     // the player's sites are picked up first
  playOf(w).did++; w.say(`You mark a site for a ${type}.`); return { ok: true, bp };
}
function playRoad(w, tiles) {
  let n = 0, why = '';
  for (const [x, y] of tiles) {
    if (x < 2 || y < 2 || x >= CFG.W - 2 || y >= CFG.H - 2) continue;
    const i = y * CFG.W + x, t = w.terr[i];
    if ((t !== TERR.GRASS && t !== TERR.SAND) || w.feat[i] || w.bmap[i] || w.bpAt.has(i) || w.road[i]) { why = why || 'Some tiles were not free'; continue }
    const bp = makeBp(w, 'road', x, y, { player: true }); w.bps.splice(w.bps.indexOf(bp), 1); w.bps.unshift(bp); n++;
  }
  if (n) playOf(w).did++; return { ok: n > 0, n, why };
}
function playCancelBp(w, id) {
  const bp = w.bps.find(b => b.id === id); if (!bp || bp.prog > 0) return false;
  for (const t of ['wood', 'stone']) w.stock[t] += bp.have[t];
  bp.alive = false; w.bps.splice(w.bps.indexOf(bp), 1); for (let dy = 0; dy < bp.h; dy++) for (let dx = 0; dx < bp.w; dx++) w.bpAt.delete((bp.y + dy) * CFG.W + bp.x + dx);
  return true;
}

/* ---------- zones ---------- */
function playZone(w, tiles, type) {        // type null removes zoning from those tiles
  const P = playOf(w); let n = 0;
  for (const [x, y] of tiles) {
    if (x < 0 || y < 0 || x >= CFG.W || y >= CFG.H) continue; const i = y * CFG.W + x;
    if (type && P.zones[i] !== type) { if (!P.zones[i]) P.nz++; P.zones[i] = type; n++ }
    else if (!type && P.zones[i]) { delete P.zones[i]; P.nz--; n++ }
  }
  return n;
}
/* how a spot sits against the painted zones for this kind of building: 1 inside its zone, 0 unzoned, -1 inside another zone */
function zoneFit(w, type, x, y, bw, bh) {
  const P = w.play; if (!P || !P.nz) return 0; const sp = PLACE[type], want = sp ? sp.zone : null; let fit = 0, total = 0;
  for (let dy = 0; dy < bh; dy++) for (let dx = 0; dx < bw; dx++) { const z = P.zones[(y + dy) * CFG.W + x + dx]; total++; if (z === want && want) fit++; else if (z) fit--; }
  return fit > 0 ? 1 : fit < 0 ? -1 : 0;
}

/* ---------- research ---------- */
function playResearch(w, id) {
  if (!TECHS[id]) return { ok: false, why: 'Unknown technology' };
  if (!techAvailable(w).includes(id)) return { ok: false, why: 'Not available to study yet' };
  chooseResearch(w, id, 'player'); playOf(w).did++; return { ok: true };
}

/* ---------- daily upkeep: forget orders whose person or target is gone ---------- */
function playDay(w) {
  const P = w.play; if (!P) return;
  if (P.locks) P.locks = P.locks.filter(id => playVill(w, id));
  for (const id in P.orders) {
    const v = playVill(w, +id), o = P.orders[id];
    if (!v || (o.k === 'build' && !w.bps.some(b => b.id === o.id)) || (o.k === 'repair' && !w.buildings.has(o.id))) { delete P.orders[id]; if (v) v.order = null }
  }
}
/* after a load: orders are data on w.play; point each villager back at hers */
function playRelink(w) { const P = w.play; if (!P) return; for (const id in P.orders) { const v = playVill(w, +id); if (v) v.order = P.orders[id] } for (const v of w.vills) if (P.locks && P.locks.includes(v.id)) v.roleLock = true }
