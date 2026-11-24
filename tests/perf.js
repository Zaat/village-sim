// Performance gate: node tests/perf.js  - starts from a year-4 island checkpoint (tests/checkpoints/isl12_y4; node tools/checkpoint.js make isl12_y4 12 island 128), lets it settle for 1 year, times 2 years, fails above LIMIT ms per tick.
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,deserializeWorld'); const LIMIT = 1.5, SETTLE = 1, TIMED = 2;
const w = loadCheckpoint(S, 'isl12_y4'); const yr = S.CFG.TPD * 32; let t0 = 0;
for (let t = 0; t < yr * (SETTLE + TIMED); t++) { if (t === yr * SETTLE) t0 = performance.now(); w.step() }
const ms = (performance.now() - t0) / (yr * TIMED);
console.log(`perf: checkpoint year 4 + ${SETTLE + TIMED} years (last ${TIMED} timed), pop ${w.pop}, ${ms.toFixed(3)} ms/tick (limit ${LIMIT}) - ${ms <= LIMIT ? '1 passed, 0 failed' : '0 passed, 1 failed'}`);
process.exit(ms <= LIMIT ? 0 : 1);
