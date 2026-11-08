'use strict';
/* ==========================================================================
   routes.js — the village trades for itself (v0.20)

   Until now merchants came to the village. Now the village also sends its own
   ships and wagons to neighbours it knows: it sells what it has too much of
   and buys what it is short of. Every trip is weighed with one shared rule,
   costBenefit(): what it should earn against crew time, upkeep and risk. The
   council decides (or Claude counsels); a route that keeps paying can become a
   standing route that runs without asking again.

   The harbour grows in tiers: dock, quay (cargo ships, more berths) and port
   (carracks, customs revenue). Cargo ships and carracks are built at a quay or
   port. How readily a village trades depends on its regime: open, merchant-
   minded places trade eagerly; closed or devout ones seldom; communal ones put
   all the profit in the treasury.
   ========================================================================== */
const WORKER_DAY = 3;                               // what one villager-day is worth, in coins
const TIERS = [null, { name: 'Dock' }, { name: 'Quay' }, { name: 'Port' }];
const HARBOUR_COST = {
  quay: { tier: 2, tech: ['masonry', 'seatrade'], wood: 50, stone: 30, coins: 0, days: 6, text: 'a quay: a stone-edged landing with a warehouse, room for more ships and a cargo ship' },
  port: { tier: 3, tech: ['navigation', 'coinage'], wood: 70, stone: 60, coins: 40, days: 8, text: 'a port: cranes, customs sheds and a shipyard for carracks, with customs revenue on every trip' },
  cargo: { tier: 2, tech: ['seatrade'], wood: 45, stone: 10, coins: 15, days: 5, text: 'a cargo ship that carries 70 loads' },
  carrack: { tier: 3, tech: ['navigation'], wood: 90, stone: 25, coins: 50, days: 8, text: 'a carrack that carries 140 loads and sails faster' }
};

function initTrade2(w) {
  w.trade2 = { active: null, routes: {}, yard: [], nextPlan: 20, nextHarbour: 30, last: null, trips: [], ledger: { trips: 0, exports: 0, imports: 0, profit: 0, lost: 0 }, lastPlan: null };
}
const T2 = w => w.trade2 || (w.trade2 = (initTrade2(w), w.trade2));

/* ----- the one rule every big choice weighs: gain against cost and risk ----- */
function costBenefit(w, o) {                        // o: { gain, cost, risk (0..1 chance of losing `stake`), stake, days, crew }
  const crew = (o.crew === undefined ? 1 : o.crew) * (o.days || 0) * WORKER_DAY, riskCost = (o.risk || 0) * (o.stake || 0);
  const total = (o.cost || 0) + crew + riskCost, ratio = total > 0 ? (o.gain || 0) / total : (o.gain || 0) > 0 ? 99 : 0;
  return { gain: o.gain || 0, total, crew, riskCost, ratio, go: (o.gain || 0) > 0 && ratio >= (o.min || 1.5) };
}

/* how eager this village is to trade abroad (regime and policy) */
function tradeAppetite(w) {
  const rx = w.rx; if (!rx) return 1; if (w.gov.policy.growth < -0.75) return 0.2;
  return clamp(1 + 0.9 * rx.O + 0.3 * rx.C - 0.7 * rx.P - 0.5 * rx.A + 0.25 * w.gov.policy.growth, 0.2, 2.2);
}
const isHostile = n => n.kind === 'raiders' && n.rel < 8 || n.rel < -15;

/* ----- paths (cached, never saved) ----- */
function seaTripPath(w, boat, n) {
  const C = w._pc || (w._pc = new Map()), key = 's' + n.id + ':' + boat.dock; if (C.has(key)) return C.get(key);
  const p = seaPath(w, boat, n) || null; C.set(key, p); return p;
}
function landTripPath(w, n) {
  const C = w._pc || (w._pc = new Map()), key = 'l' + n.id; if (C.has(key)) return C.get(key); const goal = (x, y) => Math.hypot(x - n.x, y - n.y) <= 8;
  const p = w.search(w.cx, w.cy + 2, goal, 520) || w.search(w.cx, w.cy + 2, goal, 520, true) || null; C.set(key, p); return p;
}

/* what a trip to this neighbour with this ship (or wagon) would do */
function routeEval(w, n, ship) {
  const E = w.econ, coin = money(w), pr = coin ? E.prices : BASE_PRICE, mode = ship ? 'sea' : 'land';
  const path = ship ? seaTripPath(w, ship, n) : landTripPath(w, n); if (!path) return null;
  const S = ship ? shipOf(ship) : { name: 'wagon', cap: 36, speed: 0.09, upkeep: 1 }, cap = ship ? Math.round(S.cap * (1 + techFx(w, 'sea'))) : S.cap, c = { from: n.id, cap };
  const d = dealPreview(w, 'trip', c), tot = o => Object.values(o).reduce((a, b) => a + b, 0), shrink = (o, f) => { for (const k of Object.keys(o)) { o[k] = Math.floor(o[k] * f); if (o[k] < 1) delete o[k] } };
  const capped = tot(d.sell) > cap || tot(d.buy) > cap; if (tot(d.sell) > cap) shrink(d.sell, cap / tot(d.sell)); if (tot(d.buy) > cap) shrink(d.buy, cap / tot(d.buy));
  const val = (o, f, side) => TRADE_KEYS.reduce((s, k) => s + (o[k] || 0) * pr[k] * f * tradeMod(w, c, side, k), 0);
  let rev = val(d.sell, 0.9, 'sell'), cost = val(d.buy, 1.1, 'buy');
  if (!coin) { if (!rev || !cost) { d.sell = {}; d.buy = {}; rev = cost = 0 } else if (rev > cost) { shrink(d.sell, cost / rev); rev = val(d.sell, 0.9, 'sell') } else { shrink(d.buy, rev / cost); cost = val(d.buy, 1.1, 'buy') } }
  if (!tot(d.sell) && !tot(d.buy)) return null;
  const net = coin ? rev - cost : 0, shortage = TRADE_KEYS.reduce((s, k) => s + (d.buy[k] || 0) * pr[k] * 0.4, 0);
  const gain = (coin ? net + shortage : (cost + shortage) - rev * 0.9) * (1 + techFx(w, 'trade'));                   // barter: goods in (shortages count extra) against goods out
  const len = path.length, ticks = Math.ceil(len / S.speed) * (ship ? 1 : 1.2), days = Math.max(1, (2 * ticks + 120) / CFG.TPD);
  const hostile = isHostile(n), risk = clamp((ship ? 0.03 + 0.0004 * len : 0.015 + 0.0002 * len) * (hostile ? 2.5 : 1) * (w.settings.disasters ? 1 : 0.4), 0, 0.5);
  const cb = costBenefit(w, { gain, cost: S.upkeep, risk, stake: rev + cost, days, crew: 1 });
  return { n, nid: n.id, mode, ship, shipId: ship ? ship.id : null, sell: d.sell, buy: d.buy, rev: Math.round(rev), cost: Math.round(cost), net: Math.round(net), gain: Math.round(gain * 10) / 10, days: Math.round(days * 10) / 10, risk, capped, cap, ticks, len, cb, ratio: cb.ratio, go: cb.go && !hostile, label: ship ? SHIPS[ship.kind || 'fishing'].name.toLowerCase() : 'wagon' };
}

/* the best way to trade with one neighbour right now */
function bestPlan(w, n) {
  const plans = []; const free = w.boats.filter(b => b.crew == null && b.state === 'moored' && !b.noSea && w.buildings.get(b.dock));
  if (free.length) { const by = free.slice().sort((a, b) => shipOf(b).cap - shipOf(a).cap); const seen = new Set(); for (const b of by) { if (b.kind === 'barge' ? n.reach !== 'land' : !w.has('seatrade')) continue; if (seen.has(b.kind)) continue; seen.add(b.kind); const p = routeEval(w, n, b); if (p) plans.push(p) } }
  if (n.reach === 'land' && w.has('trade')) { const p = routeEval(w, n, null); if (p) plans.push(p) }
  plans.sort((a, b) => b.gain - a.gain); return plans[0] || null;
}

/* ===== once a day ===== */
function routesDay(w) {
  const t = T2(w); if (!w.neigh || !w.has('trade')) return;
  yardDay(w, t);
  if (t.active) { if (t.active.state === 'pending' && w.day > t.active.until) { w.say('Nobody is free to take the trading voyage, and it is put off.'); t.active = null; t.nextPlan = w.day + 4 } return }
  if (w.day < t.nextPlan || w.vills.length < 18 || w.season === 3) return;
  const app = tradeAppetite(w); t.nextPlan = w.day + Math.round((5 + ((w.r() * 4) | 0)) / clamp(app, 0.3, 2));
  const cand = w.neigh.filter(n => n.found && n.met && !isHostile(n)).map(n => bestPlan(w, n)).filter(Boolean).sort((a, b) => b.ratio - a.ratio);
  if (cand.length) t.lastPlan = { day: w.day, n: cand[0].n.name, ratio: Math.round(cand[0].ratio * 10) / 10, capped: cand[0].capped };
  harbourDay(w, t, cand[0] || null);                                  // the harbour is weighed whether or not a trip is on offer
  const best = cand.find(p => p.go); if (!best) return;
  const std = t.routes[best.nid];
  if (std && std.standing) { if (best.ratio >= 1.6) return launch(w, best, 'rules', true); delete t.routes[best.nid]; w.emit('trade', `The standing route to ${best.n.name} no longer pays, and is given up.`, { route: 'ended' }) }
  proposeTrip(w, best);
}
function proposeTrip(w, p) {
  const t = T2(w), app = tradeAppetite(w), n = p.n, list = o => Object.entries(o).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing';
  const text = (money(w) ? `sell ${list(p.sell)} and buy ${list(p.buy)}, about ${p.net >= 0 ? '+' : ''}${p.net} coins before tax` : `swap ${list(p.sell)} for ${list(p.buy)}`) + `; a trip of about ${p.days} days by ${p.label}, ${Math.round(p.risk * 100)}% risk of losing the cargo`;
  const options = [{ id: 'send', text: `Send the ${p.label} to ${n.name} once: ${text}` }];
  if (p.ratio >= 2) options.push({ id: 'standing', text: `Make it a standing route to ${n.name}: the same trip again and again while it keeps paying, without asking the council each time` });
  options.push({ id: 'wait', text: 'Not now: keep the goods at home' });
  const def = app < 0.6 ? 'wait' : p.ratio >= 2.2 && app > 1.2 && p.ratio >= 2 ? 'standing' : 'send';
  ask(w, { kind: 'trade', topic: `The village could trade with ${n.name} (${NEIGH_KINDS[n.kind].label}, ${relLabel(n.rel)} toward us). Expected: ${text}. Gain ${p.gain} coins' worth against about ${Math.round(p.cb.total * 10) / 10} in crew time, upkeep and risk (ratio ${Math.round(p.ratio * 10) / 10}). ${app > 1.2 ? 'The village is eager to trade.' : app < 0.6 ? 'The village is wary of foreign dealings.' : ''}`, options, default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'wait') { t.nextPlan = w.day + 8; recordDecision(w, `not to send a trading voyage to ${n.name} for now.`, sp, src); return }
      if (id === 'standing') t.routes[p.nid] = { standing: true, since: w.day, trips: 0, profit: 0, mode: p.mode };
      recordDecision(w, `to send ${p.mode === 'sea' ? 'a ship' : 'a wagon'} to ${n.name} with goods to trade${id === 'standing' ? ', and to make it a standing route' : ''}.`, sp, src); launch(w, p, src, false); w.gov.nextMeeting = w.day + 3;
    } });
}
/* the trip is set; the next free villager takes the helm */
function launch(w, p, src, standing) {
  const t = T2(w); t.active = { state: 'pending', plan: { nid: p.nid, mode: p.mode, shipId: p.shipId, sell: p.sell, buy: p.buy, cap: p.cap, days: p.days, risk: p.risk, ratio: p.ratio, ticks: p.ticks, len: p.len, label: p.label }, until: w.day + 3, standing: !!standing, skipper: null, since: w.day };
}

/* ===== harbour: tiers and shipyard ===== */
function dockTier(b) { return b.tier || 1 }
function berths(w, b) { return 1 + dockTier(b) + (w.has('navigation') ? 1 : 0) }
function harbourDay(w, t, plan) {
  if (w.day < t.nextHarbour || !w.of('dock').length || !w.has('seatrade')) return; t.nextHarbour = w.day + 10;
  const docks = w.of('dock'), top = docks.slice().sort((a, b) => dockTier(b) - dockTier(a))[0], tier = dockTier(top), E = w.econ, coin = money(w);
  if (docks.some(d => d.upg) || t.yard.length) return;
  const ok = k => { const c = HARBOUR_COST[k]; return c.tech.every(x => w.has(x)) && w.stock.wood >= c.wood && w.stock.stone >= c.stone && (!coin || E.treasury >= c.coins) };
  const cargo = w.boats.filter(b => b.kind === 'cargo' || b.kind === 'carrack').length, opts = [];
  if (tier < 2 && ok('quay')) opts.push('quay'); else if (tier === 2 && ok('port') && w.vills.length >= 40) opts.push('port');
  const ydock = docks.find(d => dockTier(d) >= 2 && w.boats.filter(b => b.dock === d.id).length < berths(w, d));
  if (ydock && cargo < 1 + tier && plan && (plan.capped || plan.ratio > 1)) { if (ok('cargo')) opts.push('cargo') } if (ydock && tier >= 3 && ok('carrack') && cargo < 3 && plan && plan.capped) opts.push('carrack');
  if (!opts.length) return;
  const wantLive = plan && plan.gain > 0, app = tradeAppetite(w), kind = opts[0], c = HARBOUR_COST[kind];
  const costTxt = `${c.wood} firewood, ${c.stone} stone${c.coins && coin ? ', ' + c.coins + ' coins' : ''}`;
  const def = app >= 0.7 && wantLive ? 'yes' : app >= 1.1 ? 'yes' : 'wait';
  ask(w, { kind: 'trade', topic: `The harbour is busy enough to need more. The council is asked to build ${c.text}. It costs ${costTxt} and about ${c.days} days of work.${plan ? ' The last trading plan ' + (plan.capped ? 'was held back by the size of the ships.' : 'looked worthwhile.') : ''}`,
    options: [{ id: 'yes', text: `Build ${c.text} (${costTxt})` }, { id: 'wait', text: 'Wait: the harbour is enough for now' }], default: def,
    apply: (id, sp, reason, src) => {
      if (id !== 'yes') { t.nextHarbour = w.day + 25; recordDecision(w, `to leave the harbour as it is.`, sp, src); return }
      w.stock.wood -= c.wood; w.stock.stone -= c.stone; if (coin) E.treasury -= c.coins;
      if (kind === 'quay' || kind === 'port') top.upg = { tier: c.tier, at: w.day + c.days }; else t.yard.push({ kind, dock: ydock.id, at: w.day + c.days });
      recordDecision(w, `to build ${c.text}.`, sp, src); w.emit('trade', `Work begins on ${c.text}.`, { harbour: kind });
    } });
}
function yardDay(w, t) {
  for (const d of w.of('dock')) if (d.upg && w.day >= d.upg.at) { d.tier = d.upg.tier; d.upg = null; ensureStats(w, d); d.maxHp = Math.round(BLD_HP.dock * (1 + 0.6 * (d.tier - 1))); d.hp = d.maxHp; w.emit('trade', d.tier === 2 ? 'The new quay is finished: stone-edged berths, a warehouse and room for cargo ships.' : 'The port is finished: cranes, customs sheds and a shipyard. Carracks can be built here.', { harbour: 'done' }) }
  for (let k = t.yard.length - 1; k >= 0; k--) { const y = t.yard[k]; if (w.day < y.at) continue; t.yard.splice(k, 1); const d = w.buildings.get(y.dock); if (!d) continue; const b = addBoat(w, d, y.kind); w.emit('trade', `A ${SHIPS[y.kind].name.toLowerCase()} is launched from the ${TIERS[dockTier(d)].name.toLowerCase()}.`, { ship: b.id }) }
}

/* ===== loading, settling and arriving ===== */
function tripLoad(w, run) {                                         // goods leave the stores and go aboard
  run.hold = {}; run.sold = {}; run.back = {};
  for (const k of TRADE_KEYS) { const q = Math.min(run.plan.sell[k] || 0, Math.floor(w.stock[k])); if (q > 0) { w.stock[k] -= q; run.hold[k] = q } }
  if (run.ship) run.ship.hold = run.hold;
}
function tripSettle(w, run) {                                       // at the far end: sell the hold, buy what is needed
  const p = run.plan, n = w.neigh.find(x => x.id === p.nid); if (!n) return;
  const E = w.econ, coin = money(w), pr = coin ? E.prices : BASE_PRICE, c = { from: n.id, cap: p.cap };
  run.sold = { ...run.hold }; run.hold = {}; if (run.ship) run.ship.hold = run.back;
  let rev = 0; for (const k of TRADE_KEYS) rev += (run.sold[k] || 0) * pr[k] * 0.9 * tradeMod(w, c, 'sell', k);
  const priceOf = o => TRADE_KEYS.reduce((s, k) => s + (o[k] || 0) * pr[k] * 1.1 * tradeMod(w, c, 'buy', k), 0), bought = {};
  for (const k of TRADE_KEYS) if (p.buy[k] > 0) bought[k] = p.buy[k];
  let cost = priceOf(bought), room = coin ? rev + E.treasury : rev;
  if (cost > room && cost > 0) { const f = room / cost; for (const k of Object.keys(bought)) { bought[k] = Math.floor(bought[k] * f); if (bought[k] < 1) delete bought[k] } cost = priceOf(bought) }
  run.back = bought; if (run.ship) run.ship.hold = run.back; run.rev = rev; run.cost = cost; run.net = coin ? rev - cost : 0;
  neighAfterTrade(w, c, { sell: run.sold, buy: bought, luxury: 0 });
}
function tripHome(w, run) {                                         // back at the dock: goods and coins reach the village
  const E = w.econ, coin = money(w), t = T2(w), L = t.ledger, p = run.plan, n = w.neigh.find(x => x.id === p.nid); let tax = 0;
  for (const k of TRADE_KEYS) if (run.back[k]) w.stock[k] = Math.min(w.cap(), w.stock[k] + run.back[k]);
  if (coin) {
    const net = run.net, comm = w.rx && w.rx.C > 0.4, rate = comm ? 1 : taxRate(w);
    if (net >= 0) { tax = net * rate; E.treasury += tax; distribute(w, net - tax) } else E.treasury = Math.max(0, E.treasury + net);
    const d = run.ship ? w.buildings.get(run.ship.dock) : null; if (d && dockTier(d) >= 3) E.treasury += 2 + 0.03 * Math.max(0, run.rev);          // customs at a port
    E.sold += run.rev; E.bought += run.cost;
  }
  L.trips++; L.exports += Math.round(run.rev); L.imports += Math.round(run.cost); L.profit += Math.round(coin ? run.net : run.rev - run.cost);
  const std = t.routes[p.nid]; if (std) { std.trips++; std.profit += Math.round(run.net) }
  const list = o => Object.entries(o || {}).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing';
  const text = `${run.skipperName} returns from ${n ? n.name : 'abroad'} by ${p.label}: sold ${list(run.sold)}, brought home ${list(run.back)}${coin ? ` (${run.net >= 0 ? '+' : ''}${Math.round(run.net)} coins${tax > 0 ? ', ' + Math.round(tax) + ' to the treasury' : ''})` : ''}.`;
  w.emit('trade', text, { trip: true }); t.trips.unshift({ day: w.day, text, net: Math.round(coin ? run.net : run.rev - run.cost), to: n ? n.name : '' }); if (t.trips.length > 8) t.trips.pop();
  t.last = w.day; t.nextPlan = Math.min(t.nextPlan, w.day + 3); t.active = null; if (run.ship) { run.ship.hold = null }
}
/* a trip is abandoned (the skipper is hurt or called away) or lost at sea */
function tripEnd(w, why) {
  const t = T2(w), a = t.active; if (!a) return; t.active = null; const run = a.run;
  if (run) {
    if (why === 'lost' && run.ship && w.disc && run.plan) historyWreck(w, run.ship.x, run.ship.y, `A trading ship was lost on the way to ${(w.neigh.find(n => n.id === run.plan.nid) || {}).name || 'a far port'}.`);
    if (why === 'lost') { const pr = money(w) ? w.econ.prices : BASE_PRICE; t.ledger.lost += Math.round(TRADE_KEYS.reduce((s, k) => s + ((run.hold && run.hold[k]) || 0) * pr[k] + ((run.back && run.back[k]) || 0) * pr[k], 0)) }
    else for (const part of [run.hold, run.back]) for (const k of TRADE_KEYS) if (part && part[k]) w.stock[k] = Math.min(w.cap(), w.stock[k] + part[k]);
    if (run.ship) { run.ship.hold = null; run.ship.home() }
  }
  t.nextPlan = w.day + 5;
}
