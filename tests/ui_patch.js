// v0.38.1 UI: diagnostics fill, stats axes, land value legend, World tab sizing, resource notice slot, copyright line
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  // diagnostics: filled the moment the section opens
  await p.click('#gear'); await p.evaluate(() => { document.getElementById('diagText').parentElement.open = true }); await p.waitForTimeout(250);
  const dt = await p.evaluate(() => document.getElementById('diagText').textContent);
  ok(/seed \d+/.test(dt) && /people \d+/.test(dt) && /browser:/.test(dt), 'Diagnostics shows the world line, a snapshot and browser details at once: ' + dt.slice(0, 80));
  await p.waitForTimeout(1500); ok(await p.evaluate(() => document.getElementById('diagText').textContent.length > 100), 'and keeps filling while open');
  // v0.38.2: the text can be selected and keeps its selection while the game refreshes it
  await p.evaluate(() => { const d = document.getElementById('diagText'), r = document.createRange(); r.selectNodeContents(d); const g = getSelection(); g.removeAllRanges(); g.addRange(r) });
  const before = await p.evaluate(() => getSelection().toString().length); await p.waitForTimeout(2500);
  ok(before > 100 && await p.evaluate(() => getSelection().toString().length) === before, 'a selection in Diagnostics survives the refresh (' + before + ')');
  ok(await p.evaluate(() => !!document.getElementById('diagTextCopy') && getComputedStyle(document.getElementById('diagText')).userSelect !== 'none'), 'a Copy diagnostics button exists and the text is selectable');
  await p.evaluate(() => { getSelection().removeAllRanges() });
  // About carries the notice
  await p.evaluate(() => { aboutOpen() }); ok(await p.evaluate(() => /© 2026 Zaat/.test(document.getElementById('modal_b').innerText) && /MIT/.test(document.getElementById('modal_b').innerText)), 'About shows the copyright line'); await p.keyboard.press('Escape');
  // resource notice slot: one fixed-height element, same height with and without a notice
  await p.click('#gear'); const h1 = await p.evaluate(() => { const e = document.querySelector('#statCard .resnote'); return e ? e.getBoundingClientRect().height : -1 });
  ok(h1 > 20, 'a notice slot exists under the bars (' + h1 + ')');
  await p.evaluate(() => { world.stock.wood = 0; R.resNote = null; updateUI() }); const h2 = await p.evaluate(() => document.querySelector('#statCard .resnote').getBoundingClientRect().height);
  ok(Math.abs(h1 - h2) < 1, 'the slot keeps its height when a notice appears (' + h1 + ' vs ' + h2 + ')');
  ok(await p.evaluate(() => document.querySelectorAll('#statCard .resnote').length === 1), 'one notice, not one per resource');
  // stats graph: day ticks in the first year, value scales
  await p.evaluate(() => { world.tick += 1200 * 20; world.stats && 0 }); await p.waitForTimeout(300);
  await p.click('[data-tab=stats]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => { const c = document.getElementById('statChart'); return c && c.clientWidth > 100 }), 'the stats chart is shown');
  // World tab: neighbours sized to content and last while nobody is met
  await p.click('[data-tab=world]'); await p.waitForTimeout(600);
  const nh = await p.evaluate(() => { const c = document.getElementById('neighCard').parentElement; return { h: c.getBoundingClientRect().height, order: c.style.order } });
  ok(nh.h < 140, 'the Neighbours card sizes to its content (' + nh.h + ')'); ok(nh.order === '9', 'and sinks below the other World cards while nobody is met');
  // land value legend
  await p.evaluate(() => { landValueDay(world); R.lvShow = true; renderCity() }); ok(await p.evaluate(() => /Green is cheap/.test(document.getElementById('cityCard').innerText)), 'land value shows its legend');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_patch passed'); process.exit(fail ? 1 : 0);
})();
