/* node tools/watch_close_pairs.js [seeds] [years] : WATCH ONLY (never fails). Looks for two buildings of the same plaza or market kind placed very close together
   (including a queued blueprint beside a finished one), because Albert saw two market squares side by side (v0.40 build, open-items 14).
   Output: one row per map and seed with the pairs found (kind, distance in tiles, days they were placed). */
const { loadSim } = require('../tests/lib');
const S = loadSim('World,CFG'); S.CFG && require('../tests/lib').oldPace && require('../tests/lib').oldPace(S.CFG);
const seeds = (process.argv[2] || '12,5,7').split(',').map(Number), years = +(process.argv[3] || 10), MAPS = ['island', 'continent', 'lakeland', 'river'], KINDS = ['market', 'plaza', 'tavern'], NEAR = 12;
let total = 0;
for (const map of MAPS) for (const seed of seeds) {
  const w = new S.World(seed, { map }), seen = new Map(), pairs = [];
  for (let d = 0; d < years * 32 * 4; d++) {
    for (let t = 0; t < 1200; t++) w.step();
    const items = [...w.buildings.values(), ...(w.bps || []).filter(b => b.alive && b.type !== 'road' && b.type !== 'upgrade')].filter(b => KINDS.includes(b.type));
    for (const b of items) { const k = b.type + ':' + (b.id || b.x + ',' + b.y); if (!seen.has(k)) seen.set(k, { type: b.type, x: b.x, y: b.y, day: w.day }) }
  }
  const list = [...seen.values()];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; if (a.type !== b.type) continue; const dist = Math.hypot(a.x - b.x, a.y - b.y); if (dist <= NEAR) pairs.push(`${a.type} ${dist.toFixed(1)} tiles apart, placed day ${a.day} and ${b.day}`) }
  total += pairs.length; console.log(`${map.padEnd(10)} seed ${String(seed).padEnd(4)} pop ${w.pop}  ${list.length} placed  ${pairs.length ? 'CLOSE PAIRS: ' + pairs.join('; ') : 'none close'}`);
}
console.log(total ? `WATCH: ${total} close pair(s) found` : 'no close pairs');
