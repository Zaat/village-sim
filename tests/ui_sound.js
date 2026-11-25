// v0.36 UI: sound. Off by default, a track is only a seed, turning it on makes sound without errors, skip and rate are kept locally, swells do not throw
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(600);
  const ev = (f, a) => p.evaluate(f, a); const vis = id => ev(id => { const e = document.getElementById(id); return !!e && e.offsetParent !== null }, id);
  ok(await ev(() => SND.on === false && SND.ctx === null), 'sound is off and makes no audio context until asked');
  ok(await ev(() => JSON.stringify(sndTrack(42)) === JSON.stringify(sndTrack(42)) && sndTrack(42).name !== sndTrack(43).name + 'x'), 'a track is only a seed: the same seed gives the same track');
  ok(await ev(() => { const names = new Set(); for (let i = 0; i < 60; i++) names.add(sndTrack(i * 977).mode + sndTrack(i * 977).root); return names.size > 6 }), 'seeds give a good variety of keys and modes');
  await p.click('#sndBtn'); ok(await vis('sndPanel'), 'the music button opens the small panel'); ok(await ev(() => document.getElementById('sndOnOff').textContent === 'Turn on'), 'it offers Turn on');
  await p.click('#sndOnOff'); await p.waitForTimeout(500);
  ok(await ev(() => SND.on && SND.ctx && SND.ctx.state !== 'closed' && !!SND.track), 'turning it on starts a track'); const t1 = await ev(() => SND.track.seed);
  await p.waitForTimeout(1500); ok(await ev(() => SND.step > 4), 'the bed is being scheduled (steps ' + 0 + ')');
  await p.click('#sndSkip'); await p.waitForTimeout(150); ok(await ev(t => SND.track.seed !== t, t1), 'Skip moves to another track'); ok(await ev(t => JSON.parse(localStorage.getItem('villagesim.tracks'))[t].skips === 1, t1), 'and counts the skip locally');
  await p.click('#sndUp'); ok(await ev(() => { const x = JSON.parse(localStorage.getItem('villagesim.tracks'))[SND.track.seed]; return x.r === 1 }), 'Like is kept in this browser'); await p.click('#sndUp'); ok(await ev(() => JSON.parse(localStorage.getItem('villagesim.tracks'))[SND.track.seed].r === 0), 'pressing it again takes it back');
  await p.click('#sndDown'); ok(await ev(() => JSON.parse(localStorage.getItem('villagesim.tracks'))[SND.track.seed].r === -1), 'Dislike is kept too');
  const names = await ev(() => { for (const k of ['founding', 'dawn', 'festival', 'relief', 'disaster', 'over']) { SND.swellUntil = 0; SND.lastSwell = -1e9; SND.q = []; sndSwell(k, 0); } SND.q.push({ kind: 'founding', at: 0 }); sndPump(); return SND.q.length });
  await p.waitForTimeout(800); ok(await ev(() => SND.on), 'every swell kind plays without trouble');
  for (const s of [0, 1, 2, 3]) { await ev(s => { SND.mood.season = s; SND.mood.night = s % 2 === 1; SND.step += 8 * 8; sndPump() }, s); }
  // pace: when time runs fast the mood is held and only trouble gets a swell
  ok(await ev(() => { setSpeed(100); SND.lastSwell = -1e9; SND.swellUntil = 0; SND.q = []; sndSwell('festival'); const a = SND.q.length; sndSwell('battle'); const b = SND.q.length; SND.q = []; SND.lastSwell = -1e9; SND.swellUntil = 0; return a === 0 && b === 1 }), 'at 100x a festival gets no swell but a battle does');
  ok(await ev(() => { SND.lastSwell = -1e9; SND.swellUntil = 0; SND.q = []; sndSwell('disaster'); const a = SND.q.length; sndSwell('dawn'); return a === 1 && SND.q.length === 1 }), 'swells are a minute apart when fast');
  ok(await ev(() => { SND.mood.season = 0; SND.mood.seasonAt = performance.now(); SND.mood.night = false; sndMood({ season: 2, isNight: () => true }); return SND.mood.season === 0 && SND.mood.night === false }), 'at 100x a new season or nightfall does not change the music');
  ok(await ev(() => { setSpeed(1); SND.mood.seasonAt = performance.now() - 60000; SND.mood.nightAt = performance.now() - 60000; sndMood({ season: 2, isNight: () => true }); const r = SND.mood.season === 2 && SND.mood.night === true; setSpeed(10); return r }), 'at 1x they do, after a short wait');
  ok(await ev(() => { SND.d.t = 0; world.war = world.war || {}; const a0 = world.war.alertUntil; world.war.alertUntil = world.tick + 99999; for (let i = 0; i < 40; i++) sndDrift(world); const t = SND.d.t; world.war.alertUntil = a0; return t > 0.1 && t <= 1 }), 'an alert in the village slowly raises the worry in the music');
  ok(await ev(() => { SND.d.t = 0.9; SND.step = 0; const tr = SND.track; sndStep(tr, 0, SND.ctx.currentTime + 0.1, SND.rr); const worried = SND.sc === SND_MODES.soft; SND.d.t = 0; sndStep(tr, 0, SND.ctx.currentTime + 0.1, SND.rr); return worried && SND.sc === tr.scale }), 'a worried village leans minor and a calm one returns to the key');
  await p.keyboard.press('m'); await p.waitForTimeout(300); ok(await ev(() => SND.on === false), 'M turns it off'); await p.keyboard.press('m'); await p.waitForTimeout(300); ok(await ev(() => SND.on === true), 'and on again');
  await ev(() => { world.over = { kind: 'collapse', day: 1, year: 1, ack: true }; sndWatch(world); world.over = null }); await p.waitForTimeout(300);
  ok(await ev(() => { const x = JSON.parse(localStorage.getItem('villagesim.tracks')); return Object.keys(x).length >= 2 }), 'tracks seen are remembered');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | ')); await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_sound passed'); process.exit(fail ? 1 : 0);
})();
