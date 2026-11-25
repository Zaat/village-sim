// v0.37 phone fixes: tall dialogs scroll and keep a reachable close button (#187), a lifted finger never stays "held" (#188), Diagnostics is filled and the world line is short (#189)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 390, height: 640 }, hasTouch: true, isMobile: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(700);
  for (const open of ['aboutOpen()', 'helpOpen()']) {
    await p.evaluate(open); await p.waitForTimeout(150);
    const r = await p.evaluate(() => { const bx = document.querySelector('#modal .nwbox'), x = document.getElementById('modal_x'); const a = bx.getBoundingClientRect(); bx.scrollTop = bx.scrollHeight; const c = x.getBoundingClientRect(); return { top: a.top, bottom: a.bottom, h: innerHeight, scrolls: bx.scrollHeight > bx.clientHeight, xTop: c.top, xBottom: c.bottom, st: bx.scrollTop } });
    ok(r.top >= -1 && r.bottom <= r.h + 1, open + ': the box sits inside the visible page ' + JSON.stringify(r));
    ok(r.xTop >= 0 && r.xBottom <= r.h, open + ': the close button is still in view after scrolling to the end ' + JSON.stringify(r));
    await p.evaluate(() => modalClose());
  }
  await p.screenshot({ path: 'tests/ui_mobile.png' });
  // a finger lifted somewhere else must not stay held
  const st = await p.evaluate(() => {
    const cv = document.getElementById('cv'), mk = (type, id, el, primary) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: primary, bubbles: true, cancelable: true, clientX: 100, clientY: 200 }));
    mk('pointerdown', 7, cv, true); const a = ptrs.size; mk('pointerup', 7, document.body, true); const b2 = ptrs.size;   // lifted over something else
    mk('pointerdown', 8, cv, true); const c = ptrs.size; mk('pointerup', 8, cv, true);
    mk('pointerdown', 9, cv, true); mk('pointerdown', 10, cv, false); const d = ptrs.size, pin = !!pinch; mk('pointerup', 9, cv, true); mk('pointerup', 10, cv, false);
    mk('pointerdown', 11, cv, true); window.dispatchEvent(new Event('blur')); const e = ptrs.size;
    return { a, b2, c, d, pin, e, end: ptrs.size };
  });
  ok(st.a === 1 && st.b2 === 0, 'a finger lifted outside the canvas is forgotten: ' + JSON.stringify(st)); ok(st.c === 1, 'the next single touch counts as one finger'); ok(st.d === 2 && st.pin, 'two real fingers still make a pinch'); ok(st.e === 0, 'losing focus forgets held fingers'); ok(st.end === 0, 'nothing is left held at the end');
  // diagnostics and the short world line
  const dg = await p.evaluate(() => { const d = document.getElementById('diagText'); d.parentElement.open = true; renderWorldLine(); return { one: document.querySelectorAll('#diagText').length, text: d.textContent, line: document.getElementById('worldLine').textContent } });
  ok(dg.one === 1, 'only one element has the diagnostics id'); ok(/people \d+/.test(dg.text) && /touch pointers held 0/.test(dg.text) && /trees \d+/.test(dg.text), 'Diagnostics is filled: ' + dg.text.slice(0, 120).replace(/\n/g, ' '));
  ok(dg.line.length < 90 && /seed \d+/.test(dg.line) && !/open knowledge/.test(dg.line), 'the world line is short: ' + dg.line);
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_mobile passed'); process.exit(fail ? 1 : 0);
})();
