'use strict';
/* ==========================================================================
   tech.js — knowledge, discoveries, eras and building styles.
   Villagers generate knowledge by debating, practising and teaching. The council
   chooses what to research (rules by default; Claude can deliberate); when enough
   knowledge is gathered the village makes a discovery and everything it affects
   (yields, speed, housing, architecture, boats) changes from then on.
   ========================================================================== */
const TECHS = {
  nets: { name: 'Fishing nets', tier: 1, cost: 100, req: [], desc: 'Woven nets: every catch is larger.' },
  tools: { name: 'Better tools', tier: 1, cost: 100, req: [], desc: 'Hardened axes and picks: work goes about 10% faster.' },
  granary: { name: 'Granaries', tier: 1, cost: 110, req: [], desc: 'Raised, ventilated stores: each storehouse holds more and food spoils less.' },
  carpentry: { name: 'Carpentry', tier: 1, cost: 120, req: [], desc: 'Joinery and framing: new cabins are timber-framed and sleep one more person; old cabins can be upgraded.' },
  forestry: { name: 'Forestry', tier: 2, cost: 240, req: ['tools'], desc: 'Organized timber work: logging camps beside the forest cut about a quarter more wood and shorten every trip.' },
  mining: { name: 'Mining', tier: 2, cost: 260, req: ['tools', 'carpentry'], desc: 'Shafts and props: mining camps by the rock yield more stone, carry bigger loads and shorten every trip.' },
  lodges: { name: 'Hunting lodges', tier: 2, cost: 240, req: ['tools'], desc: 'Smoking and drying meat: lodges near the game trails make hunts surer and shorten every trip.' },
  trade: { name: 'Trade', tier: 2, cost: 260, req: ['carpentry'], desc: 'Markets and visiting merchants: surplus goods can be swapped for what the village lacks.' },
  coinage: { name: 'Coinage', tier: 3, cost: 480, req: ['trade', 'masonry'], desc: 'Coins and a village treasury: trade earns money, the council sets taxes, and families can grow wealthy.' },
  seatrade: { name: 'Sea trade', tier: 3, cost: 520, req: ['trade', 'navigation'], desc: 'Harbor trade: merchant ships call at the docks with larger cargoes.' },
  boats: { name: 'Boat-building', tier: 2, cost: 260, req: ['nets', 'carpentry'], desc: 'Hulls and oars: docks and fishing boats can reach deep water.' },
  rotation: { name: 'Crop rotation', tier: 2, cost: 260, req: ['granary'], desc: 'Resting and alternating fields: crops yield about a quarter more.' },
  masonry: { name: 'Masonry', tier: 2, cost: 280, req: ['tools', 'carpentry'], desc: 'Cut stone: new homes are stone and sleep two more people; roads are cobbled.' },
  medicine: { name: 'Herbal medicine', tier: 2, cost: 240, req: ['granary'], desc: 'Healers and remedies: fevers and wounds are far less deadly.' },
  watchtowers: { name: 'Watchtowers', tier: 3, cost: 520, req: ['masonry'], desc: 'Lookouts see danger early: wolves are met sooner by more fighters.' },
  ironwork: { name: 'Ironwork', tier: 3, cost: 540, req: ['tools', 'masonry'], desc: 'Iron edges: work speeds up again and hunters and fighters strike truer.' },
  plow: { name: 'The heavy plow', tier: 3, cost: 520, req: ['rotation', 'ironwork'], desc: 'Deep furrows: fields yield another quarter more.' },
  navigation: { name: 'Navigation', tier: 3, cost: 500, req: ['boats'], desc: 'Stars and landmarks: boats carry bigger catches and a second boat can work each dock.' },
};
const ERAS = ['Founding Age', 'Craft Age', 'Stone & Sail Age', 'Iron Age'];
const HOUSE_STYLES = ['Log cabin', 'Timber-frame house', 'Stone house'];

function initTech(w) { w.tech = { known: {}, points: 0, focus: null, wait: 0, contrib: {}, log: [], feverSeen: 0 }; w.boats = [] }
const hasTech = (w, id) => !!w.tech.known[id];
const techEra = w => { const n = Object.keys(w.tech.known).length; return n < 3 ? 0 : n < 8 ? 1 : n < 13 ? 2 : 3 };
const styleNow = w => hasTech(w, 'masonry') ? 2 : hasTech(w, 'carpentry') ? 1 : 0;
const bedsOf = b => CFG.HOUSE_CAP + (b.style || 0);
const techAvailable = w => Object.keys(TECHS).filter(id => !w.tech.known[id] && TECHS[id].req.every(r => w.tech.known[r]));

function addKnowledge(w, pts, v) {
  if (v && v.isElder && v.isElder()) pts *= 1.3;                       // elders pass on what they know
  if (projBuilt(w, 'library')) pts *= 1.5; if (w.rx) pts *= w.rx.know;
  w.tech.points += pts; if (v) w.tech.contrib[v.id] = (w.tech.contrib[v.id] || 0) + pts;
}
/* how much does the village need this discovery right now? (rules-based default for the council) */
function techNeed(w, id) {
  const pop = w.vills.length, wolfDeaths = w.causes['was killed by a wolf'] || 0, fever = w.causes['succumbed to the fever'] || 0, food = w.stock.food / Math.max(1, pop);
  const base = { nets: (w.fishOK ? 0.6 : 0.1) + (w.neigh ? 0.3 : 0), tools: 0.8, granary: food > 7 ? 0.9 : 0.6, carpentry: 0.8, boats: (w.fishOK ? 0.9 : 0.1) + (w.neigh ? 0.35 : 0), rotation: 0.5 + Math.min(0.4, w.of('farm').length / 40), masonry: 0.7, medicine: 0.4 + Math.min(0.6, fever * 0.15), watchtowers: 0.3 + Math.min(0.6, wolfDeaths * 0.1), ironwork: 0.6, plow: 0.6, navigation: 0.4 + (w.neigh ? 0.2 : 0), forestry: 0.6 + (w.stock.wood / Math.max(1, pop) < 3 ? 0.5 : 0) + (w.stock.wood / Math.max(1, pop) < 1.5 ? 1.2 : 0), mining: 0.5 + (w.stock.stone / Math.max(1, pop) < 2 ? 0.5 : 0), lodges: 0.4 + (food < 4 ? 0.3 : 0), trade: 0.55 + (food > 6 ? 0.3 : 0), coinage: 0.5, seatrade: 0.35 + (w.of('dock').length ? 0.3 : 0) };
  return (base[id] || 0.5) + (food < 4 ? (id === 'rotation' || id === 'nets' ? 0.4 : 0) : 0) + lessonNeed(w, id) + regimeNeed(w, id);
}
function techPref(v, id) {         // each council member's taste
  const t = v.trait; return ({ nets: t.ind * 0.2, tools: t.ind * 0.4, granary: (1 - t.brave) * 0.3, carpentry: t.ind * 0.3, boats: t.cur * 0.4 + t.brave * 0.2, rotation: t.cur * 0.3, masonry: t.ind * 0.3, medicine: t.kind * 0.5, watchtowers: (1 - t.brave) * 0.4 + t.brave * 0.2, ironwork: t.ind * 0.2 + t.brave * 0.2, plow: t.ind * 0.3, navigation: t.cur * 0.5, forestry: t.ind * 0.4, mining: t.ind * 0.3 + (1 - t.soc) * 0.2, lodges: t.brave * 0.4, trade: t.soc * 0.4 + t.cur * 0.2, coinage: t.ind * 0.3 + t.cur * 0.1, seatrade: t.cur * 0.3 + t.brave * 0.3 })[id] || 0;
}
function chooseResearch(w, id, source) {
  const t = w.tech; t.focus = id; t.wait = 0;
  w.say(`The village sets its mind to ${TECHS[id].name.toLowerCase()}${source === 'claude' ? ' (council deliberated with Claude)' : ''}.`);
}
function discover(w) {
  const t = w.tech, id = t.focus, T = TECHS[id], before = techEra(w);
  const top = Object.entries(t.contrib).map(([vid, pts]) => ({ v: w.vills.find(x => x.id === +vid), pts })).filter(x => x.v).sort((a, b) => b.pts - a.pts)[0];
  t.known[id] = w.day; t.points = Math.max(0, t.points - T.cost) * 0.5; t.focus = null; t.wait = 0; t.contrib = {};
  const by = top ? top.v : null; t.log.unshift({ id, day: w.day, by: by ? by.name : null }); if (t.log.length > 20) t.log.pop();
  if (by) { by.story(`Led the village to discover ${T.name.toLowerCase()}.`); by.mood = Math.min(100, by.mood + 15); by.reputation = Math.min(100, by.reputation + 10); if (by.desire && by.desire.kind === 'know') by.debates += 3 }
  for (const v of w.vills) v.mood = Math.min(100, v.mood + 4);
  w.emit('discovery', `Discovery! ${by ? by.name + ' and the villagers' : 'The villagers'} have learned ${T.name.toLowerCase()}. ${T.desc}`, { id, by });
  if (techEra(w) > before) w.emit('era', `A new age dawns: the ${ERAS[techEra(w)]}.`, { era: techEra(w) });
  if (id === 'carpentry' || id === 'masonry') w.say(`New homes and storehouses will now be built as ${id === 'masonry' ? 'stone buildings' : 'timber-framed buildings'}; old ones can be upgraded.`);
}
function techDay(w) {
  const t = w.tech, adults = w.vills.filter(v => v.isAdult()).length; addKnowledge(w, adults * 0.06);
  const avail = techAvailable(w); if (!avail.length) return;
  if (!t.focus) {
    t.wait++;                                                           // the council normally chooses at a meeting; without one, the village drifts to the most useful idea
    if (!w.gov.council.length || t.wait >= 9) chooseResearch(w, avail.map(id => ({ id, s: techNeed(w, id) + Math.random() * 0 })).sort((a, b) => b.s - a.s)[0].id, 'rules');
  }
  if (t.focus && t.points >= TECHS[t.focus].cost) discover(w);
}
/* council agenda item: what should the village study next? */
function researchAgenda(w, base, ms) {
  const avail = techAvailable(w), g = w.gov;
  const options = avail.map(id => ({ id: 'r_' + id, text: `${TECHS[id].name} (${TECHS[id].cost} knowledge): ${TECHS[id].desc}` }));
  const rf = rulingFocus(w), score = id => techNeed(w, id) + ms.reduce((s, m) => s + techPref(m.v, id), 0) / ms.length + (rf && TECH_FOCUS[id] === rf ? 0.12 : 0);      // the ruling circle nudges the agenda
  const def = 'r_' + avail.sort((a, b) => score(b) - score(a))[0];
  deliberate(w, { ...base, kind: 'research', topic: `The village has gathered enough curiosity to pursue one new line of study. Era: ${ERAS[techEra(w)]}. Known: ${Object.keys(w.tech.known).map(id => TECHS[id].name).join(', ') || 'nothing yet'}. Which should the council direct everyone toward?`, options, default: def,
    apply: (id, sp, reason, src) => {
      const tid = id.slice(2), champ = ms.slice().sort((a, b) => techPref(b.v, tid) - techPref(a.v, tid))[0];
      chooseResearch(w, tid, src); recordDecision(w, `to study ${TECHS[tid].name.toLowerCase()} next. ${champ.v.name} argued for it.`, sp, src); g.nextMeeting = w.day + 4;
    } });
}

/* upgrading old buildings when the village learns better ways */
function planUpgrades(w) {
  if (w.bps.some(b => b.type === 'upgrade') || w.day < (w.nextUpgrade || 0)) return;
  const target = styleNow(w); if (!target) return;
  const { tgt, eff } = resourceTargets(w); if (eff.wood < tgt.wood * 0.8 || eff.stone < tgt.stone * 0.6 || w.stock.food < w.vills.length * 3) return;
  const old = w.houses().filter(h => (h.style || 0) < target && !w.bpAt.has(h.y * CFG.W + h.x)).sort((a, b) => (a.style || 0) - (b.style || 0) || (Math.abs(a.x - w.cx) + Math.abs(a.y - w.cy)) - (Math.abs(b.x - w.cx) + Math.abs(b.y - w.cy)));
  if (!old.length) return;
  makeBp(w, 'upgrade', old[0].x, old[0].y, { target: old[0].id, toStyle: (old[0].style || 0) + 1 }); w.nextUpgrade = w.day + 3;
}
