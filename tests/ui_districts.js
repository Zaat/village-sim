// v0.37 UI: the districts overlay and card on the City card, picking a district on the map, group orders only while playing
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///home/claude/village-sim/index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { newWorld(777, { type: 'island', size: 'standard' }); __sim.setSpeed(0) });
  await p.evaluate(() => { for (let i = 0; i < 1200 * 32 * 3; i++) world.step(); showTab('world'); renderCity() });
  await p.click('#distBtn'); await p.waitForTimeout(300);
  let r = await p.evaluate(() => ({ on: R.distShow, text: document.getElementById('cityCard').textContent, n: districtsView(world).list.length, total: districtsView(world).total, pop: world.pop }));
  ok(r.on && r.n >= 1 && r.total === r.pop, 'districts shown and they add up to the town: ' + JSON.stringify({ n: r.n, total: r.total, pop: r.pop })); ok(/districts, \d+ people/.test(r.text), 'the card lists the districts');
  // click a district on the map: centre the camera on the first one and click there
  const hit = await p.evaluate(() => { const d = districtsView(world).list[0], T = CFG.T; R.cam.x = d.cx * T; R.cam.y = d.cy * T; const rc = cv.getBoundingClientRect(); const s = { x: R.vw / 2, y: R.vh / 2 }; return { key: d.key, s, rc: { l: rc.left, t: rc.top } } });
  if (hit.s) { await p.mouse.click(hit.rc.l + hit.s.x, hit.rc.t + hit.s.y); await p.waitForTimeout(300); const sel = await p.evaluate(() => R.distSel); ok(sel != null, 'clicking the map chooses a district: ' + sel) }
  await p.evaluate(() => { R.distSel = districtsView(world).list[0].key; renderCity() }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Switch to Play/.test(document.getElementById('cityCard').textContent)), 'in Watch mode the card says orders need Play');
  await p.evaluate(() => { playOf(world).on = true; renderCity() }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('[data-dord]').length === 4), 'in Play there are four order buttons');
  await p.click('[data-dord="wood"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => Object.values(world.play.dorders || {}).includes('wood')), 'choosing firewood stores the order');
  await p.click('[data-dord=""]'); ok(await p.evaluate(() => !Object.keys(world.play.dorders || {}).length), 'the first button clears it');
  await p.waitForTimeout(500); await p.screenshot({ path: 'tests/ui_districts.png' });
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_districts passed'); process.exit(fail ? 1 : 0);
})();
