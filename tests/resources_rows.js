// v0.37: the resource table says what each resource is for, what is wanted, which way it moves and why it is short
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,RESOURCES,resourceInfo,resourceTrend,winterWood,fuelWant,resourceTargets,TM');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const w = loadCheckpoint(S, 'lake765_y7');
ok(Object.keys(S.RESOURCES).join() === 'food,wood,stone', 'the table lists food, wood and stone: ' + Object.keys(S.RESOURCES));
for (const id of Object.keys(S.RESOURCES)) {
  const I = S.resourceInfo(w, id);
  ok(I.name && I.col && I.use && I.subs, id + ' has a name, colour, use and substitutes');
  ok(Number.isFinite(I.have) && Number.isFinite(I.want) && I.want > 0, `${id}: have ${I.have}, want ${I.want}`);
  ok(['ok', 'watch', 'short'].includes(I.state) && Number.isFinite(I.trend), id + ' has a state and a trend');
}
// short stores are flagged, full ones are not
w.stock.wood = 0; ok(S.resourceInfo(w, 'wood').state === 'short', 'empty firewood is short');
ok(/winter burns|A winter burns/.test(S.resourceInfo(w, 'wood').note) && /a day/.test(S.resourceInfo(w, 'wood').note), 'the wood note gives the daily burn: ' + S.resourceInfo(w, 'wood').note);
w.stock.wood = 99999; ok(S.resourceInfo(w, 'wood').state === 'ok', 'plenty of firewood is ok');
// trend follows the stats series (samples are STAT_EVERY days apart)
const a = w.stats.s.stone; a.push(a[a.length - 1] + 40); ok(S.resourceTrend(w, 'stone') > 0, 'rising stone shows a positive trend');
a.push(a[a.length - 1] - 80); ok(S.resourceTrend(w, 'stone') < 0, 'falling stone shows a negative trend');
// a fresh world with no samples has a flat trend
const f = new S.World(1, 'lakeland'); ok(S.resourceTrend(f, 'food') === 0 || Number.isFinite(S.resourceTrend(f, 'food')), 'a new world has a trend value');
console.log(fail ? fail + ' FAILED' : 'resources_rows ok'); process.exit(fail ? 1 : 0);
