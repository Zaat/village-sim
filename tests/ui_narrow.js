// v0.40: narrow window (749x821): Clean view works, the Play bar is only as wide as its buttons, the Leave button text matches the hint
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 749, height: 821 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForFunction(() => window.__sim);
  await p.evaluate(o => { Object.assign(CFG, o); newWorld(321, { type: 'island', size: 'standard' }); __sim.setSpeed(0) }, OLD_PACE);
  const m = () => p.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), disp: cs.display, fs: cs.fontSize } }; return { vw: innerWidth, vh: innerHeight, stage: q('#stage'), side: q('#side'), ptool: q('#ptool'), back: q('#layBack'), hint: q('#hint'), sw: document.documentElement.scrollWidth } });
  await p.evaluate(() => { playOf(world).on = true; document.body.classList.add('playing'); if (typeof renderPlay === 'function') try { renderPlay() } catch (e) { } });
  await p.waitForTimeout(300);
  let r = await m();
  ok(r.ptool && r.ptool.disp !== 'none' && r.ptool.w < r.vw - 40, 'Play bar is narrower than the window: ' + JSON.stringify(r.ptool));
  await p.evaluate(() => setLayout('clean', true)); await p.waitForTimeout(300); r = await m();
  ok(r.side.disp === 'none', 'Clean hides the side panel in a narrow window');
  ok(r.stage.h >= r.vh - 2, 'Clean map fills the window height: ' + r.stage.h + ' of ' + r.vh);
  ok(r.back && r.back.disp !== 'none' && r.back.top < 90, 'Leave button visible at the top: ' + JSON.stringify(r.back));
  ok(r.sw <= r.vw + 1, 'no sideways scroll in Clean: ' + r.sw);
  await p.screenshot({ path: 'tests/ui_narrow_clean.png' });
  await p.click('#layBack'); await p.waitForTimeout(200); r = await m();
  ok(r.side.disp !== 'none' && r.stage.h < r.vh, 'Leaving Clean brings the side panel back');
  const fs = await p.evaluate(() => { document.body.dataset.layout = 'clean'; const a = getComputedStyle(document.getElementById('layBack')).fontSize; document.body.dataset.layout = 'docked'; const h = getComputedStyle(document.getElementById('hint')).fontSize; return [a, h] });
  ok(fs[0] === fs[1], 'Leave button text matches the shortcut hint size: ' + fs.join(' vs '));
  await p.evaluate(() => toggleDrawer(true)); ok(await p.evaluate(() => { const b = document.getElementById('newWorldBtn'); b.click(); return getComputedStyle(document.getElementById('nw')).display !== 'none' }), 'New world… in the Save & load card opens the new-world dialog');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_narrow passed'); process.exit(fail ? 1 : 0);
})();
