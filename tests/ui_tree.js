// v0.27 page test: Tree of knowledge, Settings (philosophy, Open knowledge), Grant, Ages panel gives/needs, tower art
const { chromium } = require('playwright');const path = require('path');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1500, height: 900 } }); let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(800);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.reload(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => typeof renderTree === 'function' && typeof PHILOSOPHIES === 'object'), 'tree and philosophies loaded');
  // new world dialog has the new pickers
  await p.evaluate(() => nwOpen()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('#nw_phil button').length === 5 && document.querySelectorAll('#nw_open button').length === 3), 'new-world dialog: 5 philosophies, 3 open-knowledge levels');
  await p.click('#nw_phil button[data-p="martial"]'); await p.click('#nw_open button[data-o="1"]'); await p.screenshot({ path: __dirname + '/ui_tree_newworld.png' });
  await p.fill('#nw_seed', '77'); await p.click('#nw_go'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => world.settings.philosophy === 'martial' && world.settings.openKnowledge === 1 && world.sandbox === true), 'chosen philosophy and open knowledge reach the world');
  // tree
  ok(await p.evaluate(() => !!$('treeBtn')), 'tree button exists'); await p.evaluate(() => $('treeBtn').click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#treeSvg g[data-tid]').length === Object.keys(TECHS).length), 'tree shows every technology');
  await p.screenshot({ path: __dirname + '/ui_tree.png' });
  await p.click('#treeSvg g[data-tid="masonry"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /Gives/.test($('treeInfo').textContent) && /Grant/.test($('treeInfo').textContent)), 'selecting shows gives and a Grant button while the sandbox is on');
  await p.click('#treeInfo [data-grant]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!world.tech.known.masonry && !!world.tech.known.tools), 'Grant learns the technology and what it rests on');
  await p.screenshot({ path: __dirname + '/ui_tree_sel.png' });
  await p.click('#treeClose');
  // switch it off live in Settings
  await p.evaluate(() => toggleDrawer(true)); await p.waitForTimeout(200);
  await p.selectOption('#set_open', '0'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => world.settings.openKnowledge === 0 && world.sandbox === true && JSON.stringify(world.chron.events).includes('bound by its limits')), 'turning it off is noted, the sandbox mark stays');
  await p.evaluate(() => toggleDrawer(false));
  ok(await p.evaluate(() => !document.querySelector('[data-grant]')), 'no Grant buttons when it is off');
  // ages panel
  await p.evaluate(() => { techOpen = 'build'; renderTech() }); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /Gives:/.test($('techCard').textContent)), 'Ages panel lists what technologies give');
  await p.screenshot({ path: __dirname + '/ui_tree_ages.png' });
  // tower art
  await p.evaluate(() => { for (const id of Object.keys(TECHS)) world.tech.known[id] = 1; world.settings.openKnowledge = 0; const h = world.houses()[0]; h.style = 6; ensureStats(world, h); restyle(world, h) });
  await p.evaluate(() => { const hs = world.houses(); hs.forEach((h, i) => { h.style = [6, 5, 4, 6, 3, 6, 2, 5][i % 8]; restyle(world, h) }); R.terrKey = ''; __sim.select(null); R.cam.z = 3; const h = hs[0]; R.cam.x = (h.x + 4) * CFG.T; R.cam.y = (h.y + 2) * CFG.T });
  await p.waitForTimeout(700); await p.screenshot({ path: __dirname + '/art_tower.png' });
  ok(await p.evaluate(() => bedsOf(world.houses()[0]) === CFG.HOUSE_CAP + 12 && HOUSE_STYLES[6] === 'Tower block'), 'tower block sleeps 16');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('ui_tree: passed', pass, 'failed', fail); await b.close(); process.exit(fail ? 1 : 0);
})();
