// v0.31 UI: Culture & guilds card in the Society tab
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { newWorld(777); __sim.setSpeed(0) });
  await p.evaluate(() => { for (let i = 0; i < 1200 * 60; i++) world.step() });
  await p.click('#tabbar button[data-tab="society"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Culture/.test(document.getElementById('cultCard').innerText) && /weddings/.test(document.getElementById('cultCard').innerText)), 'culture card shows counts');
  await p.evaluate(() => { const C = CUL(world); C.guilds.push({ trade: 'farmer', name: 'Growers’ Guild', day: 1, members: 6, dues: 12 }); C.sold = 2; C.earned = 40; C.plagues = 1; C.plagueDead = 3; renderCulture() });
  ok(await p.evaluate(() => /Growers/.test(document.getElementById('cultCard').innerText) && /Lessons sold 2/.test(document.getElementById('cultCard').innerText)), 'guild and sales shown');
  await p.screenshot({ path: 'tests/ui_culture.png' });
  await p.evaluate(() => { for (let i = 0; i < 1200 * 3; i++) world.step() }); await p.waitForTimeout(300);
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_culture passed'); process.exit(fail ? 1 : 0);
})();
