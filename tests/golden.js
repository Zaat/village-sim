// Golden trajectories: node tests/golden.js [--update]
// One 30-day run on each map type with a fixed seed. The signature of the end state is compared with tests/golden.json,
// so an unintended change in what the simulation does shows up here. After an intended change, run with --update and
// say so in the release notes.
const fs = require('fs'), path = require('path');
const S = require('./lib').loadSim('World,CFG,MAP_ORDER');
const FILE = path.join(__dirname, 'golden.json'), DAYS = 30, SEED = 4242;
const sig = (arch) => {
  const w = new S.World(SEED, { map: arch });
  for (let t = 0; t < S.CFG.TPD * DAYS; t++) w.step();
  const stock = Object.keys(w.stock).sort().map(k => k + ':' + Math.floor(w.stock[k] || 0)).join(',');
  const ids = w.vills.map(v => v.id).join(',');
  const pos = w.vills.reduce((a, v) => a + Math.floor(v.x) * 7 + Math.floor(v.y) * 13, 0);
  return { day: w.day, pop: w.vills.length, births: w.births || 0, deaths: w.deaths || 0, houses: w.houses().length, blds: w.buildings.size, tech: (w.tech && w.tech.done ? Object.keys(w.tech.done).length : 0), stock, ids, pos, faults: w.dbg ? w.dbg.total : 0 };
};
const now = {}; for (const a of S.MAP_ORDER) now[a] = sig(a);
if (process.argv.includes('--update') || !fs.existsSync(FILE)) { fs.writeFileSync(FILE, JSON.stringify(now, null, 1)); console.log('golden updated: ' + Object.keys(now).join(', ')); process.exit(0); }
const old = JSON.parse(fs.readFileSync(FILE, 'utf8')); let bad = 0, ok = 0;
for (const a of S.MAP_ORDER) {
  const same = old[a] && JSON.stringify(old[a]) === JSON.stringify(now[a]);
  if (same && !now[a].faults) ok++; else { bad++; console.log('DIFF ' + a + '\n  was ' + JSON.stringify(old[a]) + '\n  now ' + JSON.stringify(now[a])); }
}
console.log(`golden: ${ok} passed, ${bad} failed (${S.MAP_ORDER.length} map types, ${DAYS} days)`); process.exit(bad ? 1 : 0);
