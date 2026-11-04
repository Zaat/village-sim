'use strict';
/* ==========================================================================
   buildings.js — what a building is made of and how it holds up. Every
   building has hit points (structural strength), a condition that wears with
   age and weather, and can be damaged by fire, storms and raiders. Builders
   repair what is worn; neglect ends in collapse.
   ========================================================================== */
const BLD_HP = { house: 100, farm: 45, store: 140, campfire: 30, dock: 80, logcamp: 90, minecamp: 90, lodge: 90, market: 110, plaza: 200, tavern: 130, hall: 320, library: 380, bastion: 520, monument: 450, amphitheatre: 400, granaryhall: 300, lighthouse: 350, temple: 360, foundry: 340, citadel: 560 };
const STYLE_HP = [1, 1.3, 2, 2.4, 2.8, 3.4, 4.0];      // log, timber-frame, stone, brick, townhouse, apartment block
const BLD_WEAR = { house: [0.0030, 0.0022, 0.0010, 0.0008, 0.0006, 0.0005, 0.0004], store: [0.0028, 0.0020, 0.0009, 0.0008, 0.0007, 0.0006], farm: [0.003], dock: [0.0035], campfire: [0.004], logcamp: [0.0028], minecamp: [0.0026], lodge: [0.0028], market: [0.0026], plaza: [0.0014], tavern: [0.0024], hall: [0.0012], library: [0.0006], bastion: [0.0005], monument: [0.0004], amphitheatre: [0.0006], granaryhall: [0.0012], lighthouse: [0.0008], temple: [0.0006], foundry: [0.0010], citadel: [0.0004] };
const BLD_MATERIAL = { house: s => ['Log and thatch', 'Timber frame', 'Cut stone', 'Brick and tile', 'Plaster and slate', 'Concrete', 'Steel and glass'][s || 0], store: s => ['Log storehouse', 'Timber storehouse', 'Stone granary'][s || 0], farm: () => 'Tilled soil and wooden fences', campfire: () => 'Stone ring and logs', dock: () => 'Timber piers', logcamp: () => 'Timber', minecamp: () => 'Timber and stone', lodge: () => 'Timber and hide', market: () => 'Timber stalls', plaza: w => w.has('masonry') ? 'Cobbles and a stone well' : 'Packed earth and a timber well', tavern: w => w.has('masonry') ? 'Timber and stone' : 'Timber', hall: () => 'Timber hall', library: () => 'Stone and slate', bastion: () => 'Stone', monument: () => 'Carved stone', amphitheatre: () => 'Stone tiers', granaryhall: () => 'Timber and stone', lighthouse: () => 'Stone tower', temple: () => 'Cut stone and gilded timber', foundry: () => 'Stone and iron', citadel: () => 'Dressed stone' };

const baseHp = b => BLD_HP[b.type] || 100;
const hpFactor = b => (b.type === 'house' || b.type === 'store') ? STYLE_HP[b.style || 0] : 1;
function ensureStats(w, b) {
  if (b.maxHp !== undefined) return b;
  b.maxHp = Math.round(baseHp(b) * hpFactor(b)); b.hp = b.maxHp; b.built = w.day; b.era = techEra(w); b.builtEra = b.era; b.repairs = 0; b.last = null; return b;
}
/* a rebuilt (upgraded) building starts again at full strength */
function restyle(w, b) { const keep = b.built; b.maxHp = Math.round(baseHp(b) * hpFactor(b)); b.hp = b.maxHp; b.built = keep === undefined ? w.day : keep; if (b.builtEra === undefined) b.builtEra = b.era; b.era = techEra(w); b.upgraded = w.day; b.last = `rebuilt day ${w.day}` }
const condition = b => { const r = b.hp / b.maxHp; return r >= 0.9 ? 'Sound' : r >= 0.7 ? 'Good' : r >= 0.45 ? 'Worn' : r >= 0.2 ? 'Poor' : 'Failing' };
const conditionColor = b => { const r = b.hp / b.maxHp; return r >= 0.7 ? '#7ad07a' : r >= 0.45 ? '#d9c26a' : r >= 0.2 ? '#e0985a' : '#e0604a' };

/* damage from any cause; returns true when the building is destroyed */
function damageBuilding(w, b, amt, cause) {
  ensureStats(w, b); b.hp -= amt; b.last = `${cause} on day ${w.day}`;
  if (b.hp <= 0) { w.removeBuilding(b); return true }
  return false;
}
/* once a day: wear, and collapse when nothing is left */
function buildingDay(w) {
  soilDay(w);
  const mult = (w.season === 3 ? 1.4 : 1) * (w.harsh ? 1.3 : 1) * (w.drought ? 1 : 1);
  for (const b of [...w.buildings.values()]) {
    ensureStats(w, b); if (b.type === 'campfire') continue; const rate = (BLD_WEAR[b.type] || [0.003])[b.style || 0] || (BLD_WEAR[b.type] || [0.003])[0];
    b.hp -= b.maxHp * rate * mult;
    if (b.hp <= 0) {
      const who = b.occ.map(id => (w.vills.find(v => v.id === id) || {}).name).filter(Boolean);
      w.removeBuilding(b); w.emit('event', `A neglected ${b.type === 'house' ? 'home' : b.type} collapses${who.length ? ', leaving ' + who.slice(0, 3).join(', ') + ' homeless' : ''}.`, { kind: 'collapse' });
    }
  }
}
function ageText(w, b) { const d = Math.max(0, w.day - (b.built ?? w.day)), y = d / (CFG.DPS * 4); return d < 32 ? `${d} day${d === 1 ? '' : 's'} old` : `${y.toFixed(1)} years old` }

/* ----- how much a building is used and what it produces: counters in seasonal bins (this season and the last three) ----- */
function rollBins(w, b, k, sk) {
  const ser = Math.floor(w.day / CFG.DPS); if (!b[k]) { b[k] = [0, 0, 0, 0]; b[sk] = ser }
  const gap = ser - b[sk]; if (gap > 0) { for (let i = 0; i < Math.min(gap, 4); i++) b[k].unshift(0); b[k].length = 4; b[sk] = ser }
  return b;
}
/* where the population changes come from: born, arrived (travelers and boat migrants), died, left (banished or sailed away), in seasonal bins */
function noteFlow(w, kind, n = 1) {
  const F = w.flow || (w.flow = { born: [0, 0, 0, 0], arrived: [0, 0, 0, 0], died: [0, 0, 0, 0], left: [0, 0, 0, 0], ser: 0, tot: { arrived: 0, left: 0 } }), ser = Math.floor(w.day / CFG.DPS), gap = ser - F.ser;
  if (gap > 0) { for (const k of ['born', 'arrived', 'died', 'left']) { for (let i = 0; i < Math.min(gap, 4); i++) F[k].unshift(0); F[k].length = 4 } F.ser = ser }
  F[kind][0] += n; if (F.tot[kind] !== undefined) F.tot[kind] += n;
}
const flowYear = (w, kind) => { const F = w.flow; return F ? F[kind].reduce((a, b) => a + b, 0) : 0 };
function rollVisits(w, b) { if (!b.reg) b.reg = {}; if (b.vtot === undefined) b.vtot = 0; return rollBins(w, b, 'vh', 'vser') }
function recordVisit(w, b, v) {
  if (!b || !v) return; v.fav = v.fav || {}; v.fav[b.type] = (v.fav[b.type] || 0) + 1; rollVisits(w, b); b.vh[0]++; b.vtot++; const r = b.reg; r[v.id] = (r[v.id] || 0) + 1;
  const ks = Object.keys(r); if (ks.length > 40) { let mk = ks[0]; for (const k of ks) if (r[k] < r[mk]) mk = k; delete r[mk] }
}
function recordOutput(w, b, amt) { if (!b || !(amt > 0)) return; rollBins(w, b, 'oh', 'oser'); b.oh[0] += amt; b.otot = (b.otot || 0) + amt }
/* trend: the last two seasons (this one scaled to a full season) against the two before */
function popularity(w, b, key = 'vh') {
  if (key === 'vh') rollVisits(w, b); else rollBins(w, b, key, 'oser'); const vh = b[key], year = vh[0] + vh[1] + vh[2] + vh[3], age = w.day - (b.built ?? w.day), el = (w.day % CFG.DPS) + 1;
  const cur = el >= 3 ? vh[0] * CFG.DPS / el : vh[1], recent = (cur + vh[1]) / 2, older = (vh[2] + vh[3]) / 2, out = key !== 'vh';
  let trend = 'steady', arrow = '→';
  if (age < CFG.DPS * 2) { trend = 'too new to tell'; arrow = '·' }
  else if (recent + older < 4) { trend = out ? 'barely producing' : year < 3 ? 'rarely used' : 'quiet'; arrow = '·' }
  else if (recent > older * 1.2 + 1) { trend = 'growing'; arrow = '▲' } else if (recent < older * 0.8 - 1) { trend = 'fading'; arrow = '▼' }
  return { year, season: vh[0], last: vh[1], trend, arrow, perDay: year / Math.max(1, Math.min(CFG.DPS * 4, age)), hist: vh.slice().reverse() };
}
/* soil slowly recovers; fields left bare in winter recover faster */
function soilDay(w) { for (const b of w.buildings.values()) if (b.type === 'farm') b.fert = Math.min(1.05, (b.fert ?? 1) + 0.01 * (1 + (b.state === 0 && w.season === 3 ? 1 : 0))) }
