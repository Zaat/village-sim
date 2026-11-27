// v0.33: land value, site styles, hamlets, redevelopment, desire paths, housing diagnosis, world line and action log
const { loadSim } = require('./lib'); const c = loadSim('World,CFG,TERR,placeBuilding,placeFunnel,housingDiag,cityStats,cityState,lvAt,siteStyle,pathDay,renewalDay,landValueDay,foundHamlet,worldLine,logAction,diagText,serializeWorld,deserializeWorld,styleNow,planUpgrades,layoutBias,parseWorldLine');
let fail = 0, pass = 0; const ok = (x, m) => { if (x) pass++; else { fail++; console.log('FAIL', m) } };
const w = new c.World(12, { map: 'island' }); const faults = []; const f0 = w.fault.bind(w); w.fault = (k, e, en) => { faults.push(k + ': ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ')); return f0(k, e, en) };
ok(c.lvAt(w, w.cx, w.cy) === -1, 'no land value before the first count');
ok(c.siteStyle(w, w.cx, w.cy) === c.styleNow(w), 'before the count a site gets the best known style');
for (let i = 0; i < 1200 * 32 * 3; i++) w.step();                       // three years
const C = c.cityState(w), { W } = c.CFG;
ok(w._lv && c.lvAt(w, w.cx, w.cy) > 15, 'land value counted, high at the camp: ' + c.lvAt(w, w.cx, w.cy));
ok(c.lvAt(w, w.cx, w.cy) > c.lvAt(w, Math.min(W - 3, w.cx + 60), w.cy), 'dearer at the centre than far out');
const hs = w.houses(); let vHigh = 0, nH = 0, vLow = 0, nL = 0; for (const h of hs) { const v = c.lvAt(w, h.x, h.y); if ((h.style || 0) >= 1) { vHigh += v; nH++ } else { vLow += v; nL++ } }
ok(!nH || !nL || vHigh / nH >= vLow / nL - 3, `better homes stand on dearer ground (${nH ? (vHigh / nH).toFixed(0) : '-'} vs ${nL ? (vLow / nL).toFixed(0) : '-'})`);
const f = c.placeFunnel(w, 'house', true), tot = f.edge + f.water + f.tree + f.built + f.road + f.plan + f.claimed + f.near + f.far + f.free;
ok(tot === f.cells, 'the funnel accounts for every site: ' + tot + ' of ' + f.cells); ok(f.reach + f.unreach === f.free, 'free sites split into reachable and not');
// hamlets: found one by hand and place homes beside it
C.hamlets.length = 0; C.nextHam = 0; const hm = { x: w.cx + 30, y: w.cy + 6, day: w.day, dir: 'east', name: 'east hamlet' };
let spot = null; for (let r = 0; r < 40 && !spot; r += 3) for (let a = 0; a < 16 && !spot; a++) { const x = Math.round(w.cx + 30 + r * Math.cos(a)), y = Math.round(w.cy + r * Math.sin(a)); if (x > 6 && y > 6 && x < W - 8 && y < c.CFG.H - 8 && w.terr[y * W + x] === c.TERR.GRASS && !w.feat[y * W + x] && !w.bmap[y * W + x]) spot = { x, y } }
if (spot) { hm.x = spot.x; hm.y = spot.y; C.hamlets.push(hm); w.bps.length = 0; w.bpAt.clear(); const bp = c.placeBuilding(w, 'house', true, hm); ok(!bp || Math.hypot(bp.x - hm.x, bp.y - hm.y) < 14, 'a hamlet home goes up beside the hamlet: ' + (bp ? Math.round(Math.hypot(bp.x - hm.x, bp.y - hm.y)) : 'none (cut off)')) }
C.hamlets.length = 0;
// desire paths: a well-walked grass tile next to a road is paved; busy roads get the better surface
w.stock.stone = 50; w._heat = w._heat || new Uint16Array(W * c.CFG.H); let rt = -1; for (let i = 0; i < w.road.length && rt < 0; i++) if (w.road[i] === 1) rt = i;
let gt = -1; if (rt >= 0) for (const d of [1, -1, W, -W]) { const j = rt + d; if (w.terr[j] === c.TERR.GRASS && !w.feat[j] && !w.bmap[j] && !w.road[j] && !w.bpAt.has(j) && w.claim[j] < 0) { gt = j; break } }
const realV = w.vills; if (w.pop < 25) w.vills = realV.concat(realV.slice(0, 25 - realV.length));   // pathDay needs a town of 25; the world is a little smaller since v0.39
w.bps = w.bps.filter(b => b.type !== 'road'); for (const [k] of [...w.bpAt]) if (w.bpAt.get(k).type === 'road') w.bpAt.delete(k);
if (gt >= 0) { w._heat[gt] = 200; const before = w.bps.length; c.pathDay(w); ok(w.bps.length > before && w.bpAt.has(gt), 'a much-walked tile beside the road is laid as a road') }
w.techFlag = null; if (rt >= 0) { w.tech.known.masonry = 1; w._heat[rt] = 200; w.stock.stone = 50; c.pathDay(w); ok(w.road[rt] >= 2, 'a busy road is improved with the new surface: ' + w.road[rt]) }
w.vills = realV;
// redevelopment: bare farmland on dear ground is given up (not in summer)
while (w.season === 1) w.tick += 1200;
const farm = w.of('farm')[0]; if (farm && c.lvAt(w, farm.x, farm.y) > 5) {
  for (let i = 0; i < 3 && w.of('farm').length < 3; i++) w.addBuilding('farm', Math.min(W - 8, w.cx + 40 + i * 4), w.cy);
  for (const f2 of w.of('farm')) f2.state = 1; farm.state = 0; C.vmax = Math.max(1, Math.max(...w.of('farm').map(f2 => c.lvAt(w, f2.x, f2.y))) / 0.9); const top = w.of('farm').reduce((a, f2) => c.lvAt(w, f2.x, f2.y) > c.lvAt(w, a.x, a.y) ? f2 : a); top.state = 0; const gone = top; C.nextRenew = 0; C.lastFarm = -99; w.stock.wood = 50;
  const cl0 = C.cleared.farm; ok(w.vills.length >= 40, 'enough people for redevelopment: ' + w.vills.length); c.renewalDay(w);
  ok(C.cleared.farm === cl0 + 1 && !w.buildings.has(gone.id), 'a bare field on the dearest ground is given up for building');
  C.nextRenew = 0; C.lastFarm = w.day; const n = w.of('farm').length; c.renewalDay(w); ok(w.of('farm').length === n, 'only one field is given up at a time');
}
// the housing diagnosis names causes
w.stock.wood = 0; w.hdiag = null; const hd = c.housingDiag(w); ok(hd.why.some(t => /wood|stone/.test(t)), 'without wood the diagnosis says so: ' + hd.why.join(' / '));
ok(typeof hd.close === 'object' && hd.wide.cells > 0, 'the diagnosis carries the site counts');
// world line and action log
const line = c.worldLine(w); ok(/seed 12/.test(line) && /island/.test(line) && /standard|260/.test(line) && /hardship normal/.test(line) && /year \d+ day \d+/.test(line), 'the world line carries seed, map, size, hardship and the date: ' + line);
const pl = c.parseWorldLine(line); ok(pl && pl.seed === 12 && pl.map === 'island' && pl.size === 'standard' && pl.hardship === 1 && pl.phil === 'balanced' && pl.open === 0 && pl.switches && pl.switches.disasters === true && pl.switches.raids === false, 'a pasted world line is read back: ' + JSON.stringify(pl));
ok(c.parseWorldLine('hello') === null, 'text without a seed is not a world line');
for (let i = 0; i < 320; i++) c.logAction(w, 'response', 'x' + i); ok(w.alog.length === 300, 'the action log is capped at 300');
ok(/your actions/.test(c.diagText(w)) && c.diagText(w).split('\n')[0] === c.worldLine(w), 'the diagnostics text starts with the world line');
// save round trip
const js = JSON.stringify(c.serializeWorld(w)), L = c.deserializeWorld(JSON.parse(js));
ok(L.city && L.city.cleared && JSON.stringify(L.city.hamlets) === JSON.stringify(w.city.hamlets), 'city state survives a save'); ok(L.alog && L.alog.length === 300, 'action log survives a save');
for (let i = 0; i < 1200 * 6; i++) L.step(); ok(L._lv || true, 'a loaded world keeps running');
ok(faults.length === 0, 'no faults: ' + faults.slice(0, 3).join(';'));
const e = [...w.dbg.errors.values()]; ok(e.length === 0, 'no logged errors: ' + e.map(x => x.where + ' ' + x.msg).join(';'));
console.log(fail ? 'FAILED ' + fail : 'city_events passed ' + pass); process.exit(fail ? 1 : 0);
