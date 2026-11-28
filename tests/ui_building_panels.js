// v0.40: every building kind opens its panel without errors (workshop panel threw "w.has is not a function")
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForFunction(() => window.__sim);
  await p.evaluate(o => { Object.assign(CFG, o); newWorld(777, { type: 'island', size: 'standard' }); __sim.setSpeed(0) }, OLD_PACE);
  await p.evaluate(() => { for (let i = 0; i < 1200 * 32 * 6; i++) world.step() });
  const r = await p.evaluate(() => {
    const out = { kinds: {}, bad: [] };
    for (const bd of world.buildings.values()) {
      out.kinds[bd.type] = 1;
      try { selected = bd; updateInspector(); } catch (e) { out.bad.push(bd.type + ': ' + e.message) }
    }
    // every material entry that takes the world must get it
    for (const k of Object.keys(BLD_MATERIAL)) { try { const v = (BLD_MATERIAL[k])(BLD_MAT_WORLD.has(k) ? world : 1); if (typeof v !== 'string') out.bad.push(k + ' not a string') } catch (e) { out.bad.push(k + ': ' + e.message) } }
    return out;
  });
  ok(r.bad.length === 0, 'panels and materials render: ' + r.bad.slice(0, 3).join(' | '));
  ok(Object.keys(r.kinds).length >= 5, 'several building kinds exercised: ' + Object.keys(r.kinds).join(','));
  // the power station (v0.40): placed beside the camp, its panel and its art draw, in both the fuelled and the renewable look
  const pw = await p.evaluate(() => {
    const bad = []; let b = null; for (let y = 5; y < 100 && !b; y += 5) for (let x = 5; x < 150 && !b; x += 5) { if (world.terr[y * CFG.W + x] === TERR.GRASS && !world.bmap[y * CFG.W + x] && !world.bmap[y * CFG.W + x + 2] && !world.bmap[(y + 1) * CFG.W + x]) { try { b = world.addBuilding('power', x, y) } catch (e) { bad.push(e.message) } } }
    if (!b) return { bad: ['no site'] };
    for (const ren of [false, true]) { if (ren) world.tech.known.renewables = 1; try { selected = b; updateInspector(); R.cam.x = b.x * CFG.T; R.cam.y = b.y * CFG.T; render(world, b, performance.now()) } catch (e) { bad.push((ren ? 'renewable: ' : '') + e.message) } }
    return { bad, html: document.getElementById('insp') ? document.getElementById('insp').innerText.slice(0, 200) : '' };
  });
  ok(pw.bad.length === 0, 'power station panel and art draw: ' + pw.bad.join(' | '));
  // the mouse never gets stuck: even if drawing the inspector throws, a click ends the drag (it used to keep panning with no button down)
  const stuck = await p.evaluate(async () => {
    const keep = window.buildingPanel; let thrown = 0; const orig = updateInspector; updateInspector = () => { thrown++; throw new Error('test: panel failed') };
    const r = cv.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, fire = (t, ex) => cv.dispatchEvent(new PointerEvent(t, { clientX: x + (ex || 0), clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1, bubbles: true }));
    window.addEventListener('error', e => e.preventDefault(), { once: true }); fire('pointerdown'); try { fire('pointerup') } catch (e) { }
    const cam0 = { x: R.cam.x, y: R.cam.y }; cv.dispatchEvent(new PointerEvent('pointermove', { clientX: x + 80, clientY: y + 40, pointerId: 1, pointerType: 'mouse', buttons: 0, bubbles: true }));
    updateInspector = orig; return { thrown, moved: Math.abs(R.cam.x - cam0.x) + Math.abs(R.cam.y - cam0.y), dragClass: cv.classList.contains('drag') };
  });
  ok(stuck.moved === 0 && !stuck.dragClass, 'a click whose inspector failed does not leave the map panning: ' + JSON.stringify(stuck));
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_building_panels passed'); process.exit(fail ? 1 : 0);
})();
