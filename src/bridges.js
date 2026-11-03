'use strict';
/* ==========================================================================
   bridges.js — v0.21. Where a strait or river cuts the village off from land
   it could use, the council may ask builders to span it, tile by tile from
   one bank. A bridge is weighed like every other big choice: the walking it
   saves (or the new land it opens) against timber, stone and builders' time,
   and it is refused where it would shut a dock off from the open sea.
   ========================================================================== */
function initBridges(w) { w.bridges = { list: [], next: 1, nextPlan: 30, skip: {}, built: 0 } }
const BR = w => w.bridges || (initBridges(w), w.bridges);
const isWaterT = t => t === TERR.DEEP || t === TERR.SHALLOW;
const landOK = (w, i) => { const t = w.terr[i]; return (t === TERR.GRASS || t === TERR.SAND || t === TERR.ROCK || t === TERR.FORD || t === TERR.BRIDGE) && !w.feat[i] && !w.bmap[i] };

function bridgeCaches(w) { w._reg = null; w._sea = null; w._pc = null; w.terrVer = (w.terrVer || 0) + 1 }
/* would these tiles still leave every dock open to the sea? */
function seaStaysOpen(w, tiles) {
  const { W, H } = CFG, N = W * H, blocked = new Set(tiles), m = new Uint8Array(N), q = new Int32Array(N); let h = 0, t = 0;
  const push = i => { if (!m[i] && isWaterT(w.terr[i]) && !blocked.has(i)) { m[i] = 1; q[t++] = i } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x) } for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1) }
  while (h < t) { const u = q[h++], x = u % W, y = (u / W) | 0; if (x > 0) push(u - 1); if (x < W - 1) push(u + 1); if (y > 0) push(u - W); if (y < H - 1) push(u + W) }
  for (const d of w.of('dock')) { if (!d.dir) continue; const mx = Math.floor(d.x + 0.5 + d.dir[0]), my = Math.floor(d.y + 0.5 + d.dir[1]); if (!m[my * W + mx]) return false }
  return true;
}
function findCrossings(w) {
  const { W, H } = CFG, reg = landRegions(w), h = { x: w.cx, y: w.cy + 2 }, home = reg.label[h.y * W + h.x], B = BR(w), out = [], seen = new Set();
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let y = Math.max(3, w.cy - 40); y < Math.min(H - 3, w.cy + 40); y += 2) for (let x = Math.max(3, w.cx - 50); x < Math.min(W - 3, w.cx + 50); x += 2) {
    const i = y * W + x; if (!landOK(w, i) || !w.walkable(i) || w.terr[i] === TERR.FORD || reg.label[i] !== home) continue;       // always start from our own, reachable bank
    for (const [dx, dy] of DIRS) {
      let L = 0, xx = x + dx, yy = y + dy; while (L <= 5 && xx > 1 && yy > 1 && xx < W - 2 && yy < H - 2 && isWaterT(w.terr[yy * W + xx])) { L++; xx += dx; yy += dy } if (L < 1 || L > 5) continue;
      const j = yy * W + xx; if (xx < 2 || yy < 2 || xx >= W - 2 || yy >= H - 2 || !landOK(w, j) || !w.walkable(j)) continue;
      const key = Math.min(i, j) + ':' + Math.max(i, j); if (seen.has(key) || (B.skip[key] || 0) > w.day) continue; seen.add(key);
      if (B.list.some(b => Math.hypot(b.ax - x, b.ay - y) < 6)) continue;
      const tiles = []; for (let k = 1; k <= L; k++) tiles.push((y + dy * k) * W + x + dx * k);
      out.push({ ax: x, ay: y, bx: xx, by: yy, dx, dy, L, tiles, key, same: reg.label[i] === reg.label[j], newLand: reg.label[j] !== home && reg.label[i] === home ? reg.sizes[reg.label[j]] : 0, near: Math.hypot(x - w.cx, y - w.cy) });
    }
  }
  return out;
}
const bankReachable = (w, c) => !!w.search(w.cx, w.cy + 2, (x, y) => Math.abs(x - c.ax) + Math.abs(y - c.ay) <= 1, 110);       // builders carry timber with a limited reach
function bridgeValue(w, c) {            // coins' worth of walking saved or land opened, against timber and builders' time
  let saved = 0, gain = 0;
  if (c.newLand >= 150) { gain += Math.min(220, c.newLand / 5) }
  if (c.same || !c.newLand) { const goal = (x, y) => x === c.bx && y === c.by, p = w.search(c.ax, c.ay, goal, 260); saved = p ? Math.max(0, p.length - c.L - 2) : 260; if (p === null) gain += 60; gain += Math.min(260, saved) * 1.1 }
  const mat = w.has('masonry') ? { wood: 1, stone: 3 } : { wood: 3, stone: 0 }, perTile = mat.wood * 3 + mat.stone * 4 + 4, cost = c.L * perTile;
  const cb = costBenefit(w, { gain, cost, risk: 0.02, stake: cost, days: c.L * 0.5, crew: 1, min: 1.8 });
  return { ...cb, mat, saved, gain, cost };
}
function bridgeDay(w) {
  const B = BR(w);
  for (const b of B.list) if (b.state === 'building') {
    if (w.day - (b.lastDone || b.day) > 50) { if (b.bp && b.bp.alive) { b.bp.alive = false; w.bps.splice(w.bps.indexOf(b.bp), 1); w.bpAt.delete(b.bp.idx) } b.bp = null; b.state = 'abandoned'; B.skip[b.ax + ':' + b.ay] = w.day + 300; w.say(`The bridge at ${b.ax},${b.ay} is abandoned: the builders could not finish it.`); continue }
    if (!b.bp || !b.bp.alive) { if (b.done >= b.tiles.length) { b.state = 'done'; continue } nextTile(w, b) }
  }
  if (w.day < B.nextPlan) return; B.nextPlan = w.day + 14;
  if (!w.has('carpentry') || w.day < 40 || w.vills.length < 18 || B.list.some(b => b.state === 'building') || B.list.length >= 6) return;
  if (w.stock.wood < 30) return;
  const cands = findCrossings(w).filter(c => c.near < 48); if (!cands.length) return;
  cands.sort((a, b) => (b.newLand - a.newLand) || a.L - b.L || a.near - b.near);
  let best = null;
  for (const c of cands.slice(0, 5)) { if (!bankReachable(w, c)) { B.skip[c.key] = w.day + 120; continue } const v = bridgeValue(w, c); if (v.go && (!best || v.ratio > best.v.ratio) && seaStaysOpen(w, c.tiles)) best = { c, v }; else if (!v.go) B.skip[c.key] = w.day + 90 }
  if (best) proposeBridge(w, best.c, best.v);
}
function proposeBridge(w, c, v) {
  const B = BR(w), mat = v.mat.stone ? 'stone' : 'timber', what = c.newLand >= 150 ? 'opening land beyond the water' : 'saving a long walk around';
  ask(w, {
    kind: 'bridge', topic: `A ${c.L}-tile ${mat} bridge at ${c.ax},${c.ay} could span the water, ${what}. It would cost about ${Math.round(v.cost)} in ${mat} and builders' time and save or open about ${Math.round(v.gain)} coins' worth of walking and land (ratio ${Math.round(v.ratio * 10) / 10}).`,
    options: [{ id: 'build', text: `Build the bridge (${c.L} tiles of ${mat})` }, { id: 'wait', text: 'Not now: keep the money and wood for other things' }], default: v.ratio >= 2.5 ? 'build' : 'wait',
    apply: (id, sp, reason, src) => {
      if (id === 'wait') { B.skip[c.key] = w.day + 60; recordDecision(w, `not to build the bridge at ${c.ax},${c.ay} for now.`, sp, src); return }
      const b = { id: B.next++, ax: c.ax, ay: c.ay, bx: c.bx, by: c.by, dx: c.dx, dy: c.dy, tiles: c.tiles.slice(), done: 0, state: 'building', mat: v.mat.stone ? 'stone' : 'timber', cost: v.mat, day: w.day, bp: null };
      B.list.push(b); nextTile(w, b); recordDecision(w, `to build a ${b.mat} bridge of ${c.L} tiles.`, sp, src); w.say(`Builders start a ${b.mat} bridge at ${c.ax},${c.ay}.`); w.gov.nextMeeting = w.day + 3;
    }
  });
}
function nextTile(w, b) {
  const i = b.tiles[b.done]; if (i === undefined) { b.state = 'done'; return }
  const x = i % CFG.W, y = (i / CFG.W) | 0; if (w.bpAt.has(i)) { b.bp = w.bpAt.get(i); return }
  b.bp = makeBp(w, 'bridge', x, y, { cost: { wood: b.cost.wood, stone: b.cost.stone }, bridge: b.id });
}
function bridgeTileDone(w, bp) {
  const B = BR(w), b = B.list.find(x => x.id === bp.bridge); if (!b) return;
  w.terr[bp.idx] = TERR.BRIDGE; w.fish[bp.idx] = 0; if (b.mat === 'stone') (w.bridgeStone || (w.bridgeStone = new Set())).add(bp.idx); b.done++; b.lastDone = w.day; bridgeCaches(w);
  if (b.done >= b.tiles.length) { b.state = 'done'; b.bp = null; B.built++; w.emit('bridge', `The ${b.mat} bridge at ${b.ax},${b.ay} is finished. People cross the water on foot.`, { bridge: b }) } else nextTile(w, b);
}
/* saved bridges put their tiles back after the terrain is regenerated from the seed */
function restoreBridges(w) {
  const B = BR(w); for (const b of B.list) { b.bp = null; for (let k = 0; k < b.done; k++) { const i = b.tiles[k]; w.terr[i] = TERR.BRIDGE; if (b.mat === 'stone') (w.bridgeStone || (w.bridgeStone = new Set())).add(i) } if (b.state === 'building') b.state = 'building' }
  bridgeCaches(w);
}
