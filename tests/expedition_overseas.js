// v0.40 reach: land across the water is a site too, reached by boat; explorers carry a pennant; flight shows the whole map
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,TERR,DISC,landRegions,sitePath,expedStart,genSites,exploredFrac,skyDay,planExpeditions,SITE_KINDS');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
// --- seeding: an island map has sites across the water, a continent has none; all over-sites stand on other land
for (const [map, any] of [['island', true], ['continent', false]]) {
  const w = new S.World(777, { map }), D = S.DISC(w); D.gen = true; S.genSites(w); const reg = S.landRegions(w), home = reg.label[w.cy * S.CFG.W + w.cx], over = D.sites.filter(s => s.over);
  ok(any ? over.length >= 1 : over.length === 0, `${map}: sites across the water: ${over.length}`);
  ok(over.every(s => { const l = reg.label[s.y * S.CFG.W + s.x]; return l > 0 && l !== home && !S.SITE_KINDS[s.kind].sea }), `${map}: they stand on other land`);
}
// --- an expedition by boat to a site on another island: the path ends beside the shore and the leader comes home with the find
const w = loadCheckpoint(S, 'isl555_d200'), D = S.DISC(w); D.gen = true; const reg = S.landRegions(w), home = reg.label[w.cy * S.CFG.W + w.cx];
const boat = w.boats.find(b => b.crew == null && b.state === 'moored' && !b.noSea && w.buildings.get(b.dock)); ok(!!boat, 'a free boat is moored');
let site = null; for (let r = 8; r < 90 && !site; r += 2) for (let a = 0; a < 6.28 && !site; a += 0.1) { const x = Math.round(w.cx + Math.cos(a) * r), y = Math.round(w.cy + Math.sin(a) * r); if (x < 3 || y < 3 || x >= S.CFG.W - 3 || y >= S.CFG.H - 3) continue; const i = y * S.CFG.W + x, l = reg.label[i]; if (w.terr[i] === S.TERR.GRASS && l > 0 && l !== home && reg.sizes[l] >= 40 && !w.feat[i]) { const s = { id: D.nid++, kind: 'ruin', x, y, known: true, done: false, uses: 1, mat: null, prize: 60, lore: false, risk: 0, over: true }; if (S.sitePath(w, s, boat)) site = s } }
ok(!!site, 'a site on another island can be reached by water');
if (site) {
  D.sites.push(site); const path = S.sitePath(w, site, boat), last = path[path.length - 1], lx = last % S.CFG.W, ly = (last / S.CFG.W) | 0; ok(Math.hypot(lx - site.x, ly - site.y) <= 3.3 && w.terr[last] <= S.TERR.SHALLOW, 'the boat stops in water beside the shore');
  const ex = { id: D.nid++, site: site.id, mode: 'sea', state: 'pending', until: w.day + 4, leader: null, escorts: 0, kind: 'ruin' }; D.exped.push(ex);
  const lead = w.vills.find(v => v.isAdult() && v.age < 50); lead.energy = 90; const done0 = D.done, treas0 = w.stock.wood + w.stock.stone + w.stock.food;
  ok(S.expedStart(w, ex, lead) === true && ex.state === 'running' && lead.jobKind === 'expedition', 'the leader sets out by boat');
  for (let t = 0; t < 1200 * 20 && ex.state === 'running'; t++) w.step();
  ok(ex.state === 'done' && ex.how === 'ok' && D.done === done0 + 1, 'the leader returns: ' + JSON.stringify({ state: ex.state, how: ex.how, done: D.done }));
}
// --- flight shows the world from above, a few tiles a day, until the whole map is known
const w2 = loadCheckpoint(S, 'isl555_d200'); w2.tech.known.aviation = 1; const f0 = S.exploredFrac(w2); for (let d = 0; d < 200; d++) S.skyDay(w2);
ok(S.exploredFrac(w2) > f0 && S.exploredFrac(w2) > 0.97, `aviation reveals the map: ${f0.toFixed(2)} -> ${S.exploredFrac(w2).toFixed(2)}`);
const w3 = loadCheckpoint(S, 'isl555_d200'); const g0 = S.exploredFrac(w3); for (let d = 0; d < 50; d++) S.skyDay(w3); ok(S.exploredFrac(w3) === g0, 'no aviation, no sky survey');
console.log(fail ? 'FAILED ' + fail : 'expedition_overseas ok'); process.exit(fail ? 1 : 0);
