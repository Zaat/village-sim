// Performance gate for a big town: node tests/perf_metropolis.js - starts from a continent town of about 2,900 people (tests/checkpoints/cont351_y26;
// node tools/checkpoint.js make ... or the diag run in the v0.37 notes), settles a quarter of a year, times one year, fails above 1.8 ms per tick (the small-town gate in tests/perf.js is 1.5).
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,deserializeWorld'); const LIMIT = 1.8;       // measured about 1.3 on a quiet machine; the margin covers other tests running side by side
const w = loadCheckpoint(S, 'cont351_y26'); const yr = S.CFG.TPD * 32, settle = yr / 4; let t0 = 0, n = 0;
for (let t = 0; t < settle + yr; t++) { if (t === settle) t0 = performance.now(); w.step() }
const ms = (performance.now() - t0) / yr;
console.log(`perf_metropolis: pop ${w.pop}, ${w.buildings.size} buildings, ${ms.toFixed(3)} ms/tick (limit ${LIMIT}) - ${ms <= LIMIT ? '1 passed, 0 failed' : '0 passed, 1 failed'}`);
process.exit(ms <= LIMIT ? 0 : 1);
