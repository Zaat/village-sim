'use strict';
/* ==========================================================================
   diplomacy.js — living with the neighbours. Once an island is found, the
   council decides how to greet it. Relations (-100 .. 100) then drift with how
   the village behaves: gifts, aid, trade and open policies warm them; weakness
   and refusals chill them. Friendly neighbours visit by ship to trade, teach,
   bring settlers and send help; proud ones demand tribute, and, if the
   village allows it in Settings, raid. Every choice goes to the council
   (Claude counsel may deliberate); the rules decide otherwise.
   ========================================================================== */
const NEIGH_PROFILE = {
  traders: { temper: 0.2, base: 15, goods: 'fine goods and fair prices', mods: { buy: { wood: 0.9, stone: 0.9, food: 0.9 }, sell: { wood: 1.12, stone: 1.12, food: 1.12 } }, knows: ['trade', 'coinage', 'seatrade', 'boats'] },
  farmers: { temper: 0.1, base: 20, goods: 'cheap grain and fruit', mods: { buy: { food: 0.55, wood: 1.05, stone: 1.05 }, sell: { wood: 1.2, stone: 1.2, food: 1 } }, knows: ['rotation', 'granary', 'plow', 'medicine'] },
  scholars: { temper: 0.15, base: 10, goods: 'learning and new ideas', mods: { buy: { wood: 1, stone: 0.95, food: 1.05 }, sell: { wood: 1, stone: 1.1, food: 1 } }, knows: null },
  raiders: { temper: 0.75, base: -12, goods: 'protection (for a price) and ironwork', mods: { buy: { wood: 1.15, stone: 1.1, food: 1.2 }, sell: { wood: 1.05, stone: 1.05, food: 1.05 } }, knows: ['ironwork', 'watchtowers', 'tools'] }
};
const PACT_NAMES = ['no treaty', 'trade pact', 'friendship'];
const relLabel = r => r >= 70 ? 'devoted' : r >= 40 ? 'friendly' : r >= 12 ? 'warm' : r > -12 ? 'wary' : r > -40 ? 'cold' : 'hostile';

/* give a freshly generated (or loaded, older) neighbour its living state */
function initNeighbour(w, n, R) {
  const P = NEIGH_PROFILE[n.kind]; R = R || (() => w.r());
  if (n.rel !== undefined) return;
  n.temper = clamp(P.temper + (R() - 0.5) * 0.2, 0.05, 0.95); n.rel = Math.round(P.base + (R() * 16 - 8)); n.met = !!n.found; n.pact = 0; n.strength = Math.round(n.pop * (0.4 + n.temper));
  n.nextVisit = 0; n.nextAid = 0; n.nextTreaty = 0; n.nextLeader = 120 + ((R() * 100) | 0); n.raidCd = 0; n.nextDemand = 0; n.owes = 0; n.tribute = 0; n.tradeCount = 0; n.gifts = 0; n.raids = 0; n.taught = []; n.aidCd = 0; n.crisis = 0; n.hist = [];
  const ids = Object.keys(TECHS);
  if (P.knows) n.knows = P.knows.filter(id => TECHS[id]); else { n.knows = []; for (let g = 0; g < 60 && n.knows.length < 9; g++) { const id = ids[(R() * ids.length) | 0]; if (!n.knows.includes(id)) n.knows.push(id) } }
}
function dlog(w, n, text, kind) {
  n.hist.unshift(`D${w.day}: ${text}`); if (n.hist.length > 5) n.hist.pop();
  if (['contact', 'treaty', 'raid', 'leader', 'teach', 'migrants', 'tribute', 'aid'].includes(kind)) w.emit('diplomacy', text, { n, kind }); else w.say(text);      // routine visits go in the log, milestones in the chronicle
}
function ask(w, req, rulesApply) {
  if (!w.gov.council.length) return req.apply(req.default, [], '', 'rules');
  deliberate(w, { ...councilBase(w), ...req });
}
const avgTrait = (w, t) => { const ms = councilMembers(w); return ms.length ? ms.reduce((s, m) => s + m.v.trait[t], 0) / ms.length : 0.5 };
const give = (w, k, n) => { const x = Math.min(n, Math.max(0, w.stock[k])); w.stock[k] -= x; return x };
const neighName = n => n.name;

/* ----- how strong is the village if it is attacked? ----- */
function defenseScore(w) {
  const ad = adultsOf(w), brave = ad.filter(v => v.trait.brave > 0.55 && v.age < 60 && !v.isElder()).length, friendRaiders = w.neigh && w.neigh.some(n => n.kind === 'raiders' && n.pact === 2);
  return 1 + 2 * Math.max(0, w.gov.policy.defense) + (projBuilt(w, 'bastion') ? 2 : 0) + (w.has('watchtowers') ? 1 : 0) + (w.has('ironwork') ? 1 : 0) + 1.5 * lesson(w, 'raids') + Math.min(3, brave / 6) + (w.fortifyUntil > w.day ? 1.5 : 0) + (friendRaiders ? 1.5 : 0) + (w.rx ? w.rx.def : 0);
}

/* ----- first contact ----- */
function contactNeighbour(w, n) {
  initNeighbour(w, n); n.met = true; n.nextVisit = w.day + 5 + ((w.r() * 6) | 0); n.nextAid = w.day + 25 + ((w.r() * 30) | 0); n.nextTreaty = w.day + 8;
  const stockOK = w.stock.food >= 30 && w.stock.wood >= 25, warm = avgTrait(w, 'kind') + avgTrait(w, 'soc'), wary = avgTrait(w, 'brave') < 0.45 && n.kind === 'raiders';
  const options = [{ id: 'gift', text: `Send a gift of food and firewood to ${n.name}, to win their goodwill (about 15 food and 12 firewood)` }, { id: 'greet', text: `Send only greetings and an offer of friendship to ${n.name}` }, { id: 'wait', text: `Say nothing yet and watch ${n.name} from a distance` }];
  const def = stockOK && (warm > 1.0 || wary) ? 'gift' : 'greet';
  ask(w, { kind: 'diplomacy', topic: `Sailors have returned from ${n.name}, a settlement of ${NEIGH_KINDS[n.kind].label}. ${NEIGH_KINDS[n.kind].blurb} The village has no relationship with them yet. How should the council introduce itself?`, options, default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'gift' && stockOK) { give(w, 'food', 15); give(w, 'wood', 12); n.rel += n.kind === 'raiders' ? 12 : 18; n.gifts++; n.owes++ ; recordDecision(w, `to greet ${n.name} with a gift of food and firewood.`, sp, src) }
      else if (id === 'wait') { n.rel -= 1; recordDecision(w, `to wait and watch ${n.name} before speaking.`, sp, src) }
      else { n.rel += 6; recordDecision(w, `to send greetings and an offer of friendship to ${n.name}.`, sp, src) }
      dlog(w, n, `First contact with ${n.name}: ${relLabel(n.rel)} relations.`, 'contact'); w.gov.nextMeeting = w.day + 4;
    } });
}

/* ----- treaties ----- */
function proposeTreaty(w, n, level) {
  n.nextTreaty = w.day + 30;
  const text = level === 1 ? `a trade pact: regular visits, better prices on what they offer (${NEIGH_PROFILE[n.kind].goods}), and a welcome in our market` : `a friendship: they will come to our aid in hard times, share what they know, and settle among us, and we will do the same`;
  const open = w.gov.policy.growth, def = open > -0.5 && (level === 1 || n.rel >= 62) && !(n.kind === 'raiders' && level === 2 && avgTrait(w, 'brave') > 0.7) ? 'yes' : 'wait';
  ask(w, { kind: 'diplomacy', topic: `${n.name} (${NEIGH_KINDS[n.kind].label}, ${relLabel(n.rel)} toward us) propose ${text}.`, options: [{ id: 'yes', text: `Accept: ${text}` }, { id: 'wait', text: `Not yet: thank them and keep things as they are` }], default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'yes') { n.pact = level; n.rel += 6; recordDecision(w, `to agree a ${PACT_NAMES[level]} with ${n.name}.`, sp, src); dlog(w, n, `A ${PACT_NAMES[level]} is sealed with ${n.name}.`, 'treaty'); n.nextVisit = Math.min(n.nextVisit, w.day + 3) }
      else { n.rel -= 2; recordDecision(w, `to postpone a ${PACT_NAMES[level]} with ${n.name}.`, sp, src) }
      w.gov.nextMeeting = w.day + 4;
    } });
}

/* ----- a neighbour in need ----- */
function aidRequest(w, n) {
  n.nextAid = w.day + 45 + ((w.r() * 50) | 0); n.crisis = w.day + 20;
  const need = { food: Math.round(15 + w.vills.length * 0.4), wood: 12 }, can = w.stock.food >= need.food * 2.2 && w.stock.wood >= need.wood * 2;
  const warm = avgTrait(w, 'kind'), def = can && (warm > 0.45 || n.rel > 25) ? 'aid' : 'refuse';
  const why = n.kind === 'farmers' ? 'a blight has taken their harvest' : n.kind === 'raiders' ? 'a hard winter has thinned their stores' : n.kind === 'scholars' ? 'fire has destroyed their library and workshops' : 'a storm has wrecked their harbor and warehouses';
  ask(w, { kind: 'diplomacy', topic: `Envoys from ${n.name} ask for help: ${why}. They beg ${need.food} food and ${need.wood} firewood. The village holds ${w.stock.food} food and ${w.stock.wood} firewood. Will the council send aid?`,
    options: [{ id: 'aid', text: `Send ${need.food} food and ${need.wood} firewood to ${n.name}` }, { id: 'refuse', text: 'Refuse: the village must look after its own first' }], default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'aid' && w.stock.food >= need.food && w.stock.wood >= need.wood) { give(w, 'food', need.food); give(w, 'wood', need.wood); n.rel += 24; n.owes++; n.gifts++; n.pop += 2; recordDecision(w, `to send aid to ${n.name}.`, sp, src); dlog(w, n, `Aid sent to ${n.name}; they will not forget it.`, 'aid'); for (const v of w.vills) if (v.isAdult() && v.trait.kind > 0.6) v.mood = Math.min(100, v.mood + 2) }
      else { n.rel -= 12; n.grudge = (n.grudge || 0) + 0.15; recordDecision(w, `to refuse the request for aid from ${n.name}.`, sp, src); dlog(w, n, `${n.name}'s plea for help was refused. They were not pleased.`, 'aid') }
      w.gov.nextMeeting = w.day + 4;
    } });
}

/* ----- visits by ship ----- */
const byLand = n => n.reach === 'land';
function startVisit(w, n, type, days) { w.visit = { n: n.id, type, until: w.day + (days || 2) } }
function tradeVisit(w, n) {
  const E = w.econ; if (E.caravan) return false;
  E.caravan = { name: byLand(n) ? `the wagons of ${n.name}` : `the ships of ${n.name}`, sea: !byLand(n), arrived: w.day, leaves: w.day + 3, cap: 70 + 25 * n.pact, done: false, from: n.id };
  dlog(w, n, byLand(n) ? `Wagons from ${n.name} (${NEIGH_KINDS[n.kind].label}) roll in to trade.` : `Ships from ${n.name} (${NEIGH_KINDS[n.kind].label}) drop anchor to trade.`, 'trade');
  if (money(w)) E.treasury += 4;
  negotiate(w); return true;
}
function envoyVisit(w, n) {
  startVisit(w, n, 'envoy', 2); const gift = n.kind === 'farmers' ? ['food', 12] : n.kind === 'traders' ? ['wood', 10] : n.kind === 'raiders' ? ['stone', 6] : ['food', 6];
  w.stock[gift[0]] = Math.min(w.cap(), w.stock[gift[0]] + gift[1]); n.rel += 2.5;
  dlog(w, n, `An envoy from ${n.name} arrives with greetings and a gift of ${gift[1]} ${gift[0]}.`, 'envoy');
}
function migrantVisit(w, n) {
  const free = w.beds() - w.vills.length; if (free < 2) return false; const dock = byLand(n) ? ringSpot(w, 22, 30) : w.of('dock')[0]; if (!dock) return false;
  startVisit(w, n, 'migrants', 2); const k = Math.min(free, 2 + ((w.r() * 3) | 0)), names = [];
  for (let i = 0; i < k; i++) { const v = new Villager(w, w.r() < 0.5 ? 'f' : 'm', 14 + w.r() * 22, dock.x, dock.y); v.hunger = 85; v.story(`${byLand(n) ? 'Walked' : 'Sailed'} from ${n.name} to make a new home here.`); w.vills.push(v); names.push(v.name) }
  n.pop = Math.max(6, n.pop - k); n.rel += 2; noteFlow(w, 'arrived', k);
  dlog(w, n, `${names.join(', ')} ${byLand(n) ? 'walk' : 'sail'} from ${n.name} to settle here.`, 'migrants'); return true;
}
function teachVisit(w, n) {
  const avail = techAvailable(w).filter(id => n.knows.includes(id)).sort((a, b) => TECHS[a].cost - TECHS[b].cost); if (!avail.length) return false;
  if (w.stock.food < 25 || w.stock.wood < 15) return false;
  startVisit(w, n, 'teach', 3); const id = avail[0], T = TECHS[id], t = w.tech; give(w, 'food', 20); give(w, 'wood', 10);
  if (T.tier <= 2) { const f0 = t.focus, p0 = t.points; t.focus = id; t.points = T.cost + p0; discover(w); t.focus = f0 === id ? null : f0; t.points = p0 }
  else { t.points += T.cost * 0.6 }
  n.taught.push(id); n.rel += 3;
  dlog(w, n, `Scholars from ${n.name} share their knowledge of ${T.name.toLowerCase()}${T.tier <= 2 ? '' : ' (a long step closer)'}, in return for food and firewood.`, 'teach'); return true;
}

/* ----- tribute demands and raids ----- */
function demandTribute(w, n) {
  n.nextDemand = w.day + 20 + ((w.r() * 15) | 0); startVisit(w, n, 'demand', 2);
  const pay = { food: Math.min(Math.round(w.stock.food * 0.2), 50), wood: Math.min(Math.round(w.stock.wood * 0.15), 30), stone: Math.min(Math.round(w.stock.stone * 0.15), 20) }, strong = defenseScore(w), brave = avgTrait(w, 'brave');
  const def = strong < 3 ? 'pay' : brave > 0.5 ? 'refuse' : 'parley';
  ask(w, { kind: 'diplomacy', topic: `A longship from ${n.name} has landed envoys who demand tribute: ${pay.food} food, ${pay.wood} firewood and ${pay.stone} stone, or there will be trouble. The village's defences are ${strong < 2.5 ? 'weak' : strong < 4.5 ? 'fair' : 'strong'}. What does the council answer?`,
    options: [{ id: 'pay', text: `Pay the tribute (${pay.food} food, ${pay.wood} firewood, ${pay.stone} stone) and keep the peace for a while` }, { id: 'parley', text: 'Offer a smaller gift and talk of friendship instead' }, { id: 'refuse', text: 'Refuse: send them away empty-handed' }], default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'pay') { for (const k of ['food', 'wood', 'stone']) give(w, k, pay[k]); n.tribute = w.day + 24; n.rel += 14; recordDecision(w, `to pay tribute to ${n.name} for peace.`, sp, src); dlog(w, n, `Tribute paid to ${n.name}. Their ships sail away satisfied, for now.`, 'tribute') }
      else if (id === 'parley') {
        give(w, 'food', 12); give(w, 'wood', 8); const ok = w.r() < 0.35 + 0.35 * (n.rel + 100) / 200 - 0.2 * n.temper;
        if (ok) { n.rel += 12; n.tribute = w.day + 14; dlog(w, n, `A small gift and fair words soothe ${n.name}'s envoys.`, 'tribute') } else { n.rel -= 4; n.raidCd = Math.min(n.raidCd, w.day + 8); dlog(w, n, `${n.name}'s envoys scorn the small gift and leave in anger.`, 'tribute') }
        recordDecision(w, `to answer ${n.name}'s demand with a gift and fair words.`, sp, src)
      } else { n.rel -= 10; n.grudge = (n.grudge || 0) + 0.25; n.raidCd = Math.min(n.raidCd, w.day + 6); recordDecision(w, `to refuse ${n.name}'s demand for tribute.`, sp, src); dlog(w, n, `${n.name}'s envoys are sent away with nothing, and swear they will be back.`, 'tribute') }
      w.gov.nextMeeting = w.day + 4;
    } });
}
function raidVisit(w, n) {
  n.raids++; n.raidCd = w.day + 22 + ((w.r() * 18) | 0); startVisit(w, n, 'raid', 2);
  const attackers = 2 + Math.floor(n.strength / 10) + (n.grudge > 0.3 ? 1 : 0), D = defenseScore(w), ratio = attackers * 1.1 / D, dock = w.of('dock')[0];
  let outcome = ratio < 0.75 ? 'repelled' : ratio < 1.4 ? 'partial' : 'heavy', text;
  if (outcome === 'repelled') {
    n.rel -= 8; n.strength = Math.max(8, n.strength - 3); text = byLand(n) ? `Raiders from ${n.name} march on the village, but the watch drives them off!` : `Raiders from ${n.name} land at the dock, but the watch drives them off!`;
    for (const v of w.vills) if (v.isAdult() && v.trait.brave > 0.55) { v.mood = Math.min(100, v.mood + 4); v.reputation = Math.min(100, (v.reputation || 50) + 2) }
  } else {
    const f = outcome === 'partial' ? 0.2 + 0.15 * w.r() : 0.4 + 0.2 * w.r(), lost = {}; for (const k of ['food', 'wood', 'stone']) { lost[k] = Math.round(w.stock[k] * f); w.stock[k] -= lost[k] }
    const dead = outcome === 'heavy' ? 1 + (w.r() < 0.5 ? 1 : 0) : w.r() < 0.35 ? 1 : 0; let victims = [];
    const fighters = w.vills.filter(v => v.isAdult() && !v.isElder()).sort((a, b) => b.trait.brave - a.trait.brave).slice(0, 4 + dead);
    for (let i = 0; i < dead && i < fighters.length; i++) { const v = fighters[(w.r() * fighters.length) | 0]; if (v && !victims.includes(v)) { v.health = 0; v.cause = 'raid'; victims.push(v) } }
    for (const v of w.vills) v.mood = Math.max(0, v.mood - (outcome === 'heavy' ? 14 : 8));
    let burned = ''; if (outcome === 'heavy' && w.r() < 0.6) { const hs = w.houses(); if (hs.length > 2) { const b = hs[(w.r() * hs.length) | 0]; const gone = damageBuilding(w, b, baseHp(b) * (0.9 + 0.5 * w.r()), 'raiders'); burned = gone ? ' A house was set ablaze and burned down.' : ' A house was set ablaze, but the fire was beaten out.' } }
    n.rel -= 4; n.strength += 2;
    text = `Raiders from ${n.name} ${outcome === 'heavy' ? 'storm ashore and plunder the village' : 'land and carry off loot'}: ${lost.food} food, ${lost.wood} firewood and ${lost.stone} stone taken.${victims.length ? ' ' + victims.map(v => v.name).join(', ') + (victims.length > 1 ? ' fall' : ' falls') + ' defending the village.' : ''}${burned}`;
  }
  learn(w, 'raids', outcome === 'repelled' ? 0.12 : 0.3); for (const v of w.vills) if (v.isAdult()) experience(v, 'raid', outcome === 'repelled' ? 0.3 : 0.7); dlog(w, n, text, 'raid');
  if (dock && outcome !== 'repelled') w.scars.push({ x: dock.x - 1, y: dock.y - 1, w: 2, h: 2, until: w.tick + CFG.TPD * 4 });
  respondToRaid(w, n, outcome);
}
function respondToRaid(w, n, outcome) {
  const def = outcome === 'repelled' ? 'fortify' : avgTrait(w, 'brave') > 0.5 ? 'fortify' : 'parley';
  ask(w, { kind: 'diplomacy', topic: `${outcome === 'repelled' ? 'The raid on the dock was beaten back' : 'The raid has left the village hurt'}. Raiders from ${n.name} will come again. How should the council respond?`,
    options: [{ id: 'fortify', text: 'Fortify: raise a stronger watch and man the dock day and night (defence up for a season)' }, { id: 'parley', text: `Send envoys to ${n.name} with a gift to seek peace` }, { id: 'tribute', text: `Offer ${n.name} a standing tribute to be left alone` }, { id: 'ignore', text: 'Do nothing special' }], default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'fortify') { w.fortifyUntil = w.day + 32; w.gov.policy.defense = Math.max(w.gov.policy.defense, 0.5); recordDecision(w, `to fortify the village against the raiders of ${n.name}.`, sp, src) }
      else if (id === 'parley') { give(w, 'food', 15); give(w, 'wood', 10); n.rel += w.r() < 0.5 ? 14 : 5; recordDecision(w, `to send envoys with gifts to ${n.name}.`, sp, src) }
      else if (id === 'tribute') { n.tribute = w.day + 40; n.rel += 16; recordDecision(w, `to offer ${n.name} a standing tribute for peace.`, sp, src) }
      else recordDecision(w, `to make no special answer to the raid by ${n.name}.`, sp, src);
      w.gov.nextMeeting = w.day + 4;
    } });
}

/* ----- what trading with a neighbour does to prices ----- */
function tradeMod(w, c, side, k) {
  if (!c || c.from === undefined || !w.neigh) return 1; const n = w.neigh.find(x => x.id === c.from); if (!n) return 1;
  const m = (NEIGH_PROFILE[n.kind].mods[side] || {})[k] || 1; return 1 + (m - 1) * (1 + 0.5 * n.pact);
}
function neighAfterTrade(w, c, d) {
  if (!c || c.from === undefined || !w.neigh) return; const n = w.neigh.find(x => x.id === c.from); if (!n) return;
  n.tradeCount++; n.rel += 2.5; n.gifts += 0;
  if (n.kind === 'scholars' && n.rel > 25) addKnowledge(w, 25 + 15 * n.pact);
  if (n.kind === 'traders' && d.luxury) n.rel += 1;
}

/* ----- the daily round ----- */
function neighbourDay(w) {
  if (!w.neigh) return;
  if (w.visit && w.day >= w.visit.until) w.visit = null;
  const docks = w.of('dock').length, E = w.econ; let busy = w.dipDay === w.day;
  for (const n of w.neigh) {
    if (!n.found && byLand(n) && w.seen && w.seen[n.y * CFG.W + n.x]) discoverNeighbour(w, n, null);
    initNeighbour(w, n); if (!n.met) continue; n.rel = clamp(n.rel, -100, 100);
    // relations drift toward what the village's behaviour deserves
    const P = NEIGH_PROFILE[n.kind], weak = clamp(1 - defenseScore(w) / 4, 0, 1);
    let target = P.base + (n.pact === 1 ? 22 : n.pact === 2 ? 36 : 0) + 12 * w.gov.policy.growth + (n.tribute > w.day ? 26 : 0) + Math.min(10, n.tradeCount * 0.7) - (n.kind === 'raiders' ? 20 * weak * (n.tribute > w.day ? 0.3 : 1) : 0) - 14 * (n.grudge || 0);
    n.rel = clamp(n.rel + (target - n.rel) * 0.02 + (w.r() - 0.5) * 0.8, -100, 100); n.grudge = Math.max(0, (n.grudge || 0) - 0.004);
    if (n.pact === 1 && n.rel < -10 || n.pact === 2 && n.rel < 20) { dlog(w, n, `The ${PACT_NAMES[n.pact]} with ${n.name} collapses as trust fades.`, 'treaty'); n.pact = 0 }
    // the neighbour has a life of its own
    n.pop = Math.max(6, Math.min(60, n.pop + (w.r() < 0.05 ? 1 : 0) - (w.r() < 0.02 ? 1 : 0))); n.strength = Math.round(n.pop * (0.4 + n.temper));
    if (w.day >= n.nextLeader) {
      n.nextLeader = w.day + 120 + ((w.r() * 100) | 0); const d = (w.r() - 0.5) * 0.45, was = n.temper; n.temper = clamp(n.temper + d, 0.05, 0.95);
      if (Math.abs(d) > 0.12) { dlog(w, n, `A new leader rises in ${n.name}, ${d > 0 ? 'prouder and more warlike' : 'more peaceable and open to friends'} than the last.`, 'leader'); n.rel += d > 0 ? -5 : 5 }
    }
    if (busy || w.visit) continue;
    // treaties, then pleas for help, then visits
    if (n.pact === 0 && n.rel >= 35 && w.day >= n.nextTreaty) { proposeTreaty(w, n, 1); busy = true; w.dipDay = w.day; continue }
    if (n.pact === 1 && n.rel >= 62 && w.day >= n.nextTreaty) { proposeTreaty(w, n, 2); busy = true; w.dipDay = w.day; continue }
    if (n.rel > -10 && w.day >= n.nextAid && w.vills.length >= 24) { aidRequest(w, n); busy = true; w.dipDay = w.day; continue }
    // a friend in need of nothing sends help when the village starves
    if ((n.pact === 2 || n.owes > 0) && n.rel > 20 && w.stock.food < w.vills.length * 1.2 && w.day >= n.aidCd) {
      n.aidCd = w.day + 30; n.owes = Math.max(0, n.owes - 1); const f = Math.min(70, Math.round(w.vills.length * 1.6)); w.stock.food = Math.min(w.cap(), w.stock.food + f); n.rel += 3; startVisit(w, n, 'aid', 2);
      dlog(w, n, `${n.name} sends ${f} food ${byLand(n) ? 'by wagon' : 'by ship'} to ease the hunger. Friends remember friends.`, 'aid'); busy = true; w.dipDay = w.day; continue
    }
    if ((!docks && !byLand(n)) || w.day < n.nextVisit || (w.season === 3 && w.r() < 0.6)) continue;
    n.nextVisit = w.day + (n.pact === 2 ? 6 + ((w.r() * 4) | 0) : n.pact === 1 ? 8 + ((w.r() * 5) | 0) : 14 + ((w.r() * 7) | 0));
    let did = false;
    if (n.kind === 'raiders' && n.rel < -15 && n.tribute <= w.day) {
      if (w.settings.raids && w.day >= n.raidCd && (n.rel < -22 || n.grudge > 0.25)) { raidVisit(w, n); did = true }
      else if (w.day >= n.nextDemand && n.rel < -15) { demandTribute(w, n); did = true }
    } else if (n.rel >= -15) {
      const roll = w.r();
      if (n.rel >= 35 && n.kind === 'scholars' && n.pact >= 1 && roll < 0.55) did = teachVisit(w, n);
      if (!did && n.rel >= 35 && roll < 0.2) did = migrantVisit(w, n);
      if (!did && n.rel >= 5 && (n.pact >= 1 || n.rel >= 25 || roll < 0.5) && roll < 0.85) did = tradeVisit(w, n);
      if (!did && (n.rel < 30 || w.r() < 0.35)) { envoyVisit(w, n); did = true }
    }
    if (did) { busy = true; w.dipDay = w.day }
  }
}
