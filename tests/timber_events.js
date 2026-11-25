// v0.37: timber runs by boat, a whole winter's firewood, the builders' reserve, fuel savings by technology
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,timberStart,timberDay,TM,fuelWant,fuelFx,woodReserve,winterWood,deserializeWorld,serializeWorld,evTotal,shipOf,openConcerns');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const days = (w, n) => { for (let i = 0; i < 1200 * n; i++) w.step() };
const w = loadCheckpoint(S, 'lake765_y7'); const wasWinter = w.season === 3; days(w, 6);                       // out of the winter the checkpoint starts in
ok(w.season === 0, 'spring, so boats may sail (season ' + w.season + ')');
// --- a whole winter, not a day
const per = S.winterWood(w), all = per * S.CFG.DPS;
ok(per > 20 && S.fuelWant(w, 1) <= all + 1 && S.fuelWant(w, 1) <= w.capOf('wood') * 0.85 + 1, `fuelWant is a winter's worth capped by the stores: ${S.fuelWant(w, 1)} of ${all} (cap ${w.cap()})`);
// --- the builders' reserve grows toward winter and is nothing for a small village
const res = []; for (const s of [0, 1, 2]) { Object.defineProperty(w, 'season', { get: () => s, configurable: true }); res.push(S.woodReserve(w)) } delete w.season;
ok(res[0] < res[1] && res[1] < res[2] && res[2] > 0, 'the reserve rises from spring to autumn: ' + res.map(Math.round));
const small = loadCheckpoint(S, 'lake765_y7'); small.vills.length = 5; small.crowd = null; ok(S.woodReserve(small) === 0, 'a village under 40 keeps no reserve');
// --- technology saves firewood
const w2 = loadCheckpoint(S, 'lake765_y7'); ok(S.fuelFx(w2) <= 1 && S.fuelFx(w2) >= 0.3, 'fuel factor stays between 0.3 and 1: ' + S.fuelFx(w2));
// --- the timber run
const cut = w.vills.find(v => v.isAdult() && v.age < 50 && v.role === 'woodcutter') || w.vills.find(v => v.isAdult() && v.age < 50); cut.energy = 90;
const boats = w.boats.filter(b => b.crew == null && b.state === 'moored' && w.buildings.get(b.dock)); ok(boats.length > 0, 'a free boat is moored: ' + boats.length);
w.stock.wood = 40; w.timber = null;
w.vills.forEach(v => { if (v !== cut) { v.steps = []; } });
const started = S.timberStart(w, cut); const t = S.TM(w);
ok(started === true && cut.jobKind === 'timber' && cut.boat && cut.boat.crew === cut.id, 'a woodcutter with low stores takes a boat: ' + JSON.stringify({ started, job: cut.jobKind, why: t.why }));
const w0 = w.stock.wood; let ran = 0; for (let d = 0; d < 6 && !(t.runs > 0); d++) { days(w, 1); ran++ }
ok(t.runs >= 1 && t.wood > 8, `the boat comes back with timber: ${t.runs} run(s), ${t.wood} loads in ${ran} day(s)`);
ok(S.evTotal(w, 'timber') >= 1 && S.evTotal(w, 'timber_wood') >= t.wood, 'statistics count the run and the wood');
ok(!cut.boat && w.boats.every(b => b.crew !== cut.id), 'the boat is moored and free again');
// --- not in winter, not when well supplied, not without boats
const w3 = loadCheckpoint(S, 'lake765_y7'); const c3 = w3.vills.find(v => v.isAdult() && v.age < 50); c3.energy = 90; ok(w3.season === 3 && S.timberStart(w3, c3) === false, 'no timber runs in winter');
days(w3, 6); w3.stock.wood = 3000; w3.timber = null; ok(S.timberStart(w3, c3) === false, 'no timber run when the stores are full');
w3.stock.wood = 10; c3.energy = 90; for (const b of w3.boats) b.crew = 999999; w3.timber = null; ok(S.timberStart(w3, c3) === false && /busy/.test(S.TM(w3).why), 'with every boat out the reason is recorded: ' + S.TM(w3).why);
// --- the firewood concern names the cause
w3.stock.wood = 5; days(w3, 14); const fuel = (S.openConcerns(w3) || []).find(c => c.key === 'fuel');
ok(!fuel || /firewood/.test(fuel.text), 'the firewood concern reads as firewood: ' + (fuel ? fuel.text : 'none open'));
// --- saving keeps the timber record
const d = S.serializeWorld(w); const back = S.deserializeWorld(JSON.parse(JSON.stringify(d))); ok(back.timber && back.timber.runs === t.runs && back.timber.wood === t.wood, 'a saved game keeps the timber record');
console.log(fail ? 'FAILED ' + fail : 'timber_events passed'); process.exit(fail ? 1 : 0);
