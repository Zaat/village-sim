// v0.39.3 living crowd (render only): the townsfolk walk to work by the time of day, work, gather in the evening, sleep inside; routes are cached; the sim is untouched
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(o => { Object.assign(CFG, o); CROWD.focus = 40; newWorld(777, { type: 'lakeland', size: 'standard' }); __sim.setSpeed(0) }, OLD_PACE);
  await p.evaluate(() => { for (let i = 0; i < 1200 * 32 * 5; i++) world.step() });
  const n = await p.evaluate(() => world.crowd ? world.crowd.n : 0); ok(n > 5, 'a crowd formed: ' + n);
  await p.evaluate(() => { R.cam.x = world.cx * CFG.T; R.cam.y = world.cy * CFG.T; R.cam.z = 2.2; showTab('village'); updateUI() });
  const before = await p.evaluate(() => JSON.stringify({ t: world.tick, n: world._nodes, d: world.dbg && world.dbg.deferred, s: world.stock, v: world.vills.map(v => [v.x, v.y]).slice(0, 30) }));
  // draw a few frames at a given time of day and report what the crowd did
  const at = async (tod, frames = 6) => p.evaluate(({ tod, frames }) => {
    const w = world, day0 = Math.floor(w.tick / 1200), keep = w.tick; w.tick = day0 * 1200 + Math.round(tod * 1200);
    for (let i = 0; i < frames; i++) render(w, null, performance.now() + i * 90); const s = Object.assign({}, CW.stats); w.tick = keep; return s;
  }, { tod, frames });
  const night = await at(0.9); ok(night.figures === 0, 'nobody is outside at night: ' + night.figures);
  const early = await at(0.02); ok(early.figures > 0, 'they are at their doors at sunrise: ' + early.figures);
  let out = await at(0.10, 12); for (let k = 0; k < 6; k++) out = await at(0.10, 12);
  ok(out.walking > 0, 'they walk out to work in the morning: ' + JSON.stringify(out));
  ok(out.floods + 0 >= 0 && await p.evaluate(() => CW.routes.size) > 0, 'routes were found and kept: ' + await p.evaluate(() => CW.routes.size));
  let day = await at(0.30, 12); for (let k = 0; k < 4; k++) day = await at(0.30, 12);
  ok(day.working > 0, 'they work at the fields and camps through the day: ' + JSON.stringify(day));
  let eve = await at(0.64, 12); for (let k = 0; k < 6; k++) eve = await at(0.64, 12);
  ok(eve.figures > 0, 'they gather in the evening: ' + JSON.stringify(eve));
  // routes are cached: a second look at the same hour finds no new floods
  const again = await p.evaluate(() => { CW.stats.floods = 0; const w = world, keep = w.tick; w.tick = Math.floor(w.tick / 1200) * 1200 + 120; for (let i = 0; i < 20; i++) render(w, null, 30000 + i * 90); w.tick = keep; return CW.stats.floods });
  ok(again <= 3, 'cached routes are reused (new floods on a repeat: ' + again + ')');
  // never more than the per-frame allowance of floods in one frame
  const mx = await p.evaluate(() => { CW.routes.clear(); CW.fails.clear(); const w = world, keep = w.tick; w.tick = Math.floor(w.tick / 1200) * 1200 + 140; let m = 0; for (let i = 0; i < 6; i++) { render(w, null, 40000 + i * 90); m = Math.max(m, CW.floods) } w.tick = keep; return m });
  ok(mx <= 3, 'at most 3 route searches in a frame: ' + mx);
  // fast play: the still look at the doors, no routes searched
  const fast = await p.evaluate(() => { R.speed = 100; CW.routes.clear(); CW.stats.floods = 0; const w = world, keep = w.tick; w.tick = Math.floor(w.tick / 1200) * 1200 + 140; render(w, null, 50000); const s = Object.assign({}, CW.stats); w.tick = keep; R.speed = 1; return s });
  ok(fast.floods === 0 && fast.walking === 0, 'at high speed nobody is followed: ' + JSON.stringify(fast));
  // a frame's cost with the whole town out
  const ms = await p.evaluate(() => { const w = world, keep = w.tick; w.tick = Math.floor(w.tick / 1200) * 1200 + 300; for (let i = 0; i < 4; i++) render(w, null, 60000); const t0 = performance.now(); for (let i = 0; i < 20; i++) render(w, null, 60000 + i * 90); const d = (performance.now() - t0) / 20; w.tick = keep; return d });
  ok(ms < 40, 'a frame with the working crowd costs ' + ms.toFixed(1) + ' ms');
  // the simulation was not touched by drawing
  const after = await p.evaluate(() => JSON.stringify({ t: world.tick, n: world._nodes, d: world.dbg && world.dbg.deferred, s: world.stock, v: world.vills.map(v => [v.x, v.y]).slice(0, 30) }));
  ok(before === after, 'drawing the crowd leaves the simulation as it was');
  await p.evaluate(() => { const w = world; w.tick = Math.floor(w.tick / 1200) * 1200 + 300; render(w, null, 70000) }); await p.screenshot({ path: 'tests/ui_crowd_walk.png' });
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_crowd_walk passed'); process.exit(fail ? 1 : 0);
})();
