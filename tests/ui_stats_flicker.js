// v0.40: the Stats tab keeps its preset and window buttons while nothing changes (they used to be rebuilt on every refresh and flickered)
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForFunction(() => window.__sim);
  await p.evaluate(o => { Object.assign(CFG, o); newWorld(909, { type: 'island', size: 'standard' }); __sim.setSpeed(0) }, OLD_PACE);
  await p.evaluate(() => { for (let i = 0; i < 1200 * 32 * 3; i++) world.step(); showTab('stats'); renderStats(true) });
  const r = await p.evaluate(async () => {
    const out = { muts: 0 }; const mo = new MutationObserver(l => { out.muts += l.length }); mo.observe(document.getElementById('statViews'), { childList: true, subtree: true, attributes: true }); mo.observe(document.getElementById('statWin'), { childList: true, subtree: true, attributes: true });
    for (let i = 0; i < 6; i++) { renderStats(true); await new Promise(r => setTimeout(r, 30)) }
    for (let i = 0; i < 1200; i++) world.step(); for (let i = 0; i < 4; i++) { renderStats(true); await new Promise(r => setTimeout(r, 30)) }
    await new Promise(r => setTimeout(r, 50)); mo.disconnect(); return out;
  });
  ok(r.muts === 0, 'preset and window buttons were not rebuilt while nothing changed: ' + r.muts + ' mutations');
  await p.click('#statViews [data-view]:not(.on)'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('#statViews button.on').length === 1), 'choosing a preset marks exactly one button');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_stats_flicker passed'); process.exit(fail ? 1 : 0);
})();
