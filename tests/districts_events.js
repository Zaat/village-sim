// v0.37 Metropolis: districts read off the buildings, the crowd shared by free beds, group orders steer a district's hands
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,districtsBuild,districtsDay,districtsView,districtAt,districtHands,districtOrder,DIST,crowdSize,serializeWorld,deserializeWorld');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const days = (w, n) => { for (let i = 0; i < 1200 * n; i++) w.step() };
const w = loadCheckpoint(S, 'lake765_y7'); days(w, 2);
ok(S.crowdSize(w) > 0, 'the checkpoint town has a crowd: ' + S.crowdSize(w));
const D = S.districtsBuild(w);
ok(D.list.length >= 3, 'several districts: ' + D.list.length);
ok(D.total === w.pop, `district populations add up to the town: ${D.total} vs ${w.pop}`);
ok(D.list.every(d => d.pop >= d.focus && d.crowd >= 0 && d.homes > 0 && d.name), 'every district has homes, a name and a sane population');
ok(new Set(D.list.map(d => d.name)).size === D.list.length, 'district names are unique: ' + D.list.map(d => d.name).join(', '));
ok(D.list.reduce((a, d) => a + d.homes, 0) === w.houses().length, 'every home belongs to a district');
// looking does not change the game: the page's copy is separate from the sim's
const before = JSON.stringify(S.serializeWorld(w)).length; w._dist = null; w._distUI = null; S.districtsView(w); ok(w._dist === null && w._distUI, 'the view keeps its own copy');
// orders only count while playing, and only the share of the crowd living in that district
S.districtsDay(w); const d0 = w._dist.list.slice().sort((a, b) => b.crowd - a.crowd)[0];
S.districtOrder(w, d0.key, 'farm'); ok(S.districtHands(w).food === 0, 'orders do nothing in Watch mode');
w.play.on = true; const h = S.districtHands(w); ok(Math.abs(h.food - d0.crowd / w.crowd.n) < 1e-9 && h.wood === 0, 'a farm order sends that district\'s share to food: ' + JSON.stringify(h));
S.districtOrder(w, d0.key, null); ok(S.districtHands(w).food === 0, 'an order can be cleared');
// the order changes what the crowd makes
const a = loadCheckpoint(S, 'lake765_y7'), b = loadCheckpoint(S, 'lake765_y7'); days(a, 3); days(b, 3);
for (const x of [a, b]) { x.stock.wood = 50; x.stock.food = 9000 }
S.districtsDay(b); for (const d of b._dist.list) S.districtOrder(b, d.key, 'stone'); b.play.on = true;
const s0 = [a.stock.stone, b.stock.stone]; days(a, 8); days(b, 8);
ok(b.stock.stone - s0[1] > a.stock.stone - s0[0], `all districts on stone out-quarry the default: ${Math.round(b.stock.stone - s0[1])} vs ${Math.round(a.stock.stone - s0[0])}`);
// saving keeps the orders
const c = S.deserializeWorld(JSON.parse(JSON.stringify(S.serializeWorld(b)))); ok(c.play && c.play.dorders && Object.keys(c.play.dorders).length === Object.keys(b.play.dorders).length, 'orders survive a save');
console.log(fail ? fail + ' FAILED' : 'districts_events ok'); process.exit(fail ? 1 : 0);
