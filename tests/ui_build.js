// v0.39.3 build panel: groups, costs against the stock, locked buildings say what they need, a line about the chosen building, Spanish
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(async () => { localStorage.clear(); await new Promise(r => { const q = indexedDB.deleteDatabase('villagesim'); q.onsuccess = q.onerror = q.onblocked = r }) });
  await p.reload(); await p.waitForTimeout(600); try { await p.click('#welcome button', { timeout: 1500 }) } catch (e) { }
  await p.evaluate(() => { __sim.newWorld(777); __sim.setSpeed(0); __sim.run(300) });
  await p.evaluate(() => { document.querySelector('#modeSw [data-mode="play"]').click() }); await p.waitForTimeout(200);
  await p.evaluate(() => { world.stock.wood = 5; world.stock.stone = 1; puTool('build') }); await p.waitForTimeout(200);
  const t = await p.evaluate(() => ({ groups: [...document.querySelectorAll('#ppanel .pgroup')].map(x => x.textContent), stock: (document.querySelector('#ppanel .pstock') || {}).textContent, lack: document.querySelectorAll('#ppanel .pgrid small i.lack').length, locked: [...document.querySelectorAll('#ppanel .pgrid button.locked small')].map(x => x.textContent), btns: document.querySelectorAll('#ppanel .pgrid button').length }));
  ok(t.groups.join('|') === 'Homes and food|Work|Civic', 'three groups: ' + t.groups.join('|'));
  ok(/You have 5 wood · 1 stone/.test(t.stock), 'the stock line: ' + t.stock);
  ok(t.lack > 0, 'costs the village cannot afford are marked: ' + t.lack);
  ok(t.locked.length > 0 && t.locked.every(x => /^Needs /.test(x)), 'locked buildings say what they need: ' + t.locked.join(' / '));
  ok(t.btns >= 9, 'every building has a button: ' + t.btns);
  await p.evaluate(() => { document.querySelector('#ppanel [data-ptype="house"]').click() }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => /House · 2×2 · /.test((document.querySelector('#ppanel .pinfo') || {}).textContent || '')), 'the chosen building gets a line about it: ' + await p.evaluate(() => (document.querySelector('#ppanel .pinfo') || {}).textContent));
  ok(await p.evaluate(() => PU.type === 'house'), 'clicking selects the type');
  await p.evaluate(() => { world.stock.wood = 200; world.stock.stone = 100; puRefresh() }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelectorAll('#ppanel .pgrid small i.lack').length === 0), 'nothing is marked short when the stock is plentiful');
  // Spanish
  await p.evaluate(() => { langApply('es', false) }); await p.waitForTimeout(300); await p.evaluate(() => puRefresh()); await p.waitForTimeout(200);
  const es = await p.evaluate(() => ({ g: [...document.querySelectorAll('#ppanel .pgroup')].map(x => x.textContent).join('|'), names: [...document.querySelectorAll('#ppanel .pgrid button span')].map(x => x.textContent).slice(0, 3).join('|'), lang: I18N.lang }));
  ok(es.lang === 'es' && /Casas y comida/.test(es.g) && /Casa\|Granja\|Almacén/.test(es.names), 'the panel speaks Spanish: ' + JSON.stringify(es));
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_build passed'); process.exit(fail ? 1 : 0);
})();
