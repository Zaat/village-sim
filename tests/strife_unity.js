// After a faction secedes, does the village's unity actually rise, and for how long? (#239)  node tests/strife_unity.js
// A day-110 village loses eight adults to a peaceful secession. Unity (the cohesion axis) should jump at once, stay above where it was
// for the next two months, and the divisions that weigh on it (strifeDiv) should ease by the relief the departure brings.
const L = require('./lib'), vm = require('vm');
const S = L.loadSim('World,CFG,adultsOf,secede,strifeDiv,deserializeWorld'); L.oldPace(S.CFG);
const w = L.loadCheckpoint(S, 'def777_d110');
let ok = 0, bad = 0; const check = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); cond ? ok++ : bad++ };
const council = new Set(w.gov.council.map(c => c.id)), ms = S.adultsOf(w).filter(v => !council.has(v.id) && v.age < 60).slice(0, 8);
const g = { name: 'The Test Folk', members: ms.map(v => v.id), op: {} };
const c0 = w.regime.ax.cohes, d0 = S.strifeDiv(w), pop0 = w.vills.length;
S.secede(w, g, ms[0], 'peace');
const c1 = w.regime.ax.cohes, d1 = S.strifeDiv(w);
check('some of the village left', w.vills.length < pop0, pop0 + ' -> ' + w.vills.length);
check('unity jumps at once', c1 >= c0 + 0.1 || c1 >= 0.99, c0.toFixed(3) + ' -> ' + c1.toFixed(3));
check('the weight of divisions eases', d1 < d0 - 0.1, d0.toFixed(3) + ' -> ' + d1.toFixed(3));
let peak = c1, low = c1, above = 0, days = 0;
for (let d = 1; d <= 70; d++) { for (let t = 0; t < 1200; t++) w.step(); days++; const c = w.regime.ax.cohes; peak = Math.max(peak, c); low = Math.min(low, c); if (c > c0) above++ }
check('unity stays above where it was for two months', above >= 60, above + ' of ' + days + ' days above ' + c0.toFixed(3) + ' (low ' + low.toFixed(3) + ', peak ' + peak.toFixed(3) + ')');
check('the relief lasts', w.strife.reliefUntil > w.day, 'until day ' + w.strife.reliefUntil + ', now ' + w.day);
console.log(`strife_unity: ${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
