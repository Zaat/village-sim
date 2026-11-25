#!/usr/bin/env node
/* Variety and experience audit (v0.36).
     node tools/coverage.js run SEED MAP YEARS [HARDSHIP 0-2] [OUTDIR]   one world: writes OUTDIR/cov_<map>_<seed>_h<level>.json (default tests/coverage)
     node tools/coverage.js report [DIR]                                 merge every json in DIR into one table (events seen, concern load, growth limits, never seen)
   It only watches (stats events, concerns, the limits ledger), so a run is the same game as a normal one. */
const fs = require('fs'), path = require('path');
const { loadSim } = require('../tests/lib');
const [, , cmd, a1, a2, a3, a4, a5] = process.argv;
const ROOT = path.resolve(__dirname, '..'), DIR0 = path.join(ROOT, 'tests', 'coverage');
if (cmd === 'run') {
  const seed = +a1 || 12, map = a2 || 'island', years = +a3 || 20, hard = a4 == null ? 1 : +a4, out = a5 || DIR0;
  const S = loadSim('World,CFG,STAT_EVENTS,STAT_SERIES,STAT_LABEL'); const w = new S.World(seed, { map }); w.settings.hardship = hard;
  const faults = []; const f0 = w.fault.bind(w); w.fault = (k, e, en) => { faults.push(k + ': ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' | ')); return f0(k, e, en) };
  const cdays = {}, yearly = []; const t0 = Date.now(); let over = null;
  for (let d = 1; d <= years * 32; d++) {
    for (let t = 0; t < 1200; t++) w.step();
    for (const c of (w.concerns && w.concerns.list) || []) cdays[c.key] = (cdays[c.key] || 0) + 1;
    if (d % 32 === 0) { const ev = w.stats.ev, y = d / 32 - 1, g = k => (ev[k] && ev[k].y[y]) || 0;
      yearly.push({ y: y + 1, pop: w.pop, vills: w.vills.length, beds: w.beds(), homes: w.houses().length, farms: w.of('farm').length, food: Math.round(w.stock.food), born: g('born'), died: g('died'), age: g('died_age'), hunger: g('died_hunger'), cold: g('died_cold'), arr: g('arrivals'), out: g('left') || 0,
        lim: { try: g('lim_try'), ok: g('lim_ok'), preg: g('lim_preg'), cool: g('lim_cool'), age: g('lim_age'), dep: g('lim_dep'), beds: g('lim_beds'), food: g('lim_food'), dice: g('lim_dice') }, fpairs: (w.stats.s.fpairs || []).slice(-1)[0] || 0, fsingle: (w.stats.s.fsingle || []).slice(-1)[0] || 0 }) }
    if (w.over && !over) { over = { day: d, why: w.over.why || w.over.kind || 'over' }; break }
  }
  const ev = {}; for (const e of S.STAT_EVENTS) { const r = w.stats.ev[e.key]; ev[e.key] = { label: e.label, group: e.group, n: r ? r.n : 0, first: w.stats.firsts[e.key] ? w.stats.firsts[e.key].day : null, y: r ? r.y : [] } }
  const days = Math.min(years * 32, w.day), concerns = {}; for (const k in cdays) concerns[k] = { days: cdays[k], share: +(cdays[k] / days).toFixed(3) };
  const res = { seed, map, years, hard, days, over, msPerTick: +((Date.now() - t0) / (days * 1200)).toFixed(3), faults: faults.length, faultSample: faults.slice(0, 3), yearly, concerns, events: ev, version: (fs.readFileSync(path.join(ROOT, 'src', 'debug.js'), 'utf8').match(/APP_VERSION = '([^']+)'/) || [, '?'])[1] };
  fs.mkdirSync(out, { recursive: true }); const f = path.join(out, `cov_${map}_${seed}_h${hard}.json`); fs.writeFileSync(f, JSON.stringify(res)); console.log('wrote', f, 'pop', w.pop, 'years', (days / 32).toFixed(1), over ? 'GAME OVER ' + over.why : '', 'faults', faults.length, res.msPerTick + ' ms/tick')
} else if (cmd === 'report') {
  const dir = a1 || DIR0, runs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  if (!runs.length) { console.log('no runs in ' + dir); process.exit(0) }
  const by = {}; for (const r of runs) (by[r.hard] = by[r.hard] || []).push(r); const HN = ['Gentle', 'Normal', 'Harsh'];
  const out = [`# Coverage report (${runs.length} runs: ${runs.map(r => `${r.map}/${r.seed}/${HN[r.hard]}/${r.years}y`).join(', ')})`, ''];
  out.push('## Population by year (mean over runs, per Hardship level)', '', '| Year | ' + Object.keys(by).map(h => HN[h]).join(' | ') + ' |', '|---|' + Object.keys(by).map(() => '---|').join(''));
  const maxY = Math.max(...runs.map(r => r.yearly.length)); for (let y = 1; y <= maxY; y += y < 10 ? 1 : 2) out.push(`| ${y} | ` + Object.keys(by).map(h => { const v = by[h].filter(r => r.yearly[y - 1]).map(r => r.yearly[y - 1].pop); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) + ' (' + v.length + ')' : '' }).join(' | ') + ' |');
  /* difficulty scorecard (v0.37): Gentle should reach more than 1000 people, Harsh should be survivable but failable (some runs end, the rest stay small) */
  const med = a => { const v = a.filter(x => x != null).sort((m, n) => m - n); return v.length ? v[(v.length - 1) >> 1] : null }, popAt = (r, y) => r.yearly[y - 1] ? r.yearly[y - 1].pop : null;
  out.push('## Difficulty scorecard', '', '| Hardship | runs | game over | median pop y10 | median pop y20 | best peak | target | met |', '|---|---|---|---|---|---|---|---|');
  for (const h of Object.keys(by).sort()) {
    const rs = by[h], over = rs.filter(r => r.over).length, p10 = med(rs.map(r => popAt(r, 10))), p20 = med(rs.map(r => popAt(r, 20))), peak = Math.max(...rs.map(r => Math.max(...r.yearly.map(y => y.pop))));
    const nrm = by[1] ? med(by[1].map(r => popAt(r, 10))) : null, weak = Math.min(...rs.map(r => Math.max(...r.yearly.map(y => y.pop))));
    const tg = h == 0 ? 'median pop at year 20 above 1000' : h == 2 ? 'hard but survivable: year-10 pop at most 60% of Normal, most runs live, weakest map still grows' : 'between Gentle and Harsh', met = h == 0 ? (p20 != null && p20 > 1000) : h == 2 ? (nrm != null && p10 != null && p10 <= nrm * 0.6 && over <= rs.length / 3 && weak > 100) : (p20 != null);
    out.push(`| ${HN[h]} | ${rs.length} | ${over} | ${p10 == null ? '-' : p10} | ${p20 == null ? '-' : p20} | ${peak} | ${tg} | ${met ? 'yes' : 'NO'} |`);
  }
  out.push('');
  out.push('## Game over and faults', '', ...runs.map(r => `- ${r.map}/${r.seed}/${HN[r.hard]}: ${r.over ? 'game over day ' + r.over.day + ' (' + r.over.why + ')' : 'survived ' + r.years + ' years'}; faults ${r.faults}; ${r.msPerTick} ms/tick`));
  out.push('', '## Concern load (share of days active; flagged above 40%)', '', '| Concern | ' + runs.map(r => `${r.map[0]}${r.seed}${'GNH'[r.hard]}`).join(' | ') + ' | max |', '|---|' + runs.map(() => '---|').join('') + '---|');
  const ck = new Set(); for (const r of runs) for (const k in r.concerns) ck.add(k); for (const k of [...ck].sort((a, b) => Math.max(...runs.map(r => (r.concerns[b] || { share: 0 }).share)) - Math.max(...runs.map(r => (r.concerns[a] || { share: 0 }).share)))) { const sh = runs.map(r => (r.concerns[k] || { share: 0 }).share), mx = Math.max(...sh); out.push(`| ${k}${mx > 0.4 ? ' ⚠' : ''} | ` + sh.map(x => Math.round(x * 100) + '%').join(' | ') + ` | ${Math.round(mx * 100)}% |`) }
  out.push('', '## Growth limits (share of birth attempts stopped by each gate, by year bracket, all runs)', '', '| Years | attempts | conceived | expecting | too soon | past fertile age | young children | no bed | low food | chance | fertile couples | fertile singles |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [a, b] of [[1, 5], [6, 10], [11, 15], [16, 20], [21, 30], [31, 60]]) { const t = { try: 0, ok: 0, preg: 0, cool: 0, age: 0, dep: 0, beds: 0, food: 0, dice: 0 }; let n = 0, fp = 0, fs = 0; for (const r of runs) for (const y of r.yearly) if (y.y >= a && y.y <= b) { for (const k in t) t[k] += y.lim[k] || 0; fp += y.fpairs; fs += y.fsingle; n++ } if (!n || !t.try) continue; const p = k => Math.round(100 * t[k] / t.try) + '%'; out.push(`| ${a}-${b} | ${t.try} | ${p('ok')} | ${p('preg')} | ${p('cool')} | ${p('age')} | ${p('dep')} | ${p('beds')} | ${p('food')} | ${p('dice')} | ${(fp / n).toFixed(1)} | ${(fs / n).toFixed(1)} |`) }
  out.push('', '## Deaths and arrivals by year bracket (per run per year)', '', '| Years | births | deaths | old age | hunger | cold | arrivals |', '|---|---|---|---|---|---|---|');
  for (const [a, b] of [[1, 5], [6, 10], [11, 15], [16, 20], [21, 30], [31, 60]]) { const s = { born: 0, died: 0, age: 0, hunger: 0, cold: 0, arr: 0 }; let n = 0; for (const r of runs) for (const y of r.yearly) if (y.y >= a && y.y <= b) { for (const k in s) s[k] += y[k] || 0; n++ } if (n) out.push(`| ${a}-${b} | ${(s.born / n).toFixed(1)} | ${(s.died / n).toFixed(1)} | ${(s.age / n).toFixed(1)} | ${(s.hunger / n).toFixed(1)} | ${(s.cold / n).toFixed(1)} | ${(s.arr / n).toFixed(1)} |`) }
  const keys = Object.keys(runs[0].events), seen = [], never = []; for (const k of keys) { const tot = runs.reduce((a, r) => a + (r.events[k] ? r.events[k].n : 0), 0), nr = runs.filter(r => r.events[k] && r.events[k].n > 0).length; (tot ? seen : never).push({ k, tot, nr, label: runs[0].events[k].label, group: runs[0].events[k].group, first: Math.min(...runs.filter(r => r.events[k] && r.events[k].first != null).map(r => r.events[k].first)) / 32 }) }
  out.push('', `## Events seen (${seen.length} of ${keys.length} kinds), by group; runs = in how many runs it happened, per-run-year = mean count`, '', '| Group | Event | Total | Runs | Per run-year | First (year) |', '|---|---|---|---|---|---|'); const ry = runs.reduce((a, r) => a + r.years, 0);
  for (const e of seen.sort((a, b) => a.group.localeCompare(b.group) || b.tot - a.tot)) out.push(`| ${e.group} | ${e.label} | ${e.tot} | ${e.nr}/${runs.length} | ${(e.tot / ry).toFixed(2)} | ${e.first.toFixed(1)} |`);
  out.push('', `## Never seen in any run (${never.length})`, '', never.map(e => e.label).join('; '));
  const txt = out.join('\n'); console.log(txt); fs.writeFileSync(path.join(dir, 'report.md'), txt + '\n')
} else console.log('usage: node tools/coverage.js run SEED MAP YEARS [HARDSHIP] | report [DIR]');
