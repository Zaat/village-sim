// v0.30 UI: Defence & war card, soldier markers on the map, barracks/watchtower art, Settings switch
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { __sim.setSpeed(0) });
  await p.evaluate(() => { for (let i = 0; i < 1200 * 40; i++) world.step() });
  await p.click('#tabbar button[data-tab="world"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Peace holds/.test(document.getElementById('warCard').innerText)), 'peace message with raids off');
  ok(await p.evaluate(() => /Raids and war/.test(document.getElementById('tab_world').ownerDocument.body.innerText) || !!document.getElementById('set_raids')), 'settings switch is there');
  // arm the village
  await p.evaluate(() => {
    world.settings.raids = true; const n = world.neigh.find(x => x.kind === 'raiders'); Object.assign(n, { met: true, found: true, rel: -40, grudge: 0.5, tribute: 0, raids: 2, nextVisit: 9999, nextDemand: 9999, raidCd: 9999 });
    const W = WAR(world), ad = world.vills.filter(v => v.isAdult() && !v.isElder()).slice(0, 6); ad.forEach((v, i) => { W.rolls[v.id] = { t: ['militia', 'spearman', 'archer', 'swordsman', 'legionary', 'musketeer'][i], xp: 3 } });
    W.battles.unshift({ d: world.day, kind: 'raid', foe: n.name, outcome: 'repelled', lostOurs: 1, lostTheirs: 3 }); W.repelled = 1; W.fallen = 1;
    __sim.select && __sim.select(ad[0]); renderWar();
  });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => /6 under arms/.test(document.getElementById('warCard').innerText)), 'army size shown');
  ok(await p.evaluate(() => /musketeer/.test(document.getElementById('warCard').innerText) && /spearm/.test(document.getElementById('warCard').innerText)), 'unit types listed');
  ok(await p.evaluate(() => /repelled/.test(document.getElementById('warCard').innerText)), 'battle log shown');
  ok(await p.evaluate(() => /Morale/.test(document.getElementById('warCard').innerText)), 'morale bar shown');
  // art for the two new buildings and soldiers on the map
  const art = await p.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 140; const g = cv.getContext('2d'); let err = '';
    try { for (const [i, t] of ['barracks', 'watchtower'].entries()) { const b = { type: t, x: 2 + i * 6, y: 3, w: PROJECTS[t].size[0], h: PROJECTS[t].size[1], hp: 300 }; if (typeof drawBuilding === 'function') drawBuilding(g, world, b, 0, false) } } catch (e) { err = e.message }
    return err
  });
  ok(art === '', 'new buildings draw without errors ' + art);
  await p.click('#tabbar button[data-tab="village"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /(militiaman|spearman|archer|swordsman|legionary|musketeer)/.test(document.getElementById('sel').innerText)), 'inspector names the soldier');
  await p.screenshot({ path: 'tests/ui_war.png' });
  await p.click('#tabbar button[data-tab="world"]'); await p.waitForTimeout(200); await p.screenshot({ path: 'tests/ui_war_card.png' });
  await p.evaluate(() => { for (let i = 0; i < 1200 * 3; i++) world.step() }); await p.waitForTimeout(300);
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_war passed'); process.exit(fail ? 1 : 0);
})();
