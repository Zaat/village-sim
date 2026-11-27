/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   resources.js (v0.37): one place that says what each resource is for, how
   much is wanted now, which way the store is moving and why it may be short.
   A data table (RESOURCES) plus resourceInfo(w, id); the side panel reads it,
   so a new resource later (iron, cloth, salt) is one more row, not new UI.
   Pure: no page access, no random numbers.
   ========================================================================== */
const RESOURCES = {
  food: { name: 'Food', col: '#e0a458', want: w => resourceTargets(w).tgt.food, use: 'eaten every day; stores spoil a little', subs: 'farms, fishing, hunting, trade' },
  wood: { name: 'Wood', col: '#a8743c', want: w => w.season === 3 ? winterWood(w) * Math.max(1, CFG.DPS - w.seasonDay + 1) : fuelWant(w, [0.2, 0.5, 1][w.season] || 1), use: 'houses, boats, and firewood all winter', subs: 'coal, better hearths, timber by boat' },
  stone: { name: 'Stone', col: '#9aa3ab', want: w => resourceTargets(w).tgt.stone * 0.5, use: 'walls, roads, quays and great works', subs: 'trade' }
};
/* net change per day over the last two samples of the stock series (they are 4 days apart) */
function resourceTrend(w, id) {
  const a = w.stats && w.stats.s && w.stats.s[id]; if (!a || a.length < 2) return 0;
  return (a[a.length - 1] - a[a.length - 2]) / (w.stats.every || 4);
}
function resourceInfo(w, id) {
  const R = RESOURCES[id], have = w.stock[id], want = R.want(w), r = want > 0 ? have / want : 1, trend = resourceTrend(w, id);
  const state = r >= 1 ? 'ok' : r >= 0.6 ? 'watch' : 'short'; let note = '';
  if (id === 'wood') {
    const per = winterWood(w), save = Math.round((1 - fuelFx(w)) * 100), t = w.timber;
    note = `A winter burns about ${per} a day (${per * CFG.DPS} in all)` + (save ? `, ${save}% saved by technology` : '') + (t && t.runs ? `; boats have fetched ${t.wood}` : '') + (state !== 'ok' && t && t.why ? `; no timber run: ${t.why}` : '');
  } else if (id === 'food') note = `${Math.round(w.pop * 0.85)} eaten a day`;
  return { id, name: R.name, col: R.col, have, want, state, trend, note, use: R.use, subs: R.subs };
}
