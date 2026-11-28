// A queued upgrade of a building that is gone (burned, collapsed, cleared) must not make the save unloadable (v0.40).
// Before the fix: save and load failed with "(intermediate value)... is not iterable" and the village could never be opened again.
const L = require('./lib'); const S = L.loadSim('World,CFG,serializeWorld,deserializeWorld,makeBp');
let bad = 0; const ck = (ok, m) => { if (!ok) { bad++; console.log('FAIL', m) } else console.log('ok  ', m) };
const w = new S.World(41, {}); for (let t = 0; t < 1200 * 6; t++) w.step();
const h = w.houses()[0]; const bp = S.makeBp(w, 'upgrade', h.x, h.y, { target: h.id, toStyle: 2 }); w.bps.push(bp);
w.removeBuilding(h);
ck(!w.bps.some(b => b.id === bp.id) && !w.bpAt.has(h.y * S.CFG.W + h.x), 'removing a building cancels the upgrade queued for it');
for (let t = 0; t < 1200; t++) w.step();
let r1 = null; try { r1 = S.deserializeWorld(JSON.parse(JSON.stringify(S.serializeWorld(w)))) } catch (e) { ck(false, 'the village loads after the building was removed: ' + e.message) }
if (r1) ck(r1.vills.length === w.vills.length && !r1.loadSkipped, 'the village loads after the building was removed');
// a save written by an older version: the dangling upgrade and an unknown kind are in the file
const d = JSON.parse(JSON.stringify(S.serializeWorld(w)));
d.bps.push({ id: 9001, type: 'upgrade', x: 3, y: 3, target: 999999, toStyle: 2, have: { wood: 0, stone: 0 }, prog: 0 });
d.bps.push({ id: 9002, type: 'oldkind', x: 4, y: 4, have: { wood: 0, stone: 0 }, prog: 0 });
let r2 = null; try { r2 = S.deserializeWorld(d) } catch (e) { ck(false, 'an old save with a dangling upgrade loads: ' + e.message) }
if (r2) { ck(r2.loadSkipped === 2, 'the two plans that cannot be kept are left out (' + r2.loadSkipped + ')'); for (let t = 0; t < 1200 * 2; t++) r2.step(); ck(r2.dbg.total === 0, 'the loaded village runs two days with no faults') }
console.log(bad ? 'save_dangling: ' + bad + ' FAILED' : 'save_dangling: all passed'); process.exit(bad ? 1 : 0);
