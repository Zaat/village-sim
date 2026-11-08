// Performance gate: node tests/perf.js  - 6 simulated years, the last 2 timed, fails above LIMIT ms per tick.
const S = require('./lib').loadSim('World,CFG'); const LIMIT = 1.5, YEARS = 6, TIMED = 2;  // simulate 6 years, time the last 2 (pop ~150-190, the heaviest stretch we can afford to run every time)
const w = new S.World(12, { map: 'island' }); const yr = S.CFG.TPD * 32; let t0 = 0;
for (let t = 0; t < yr * YEARS; t++) { if (t === yr * (YEARS - TIMED)) t0 = performance.now(); w.step() }
const ms = (performance.now() - t0) / (yr * TIMED);
console.log(`perf: ${YEARS} years (last ${TIMED} timed), pop ${w.vills.length}, ${ms.toFixed(3)} ms/tick (limit ${LIMIT}) - ${ms <= LIMIT ? '1 passed, 0 failed' : '0 passed, 1 failed'}`);
process.exit(ms <= LIMIT ? 0 : 1);
