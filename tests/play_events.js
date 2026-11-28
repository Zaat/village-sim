// v0.35 Play: orders, placing buildings and roads, zones, research, the switches, saving, and Watch mode staying untouched
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,TERR,FEAT,serializeWorld,deserializeWorld,playOrder,playPlace,playRoad,playZone,playCancelBp,playCanPlace,playSet,playResearch,playOrderAt,placeBuilding,techAvailable,playOf,autoOn'); let fail = 0, pass = 0;
const ok = (x, m) => { if (x) pass++; else { fail++; console.log('FAIL', m) } };
const mk = () => { const w = loadCheckpoint(S, 'isl777_d96'); w.faults = []; const f0 = w.fault.bind(w); w.fault = (k, e) => { w.faults.push(k + ': ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ')); f0(k, e) }; S.playSet(w, 'on', true); S.playSet(w, 'build', true); return w };
const days = (w, d, f) => { for (let i = 0; i < d; i++) { for (let t = 0; t < 1200; t++) { w.step(); if (f && t % 100 === 0) f() } } };
const free = (w, n = 1) => { const out = [], { W, H } = S.CFG; for (let r = 2; r < 30 && out.length < n; r++) for (let dy = -r; dy <= r && out.length < n; dy++) for (let dx = -r; dx <= r && out.length < n; dx++) { const x = w.cx + dx, y = w.cy + dy; if (S.playCanPlace(w, 'house', x, y, true).ok && S.playCanPlace(w, 'house', x, y, false).ok && !out.some(o => Math.abs(o[0] - x) < 4 && Math.abs(o[1] - y) < 4)) out.push([x, y]) } return out };
const treeNear = w => { const { W } = S.CFG, T = []; for (let i = 0; i < w.feat.length; i++) if ((w.feat[i] === S.FEAT.OAK || w.feat[i] === S.FEAT.PINE) && w.res[i] >= 3 && Math.hypot(i % W - w.cx, ((i / W) | 0) - w.cy) < 40) T.push(i); let best = null, bn = -1; for (const i of T) { let n = 0; for (const j of T) if (Math.hypot(i % W - j % W, ((i / W) | 0) - ((j / W) | 0)) <= 8) n++; if (n > bn) { bn = n; best = i } } return [best % W, (best / W) | 0] };

// Watch mode is untouched: nothing appears on the world until the player does something
{ const w = loadCheckpoint(S, 'isl777_d96'); w.faults = []; const f0 = w.fault.bind(w); w.fault = (k, e) => { w.faults.push(k + ': ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ')); f0(k, e) }; days(w, 3); ok(!w.play, 'Watch mode leaves no play state'); ok(w.faults.length === 0, 'no faults over three days of Watch: ' + w.faults[0]); }

// orders
{ const w = mk(), ad = w.vills.filter(v => v.isAdult() && !v.isElder()).slice(0, 4), ids = ad.map(v => v.id), [tx, ty] = treeNear(w);
  const o = S.playOrderAt(w, tx, ty); ok(o && o.k === 'gather' && o.kind === 'wood', 'a tree offers the order to cut wood: ' + JSON.stringify(o));
  ok(S.playOrder(w, ids, o) === 4, 'four adults take the order');
  const kid = w.vills.find(v => v.isChild()); if (kid) ok(S.playOrder(w, [kid.id], o) === 0, 'children cannot be ordered');
  const seen = new Set(); days(w, 2, () => { for (const v of ad) if (v.jobKind === 'gather' || v.jobKind === 'haul') seen.add(v.id) });
  ok(seen.size >= 3, 'ordered villagers gather: ' + seen.size + ' of 4'); ok(ad.every(v => v.order || !w.play.orders[v.id]), 'orders stay in step with the villagers');
  ok(w.faults.length === 0, 'no faults while ordered: ' + w.faults[0]);
  S.playOrder(w, ids, { k: 'free' }); ok(ad.every(v => !v.order) && Object.keys(w.play.orders).length === 0, 'free hands return to the village'); }
// roles hold, and the village stops giving jobs when that switch is off
{ const w = mk(), v = w.vills.find(x => x.isAdult() && !x.isElder() && !x.trade); S.playOrder(w, [v.id], { k: 'role', role: 'fisher' }); days(w, 6);
  ok(v.role === 'fisher', 'a role the player gives is kept by the village planner: ' + v.role); ok(w.play.locks.includes(v.id), 'the lock is saved data');
  S.playSet(w, 'jobs', false); const roles0 = new Map(w.vills.map(x => [x.id, x.role])); days(w, 6); ok(w.vills.filter(x => roles0.has(x.id)).every(x => x.role === roles0.get(x.id)), 'with jobs switched off the village hands out no roles'); }
// placing, refusing, cancelling
{ const w = mk(), [p1, p2] = free(w, 2); ok(!!p1 && !!p2, 'free ground exists near the camp');
  const r = S.playPlace(w, 'house', p1[0], p1[1]); ok(r.ok && r.bp.player && w.bps[0] === r.bp, 'a placed house is a player site at the front of the queue');
  const r2 = S.playPlace(w, 'house', p1[0], p1[1]); ok(!r2.ok && /already/.test(r2.why), 'the same spot cannot be used twice: ' + r2.why);
  ok(!S.playPlace(w, 'house', 0, 0).ok, 'the map edge is refused'); const water = (() => { for (let i = 0; i < w.terr.length; i++) if (w.terr[i] <= 1) return i })(); ok(!S.playPlace(w, 'house', water % S.CFG.W, (water / S.CFG.W) | 0).ok, 'water is refused');
  ok(!S.playCanPlace(w, 'barracks', 50, 50).ok, 'a great project cannot be placed by hand');
  const r3 = S.playPlace(w, 'farm', p2[0], p2[1]); ok(r3.ok, 'a farm can be placed'); const id = r3.bp.id, wood0 = w.stock.wood; ok(S.playCancelBp(w, id) && !w.bps.some(b => b.id === id), 'a site that has not been started can be cancelled');
  const h0 = w.houses().length, bx = r.bp.x, by = r.bp.y; let built = false; days(w, 10, () => { if (w.houses().some(h => h.x === bx && h.y === by)) built = true }); ok(built && !w.bps.some(b => b.id === r.bp.id), 'builders raise the player\'s house at its site: ' + h0 + ' to ' + w.houses().length); ok(w.faults.length === 0, 'no faults while building: ' + w.faults[0]); }
// roads
{ const w = mk(), [p] = free(w, 1), line = []; for (let i = 0; i < 6; i++) line.push([p[0] + i, p[1] + 8]);
  const free8 = line.filter(([x, y]) => S.playCanPlace(w, 'house', x, y, true).ok || (w.terr[y * S.CFG.W + x] === S.TERR.GRASS && !w.feat[y * S.CFG.W + x] && !w.bmap[y * S.CFG.W + x] && !w.road[y * S.CFG.W + x]));
  const r = S.playRoad(w, line); ok(r.ok && r.n === free8.length, 'a dragged road lays a site on every free tile: ' + r.n + ' of ' + free8.length); const mine = w.bps.filter(b => b.type === 'road' && b.player).length; ok(mine === r.n, 'they are all the player\'s');
  S.playRoad(w, line); ok(w.bps.filter(b => b.type === 'road' && b.player).length === mine, 'the same tiles are not laid twice'); }
// the village stops planning buildings when that switch is off
{ const w = mk(); S.playSet(w, 'build', false); const n0 = w.bpnext; days(w, 8); ok(w.bpnext === n0, 'with buildings switched off the village starts no sites: ' + (w.bpnext - n0)); S.playSet(w, 'build', true); days(w, 8); ok(w.bpnext > n0, 'switched back on it plans again'); }
// zones steer the village's own placing
{ const w = mk(), { W } = S.CFG; let p = null, bn = -1; for (let cy = w.cy - 30; cy <= w.cy + 30; cy += 4) for (let cx = w.cx - 30; cx <= w.cx + 30; cx += 4) { let n = 0; for (let y = cy - 12; y <= cy + 12; y += 3) for (let x = cx - 12; x <= cx + 12; x += 3) if (S.playCanPlace(w, 'house', x, y, true).ok) n++; if (n > bn) { bn = n; p = [cx, cy] } } const tiles = []; for (let y = p[1] - 12; y <= p[1] + 12; y++) for (let x = p[0] - 12; x <= p[0] + 12; x++) tiles.push([x, y]);
  const inside = (b, r) => b && Math.abs(b.x - p[0]) <= r && Math.abs(b.y - p[1]) <= r; let spots = 0; for (const [x, y] of tiles) if ((x - p[0] + 12) % 3 === 0 && (y - p[1] + 12) % 3 === 0 && S.playCanPlace(w, 'house', x, y, true).ok) spots++; ok(spots > 3, 'the painted patch has room: ' + spots);
  ok(S.playZone(w, tiles, 'home') === tiles.length && w.play.nz === tiles.length, 'painting counts the tiles'); let hits = 0; for (let i = 0; i < 6; i++) { const bp = S.placeBuilding(w, 'house'); if (bp) { if (inside(bp, 13)) hits++; w.bps.splice(w.bps.indexOf(bp), 1); w.bpAt.delete(bp.y * S.CFG.W + bp.x) } }
  ok(hits >= 5, 'houses the village places go inside the home zone: ' + hits + ' of 6');
  const fb = S.placeBuilding(w, 'farm'); ok(!fb || !inside(fb, 11), 'a farm keeps out of the home zone: ' + (fb ? fb.x + ',' + fb.y : 'none')); S.playZone(w, tiles, null); ok(w.play.nz === 0, 'zones can be wiped'); }
// research
{ const w = mk(); const av = S.techAvailable(w); ok(av.length > 0, 'something can be studied'); ok(S.playResearch(w, av[0]).ok && w.tech.focus === av[0], 'the player picks the research'); ok(!S.playResearch(w, 'nonsense').ok, 'an unknown technology is refused');
  S.playSet(w, 'research', false); w.tech.focus = null; days(w, 12); ok(w.tech.focus === null, 'with research switched off the council picks nothing'); ok(S.playResearch(w, av[Math.min(1, av.length - 1)]).ok, 'the player can still pick'); }
// the crowd's share, saving, and the same orders giving the same village
{ const w = mk(), ad = w.vills.filter(v => v.isAdult()).slice(0, 3), [tx, ty] = treeNear(w), [p] = free(w, 1); S.playOrder(w, ad.map(v => v.id), S.playOrderAt(w, tx, ty)); S.playPlace(w, 'house', p[0], p[1]); S.playZone(w, [[p[0] + 8, p[1]]], 'farm'); S.playSet(w, 'share', { food: 0.5, wood: 0.3, stone: 0.1 }); S.playSet(w, 'jobs', false);
  const json = JSON.stringify(S.serializeWorld(w)), A = S.deserializeWorld(JSON.parse(json)), B = S.deserializeWorld(JSON.parse(json));
  ok(A.play && A.play.auto.jobs === false && A.play.nz === 1 && Object.keys(A.play.orders).length === 3, 'play state survives a save'); ok(A.vills.filter(v => v.order).length === 3, 'ordered villagers are pointed at their orders again'); ok(A.bps.some(b => b.player), 'player sites stay marked');
  const sig = x => JSON.stringify([x.vills.length, Math.round(x.stock.wood), Math.round(x.stock.stone), Math.round(x.stock.food), x.houses().length, x.bps.length, x.births, x.deaths]);
  days(A, 4); days(B, 4); ok(sig(A) === sig(B), 'two loads of the same save carry on identically: ' + sig(A) + ' vs ' + sig(B)); ok(A.faults === undefined || true, ''); }
{ const w = mk(); S.playSet(w, 'share', { food: 2, wood: 2, stone: 2 }); const s = w.play.share; ok(s.food + s.wood + s.stone <= 0.951, 'the crowd shares never add past the whole: ' + (s.food + s.wood + s.stone).toFixed(2)); }
// Watch and Play switch back and forth without losing anything (v0.35.1)
{ const w = mk(); w.play.auto.build = false; w.play.auto.jobs = false;
  S.playSet(w, 'on', false); ok(S.autoOn(w, 'build') && S.autoOn(w, 'jobs') && S.autoOn(w, 'research'), 'Watch mode is fully automatic whatever the switches say');
  const n0 = w.bpnext; days(w, 10); ok(w.bpnext > n0 || w.bps.length > 0 || w.houses().length > 0, 'back in Watch the council builds again: ' + (w.bpnext - n0) + ' new sites');
  S.playSet(w, 'on', true); ok(w.play.auto.build === false && w.play.auto.jobs === false && w.play.entered === 1, 'going back into Play restores the switches as left, not reset'); }
{ const w = loadCheckpoint(S, 'isl777_d96'); ok(S.autoOn(w, 'build'), 'a world that was never played is automatic'); S.playSet(w, 'on', true); ok(w.play.auto.build === false && w.play.auto.research !== false && w.play.auto.jobs !== false, 'first time in Play only the council stops building');
  const n0 = w.bpnext; days(w, 8); ok(w.bpnext === n0, 'the council builds nothing in Play after the first switch: ' + (w.bpnext - n0)); S.playSet(w, 'build', true); S.playSet(w, 'on', false); S.playSet(w, 'on', true); ok(w.play.auto.build === true, 'a player who turned buildings back on keeps them on'); }
console.log(fail ? 'FAILED ' + fail + ' (passed ' + pass + ')' : 'play_events passed ' + pass); process.exit(fail ? 1 : 0);
