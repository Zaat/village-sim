const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(1500);
  await p.click('[data-sp]:last-of-type').catch(() => {});
  const sp = await p.$$('[data-sp]'); await sp[sp.length - 1].click();
  await p.click('#gear'); await p.waitForTimeout(300);
  const ids = ['set_survival', 'set_disasters', 'set_crime', 'saveNow', 'mindToggle', 'diagCard'];
  const box = async id => { const e = await p.$('#' + id); const t = id.startsWith('set_') || id === 'mindToggle' ? await e.evaluateHandle(n => n.closest('label')) : e; return t.asElement().boundingBox() };
  const pos = async () => { const o = {}; for (const id of ids) { const r = await box(id); o[id] = r && [Math.round(r.x), Math.round(r.y)] } return o };
  const a = await pos(); let moved = 0;
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(500); const c = await pos(); if (JSON.stringify(c) !== JSON.stringify(a)) { moved++; if (moved < 3) console.log('diff', JSON.stringify(c)) } }
  console.log('positions', JSON.stringify(a), 'samples moved:', moved);
  await p.click('#set_crime + .sw'); console.log('crime toggle after click:', await p.$eval('#set_crime', e => e.checked));
  await p.keyboard.press('Escape'); console.log('drawer open after Esc:', await p.$eval('#drawer', e => e.classList.contains('open')));
  // side panel card heights stable?
  const hs = async () => p.$$eval('#side .card', els => els.map(e => Math.round(e.getBoundingClientRect().height)).join(','));
  const h0 = await hs(); let hv = 0; for (let i = 0; i < 10; i++) { await p.waitForTimeout(500); if (await hs() !== h0) hv++ }
  console.log('side card heights', h0, 'changed samples:', hv);
  await p.screenshot({ path: 'bounce.png' });
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
