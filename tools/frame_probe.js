/* node tools/frame_probe.js [checkpoint] [days] [budgetMs] : frames the page would draw at 100x (it steps until the budget is spent, then draws), and how long each took (v0.40, #134/#135) */
const { loadSim, loadCheckpoint } = require('../tests/lib'); const S = loadSim('World,CFG,deserializeWorld');
const w = loadCheckpoint(S, process.argv[2] || 'cont351_y26'), days = +process.argv[3] || 6, budget = +process.argv[4] || 26, TPD = S.CFG.TPD;
for (let i = 0; i < TPD * 1.5; i++) w.step();
const frames = []; let ticks = 0; const end = w.tick + TPD * days;
let tickMax = 0;       // the page's rule (ui.js): stop early when the time left is less than a heavy tick would take, so a day-change tick does not push the frame past the budget
while (w.tick < end) { const t0 = performance.now(); let n = 33; while (n-- > 0) { const a = performance.now(); w.step(); ticks++; const b = performance.now(), dt = b - a; tickMax = Math.max(tickMax * 0.97, dt); if (b - t0 + tickMax > budget) break } frames.push(performance.now() - t0) }
frames.sort((a, b) => a - b); const q = p => frames[Math.floor(p * (frames.length - 1))];
console.log(`${frames.length} frames, ${(ticks / frames.length).toFixed(1)} ticks per frame: median ${q(0.5).toFixed(1)} ms, p95 ${q(0.95).toFixed(1)}, p99 ${q(0.99).toFixed(1)}, worst ${frames[frames.length - 1].toFixed(1)}; over 30 ms: ${frames.filter(x => x > 30).length}`);
