'use strict';
/* ==========================================================================
   livelihoods.js (v0.24.2b): what people do for a living besides the six
   heavy roles, and how they get by.

   • TRADES: about thirty crafts, services and odd jobs, each unlocked by a
     technology and a minimum population, each with real demand (so many jobs a
     day for the village's size and needs), a price, and a small real effect:
     goods (tools speed work, cloth keeps people warm, pots and fine goods
     comfort, bread feeds), or a service (healing, teaching, minding children,
     cheer, guarding, trade).
   • Money: crafts create value; services move it from customers to workers
     (coins once the village has coinage, otherwise a barter "wealth"). Customers
     can only pay what they hold, so a poor village supports few trades.
   • Everyone without a role looks for work where demand is unmet; people with a
     role may take a side job when they need cash; people with spare ideas
     INVENT trades. An invention has a hidden market: it may catch on, or fail
     (its maker gives it up, a little wiser).
   • Overtime: when the village is short of food or firewood, people may
     volunteer for longer hours (free councils), or be compelled (strict ones),
     at a cost to mood, health and unity.
   • Aspirations: many adults dream of something (a shop of their own, mastery,
     scholarship, a council seat, a bigger family, wealth, a sea voyage) and
     pursue it when life allows.

   Nothing here touches the page. Villager hooks: planLivelihood (villager.js)
   and the fields v.trade, v.side, v.asp.
   ========================================================================== */

const JOBS_PER_WORKER = 3;                         // jobs a worker can do in a day of work
const LIGHT_TRADES = new Set(['care', 'service', 'learned']);   // kinds an elder may take up
const TRADES = {
  // ---- odd jobs and care: open from the start ----
  minder: { name: 'Childminder', kind: 'care', req: [], pop: 10, dem: (w, n, c) => c.kids * 0.4, price: 0.6, at: 'home', fx: 'care', a: 'kind', go: 'To mind the little ones', lab: 'Minding children' },
  helper: { name: 'Helper', kind: 'care', req: [], pop: 12, dem: (w, n, c) => c.elders * 0.4 + c.sick * 0.6, price: 0.6, at: 'any', fx: 'help', a: 'kind', go: 'To lend a hand', lab: 'Helping a neighbour' },
  porter: { name: 'Porter', kind: 'odd', req: [], pop: 14, k: 0.03, price: 0.5, at: 'market', fx: 'carry', a: 'ind', go: 'To the market', lab: 'Carrying loads' },
  waterer: { name: 'Water carrier', kind: 'odd', req: [], pop: 12, k: 0.05, price: 0.5, at: 'plaza', fx: 'carry', a: 'ind', go: 'To the well', lab: 'Carrying water' },
  mender: { name: 'Mender', kind: 'odd', req: [], pop: 14, k: 0.04, price: 0.6, at: 'home', fx: 'comfort', a: 'ind', go: 'To the mending bench', lab: 'Mending tools and roofs' },
  gardener: { name: 'Kitchen gardener', kind: 'odd', req: [], pop: 12, k: 0.05, price: 0.6, at: 'home', good: 'bread', a: 'kind', go: 'To the garden plots', lab: 'Tending a garden for the table' },
  washer: { name: 'Launderer', kind: 'odd', req: [], pop: 16, k: 0.04, price: 0.5, at: 'home', fx: 'comfort', a: 'kind', go: 'To the washing place', lab: 'Washing and mending' },
  // ---- crafts ----
  basketmaker: { name: 'Basketmaker', kind: 'craft', req: [], pop: 14, k: 0.03, price: 0.8, at: 'home', good: 'pots', a: 'ind', go: 'To the workbench', lab: 'Weaving baskets' },
  potter: { name: 'Potter', kind: 'craft', req: ['pottery'], pop: 14, k: 0.04, price: 1.0, at: 'workshop', good: 'pots', a: 'ind', go: 'To the kiln', lab: 'Throwing pots' },
  weaver: { name: 'Weaver', kind: 'craft', req: ['weaving'], pop: 12, k: 0.05, price: 1.0, at: 'workshop', good: 'cloth', a: 'ind', go: 'To the loom', lab: 'Weaving cloth' },
  tailor: { name: 'Tailor', kind: 'craft', req: ['weaving', 'trade'], pop: 22, k: 0.04, price: 1.4, at: 'market', good: 'cloth', a: 'soc', go: 'To the stall', lab: 'Cutting and sewing' },
  cobbler: { name: 'Cobbler', kind: 'craft', req: ['tools', 'trade'], pop: 24, k: 0.03, price: 1.2, at: 'workshop', good: 'cloth', a: 'ind', go: 'To the last', lab: 'Mending shoes' },
  tanner: { name: 'Tanner', kind: 'craft', req: ['tools', 'trade'], pop: 26, k: 0.025, price: 1.2, at: 'workshop', good: 'cloth', a: 'brave', go: 'To the tanning pits', lab: 'Tanning hides' },
  carpenter: { name: 'Carpenter', kind: 'craft', req: ['carpentry'], pop: 14, k: 0.04, price: 1.2, at: 'workshop', good: 'tools', a: 'ind', go: 'To the bench', lab: 'Making tools and furniture' },
  cooper: { name: 'Cooper', kind: 'craft', req: ['carpentry', 'trade'], pop: 30, k: 0.02, price: 1.3, at: 'workshop', good: 'pots', a: 'ind', go: 'To the barrels', lab: 'Binding barrels' },
  smith: { name: 'Smith', kind: 'craft', req: ['bronze'], pop: 20, k: 0.05, price: 1.6, at: 'workshop', good: 'tools', a: 'brave', go: 'To the forge', lab: 'Forging tools' },
  mason: { name: 'Stonecutter', kind: 'craft', req: ['masonry'], pop: 22, k: 0.03, price: 1.4, at: 'workshop', good: 'tools', a: 'ind', go: 'To the stoneyard', lab: 'Dressing stone' },
  baker: { name: 'Baker', kind: 'craft', req: ['granary', 'pottery'], pop: 16, k: 0.05, price: 1.0, at: 'market', good: 'bread', a: 'kind', go: 'To the oven', lab: 'Baking bread' },
  miller: { name: 'Miller', kind: 'craft', req: ['watermills'], pop: 40, k: 0.02, price: 1.2, at: 'home', good: 'bread', a: 'ind', go: 'To the mill', lab: 'Grinding grain' },
  brewer: { name: 'Brewer', kind: 'craft', req: ['pottery', 'orchards'], pop: 30, k: 0.03, price: 1.2, at: 'tavern', fx: 'cheer', a: 'soc', go: 'To the brewhouse', lab: 'Brewing ale' },
  chandler: { name: 'Chandler', kind: 'craft', req: ['shelter', 'trade'], pop: 28, k: 0.02, price: 1.0, at: 'workshop', good: 'pots', a: 'kind', go: 'To the wax pot', lab: 'Dipping candles' },
  jeweller: { name: 'Jeweller', kind: 'craft', req: ['coinage', 'bronze'], pop: 36, k: 0.02, price: 3.0, at: 'market', good: 'fine', a: 'cur', go: 'To the bench', lab: 'Setting stones' },
  perfumer: { name: 'Perfumer', kind: 'craft', req: ['trade', 'orchards'], pop: 40, k: 0.015, price: 3.0, at: 'market', good: 'fine', a: 'cur', go: 'To the still', lab: 'Blending scents' },
  glassblower: { name: 'Glassblower', kind: 'craft', req: ['glass'], pop: 50, k: 0.02, price: 2.5, at: 'workshop', good: 'fine', a: 'ind', go: 'To the furnace', lab: 'Blowing glass' },
  // ---- services and learned trades ----
  healer: { name: 'Healer', kind: 'service', req: ['medicine'], pop: 14, k: 0.04, price: 1.2, at: 'any', fx: 'heal', a: 'kind', go: 'To the sick', lab: 'Tending the sick' },
  midwife: { name: 'Midwife', kind: 'service', req: ['medicine'], pop: 20, dem: (w, n, c) => c.preg * 0.5, price: 1.2, at: 'any', fx: 'birth', a: 'kind', go: 'To an expectant mother', lab: 'Attending a birth' },
  barber: { name: 'Barber-surgeon', kind: 'service', req: ['surgery'], pop: 40, k: 0.02, price: 1.0, at: 'market', fx: 'heal', a: 'cur', go: 'To the barber chair', lab: 'Cutting and bleeding' },
  teacher: { name: 'Teacher', kind: 'learned', req: ['writing'], pop: 20, dem: (w, n, c) => c.kids * 0.2, price: 1.0, at: 'plaza', fx: 'teach', a: 'cur', go: 'To the lesson place', lab: 'Teaching the young' },
  scribe: { name: 'Scribe', kind: 'learned', req: ['writing'], pop: 24, k: 0.03, price: 1.4, at: 'market', fx: 'know', a: 'cur', go: 'To the writing table', lab: 'Copying and recording' },
  scholar: { name: 'Scholar', kind: 'learned', req: ['libraries'], pop: 30, k: 0.025, price: 1.6, at: 'any', fx: 'know2', a: 'cur', go: 'To study', lab: 'Studying' },
  innkeeper: { name: 'Innkeeper', kind: 'service', req: ['trade'], pop: 26, k: 0.05, price: 1.2, at: 'tavern', fx: 'cheer', a: 'soc', go: 'To the tavern', lab: 'Serving guests' },
  musician: { name: 'Musician', kind: 'service', req: ['oral'], pop: 14, k: 0.04, price: 0.8, at: 'plaza', fx: 'cheer', a: 'soc', go: 'To the plaza', lab: 'Playing music' },
  storyteller: { name: 'Storyteller', kind: 'service', req: ['oral'], pop: 12, k: 0.035, price: 0.7, at: 'plaza', fx: 'social', a: 'soc', go: 'To the plaza', lab: 'Telling tales' },
  guard: { name: 'Watchman', kind: 'service', req: ['watchtowers'], pop: 30, k: 0.05, price: 1.2, at: 'any', fx: 'guard', a: 'brave', go: 'On patrol', lab: 'Keeping watch' },
  courier: { name: 'Courier', kind: 'service', req: ['roads'], pop: 34, k: 0.03, price: 1.2, at: 'any', fx: 'carry', a: 'brave', go: 'On the road', lab: 'Carrying messages' },
  shopkeeper: { name: 'Shopkeeper', kind: 'service', req: ['coinage'], pop: 26, k: 0.05, price: 1.4, at: 'market', fx: 'trade', a: 'soc', go: 'To the shop', lab: 'Minding the shop' },
  merchant: { name: 'Merchant', kind: 'service', req: ['seatrade'], pop: 40, k: 0.03, price: 2.0, at: 'market', fx: 'trade', a: 'cur', go: 'To the quay', lab: 'Haggling' },
  banker: { name: 'Banker', kind: 'service', req: ['banking'], pop: 70, k: 0.015, price: 3.0, at: 'market', fx: 'coins', a: 'ind', go: 'To the counting house', lab: 'Counting coin' },
  clerk: { name: 'Accountant', kind: 'learned', req: ['accounting'], pop: 80, k: 0.02, price: 2.0, at: 'market', fx: 'know', a: 'ind', go: 'To the ledgers', lab: 'Keeping accounts' },
};
/* ideas villagers may come up with: each gets a hidden market (appeal) when first tried */
const IDEAS = [
  ['Lantern maker', 'goods', 0.02, 1.0], ['Dyer', 'goods', 0.02, 1.0], ['Honey keeper', 'bread', 0.025, 0.9], ['Rat catcher', 'service', 0.015, 0.8], ['Message runner', 'carry', 0.02, 0.8],
  ['Herb seller', 'heal', 0.02, 0.9], ['Boat painter', 'goods', 0.012, 1.0], ['Bone carver', 'goods', 0.02, 1.0], ['Bell ringer', 'cheer', 0.012, 0.6], ['Fortune teller', 'social', 0.02, 0.8],
  ['Pet keeper', 'cheer', 0.012, 0.7], ['Map drawer', 'know', 0.01, 1.2], ['Well digger', 'carry', 0.015, 1.0], ['Wood carver of toys', 'cheer', 0.02, 0.8], ['Mushroom picker', 'bread', 0.02, 0.8],
  ['Scent seller', 'goods', 0.012, 1.4], ['Bonesetter', 'heal', 0.015, 1.1], ['Walking guide', 'carry', 0.012, 0.9],
];
const DREAMS = {
  shop: { text: 'to have a shop of their own', done: 'opens a shop of their own' },
  master: { text: 'to become a master of their craft', done: 'is now counted a master of the trade' },
  scholar: { text: 'to become a scholar', done: 'takes up the scholar\'s life' },
  lead: { text: 'to sit on the council', done: 'wins a seat on the council' },
  family: { text: 'to raise a large family', done: 'has a large, lively family' },
  wealth: { text: 'to make their fortune', done: 'has made a small fortune' },
  sail: { text: 'to sail far across the sea', done: 'finally gets passage on a trading ship' },
};

function initLiv(w) { w.liv = { v: 1, goods: {}, fx: { work: 0, warm: 0, comfort: 0, guard: 0 }, inv: [], jobs: {}, tdone: {}, stats: { jobs: 0, paid: 0, minted: 0, invented: 0, failed: 0, dreams: 0, ot: 0 }, ot: { until: 0, mode: 0, cd: 0 }, nid: 1, pay: 0 } }
const LIV = w => w.liv || (initLiv(w), w.liv);

/* ----- the list of trades open to the village now ----- */
function allTrades(w) {
  const L = LIV(w), out = [], pop = w.vills.length;
  for (const id in TRADES) { const t = TRADES[id]; if (pop >= t.pop && t.req.every(x => w.has(x))) out.push({ id, t }) }
  for (const iv of L.inv) out.push({ id: iv.id, t: invTrade(iv) });
  return out;
}
function invTrade(iv) { return { name: iv.name, kind: 'craft', req: [], pop: 0, price: iv.price, at: 'home', fx: iv.fx === 'goods' ? null : iv.fx, good: iv.fx === 'goods' ? 'fine' : iv.fx === 'bread' ? 'bread' : null, a: 'cur', go: 'To the work', lab: 'Working at ' + iv.name.toLowerCase(), inv: iv } }
function tradeOf(w, id) { if (!id) return null; if (TRADES[id]) return TRADES[id]; const iv = LIV(w).inv.find(x => x.id === id); return iv ? invTrade(iv) : null }
const tradeName = (w, id) => { const t = tradeOf(w, id); return t ? t.name : '' };

/* how the village looks to its trades */
function census(w) {
  let kids = 0, elders = 0, sick = 0, preg = 0, adults = 0, workers = 0;
  for (const v of w.vills) { if (v.isChild()) kids++; else { adults++; if (v.isElder()) elders++ } if (v.health < 55) sick++; if (v.preg) preg++ }
  return { kids, elders, sick, preg, adults };
}
function demandOf(w, id, t, cen) {
  const pop = w.vills.length;
  if (t.inv) return pop * t.inv.k * t.inv.appeal * (1 + 0.4 * Math.min(1.5, (w.stock.food / Math.max(1, pop)) / 6));
  const base = t.dem ? t.dem(w, pop, cen) : pop * t.k, S = SATURATION[t.good];
  return S ? base * clamp(1.6 - (LIV(w).goods[t.good] || 0) / (pop * S), 0.1, 1) : base;      // a market full of a good wants no more of it
}
const SATURATION = { tools: 1.0, cloth: 1.5, pots: 2.0, fine: 1.0 };
const holdings = (w, v) => (w.has('coinage') ? v.coins || 0 : v.wealth || 0);
function pay(w, v, x) { if (w.has('coinage')) { v.coins = (v.coins || 0) + x; v.earned = (v.earned || 0) + x } else v.wealth = (v.wealth || 0) + x }
function take(w, v, x) { if (w.has('coinage')) v.coins = Math.max(0, (v.coins || 0) - x); else v.wealth = Math.max(0, (v.wealth || 0) - x) }

/* ----- the daily round: pay, assign, invent, overtime, dreams ----- */
function livelihoodsDay(w) {
  const L = LIV(w); if (w.day < 3 || w.vills.length < 6) return;
  for (const v of w.vills) if (v.role && v.trade) { v.side = v.side || v.trade; v.trade = null }
  const cen = census(w), trades = allTrades(w), byTrade = {};
  for (const v of w.vills) { if (v.trade) (byTrade[v.trade] = byTrade[v.trade] || []).push(v); if (v.side) (byTrade[v.side] = byTrade[v.side] || []).push(v) }
  /* 1. pay yesterday's work */
  const ad = w.vills.filter(v => v.isAdult()), cap = ad.reduce((s, v) => s + holdings(w, v), 0) * 0.2;
  let services = 0; const plan = [];
  for (const { id, t } of trades) {
    const D = demandOf(w, id, t, cen), J = L.jobs[id] || 0, served = Math.min(J, D), amount = served * t.price;
    const svc = !(t.good || t.kind === 'craft'); if (svc) services += amount; plan.push({ id, t, D, J, amount, svc });
  }
  for (const id in L.tdone) if (!trades.some(x => x.id === id)) delete L.tdone[id];
  const scale = services > cap && services > 0 ? cap / services : 1;
  for (const p of plan) {
    const workers = byTrade[p.id] || [], total = workers.reduce((s, v) => s + (v.tj || 0), 0), amt = p.amount * (p.svc ? scale : 1);
    if (amt > 0 && total > 0) for (const v of workers) { const share = (amt * (v.tj || 0)) / total * (v.shop ? 1.25 : 1); if (share > 0) { pay(w, v, share); v.inc = 0.85 * (v.inc || 0) + 0.15 * share; L.stats.paid += share; if (!p.svc) L.stats.minted += share } }
    L.tdone[p.id] = { D: Math.round(p.D * 10) / 10, J: p.J, w: workers.length };
    p.workers = workers; p.over = p.J > p.D * 1.35 && workers.length > 1;
  }
  if (services > 0) { const take0 = Math.min(services * scale, cap); if (take0 > 0) { const tot = cap / 0.2; for (const v of ad) { const h = holdings(w, v); if (h > 0) take(w, v, take0 * (h / tot)) } } }
  for (const v of w.vills) { if (!v.tj) v.inc = (v.inc || 0) * 0.9; v.tj = 0 }
  L.jobs = {};
  /* 2. goods wear out, and what is left works for the village */
  for (const g in L.goods) L.goods[g] *= 0.985;
  const n = Math.max(1, w.vills.length), G = L.goods;
  L.fx.work = Math.min(0.07, ((G.tools || 0) / n) * 0.12); L.fx.warm = Math.min(0.35, ((G.cloth || 0) / n) * 0.3);
  L.fx.comfort = Math.min(2.5, (((G.pots || 0) + 2 * (G.fine || 0)) / n) * 1.2); L.fx.guard = Math.min(0.4, 0.07 * w.vills.filter(v => (v.trade === 'guard' || v.side === 'guard') && (v.inc || 0) >= 0).length);
  if (L.fx.comfort > 0.1 && w.day % 4 === 0) for (const v of ad) v.mood = Math.min(100, v.mood + L.fx.comfort * 0.4);
  /* 3. leave oversupplied or failing trades, take up new ones */
  for (const p of plan) if (p.over) for (const v of p.workers) if ((v.inc || 0) < p.t.price * 0.8 && w.r() < 0.12 && (v.tradeSince || 0) < w.day - 12) quitTrade(w, v, p.id, false);
  assignTrades(w, plan, cen);
  if (w.day % 8 === 3) inventTrades(w, plan);
  judgeInventions(w);
  overtimeDay(w, cen);
  if (w.day % 6 === 2) dreamsDay(w);
}
function quitTrade(w, v, id, failed) {
  const t = tradeOf(w, id); if (v.trade === id) { v.trade = null } if (v.side === id) v.side = null; v.tradeSince = w.day;
  if (t) v.story(failed ? `Gave up work as a ${t.name.toLowerCase()}: not enough customers.` : `Left work as a ${t.name.toLowerCase()} to look for something steadier.`);
}
function affinityFor(v, t) {
  const sk = v.tskill && v.tskill[t.inv ? t.inv.id : t.id] || 0;
  return (v.trait[t.a] != null ? v.trait[t.a] : 0.5) * 0.7 + sk * 0.6 + v.trait.ind * 0.2;
}
function assignTrades(w, plan, cen) {
  const L = LIV(w), need = [];
  for (const p of plan) { const have = (p.workers || []).length, want = Math.ceil(p.D / JOBS_PER_WORKER - 0.15); if (want > have) need.push({ ...p, gap: want - have }) }
  if (!need.length) return;
  const free = w.vills.filter(v => v.isAdult() && !v.role && !v.trade && (v.tradeSince || 0) < w.day - 6 && v.health > 35);
  for (const v of free.sort(() => w.r() - 0.5)) {
    let best = null, bs = -1;
    for (const p of need) {
      if (p.gap <= 0 || (v.isElder() && !LIGHT_TRADES.has(p.t.kind))) continue;
      const s = Math.min(1, p.gap / 2) * 0.8 + affinityFor(v, p.t) + (v.asp && v.asp.k === 'scholar' && (p.id === 'scribe' || p.id === 'scholar') ? 0.6 : 0) + w.r() * 0.25;
      if (s > bs) { bs = s; best = p }
    }
    if (!best) break;
    best.gap--; v.trade = best.id; v.tradeSince = w.day;
    if (w.tick > 0) v.story(`Took up work as a ${best.t.name.toLowerCase()}.`);
  }
  /* still gaps and nobody free: let a few people leave the lighter heavy roles for a trade (a richer village specialises) */
  const total = need.reduce((s, p) => s + Math.max(0, p.gap), 0), adults = w.vills.filter(v => v.isAdult() && !v.isElder()), tradesmen = adults.filter(v => v.trade).length;
  if (total > 0 && w.stock.food >= w.vills.length * 3 && tradesmen < adults.length * 0.35) {
    const cnt = {}; for (const v of adults) if (v.role) cnt[v.role] = (cnt[v.role] || 0) + 1;
    const donors = adults.filter(v => v.role && ['woodcutter', 'miner', 'builder'].includes(v.role) && cnt[v.role] > 1 && !v.trade).sort(() => w.r() - 0.5);
    let moved = 0;
    for (const v of donors) {
      if (moved >= Math.min(2, total)) break;
      let best = null, bs = -1; for (const p of need) { if (p.gap <= 0) continue; const s = affinityFor(v, p.t) + w.r() * 0.25; if (s > bs) { bs = s; best = p } }
      if (!best || bs < 0.55) continue;
      best.gap--; moved++; cnt[v.role]--; v.role = null; v.trade = best.id; v.tradeSince = w.day; v.story(`Left the heavy work for a trade: ${best.t.name.toLowerCase()}.`);
    }
  }
  /* people with a role who are short of cash (or have no work in winter) take a side job */
  {
    for (const v of w.vills) {
      if (!v.isAdult() || v.trade || v.side || !v.role || holdings(w, v) > 12 || w.r() > 0.3) continue;
      const p = need.filter(p => p.gap > 0 && !(v.isElder() && !LIGHT_TRADES.has(p.t.kind))).sort((a, b) => affinityFor(v, b.t) - affinityFor(v, a.t))[0];
      if (p) { p.gap--; v.side = p.id; v.tradeSince = w.day }
    }
  }
}
function inventTrades(w, plan) {
  const L = LIV(w), pop = w.vills.length; if (pop < 14 || L.inv.length >= 12) return;
  const idle = w.vills.filter(v => v.isAdult() && !v.role && !v.trade && !v.isElder() && (v.tradeSince || 0) < w.day - 8 && v.mood > 40);
  if (!idle.length) return;
  for (let k = 0; k < 1 + Math.floor(idle.length / 5) && idle.length; k++) {
    const i = (w.r() * idle.length) | 0, v = idle.splice(i, 1)[0], p = 0.3 * (0.5 + v.trait.cur * 0.7 + v.trait.ind * 0.4); if (w.r() > p) continue;
    const free = IDEAS.filter(i => !L.inv.some(x => x.name === i[0])); if (!free.length) return;
    const idea = free[(w.r() * free.length) | 0], iv = { id: 'x' + L.nid++, name: idea[0], fx: idea[1], k: idea[2], price: idea[3], appeal: 0.15 + w.r() * 1.7, by: v.id, since: w.day, ok: false };
    L.inv.push(iv); v.trade = iv.id; v.tradeSince = w.day; v.trial = iv.id; statCount(w, 'invention');
    v.story(`Had an idea: ${idea[0].toLowerCase()}. Gave it a try.`); w.say(`${v.name} tries a new line of work: ${idea[0].toLowerCase()}.`);
  }
}
function judgeInventions(w) {
  const L = LIV(w);
  for (let i = L.inv.length - 1; i >= 0; i--) {
    const iv = L.inv[i], age = w.day - iv.since, workers = w.vills.filter(v => v.trade === iv.id || v.side === iv.id);
    if (iv.ok) { if (!workers.length && age > 40) L.inv.splice(i, 1); continue }
    if (age < 24) continue;
    const by = w.vills.find(v => v.id === iv.by), inc = by ? by.inc || 0 : 0;
    if (by && inc >= iv.price * 0.9) { iv.ok = true; L.stats.invented++; w.emit('livelihood', `${by.name}'s idea of ${iv.name.toLowerCase()} catches on: people are willing to pay for it.`, {}); by.story(`${iv.name} caught on.`); by.mood = Math.min(100, by.mood + 6); by.reputation = Math.min(100, by.reputation + 2) }
    else {
      L.stats.failed++; statCount(w, 'invention_failed'); for (const v of workers) { v.trade === iv.id ? v.trade = null : v.side = null; v.tradeSince = w.day; v.trial = null; v.skill.wood = Math.min(1, v.skill.wood + 0.005); v.story(`The ${iv.name.toLowerCase()} idea found few customers. Learned a little from it.`) }
      if (by) w.say(`${by.name} gives up on ${iv.name.toLowerCase()}: not enough customers.`); L.inv.splice(i, 1);
    }
  }
}

/* ----- doing the work (called from the villager's job chain) ----- */
const near = (w, v, r) => w.vills.filter(o => o !== v && !o.sleeping && Math.hypot(o.x - v.x, o.y - v.y) < r);
function jobEffect(w, v, t, id) {
  const L = LIV(w), fx = t.fx, sk = (v.tskill && v.tskill[id]) || 0, b = 1 + 0.6 * sk;
  if (t.good) { L.goods[t.good] = (L.goods[t.good] || 0) + 1; if (t.good === 'bread') w.stock.food = Math.min(w.cap(), w.stock.food + 0.8 * b) }
  if (fx === 'care') { for (const o of near(w, v, 12)) if (o.isChild()) { o.mood = Math.min(100, o.mood + 1); for (const pid of o.parentIds) { const p = w.vills.find(x => x.id === pid); if (p) { p.mood = Math.min(100, p.mood + 1.2); p.energy = Math.min(100, p.energy + 1) } } } }
  else if (fx === 'help') { const o = near(w, v, 14).filter(x => x.isElder() || x.health < 60).sort((a, c) => a.health - c.health)[0]; if (o) { o.health = Math.min(100, o.health + 1.5 * b); o.hunger = Math.min(100, o.hunger + 4); o.mood = Math.min(100, o.mood + 1) } }
  else if (fx === 'heal') { const o = near(w, v, 14).sort((a, c) => a.health - c.health)[0]; if (o && o.health < 95) o.health = Math.min(100, o.health + 3 * b * (w.has('medicine') ? 1.2 : 1)) }
  else if (fx === 'birth') { for (const o of near(w, v, 14)) if (o.preg) o.health = Math.min(100, o.health + 2 * b) }
  else if (fx === 'teach') { for (const o of near(w, v, 12)) if (o.isChild() || o.stage() === 'youth') { const k = ['farm', 'hunt', 'fish', 'build', 'wood', 'stone'][(w.r() * 6) | 0]; o.skill[k] = Math.min(1, o.skill[k] + 0.004 * b) } addKnowledge(w, 0.04, v) }
  else if (fx === 'know') addKnowledge(w, 0.1 * b, v);
  else if (fx === 'know2') addKnowledge(w, 0.17 * b, v);
  else if (fx === 'cheer') { for (const o of near(w, v, 6).slice(0, 5)) { o.mood = Math.min(100, o.mood + 1.2); o.social = Math.min(100, o.social + 3) } }
  else if (fx === 'social') { for (const o of near(w, v, 6).slice(0, 4)) { o.social = Math.min(100, o.social + 5); w.rel.set(w.relKey(v, o), w.getRel(v, o) + 1.5) } v.reputation = Math.min(100, v.reputation + 0.1) }
  else if (fx === 'trade' && w.econ && w.has('coinage')) w.econ.treasury += 0.3 * b;
  else if (fx === 'coins' && w.econ && w.has('coinage')) w.econ.treasury += 0.5 * b;
  if (!v.tskill) v.tskill = {}; v.tskill[id] = Math.min(1, (v.tskill[id] || 0) + 0.006); v.tj = (v.tj || 0) + 1; L.jobs[id] = (L.jobs[id] || 0) + 1; L.stats.jobs++;
}
/* the villager's job: go to the workplace, do one job. side = true for a side job. Returns true if a job was planned. */
function planLivelihood(w, v, side) {
  const id = side ? v.side : v.trade, t = tradeOf(w, id); if (!t) return false;
  const hb = v.home != null ? w.buildings.get(v.home) : null, pl = t.at === 'market' ? w.of('market')[0] : t.at === 'tavern' ? w.of('tavern')[0] : t.at === 'plaza' ? w.of('plaza')[0] : t.at === 'workshop' ? (w.of('workshop').length ? w.of('workshop')[(v.id | 0) % w.of('workshop').length] : null) : null;
  let goal;
  if (pl) goal = (x, y) => w.nearRect(x, y, pl); else if (t.at === 'any') { const P = gatherPlan(w, v, false, false); goal = P ? (x, y) => x === P.x && y === P.y : null } else if (hb) goal = (x, y) => w.nearRect(x, y, hb);
  if (!goal && hb) goal = (x, y) => w.nearRect(x, y, hb); if (!goal) return false;
  const base = t.kind === 'care' ? 120 : 100, ticks = Math.max(30, Math.round(base * (1.2 - 0.4 * ((v.tskill && v.tskill[id]) || 0)) * (1.12 - 0.24 * v.mood / 100) * (1 + 0.08 * w.gov.policy.labor)));
  v.jobKind = 'craft'; v.steps = [go(goal, null, t.go, { maxCost: 90 }), work(ticks, t.lab, () => jobEffect(w, v, t, id))];
  return true;
}
/* trades give way to the village's own needs: scarce wood, stone or food, or building that lacks hands */
function tradeSlack(w) {
  const c = w._lsl; if (c && c.t === w.tick) return c.v;
  const { tgt, eff } = resourceTargets(w); let m = 9; for (const k in tgt) m = Math.min(m, eff[k] / Math.max(1, tgt[k]));
  let p = m < 0.6 ? 0.12 : m < 0.9 ? 0.4 : 1; const bld = w.vills.filter(v => v.jobKind === 'build' || v.jobKind === 'haul').length;
  if (w.bps.length && bld < Math.ceil(w.vills.length / 6)) p *= 0.35;
  w._lsl = { t: w.tick, v: p }; return p;
}
/* what the villager's decide() calls: trades first for people without a role, after role work for people with one */
function livelihoodWanted(w, v) {
  if (!v.trade && !v.side) return false; if (!v.isAdult() || v.energy < 28 || v.hunger < 35) return false;
  return true;
}

/* ----- overtime: longer hours when the village needs it ----- */
function overtimeDay(w, cen) {
  const L = LIV(w), O = L.ot; if (O.until > w.day) { overtimeCost(w, O); return } O.mode = 0;
  if (!w.concerns || O.cd > w.day) return;
  const need = w.concerns.list.find(c => (c.key === 'food' || c.key === 'fuel') && !(w.concerns.muted[c.key] > w.day)); if (!need) return;
  const R = w.regime, auth = R ? R.ax.auth : 0.4, p = clamp(0.85 - 0.9 * auth + (w.gov.approval - 50) / 250, 0.1, 0.9);
  if (w.r() < p) { O.mode = 1; O.until = w.day + 12; O.cd = w.day + 40; L.stats.ot++; statCount(w, 'overtime'); w.emit('livelihood', `The village agrees to work longer hours until ${need.key === 'food' ? 'the food holds out' : 'the winter wood is in'}. Many volunteer.`, {}) }
  else if (auth > 0.5) { O.mode = 2; O.until = w.day + 12; O.cd = w.day + 40; L.stats.ot++; statCount(w, 'overtime'); w.emit('livelihood', `The council orders longer hours for all. People grumble, but they work.`, {}) }
  else { O.cd = w.day + 16 }
}
function overtimeCost(w, O) {
  const R = w.regime;
  for (const v of w.vills) if (v.isAdult()) { if (O.mode === 1) v.mood = Math.min(100, v.mood + (v.trait.kind > 0.5 ? 0.15 : -0.1)); else { v.mood = Math.max(0, v.mood - 1.1); v.health = Math.max(1, v.health - 0.12) } v.health = Math.max(1, v.health - 0.05) }
  if (R) R.ax.cohes = clamp(R.ax.cohes + (O.mode === 1 ? 0.003 : -0.006), 0, 1);
}
const overtimeMode = w => (w.liv && w.liv.ot.until > w.day ? w.liv.ot.mode : 0);

/* ----- aspirations ----- */
function dreamsDay(w) {
  const pop = w.vills.length, cover = w.stock.food / Math.max(1, pop);
  for (const v of w.vills) {
    if (!v.isAdult() || v.isElder()) continue;
    const a = v.asp;
    if (a && !a.done) { if (dreamMet(w, v, a)) { a.done = w.day; const d = DREAMS[a.k]; v.story(`Dream come true: ${d.done}.`); v.mood = Math.min(100, v.mood + 10); v.reputation = Math.min(100, v.reputation + 3); LIV(w).stats.dreams++; statCount(w, 'aspiration'); w.emit('livelihood', `${v.name} ${d.done}.`, {}); if (a.k === 'shop') v.shop = true; if (a.k === 'scholar' && TRADES.scholar && w.has('libraries')) v.trade = 'scholar' } continue }
    if (a && a.done && w.day - a.done < 40) continue;
    if (v.mood < 55 || v.hunger < 50 || cover < 3 || w.cold || w.r() > 0.12) continue;
    const opts = [['master', (v.trade || v.side) ? 1 : 0], ['wealth', 0.5 + v.trait.ind * 0.4], ['family', v.kids.length < 2 ? 0.5 + v.trait.kind * 0.5 : 0], ['lead', v.reputation > 55 ? 0.8 : 0.1], ['scholar', w.has('writing') ? 0.2 + v.trait.cur : 0], ['shop', w.has('coinage') && !v.shop ? 0.3 + v.trait.soc * 0.5 : 0], ['sail', w.has('boats') ? 0.1 + v.trait.brave * 0.5 + v.trait.cur * 0.4 : 0]];
    const tot = opts.reduce((s, o) => s + o[1], 0); if (tot <= 0) continue; let r = w.r() * tot, k = opts[0][0]; for (const o of opts) { if ((r -= o[1]) <= 0) { k = o[0]; break } }
    v.asp = { k, text: DREAMS[k].text, day: w.day, done: 0 }; v.story(`Dreams ${DREAMS[k].text}.`);
  }
}
function dreamMet(w, v, a) {
  const age = w.day - a.day; if (age < 8) return false;
  switch (a.k) {
    case 'master': { const id = v.trade || v.side, sk = id && v.tskill ? v.tskill[id] || 0 : 0; return sk >= 0.55 }
    case 'wealth': return holdings(w, v) >= (w.has('coinage') ? 70 : 18);
    case 'family': return v.kids.length >= 3;
    case 'lead': return w.gov.council.some(c => c.id === v.id);
    case 'scholar': return age > 24 && v.mood > 55 && w.has('libraries');
    case 'shop': return holdings(w, v) >= 35;
    case 'sail': return w.has('seatrade') && age > 30 && w.r() < 0.04;
  } return false;
}
/* how a trade looks on a villager: an apron colour, and a small prop in hand while at work */
const LOOKS = { tools: ['hammer', '#9aa3aa', '#6b4f36'], cloth: ['needle', '#f0e6d0', '#b86bd0'], pots: ['pot', '#c67a4a', '#d9b38c'], fine: ['gem', '#7fd4ff', '#e8b830'], bread: ['loaf', '#d9a45a', '#f2ead8'],
  heal: ['cross', '#e24a4a', '#f4f4f4'], birth: ['cross', '#e24a4a', '#f4f4f4'], teach: ['book', '#f4f4f4', '#3f6fb0'], know: ['book', '#f4f4f4', '#3f6fb0'], know2: ['book', '#f4f4f4', '#3f6fb0'], cheer: ['note', '#ffd24a', '#c0543c'], social: ['note', '#ffd24a', '#c0543c'],
  care: ['heart', '#ff7a9a', '#e8c0d0'], help: ['heart', '#ff7a9a', '#e8c0d0'], guard: ['spear', '#c8ccd0', '#3a5a8a'], trade: ['coin', '#ffd24a', '#3c8a5a'], coins: ['coin', '#ffd24a', '#3c8a5a'], carry: ['sack', '#b08a58', '#7a6a4a'], comfort: ['pot', '#8fd0e0', '#8fd0e0'] };
function tradeLook(w, v) { const id = v.trade || v.side; if (!id) return null; const t = tradeOf(w, id); if (!t) return null; return LOOKS[t.good || t.fx] || ['dot', '#ddd', '#888'] }
const dreamText = v => (v.asp && !v.asp.done ? v.asp.text : '');
function livelihoodSummary(w) {
  const L = LIV(w), ad = w.vills.filter(v => v.isAdult() && !v.isElder()), roles = ad.filter(v => v.role).length, trades = ad.filter(v => !v.role && v.trade).length, idle = ad.length - roles - trades;
  const rows = Object.keys(L.tdone).map(id => ({ id, name: tradeName(w, id), ...L.tdone[id] })).filter(r => r.name && (r.w || r.D > 0.5)).sort((a, b) => b.w - a.w);
  return { roles, trades, idle, adults: ad.length, rows, inv: L.inv, goods: L.goods, fx: L.fx, ot: overtimeMode(w), stats: L.stats };
}
