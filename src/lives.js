'use strict';
/* ==========================================================================
   lives.js — v0.22 lives and society depth.
   • Leisure: every adult has a hobby and, after work, may pursue it or run an
     errand (visit kin, take food to a hungry relative, fetch water). The more
     leisure the policy allows, the more of this the village does.
   • Property: houses and fields have owners; wealth, a status that mixes
     wealth, standing, office and family; inheritance when an owner dies, which
     can leave someone passed over and bitter.
   • Feuds: families fall out after a fight, an unfair will or an old grudge.
     Feuds sour relations between kin, ask for the council's hand, and their
     losers are the first to feel aggrieved when a village starts to divide.
   • Regime push: policies drift toward what the regime, its leaders and its
     people favour, and the council card shows who really holds power.
   ========================================================================== */
const HOBBIES = {
  angling: { label: 'angling', pick: v => 0.4 + 0.7 * (1 - v.trait.soc) + (v.role === 'fisher' ? 0.6 : 0) },
  carving: { label: 'wood-carving', pick: v => 0.4 + 0.5 * v.trait.ind + 0.3 * (1 - v.trait.soc) },
  gardening: { label: 'gardening', pick: v => 0.4 + 0.5 * v.trait.kind + (v.role === 'farmer' ? 0.5 : 0) },
  stargazing: { label: 'stargazing', pick: v => 0.2 + 0.9 * v.trait.cur },
  singing: { label: 'singing', pick: v => 0.2 + 0.8 * v.trait.soc },
  storytelling: { label: 'storytelling', pick: v => 0.15 + 0.6 * v.trait.soc + 0.4 * v.trait.cur + (v.isElder() ? 0.5 : 0) },
  strolling: { label: 'long walks', pick: v => 0.3 + 0.3 * v.trait.cur + 0.3 * (1 - v.trait.ind) }
};
function initLives(w) { w.lives = { feuds: [], next: 1, nextSpawn: 20, stats: { inherited: 0, disputes: 0, feuds: 0, reconciled: 0, hobbies: 0, errands: 0, mediated: 0 }, log: [] } }
const LV = w => w.lives || (initLives(w), w.lives);
const livesLog = (w, t) => { const L = LV(w); L.log.unshift(`D${w.day}: ${t}`); if (L.log.length > 8) L.log.pop() };
const vById = (w, id) => (id == null ? null : w.vills.find(x => x.id === id && x.alive) || null);

/* ================= leisure: hobbies and errands ================= */
function ensureHobby(w, v) {
  if (v.hobby && HOBBIES[v.hobby]) return v.hobby;
  const keys = Object.keys(HOBBIES), ws = keys.map(k => HOBBIES[k].pick(v)), tot = ws.reduce((a, b) => a + b, 0); let r = w.r() * tot, k = 0;
  while (k < keys.length - 1 && (r -= ws[k]) > 0) k++;
  v.hobby = keys[k]; return v.hobby;
}
function leisureWanted(w, v) {
  if (!v.isAdult() || w.tod < 0.38 || w.tod > 0.55 || (v.leisureUntil || 0) > w.tick) return false;
  if (w.concerns && ordersOf(w).allhands) return false; if (overtimeMode(w)) return false;
  if (v.hunger < 40 || v.energy < 30 || w.festival || w.cold || v.duty > w.tick || v.stocksUntil > w.tick || v.strikeUntil > w.tick || w.stock.food < w.pop * 1.2) return false;
  const p = 0.12 + 0.25 * Math.max(0, w.gov.policy.labor) + 0.08 * (v.mood < 60 ? 1 : 0) + (v.isElder() ? 0.15 : 0) - 0.1 * Math.max(0, -w.gov.policy.labor);
  return w.r() < p;
}
function kinOfVillager(w, v) {
  const ids = new Set(); if (v.partner != null) ids.add(v.partner); for (const k of v.kids) ids.add(k); for (const p of v.parentIds) if (p != null) ids.add(p);
  for (const p of v.parentIds) { const par = vById(w, p); if (par) for (const k of par.kids) ids.add(k) }
  ids.delete(v.id); return [...ids].map(id => vById(w, id)).filter(Boolean);
}
function planLeisure(w, v) {
  v.leisureUntil = w.tick + 700; ensureHobby(w, v);
  if (w.r() < 0.35 && planErrand(w, v)) return true;
  return planHobby(w, v);
}
function hobbyEffect(w, v, h) {
  const L = LV(w); L.stats.hobbies++; v.hobbyDay = w.day; v.mood = Math.min(100, v.mood + 2); v.social = Math.min(100, v.social + 4);
  const near = () => w.vills.filter(o => o !== v && o.isAdult() && !o.sleeping && Math.hypot(o.x - v.x, o.y - v.y) < 5);
  if (h === 'angling') { if (w.r() < 0.4 + 0.3 * v.skill.fish) w.stock.food++; v.skill.fish = Math.min(1, v.skill.fish + 0.004) }
  else if (h === 'carving') { v.wealth = (v.wealth || 0) + 0.7; const f = near().find(o => w.getRel(v, o) > 20); if (f && w.r() < 0.3) { w.rel.set(w.relKey(v, f), (w.getRel(v, f)) + 5); v.story(`Carved a keepsake for ${f.name}.`) } }
  else if (h === 'gardening') { if (w.r() < 0.5) w.stock.food++; v.skill.farm = Math.min(1, v.skill.farm + 0.003) }
  else if (h === 'stargazing') addKnowledge(w, 0.08, v);
  else if (h === 'singing') for (const o of near().slice(0, 4)) { o.mood = Math.min(100, o.mood + 1.2); o.social = Math.min(100, o.social + 3) }
  else if (h === 'storytelling') { for (const o of near().slice(0, 4)) { o.social = Math.min(100, o.social + 6); w.rel.set(w.relKey(v, o), w.getRel(v, o) + 2) } v.reputation = Math.min(100, v.reputation + 0.3) }
}
const HOBBY_JOB = { angling: ['To the water', 'Fishing for pleasure'], carving: ['Settling down outside', 'Carving a keepsake'], gardening: ['To the garden patch', 'Tending a little garden'], stargazing: ['Up to a quiet spot', 'Watching the stars'], singing: ['To where friends gather', 'Singing for the neighbours'], storytelling: ['To where friends gather', 'Telling an old story'], strolling: ['Going for a long walk', 'Out for a stroll'] };
function planHobby(w, v) {
  const h = v.hobby, [goLabel, stay] = HOBBY_JOB[h], hb = v.home != null ? w.buildings.get(v.home) : null, done = () => hobbyEffect(w, v, h);
  let goal = null, ticks = 100;
  if (h === 'angling') goal = (x, y, i) => { if (!w.walkable(i)) return false; for (const [dx, dy] of NB) { const j = (y + dy) * CFG.W + x + dx; if (j >= 0 && w.terr[j] <= TERR.SHALLOW) return true } return false };
  else if (h === 'carving' || h === 'gardening') goal = hb ? (x, y) => w.nearRect(x, y, hb) : (x, y, i) => w.nearStock(x, y, i);
  else if (h === 'stargazing') goal = (x, y, i) => w.terr[i] === TERR.ROCK && w.walkable(i) && Math.hypot(x - w.cx, y - w.cy) > 6;
  else if (h === 'singing' || h === 'storytelling') { const P = gatherPlan(w, v, false, false); if (!P) return false; goal = (x, y) => x === P.x && y === P.y; ticks = 120 }
  else { for (let k = 0; k < 8 && !goal; k++) { const gx = Math.round(w.cx + (w.r() * 2 - 1) * 18), gy = Math.round(w.cy + (w.r() * 2 - 1) * 14); if (gx > 1 && gy > 1 && gx < CFG.W - 1 && gy < CFG.H - 1 && w.walkable(gy * CFG.W + gx)) goal = (x, y) => x === gx && y === gy } if (!goal) return false; ticks = 70 }
  v.jobKind = 'leisure'; v.steps = [go(goal, null, goLabel, { maxCost: 70 }), work(ticks, stay, done)]; return true;
}
function planErrand(w, v) {
  const kin = kinOfVillager(w, v).filter(o => !o.sleeping && o.home !== v.home && Math.hypot(o.x - v.x, o.y - v.y) < 60);
  if (kin.length) {
    kin.sort((a, b) => a.hunger - b.hunger); const o = w.r() < 0.5 ? kin[0] : kin[(w.r() * kin.length) | 0], hungry = o.hunger < 50 && w.stock.food > 4, ox = o.tx, oy = o.ty;
    v.jobKind = 'leisure';
    v.steps = [go((x, y) => Math.abs(x - ox) + Math.abs(y - oy) <= 1, null, hungry ? `Taking food to ${o.name}` : `Visiting ${o.name}`, { maxCost: 70 }),
      work(60, hungry ? 'Bringing a meal' : 'Visiting family', () => {
        if (!o.alive || Math.hypot(o.x - v.x, o.y - v.y) > 4) return; LV(w).stats.errands++;
        if (hungry && w.stock.food > 0) { w.stock.food--; o.hunger = Math.min(100, o.hunger + 25); v.story(`Brought food to ${o.name}.`) }
        w.rel.set(w.relKey(v, o), w.getRel(v, o) + 4); v.mood = Math.min(100, v.mood + 1.5); o.mood = Math.min(100, o.mood + 1.5); v.social = Math.min(100, v.social + 10); o.social = Math.min(100, o.social + 10);
      })];
    return true;
  }
  const pl = w.of('plaza')[0]; if (!pl) return false;
  v.jobKind = 'leisure'; v.steps = [go((x, y) => w.nearRect(x, y, pl), null, 'To the well', { maxCost: 80 }), work(40, 'Fetching water', () => { LV(w).stats.errands++; v.social = Math.min(100, v.social + 3) })]; return true;
}

/* ================= property, wealth, status ================= */
function claimHome(w, house, v) { if (house && house.type === 'house' && !house.owner && v.isAdult()) house.owner = v.id }
function onHarvest(w, farm, v, amt) {
  if (!farm.owner || !vById(w, farm.owner)) { if (v.isAdult() && !w.vills.some(o => o.id !== v.id && farm.owner === o.id)) farm.owner = v.id }
  const o = vById(w, farm.owner); if (!o) return; const share = 0.25 * (1 - (w.rx ? Math.min(1, w.rx.C * 1.4) : 0)); o.wealth = (o.wealth || 0) + amt * share * 0.5;
}
const wealthOf = v => (v.wealth || 0) + (v.coins || 0);
function propsOf(w, v) { return [...w.buildings.values()].filter(b => b.owner === v.id && (b.type === 'house' || b.type === 'farm')) }
function statusDay(w) {
  const ad = adultsOf(w); if (!ad.length) return; const ws = ad.map(wealthOf).sort((a, b) => a - b), rank = x => { let n = 0; for (const y of ws) if (y <= x) n++; return n / ws.length };
  const council = new Set(w.gov.council.map(c => c.id)), chief = chiefOf(w);
  for (const v of ad) {
    const own = propsOf(w, v).length, fam = w.vills.filter(o => o.family === v.family).length;
    v.status = Math.round(clamp(0.32 * rank(wealthOf(v)) + 0.26 * v.reputation / 100 + (council.has(v.id) ? 0.14 : 0) + (chief && chief.id === v.id ? 0.1 : 0) + 0.08 * Math.min(1, own / 2) + 0.06 * Math.min(1, fam / 8) + (v.isElder() ? 0.04 : 0), 0, 1) * 100) / 100;
  }
}
const STATUS_WORDS = s => s >= 0.75 ? 'prominent' : s >= 0.55 ? 'respected' : s >= 0.35 ? 'ordinary standing' : s >= 0.2 ? 'of little standing' : 'overlooked';
function inheritFrom(w, v) {
  const props = propsOf(w, v), wealth = v.wealth || 0, coins = v.coins || 0; if (!props.length && wealth < 1 && coins < 5) return;
  const L = LV(w), partner = vById(w, v.partner), kids = v.kids.map(id => vById(w, id)).filter(Boolean), ak = kids.filter(k => k.isAdult()).sort((a, b) => b.age - a.age);
  const fav = ak.length > 1 && w.r() < 0.3 ? ak.slice().sort((a, b) => w.getRel(v, b) - w.getRel(v, a))[0] : null;
  const sibs = v.parentIds.flatMap(p => { const par = vById(w, p); return par ? par.kids : [] }).map(id => vById(w, id)).filter(o => o && o.id !== v.id && o.isAdult());
  const main = partner || fav || ak[0] || kids[0] || sibs[0] || null, order = [main, ...ak.filter(k => k !== main)].filter(Boolean);
  if (!main) { for (const b of props) b.owner = null; if (w.has('coinage')) w.econ.treasury += coins + Math.round(wealth); livesLog(w, `${v.name}'s estate passed to the village.`); return }
  props.forEach((b, i) => { const h = i === 0 ? main : order[i % order.length]; b.owner = h.id; if (b.type === 'house' && h.home == null && b.occ.length < bedsOf(b)) { b.occ.push(h.id); h.home = b.id } });
  const total = wealth + coins, shares = new Map(); const give = (o, x) => shares.set(o, (shares.get(o) || 0) + x);
  if (partner) { give(partner, total * (kids.length ? 0.5 : 1)); const rest = total * 0.5; for (const k of (ak.length ? ak : kids)) give(k, rest / Math.max(1, (ak.length ? ak : kids).length)) }
  else if (kids.length) for (const k of (ak.length ? ak : kids)) give(k, total / (ak.length ? ak : kids).length); else give(main, total);
  for (const [o, x] of shares) { const wc = Math.round(x * 0.6 * 10) / 10; o.wealth = (o.wealth || 0) + wc; o.coins = (o.coins || 0) + Math.round(x * 0.4) }
  L.stats.inherited++; statCount(w, 'estate'); main.story(`Inherited ${props.length ? 'the ' + props.map(b => b.type).join(' and ') : 'what ' + v.name + ' left'} from ${v.name}.`);
  const excluded = ak.filter(k => k !== main && !shares.has(k) || (fav && k !== fav && k !== main));
  if (excluded.length && (props.length || total >= 8)) for (const k of excluded) {
    L.stats.disputes++; k.story(`Was passed over when ${v.name}'s estate was settled.`); k.mood = Math.max(0, k.mood - 8);
    if (w.r() < 0.35 + 0.3 * (1 - k.trait.kind)) startFeud(w, k, main, 'a disputed inheritance', 0.55)
  }
}

/* ================= feuds ================= */
function kinSet(w, id) { const v = vById(w, id); if (!v) return new Set([id]); const s = new Set([id]); for (const o of kinOfVillager(w, v)) s.add(o.id); return s }
function feudOf(w, v) { return LV(w).feuds.find(f => !f.over && (f.ka.has(v.id) || f.kb.has(v.id))) }
function startFeud(w, a, b, cause, heat) {
  const L = LV(w); if (!a || !b || a === b || L.feuds.filter(f => !f.over).length >= 5) return null;
  const old = L.feuds.find(f => !f.over && ((f.ka.has(a.id) && f.kb.has(b.id)) || (f.ka.has(b.id) && f.kb.has(a.id)))); if (old) { old.heat = Math.min(1, old.heat + 0.2); return old }
  if (feudOf(w, a) || feudOf(w, b)) return null;
  const f = { id: L.next++, a: a.id, b: b.id, na: a.name, nb: b.name, cause, since: w.day, heat, over: false, asked: 0, side: null, ka: kinSet(w, a.id), kb: kinSet(w, b.id) }; L.feuds.push(f); L.stats.feuds++;
  a.story(`Fell out with ${b.name} over ${cause}.`); b.story(`Fell out with ${a.name} over ${cause}.`);
  w.emit('feud', `A feud begins between the kin of ${a.name} and ${b.name} over ${cause}.`, { f }); livesLog(w, `Feud: ${a.name} and ${b.name} (${cause}).`);
  return f;
}
function feudHeatOf(w, v) { const f = feudOf(w, v); return f ? f.heat : 0 }
function feudGrievance(w, v) { const f = feudOf(w, v); if (!f || !f.side) return 0; const losing = f.side === 'a' ? f.kb : f.ka; return losing.has(v.id) ? 0.35 * f.heat : 0 }
function feudFight(w, a, b) {            // a brawl between two villagers can light or feed a feud
  const f = feudOf(w, a) || feudOf(w, b);
  if (f && ((f.ka.has(a.id) && f.kb.has(b.id)) || (f.ka.has(b.id) && f.kb.has(a.id)))) { f.heat = Math.min(1, f.heat + 0.2); return }
  if (kinOfVillager(w, a).length && kinOfVillager(w, b).length && w.r() < 0.6) startFeud(w, a, b, 'a fight', 0.5);
}
function feudMarriage(w, a, b) {
  const f = LV(w).feuds.find(f => !f.over && ((f.ka.has(a.id) && f.kb.has(b.id)) || (f.ka.has(b.id) && f.kb.has(a.id)))); if (!f) return;
  f.heat *= 0.4; f.ka.add(a.id); f.kb.add(b.id); a.story(`Their love for ${b.name} softened an old feud.`); b.story(`Their love for ${a.name} softened an old feud.`); livesLog(w, `${a.name} and ${b.name} wed across a feud.`);
}
function feudDay(w) {
  const L = LV(w), g = w.gov;
  for (const f of L.feuds) {
    if (f.over) continue; const ka = [...f.ka].map(id => vById(w, id)).filter(v => v && v.isAdult()), kb = [...f.kb].map(id => vById(w, id)).filter(v => v && v.isAdult());
    const gone = !vById(w, f.a) && !vById(w, f.b);
    for (const x of ka) for (const y of kb) { if (x === y) continue; const k = w.relKey(x, y), r = w.rel.get(k) || 0; if (r > -85) w.rel.set(k, r - 2.2 * f.heat) }
    f.heat -= 0.009 + (g.mediation ? 0.01 : 0) + (gone ? 0.02 : 0) + (w.festival ? 0.03 : 0);
    if (f.heat >= 0.7 && w.day - f.asked > 30 && g.council.length) { f.asked = w.day; askAboutFeud(w, f) }
    if (f.heat < 0.12 || !ka.length || !kb.length) { f.over = true; L.stats.reconciled++; for (const v of [...ka, ...kb].slice(0, 6)) v.story(`The feud between ${f.na} and ${f.nb} faded away.`); w.emit('feud', `The feud between the kin of ${f.na} and ${f.nb} has faded.`, { f }); livesLog(w, `Feud ${f.na}/${f.nb} ended.`) }
  }
  L.feuds = L.feuds.filter(f => !f.over || w.day - (f.endDay = f.endDay || w.day) < 40);
  if (w.day >= L.nextSpawn) {                   // old grudges can harden into feuds
    L.nextSpawn = w.day + 6; let worst = null, wr = -55;
    for (const [k, r] of w.rel) if (r <= wr) { const [x, y] = k.split('_').map(Number), a = vById(w, x), b = vById(w, y); if (a && b && a.isAdult() && b.isAdult() && !feudOf(w, a) && !feudOf(w, b) && kinOfVillager(w, a).length && kinOfVillager(w, b).length) { worst = [a, b]; wr = r } }
    if (worst && w.r() < 0.5) startFeud(w, worst[0], worst[1], 'an old grudge', 0.5);
  }
}
function askAboutFeud(w, f) {
  const a = vById(w, f.a) || { name: f.na }, b = vById(w, f.b) || { name: f.nb }, kind = councilMembers(w).reduce((s, m) => s + m.v.trait.kind, 0) / Math.max(1, councilMembers(w).length);
  const options = [{ id: 'mediate', text: 'Bring both families to the fire and make them talk (a long, patient evening)' }, { id: 'side', text: `Side with ${a.name}'s kin and tell the others to accept it` }, { id: 'ignore', text: 'Stay out of a family quarrel' }];
  ask(w, {
    kind: 'feud', topic: `The feud between the kin of ${a.name} and ${b.name} (over ${f.cause}) is hot (${Math.round(f.heat * 100)}%) and spoils the village. Fights are likely. What should the council do?`, options, default: kind > 0.5 || w.gov.mediation ? 'mediate' : w.gov.policy.law > 0.3 ? 'side' : 'ignore',
    apply: (id, sp, reason, src) => {
      if (id === 'mediate') { f.heat = Math.max(0.1, f.heat - 0.4); LV(w).stats.mediated++; const pa = vById(w, f.a), pb = vById(w, f.b); if (pa && pb) { w.rel.set(w.relKey(pa, pb), Math.max(w.getRel(pa, pb), -10) + 25); pa.mood = Math.min(100, pa.mood + 3); pb.mood = Math.min(100, pb.mood + 3) } recordDecision(w, `to mediate the feud between ${f.na} and ${f.nb}.`, sp, src) }
      else if (id === 'side') { f.side = 'a'; f.heat = Math.max(0.1, f.heat - 0.15); recordDecision(w, `to side with ${f.na}'s kin in their feud.`, sp, src); for (const o of [...f.kb].map(x => vById(w, x)).filter(Boolean)) o.mood = Math.max(0, o.mood - 3) }
      else { f.heat = Math.min(1, f.heat + 0.05); recordDecision(w, `to stay out of the feud between ${f.na} and ${f.nb}.`, sp, src) }
    }
  });
}

/* ================= the regime pushes policy, and who holds power ================= */
function policyTargets(w) {
  const a = w.regime && w.regime.ax; if (!a) return null; const g = k => a[k] - 0.5;
  return { law: 1.8 * g('auth') - 0.9 * g('open') + 0.5 * g('pious'), defense: 1.4 * g('auth') + 0.5 * g('pious') - 0.3 * g('open'), tax: 1.6 * g('comm') + 0.7 * g('auth') - 0.5 * g('open'), growth: 1.3 * g('indus') + 0.9 * g('open') - 0.8 * g('comm') - 0.4 * g('pious'), labor: -1.5 * g('indus') - 0.9 * g('auth') + 0.9 * g('open') + 0.5 * g('pious') };
}
function policyPushDay(w) {
  const T = policyTargets(w); if (!T) return; const a = w.regime.ax, rate = 0.03 + 0.03 * a.auth, p = w.gov.policy;
  for (const k in T) p[k] = clamp(p[k] + clamp((clamp(T[k], -1, 1) - p[k]) * rate, -0.06, 0.06), -1, 1);
}
function powerShares(w) {
  const a = w.regime && w.regime.ax; if (!a) return []; const ad = adultsOf(w), chief = chiefOf(w), R = typeof rulingGroup === 'function' ? rulingGroup(w) : null, n = w.gov.council.length;
  const ws = ad.map(wealthOf).sort((x, y) => y - x), tot = ws.reduce((s, x) => s + x, 0) || 1, top = ws.slice(0, 3).reduce((s, x) => s + x, 0) / tot;
  const raw = [
    { key: 'chief', label: chief ? `Chief ${firstName(chief.name)}` : 'No chief', v: chief ? 1.5 + 4 * a.auth : 0, col: '#e0b070' },
    { key: 'council', label: 'The council', v: n > 1 ? 0.8 * (n - 1) * (1.3 - 0.5 * a.auth) : 0, col: '#8fc4e8' },
    { key: 'circle', label: R ? `${R.name} circle` : 'Ruling circle', v: R ? 0.6 + 2.5 * Math.min(1, (R.members ? R.members.length : 0) / Math.max(1, ad.length)) : 0, col: '#b08fe8' },
    { key: 'rich', label: 'Wealthy families', v: 6 * top * (a.indus + 0.3), col: '#d9c26a' },
    { key: 'faith', label: 'Faith', v: 4 * a.pious + (w.regime.prophet ? 2 : 0) + (w.strife && w.strife.sect ? 1.5 : 0) + (w.of('temple').length ? 1 : 0), col: '#e08fa8' },
    { key: 'people', label: 'The people', v: 1 + 5 * a.open * (1 - 0.6 * a.auth), col: '#7ad07a' }
  ].filter(x => x.v > 0.05); const sum = raw.reduce((s, x) => s + x.v, 0) || 1;
  return raw.map(x => ({ ...x, share: x.v / sum })).sort((x, y) => y.share - x.share);
}
function lifeMood(v) {
  const w = v.w, h = feudHeatOf(w, v); let t = 0; if (v.hobbyDay !== undefined && w.day - v.hobbyDay <= 4) t += 1.2; if (v.status !== undefined) t += v.status < 0.2 ? -1.5 : v.status > 0.7 ? 1 : 0; if (h > 0.4) t -= 3 * h; if (v.home != null) { const b = w.buildings.get(v.home); if (b && b.owner === v.id) t += 1.5 } return t;
}

/* ================= daily ================= */
/* ---------- privacy and personal space ----------
   Some people want a house to themselves, some want company. The preference is the opposite of sociability (trait soc). Private people pick
   empty houses, suffer when strangers share their roof, and the most private build a cabin away from the village. Sleeping outside is hard on
   everyone, worst in winter (and less bothersome before carpentry, when nobody has a proper roof). */
const privOf = v => clamp(1 - v.trait.soc, 0, 1);
const isKin = (v, id) => v.partner === id || (v.kids && v.kids.includes(id)) || (v.parentIds && v.parentIds.includes(id));
function privacyDay(w) {
  const early = w.has('carpentry') ? 1 : 0.4, pen = [0.3, 0.1, 0.6, 1.8][w.season] * early, P = w.priv = { out: 0, crowd: 0, lonely: 0, list: [] };
  for (const v of w.vills) {
    if (v.isChild()) continue;
    const h = v.home != null ? w.buildings.get(v.home) : null;
    if (!h) { if (w.houses().length) { P.out++; v.mood = Math.max(0, v.mood - 1.2 * pen); if (w.season === 3 && early === 1) v.health = Math.max(1, v.health - 1.2) } continue }
    const pv = privOf(v), others = h.occ.filter(id => id !== v.id && !isKin(v, id)).length, over = Math.max(0, others - Math.round((1 - pv) * (bedsOf(h) - 1)));
    if (over) { P.crowd++; P.list.push(v.id); v.mood = Math.max(0, v.mood - 0.35 * over * (0.4 + pv)) }
    else if (pv < 0.25 && h.occ.length === 1 && v.partner == null) { P.lonely++; v.mood = Math.max(0, v.mood - 0.25) }
  }
  rehomeDay(w);
  cabinDay(w);
}
/* a crowded household moves into an empty house, a few per day (a new one is built ahead when there is none: planTown) */
function rehomeDay(w) {
  const P = w.priv; if (!P.list.length || w.day < 12) return;
  const empty = w.houses().filter(h => h.occ.length === 0 && !(h.cabin && h.owner != null));
  let moved = 0;
  for (const id of P.list) {
    if (moved >= 3 || !empty.length) break;
    if ((w.day + id) % 4) continue;
    const v = vById(w, id); if (!v || v.home == null || !v.isAdult()) continue;
    const old = w.buildings.get(v.home); if (!old) continue;
    const unit = [v]; const p = v.partner != null ? vById(w, v.partner) : null; if (p && p.home === v.home) unit.push(p);
    for (const k of v.kids || []) { const c = vById(w, k); if (c && c.home === v.home && !c.isAdult()) unit.push(c) }
    let best = null, bs = 1e9;
    for (const h of empty) { const bd = bedsOf(h); if (bd < unit.length) continue; const sc = (bd - unit.length) * 6 + Math.abs(h.x - w.cx) + Math.abs(h.y - w.cy); if (sc < bs) { bs = sc; best = h } }
    if (!best) continue;
    empty.splice(empty.indexOf(best), 1);
    for (const m of unit) { const i = old.occ.indexOf(m.id); if (i >= 0) old.occ.splice(i, 1); if (old.owner === m.id) old.owner = null; best.occ.push(m.id); m.home = best.id }
    claimHome(w, best, v); v.mood = Math.min(100, v.mood + 4); v.story('Moved into a house with more room.'); moved++
  }
}
/* a very private adult builds a cabin out in the trees (a few at most) */
function cabinDay(w) {
  const pop = w.pop; if (pop < 20 || w.day < 40 || !w.has('carpentry') || !autoOn(w, 'build')) return;
  const have = [...w.buildings.values()].filter(b => b.cabin).length + w.bps.filter(b => b.cabin).length;
  if (have >= Math.floor(pop / 30) || w.stock.wood < 40 || w.stock.stone < 8 || w.r() > 0.25) return;
  const c = w.vills.filter(v => v.isAdult() && v.home != null && privOf(v) >= 0.72 && !propsOf(w, v).some(b => b.cabin) && !w.bps.some(b => b.forId === v.id));
  if (!c.length) return;
  const v = c[(w.r() * c.length) | 0], sp = cabinSpot(w);
  if (sp) { makeBp(w, 'house', sp.x, sp.y, { cabin: true, forId: v.id }); w.emit('event', `${v.name} wants more peace and quiet, and starts a cabin out in the trees.`, { kind: 'cabin', v }) }
}
function cabinSpot(w) {
  const [bw, bh] = CFG.SIZE.house, { W, H } = CFG, cands = [];
  for (let y = w.cy - 30; y <= w.cy + 30; y += 2) for (let x = w.cx - 38; x <= w.cx + 38; x += 2) {
    if (x < 3 || y < 3 || x + bw >= W - 3 || y + bh >= H - 3) continue;
    const d = Math.hypot(x - w.cx, y - w.cy); if (d < 11 || d > 28) continue;
    let ok = true;
    for (let dy = -1; dy <= bh && ok; dy++) for (let dx = -1; dx <= bw; dx++) { const i = (y + dy) * W + x + dx, inside = dy >= 0 && dy < bh && dx >= 0 && dx < bw; if (w.terr[i] === TERR.WATER || w.bmap[i] || w.bpAt.has(i) || w.claim[i] >= 0 || (inside && (w.terr[i] !== TERR.GRASS || w.feat[i] || w.road[i]))) { ok = false; break } }
    if (!ok) continue;
    let near = 0; for (const b of w.buildings.values()) if (Math.abs(b.x - x) < 7 && Math.abs(b.y - y) < 7) near++; if (near) continue;
    const trees = countFeat(w, x + 1, y + 1, 4, f => f === FEAT.OAK || f === FEAT.PINE); if (trees < 3) continue;
    cands.push({ x, y, score: Math.abs(d - 18) - trees * 0.25 + w.r() * 2 });
  }
  cands.sort((a, b) => a.score - b.score);
  for (const c of cands.slice(0, 6)) if (w.search(w.cx - 1, w.cy, (x, y) => w.nearRect(x, y, { x: c.x, y: c.y, w: bw, h: bh }), 220)) return c;
  return null;
}
function cabinDone(w, b, bp) {
  b.cabin = true; const o = vById(w, bp.forId); if (!o) return;
  const leave = v => { const old = v.home != null ? w.buildings.get(v.home) : null; if (old) { const k = old.occ.indexOf(v.id); if (k >= 0) old.occ.splice(k, 1); if (old.owner === v.id) old.owner = null } b.occ.push(v.id); v.home = b.id };
  leave(o); b.owner = o.id; const p = o.partner != null ? vById(w, o.partner) : null; if (p && p.isAdult()) leave(p);
  o.mood = Math.min(100, o.mood + 12); o.story('Built a cabin in the trees, with room to breathe.');
  w.say(`${o.name} moves into a new cabin out in the trees${p ? ', with ' + p.name : ''}.`); statCount(w, 'cabin');
}
function livesDay(w) {
  const L = LV(w); policyPushDay(w); statusDay(w); feudDay(w); privacyDay(w);
  for (const v of w.vills) if (v.isAdult() && !v.hobby) ensureHobby(w, v);
  for (const b of w.buildings.values()) if (b.owner && !vById(w, b.owner)) b.owner = null;
}
