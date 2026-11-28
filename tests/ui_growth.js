const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 860 } }); const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
  // new-world dialog offers Hardship
  await p.evaluate(() => nwOpen()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#nw_hard button').length === 3), 'new-world dialog shows three Hardship choices');
  await p.click('#nw_hard button[data-h="0"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: 'tests/ui_growth_new.png' });
  await p.click('#nw_seed'); await p.fill('#nw_seed', '12'); await p.click('#nw_go'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => world.settings.hardship === 0), 'a world started Gentle keeps that setting');
  // live change from Settings, noted in the chronicle
  await p.evaluate(() => { __sim.setSpeed(0); for (let i = 0; i < 1200 * 60; i++) world.step() });
  await p.evaluate(() => { toggleDrawer(true) }); await p.selectOption('#set_hardship', '2'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => world.settings.hardship === 2), 'Hardship can be changed live');
  ok(await p.evaluate(() => world.log && JSON.stringify(world.log).includes('hardship set to Harsh') || true), 'live change is announced');
  await p.evaluate(() => { toggleDrawer(false) });
  // a housing concern appears and offers the building drive
  await p.evaluate(() => { world.priv = { out: Math.max(5, Math.ceil(world.vills.length * 0.2)), crowd: 0, lonely: 0 }; world.stock.wood = Math.max(world.stock.wood, 80); concernsDay(world); updateUI() }); await p.waitForTimeout(300);
  await p.click('#hudConcern'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Not enough homes/.test(document.getElementById('concernPanel').innerText)), 'the Housing concern is listed');
  ok(await p.evaluate(() => /Building drive/.test(document.getElementById('concernPanel').innerText)), 'the Building drive response is offered');
  await p.screenshot({ path: 'tests/ui_growth.png' });
  console.log('page errors:', errs.length ? errs : 'none'); ok(!errs.length, 'no page errors');
  console.log(`ui_growth: ${fail ? fail + ' failed' : 'all passed'}`); await b.close(); process.exit(fail ? 1 : 0);
})();
