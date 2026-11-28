/* node tools/daychange_probe.js [checkpoint] [days] : how long the day-change tick takes against an ordinary tick (v0.40, #134/#135) */
const { loadSim, loadCheckpoint } = require('../tests/lib'); const S = loadSim('World,CFG,deserializeWorld');
const w = loadCheckpoint(S, process.argv[2] || 'cont351_y26'), days = +process.argv[3] || 4, TPD = S.CFG.TPD; const ts = [], dayTicks = [];
for (let i = 0; i < TPD * 1.5; i++) w.step();                       // settle (the first day or two are slow while the code warms up)
for (let i = 0; i < TPD * days; i++) { const t0 = performance.now(); w.step(); const dt = performance.now() - t0; ts.push(dt); if (w.tick % TPD === 0) dayTicks.push(dt) }
ts.sort((a, b) => a - b); const p = q => ts[Math.floor(q * (ts.length - 1))];
const prof = Object.entries(w.dbg.prof).sort((a, b) => b[1].max - a[1].max).slice(0, 6).map(([k, v]) => `${k} max ${v.max.toFixed(1)}`).join(', ');
const worst = ts.slice(-6).map(x => x.toFixed(1)).join(', ');
console.log(`six worst ticks ${worst} ms`);
console.log(`pop ${w.pop}: median ${p(0.5).toFixed(2)} ms, p99 ${p(0.99).toFixed(2)}, worst ${ts[ts.length - 1].toFixed(1)}; day-change ticks ${dayTicks.map(x => x.toFixed(1)).join(', ')} ms | ${prof}`);
