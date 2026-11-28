// v0.39.1 UI: layout modes, Deaths and Overview presets, compact lists, hover history, merged Diagnostics, the loop numbers
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(700);
  const lay = () => p.evaluate(() => document.body.dataset.layout);
  ok(await lay() === 'docked', 'docked is the default');
  await p.keyboard.press('l'); ok(await lay() === 'clean', 'L switches to Clean');
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('side')).display === 'none'), 'Clean hides the side panel');
  await p.click('#layBack'); ok(await lay() === 'docked', 'the corner button leaves Clean');
  await p.evaluate(() => localStorage.setItem('villagesim.layout', 'overlay')); await p.reload(); await p.waitForTimeout(500); ok(await lay() === 'docked', 'a stored removed mode falls back to Docked');
  ok(await p.evaluate(() => [...document.getElementById('set_layout').options].map(o => o.value).join() === 'docked,clean'), 'Settings offers Docked and Clean');
  // menu: 8 items, closes with Esc, version footer
  await p.click('#menuBtn'); ok(await p.evaluate(() => document.querySelectorAll('#menu button[data-mn]').length === 8), 'the menu has eight items'); ok(await p.evaluate(() => /0\.39\.1/.test(document.getElementById('menuVer').textContent)), 'the menu shows the version');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => document.getElementById('menu').style.display !== 'block'), 'Esc closes the menu');
  // run a little, then Stats presets and hover history
  await p.evaluate(() => setSpeed(100)); await p.waitForTimeout(8000); await p.evaluate(() => setSpeed(0));
  await p.click('#tabbar button[data-tab=stats]'); await p.waitForTimeout(1600);
  ok(await p.evaluate(() => [...document.querySelectorAll('#statViews button')].map(x => x.textContent.trim()).join('|').startsWith('Overview')), 'Stats starts with an Overview preset');
  await p.click('#statViews button[data-view=deaths]'); ok(await p.evaluate(() => statUI.sel.includes('d_illness') && statUI.sel.includes('d_age')), 'the Deaths preset charts the death series');
  await p.click('#statViews button[data-view=deaths]'); ok(await p.evaluate(() => statUI.sel.join() === STAT_VIEWS.overview.ids.join()), 'clicking the active preset returns to Overview');
  const sp = p.locator('[data-spark]').first(); ok(await sp.count() > 0, 'stat names are tagged for hover history'); await sp.hover(); await p.waitForTimeout(250);
  ok(await p.evaluate(() => [...document.querySelectorAll('.stattip')].some(t => t.style.display === 'block' && /low .* high/.test(t.textContent))), 'hovering a stat name shows its graph');
  // compact lists and short dates
  const L = await p.evaluate(() => { const rows = Array.from({ length: 12 }, (_, i) => `<div>r${i}</div>`); const h = compactList('t', rows, 5, 30); return [h.includes('Earlier (7)'), ydTag(1768).includes('Y56 D8'), ydTag(1).includes('Y1 D1')] });
  ok(L[0], 'compactList keeps five and folds the rest'); ok(L[1] && L[2], 'dates read like Y56 D8');
  // diagnostics: one card, version, loop numbers
  await p.click('#tabbar button[data-tab=world]'); await p.evaluate(() => { document.getElementById('diagCard').open = true }); await p.waitForTimeout(1300);
  ok(await p.evaluate(() => document.getElementById('diagCard').contains(document.getElementById('diagText')) && /ticks\/frame/.test(document.getElementById('diagText').textContent)), 'Diagnostics shows the village text with loop numbers');
  ok(await p.evaluate(() => /0\.39\.1/.test(document.getElementById('diagVer').textContent)), 'Diagnostics shows the version');
  ok(await p.evaluate(() => { const r = JSON.parse(JSON.stringify(dbgReport(world, 0))); return r.performance && 'ticksPerFrame' in r.performance && r.village }), 'the report carries loop numbers and the village text');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_v0391 passed'); process.exit(fail ? 1 : 0);
})();
