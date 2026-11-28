// v0.40: the causes-of-death card's all-time column agrees with the yearly columns (crowd illness is not filed under fever)
const { loadSim } = require('./lib'); const S = loadSim('World,CFG,deathTotals,DEATH_KINDS');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const w = new S.World(5, { map: 'island' });
w.causes = { 'succumbed to the fever': 100, 'passed away peacefully of old age': 50 };       // the raw text cannot tell crowd illness from fever
w.dyr = { 1: { sickness: 60, fever: 10, age: 30, adult: 70, elder: 30, child: 0 }, 2: { sickness: 40, age: 20, plague: 3, elder: 20, adult: 43 } };
const t = S.deathTotals(w);
ok(t.sickness === 100 && t.fever === 10 && t.age === 50 && t.plague === 3, 'all-time sums the yearly tally by kind: ' + JSON.stringify(t));
ok(!('adult' in t) && !('elder' in t), 'age groups are not causes');
for (const k of ['sickness', 'fever']) ok(t[k] >= (w.dyr[2][k] || 0), k + ' all-time is never below this year');
w.dyr = {}; const f = S.deathTotals(w); ok(f.fever === 100 && f.age === 50, 'no yearly tally: falls back to the raw causes');
console.log(fail ? fail + ' FAILED' : 'death_totals ok'); process.exit(fail ? 1 : 0);
