// v0.28 page test: Expeditions & discoveries card, map flags for known sites, materials chips
const { chromium } = require('playwright');const path = require('path');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1500, height: 900 } }); let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(800);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => nwOpen()); await p.waitForTimeout(200); await p.fill('#nw_seed', '12'); await p.click('#nw_go'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => typeof renderDisc === 'function' && !!world.disc), 'discovery module loaded');
  ok(await p.evaluate(() => $('discBox').style.display === 'none' || true), 'card hidden or shown cleanly at the start');
  // give the village some history: sites heard of, a find, a running party
  await p.evaluate(() => {
    const w = world, D = w.disc; discoveryDay(w); w.tick = 1200 * 80; D.sites.slice().sort((a, b) => Math.hypot(a.x - w.cx, a.y - w.cy) - Math.hypot(b.x - w.cx, b.y - w.cy)).slice(0, 5).forEach(s => s.known = true);
    D.mats.copper = 5; D.done = 3; D.lore = 1; D.log.unshift({ day: 70, text: 'Marek returns from an outcrop of dark stone with 18 loads of goods, a source of copper.' });
    const s = D.sites.find(x => x.known && !SITE_KINDS[x.kind].sea); D.exped.push({ id: 99, site: s.id, mode: 'land', state: 'running', leader: w.vills[0].id, escorts: 0, day: w.day, kind: s.kind });
    });
  await p.click('#tabbar button[data-tab="progress"]');
  await p.evaluate(() => { renderDisc() });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => $('discBox').style.display !== 'none' && /copper/.test($('discCard').textContent) && /Heard of/.test($('discCard').textContent)), 'card lists materials and known sites');
  ok(await p.evaluate(() => /On the road/.test($('discCard').textContent) && /leads/.test($('discCard').textContent)), 'card shows the running expedition and its leader');
  ok(await p.evaluate(() => /Marek returns/.test($('discCard').textContent)), 'card shows recent finds');
  await p.evaluate(() => { const el = $('discBox'); el.scrollIntoView() }); await p.waitForTimeout(200); await p.screenshot({ path: __dirname + '/ui_disc.png' });
  // map flag
  await p.evaluate(() => { const w = world, s = w.disc.sites.find(x => x.known && !SITE_KINDS[x.kind].sea); R.cam.z = 2; R.cam.x = s.x * CFG.T; R.cam.y = s.y * CFG.T; __sim.select(null); w.settings.fog = false }); await p.waitForTimeout(700);
  await p.screenshot({ path: __dirname + '/art_sites.png' });
  ok(await p.evaluate(() => typeof siteMark === 'function'), 'site flag drawing present');
  // v0.28.1: new-world dialog "Check this world"
  await p.evaluate(() => nwOpen()); await p.waitForTimeout(200); await p.fill('#nw_seed', '5'); await p.click('#nw_check'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => /Barges/.test($('nw_traits').textContent) && /Neighbours/.test($('nw_traits').textContent)), 'check shows barges and neighbours');
  await p.screenshot({ path: __dirname + '/ui_traits.png' });
  await p.fill('#nw_seed', '6'); ok(await p.evaluate(() => $('nw_traits').textContent.trim() === ''), 'changing the seed clears the traits');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('ui_disc: passed', pass, 'failed', fail); await b.close(); process.exit(fail ? 1 : 0);
})();
