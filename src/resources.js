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
    note = `A winter burns about ${per} a day (${per * CFG.DPS} in all)` + (save ? `, ${save}% saved by technology` : '') + (t && t.runs ? `; boats have fetched ${t.wood}` : '') + (state !== 'ok' && t && t.why ? `; no timber run: ${t.why}` : '') + '. ' + energyText(w);
  } else if (id === 'stone') {
    note = depositText(w, 'stone') + (w.energy && w.energy.runs ? ` Boats have fetched ${w.energy.ran} from far shores.` : '');
    for (const k of ['coal', 'oil', 'peat']) { const t = depositText(w, k); if (t) note += ' ' + t }
  } else if (id === 'food') note = `${Math.round(w.pop * 0.85)} eaten a day; ${farmLadderText(w)}`;
  return { id, name: R.name, col: R.col, have, want, state, trend, note, use: R.use, subs: R.subs };
}

/* ==========================================================================
   v0.40 the farming ladder: what the technologies add up to for a harvest, step by step, and the next step.
   Reads the same factors the farmers use (crop rotation, the heavy plough, and the "farm" effects of the other techs); it changes nothing.
   Soil tiredness (each field's fertility), the weather and hardship are separate and shown beside it.
   ========================================================================== */
const FARM_STEPS = ['rotation', 'plow', 'crop3', 'agronomy', 'fertilizer', 'mechfarm', 'hybrids', 'greenrev'];
const FARM_STEP_NAME = { rotation: 'crop rotation', plow: 'the heavy plough', crop3: 'the three-field system', agronomy: 'selective breeding', fertilizer: 'fertilizer', mechfarm: 'machines in the fields', hybrids: 'hybrid crops', greenrev: 'the green revolution' };
function farmMult(w, extra) {
  const has = id => !!w.tech.known[id] || id === extra; let fx = 0;
  for (const id in TECHS) if (TECHS[id].fx && TECHS[id].fx.farm && (has(id))) fx += TECHS[id].fx.farm;
  return (has('rotation') ? 1.25 : 1) * (has('plow') ? 1.25 : 1) * (1 + fx);
}
function farmLadder(w) {
  const now = farmMult(w), done = FARM_STEPS.filter(id => w.tech.known[id]), next = FARM_STEPS.find(id => !w.tech.known[id]) || null;
  const nextGain = next ? farmMult(w, next) / now - 1 : 0, fields = w.of('farm'), fert = fields.length ? fields.reduce((a, b) => a + (b.fert ?? 1), 0) / fields.length : 1;
  const per = Math.round(CFG.FARM_YIELD * now * fert * (w.settings.survival ? 0.75 : 1) * hardOf(w).crop);
  return { mult: now, done, next, nextName: next ? FARM_STEP_NAME[next] : '', nextGain, fert, per, steps: FARM_STEPS.map(id => ({ id, name: FARM_STEP_NAME[id], known: !!w.tech.known[id] })) };
}
function farmLadderText(w) {
  const L = farmLadder(w), now = `Technology multiplies a harvest by ${L.mult.toFixed(2)}`, soil = L.fert < 0.9 ? ` The soil is ${Math.round((1 - L.fert) * 100)}% tired.` : '';
  return `${now}; an average field gives about ${L.per} food. ` + (L.next ? `Next: ${L.nextName} (about ${Math.round(L.nextGain * 100)}% more).` : 'The ladder is complete.') + soil;
}
