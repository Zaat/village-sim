// v0.39 UI: full screen item, language detection from the browser, switching in Settings, the choice is remembered
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const url = 'file:///' + __dirname.replace(/\\/g, '/') + '/../index.html';
  // English browser: English page, a language switch in Settings, a Full screen item in the menu
  let ctx = await b.newContext({ locale: 'en-US', viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.documentElement.lang === 'en' && document.querySelector('[data-mn=settings]').textContent === 'Settings'), 'English browser gives English');
  ok(await p.evaluate(() => !!document.querySelector('[data-mn=fullscreen]') && /Full screen/.test(document.querySelector('[data-mn=fullscreen]').textContent)), 'the menu has a Full screen item');
  ok(await p.evaluate(() => [...document.getElementById('set_lang').options].map(o => o.value).join() === 'en,es'), 'the language switch lists English and Español');
  await p.evaluate(() => { const s = document.getElementById('set_lang'); s.value = 'es'; s.dispatchEvent(new Event('change')) }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelector('[data-mn=settings]').textContent === 'Ajustes' && document.getElementById('menuBtn').title.startsWith('Menú')), 'switching to Español translates labels and tooltips');
  ok(await p.evaluate(() => document.documentElement.lang === 'es' && localStorage.getItem('villagesim.lang') === 'es'), 'the choice is saved');
  // text the game writes later is translated too
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz'; d.textContent = 'Save now'; document.body.appendChild(d) }); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.getElementById('zz').textContent === 'Guardar ahora'), 'text added later is translated by the observer');
  await p.reload(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelector('[data-mn=settings]').textContent === 'Ajustes' && document.getElementById('set_lang').value === 'es'), 'the saved choice is used after a reload, even in an English browser');
  await p.evaluate(() => { const s = document.getElementById('set_lang'); s.value = 'en'; s.dispatchEvent(new Event('change')) }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelector('[data-mn=settings]').textContent === 'Settings' && document.getElementById('menuBtn').title.startsWith('Menu:')), 'switching back restores the English text');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join('; '));
  await ctx.close();
  // Spanish browser, nothing saved: starts in Spanish by itself
  ctx = await b.newContext({ locale: 'es-ES', viewport: { width: 1400, height: 900 } }); p = await ctx.newPage(); const e2 = []; p.on('pageerror', e => e2.push(e.message));
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.documentElement.lang === 'es' && document.querySelector('[data-mn=about]').textContent === 'Acerca de' && document.getElementById('set_lang').value === 'es'), 'a Spanish browser starts in Spanish');
  ok(await p.evaluate(() => !!document.getElementById('app') && typeof world === 'object' && world.vills.length > 0), 'the game runs in Spanish');
  ok(e2.length === 0, 'no page errors in Spanish: ' + e2.slice(0, 2).join('; '));
  // French browser: not supported, English
  await ctx.close(); ctx = await b.newContext({ locale: 'fr-FR', viewport: { width: 1400, height: 900 } }); p = await ctx.newPage(); await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.documentElement.lang === 'en'), 'an unsupported browser language gives English');
  await b.close(); console.log(fail ? 'ui_lang FAILED' : 'ui_lang ok'); process.exit(fail ? 1 : 0);
})();
