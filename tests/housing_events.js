// v0.32: when the ground near the village is full, houses are sited further out (suburbs and hamlets) instead of not at all; deaths are logged
const { loadSim } = require('./lib'); const c = loadSim('World,CFG,placeBuilding,TERR,FEAT,deathKey'); let fail = 0, pass = 0; const ok = (x, m) => { if (x) pass++; else { fail++; console.log('FAIL', m) } };
const w = new c.World(321, { map: 'continent' }); for (let i = 0; i < 1200 * 4; i++) w.step();
const near = placeBuilding_(); function placeBuilding_() { return c.placeBuilding(w, 'house') }
ok(near && w.sprawl == null, 'with room near the village a house is placed close (no sprawl)');
// reserve the close ground (within 38 tiles) so nothing near is free
const { W, H } = c.CFG; let filled = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - w.cx, y - w.cy) < 42 && w.terr[y * W + x] === c.TERR.GRASS && !w.feat[y * W + x] && !w.bmap[y * W + x]) { w.claim[y * W + x] = 0; filled++ }
w.bps.length = 0; w.bpAt.clear();
const far = c.placeBuilding(w, 'house');
ok(filled > 200, 'close ground filled: ' + filled);
ok(far && Math.hypot(far.x - w.cx, far.y - w.cy) > 40, 'a house is still sited further out: ' + (far ? Math.round(Math.hypot(far.x - w.cx, far.y - w.cy)) : 'none'));
ok((w.sprawl || 0) >= 1, 'the move outward is counted');
ok(c.deathKey('froze to death') === 'cold' && c.deathKey('was killed in a raid') === 'fight' && c.deathKey('was killed by a wolf') === 'wolf' && c.deathKey('succumbed to the fever') === 'fever' && c.deathKey('starved') === 'starved' && c.deathKey('passed away peacefully of old age') === 'age', 'death causes are grouped');
const e = [...w.dbg.errors.values()]; ok(e.length === 0, 'no faults: ' + e.map(x => x.where + ' ' + x.msg).join(';'));
console.log(fail ? 'FAILED ' + fail : 'housing_events passed ' + pass); process.exit(fail ? 1 : 0);
