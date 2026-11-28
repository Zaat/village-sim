// v0.32 UI: clicking another settlement shows its details; the tree window fits the stage; "Recently eased" stays open
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { newWorld(777, { type: 'island', size: 'standard' }); __sim.setSpeed(0) });
  const has = await p.evaluate(() => !!(world.neigh && world.neigh.length));
  ok(has, 'the world has neighbours');
  await p.evaluate(() => { const n = world.neigh[0]; n.found = true; n.met = true; n.rel = 30; n.pact = 1; n.tradeCount = 3; n.hist = ['First contact.', 'Traded grain.']; n.knows = ['fire'].filter(id => TECHS[id]).concat(Object.keys(TECHS).slice(0, 3)); selected = n; updateUI() });
  await p.waitForTimeout(200);
  const txt = await p.evaluate(() => document.getElementById('sel').innerText);
  ok(/settlement/i.test(txt) && /dealings/i.test(txt) && /knowledge/i.test(txt) && /recent history/i.test(txt), 'settlement panel shows sections');
  // clicking its spot on the map selects it
  const hit = await p.evaluate(() => { selected = null; const n = world.neigh[0], T = CFG.T; R.cam.x = n.x * T; R.cam.y = n.y * T; R.cam.z = 1; const r = cv.getBoundingClientRect(); pick(cv.width / 2, cv.height / 2); return selected === n });
  ok(hit, 'clicking the settlement selects it');
  await p.screenshot({ path: 'tests/ui_settle.png' });
  // tree window inside the stage
  for (const [w, h] of [[1500, 900], [900, 520], [390, 700]]) {
    await p.setViewportSize({ width: w, height: h }); await p.evaluate(() => treeOpen()); await p.waitForTimeout(150);
    const r = await p.evaluate(() => { const bx = document.querySelector('.treebox').getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect(); return { l: bx.left - st.left, t: bx.top - st.top, r: st.right - bx.right, b: st.bottom - bx.bottom } });
    ok(r.l >= -1 && r.t >= -1 && r.r >= -1 && r.b >= -1, 'tree window inside the stage at ' + w + 'x' + h + ' ' + JSON.stringify(r)); await p.evaluate(() => treeClose());
  }
  await p.setViewportSize({ width: 1500, height: 950 });
  // concerns: recently eased stays open across a refresh
  const open = await p.evaluate(() => { const C = world.concerns; C.hist.unshift({ id: 'x', title: 'Hunger', since: 1, end: world.day, did: [] }); cnUI.open = true; cnUI.sig = ''; renderConcerns(true); const d = document.getElementById('cnHist'); if (!d) return 'nodetails'; d.open = true; d.dispatchEvent(new Event('toggle')); cnUI.sig = ''; renderConcerns(true); return document.getElementById('cnHist').open });
  ok(open === true, 'recently eased stays open: ' + open);
  // causes of death card
  await p.evaluate(() => { world.day = world.day; for (let i = 0; i < 4; i++) { const v = world.vills[world.vills.length - 1]; v.cause = 'cold'; v.health = 0; world.kill(v, 'froze to death') } const o = world.vills[0]; world.kill(o, 'passed away peacefully of old age'); showTab('society'); updateUI() });
  const dt = await p.evaluate(() => document.getElementById('deathCard').innerText);
  ok(/5 deaths/.test(dt) && /cold/i.test(dt) && /old age/i.test(dt) && /preventable/i.test(dt), 'causes of death card: ' + dt.slice(0, 120).replace(/\n/g, ' '));
  ok(await p.evaluate(() => world.dlog.length === 5 && world.dyr[world.year].cold === 4), 'death log and yearly tally recorded');
  await p.evaluate(() => { const d = deserializeWorld(JSON.parse(JSON.stringify(serializeWorld(world)))); window.__dl = d.dlog.length + ':' + (d.dyr[d.year] && d.dyr[d.year].cold) });
  ok(await p.evaluate(() => window.__dl === '5:4'), 'death log survives save and load');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_settle passed'); process.exit(fail ? 1 : 0);
})();
