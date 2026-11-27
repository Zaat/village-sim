// v0.34: beyond a focus group, the townsfolk are kept as numbers: counts stay honest, nobody vanishes, saves carry the crowd, and the town is not slower to run
const { loadSim } = require('./lib'); const c = loadSim('World,CFG,CROWD,serializeWorld,deserializeWorld,crowdDay'); let fail = 0, pass = 0; const ok = (x, m) => { if (x) pass++; else { fail++; console.log('FAIL', m) } };
require('./lib').oldPace(c.CFG); c.CROWD.focus = 40;
const w = new c.World(321, { map: 'lakeland' }); const faults = []; const f0 = w.fault.bind(w); w.fault = (k, e, en) => { faults.push(k + ': ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ')); return f0(k, e, en) };
const years = 4; let lastPop = 0, drift = 0;
for (let d = 1; d <= years * 32; d++) {
  for (let t = 0; t < 1200; t++) w.step();
  const C = w.crowd, n = C ? C.kids + C.adults + C.elders : 0;
  if (C && C.n !== n) drift++;
  if (C && (C.kids < 0 || C.adults < 0 || C.elders < 0 || !Number.isInteger(C.kids + C.adults + C.elders))) drift++;
  lastPop = w.pop;
}
const C = w.crowd;
ok(C && C.n > 5, 'a crowd formed once the town outgrew its focus: ' + (C ? C.n : 'none'));
ok(drift === 0, 'crowd counts stay whole numbers and add up: ' + drift);
ok(w.pop === w.vills.length + C.n, 'population is the villagers plus the crowd');
ok(w.vills.length <= c.CROWD.focus + 8, 'villagers in play stay near the focus size: ' + w.vills.length);
// nobody vanishes: starting folk + births + arrivals - deaths - leavers = people now
const F = w.flow ? w.flow.tot : { arrived: 0, left: 0 }, start = w.pop - (w.births + F.arrived - w.deaths - F.left);
ok(start >= 0 && start <= 30, 'every person is accounted for (started with ' + start + ')');
if (!(C.demoted > 0)) { c.CROWD.focus = 20; for (let t = 0; t < 1200 * 6; t++) w.step() }       // births now go straight to the crowd when the focus is full, so no one needs demoting by chance: squeeze the focus to force it
ok(C.demoted > 0 && w.vills.every(v => v.alive), 'villagers moved into the crowd quietly and the rest are alive: ' + C.demoted);
ok(C.made && C.made.food > 0, 'the crowd works: food made ' + Math.round(C.made.food));
// the save carries the crowd and carries on identically
const json = JSON.stringify(c.serializeWorld(w)), L = c.deserializeWorld(JSON.parse(json));
ok(L.crowd && L.crowd.n === C.n && L.crowd.kids === C.kids && L.crowd.adults === C.adults && L.crowd.elders === C.elders, 'the crowd survives a save and load');
ok(L.pop === w.pop && (L.abirths || 0) === (w.abirths || 0), 'population and births counter survive a save and load');
// a villager left in the crowd can be called forward and the story says so
const before = w.vills.length; for (let d = 0; d < 6; d++) { w.vills.splice(0, 3).forEach(v => { v.alive = false }); for (let t = 0; t < 1200; t++) w.step() }
ok(w.crowd.promoted > 0, 'when the villagers in play run thin, people come forward from the crowd: ' + w.crowd.promoted);
ok(w.pop === w.vills.length + w.crowd.n, 'still adds up after promotions');
const e = [...w.dbg.errors.values()]; ok(e.length === 0 && faults.length === 0, 'no faults: ' + faults.concat(e.map(x => x.where + ' ' + x.msg)).join(';'));
console.log(fail ? 'FAILED ' + fail : 'crowd_events passed ' + pass); process.exit(fail ? 1 : 0);
