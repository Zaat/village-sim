'use strict';
/* ==========================================================================
   tech.js — knowledge, discoveries, eras and building styles.
   Villagers generate knowledge by debating, practising and teaching. The council
   chooses what to research (rules by default; Claude can deliberate); when enough
   knowledge is gathered the village makes a discovery and everything it affects
   (yields, speed, housing, architecture, boats) changes from then on.
   ========================================================================== */
const HOUSE_STYLES = ['Log cabin', 'Timber-frame house', 'Stone house', 'Brick house', 'Townhouse', 'Apartment block', 'Tower block'];

function initTech(w) { w.tech = { known: {}, points: 0, focus: null, wait: 0, contrib: {}, log: [], feverSeen: 0 }; w.boats = [] }
const hasTech = (w, id) => !!w.tech.known[id];
const AGE_IDS = AGES.map((_, g) => Object.keys(TECHS).filter(id => TECHS[id].age === g));
const ERA_CACHE = new WeakMap();
/* the village's age: an age is complete when 65% of its technologies are known, and the next age begins */
function villageAge(w) {
  const k = w.tech.known, n = Object.keys(k).length, c = ERA_CACHE.get(w.tech); if (c && c.n === n) return c.age;
  let a = 0; for (let g = 0; g < AGES.length - 1; g++) { let c2 = 0; for (const id of AGE_IDS[g]) if (k[id]) c2++; if (c2 >= AGE_NEED[g]) a = g + 1; else break }
  ERA_CACHE.set(w.tech, { n, age: a }); return a;
}
const techEra = w => villageAge(w);
const FX_CACHE = new WeakMap();
/* the sum of one effect over every technology known (work, farm, learn, health, build, store, trade, sea, defence, mood) */
function techFx(w, key) {
  const t = w.tech, n = Object.keys(t.known).length; let c = FX_CACHE.get(t); if (!c || c.n !== n) { c = { n, v: {} }; for (const id in t.known) { const T = TECHS[id]; if (T) for (const k in T.fx) c.v[k] = (c.v[k] || 0) + T.fx[k] } FX_CACHE.set(t, c) }
  return c.v[key] || 0;
}
const ladderLevel = (w, name) => (LADDERS[name] || []).filter(id => w.tech.known[id]).length;       // how far up a ladder (terra, explore, war) the village has climbed
const styleNow = w => hasTech(w, 'skyscrapers') ? 6 : hasTech(w, 'concrete') ? 5 : hasTech(w, 'architecture') ? 4 : hasTech(w, 'brickwork') ? 3 : hasTech(w, 'masonry') ? 2 : hasTech(w, 'carpentry') ? 1 : 0;
const bedsOf = b => b.cabin ? 2 : b.style === 6 ? CFG.HOUSE_CAP + 12 : CFG.HOUSE_CAP + (b.style || 0);       // a tower block sleeps 16
/* v0.27 research limits. Open knowledge (a sandbox setting): 0 off, 1 relaxed (no material gates, twice the scholar capacity, half the cost growth), 2 unlimited (everything is open at once, cheap, no cap) */
const openLevel = w => (w.settings && w.settings.openKnowledge) || 0;
const techAvailableRaw = w => { const age = villageAge(w); return Object.keys(TECHS).filter(id => !w.tech.known[id] && TECHS[id].age <= age && TECHS[id].req.every(r => w.tech.known[r])) };
const techAvailable = w => {
  const o = openLevel(w); if (o >= 2) return Object.keys(TECHS).filter(id => !w.tech.known[id]);
  const raw = techAvailableRaw(w); return o ? raw : raw.filter(id => !techGaps(w, id).length);
};
/* what is open in principle but held back by a missing input (shown as "waiting for ...") */
const techBlocked = w => openLevel(w) ? [] : techAvailableRaw(w).filter(id => techGaps(w, id).length);
/* cost rises with everything already learned: the further up the tree, the harder each step */
const techCost = (w, id) => {
  const o = openLevel(w), n = Object.keys(w.tech.known).length, T = TECHS[id]; if (o >= 2) return Math.round(T.cost * 0.12);
  return Math.round(T.cost * (1 + (o ? 0.006 : 0.012) * n));
};
/* scholars: only so much can be learned in a day; beyond the daily capacity extra effort is mostly wasted */
const scholarCap = w => { const ad = w.vills.filter(v => v.isAdult()).length; return (3 + 0.13 * ad) * (1 + 0.5 * techFx(w, 'learn')) * (projBuilt(w, 'library') ? 1.3 : 1) * (openLevel(w) ? 2 : 1) };

function addKnowledge(w, pts, v) {
  if (v && v.isElder && v.isElder()) pts *= 1.3;                       // elders pass on what they know
  if (projBuilt(w, 'library')) pts *= 1.5; if (w.rx) pts *= w.rx.know; pts *= 1 + techFx(w, 'learn');
  const t = w.tech; if (openLevel(w) < 2) { const room = Math.max(0, scholarCap(w) - (t.today || 0)); const over = Math.max(0, pts - room); pts = Math.min(pts, room) + over * 0.15; t.capHit = (t.capHit || 0) + (over > 0 ? 1 : 0) }
  t.today = (t.today || 0) + pts; t.points += pts; if (v) t.contrib[v.id] = (t.contrib[v.id] || 0) + pts;
}
/* how much does the village need this discovery right now? (rules-based default for the council) */
/* techs added in v0.24 have no hand-made need: judge them by their branch and the village's state */
function branchNeed(w, id) {
  const T = TECHS[id], pop = Math.max(1, w.vills.length), food = w.stock.food / pop, fever = w.causes['succumbed to the fever'] || 0, wolf = w.causes['was killed by a wolf'] || 0;
  const b = { food: 0.55 + (food < 4 ? 0.4 : 0), build: 0.5 + (w.beds() - pop < 3 ? 0.2 : 0), craft: 0.5, sea: (w.of('dock').length ? 0.5 : 0.2) + (w.neigh ? 0.2 : 0), mind: 0.6, law: 0.45, war: 0.25 + Math.min(0.4, wolf * 0.04 + 0.3 * lesson(w, 'raids')), health: 0.4 + Math.min(0.5, fever * 0.1) }[T.branch];
  return b - 0.03 * T.age;
}
/* a balanced village studies all branches: the least-explored branch pulls harder */
function breadthNeed(w, id) {
  const T = TECHS[id], ids = TECH_BY_BRANCH[T.branch], known = ids.filter(x => w.tech.known[x]).length; return 0.3 * (1 - known / ids.length);
}
/* v0.27 who decides what is studied: the circles of the village pull the agenda toward their platform, in proportion to their numbers; the ruling circle counts double, and the harder the regime the less the others are heard. The philosophy picked at the start tilts whole branches. */
const PHILOSOPHIES = {
  balanced: { name: 'Balanced', tilt: {}, hint: 'No branch is favoured; the village follows need.' },
  practical: { name: 'Practical', tilt: { food: 0.18, build: 0.18, craft: 0.18 }, hint: 'Farms, buildings and tools come first.' },
  scholarly: { name: 'Scholarly', tilt: { mind: 0.25, health: 0.1, law: 0.05 }, hint: 'Learning, medicine and law come first.' },
  martial: { name: 'Martial', tilt: { war: 0.3, craft: 0.06 }, hint: 'Arms, walls and discipline come first.' },
  mercantile: { name: 'Mercantile', tilt: { sea: 0.22, law: 0.1, craft: 0.06 }, hint: 'Ships, markets and money come first.' }
};
function voiceNeed(w, id) {
  const T = TECHS[id], ph = PHILOSOPHIES[(w.settings && w.settings.philosophy) || 'balanced'] || PHILOSOPHIES.balanced; let r = ph.tilt[T.branch] || 0;
  const pop = Math.max(1, w.vills.length), foc = TECH_FOCUS[id], rg = w.gov && w.gov.ruling ? w.gov.ruling.gid : null, auth = w.rx ? Math.min(1, w.rx.A || 0) : 0.3;
  for (const g of w.groups) { if (g.members.length < 4 || !g.platform) continue; const share = g.members.length / pop, weight = g.id === rg ? 2 : (1 - 0.6 * auth); if (g.platform.focus === foc) r += 0.5 * share * weight }
  return r;
}
function techNeed(w, id) {
  const pop = w.vills.length, wolfDeaths = w.causes['was killed by a wolf'] || 0, fever = w.causes['succumbed to the fever'] || 0, food = w.stock.food / Math.max(1, pop);
  const base = { nets: (w.fishOK ? 0.6 : 0.1) + (w.neigh ? 0.3 : 0), tools: 0.8, granary: food > 7 ? 0.9 : 0.6, carpentry: 0.8, boats: (w.fishOK ? 0.9 : 0.1) + (w.neigh ? 0.35 : 0), rotation: 0.5 + Math.min(0.4, w.of('farm').length / 40), masonry: 0.7, medicine: 0.4 + Math.min(0.6, fever * 0.15), watchtowers: 0.3 + Math.min(0.6, wolfDeaths * 0.1), ironwork: 0.6, plow: 0.6, navigation: 0.4 + (w.neigh ? 0.2 : 0), forestry: 0.6 + (w.stock.wood / Math.max(1, pop) < 3 ? 0.5 : 0) + (w.stock.wood / Math.max(1, pop) < 1.5 ? 1.2 : 0), mining: 0.5 + (w.stock.stone / Math.max(1, pop) < 2 ? 0.5 : 0), lodges: 0.4 + (food < 4 ? 0.3 : 0), trade: 0.55 + (food > 6 ? 0.3 : 0), coinage: 0.5, seatrade: 0.35 + (w.of('dock').length ? 0.3 : 0) };
  return (base[id] !== undefined ? base[id] : branchNeed(w, id)) + breadthNeed(w, id) + (food < 4 ? (id === 'rotation' || id === 'nets' ? 0.4 : 0) : 0) + lessonNeed(w, id) + regimeNeed(w, id) + voiceNeed(w, id);
}
function branchPref(v, id) {
  const t = v.trait; return ({ food: 0.3 * t.kind + 0.1, build: 0.3 * t.ind, craft: 0.3 * t.ind, sea: 0.3 * t.cur + 0.2 * t.brave, mind: 0.4 * t.cur, law: 0.3 * t.soc, war: 0.3 * t.brave + 0.1 * (1 - t.kind), health: 0.4 * t.kind })[TECHS[id].branch] || 0;
}
function techPref(v, id) {         // each council member's taste
  const t = v.trait; return ({ nets: t.ind * 0.2, tools: t.ind * 0.4, granary: (1 - t.brave) * 0.3, carpentry: t.ind * 0.3, boats: t.cur * 0.4 + t.brave * 0.2, rotation: t.cur * 0.3, masonry: t.ind * 0.3, medicine: t.kind * 0.5, watchtowers: (1 - t.brave) * 0.4 + t.brave * 0.2, ironwork: t.ind * 0.2 + t.brave * 0.2, plow: t.ind * 0.3, navigation: t.cur * 0.5, forestry: t.ind * 0.4, mining: t.ind * 0.3 + (1 - t.soc) * 0.2, lodges: t.brave * 0.4, trade: t.soc * 0.4 + t.cur * 0.2, coinage: t.ind * 0.3 + t.cur * 0.1, seatrade: t.cur * 0.3 + t.brave * 0.3 })[id] ?? branchPref(v, id);
}
function chooseResearch(w, id, source) {
  const t = w.tech; t.focus = id; t.wait = 0;
  w.say(`The village sets its mind to ${TECHS[id].name.toLowerCase()}${source === 'claude' ? ' (council deliberated with Claude)' : ''}.`);
}
/* sandbox: learn a technology at once (only with Open knowledge on); what it builds on is granted with it */
function grantTech(w, id) {
  if (!openLevel(w) || !TECHS[id] || w.tech.known[id]) return false; const todo = [];
  const need = x => { if (w.tech.known[x] || todo.includes(x)) return; for (const r of TECHS[x].req) need(r); todo.push(x) }; need(id);
  for (const x of todo) { const t = w.tech; t.focus = x; t.points = techCost(w, x) + t.points; discover(w) }
  return true;
}
function discover(w) {
  const t = w.tech, id = t.focus, T = TECHS[id], before = techEra(w);
  const top = Object.entries(t.contrib).map(([vid, pts]) => ({ v: w.vills.find(x => x.id === +vid), pts })).filter(x => x.v).sort((a, b) => b.pts - a.pts)[0];
  t.known[id] = w.day; t.points = Math.max(0, t.points - techCost(w, id)) * 0.5; t.focus = null; t.wait = 0; t.contrib = {};
  const by = top ? top.v : null; t.log.unshift({ id, day: w.day, by: by ? by.name : null }); if (t.log.length > 20) t.log.pop();
  if (by) { by.story(`Led the village to discover ${T.name.toLowerCase()}.`); by.mood = Math.min(100, by.mood + 15); by.reputation = Math.min(100, by.reputation + 10); if (by.desire && by.desire.kind === 'know') by.debates += 3 }
  for (const v of w.vills) v.mood = Math.min(100, v.mood + 4);
  const U = typeof unlocksOf === 'function' ? unlocksOf(id) : null, opens = U && U.gives.length && U.gives[0] !== T.desc ? ` It opens: ${U.gives.slice(0, 3).join(', ').replace(/ \(great project\)/g, '')}.` : '';
  w.emit('discovery', `Discovery! ${by ? by.name + ' and the villagers' : 'The villagers'} have learned ${T.name.toLowerCase()}. ${T.desc}${opens}`, { id, by, gives: U ? U.gives.slice(0, 3) : [] });
  if (techEra(w) > before) w.emit('era', `A new age dawns: the ${AGES[techEra(w)]}.`, { era: techEra(w) });
  if (id === 'carpentry' || id === 'masonry' || id === 'brickwork' || id === 'architecture' || id === 'concrete') w.say(`New homes and storehouses will now be built as ${({ carpentry: 'timber-framed buildings', masonry: 'stone buildings', brickwork: 'brick buildings', architecture: 'townhouses', concrete: 'apartment blocks' })[id]}; old ones can be upgraded.`);
}
function techDay(w) {
  const t = w.tech, adults = w.vills.filter(v => v.isAdult()).length; t.today = 0; addKnowledge(w, adults * 0.06);
  t.peak = Math.max(t.peak || 0, w.vills.length); if (w.day % 10 === 0) { try { techLossDay(w) } catch (e) { w.fault('techloss', e) } try { neighbourTechDay(w) } catch (e) { w.fault('neightech', e) } }
  const avail = techAvailable(w); if (!avail.length) return;
  if (!t.focus) {
    t.wait++;                                                           // the council normally chooses at a meeting; without one, the village drifts to the most useful idea
    if (!w.gov.council.length || t.wait >= 9) chooseResearch(w, avail.map(id => ({ id, s: techNeed(w, id) + Math.random() * 0 })).sort((a, b) => b.s - a.s)[0].id, 'rules');
  }
  if (t.focus && !avail.includes(t.focus) && !techAvailableRaw(w).includes(t.focus)) t.focus = null;        // no longer possible
  if (t.focus && avail.includes(t.focus) && t.points >= techCost(w, t.focus)) discover(w);           // a missing input pauses the study
}
/* council agenda item: what should the village study next? */
function researchAgenda(w, base, ms) {
  const avail = techAvailable(w), g = w.gov;
  const rf = rulingFocus(w), score = id => techNeed(w, id) + ms.reduce((s, m) => s + techPref(m.v, id), 0) / ms.length + (rf && TECH_FOCUS[id] === rf ? 0.12 : 0);      // the ruling circle nudges the agenda
  avail.sort((a, b) => score(b) - score(a)); avail.length = Math.min(avail.length, 6);
  const options = avail.map(id => ({ id: 'r_' + id, text: `${TECHS[id].name} (${techCost(w, id)} knowledge, ${BRANCHES[TECHS[id].branch].name.toLowerCase()}): ${TECHS[id].desc}` }));
  const def = 'r_' + avail[0];
  deliberate(w, { ...base, kind: 'research', topic: `The village has gathered enough curiosity to pursue one new line of study. Age: ${AGES[techEra(w)]}. Known: ${Object.keys(w.tech.known).map(id => TECHS[id].name).join(', ') || 'nothing yet'}. Which should the council direct everyone toward?`, options, default: def,
    apply: (id, sp, reason, src) => {
      const tid = id.slice(2), champ = ms.slice().sort((a, b) => techPref(b.v, tid) - techPref(a.v, tid))[0];
      chooseResearch(w, tid, src); recordDecision(w, `to study ${TECHS[tid].name.toLowerCase()} next. ${champ.v.name} argued for it.`, sp, src); g.nextMeeting = w.day + 4;
    } });
}

/* upgrading old buildings when the village learns better ways */
function planUpgrades(w) {
  const pop = w.vills.length, open = w.bps.filter(b => b.type === 'upgrade').length;
  if (open >= 1 + Math.floor(pop / 60) || w.day < (w.nextUpgrade || 0)) return;
  const top = styleNow(w); if (!top) return;
  const { tgt, eff } = resourceTargets(w); if (eff.wood < tgt.wood * 0.8 || eff.stone < tgt.stone * 0.6 || w.stock.food < pop * 3) return;
  // the dearest ground is rebuilt first and furthest: each home aims for the style its site deserves (see siteStyle in city.js)
  let best = null, bs = 0;
  for (const h of w.houses()) {
    if (w.bpAt.has(h.y * CFG.W + h.x)) continue; const want = siteStyle(w, h.x, h.y), gap = want - (h.style || 0); if (gap <= 0) continue;
    const lv = lvAt(w, h.x, h.y), sc = gap * 10 + (lv > 0 ? lv * 0.2 : 0) - Math.hypot(h.x - w.cx, h.y - w.cy) * 0.05; if (!best || sc > bs) { best = h; bs = sc }
  }
  if (!best) return;
  makeBp(w, 'upgrade', best.x, best.y, { target: best.id, toStyle: (best.style || 0) + 1 }); w.nextUpgrade = w.day + (pop >= 120 ? 1 : 3);
}

/* ----- knowledge can be lost: when a great part of the people are gone, the newest, least-shared skills go with them ----- */
function techLossDay(w) {
  const t = w.tech, peak = t.peak || 0, pop = w.vills.length; if (peak < 40 || pop > peak * 0.45 || w.r() > 0.3) return;
  const known = Object.keys(t.known).filter(id => !Object.keys(t.known).some(o => TECHS[o] && TECHS[o].req.includes(id)));       // leaves: nothing known builds on them
  known.sort((a, b) => TECHS[b].age - TECHS[a].age || t.known[b] - t.known[a]); const id = known[0]; if (!id || TECHS[id].age === 0) return;
  delete t.known[id]; t.points = 0; t.lost = (t.lost || 0) + 1; (t.lostIds || (t.lostIds = [])).push(id); t.peak = Math.max(pop * 1.6, peak * 0.8);
  w.emit('techloss', `With so many gone, the village forgets how to ${TECHS[id].name.toLowerCase()}. What was learned must be learned again.`, { id });
}
/* ----- neighbours learn too, slowly; the more learned (and friendlier) ones become a source of knowledge ----- */
const NEIGH_PACE = { scholars: 1.2, traders: 1.0, farmers: 0.85, raiders: 0.8 }, NEIGH_AFFINITY = { scholars: { mind: 1.5, health: 1.2 }, traders: { sea: 1.6, law: 1.2 }, farmers: { food: 1.8, health: 1.1 }, raiders: { war: 1.8, craft: 1.3 } };
function neighbourTechDay(w) {
  if (!w.neigh) return;
  for (const n of w.neigh) {
    if (!n.knows || n.colony) continue; const age = Math.min(AGES.length - 1, Math.floor(w.day * (NEIGH_PACE[n.kind] || 1) / 300)), aff = NEIGH_AFFINITY[n.kind] || {}; let added = 0;
    for (const id of Object.keys(TECHS)) { const T = TECHS[id]; if (added >= 2) break; if (n.knows.includes(id) || T.age > age || !T.req.every(r => n.knows.includes(r))) continue; if (w.r() < 0.12 * (aff[T.branch] || 0.7)) { n.knows.push(id); added++ } }
  }
}
