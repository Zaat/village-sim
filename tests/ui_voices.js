// v0.29 page test: bubbles, pinning, inspector block, talk feed and summaries, speed modes
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1500, height: 900 } }); let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(800);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => nwOpen()); await p.waitForTimeout(200); await p.fill('#nw_seed', '12'); await p.click('#nw_go'); await p.waitForTimeout(1200);
  // run a few days headless, then watch at 1x
  await p.evaluate(() => { __sim.setSpeed(0); __sim.run(1200 * 6); });
  ok(await p.evaluate(() => world.vills.some(v => v.th) && world.voices && world.voices.sum.length > 0), 'thoughts exist and a daily summary was written');
  ok(await p.evaluate(() => world.vills.filter(v => v.th).every(v => v.th.long && v.th.short && v.th.emo)), 'every thought has long, short and glyph forms');
  await p.evaluate(() => { __sim.setSpeed(1); }); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => R.vo && R.vo.rects.length > 0 && R.vo.rects.length <= 6), 'at 1x between 1 and 6 bubbles are showing: ' + await p.evaluate(() => R.vo ? R.vo.rects.length : -1));
  await p.screenshot({ path: __dirname + '/ui_bubbles.png' });
  // clicking a bubble selects and pins
  const hit = await p.evaluate(() => { const r = R.vo.rects[0], c = document.getElementById('cv').getBoundingClientRect(); return { x: c.left + r.x + r.w / 2, y: c.top + r.y + r.h / 2, id: r.id } });
  await p.mouse.click(hit.x, hit.y); await p.waitForTimeout(500);
  ok(await p.evaluate(id => selected && selected.id === id && R.vo.pin && R.vo.pin.id === id, hit.id), 'clicking a bubble selects the villager and pins the line');
  ok(await p.evaluate(() => /Unpin/.test(document.getElementById('sel').textContent) && /Mind/.test(document.getElementById('sel').textContent)), 'inspector shows the pinned thought with an Unpin button');
  await p.screenshot({ path: __dirname + '/ui_thought_pin.png' });
  await p.click('#sel [data-unpin]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !R.vo.pin), 'Unpin clears the pin');
  // pinning from the inspector
  await p.evaluate(() => { const v = world.vills.find(x => x.th && x.th.kind === 'thought'); __sim.select(v); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#sel [data-pin]')), 'current thought is clickable at 1x');
  await p.click('#sel [data-pin]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => R.vo.pin && R.vo.pin.id === selected.id), 'clicking the thought pins it');
  // selecting another villager drops the pin (via the map pick)
  await p.evaluate(() => { __sim.select(null); R.vo.pin = null; });
  // speed modes
  const modes = await p.evaluate(() => { const o = {}; for (const s of [0.25, 1, 3, 10, 30, 100]) { R.speed = s; o[s] = bubbleMode() } return o });
  ok(modes[1] === 'long' && modes[0.25] === 'long' && modes[3] === 'short' && modes[10] === 'emo' && modes[100] === 'off', 'bubble modes by speed: ' + JSON.stringify(modes));
  await p.evaluate(() => { __sim.setSpeed(10); }); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => R.vo.rects.length <= 3), 'above 3x at most 3 bubbles: ' + await p.evaluate(() => R.vo.rects.length));
  await p.evaluate(() => { __sim.setSpeed(100); }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => R.vo.rects.length === 0), 'no bubbles at 100x');
  // events tab: feed at slow speed, summaries at all
  await p.evaluate(() => { __sim.setSpeed(1); }); await p.waitForTimeout(3000);
  await p.click('#tabbar button[data-tab="events"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => /Talk of the village/.test(document.getElementById('talkCard').textContent) && /The talk of the village:/.test(document.getElementById('talkCard').textContent)), 'events tab shows the talk card with daily summaries');
  ok(await p.evaluate(() => TALK.live.length > 0 && !!document.querySelector('#talkCard .tl')), 'the live feed prints lines at 1x');
  await p.screenshot({ path: __dirname + '/ui_talk.png' });
  await p.evaluate(() => { __sim.setSpeed(10); }); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => /Too fast/.test(document.getElementById('talkCard').textContent) && !document.querySelector('#talkCard .tl')), 'fast speed hides the live feed and keeps summaries');
  // switch off
  await p.evaluate(() => { __sim.setSpeed(1) }); await p.evaluate(() => document.getElementById('bubbleToggle').click()); await p.waitForTimeout(800);
  ok(await p.evaluate(() => R.bubbles === false && R.vo.rects.length === 0), 'the bubbles switch turns them off');
  ok(await p.evaluate(() => !!document.getElementById('vaiToggle') && !document.getElementById('vaiToggle').checked), 'Claude lines are off by default');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('ui_voices: passed', pass, 'failed', fail); await b.close(); process.exit(fail ? 1 : 0);
})();
