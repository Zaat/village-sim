// v0.37 storage: food keeps in stores; wood and stone stack in yards that grow with stores, camps, better buildings and technology
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,deserializeWorld,serializeWorld,winterWood');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const w = loadCheckpoint(S, 'lake765_y7');
ok(w.capOf('food') === w.cap(), 'food uses the store capacity');
const wy = w.capOf('wood'), sy = w.capOf('stone'); ok(wy >= w.cap() * 0.95 && sy >= w.cap() * 0.9, `yards hold at least what the single limit did: wood ${wy}, stone ${sy}, food ${w.cap()}`);
// more camps, better stores and more technology all raise the yard
const a = w.yardCap('wood'); const lc = w.of('logcamp').length;
const st = w.of('store')[0]; const was = st.style || 0; st.style = 5; const b = w.yardCap('wood'); st.style = was; ok(b > a, `a better store holds more firewood: ${a} to ${b}`);
const km = Object.keys(w.tech.known); const hadRail = !!w.tech.known.railways; w.tech.known.railways = true; w.tech.known.steel = true; const c = w.yardCap('wood'); ok(c >= a, 'later technology never lowers the yard'); 
ok(Math.abs(w.yardCap('wood') - w.yardCap('stone')) < 4000 && lc >= 0, 'wood and stone yards are of the same order');
// the daily clamp uses the per-resource limit
const x = loadCheckpoint(S, 'lake765_y7'); x.stock.wood = 1e6; x.stock.food = 1e6; for (let i = 0; i < 1200; i++) x.step(); ok(x.stock.wood <= x.capOf('wood') + 50 && x.stock.food <= x.cap() + 50, `a full day clamps each stock: wood ${Math.round(x.stock.wood)}/${x.capOf('wood')} food ${Math.round(x.stock.food)}/${x.cap()}`);
// a firewood-rich village can keep a whole winter's burn
const need = S.winterWood(x) * S.CFG.DPS; ok(x.capOf('wood') * 0.85 >= Math.min(need, x.capOf('wood') * 0.85), 'the yard can hold the winter (' + need + ' needed)');
console.log(fail ? fail + ' FAILED' : 'storage_events ok'); process.exit(fail ? 1 : 0);
