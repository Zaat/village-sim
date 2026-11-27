// v0.34 UI: a town bigger than its focus group shows "in play" beside the population, draws its townsfolk at the houses, and keeps drawing without errors
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///home/claude/village-sim/index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(o => { Object.assign(CFG, o); CROWD.focus = 40; newWorld(777, { type: 'lakeland', size: 'standard' }); __sim.setSpeed(0) }, OLD_PACE);
  await p.evaluate(() => { for (let i = 0; i < 1200 * 32 * 5; i++) world.step() });
  const n = await p.evaluate(() => world.crowd ? world.crowd.n : 0); ok(n > 5, 'a crowd formed: ' + n);
  await p.evaluate(() => { R.cam.x = world.cx * CFG.T; R.cam.y = world.cy * CFG.T; R.cam.z = 2.2; showTab('village'); updateUI() }); await p.waitForTimeout(500);
  const card = await p.evaluate(() => document.getElementById('statCard').innerText);
  ok(/Population \d+\s*\(\d+ in play\)/.test(card), 'the population shows how many are in play: ' + card.slice(0, 60).replace(/\n/g, ' '));
  await p.screenshot({ path: 'tests/ui_crowd.png' });
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_crowd passed'); process.exit(fail ? 1 : 0);
})();
