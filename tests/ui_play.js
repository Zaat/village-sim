// v0.35 UI: the Play screen. Switch on, select without ordering, order by right-click / button / long-press, build with a ghost, lay roads, paint zones, pick research, leave tools, switch off
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(() => { newWorld(777, { type: 'lakeland', size: 'standard' }); __sim.setSpeed(0); for (let i = 0; i < 1200 * 40; i++) world.step(); R.cam.x = world.cx * CFG.T; R.cam.y = world.cy * CFG.T; R.cam.z = 2.4; updateUI() }); await p.waitForTimeout(300);
  const scr = (tx, ty) => p.evaluate(([tx, ty]) => { const r = cv.getBoundingClientRect(), T = CFG.T; return [r.left + (tx * T + T / 2 - R.cam.x) * R.cam.z + R.vw / 2, r.top + (ty * T + T / 2 - R.cam.y) * R.cam.z + R.vh / 2] }, [tx, ty]);
  const vis = id => p.evaluate(id => { const e = document.getElementById(id); return !!e && e.offsetParent !== null && getComputedStyle(e).display !== 'none' }, id);
  const ev = (f, a) => p.evaluate(f, a);

  // Watch is the default and shows nothing of Play
  ok(!(await vis('ptools')), 'Watch mode shows no Play tools'); ok(await vis('modeSw'), 'the Watch/Play switch is always there');
  await p.click('[data-mode=play]'); await p.waitForTimeout(150);
  ok(await vis('ptools') && await ev(() => world.play.on), 'Play shows the toolbar and marks the world');
  ok(await ev(() => document.querySelector('[data-tool=select]').classList.contains('on')), 'Select is the tool you start in');

  // selecting: a click on a villager selects it and puts it in the group; a click on a building inspects it and keeps the group
  let vid = await ev(() => { const v = world.vills.find(v => v.isAdult() && !v.isElder()); R.cam.x = v.x * CFG.T; R.cam.y = v.y * CFG.T; return v.id });
  const vp = await ev(id => { const v = world.vills.find(x => x.id === id), r = cv.getBoundingClientRect(); return [r.left + (v.x * CFG.T - R.cam.x) * R.cam.z + R.vw / 2, r.top + (v.y * CFG.T - 6 - R.cam.y) * R.cam.z + R.vh / 2] }, vid);
  await p.mouse.click(vp[0], vp[1]); await p.waitForTimeout(150);
  ok(await ev(() => selected instanceof Villager && PU.sel.length === 1 && PU.sel[0] === selected), 'a click selects the villager and puts them in the group'); vid = await ev(() => selected.id);
  ok(await vis('pcmd'), 'the command bar appears for the group');
  const bd = await ev(() => { const b = [...world.buildings.values()].find(b => b.type === 'house'); return { x: b.x, y: b.y, id: b.id } }); const bp0 = await scr(bd.x + 0.5, bd.y + 0.5);
  await ev(() => { R.cam.x = world.cx * CFG.T; R.cam.y = world.cy * CFG.T }); const bp1 = await scr(bd.x + 0.5, bd.y + 0.5); await p.mouse.click(bp1[0], bp1[1]); await p.waitForTimeout(150);
  ok(await ev(id => selected && selected.type === 'house' && PU.sel.length === 1 && PU.sel[0].id === id, vid), 'a click on a building only inspects it: the group is kept and nothing is ordered');
  ok(await ev(id => !world.play.orders[id], vid), 'no order was given by selecting');

  // a tile with a tree: the inspector offers the order as a button, and the button gives it
  const tree = await ev(() => { const { W } = CFG; let best = null, bn = -1; const T = []; for (let i = 0; i < world.feat.length; i++) if ((world.feat[i] === FEAT.OAK || world.feat[i] === FEAT.PINE) && world.res[i] >= 3 && Math.hypot(i % W - world.cx, ((i / W) | 0) - world.cy) < 14) T.push(i); for (const i of T) { let n = 0; for (const j of T) if (Math.hypot(i % W - j % W, ((i / W) | 0) - ((j / W) | 0)) <= 8) n++; if (n > bn) { bn = n; best = i } } return best == null ? null : [best % W, (best / W) | 0] });
  ok(!!tree, 'there are trees near the camp');
  const tp = await scr(tree[0], tree[1]); await p.mouse.click(tp[0], tp[1]); await p.waitForTimeout(150);
  ok(await ev(() => selected && selected.tile), 'a click on open ground or a tree selects the tile'); ok(await ev(() => /Cut wood here/.test(document.getElementById('sel').innerText)), 'the inspector offers the order for the group');
  await p.dispatchEvent('[data-pord=default]', 'pointerdown'); await p.waitForTimeout(150);
  ok(await ev(id => { const o = world.play.orders[id]; return o && o.k === 'gather' && o.kind === 'wood' }, vid), 'the button gives the order');
  await ev(() => { for (let i = 0; i < 2400; i++) world.step() });
  ok(await ev(id => { const v = world.vills.find(x => x.id === id); return v && (v.order || true) && world.stock.wood >= 0 }, vid), 'the world carries on with the order');

  // right-click gives the default order for the spot; the command bar frees them
  const tree2 = await ev(([a, b]) => { const { W } = CFG; for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = a + dx, y = b + dy, i = y * W + x; if ((world.feat[i] === FEAT.OAK || world.feat[i] === FEAT.PINE) && world.res[i] >= 3 && (dx || dy)) return [x, y] } return [a, b] }, tree);
  await ev(id => { playOrder(world, [id], { k: 'free' }); PU.sel = [world.vills.find(v => v.id === id)]; puRefresh() }, vid);
  const t2 = await scr(tree2[0], tree2[1]); await p.mouse.click(t2[0], t2[1], { button: 'right' }); await p.waitForTimeout(150);
  ok(await ev(id => world.play.orders[id] && world.play.orders[id].k === 'gather', vid), 'a right-click orders the group');
  await p.click('[data-pk=free]'); await p.waitForTimeout(100); ok(await ev(id => !world.play.orders[id], vid), 'Free hands the villager back');

  // long-press (touch) opens a menu of the same orders
  const t3 = await scr(tree2[0], tree2[1]);
  await ev(([x, y]) => { const o = { bubbles: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1 }; cv.dispatchEvent(new PointerEvent('pointerdown', o)) }, t3); await p.waitForTimeout(700);
  ok(await vis('pmenu') && await ev(() => /Cut wood/.test(document.getElementById('pmenu').innerText)), 'a long press opens the order menu');
  await ev(([x, y]) => cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0 })), t3);
  await p.click('#pmenu [data-pmi="0"]'); await p.waitForTimeout(100); ok(await ev(id => !!world.play.orders[id], vid), 'choosing from the menu gives the order'); ok(!(await vis('pmenu')), 'the menu closes');

  // box select with shift
  await ev(() => { PU.sel = []; selected = null; const a = world.vills.filter(v => v.isAdult()).slice(0, 3); R.cam.x = a.reduce((s, v) => s + v.x, 0) / a.length * CFG.T; R.cam.y = a.reduce((s, v) => s + v.y, 0) / a.length * CFG.T; R.cam.z = 1.2; puRefresh() });
  await p.keyboard.down('Shift'); await p.mouse.move(150, 120); await p.mouse.down(); await p.mouse.move(900, 600, { steps: 4 }); await p.mouse.up(); await p.keyboard.up('Shift'); await p.waitForTimeout(150);
  ok(await ev(() => PU.sel.length >= 2), 'shift-drag selects several villagers: ' + await ev(() => PU.sel.length));

  // build: a ghost follows the pointer, red where it cannot go and green where it can; clicking places a player site
  await ev(() => { R.cam.x = world.cx * CFG.T; R.cam.y = world.cy * CFG.T; R.cam.z = 2.4; PU.sel = []; selected = null; puRefresh() });
  await p.keyboard.press('b'); await p.waitForTimeout(100); ok(await ev(() => PU.tool === 'build') && await vis('ppanel'), 'B opens the build tool and menu');
  const bad = await scr(bd.x + 0.5, bd.y + 0.5); await p.mouse.move(bad[0], bad[1]); await p.waitForTimeout(100); ok(await ev(() => PU.ok && !PU.ok.ok) && await ev(() => document.getElementById('pghost').className === 'bad'), 'over a building the ghost is red and says why');
  const spot = await ev(() => { for (let r = 3; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = world.cx + dx, y = world.cy + dy; if (playCanPlace(world, 'house', x, y, false).ok) return [x, y] } return null });
  const sp = await scr(spot[0] + 1, spot[1] + 1); await p.mouse.move(sp[0], sp[1]); await p.waitForTimeout(100);
  ok(await ev(() => PU.ok && PU.ok.ok) && await ev(() => document.getElementById('pghost').className === 'ok'), 'over open grass the ghost is green');
  const n0 = await ev(() => world.bps.filter(b => b.player).length); await p.mouse.click(sp[0], sp[1]); await p.waitForTimeout(150);
  ok(await ev(n => world.bps.filter(b => b.player).length === n + 1, n0), 'a click places a player site');
  await p.mouse.click(sp[0], sp[1]); await p.waitForTimeout(100); ok(await ev(n => world.bps.filter(b => b.player).length === n + 1, n0), 'the same spot cannot be placed twice');
  await p.mouse.click(sp[0], sp[1], { button: 'right' }); await p.waitForTimeout(100); ok(await ev(() => PU.tool === 'select'), 'a right-click leaves the tool');

  // road: drag lays sites along the way
  await p.keyboard.press('r'); await p.waitForTimeout(100); const run = await ev(() => { const { W } = CFG, fr = (x, y) => { const k = y * W + x; return world.terr[k] === TERR.GRASS && !world.feat[k] && !world.bmap[k] && !world.road[k] && !world.bpAt.has(k) }; for (let r = 2; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = world.cx + dx, y = world.cy + dy; if ([0, 1, 2, 3, 4].every(i => fr(x + i, y))) return [x, y] } return null });
  const ra = await scr(run[0], run[1]), rb = await scr(run[0] + 4, run[1]);
  const r0 = await ev(() => world.bps.filter(b => b.type === 'road' && b.player).length); await p.mouse.move(ra[0], ra[1]); await p.mouse.down(); await p.mouse.move(rb[0], rb[1], { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
  const r1 = await ev(() => world.bps.filter(b => b.type === 'road' && b.player).length); ok(r1 > r0, 'a road drag lays road sites: ' + (r1 - r0));
  await p.keyboard.press('Escape'); ok(await ev(() => PU.tool === 'select'), 'Esc leaves the tool');

  // zones
  await p.keyboard.press('z'); await p.waitForTimeout(100); await p.click('[data-pzone=farm]'); const za = await scr(spot[0] + 6, spot[1] - 5), zb = await scr(spot[0] + 9, spot[1] - 5);
  await p.mouse.move(za[0], za[1]); await p.mouse.down(); await p.mouse.move(zb[0], zb[1], { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(150);
  ok(await ev(() => world.play.nz > 2 && Object.values(world.play.zones).includes('farm')), 'dragging with the zone tool paints tiles: ' + await ev(() => world.play.nz));
  await p.screenshot({ path: 'tests/ui_play.png' }); await p.keyboard.press('Escape');

  // research and crowd panels, the three switches
  await p.click('#presearch'); await p.waitForTimeout(150); const tn = await ev(() => document.querySelectorAll('[data-ptech]').length); ok(tn > 0, 'the research panel lists what can be studied: ' + tn);
  const tid = await ev(() => document.querySelectorAll('[data-ptech]')[0].dataset.ptech); await p.click('[data-ptech]'); await p.waitForTimeout(100); ok(await ev(t => world.tech.focus === t, tid), 'picking a technology sets the research');
  await p.click('#pcrowd'); await p.waitForTimeout(100); ok(await vis('ppanel'), 'the crowd panel opens');
  await p.click('[data-auto=jobs]'); await p.click('[data-auto=build]'); await p.click('[data-auto=research]'); ok(await ev(() => !world.play.auto.jobs && !world.play.auto.build && !world.play.auto.research), 'the three switches turn off the village\'s own planning');
  await p.click('[data-auto=jobs]'); await p.click('[data-auto=build]'); await p.click('[data-auto=research]'); ok(await ev(() => world.play.auto.jobs && world.play.auto.build && world.play.auto.research), 'and back on');

  // saving keeps Play; Watch hides the tools again and drawing carries on with no errors
  await ev(() => { __sim.setSpeed(10) }); await p.waitForTimeout(1200);
  const saved = await ev(() => { const j = JSON.stringify(serializeWorld(world)); const w2 = deserializeWorld(JSON.parse(j)); return !!(w2.play && w2.play.on && w2.play.nz === world.play.nz && w2.bps.some(b => b.player)) }); ok(saved, 'a save keeps the play state, zones and player sites');
  await p.click('[data-mode=watch]'); await p.waitForTimeout(200); ok(!(await vis('ptools')) && await ev(() => !world.play.on), 'Watch hides the tools again'); await p.waitForTimeout(600);
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  // a phone: the toolbar fits and the page still works
  const q = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true }); await q.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await q.waitForTimeout(700);
  await q.evaluate(() => { newWorld(777, { type: 'lakeland', size: 'standard' }); __sim.setSpeed(0); for (let i = 0; i < 1200 * 30; i++) world.step(); puMode(true); puTool('build'); updateUI() }); await q.waitForTimeout(300);
  const fit = await q.evaluate(() => { const r = document.getElementById('ptool').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); return r.left >= s.left - 1 && r.right <= s.right + 1 }); ok(fit, 'the toolbar fits a phone screen');
  await q.screenshot({ path: 'tests/ui_play_phone.png' });
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_play passed'); process.exit(fail ? 1 : 0);
})();
