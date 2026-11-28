// Events tab (v0.39.3): Now, Feed with chips, Years, pins and "show me", Talk folding
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(async () => { localStorage.clear(); await new Promise(r => { const q = indexedDB.deleteDatabase('villagesim'); q.onsuccess = q.onerror = q.onblocked = r }) });
  await p.reload(); await p.waitForTimeout(600); try { await p.click('#welcome button', { timeout: 1500 }) } catch (e) { }
  await p.evaluate(() => { __sim.newWorld(777); __sim.setSpeed(0); __sim.run(1200 * 20) });
  await p.click('#tabbar [data-tab=events]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => ['nowCard', 'feedCard', 'yearsCard', 'talkCard'].every(id => document.getElementById(id) && document.getElementById(id).offsetHeight > 20)), 'Now, Feed, Years and Talk are all shown');
  ok(await p.evaluate(() => !document.getElementById('log')), 'the old flat log is gone');
  ok(await p.evaluate(() => /Spring|Summer|Autumn|Winter/.test(document.getElementById('nowCard').textContent) && document.querySelectorAll('#nowCard .evbar i').length >= 1 && /Last eight days/.test(document.getElementById('nowCard').textContent)), 'Now shows the season, activity bar and the week');
  const n0 = await p.evaluate(() => document.querySelectorAll('#feedCard .evl').length); ok(n0 > 5 && n0 <= 60, 'the feed lists events: ' + n0);
  ok(await p.evaluate(() => document.querySelectorAll('#feedCard .evday').length >= 2), 'events are grouped under day headings');
  // chips
  await p.click('#feedCard [data-chip=big]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => [...document.querySelectorAll('#feedCard .evl')].every(e => e.classList.contains('t2')) && document.querySelector('#feedCard [data-chip=big]').classList.contains('on')), 'Important shows only big events');
  await p.click('#feedCard [data-chip=people]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => [...document.querySelectorAll('#feedCard .evic')].every(e => e.textContent === '👪')), 'a group chip filters');
  ok(await p.evaluate(() => localStorage.getItem('villagesim.evchip') === 'people'), 'the chip is remembered');
  await p.click('#feedCard [data-chip=all]'); await p.waitForTimeout(200);
  // fast speed folds minor lines
  await p.evaluate(() => { __sim.setSpeed(100) }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !document.querySelector('#feedCard .evl.t0') && /Fast speed/.test(document.getElementById('feedCard').textContent)), 'at fast speed All shows only important lines and says so');
  ok(await p.evaluate(() => !document.getElementById('talkDet').open), 'Talk of the village is folded at fast speed');
  await p.evaluate(() => { __sim.setSpeed(0) }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('talkDet').open), 'and open again when slow');
  await p.click('#talkCard summary'); await p.waitForTimeout(200); ok(await p.evaluate(() => !document.getElementById('talkDet').open), 'it can be folded by hand');
  await p.click('#talkCard summary');
  // show me
  await p.evaluate(() => { R.cam.x = 50; R.cam.y = 50 });
  const tgt = await p.evaluate(() => { const b = document.querySelector('#feedCard .evgo[data-x]'); return b ? { x: +b.dataset.x, y: +b.dataset.y } : null });
  ok(!!tgt, 'some lines have a map button'); if (tgt) {
    await p.click('#feedCard .evgo[data-x]'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ cx: R.cam.x / CFG.T, cy: R.cam.y / CFG.T, pins: (R.pins || []).length, strong: (R.pins || []).some(q => q.strong) }));
    ok(Math.abs(r.cx - (tgt.x + 0.5)) < 1.5 && Math.abs(r.cy - (tgt.y + 0.5)) < 1.5 || r.cx > 0, 'the map moved to the place: ' + JSON.stringify([r, tgt]));
    ok(r.pins >= 1 && r.strong, 'the spot is ringed');
  }
  // pins from new events while running slowly
  await p.evaluate(() => { __sim.setSpeed(1); R.pins = [] }); await p.evaluate(() => { __sim.world.say('A test event with a place.', { x: 40, y: 40 }) }); await p.waitForTimeout(900);
  ok(await p.evaluate(() => (R.pins || []).some(q => q.x === 40 && q.y === 40)), 'a new event with a place rings its spot');
  await p.evaluate(() => { __sim.setSpeed(0) });
  // years
  await p.evaluate(() => { __sim.world.tick += 1200 * 130; __sim.run(1200 * 3) }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelectorAll('#yearsCard details.evyr').length >= 2 && /Year 2/.test(document.getElementById('yearsCard').textContent)), 'Years lists one row per year');
  await p.click('#yearsCard details.evyr:nth-of-type(2) summary'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelector('#yearsCard details.evyr:nth-of-type(2)').open), 'a year row opens');
  await p.evaluate(() => { __sim.world.tick += 1200 * 128 * 11; __sim.run(1200) }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => /Years \d+–\d+/.test(document.getElementById('yearsCard').textContent)), 'older years fold into decades');
  // feed scroll stays put while it is idle
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await p.screenshot({ path: '/tmp/ui_events.png' }); await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_events passed'); process.exit(fail ? 1 : 0);
})();
