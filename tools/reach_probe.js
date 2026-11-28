/* node tools/reach_probe.js [seeds comma list] : how much land, wood, stone and game lies beyond where villagers can walk from the camp (day 1).
   Walking counts trees as passable (they can be felled). Output: one row per map type and size.
   v0.40: "by boat" also counts land within 10 tiles of water that a boat can sail to from the home shore (a landing party for stone runs and timber; expedition sites are seeded within 3 tiles of the shore). The release target is under 5% unreachable by boat. */
const { loadSim } = require('../tests/lib');
const S = loadSim('World,CFG,TERR,FEAT');
const seeds = (process.argv[2] || '12,5,7').split(',').map(Number), { TERR, FEAT } = S, MAPS = ['island', 'archipelago', 'continent', 'peninsula', 'lakeland', 'river'];
const row = [];
for (const size of ['standard', 'large']) for (const map of MAPS) {
  const acc = { byBoat: 0, stoneB: 0, land: 0, reach: 0, treesU: 0, trees: 0, stoneU: 0, stone: 0, animalsU: 0, animals: 0, n: 0 };
  for (const seed of seeds) {
    const w = new S.World(seed, { map }, size === 'large' ? [340, 236] : undefined), { W, H } = S.CFG, N = W * H, seen = new Uint8Array(N), q = [w.cy * W + w.cx];
    const land = i => { const t = w.terr[i]; return t === TERR.GRASS || t === TERR.SAND || t === TERR.ROCK || t === TERR.FORD || t === TERR.BRIDGE };
    if (land(q[0])) seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && land(j)) { seen[j] = 1; q.push(j) } } }
    const wat = i => w.terr[i] <= TERR.SHALLOW, sea = new Uint8Array(N), wq = []; for (let i = 0; i < N; i++) if (seen[i]) { const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!sea[j] && wat(j)) { sea[j] = 1; wq.push(j) } } }
    for (let h = 0; h < wq.length; h++) { const i = wq[h], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!sea[j] && wat(j)) { sea[j] = 1; wq.push(j) } } }
    const boat = new Uint8Array(N); for (let i = 0; i < N; i++) if (sea[i]) { const x = i % W, y = (i / W) | 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) boat[ny * W + nx] = 1 } }
    const boat10 = new Uint8Array(N); for (let i = 0; i < N; i++) if (sea[i]) { const x = i % W, y = (i / W) | 0; for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && dx * dx + dy * dy <= 100) boat10[ny * W + nx] = 1 } }
    let landN = 0, reach = 0, treesU = 0, trees = 0, stoneU = 0, stone = 0, byBoat = 0, stoneB = 0;
    for (let i = 0; i < N; i++) { if (!land(i)) continue; landN++; const f = w.feat[i], tree = f === FEAT.OAK || f === FEAT.PINE, st = f === FEAT.STONE || w.terr[i] === TERR.ROCK; if (seen[i]) reach++; else if (boat10[i]) byBoat++; if (st && !seen[i] && !boat10[i]) stoneB++; if (tree) { trees++; if (!seen[i]) treesU++ } if (st) { stone++; if (!seen[i]) stoneU++ } }
    let aU = 0, a = 0; for (const an of (w.animals || [])) { const i = Math.round(an.y) * W + Math.round(an.x); a++; if (!seen[i]) aU++ }
    acc.byBoat += byBoat; acc.stoneB += stoneB; acc.land += landN; acc.reach += reach; acc.treesU += treesU; acc.trees += trees; acc.stoneU += stoneU; acc.stone += stone; acc.animalsU += aU; acc.animals += a; acc.n++;
  }
  const p = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
  row.push(`${size.padEnd(8)} ${map.padEnd(11)} land ${Math.round(acc.land / acc.n)} tiles, unreachable on foot ${p(acc.land - acc.reach, acc.land)}, by boat (landing party up to 10 tiles) or foot ${p(acc.land - acc.reach - acc.byBoat, acc.land)} | trees beyond ${p(acc.treesU, acc.trees)} | stone/rock beyond ${p(acc.stoneU, acc.stone)} (by boat with a landing party of up to 10 tiles ${p(acc.stoneB, acc.stone)}) | animals beyond ${p(acc.animalsU, acc.animals)}`);
}
console.log(row.join('\n'));
