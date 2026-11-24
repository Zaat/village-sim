// v0.33 UI: the City card, the land value overlay, the world line (copy and paste), and the Concerns list keeping its place when it refreshes
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///home/claude/village-sim/index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { newWorld(777, { type: 'island', size: 'standard' }); __sim.setSpeed(0) });
  await p.evaluate(() => { for (let i = 0; i < 1200 * 32 * 3; i++) world.step() });
  await p.evaluate(() => { showTab('world'); updateUI() }); await p.waitForTimeout(300);
  let txt = await p.evaluate(() => document.getElementById('cityCard').innerText);
  ok(/laid out/i.test(txt) && /homes by style/i.test(txt) && /land value/i.test(txt), 'city card shows layout, styles and land value: ' + txt.slice(0, 100).replace(/\n/g, ' '));
  await p.evaluate(() => document.getElementById('lvBtn').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => R.lvShow === true), 'the land value button turns the overlay on'); await p.screenshot({ path: 'tests/ui_city.png' });
  await p.evaluate(() => document.getElementById('lvBtn').click()); ok(await p.evaluate(() => R.lvShow === false), 'and off again');
  // the world line
  const line = await p.evaluate(() => document.getElementById('worldLine').textContent);
  ok(/seed 777/.test(line) && /island/.test(line) && /year \d+ day \d+/.test(line) && /^v0\./.test(line), 'the world line is shown in Settings: ' + line);
  const dg = await p.evaluate(() => { const d = document.getElementById('diagText'); d.parentElement.open = true; renderWorldLine(); return d.textContent });
  ok(/people \d+/.test(dg) && /beds/.test(dg), 'the diagnostics text carries a snapshot: ' + dg.slice(0, 80).replace(/\n/g, ' '));
  // pasting a world line into the seed box sets everything it names
  await p.evaluate(() => { nwOpen(); const s = document.getElementById('nw_seed'); s.value = 'v0.33 · seed 351323045 · lakeland · large · hardship harsh · martial · open knowledge relaxed · survival on, disasters off, crime on, raids on · year 4 day 2 (tick 1)'; s.dispatchEvent(new Event('input')) });
  const nw = await p.evaluate(() => ({ seed: document.getElementById('nw_seed').value, type: nwType, size: nwSize, hard: nwHard, phil: nwPhil, open: nwOpen_, sw: nwSw }));
  ok(nw.seed === '351323045' && nw.type === 'lakeland' && nw.size === 'large' && nw.hard === 2 && nw.phil === 'martial' && nw.open === 1 && nw.sw && nw.sw.raids === true && nw.sw.disasters === false, 'a pasted world line sets seed, map, size and settings: ' + JSON.stringify(nw));
  await p.evaluate(() => nwClose());
  // concerns keep their place when the list refreshes
  const sc = await p.evaluate(() => { const C = world.concerns; for (let i = 0; i < 14; i++) C.hist.unshift({ id: 'h' + i, title: 'Old worry ' + i, since: 1, end: world.day, did: ['x'] }); cnUI.open = true; document.getElementById('concernPanel').style.display = 'block'; cnUI.sig = ''; renderConcerns(true); const pn = document.getElementById('concernPanel'); pn.scrollTop = 80; const before = pn.scrollTop; cnUI.sig = ''; renderConcerns(true); return { before, after: pn.scrollTop, can: pn.scrollHeight > pn.clientHeight } });
  ok(!sc.can || (sc.before > 0 && sc.after === sc.before), 'the Concerns list keeps its scroll position on refresh: ' + JSON.stringify(sc));
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_city passed'); process.exit(fail ? 1 : 0);
})();
