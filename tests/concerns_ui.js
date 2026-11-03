const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; const setMode = m => p.evaluate(m => { const el = document.getElementById('alertMode'); el.value = m; el.dispatchEvent(new Event('change')) }, m); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///home/claude/village-sim/index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { __sim.setSpeed(0) });
  // run the village a couple of months so there is something to watch
  await p.evaluate(() => { for (let i = 0; i < 1200 * 40; i++) world.step() });
  ok(await p.evaluate(() => document.getElementById('hudConcern').style.display === 'none'), 'badge hidden when nothing worries the village');
  // a critical food shortage
  await p.evaluate(() => { world.stock.food = 3; concernsDay(world); renderConcerns(true) });
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('hudConcern').style.display !== 'none' && /⚑ [1-9]/.test(document.getElementById('hudConcern').textContent)), 'badge shows the count');
  ok(await p.evaluate(() => document.getElementById('hudConcern').classList.contains('crit')), 'badge turns critical');
  ok(await p.evaluate(() => document.querySelectorAll('#toasts .toast').length === 1), 'one toast for the critical concern');
  await p.screenshot({ path: 'tests/ui_concern_toast.png' });
  // open the panel from the badge; the toast gives way to it
  await p.click('#hudConcern'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('concernPanel').style.display !== 'none'), 'panel opens from the badge');
  ok(await p.evaluate(() => document.querySelectorAll('#toasts .toast').length === 0), 'toasts are cleared while the panel is open');
  ok(await p.evaluate(() => /Food is running low/.test(document.getElementById('cnBody').innerText)), 'panel lists the food concern');
  await p.screenshot({ path: 'tests/ui_concern_panel.png' });
  // a response through the button
  const before = await p.evaluate(() => world.concerns.used);
  await p.click('#cnBody button[data-resp="ration"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => ordersOf(world).ration && world.concerns.used === 1 + 0 * 1), 'ration order given from the panel');
  ok(await p.evaluate(() => /Orders in force/.test(document.getElementById('cnBody').innerText)), 'panel shows orders in force');
  // alert modes
  await p.click('#cnClose');
  await setMode('pause');
  await p.evaluate(() => { __sim.setSpeed(10); world.concerns.list.length = 0; world.concerns.muted = {}; world.stock.food = 2; concernsDay(world); renderConcerns(true) });
  ok(await p.evaluate(() => speed === 0), 'pause mode stops the game on a new critical concern (speed ' + 'now)');
  await setMode('slow');
  await p.evaluate(() => { __sim.setSpeed(30); world.concerns.list.length = 0; world.stock.food = 2; concernsDay(world); renderConcerns(true) });
  ok(await p.evaluate(() => speed === 1), 'slow mode drops the game to 1x');
  await setMode('off');
  await p.evaluate(() => { __sim.setSpeed(10); world.concerns.list.length = 0; world.stock.food = 2; concernsDay(world); renderConcerns(true) });
  ok(await p.evaluate(() => speed === 10), 'off mode leaves the speed alone');
  // setting survives a reload
  await p.reload(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById('alertMode').value === 'off'), 'alert setting remembered'); await setMode('slow'); await p.reload(); await p.waitForTimeout(600); ok(await p.evaluate(() => document.getElementById('alertMode').value === 'slow'), 'a changed setting survives a reload'); await setMode('off');
  // narrow view
  await p.setViewportSize({ width: 620, height: 800 }); await p.waitForTimeout(300);
  await p.evaluate(() => { __sim.setSpeed(0); world.concerns.list.length = 0; world.stock.food = 2; concernsDay(world); renderConcerns(true) });
  await p.waitForTimeout(200); await p.screenshot({ path: 'tests/ui_concern_narrow.png' });
  ok(await p.evaluate(() => { const r = document.getElementById('toasts').getBoundingClientRect(); return r.right <= innerWidth && r.width > 150 }), 'toasts fit a narrow screen');
  console.log('page errors:', errs.length ? errs : 'none'); ok(!errs.length, 'no page errors');
  console.log(`concerns_ui: ${fail ? fail + ' failed' : 'all passed'}`); await b.close(); process.exit(fail ? 1 : 0);
})();
