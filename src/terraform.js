'use strict';
/* ==========================================================================
   terraform.js — v0.27 works that reshape the land. Knowledge of grading,
   drainage, terracing, dikes, reclamation and earthmoving lets the village turn
   bare rock, damp shore and shallow water into ground it can build and farm on.
   Every work is weighed by the council like a bridge: the land it wins against
   the timber, stone and labour it costs. Finished works are saved as tile
   changes and put back when a world loads.
   ========================================================================== */
const TERRA = {
  level: { name: 'Level the ground', tech: 'grading', from: [TERR.ROCK], to: TERR.GRASS, n: 3, per: { wood: 2, stone: 0 }, days: 3, what: 'bare rock beside the village levelled into house plots' },
  drain: { name: 'Drain the shore', tech: 'drainage', from: [TERR.SAND], to: TERR.GRASS, n: 6, per: { wood: 2, stone: 1 }, days: 5, what: 'damp shore sand drained into firm meadow' },
  terrace: { name: 'Cut terraces', tech: 'terracing', from: [TERR.ROCK], to: TERR.GRASS, n: 8, per: { wood: 2, stone: 2 }, days: 7, what: 'a rocky slope cut into terraced fields' },
  dike: { name: 'Raise a dike', tech: 'dikes', from: [TERR.SHALLOW], to: TERR.SAND, n: 5, per: { wood: 3, stone: 3 }, days: 8, water: true, what: 'shallows closed off by an earth wall and drained to sand' },
  polder: { name: 'Reclaim a polder', tech: 'reclamation', from: [TERR.SHALLOW], to: TERR.GRASS, n: 9, per: { wood: 3, stone: 4 }, days: 10, water: true, what: 'shallows pumped out and turned into fields' },
  earth: { name: 'Move earth', tech: 'earthworks', from: [TERR.ROCK, TERR.PEAK, TERR.SHALLOW], to: TERR.GRASS, n: 14, per: { wood: 2, stone: 6 }, days: 12, water: true, what: 'hills and shallows levelled into open ground' }
};
function initTerra(w) { w.terra = { done: [], work: null, next: 40, built: 0, tiles: 0, skip: {} } }
const TR = w => w.terra || (initTerra(w), w.terra);
const bareAt = (w, i) => !w.feat[i] && !w.bmap[i] && !w.road[i] && !w.bpAt.has(i) && w.claim[i] < 0;
/* the cluster of tiles nearest the village that the work could change, or null */
function terraSite(w, K) {
  const { W, H } = CFG, from = new Set(K.from), near = new Set(), cand = [];
  const nearDock = (x, y) => w.of('dock').some(d => Math.hypot(d.x - x, d.y - y) < 4);
  for (let y = Math.max(3, w.cy - 30); y < Math.min(H - 3, w.cy + 30); y++) for (let x = Math.max(3, w.cx - 30); x < Math.min(W - 3, w.cx + 30); x++) {
    const i = y * W + x; if (!from.has(w.terr[i]) || !bareAt(w, i)) continue; const d = Math.hypot(x - w.cx, y - w.cy); if (d < 7 || d > 30) continue;
    if (K.water && nearDock(x, y)) continue;
    let reach = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = i + dy * W + dx, t = w.terr[j]; if ((t === TERR.GRASS || t === TERR.SAND) && !w.feat[j]) { reach = true; break } }
    if (reach) cand.push({ i, d });
  }
  if (!cand.length) return null; cand.sort((a, b) => a.d - b.d); const set = new Set(cand.map(c => c.i)), tiles = [cand[0].i], seen = new Set(tiles);
  for (let h = 0; h < tiles.length && tiles.length < K.n; h++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const j = tiles[h] + dy * W + dx; if (set.has(j) && !seen.has(j) && tiles.length < K.n) { seen.add(j); tiles.push(j) } }
  if (tiles.length < Math.min(3, K.n)) return null; if (K.water && !seaStaysOpen(w, tiles)) return null; return tiles;
}
/* how short of open ground is the village? 0 = plenty, 1 = hemmed in (bare grass near the centre against the people who need homes and fields) */
function landScarcity(w) {
  const { W, H } = CFG; let free = 0;
  for (let y = Math.max(3, w.cy - 26); y < Math.min(H - 3, w.cy + 26); y++) for (let x = Math.max(3, w.cx - 26); x < Math.min(W - 3, w.cx + 26); x++) { const i = y * W + x; if (w.terr[i] === TERR.GRASS && bareAt(w, i)) free++ }
  const housing = w.beds() - w.pop < 4 ? 0.2 : 0; return clamp(1 - free / (Math.max(20, w.pop) * 16) + housing, 0, 1);
}
function terraValue(w, K, tiles) {
  const sc = landScarcity(w), gain = tiles.length * (8 + 55 * sc), wood = K.per.wood * tiles.length, stone = K.per.stone * tiles.length, cost = wood * 3 + stone * 4 + 4;
  const cb = costBenefit(w, { gain, cost, risk: 0.02, stake: cost, days: K.days, crew: 1, min: 1.2 }); return { ...cb, wood, stone, cost };
}
function terraDay(w) {
  const T = TR(w), wk = T.work;
  if (wk) {
    if (w.day < wk.at) return;
    for (const i of wk.tiles) { w.terr[i] = wk.to; w.fish[i] = 0 }
    T.done.push({ tiles: wk.tiles, to: wk.to, kind: wk.kind, day: w.day }); T.built++; T.tiles += wk.tiles.length; T.work = null; bridgeCaches(w);
    w.emit('terraform', `The works are done: ${TERRA[wk.kind].what}. ${wk.tiles.length} tiles of new ground.`, { kind: wk.kind, tiles: wk.tiles.length }); return;
  }
  if (w.day < T.next) return; T.next = w.day + 12;
  if (w.pop < 20 || (w.stock.wood < 60 && w.stock.stone < 30)) return;
  let best = null;
  for (const k in TERRA) {
    const K = TERRA[k]; if (!w.has(K.tech) || (T.skip[k] || 0) > w.day) continue;
    const tiles = terraSite(w, K); if (!tiles) { T.skip[k] = w.day + 90; continue }
    const v = terraValue(w, K, tiles); if (w.stock.wood < v.wood + 40 || w.stock.stone < v.stone + 15) continue;
    if (v.go && (!best || v.ratio > best.v.ratio)) best = { k, K, tiles, v };
  }
  if (best) proposeTerra(w, best);
}
function proposeTerra(w, b) {
  const T = TR(w), { k, K, tiles, v } = b;
  ask(w, {
    kind: 'terraform', topic: `${K.name}: ${K.what} (${tiles.length} tiles, about ${v.wood} timber and ${v.stone} stone, ${K.days} days of work). The new ground is worth about ${Math.round(v.gain)} coins' worth of homes and fields.`,
    options: [{ id: 'build', text: `Do the work (${tiles.length} tiles)` }, { id: 'wait', text: 'Not now: keep the timber and stone for other things' }], default: v.ratio >= 2 ? 'build' : 'wait',
    apply: (id, sp, reason, src) => {
      if (id === 'wait') { T.skip[k] = w.day + 45; recordDecision(w, `not to ${K.name.toLowerCase()} for now.`, sp, src); return }
      if (w.stock.wood < v.wood || w.stock.stone < v.stone) return; w.stock.wood -= v.wood; w.stock.stone -= v.stone;
      T.work = { kind: k, tiles, to: K.to, at: w.day + K.days }; recordDecision(w, `to ${K.name.toLowerCase()}.`, sp, src); w.say(`Workers begin to ${K.name.toLowerCase()}: ${K.what}.`); w.gov.nextMeeting = w.day + 3;
    }
  });
}
/* saved works put their tiles back after the terrain is regenerated from the seed */
function restoreTerra(w) { const T = TR(w); for (const d of T.done) for (const i of d.tiles) { w.terr[i] = d.to; w.fish[i] = 0 } bridgeCaches(w) }
