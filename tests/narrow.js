const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w,h] of [[1500,900],[1250,800],[1100,800],[980,760],[800,700],[600,700]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const a = document.getElementById('hud').getBoundingClientRect(), c = document.getElementById('ctl').getBoundingClientRect();
      return { hud: [a.left, a.top, a.right, a.bottom].map(Math.round), ctl: [c.left, c.top, c.right, c.bottom].map(Math.round), overlap: !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top) } });
    await p.click('#gear'); const d = await p.evaluate(() => { const c = document.getElementById('ctl').getBoundingClientRect(), d = document.getElementById('drawer').getBoundingClientRect(); return { drawerTop: Math.round(d.top), ctlBottom: Math.round(c.bottom), clear: d.top >= c.bottom - 1 || d.left >= c.right || d.right <= c.left } });
    console.log(w + 'x' + h, JSON.stringify(r), 'drawer', JSON.stringify(d), errs.length ? errs : '');
    if (w === 980 || w === 600) await p.screenshot({ path: `tests/narrow_${w}.png` });
    await p.close();
  }
  await b.close();
})();
