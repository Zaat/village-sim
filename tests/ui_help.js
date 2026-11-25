// v0.35 UI: the menu, the manual, the About card (version, links, report) and the welcome
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(700);
  const shown = id => p.evaluate(id => getComputedStyle(document.getElementById(id)).display !== 'none', id);
  ok(!(await shown('modal')), 'no dialog over an automated start'); ok(!(await shown('menu')), 'the menu starts closed');
  await p.click('#menuBtn'); ok(await shown('menu'), 'the menu button opens the menu'); ok(await p.evaluate(() => ['Resume', 'New world', 'Save now', 'Load saved', 'Settings', 'How to play', 'About'].every(t => document.getElementById('menu').innerText.includes(t))), 'it has the expected entries');
  await p.click('[data-mn=help]'); ok(await shown('modal') && !(await shown('menu')), 'How to play opens the manual and closes the menu'); ok(await p.evaluate(() => /Giving orders/.test(document.getElementById('modal_b').innerText) && /touch/i.test(document.getElementById('modal_b').innerText)), 'the manual covers orders and touch');
  await p.screenshot({ path: 'tests/ui_help.png' }); await p.keyboard.press('Escape'); ok(!(await shown('modal')), 'Esc closes it');
  await p.click('#menuBtn'); await p.click('[data-mn=about]'); const txt = await p.evaluate(() => document.getElementById('modal_b').innerText);
  const ver = await p.evaluate(() => APP_VERSION); ok(txt.includes('v' + ver), 'About shows the version: ' + ver); ok(await p.evaluate(v => ABOUT.version === v, ver), 'the About card version matches the app version'); ok(await p.evaluate(() => [...document.querySelectorAll('#modal_b a')].every(a => /^https:\/\/github\.com\/Zaat\/village-sim/.test(a.href)) && document.querySelectorAll('#modal_b a').length >= 3), 'its links go to the project');
  ok(await p.evaluate(() => !/@/.test(document.getElementById('modal_b').innerHTML.replace(/<[^>]+>/g, ''))), 'no email address anywhere in it');
  await p.evaluate(() => { window.open = () => { window.__opened = [...(window.__opened || []), 1] } }); await p.click('#ab_report'); await p.waitForTimeout(200); ok(await p.evaluate(() => window.__opened && window.__opened.length === 1), 'Report a problem opens the issue page'); ok(await p.evaluate(() => document.getElementById('ab_note').innerText.length > 5), 'it says what happened to the report');
  await p.click('#ab_help'); ok(await p.evaluate(() => /How to play/.test(document.getElementById('modal_t').innerText)), 'the Manual button opens the manual'); await p.click('#modal_x'); ok(!(await shown('modal')), 'the close button works');
  await p.evaluate(() => { welcomeOpen() }); ok(await shown('modal') && await p.evaluate(() => /Start a village/.test(document.getElementById('modal_b').innerText)), 'the welcome offers a start'); await p.click('#wl_play'); ok(!(await shown('modal')), 'Start closes it');
  await p.keyboard.press('?'); ok(await shown('modal'), '? opens the manual'); await p.keyboard.press('Escape');
  await p.click('#menuBtn'); await p.click('[data-mn=scen]'); ok(await p.evaluate(() => document.querySelectorAll('#modal_b [data-scen]').length === SCENARIOS.length && SCENARIOS.length >= 6), 'Scenarios lists the ready-made starts');
  await p.click('[data-scen=winters]'); await p.waitForTimeout(400); ok(await p.evaluate(() => world.arch === 'continent' && world.seed === 5 && world.settings.hardship === 2) && !(await shown('modal')), 'choosing one starts that world with its settings');
  ok(await p.evaluate(() => { for (const c of SCENARIOS) { const w = new World(c.seed, { map: c.type, hardship: c.hardship, philosophy: c.phil, openKnowledge: c.open || 0 }, MAP_SIZES[c.size].dims); for (let i = 0; i < 1200 * 20; i++) w.step(); if (w.dbg.total || w.pop < 3) return false } return true }), 'every scenario runs 20 days without errors and with people alive');
  const q = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true }); await q.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await q.waitForTimeout(600); await q.evaluate(() => aboutOpen()); await q.screenshot({ path: 'tests/ui_help_phone.png' });
  ok(await q.evaluate(() => { const r = document.querySelector('#modal .nwbox').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 }), 'the dialog fits a phone');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_help passed'); process.exit(fail ? 1 : 0);
})();
