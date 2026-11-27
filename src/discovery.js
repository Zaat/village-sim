/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   discovery.js — v0.28 sites, finds, materials and expeditions.
   The map holds hidden SITES (ruins, caves, outcrops, hoards, wrecks, fishing
   and whaling grounds), seeded from the map seed; the village's own history adds
   more (its own wrecks, abandoned outposts). Rumours make sites known as the
   village learns to explore; the council weighs an expedition against its cost
   and risk like any other choice; a leader (and on land a small party) walks or
   sails there and brings the find home. MATERIALS (saltpetre, coal, copper, oil)
   come from sites, from a working mine (two per map), or from neighbours, and
   are the inputs a few late technologies need. Expeditions are cheap records
   with at most one ship and one party visible at a time.
   ========================================================================== */
const MAT_LIST = ['saltpetre', 'coal', 'copper', 'oil'];
const MATS = { saltpetre: { name: 'saltpetre' }, coal: { name: 'coal' }, copper: { name: 'copper' }, oil: { name: 'oil' } };
const SITE_KINDS = {
  ruin: { name: 'ruins of an older people', land: true, w: 3, how: 'Digging among the ruins', verb: 'dig' },
  cave: { name: 'a deep cave', land: true, w: 2, how: 'Exploring the cave', verb: 'explore', mats: ['saltpetre', 'copper'] },       // mats = what such a site can hold when a deposit is seeded there
  outcrop: { name: 'an outcrop of dark stone', land: true, w: 2, how: 'Prospecting the outcrop', verb: 'prospect', mats: ['coal', 'oil', 'copper'] },
  hoard: { name: 'a buried hoard', land: true, w: 2, how: 'Digging for the hoard', verb: 'dig' },
  oldpost: { name: 'an abandoned outpost', land: true, w: 0, how: 'Searching the empty outpost', verb: 'search' },
  wreck: { name: 'a sunken wreck', sea: true, w: 3, how: 'Diving on the wreck', verb: 'salvage' },
  ownwreck: { name: 'the wreck of one of our own ships', sea: true, w: 0, how: 'Salvaging the lost ship', verb: 'salvage' },
  shoals: { name: 'rich fishing grounds', sea: true, w: 2, how: 'Fishing the rich shoals', verb: 'fish', reuse: 3 },
  deepwreck: { name: 'a wreck in deep water', sea: true, w: 0, tech: 'divingbell', how: 'Diving on the deep wreck', verb: 'salvage' },
  seabed: { name: 'ruins on the seabed', sea: true, w: 0, tech: 'sonar', how: 'Surveying the drowned ruins', verb: 'dive' },
  lostcity: { name: 'a lost city seen from the air', land: true, w: 0, tech: 'aviation', how: 'Excavating the lost city', verb: 'dig' },
  lowwater: { name: 'a hoard uncovered by the low water', land: true, w: 0, how: 'Digging at the dry riverbed', verb: 'dig' },
  whales: { name: 'whaling grounds', sea: true, deep: true, w: 1, how: 'Hunting whales', verb: 'hunt', tech: 'navigation', reuse: 2 }
};
const DISC = w => w.disc || (initDisc(w), w.disc);
function initDisc(w) { w.disc = { sites: [], mats: {}, exped: [], nid: 1, nextRumour: 14, nextPlan: 30, nextBarge: 50, nextDeal: 45, deals: 0, done: 0, lost: 0, finds: 0, lore: 0, relics: 0, log: [], hist: { wrecks: 0, posts: {} }, gen: false } }
const discHash = (w, k) => { let h = (w.seed ^ Math.imul(k + 7, 2654435761)) >>> 0; h = Math.imul(h ^ h >>> 15, 2246822519) >>> 0; return (h ^ h >>> 13) >>> 0 };
/* v0.28.1: each material has at most one or two deposits on a map. Two materials (local) lie within reach on the home landmass; the other two sit far off
   (70% of maps) or only come by trade. A deposit is recognised on a visit only once the village knows the matching craft. */
const SURVEY = { saltpetre: 'masonry', coal: 'mining', copper: 'bronze', oil: 'steam' };
const DEPOSIT_KINDS = { saltpetre: ['cave'], coal: ['outcrop'], copper: ['cave', 'outcrop'], oil: ['outcrop'] };
const localMats = w => { const a = discHash(w, 1) % 4; return [MAT_LIST[a], MAT_LIST[(a + 1 + discHash(w, 2) % 3) % 4]] };
const neighMats = (w, n) => [MAT_LIST[discHash(w, 100 + n.id) % 4]];                                           // one material per neighbour, offered only by a friend
function matSource(w, m) {
  const D = DISC(w); if (D.mats[m]) return 'found';
  if (w.has('trade') && (w.neigh || []).some(n => n.found && n.met && !isHostile(n) && n.rel >= 45 && neighMats(w, n).includes(m))) return 'trade';
  return null;
}
const matOk = (w, m) => !!matSource(w, m);

/* ----- seeding ----- */
function genSites(w) {
  const { W, H } = CFG, rng = mulberry32((w.seed ^ 0x2C1B3C6D) >>> 0), R = () => rng(), D = w.disc, reg = landRegions(w), home = reg.label[w.cy * W + w.cx];
  const kindsLand = ['ruin', 'ruin', 'ruin', 'cave', 'cave', 'outcrop', 'outcrop', 'hoard', 'hoard'], kindsSea = ['wreck', 'wreck', 'wreck', 'shoals', 'shoals', 'whales', 'wreck'];
  const place = (kind, ok, want, minD, maxD, mat) => {
    for (let g = 0; g < 400; g++) {
      const a = R() * Math.PI * 2, d = minD + R() * (maxD - minD), x = Math.round(w.cx + Math.cos(a) * d), y = Math.round(w.cy + Math.sin(a) * d); if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue;
      const i = y * W + x; if (!ok(i)) continue; if (D.sites.some(s => Math.hypot(s.x - x, s.y - y) < 9)) continue;
      const K = SITE_KINDS[kind], s = { id: D.nid++, kind, x, y, known: false, done: false, uses: K.reuse || 1, mat: mat || null, prize: Math.round((kind === 'shoals' ? 70 : kind === 'whales' ? 100 : kind === 'cave' || kind === 'outcrop' ? 25 : 45) * (0.7 + 0.8 * R())), lore: R() < (kind === 'ruin' ? 0.7 : 0.15), risk: 0.04 + 0.05 * R() };
      D.sites.push(s); return s;
    }
  };
  const landOk = i => { const t = w.terr[i]; return (t === TERR.GRASS || t === TERR.ROCK) && reg.label[i] === home && !w.feat[i] && !w.bmap[i] };
  const shallowOk = i => w.terr[i] === TERR.SHALLOW, deepOk = i => w.terr[i] === TERR.DEEP;
  for (const k of kindsLand) place(k, landOk, 0, 14, 62);
  const loc = localMats(w);                                                  // deposits: local ones near, the others far or none
  for (const m of MAT_LIST) { const kind = DEPOSIT_KINDS[m][(R() * DEPOSIT_KINDS[m].length) | 0], near = loc.includes(m); if (near || R() < 0.7) place(kind, landOk, 0, near ? 24 : 66, near ? 66 : 105, m) }
  for (const k of kindsSea) place(k, k === 'whales' ? deepOk : shallowOk, 0, 16, 70);
  for (const k of ['ruin', 'cave', 'outcrop', 'hoard']) place(k, landOk, 0, 62, 100);                                     // a far ring, heard of only late
  for (const k of ['wreck', 'shoals', 'whales']) place(k, k === 'whales' ? deepOk : shallowOk, 0, 70, 115);
}
function addSite(w, kind, x, y, extra) {
  const D = DISC(w), K = SITE_KINDS[kind], s = Object.assign({ id: D.nid++, kind, x: Math.round(x), y: Math.round(y), known: true, done: false, uses: K.reuse || 1, mat: null, prize: 40, lore: true, risk: 0.04 }, extra || {}); D.sites.push(s); return s;
}
/* the village's own past leaves sites behind */
function historyWreck(w, x, y, what) {
  const D = DISC(w); if (!w.disc || !isFinite(x) || !isFinite(y)) return; const s = addSite(w, 'ownwreck', x, y, { prize: 40, text: what, day: w.day, lore: false }); D.hist.wrecks++;
  w.say(`${what} The wreck lies off the coast; perhaps it could be salvaged one day.`); return s;
}
function ownHistoryDay(w) {
  const D = DISC(w), S = w.out; if (!S || !S.list) return;
  for (const o of S.list) if (o.state === 'gone' && (o.fate === 'failed' || o.fate === 'lost') && !D.hist.posts[o.id] && isFinite(o.x) && isFinite(o.y)) {
    D.hist.posts[o.id] = 1; const s = addSite(w, 'oldpost', o.x, o.y, { prize: 30 + Math.round(o.pop || 0) * 3, text: `${o.name}, which died out`, lore: true, day: w.day }); w.say(`${o.name} stands empty. Its huts may still hold something worth bringing home.`);
  }
}

/* ----- rumours: the village learns of sites as it learns to explore ----- */
function rumourDay(w) {
  const D = DISC(w); if (w.day < D.nextRumour) return; const lvl = ladderLevel(w, 'explore'), met = (w.neigh || []).filter(n => n.met).length, R = 34 + 26 * lvl + 9 * met + (w.has('boats') ? 10 : 0);
  D.nextRumour = w.day + Math.round(14 / (1 + 0.4 * lvl + 0.2 * met));
  const hidden = D.sites.filter(s => !s.known && Math.hypot(s.x - w.cx, s.y - w.cy) <= R && (!SITE_KINDS[s.kind].sea || w.has('boats')) && (!SITE_KINDS[s.kind].tech || w.has(SITE_KINDS[s.kind].tech)));
  if (!hidden.length) return; hidden.sort((a, b) => Math.hypot(a.x - w.cx, a.y - w.cy) - Math.hypot(b.x - w.cx, b.y - w.cy)); const s = hidden[0]; s.known = true; s.day = w.day;
  const K = SITE_KINDS[s.kind], dir = compass(w, s.x, s.y);
  w.emit('rumour', K.sea ? `Fishers speak of ${K.name} to the ${dir}.` : `Hunters speak of ${K.name} to the ${dir}.`, { site: s.id }); revealCircle(w, s.x, s.y, 5);
}

/* ----- paths ----- */
function waterRoute(w, start, goal) {
  const { W, H } = CFG, N = W * H, water = i => w.terr[i] <= TERR.SHALLOW; if (!water(start)) return null;
  const prev = new Int32Array(N).fill(-1), q = new Int32Array(N); let h = 0, t = 0; q[t++] = start; prev[start] = start;
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (h < t) {
    const u = q[h++], ux = u % W, uy = (u / W) | 0; if (goal(ux, uy)) { const p = []; for (let c = u; c !== start; c = prev[c]) p.push(c); p.push(start); p.reverse(); return p }
    for (const [dx, dy] of D8) { const x = ux + dx, y = uy + dy; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const v = y * W + x; if (prev[v] >= 0 || !water(v)) continue; if (dx && dy && (!water(uy * W + x) || !water(y * W + ux))) continue; prev[v] = u; q[t++] = v }
  }
  return null;
}
function sitePath(w, s, boat) {
  const C = w._pc || (w._pc = new Map()), key = 'e' + s.id + (boat ? ':' + boat.dock : ''); if (C.has(key)) return C.get(key); let p = null;
  if (SITE_KINDS[s.kind].sea) { if (boat) p = waterRoute(w, Math.floor(boat.my) * CFG.W + Math.floor(boat.mx), (x, y) => Math.hypot(x - s.x, y - s.y) <= 2.2) }
  else { const goal = (x, y) => Math.hypot(x - s.x, y - s.y) <= 2.5; p = w.search(w.cx, w.cy + 2, goal, 520) || w.search(w.cx, w.cy + 2, goal, 520, true) || null }
  C.set(key, p); return p;
}

/* ----- the council weighs an expedition ----- */
const PARTY = 3;
function planExpeditions(w) {
  const D = DISC(w); if (w.day < D.nextPlan) return; D.nextPlan = w.day + 6 + ((w.r() * 4) | 0);
  const act = D.exped.filter(e => e.state !== 'done'); if (act.length >= 2 || w.pop < 30 || w.day < 40 || w.stock.food < w.pop * 3.5) return;
  const app = w.rx ? clamp(1 + 0.6 * w.rx.O + 0.4 * w.rx.C - 0.5 * w.rx.P - 0.3 * w.rx.A, 0.3, 2) : 1; if (app < 0.5) return;
  const E = w.econ, coin = money(w), best = [];
  for (const s of D.sites) {
    const K = SITE_KINDS[s.kind]; if (!s.known || s.done || s.unreach || (K.tech && !w.has(K.tech)) || act.some(e => e.site === s.id)) continue;
    if (s.seen && s.mat && !D.mats[s.mat] && !w.has(SURVEY[s.mat])) continue;                       // seen, not understood yet
    const sea = !!K.sea; if (sea && (!w.has('boats') || w.season === 3 || w.pop < 45)) continue; if (act.some(e => e.mode === (sea ? 'sea' : 'land'))) continue;
    let boat = null; if (sea) { boat = w.boats.find(b => b.crew == null && b.state === 'moored' && !b.noSea && (b.kind || 'fishing') === 'fishing' && w.buildings.get(b.dock) && sitePath(w, s, b)); if (!boat) continue }
    const path = sea ? sitePath(w, s, boat) : sitePath(w, s); if (!path) { if (!sea) s.unreach = true; continue }
    const len = path.length, speed = sea ? 0.07 : 0.1, days = Math.max(2, (2 * len / speed + 160) / CFG.TPD);
    const matNew = s.mat && !matOk(w, s.mat) && w.has(SURVEY[s.mat]), gain = s.prize + (matNew ? 90 : 0) + (s.lore ? 35 : 0);
    const risk = clamp((s.risk + 0.0004 * len) * (sea ? 1.4 : 1) * (w.settings.disasters ? 1 : 0.4), 0, 0.4), cb = costBenefit(w, { gain, cost: sea ? 2 : 1, risk, stake: 40, days, crew: PARTY, min: 1.1 });
    if (cb.go) best.push({ s, K, sea, boat, days: Math.round(days * 10) / 10, risk, cb, len });
  }
  if (!best.length) return; best.sort((a, b) => b.cb.ratio - a.cb.ratio); proposeExpedition(w, best[0], app);
}
function proposeExpedition(w, p, app) {
  const D = DISC(w), { s, K } = p, what = `${K.name} to the ${compass(w, s.x, s.y)}`, mat = s.mat && !matOk(w, s.mat) ? (w.has(SURVEY[s.mat]) ? ` It may hold ${MATS[s.mat].name}, which we lack.` : ' Hunters say the stone there looks odd.') : '';
  ask(w, { kind: 'expedition', topic: `An expedition could ${K.verb === 'fish' || K.verb === 'hunt' ? 'go to' : K.verb} ${what}: about ${p.days} days ${p.sea ? 'by boat' : 'on foot with a party of three'}, ${Math.round(p.risk * 100)}% risk.${mat} Worth about ${Math.round(p.cb.gain)} coins' worth against ${Math.round(p.cb.total * 10) / 10} in labour and risk.`,
    options: [{ id: 'go', text: `Send an expedition (${p.days} days)` }, { id: 'wait', text: 'Not now: keep everyone at home work' }], default: app < 0.7 ? 'wait' : 'go',
    apply: (id, sp, reason, src) => {
      if (id === 'wait') { D.nextPlan = w.day + 14; recordDecision(w, `not to send an expedition to ${what} for now.`, sp, src); return }
      D.exped.push({ id: D.nid++, site: s.id, mode: p.sea ? 'sea' : 'land', state: 'pending', until: w.day + 4, leader: null, escorts: 0, kind: s.kind });
      recordDecision(w, `to send an expedition to ${what}.`, sp, src); w.gov.nextMeeting = w.day + 3;
    } });
}

/* ----- the leader takes the job (called from villager.js) ----- */
function expedPending(w) { return w.disc ? w.disc.exped.find(e => e.state === 'pending') : null }
function expedStart(w, ex, v) {
  const D = DISC(w), s = D.sites.find(x => x.id === ex.site), K = s && SITE_KINDS[s.kind]; if (!s) { ex.state = 'done'; return false }
  const { W } = CFG, dur = ex.mode === 'sea' ? 90 : 70;
  if (ex.mode === 'land') {
    const goal = (x, y) => Math.hypot(x - s.x, y - s.y) <= 2.5; let path = w.search(v.tx, v.ty, goal, 520) || w.search(v.tx, v.ty, goal, 520, true); if (!path) { s.unreach = true; ex.state = 'done'; return false }
    ex.state = 'running'; ex.leader = v.id; ex.day = w.day; v.jobKind = 'expedition'; v.hunger = Math.max(v.hunger, 85); v.energy = Math.max(v.energy, 80);
    v.steps = [go(null, path, `Setting out for ${K.name}`), work(dur, K.how, () => { v.hunger = Math.max(v.hunger, 80); expedFind(w, ex, v, s) }),
      go((x, y) => Math.abs(x - w.cx) + Math.abs(y - w.cy) <= 3, null, 'Carrying the finds home', { maxCost: 600 }), work(1, 'Back in the village', () => expedEnd(w, ex, v, 'ok'))];
    return true;
  }
  let boat = null, path = null; for (const bt of w.boats) { if (bt.crew != null || bt.state !== 'moored' || bt.noSea || (bt.kind || 'fishing') !== 'fishing') continue; const p = sitePath(w, s, bt); if (p) { boat = bt; path = p; break } }
  if (!boat) { ex.state = 'done'; return false } const dock = w.buildings.get(boat.dock); if (!dock) return false;
  const len = path.length, trip = Math.ceil(len / 0.07), at = p => { const c = path[Math.min(len - 1, Math.floor(p * len))]; if (v.hunger < 45) v.hunger = 45; if (v.energy < 40) v.energy = 40; boat.x = (c % W) + 0.5; boat.y = ((c / W) | 0) + 0.5; v.x = boat.x; v.y = boat.y; const nx = path[Math.min(len - 1, Math.floor(p * len) + 1)]; if (nx !== undefined && nx % W !== c % W) { v.dir = nx % W > c % W ? 1 : -1; boat.dir = v.dir } };
  boat.crew = v.id; v.boat = boat; v.jobKind = 'expedition'; ex.state = 'running'; ex.leader = v.id; ex.day = w.day;
  v.steps = [go((x, y) => x === dock.x && y === dock.y, null, 'To the dock', { maxCost: 120, check: () => boat.crew === v.id }), work(30, 'Provisioning the boat', () => { boat.state = 'out'; v.x = boat.x; v.y = boat.y }),
    work(trip, `Sailing to ${K.name}`, null, { onTick: at }), work(dur, K.how, () => expedFind(w, ex, v, s)),
    work(1, 'Setting course for home', () => { if (w.settings.disasters && w.r() < 0.012 + s.risk * 0.2) { v.health = 0; v.cause = 'sea'; expedEnd(w, ex, v, 'lost') } }),
    work(trip, 'Sailing home with the catch', null, { onTick: p => at(1 - p) }), work(10, 'Mooring the boat', () => { v.x = dock.x + 0.5; v.y = dock.y + 0.5; boat.home(); v.boat = null; expedEnd(w, ex, v, 'ok') })];
  return true;
}
/* members of the party who walk with the leader (land only) */
function escortStart(w, v) {
  const D = w.disc; if (!D) return false; const ex = D.exped.find(e => e.state === 'running' && e.mode === 'land' && e.escorts < PARTY - 1 && w.day - e.day < 8 && e.leader !== v.id);
  if (!ex || v.age > 55 || v.energy < 45) return false; const s = D.sites.find(x => x.id === ex.site); if (!s) return false;
  const goal = (x, y) => Math.hypot(x - s.x, y - s.y) <= 3.5; const path = w.search(v.tx, v.ty, goal, 520) || w.search(v.tx, v.ty, goal, 520, true); if (!path) return false;
  ex.escorts++; v.jobKind = 'escort'; v.steps = [go(null, path, 'Joining the expedition'), work(60, 'Helping the party', null), go((x, y) => Math.abs(x - w.cx) + Math.abs(y - w.cy) <= 3, null, 'Walking home', { maxCost: 600 }), work(1, 'Back in the village', () => { v.jobKind = null })];
  return true;
}
/* what the party finds */
function giveValue(w, V) {
  const E = w.econ; if (money(w)) { E.treasury += V; return `${V} coins` } const each = Math.max(1, Math.round(V / 6)); w.stock.wood = Math.min(w.capOf('wood'), w.stock.wood + each); w.stock.stone = Math.min(w.capOf('stone'), w.stock.stone + each); w.stock.food = Math.min(w.cap(), w.stock.food + each); return `${each * 3} loads of goods`;
}
function expedFind(w, ex, v, s) {
  const D = DISC(w), K = SITE_KINDS[s.kind], bits = []; ex.found = true;
  if (w.settings.disasters && w.r() < s.risk * 0.5 && K.sea !== true) { v.health = Math.max(5, v.health - 25); w.say(`${v.name} was hurt in a fall at ${K.name}.`); ex.hurt = true }
  const mult = ex.hurt ? 0.6 : 1;
  if (K.verb === 'fish') { const f = Math.round(s.prize * 0.9 * mult); w.stock.food = Math.min(w.cap(), w.stock.food + f); bits.push(`${f} loads of fish`); for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const i = (s.y + dy) * CFG.W + s.x + dx; if (i >= 0 && i < w.fish.length && w.terr[i] === TERR.SHALLOW) w.fish[i] = Math.min(CFG.FISH_MAX, w.fish[i] + 2) } }
  else if (K.verb === 'hunt') { const f = Math.round(s.prize * 0.7 * mult); w.stock.food = Math.min(w.cap(), w.stock.food + f); bits.push(`${f} loads of whale meat and oil`); bits.push(giveValue(w, Math.round(s.prize * 0.4 * mult))) }
  else { bits.push(giveValue(w, Math.round(s.prize * mult))); D.relics++ }
  if (s.mat && !D.mats[s.mat]) { if (w.has(SURVEY[s.mat])) { D.mats[s.mat] = w.day; bits.push(`a source of ${MATS[s.mat].name}`) } else { ex.unnamed = true; s.seen = true; bits.push('strange stone nobody can name yet (it may be worth another look when we know more)') } }
  if (s.lore) { const r = loreFind(w, s); if (r) { bits.push(r); D.lore++ } }
  ex.text = bits.join(', ') || 'little of value';
}
/* old writings: a lost technology comes back, or a head start on the one being studied */
function loreFind(w, s) {
  const t = w.tech;
  if (t.lostIds && t.lostIds.length) { const id = t.lostIds.shift(); if (!t.known[id] && TECHS[id]) { t.known[id] = w.day; w.emit('discovery', `Writings found at ${SITE_KINDS[s.kind].name} teach again how to ${TECHS[id].name.toLowerCase()}, which had been forgotten.`, { id, regained: true }); return `lost knowledge: ${TECHS[id].name}` } }
  if (t.focus) { const add = Math.round(techCost(w, t.focus) * 0.35); t.points += add; return `old writings worth ${add} knowledge` }
  const open = techAvailable(w); if (open.length) { const add = Math.round(techCost(w, open[0]) * 0.25); t.points += add; return `old writings worth ${add} knowledge` }
  return null;
}
function expedEnd(w, ex, v, how) {
  const D = DISC(w), s = D.sites.find(x => x.id === ex.site), K = s && SITE_KINDS[s.kind]; if (ex.state === 'done') return; ex.state = 'done'; ex.how = how;
  if (how === 'lost') { D.lost++; w.emit('expedition', `${v.name} was lost at sea on the way home from ${K ? K.name : 'the expedition'}.`, { lost: true }); return }
  D.done++; if (s && !ex.unnamed) { s.uses--; if (s.uses <= 0) s.done = true } D.finds += ex.found ? 1 : 0;
  const text = `${v.name} returns from ${K ? K.name : 'the expedition'} with ${ex.text || 'news'}.`; D.log.unshift({ day: w.day, text }); if (D.log.length > 8) D.log.pop();
  w.emit('expedition', text, { find: true }); v.mood = Math.min(100, v.mood + 8);
}
/* a leader who is hurt or called away */
function expedAbort(w, v) {
  const D = w.disc; if (!D) return; for (const ex of D.exped) if (ex.leader === v.id && ex.state === 'running') { ex.state = 'done'; ex.how = 'abort' }
}
function discoveryDay(w) {
  const D = DISC(w); if (!D.gen) { D.gen = true; genSites(w) } ownHistoryDay(w); rumourDay(w); planExpeditions(w);
  bargeDay(w); researchDealDay(w);
  triggerDay(w);
  D.exped = D.exped.filter(e => e.state !== 'done' || w.day - (e.day || w.day) < 3);
  for (const e of D.exped) if (e.state === 'pending' && w.day > e.until) { e.state = 'done'; w.say('Nobody is free to lead the expedition, and it is put off.'); DISC(w).nextPlan = w.day + 6 }
  for (const e of D.exped) if (e.state === 'running' && w.day - e.day > 60) e.state = 'done';            // a stuck run is dropped
}
function restoreDisc(w, d) { w.disc = d; if (d.gen === undefined) d.gen = true; if (d.nextBarge === undefined) d.nextBarge = 50; if (d.nextDeal === undefined) { d.nextDeal = 45; d.deals = 0 } for (const e of d.exped) if (e.state !== 'done') e.state = 'done'; for (const s of d.sites) { const K = SITE_KINDS[s.kind]; if (!K) s.done = true } }

/* ----- v0.28 living waters and moving herds (deterministic, no RNG stream, nothing saved) ----- */
/* a tile's fish come back faster where the water around it is full: an emptied bay recovers slowly, a healthy one quickly */
function fishSpawn(w, i) {
  const { W } = CFG, f = w.fish, n = f.length, mx = w.terr[i] === TERR.DEEP ? CFG.FISH_DEEP : CFG.FISH_MAX;
  const a = i - 1 >= 0 ? f[i - 1] : 0, b = i + 1 < n ? f[i + 1] : 0, c = i - W >= 0 ? f[i - W] : 0, d = i + W < n ? f[i + W] : 0, mean = (a + b + c + d + f[i]) / (5 * mx);
  return (Math.imul(i, 2654435761) + w.tick >>> 0) % 100 < 40 + 60 * Math.min(1, mean);
}
/* deer winter in sheltered pockets a day's walk out and come back in spring; three herds, three hubs */
function deerHubs(w) {
  if (w._hubs) return w._hubs; const { W, H } = CFG, hubs = [];
  for (let k = 0; k < 3; k++) {
    const a0 = (discHash(w, 300 + k) % 6283) / 1000; let got = null;
    for (let g = 0; g < 40 && !got; g++) { const a = a0 + g * 0.37, d = 20 + (g % 5) * 2, x = Math.round(w.cx + Math.cos(a) * d), y = Math.round(w.cy + Math.sin(a) * d); if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue; const i = y * W + x; if (w.terr[i] === TERR.GRASS && !w.feat[i] && !w.bmap[i]) got = { x, y } }
    if (got) hubs.push(got);
  }
  return (w._hubs = hubs);
}
function deerHub(w, a) {
  if (w.season !== 3 && w.season !== 0) return null; const h = deerHubs(w); if (!h.length) return null;
  return w.season === 3 ? h[a.id % h.length] : { x: w.cx + ((a.id % 7) - 3) * 3, y: w.cy + ((a.id % 5) - 2) * 3 };
}
const deerNear = (w, r = 25) => { let n = 0; for (const a of w.animals) if (a.alive && a.kind === 'deer' && Math.hypot(a.x - w.cx, a.y - w.cy) <= r) n++; return n };

/* ----- river barges: bulk goods to a neighbour reached by water but not by sea trade ----- */
function bargeDay(w) {
  const D = DISC(w), t = w.trade2; if (!t || !w.neigh || w.day < D.nextBarge || !w.has('trade') || !w.has('carpentry') || w.pop < 40) return; D.nextBarge = w.day + 12;
  if (w.boats.some(b => b.kind === 'barge') || t.yard.some(y => y.kind === 'barge') || t.yard.length) return;
  const coin = money(w), E = w.econ, wood = 35, coins = 8; if (w.stock.wood < wood + 20 || (coin && E.treasury < coins)) return;
  const ns = w.neigh.filter(n => n.found && n.met && n.reach === 'land' && !isHostile(n)); if (!ns.length) return;
  for (const b of w.boats) {
    const d = w.buildings.get(b.dock); if (!d || (b.kind || 'fishing') !== 'fishing' || b.noSea || w.boats.filter(x => x.dock === d.id).length >= berths(w, d)) continue;
    const n = ns.find(n => seaTripPath(w, b, n)); if (!n) continue;
    ask(w, { kind: 'trade', topic: `A river runs from our landing toward ${n.name}. A barge there could carry about ${SHIPS.barge.cap} loads of goods, more than a wagon, and cheaply. It costs ${wood} firewood${coin ? ' and ' + coins + ' coins' : ''} and about 4 days of work.`,
      options: [{ id: 'yes', text: `Build a river barge (${wood} firewood${coin ? ', ' + coins + ' coins' : ''})` }, { id: 'wait', text: 'Wait: wagons will do' }], default: tradeAppetite(w) >= 0.8 ? 'yes' : 'wait',
      apply: (id, sp, reason, src) => {
        if (id !== 'yes' || w.stock.wood < wood) { D.nextBarge = w.day + 40; recordDecision(w, `not to build a river barge for now.`, sp, src); return }
        w.stock.wood -= wood; if (coin) E.treasury -= coins; t.yard.push({ kind: 'barge', dock: d.id, at: w.day + 4 }); recordDecision(w, `to build a river barge for the trade to ${n.name}.`, sp, src);
      } });
    return;
  }
}

/* ----- research deals: a friendly neighbour sells what it knows (buying only, for coins) ----- */
function researchDealDay(w) {
  const D = DISC(w); if (!w.neigh || w.day < D.nextDeal || !money(w) || !w.has('trade')) return; D.nextDeal = w.day + 18 + ((w.r() * 8) | 0); const E = w.econ, t = w.tech;
  const open = techAvailableRaw(w); if (!open.length) return; let best = null;
  for (const n of w.neigh) { if (!n.found || !n.met || isHostile(n) || n.rel < 18 || !n.knows) continue;
    for (const id of open) if (n.knows.includes(id)) { const price = Math.max(12, Math.round(techCost(w, id) * 0.05 * (1.4 - 0.6 * clamp(n.rel / 100, 0, 1)))); { const sc = (id === t.focus ? 1000 : 0) + TECHS[id].cost; if (price <= E.treasury * 0.7 && (!best || sc > best.sc)) best = { n, id, price, sc } } } }
  if (!best) return; const { n, id, price } = best, T = TECHS[id], focusNote = id === t.focus ? ' It is what the scholars are studying now.' : '';
  ask(w, { kind: 'research', topic: `Scholars of ${n.name} will teach us ${T.name.toLowerCase()} for ${price} coins.${focusNote} The treasury holds ${Math.round(E.treasury)} coins.`,
    options: [{ id: 'buy', text: `Buy the lessons (${price} coins)` }, { id: 'wait', text: 'Decline: we will work it out ourselves' }], default: price <= E.treasury * 0.35 ? 'buy' : 'wait',
    apply: (cid, sp, reason, src) => {
      if (cid !== 'buy' || E.treasury < price || t.known[id]) { D.nextDeal = w.day + 25; recordDecision(w, `not to buy lessons in ${T.name.toLowerCase()} from ${n.name}.`, sp, src); return }
      E.treasury -= price; E.spent = (E.spent || 0) + price; const f0 = t.focus, p0 = t.points; t.focus = id; t.points = techCost(w, id) + p0; discover(w); t.focus = f0 === id ? null : f0; t.points = p0; n.rel += 3; D.deals++;
      recordDecision(w, `to buy lessons in ${T.name.toLowerCase()} from ${n.name} for ${price} coins.`, sp, src); w.emit('research', `${n.name}'s scholars teach the village ${T.name.toLowerCase()} for ${price} coins.`, { id, nid: n.id, price }); w.gov.nextMeeting = w.day + 4;
    } });
}

/* ----- v0.28.1: sites that appear because the village learned something or the world changed ----- */
const TRIGGERS = [
  { tech: 'divingbell', kind: 'deepwreck', n: 2, prize: 110, lore: true, risk: 0.09, text: 'Divers with their new bells speak of wrecks lying too deep for any swimmer.' },
  { tech: 'sonar', kind: 'seabed', n: 2, prize: 140, lore: true, risk: 0.08, text: 'The sonar draws drowned ruins on the seabed.' },
  { tech: 'aviation', kind: 'lostcity', n: 1, prize: 170, lore: true, risk: 0.07, text: 'From the air the flyers see the outline of a city under the forest.' }
];
function newSite(w, kind, ok, minD, maxD, extra) {
  const D = DISC(w), { W, H } = CFG, rng = mulberry32((w.seed ^ 0x7A1C2D91 ^ Math.imul(D.nid, 40503)) >>> 0), K = SITE_KINDS[kind];
  for (let g = 0; g < 500; g++) {
    const a = rng() * Math.PI * 2, d = minD + rng() * (maxD - minD), x = Math.round(w.cx + Math.cos(a) * d), y = Math.round(w.cy + Math.sin(a) * d); if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue;
    if (!ok(y * W + x) || D.sites.some(s => Math.hypot(s.x - x, s.y - y) < 8)) continue;
    return addSite(w, kind, x, y, Object.assign({ known: true, day: w.day, uses: K.reuse || 1, risk: 0.05 }, extra));
  }
  return null;
}
function triggerDay(w) {
  const D = DISC(w); if (!D.gen) return; D.trig = D.trig || {}; const reg = landRegions(w), home = reg.label[w.cy * CFG.W + w.cx];
  const landOk = i => { const t = w.terr[i]; return (t === TERR.GRASS || t === TERR.ROCK) && reg.label[i] === home && !w.feat[i] && !w.bmap[i] }, seaOk = i => w.terr[i] <= TERR.SHALLOW;
  for (const T of TRIGGERS) if (!D.trig[T.tech] && w.has(T.tech)) {
    D.trig[T.tech] = w.day; let n = 0; for (let k = 0; k < T.n; k++) if (newSite(w, T.kind, SITE_KINDS[T.kind].sea ? seaOk : landOk, 20, 100, { prize: T.prize, lore: T.lore, risk: T.risk })) n++;
    if (n) w.emit('rumour', T.text, { tech: T.tech });
  }
  /* a dry summer uncovers something now and then (at most once in four years) */
  if (w.drought && w.day - (D.lastLow || -999) > 128 && discHash(w, 500 + w.day) % 100 < 6) {
    D.lastLow = w.day; if (newSite(w, 'lowwater', landOk, 16, 55, { prize: 60, lore: false, risk: 0.04 })) w.emit('rumour', 'The dry summer has drained the river-pools: something glints in the mud.', { event: 'drought' });
  }
}

/* ----- v0.28.1: what a generated world is good for (shown in the new-world dialog) ----- */
function worldTraits(w) {
  const { W, H } = CFG, N = W * H, T = [], reg = landRegions(w), home = reg.label[w.cy * W + w.cx];
  let land = 0, homeSize = 0, shal = 0, rock = 0; const big = {};
  for (let i = 0; i < N; i++) { const t = w.terr[i]; if (t > TERR.SHALLOW) { land++; if (reg.label[i] === home) homeSize++; else if (reg.label[i] > 0) big[reg.label[i]] = (big[reg.label[i]] || 0) + 1 } }
  for (let y = Math.max(1, w.cy - 40); y < Math.min(H - 1, w.cy + 40); y++) for (let x = Math.max(1, w.cx - 40); x < Math.min(W - 1, w.cx + 40); x++) { const t = w.terr[y * W + x]; if (t === TERR.SHALLOW) shal++; else if (t === TERR.ROCK) rock++ }
  const isl = Object.values(big).filter(n => n >= 150).length, ns = (w.neigh || []).filter(n => n.found !== false);
  T.push(['Land', `${Math.round(100 * land / N)}% of the map; the home land is ${homeSize > 9000 ? 'large' : homeSize > 4000 ? 'medium' : 'small'}${isl ? `, with ${isl} other ${isl === 1 ? 'landmass' : 'landmasses'}` : ''}`]);
  T.push(['Fishing', shal > 1800 ? 'rich shallows near home' : shal > 600 ? 'some shallows near home' : 'little shallow water: fish are scarce']);
  T.push(['Stone', rock > 900 ? 'plenty of rock near home' : rock > 250 ? 'some rock near home' : 'little bare rock']);
  const by = { land: 0, sea: 0 }; for (const n of ns) by[n.reach === 'land' ? 'land' : 'sea']++;
  T.push(['Neighbours', `${ns.length} peoples: ${by.land} by land, ${by.sea} across water`]);
  /* barges: a land neighbour with water within reach of it that connects to the water near home */
  const water = i => w.terr[i] <= TERR.SHALLOW, seen = new Uint8Array(N), q = []; let barge = 0;
  for (let y = Math.max(2, w.cy - 14); y < Math.min(H - 2, w.cy + 14); y++) for (let x = Math.max(2, w.cx - 14); x < Math.min(W - 2, w.cx + 14); x++) { const i = y * W + x; if (water(i)) { seen[i] = 1; q.push(i) } }
  for (let h = 0; h < q.length; h++) { const u = q[h], x = u % W, y = (u / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue; const v = ny * W + nx; if (!seen[v] && water(v)) { seen[v] = 1; q.push(v) } } }
  for (const n of ns) if (n.reach === 'land') { let f = false; for (let y = Math.floor(n.y - n.r - 5); y <= n.y + n.r + 5 && !f; y++) for (let x = Math.floor(n.x - n.r - 5); x <= n.x + n.r + 5; x++) { const i = y * W + x; if (i > 0 && i < N && seen[i] && Math.hypot(x - n.x, y - n.y) <= n.r + 5) { f = true; break } } if (f) barge++ }
  T.push(['Barges', barge ? `${barge} walkable neighbour${barge > 1 ? 's' : ''} also reachable by water: river barges are possible` : 'no neighbour reachable by river: barges are unlikely']);
  const D = w.disc; if (D && !D.gen) { D.gen = true; genSites(w) }
  if (D) { const land = D.sites.filter(s => !SITE_KINDS[s.kind].sea).length, sea = D.sites.length - land, dep = D.sites.filter(s => s.mat).map(s => s.mat); T.push(['Hidden places', `${land} on land, ${sea} at sea`]); T.push(['Deposits', dep.length ? [...new Set(dep)].join(', ') + ' (find them to unlock later technologies)' : 'none seeded: later materials only by trade']) }
  return T;
}
