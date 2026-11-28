// v0.40: the growth line under the population: always one fixed-height line, right words for growing / slowing / holding / falling, reasons when not growing
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForFunction(() => window.__sim);
  await p.evaluate(o => { Object.assign(CFG, o); newWorld(2468, { type: 'island', size: 'standard' }); __sim.setSpeed(0); showTab('village') }, OLD_PACE);
  const heights = await p.evaluate(() => { const hs = new Set(), words = new Set(); for (let y = 0; y < 5; y++) { for (let i = 0; i < 1200 * 16; i++) world.step(); updateUI(); const g = document.querySelector('#statCard .gchip'); if (!g) { hs.add('none'); continue } hs.add(document.getElementById('statCard').querySelector('.big').parentElement.getBoundingClientRect().height); words.add(g.textContent) } return { hs: [...hs], words: [...words] } });
  ok(!heights.hs.includes('none') && heights.hs.length === 1, 'the growth chip is always there and the heading row keeps one height: ' + JSON.stringify(heights));
  const st = await p.evaluate(() => {
    const C = CN(world), out = {}; const set = (arr, extra) => { C.pop.length = 0; for (const x of arr) C.pop.push(x); Object.assign(world, extra || {}) };
    const mk = (a, b, c) => { const r = []; for (let i = 0; i < 70; i++) r.push(i < 6 ? b : i < 38 ? a : c); return r }; const now = world.pop;
    set(Array.from({ length: 80 }, (_, i) => Math.round(now * (0.6 + 0.4 * i / 79)))); out.grow = growthStatus(world).state;
    set(Array.from({ length: 80 }, () => now)); out.flat = growthStatus(world).state;
    set(Array.from({ length: 80 }, (_, i) => Math.round(now * (1.5 - 0.5 * i / 79)))); out.fall = growthStatus(world);
    set(Array.from({ length: 10 }, () => now)); out.newv = growthStatus(world).state;
    return { grow: out.grow, flat: out.flat, fall: out.fall.state, why: out.fall.reasons.length, newv: out.newv };
  });
  ok(st.grow === 'growing' && st.flat === 'flat' && st.fall === 'falling' && st.newv === 'new', 'states: ' + JSON.stringify(st));
  ok(st.why >= 1, 'a falling village names at least one reason');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_growth_line passed'); process.exit(fail ? 1 : 0);
})();
