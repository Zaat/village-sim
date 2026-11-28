// Selecting boats, visiting ships and wagons, and trees and rocks on the map (v0.39.3, #170)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(async () => { localStorage.clear(); await new Promise(r => { const q = indexedDB.deleteDatabase('villagesim'); q.onsuccess = q.onerror = q.onblocked = r }) });
  await p.reload(); await p.waitForTimeout(600); try { await p.click('#welcome button', { timeout: 1500 }) } catch (e) { }
  await p.evaluate(() => { __sim.newWorld(777); __sim.setSpeed(0); __sim.run(600) });
  // a dock with a fishing boat and a cargo ship, put on open water by hand
  const info = await p.evaluate(() => {
    const w = __sim.world; let sp = null;
    for (let y = 4; y < CFG.H - 4 && !sp; y++) for (let x = 4; x < CFG.W - 12 && !sp; x++) { let okk = true; for (let k = 0; k <= 8; k++) { const t = w.terr[y * CFG.W + x + k]; if (k === 0 ? t < TERR.SAND : t > TERR.SHALLOW) { okk = false; break } } if (okk) sp = { x, y } }
    if (!sp) return null; const d = w.addBuilding('dock', sp.x, sp.y); d.dir = [1, 0]; const bt = addBoat(w, d, 'fishing'); const cg = addBoat(w, d, 'cargo');
    R.cam.x = (sp.x + 3) * CFG.T; R.cam.y = sp.y * CFG.T; R.cam.z = 3; clampCam(); updateUI();
    const T = CFG.T, c = R.cam, cvr = document.querySelector('canvas').getBoundingClientRect();
    const scr = (tx, ty) => ({ x: (tx * T - c.x) * c.z + R.vw / 2, y: (ty * T - c.y) * c.z + R.vh / 2 });
    return { boat: scr(bt.x, bt.y - 0.4), vis: scr(bt.mx + 2.2, bt.my), id: bt.id, dock: d.id };
  });
  ok(!!info, 'found open water for a dock'); if (!info) { await b.close(); process.exit(1) }
  await p.evaluate(i => pick(i.boat.x, i.boat.y), info); await p.waitForTimeout(200);
  ok(await p.evaluate(() => selected instanceof Boat), 'a click on a boat selects it');
  ok(await p.evaluate(() => /Fishing boat/.test($('sel').textContent) && /Moored/.test($('sel').textContent) && /Crew/.test($('sel').textContent)), 'the boat panel names it and says what it is doing: ' + (await p.evaluate(() => $('sel').textContent.slice(0, 120))));
  ok(await p.evaluate(() => !!$('sel').querySelector('a.lnk[data-bid]')), 'it links to its dock');
  // visiting ship at the dock
  await p.evaluate(() => { const w = __sim.world; w.econ.caravan = { name: 'the ships of Somewhere', sea: true, arrived: w.day, leaves: w.day + 3, cap: 70, done: false } }); await p.evaluate(i => pick(i.vis.x, i.vis.y), info); await p.waitForTimeout(200);
  ok(await p.evaluate(() => selected && selected.visitor === 'ship' && /visiting ship/i.test($('sel').textContent)), 'a visiting ship can be selected');
  await p.evaluate(() => { __sim.world.econ.caravan = null; __sim.world.visit = null }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !selected || !selected.visitor), 'the panel clears when the visitors leave');
  // trees and rocks in Watch mode
  const tile = await p.evaluate(() => { const w = __sim.world; for (let i = 0; i < CFG.W * CFG.H; i++) if (w.feat[i] && w.res[i] > 0 && !w.bmap[i]) { const x = i % CFG.W, y = (i / CFG.W) | 0; R.cam.x = (x + 0.5) * CFG.T; R.cam.y = (y + 0.5) * CFG.T; clampCam(); const c = R.cam; return { x, y, sx: ((x + 0.5) * CFG.T - c.x) * c.z + R.vw / 2, sy: ((y + 0.5) * CFG.T - c.y) * c.z + R.vh / 2 } } return null });
  ok(!!tile, 'found a tree or rock'); if (tile) {
    await p.evaluate(t => { pick(t.sx, t.sy - 4) }, tile); await p.waitForTimeout(200);
    ok(await p.evaluate(() => selected && selected.tile && /oak|pine|rock|berry/i.test($('sel').textContent)), 'a tree, rock or bush can be selected: ' + (await p.evaluate(() => $('sel').textContent.slice(0, 80))));
  }
  ok(await p.evaluate(() => { pick(5, 5); return true }), 'clicking empty ground does not break');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_select passed'); process.exit(fail ? 1 : 0);
})();
