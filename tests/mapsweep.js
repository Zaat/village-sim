// One short sweep per map type: node tests/mapsweep.js [seedsPerMap=3] [days=150]
const { spawn } = require('child_process'), path = require('path');
const per = +(process.argv[2] || 3), days = +(process.argv[3] || 150), MAPS = ['island', 'archipelago', 'continent', 'peninsula', 'lakeland', 'river'];
const jobs = []; for (const m of MAPS) for (let k = 0; k < per; k++) jobs.push({ m, seed: 101 + k * 37 });
const out = []; let next = 0, running = 0, done = 0;
function launch() { while (running < 2 && next < jobs.length) { const j = jobs[next++]; running++; const p = spawn(process.execPath, [path.join(__dirname, 'sweep_one.js'), j.seed, days], { env: { ...process.env, MAP: j.m }, stdio: ['ignore', 'pipe', 'pipe'] }); let buf = ''; p.stdout.on('data', d => buf += d);
  p.on('close', () => { running--; done++; try { out.push(JSON.parse(buf.trim().split('\n').pop())) } catch (e) { out.push({ seed: j.seed, map: j.m, crashed: true }) } if (done === jobs.length) report(); else launch() }) } }
function report() {
  console.log(`Map-type sweep: ${per} seeds x ${days} days\nmap          seed  pop peak min  homes tech found(land/total) regime                 err  ms/tick`);
  out.sort((a, b) => MAPS.indexOf(a.map) - MAPS.indexOf(b.map) || a.seed - b.seed);
  for (const r of out) { if (r.crashed) { console.log(r.map, r.seed, 'CRASHED'); continue } console.log(r.map.padEnd(12), String(r.seed).padEnd(5), String(r.pop).padStart(3), String(r.peak).padStart(4), String(r.minPop).padStart(4), String(r.houses).padStart(5), String(r.techs).padStart(4), `${r.landFound}/${r.landTotal} (of ${r.found === undefined ? '-' : r.found})`.padEnd(18), String(r.regime).padEnd(22), String(r.errors).padStart(3), String(r.msTick).padStart(7)) }
  const bad = out.filter(r => r.crashed || r.errors > 0 || r.pop < 8); console.log(bad.length ? `\nPROBLEMS: ${bad.length}` : '\nNo problems detected.');
}
launch();
