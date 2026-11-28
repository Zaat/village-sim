// v0.40 Events follow-ups: dates on Years lines, sparkline on decade rows, council leader announced once, Talk card never blank
const { chromium } = require('playwright'); const { OLD_PACE } = require('./lib');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForFunction(() => window.__sim);
  await p.evaluate(o => { Object.assign(CFG, o); newWorld(2468, { type: 'island', size: 'standard' }); __sim.setSpeed(0) }, OLD_PACE);
  const r = await p.evaluate(() => {
    for (let i = 0; i < 1200 * 32 * 14; i++) world.step(); showTab('events'); renderEvents();
    const y = document.getElementById('yearsCard'), lines = [...y.querySelectorAll('.evl')], dec = [...y.querySelectorAll('details.evyr')].filter(d => /Years \d+/.test(d.textContent.slice(0, 20)));
    const lead = world.log.filter(l => /now leads the council/.test(l.s || l.text || '')).length;
    const byYear = {}; for (const l of world.log) if (/now leads the council/.test(l.s || l.text || '')) { const k = Math.floor((l.d - 1) / 128); byYear[k] = (byYear[k] || 0) + 1 }
    world.voices = null; renderTalk(); const blankA = document.getElementById('talkCard').textContent.trim().length;
    world.voices = { sum: [{ day: 1 }] }; renderTalk(); const blankB = document.getElementById('talkCard').textContent.trim().length;
    const cur = y.querySelector('details[data-cur] summary b'), curYear = cur ? +cur.textContent.replace(/\D/g, '') : -1;
    return { curYear, worldYear: world.year, lines: lines.length, dated: lines.filter(l => l.querySelector('.evd')).length, dec: dec.length, decSpark: dec.filter(d => d.querySelector('.evsp svg')).length, maxLead: Math.max(0, ...Object.values(byYear)), lead, blankA, blankB };
  });
  // grouping: recent years one by one, older ones in whole decades (1-10, 11-20, ...), never a "Years 11-11"; the first year knows how many people the village began with
  const g = await p.evaluate(() => { const out = {}, tick0 = world.tick; for (const yr of [10, 11, 21, 22, 31]) { world.tick = ((yr - 1) * CFG.DPS * 4 + 3) * 1200; renderEvYears(); const el = document.getElementById('yearsCard'); out[yr] = { singles: el.querySelectorAll('details.evyr[data-k^=y]').length, decades: [...el.querySelectorAll('details.evyr[data-k^=d] summary b')].map(b => b.textContent), sp: el.querySelectorAll('details.evyr[data-k^=d] .evsp svg').length } } world.tick = tick0; renderEvYears();
    const first = evYears(world).slice(-1)[0]; out.firstStart = first.start; return out });
  ok(g[10].decades.length === 0 && g[10].singles === 10, 'to year 10 every year is listed: ' + JSON.stringify(g[10]));
  ok(g[21].decades.join() === 'Years 1–10' && g[21].singles === 11, 'year 21: one decade, 11 single years: ' + JSON.stringify(g[21]));
  ok(g[31].decades.join() === 'Years 11–20,Years 1–10' && g[31].singles === 11, 'year 31: two decades: ' + JSON.stringify(g[31]));
  ok(g[22].singles === 12 && g[22].decades.length === 1, 'year 22: 12 single years: ' + JSON.stringify(g[22]));
  ok(g.firstStart != null && g.firstStart > 0, 'the first year starts with the people the village began with: ' + g.firstStart);
  ok(r.curYear === r.worldYear, 'the Years view counts the same years as the game: ' + r.curYear + ' vs ' + r.worldYear);
  ok(r.lines > 0 && r.dated === r.lines, 'every line in Years has a day tag: ' + JSON.stringify(r));
  ok(g[31].sp === 2, 'decade rows carry a sparkline: ' + JSON.stringify(g[31]));
  ok(r.maxLead <= 2, 'the council leader is not announced over and over (most in one year: ' + r.maxLead + ')');
  ok(r.blankA > 10 && r.blankB > 10, 'the Talk card is never blank: ' + r.blankA + ', ' + r.blankB);
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fail ? 'FAILED ' + fail : 'ui_events_followups passed'); process.exit(fail ? 1 : 0);
})();
