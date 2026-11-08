// Performance gate: node tests/perf.js  - 10 simulated years, fails above LIMIT ms per tick.
const S = require('./lib').loadSim('World,CFG'); const LIMIT = 1.5, YEARS = 10;
const w = new S.World(12, { map: 'island' }); const n = S.CFG.TPD * 32 * YEARS, t0 = performance.now();
for (let t = 0; t < n; t++) w.step();
const ms = (performance.now() - t0) / n;
console.log(`perf: ${YEARS} years, pop ${w.vills.length}, ${ms.toFixed(3)} ms/tick (limit ${LIMIT}) - ${ms <= LIMIT ? '1 passed, 0 failed' : '0 passed, 1 failed'}`);
process.exit(ms <= LIMIT ? 0 : 1);
