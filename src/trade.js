'use strict';
/* ==========================================================================
   trade.js — markets, money and merchants.
   Before coinage the village barters surplus for what it lacks. After coinage,
   trade earns coins: the profit is taxed into the village treasury (the rate is a
   council policy) and the rest goes to the people who produced the goods. Each
   merchant visit is put to the council as a choice of deals (Claude can deliberate).
   ========================================================================== */
const TRADE_KEYS = ['wood', 'stone', 'food'];
const BASE_PRICE = { wood: 3, stone: 4, food: 2 };
const FINE_PRICE = 40;
const TRADER_NAMES = ['the Saltroad traders', 'the Dunmere merchants', 'the Highfen peddlers', 'the Greywater caravan', 'the Ember Coast traders', 'the Willowmere guild', 'the Stonebridge company'];

function initEcon(w) { w.econ = { treasury: 0, prices: { ...BASE_PRICE }, trend: { wood: 0, stone: 0, food: 0 }, caravan: null, nextCaravan: 0, trades: [], sold: 0, bought: 0, spent: 0, comfort: 0 } }
const taxRate = w => clamp(0.25 + 0.15 * w.gov.policy.tax, 0.1, 0.4);
const money = w => w.has('coinage');

/* scarce goods cost more, plentiful goods less */
function updatePrices(w) {
  const { tgt, eff } = resourceTargets(w), E = w.econ;
  for (const k of TRADE_KEYS) { const r = eff[k] / Math.max(1, tgt[k]), p = BASE_PRICE[k] * clamp(Math.pow(1 / Math.max(0.25, r), 0.6), 0.5, 2.5); E.trend[k] = Math.round((p - E.prices[k]) * 10) / 10; E.prices[k] = Math.round(p * 10) / 10 }
}

/* what a given way of dealing with the visiting merchants would do right now */
function dealPreview(w, mode) {
  const E = w.econ, c = E.caravan, { tgt } = resourceTargets(w), coin = money(w), pr = coin ? E.prices : BASE_PRICE;
  const out = { mode, sell: {}, buy: {}, luxury: 0, revenue: 0, cost: 0, net: 0 };
  if (!c || mode === 'refuse') return out;
  for (const k of TRADE_KEYS) { const surplus = w.stock[k] - tgt[k] * 1.1; if (surplus >= 12) out.sell[k] = Math.min(Math.floor(surplus * 0.8), c.cap) }
  if (mode !== 'sell') for (const k of TRADE_KEYS) { const need = tgt[k] * 0.9 - (w.stock[k] + w.inbound[k]); if (need >= 10 && !out.sell[k]) out.buy[k] = Math.min(Math.ceil(need), c.cap) }
  const val = (o, f) => TRADE_KEYS.reduce((s, k) => s + (o[k] || 0) * pr[k] * f, 0);
  const scale = (o, f) => { for (const k of TRADE_KEYS) if (o[k]) { o[k] = Math.floor(o[k] * f); if (o[k] < 1) delete o[k] } };
  let rev = val(out.sell, 0.9), cost = val(out.buy, 1.1);
  if (!coin) {                                                         // barter: both sides must match in value
    if (!rev || !cost) { out.sell = {}; out.buy = {} } else if (rev > cost) scale(out.sell, cost / rev); else scale(out.buy, rev / cost);
    out.revenue = 0; out.cost = 0; return out;
  }
  const afford = rev + E.treasury; if (cost > afford) { scale(out.buy, afford / cost); cost = val(out.buy, 1.1) }
  out.revenue = Math.round(rev); out.cost = Math.round(cost); out.net = out.revenue - out.cost;
  if (mode === 'full') {
    const after = E.treasury + (out.net > 0 ? out.net * taxRate(w) : out.net);
    out.luxury = after >= FINE_PRICE + 30 ? Math.min(2, Math.ceil(w.vills.length / 40), Math.floor((after - 30) / FINE_PRICE)) : 0;
  }
  return out;
}
const hasTrade = d => Object.keys(d.sell).length > 0 || Object.keys(d.buy).length > 0 || d.luxury > 0;
function describeDeal(d, coin) {
  const list = o => Object.entries(o).map(([k, n]) => `${n} ${k}`).join(', ');
  const parts = []; if (Object.keys(d.sell).length) parts.push('sell ' + list(d.sell)); if (Object.keys(d.buy).length) parts.push('buy ' + list(d.buy)); if (d.luxury) parts.push(`buy ${d.luxury} bundle${d.luxury > 1 ? 's' : ''} of fine goods for everyone to enjoy`);
  return parts.join('; ') + (coin ? ` (net ${d.net >= 0 ? '+' : ''}${d.net} coins before tax)` : ' (a straight swap)');
}

function executeDeal(w, d, merchants) {
  const E = w.econ, coin = money(w), pr = coin ? E.prices : BASE_PRICE; let revenue = 0, cost = 0;
  for (const k of TRADE_KEYS) { if (d.sell[k]) { const n = Math.min(d.sell[k], w.stock[k]); w.stock[k] -= n; revenue += n * pr[k] * 0.9; d.sell[k] = n } if (d.buy[k]) { w.stock[k] = Math.min(w.cap(), w.stock[k] + d.buy[k]); cost += d.buy[k] * pr[k] * 1.1 } }
  let msg = '';
  if (coin) {
    const net = revenue - cost;
    if (net >= 0) { const tax = net * taxRate(w); E.treasury += tax; distribute(w, net - tax) } else E.treasury = Math.max(0, E.treasury + net);
    if (d.luxury) { E.treasury = Math.max(0, E.treasury - d.luxury * FINE_PRICE); E.comfort += d.luxury; for (const v of w.vills) if (v.isAdult()) v.mood = Math.min(100, v.mood + 3 * d.luxury) }
    E.sold += revenue; E.bought += cost; msg = ` Net ${net >= 0 ? '+' : ''}${Math.round(net)} coins${net > 0 ? `, of which ${Math.round(net * taxRate(w))} went to the treasury` : ''}.`;
  }
  const list = o => Object.entries(o).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ');
  const text = `${merchants} ${Object.keys(d.sell).length ? 'took ' + list(d.sell) : ''}${Object.keys(d.sell).length && (Object.keys(d.buy).length || d.luxury) ? ' and ' : ''}${Object.keys(d.buy).length ? 'delivered ' + list(d.buy) : ''}${d.luxury ? (Object.keys(d.buy).length ? ' plus ' : 'delivered ') + d.luxury + ' bundle' + (d.luxury > 1 ? 's' : '') + ' of fine goods' : ''}.${msg}`;
  w.emit('trade', text, { deal: d }); E.trades.unshift({ day: w.day, text }); if (E.trades.length > 12) E.trades.pop();
}
/* sale profit goes to the people whose work produced the goods */
function distribute(w, amount) {
  const ad = w.vills.filter(v => v.isAdult()); if (!ad.length || amount <= 0) return;
  const tot = ad.reduce((s, v) => s + (v.output || 0), 0); let paid = 0;
  for (const v of ad) { const share = Math.floor(amount * (tot > 0 ? (v.output || 0) / tot : 1 / ad.length)); v.coins = (v.coins || 0) + share; v.earned = (v.earned || 0) + share; paid += share; v.output = 0 }
  w.econ.treasury += amount - paid;
}

function negotiate(w) {
  const E = w.econ, c = E.caravan, coin = money(w), modes = ['full', 'essential', 'sell'], deals = {};
  for (const m of modes) deals[m] = dealPreview(w, m);
  const options = modes.filter(m => hasTrade(deals[m])).filter((m, i, a) => !(m !== 'full' && JSON.stringify(deals[m]) === JSON.stringify(deals[a[0]]) && hasTrade(deals[a[0]])))
    .map(m => ({ id: m, text: ({ full: 'Trade fully', essential: 'Trade for essentials only', sell: 'Sell surplus only' })[m] + ': ' + describeDeal(deals[m], coin) }));
  if (!options.length) { w.say(`${c.name} find little the village wants to trade, and move on.`); c.done = true; return }
  options.push({ id: 'refuse', text: 'Send the merchants away without trading' });
  const def = options.some(o => o.id === 'full') && (coin ? E.treasury >= 60 : true) ? 'full' : options.some(o => o.id === 'essential') ? 'essential' : options[0].id;
  const run = (id, sp, src) => { c.done = true; if (id === 'refuse') { w.say(`The council sends ${c.name} away without trading.`); return } const d = dealPreview(w, id); if (!hasTrade(d)) return; executeDeal(w, d, c.name.charAt(0).toUpperCase() + c.name.slice(1)); if (sp && sp.length && w.gov.council.length) recordDecision(w, `to ${id === 'full' ? 'trade fully with' : id === 'essential' ? 'trade for essentials with' : 'sell surplus to'} ${c.name}.`, sp, src) };
  if (!w.gov.council.length) return run(def, [], 'rules');
  const prices = TRADE_KEYS.map(k => `${k} ${E.prices[k]}`).join(', ');
  deliberate(w, { ...councilBase(w), kind: 'trade', topic: `${c.name} ${c.sea ? 'have anchored at the dock' : 'have set up at the market'}. ${coin ? `Prices today (coins each): ${prices}. The treasury holds ${Math.round(E.treasury)} coins and the tax rate is ${Math.round(taxRate(w) * 100)}%.` : 'The village has no coins yet, so only straight swaps are possible.'} How should the village deal with them?`, options, default: def, apply: (id, sp, reason, src) => run(id, sp, src) });
}

/* once a day */
function tradeDay(w) {
  const E = w.econ; if (!w.has('trade')) return;
  updatePrices(w);
  if (E.caravan && w.day >= E.caravan.leaves) { w.say(`${E.caravan.name.charAt(0).toUpperCase() + E.caravan.name.slice(1)} pack up and leave.`); E.caravan = null }
  if (E.caravan && money(w)) shopDay(w);
  if (!w.of('market').length || E.caravan || w.day < E.nextCaravan) return;
  if (w.season === 3 && w.r() < 0.5) { E.nextCaravan = w.day + 2; return }
  if (w.gov.policy.growth < -0.75 && w.r() < 0.7) { E.nextCaravan = w.day + 4; return }        // a closed village discourages visitors
  const sea = w.has('seatrade') && w.of('dock').length > 0 && w.r() < 0.45, name = TRADER_NAMES[(w.r() * TRADER_NAMES.length) | 0];
  E.caravan = { name, sea, arrived: w.day, leaves: w.day + 3, cap: sea ? 120 : 60, done: false }; E.nextCaravan = w.day + 5 + ((w.r() * 4) | 0);
  w.emit('trade', `${sea ? 'A merchant ship from ' + name.replace(/^the /, '') + ' drops anchor at the dock' : 'A caravan of ' + name.replace(/^the /, '') + ' arrives at the market'}.`, { caravan: E.caravan });
  if (money(w)) E.treasury += 4 * w.of('market').length;           // stall fees
  negotiate(w);
}
/* while merchants are in town, villagers with coins spend a little on comforts */
function shopDay(w) {
  const E = w.econ;
  for (const v of w.vills) if (v.isAdult() && (v.coins || 0) >= 25) { const s = Math.min(v.coins, 8 + ((w.r() * 12) | 0)); v.coins -= s; E.spent += s; v.mood = Math.min(100, v.mood + 4) }
}
