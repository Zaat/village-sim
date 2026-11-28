// v0.40: "Check this world" must leave the village on screen alone (it used to change the map size for everyone)
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForFunction(() => window.__sim);
  const run = async withCheck => p.evaluate(async withCheck => {
    newWorld(4242, { type: 'island', size: 'standard' }); __sim.setSpeed(0); const W0 = CFG.W, H0 = CFG.H;
    if (withCheck) { nwOpen(); nwType = 'continent'; nwSize = 'large'; nwRender(); $('nw_seed').value = '777'; $('nw_check').click(); await new Promise(r => setTimeout(r, 1500)); nwClose() }
    const same = CFG.W === W0 && CFG.H === H0; for (let i = 0; i < 1200 * 3; i++) world.step();
    const fp = world.vills.map(v => Math.round(v.x * 10) + ',' + Math.round(v.y * 10)).join(';') + '|' + Math.round(world.stock.food) + '|' + world.buildings.size + '|' + world.deaths;
    return { same, fp, dims: CFG.W + 'x' + CFG.H, traits: withCheck ? document.getElementById('nw_traits').textContent.slice(0, 40) : '' };
  }, withCheck);
  await p.evaluate(o => { Object.assign(CFG, o) }, OLD_PACE);
  const a = await run(false), c = await run(true);
  ok(c.same, 'the map size is unchanged after Check this world: ' + c.dims);
  ok(/continent|Continent/.test(c.traits) || c.traits.length > 5, 'the check produced a result: ' + c.traits);
  ok(a.fp === c.fp, 'the village on screen plays out the same with or without a check');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_check_world passed'); process.exit(fail ? 1 : 0);
})();
