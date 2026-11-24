// v0.35 UI: the end screen appears when the village is over, pauses the game, and offers to carry on or begin again
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(() => { newWorld(777, { type: 'lakeland', size: 'standard' }); __sim.setSpeed(0); for (let i = 0; i < 1200 * 20; i++) world.step(); updateUI() }); await p.waitForTimeout(300);
  const shown = () => p.evaluate(() => getComputedStyle(document.getElementById('over')).display !== 'none');
  ok(!(await shown()), 'no end screen for a living village');
  await p.evaluate(() => { world.lastGone = { name: 'Ada Reed', day: 20 }; world.vills.length = 0; for (let i = 0; i < 1300; i++) world.step(); __sim.setSpeed(10) }); await p.waitForTimeout(900);
  ok(await shown(), 'the end screen appears'); ok(await p.evaluate(() => /Ada Reed was the last/.test(document.getElementById('over_text').innerText)), 'it names the last villager');
  ok(await p.evaluate(() => document.getElementById('over_facts').innerText.includes('Lasted')), 'it shows what the village was'); await p.screenshot({ path: 'tests/ui_over.png' });
  ok(await p.evaluate(() => speed === 0), 'the game is paused');
  await p.click('#over_cont'); await p.waitForTimeout(200); ok(!(await shown()) && await p.evaluate(() => world.over.ack), 'Keep watching closes it and remembers');
  await p.waitForTimeout(700); ok(!(await shown()), 'it does not come back');
  await p.evaluate(() => { world.over.ack = false }); await p.waitForTimeout(700); ok(await shown(), 'it shows again for an unseen ending (after a load, say)');
  const seed = await p.evaluate(() => world.seed); await p.click('#over_again'); await p.waitForTimeout(500);
  ok(!(await shown()) && await p.evaluate(s => world.seed === s && world.vills.length > 0 && !world.over, seed), 'Same world again starts the same seed afresh');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_over passed'); process.exit(fail ? 1 : 0);
})();
