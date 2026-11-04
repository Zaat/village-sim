const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 860 } }); const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///home/claude/village-sim/index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { __sim.setSpeed(0); for (let i = 0; i < 1200 * 260; i++) world.step() });
  // find a craftsperson at work and put the camera on them
  await p.evaluate(() => { for (let i = 0; i < 6000; i++) { world.step(); if (world.vills.some(v => (v.trade || v.side) && v.jobKind === 'craft' && v.cur && v.cur.type === 'work')) break } });
  await p.evaluate(() => { const v = world.vills.find(v => (v.trade || v.side) && v.jobKind === 'craft' && v.cur && v.cur.type === 'work') || world.vills.find(v => v.trade); if (v) { selected = v; R.cam.x = v.x * CFG.T; R.cam.y = v.y * CFG.T; R.cam.z = 2.4 } showTab('progress'); updateUI() });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => /have work/.test(document.getElementById('livCard').innerText)), 'Livelihoods card shows employment');
  ok(await p.evaluate(() => /worker/.test(document.getElementById('livCard').innerText)), 'Livelihoods card lists trades');
  await p.evaluate(() => document.getElementById('livCard').scrollIntoView({ block: 'end' })); await p.waitForTimeout(200);
  await p.screenshot({ path: 'tests/ui_liv.png' });
  await p.evaluate(() => { showTab('village'); updateUI() }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Livelihood/.test(document.getElementById('sel').innerText)), 'villager panel shows the livelihood');
  console.log('page errors:', errs.length ? errs : 'none'); ok(!errs.length, 'no page errors');
  console.log(`ui_liv: ${fail ? fail + ' failed' : 'all passed'}`); await b.close(); process.exit(fail ? 1 : 0);
})();
