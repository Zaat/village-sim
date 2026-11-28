// v0.40: the council record card in the concerns panel and the line on the game-over screen
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForFunction(() => window.__sim);
  await p.evaluate(o => { Object.assign(CFG, o); newWorld(31, { type: 'island', size: 'standard' }); __sim.setSpeed(0) }, OLD_PACE);
  await p.evaluate(() => { for (let i = 0; i < 1200 * 20; i++) world.step(); const C = CN(world); C.log = []; const e = (t, out, p, got, days) => C.log.push({ t, k: t, s: world.day - days, d: world.day, days, sev: 2, out, p, got });
    e('The food store is low', 'answered', 3, 3, 12); e('Firewood is short', 'eased', 1, 0.5, 9); e('The village is shrinking', 'bad', 5, -5, 40); e('Unity is falling', 'answered', 3, 3, 20); toggleConcerns(true); renderConcerns(true) });
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const d = document.querySelector('#cnBody .cnrec'); return d ? d.textContent : null });
  ok(r && /Council record/.test(r) && /2 answered/.test(r) && /1 ended badly/.test(r), 'the record card shows counts: ' + r);
  ok(r && /Best:/.test(r) && /Worst:/.test(r) && /Longest:/.test(r), 'best, worst and longest are named');
  await p.evaluate(() => { world.over = { kind: 'extinct', ack: false, last: 'Ann', left: ['Ann'] }; try { overCheck() } catch (e) { window.__e = e.message } });
  await p.waitForTimeout(200);
  const ov = await p.evaluate(() => ({ line: document.getElementById('over_rec').textContent, err: window.__e || '' }));
  ok(/Council record/.test(ov.line), 'the game-over screen carries the record line: ' + JSON.stringify(ov));
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_council_record passed'); process.exit(fail ? 1 : 0);
})();
