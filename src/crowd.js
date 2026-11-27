/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
/* ===== crowd.js: the town beyond the villagers in play (v0.34) =====
   Up to CROWD.focus villagers are full agents (they walk, work, talk and have stories). Everybody else is the crowd: a few
   counts (children, adults, elders) that are born, grow up, work, eat and die once a day. w.pop is the sum, and every rule
   that asks how big the town is (housing, food, research, councils, neighbours) now asks w.pop.
   While the town is smaller than the focus size nothing here runs, so small towns play exactly as before.
   The crowd never uses w.r(): it has its own per-day stream, like war.js and culture.js.
   Villagers leave the focus quietly (no death, no grief) when the town outgrows it, and come forward from the crowd
   when the focus thins out, so a family line can pass from the crowd back into the story. */
const CROWD = { focus: 160, hyst: 6, maxMove: 12, draw: 0.012 };       // draw: share of the empty beds that newcomers fill each day at full prospects
const crowdR = (w, salt) => { let h = (w.seed ^ 0x3C0D1D07 ^ Math.imul(w.day + 1, 0x9E3779B1) ^ Math.imul((salt | 0) + 11, 0x85EBCA6B)) | 0; h = Math.imul(h ^ h >>> 16, 0x45D9F3B); h = Math.imul(h ^ h >>> 16, 0x45D9F3B); const r = mulberry32((h ^ h >>> 16) >>> 0); r(); r(); return r };
const crowdState = w => w.crowd || (w.crowd = { n: 0, kids: 0, adults: 0, elders: 0, acc: {}, made: { food: 0, wood: 0, stone: 0 }, eaten: 0, born: 0, died: 0, demoted: 0, promoted: 0, hungry: 0, workers: { food: 0, wood: 0, stone: 0, serve: 0 } });
const crowdSize = w => (w.crowd ? w.crowd.n : 0);
const focusSize = () => CROWD.focus;

/* how much a villager matters to the story: the least notable leave the focus first */
function notability(w, v) {
  let s = Math.min(40, v.bio.length * 2) + (v.partner != null ? 10 : 0) + v.kids.length * 3 + (v.role ? 5 : 0) + (v.hobby ? 2 : 0) - (v.isChild() ? 6 : 0) - (v.isElder() ? 10 : 0);
  if (w.keepId != null && v.id === w.keepId) s += 1e6;
  if (v.trade && v.trade !== 'none') s += 4;
  return s;
}
const busy = (w, v) => ['voyage', 'expedition', 'escort', 'fight', 'flee', 'fire', 'trade'].includes(v.jobKind) || (w.war && w.war.away && w.war.away[v.id]) || (w.disc && w.disc.exped.some(e => e.state === 'running' && e.party && e.party.includes && e.party.includes(v.id)));

function demote(w, v) {
  const C = crowdState(w), cls = v.isChild() ? 'kids' : v.isElder() ? 'elders' : 'adults';
  v.alive = false; v.endJob(); const i = w.vills.indexOf(v); if (i >= 0) w.vills.splice(i, 1);
  for (const h of w.houses()) { const k = h.occ.indexOf(v.id); if (k >= 0) h.occ.splice(k, 1) }
  for (const b of w.buildings.values()) if (b.owner === v.id) b.owner = null;
  if (v.partner != null) { const p = w.vills.find(x => x.id === v.partner); if (p) p.partner = null }
  C[cls]++; C.n++; C.demoted++;
}
function promote(w, C, salt) {
  if (C.adults <= 0) return false;
  const r = crowdR(w, 500 + salt), hs = w.houses(), h = hs.length ? hs[(r() * hs.length) | 0] : null;
  const age = CFG.ADULT_DAYS + r() * (CFG.ELDER_DAYS * (w.lifeScale || 1) - CFG.ADULT_DAYS) * 0.7;
  const v = new Villager(w, r() < 0.5 ? 'f' : 'm', age, h ? h.x + 1 : w.cx, h ? h.y + 2 : w.cy);
  v.hunger = 85; v.story('Came forward from the crowd of the town.'); w.vills.push(v);
  C.adults--; C.n--; C.promoted++; return true;
}
function rebalanceFocus(w) {
  const C = w.crowd, over = w.vills.length - CROWD.focus;
  if (over > CROWD.hyst) {
    const cand = w.vills.filter(v => v.alive && !busy(w, v)).map(v => [notability(w, v), v.id, v]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (let k = 0; k < Math.min(over, CROWD.maxMove, cand.length); k++) demote(w, cand[k][2]);
  } else if (C && over < -CROWD.hyst) {
    for (let k = 0; k < Math.min(2, -over); k++) if (!promote(w, C, k)) break;
  }
}

/* births, growing up, old age and the rest, as daily flows with the remainders carried over */
function flow(C, key, x) { const a = C.acc[key] = (C.acc[key] || 0) + x, n = Math.floor(a); C.acc[key] = a - n; return n }
function crowdPeople(w, C) {
  // the crowd has children at the pace the villagers in play show: births per fertile adult per day, smoothed over about ten days
  const fert = w.vills.filter(v => v.isAdult() && v.age <= CFG.FERTILE_MAX * (w.lifeScale || 1)).length, ab = w.abirths || 0, db = ab - (C.seenB || 0); C.seenB = ab; C.rate = (C.rate || 0.011) * 0.9 + (db / Math.max(4, fert)) * 0.1;
  const ls = (w.lifeScale || 1) * CFG.LIFE_BASE, gp = w.gov && w.gov.policy ? w.gov.policy.growth : 0, pop = w.pop;
  // growing up and growing old
  const up = Math.min(C.kids, flow(C, 'up', C.kids / (CFG.ADULT_DAYS * ls)));
  const old = Math.min(C.adults, flow(C, 'old', C.adults / ((CFG.ELDER_DAYS - CFG.ADULT_DAYS) * ls)));
  C.kids -= up; C.adults += up - old; C.elders += old;
  // deaths: old age, ordinary sickness and accidents, and hunger when the stores are bare
  const hungry = w.stock.food <= 0 ? 1 : 0, dE = Math.min(C.elders, flow(C, 'de', C.elders / (45 * ls))), dA = Math.min(C.adults, flow(C, 'da', C.adults * 0.0012 + hungry * C.adults * 0.03)), dK = Math.min(C.kids, flow(C, 'dk', C.kids * (0.0015 + CFG.CHILD_MORT * Math.max(0.15, 1 - Math.min(0.7, techFx(w, 'health')) - (w.has('medicine') ? 0.2 : 0))) + hungry * C.kids * 0.04));
  C.elders -= dE; C.adults -= dA; C.kids -= dK;
  const dead = dE + dA + dK; C.died += dead; w.deaths += dead; if (dead) { noteFlow(w, 'died', dead); statCount(w, 'died', dead); if (dE) statCount(w, 'died_age', dE); if (dA + dK) statCount(w, hungry ? 'died_hunger' : 'died_fever', dA + dK) }
  const Y = (w.dyr[w.year] = w.dyr[w.year] || {});
  const mark = (k, g, n) => { if (!n) return; w.causes[k] = (w.causes[k] || 0) + n; const dk = deathKey(k); Y[dk] = (Y[dk] || 0) + n; Y[g] = (Y[g] || 0) + n };
  mark('passed away peacefully of old age', 'elder', dE); mark(hungry ? 'starved' : 'succumbed to the fever', 'adult', dA); mark(hungry ? 'starved' : 'succumbed to the fever', 'child', dK);
  // births: the same gates as the village (bread on the table, a bed to put the cradle in), at the rate the village itself shows
  let born = 0;
  if (pop + 1 <= w.beds() && w.stock.food >= pop * 3.5 * (1 - 0.25 * gp) * (w.settings.survival ? 1.3 : 1)) {
    born = Math.min(flow(C, 'born', (C.adults + 0.1 * C.elders) * (C.rate || 0.011) * (w.order || 1)), Math.max(0, w.beds() - pop));
  }
  // newcomers: a town with empty homes, full larders and good prospects draws people from the countryside, as real cities always grew (births alone only replace the dead)
  const spare = Math.max(0, w.beds() - pop), prosp = w.prosp == null ? 1 : w.prosp;
  const pull = clamp((prosp - 0.7) * 1.4, 0, 1.2) * (w.stock.food > pop * 4 ? 1 : w.stock.food > pop * 2 ? 0.4 : 0) * hardOf(w).imm * (gp > -0.75 ? 1 + 0.8 * gp : 0) * (w.settings.survival ? 0.5 : 1) * (projBuilt(w, 'monument') ? 1.35 : 1);
  const arrive = Math.min(spare, flow(C, 'arr', spare * CFG.CROWD_DRAW * pull)), arrAd = Math.round(arrive * 0.8);
  if (arrive) { C.adults += arrAd; C.kids += arrive - arrAd; C.arrived = (C.arrived || 0) + arrive; noteFlow(w, 'arrived', arrive); statCount(w, 'arrivals', arrive) }
  C.kids += born; C.born += born; w.births += born; if (born) { noteFlow(w, 'born', born); statCount(w, 'born', born) }
  C.n = C.kids + C.adults + C.elders;
}

/* the crowd works where the town's need is greatest (economy.js says what that work yields) */
function crowdWork(w, C) {
  const s = w.season, winter = s === 3, pop = w.pop, hands = C.adults * 0.62 + C.elders * 0.12, eat = crowdEat(C);
  const { tgt } = resourceTargets(w), sh = w.play && w.play.share, fields = crowdFields(w), perF = ECON.fph * fieldMean(w);
  const Rw = gatherReach(w, 'wood'), Rs = gatherReach(w, 'stone'), pw = handYield(w, 'wood', Rw), ps = handYield(w, 'stone', Rs);
  // what the town needs each day, in hands
  const needF = eat * 1.05 + Math.max(0, tgt.food - w.stock.food) / 16, needW = winterWood(w) / 4 + Math.max(0, tgt.wood - w.stock.wood) / 12 + pop * 0.03, needS = Math.max(0, tgt.stone - w.stock.stone) / 12 + pop * 0.012;
  const fCap = fields / ECON.fph, FR = fishReach(w), pfh = fishHand(w, FR), avail = hands * 0.9;
  // the sea: fishers supply a share of the food where there is water to fish, and everything the fields cannot give
  const landShort = w.noFarmRoom != null && w.day - w.noFarmRoom < 40;       // no ground left for another field: then the sea feeds what the fields cannot
  let hfi = 0;
  if (pfh > 0 && FR.cap > 0) hfi = Math.min(FR.cap, avail * 0.6, fishAllow(w, FR) / Math.max(0.1, fishTrips(w, FR)), Math.max(FISH.share * needF, landShort ? needF - fCap * perF : 0) / pfh);
  if (sh) hfi = Math.min(hfi, hands * sh.food);
  let hf = Math.min(Math.max(0, needF - hfi * pfh) / Math.max(0.1, perF), fCap), hw = pw > 0 ? needW / pw : 0, hs = ps > 0 ? needS / ps : 0;
  const rest = Math.max(0, avail - hf - hfi), wsum = hw + hs; if (hf + hfi > avail) hf = Math.max(0, avail - hfi); if (wsum > rest) { const k = wsum > 0 ? rest / wsum : 0; hw *= k; hs *= k }
  if (sh) { hf = Math.min(Math.max(0, hands * sh.food - hfi), fCap); hw = hands * sh.wood; hs = hands * sh.stone }
  const dh = districtHands(w), dF = dh.food + dh.wood + dh.stone, ordered = (k, base, cap) => dF > 0 ? Math.min(cap, base * (1 - dF) + hands * dh[k] * 0.85) : base;       // a group order sends a district's hands to one job
  hf = ordered('food', hf, fCap); hw = ordered('wood', hw, 1e9); hs = ordered('stone', hs, 1e9);
  const serve = Math.max(0, hands - hf - hfi - hw - hs);
  const caught = crowdFish(w, hfi * fishTrips(w, FR)), madeFish = caught * fishLoad(w), madeF = Math.min(hf * ECON.fph, fields) * fieldDay(w) + madeFish, madeW = hw * pw * (winter ? 0.85 : 1), madeS = hs * ps;
  const fw = crowdFell(w, 'wood', madeW, Rw, 1), fs = crowdFell(w, 'stone', madeS, Rs, 2);             // only what the trees and rock can give is made
  const made = { food: madeF, wood: fw, stone: fs };
  for (const k of ['food', 'wood', 'stone']) { w.stock[k] = Math.min(w.stock[k] + made[k], w.capOf(k) + 40); C.made[k] += made[k] }
  C.eaten += eat; C.fishAvg = (C.fishAvg || 0) * 0.9 + madeFish * 0.1; C.fished = (C.fished || 0) + caught; if (caught) statCount(w, 'fish_crowd', caught);
  C.workers = { fish: Math.round(hfi), food: Math.round(hf), wood: Math.round(hw), stone: Math.round(hs), serve: Math.round(serve) };
  C.hungry = w.stock.food < eat ? C.hungry + 1 : 0; w.stock.food = Math.max(0, w.stock.food - eat);
  if (winter) w.stock.wood = Math.max(0, w.stock.wood - C.n * 0.05);
  if (w.econ && w.has('coinage')) w.econ.treasury += serve * 0.03;
}

function crowdDay(w) {
  if (!w.crowd && w.vills.length <= CROWD.focus + CROWD.hyst) return;
  rebalanceFocus(w);
  const C = w.crowd; if (!C || C.n <= 0) return;
  districtsDay(w); crowdPeople(w, C); crowdWork(w, C);
}
