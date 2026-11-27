#!/usr/bin/env node
/* Pace lab (v0.38.2): population over time under the current birth model and a candidate, for a list of worlds, with a report page.
     node tools/pace_lab.js run OUTDIR NAME SEED MAP SIZE HARD SWITCHES YEARS VARIANT   one run -> OUTDIR/NAME__VARIANT.json
     node tools/pace_lab.js batch OUTDIR [YEARS]                                         every world in LABS, both variants, two at a time (skips finished runs)
     node tools/pace_lab.js report OUTDIR OUT.html                                       charts and a table from the finished runs
   VARIANT base = the game as shipped. fix = candidate, applied to the loaded source only (the game files are not touched):
   the crowd's birth rate is seeded from the births so far when the crowd begins (it was seeded from zero, so its first day counted every
   birth in the town's history as one day's births) and is smoothed over about thirty days instead of ten. SWITCHES = off | all (survival, disasters, crime, raids). */
const fs = require('fs'), path = require('path'), { spawn } = require('child_process'), vm = require('vm');
const { code } = require('../tests/lib');
const LABS = [
  ['island12-normal', 12, 'island', 'standard', 1, 'off'], ['island12-normal-all', 12, 'island', 'standard', 1, 'all'],
  ['continent5-gentle', 5, 'continent', 'standard', 0, 'off'], ['lake351-normal-all', 351323045, 'lakeland', 'standard', 1, 'all'],
  ['archi5-harsh', 5, 'archipelago', 'standard', 2, 'off'], ['peninsula664-gentle-large', 664418213, 'peninsula', 'large', 0, 'off'],
];
const [, , cmd, ...a] = process.argv;
const PATCH = [["db = ab - (C.seenB || 0); C.seenB = ab; C.rate = (C.rate || 0.011) * 0.9 + (db / Math.max(4, fert)) * 0.1;",
  "db = ab - (C.seenB === undefined ? ab : C.seenB); C.seenB = ab; C.rate = (C.rate || 0.011) * 0.97 + (db / Math.max(8, fert)) * 0.03;"]];
function run(out, name, seed, map, size, hard, sw, years, variant) {
  let src = code('Object.assign(globalThis,{World,CFG,AGES,techEra});');
  if (variant === 'fix') for (const [x, y] of PATCH) { if (!src.includes(x)) throw new Error('patch target not found'); src = src.replace(x, y) }
  const ctx = { console, Buffer, performance }; vm.createContext(ctx); vm.runInContext(src, ctx);
  const dims = size === 'large' ? [340, 236] : undefined, w = new ctx.World(+seed, { map, hardship: +hard }, dims); w.settings.hardship = +hard;
  if (sw === 'all') Object.assign(w.settings, { survival: true, disasters: true, crime: true, raids: true });
  const rows = [], t0 = Date.now(); let b0 = 0, over = null;
  for (let d = 1; d <= years * 32; d++) {
    for (let t = 0; t < 1200; t++) w.step();
    if (d % 32 === 0) { const C = w.crowd; rows.push({ y: d / 32, pop: w.pop, vills: w.vills.length, crowd: C ? C.n : 0, births: w.births - b0, techs: Object.keys(w.tech.known).length, age: ctx.techEra(w) }); b0 = w.births }
    if (w.over) { over = d / 32; break }
  }
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, `${name}__${variant}.json`), JSON.stringify({ name, seed, map, size, hard, sw, variant, years, over, secs: Math.round((Date.now() - t0) / 1000), rows }));
  console.log('done', name, variant, ((Date.now() - t0) / 1000 | 0) + 's');
}
if (cmd === 'run') { const [out, name, seed, map, size, hard, sw, years, variant] = a; run(out, name, seed, map, size, hard, sw, +years, variant) }
else if (cmd === 'batch') {
  const out = a[0], years = +a[1] || 30, jobs = []; for (const L of LABS) for (const v of ['base', 'fix']) if (!fs.existsSync(path.join(out, `${L[0]}__${v}.json`))) jobs.push([L, v]);
  // longest first so the two workers finish together
  jobs.sort((x, y) => (y[0][3] === 'large') - (x[0][3] === 'large')); let running = 0, next = 0;
  const go = () => { while (running < 2 && next < jobs.length) { const [L, v] = jobs[next++]; running++; const p = spawn(process.execPath, [__filename, 'run', out, L[0], L[1], L[2], L[3], L[4], L[5], L[3] === 'large' ? Math.min(years, 30) : years, v], { stdio: 'inherit' }); p.on('exit', () => { running--; go() }) } };
  go();
} else if (cmd === 'report') {
  const dir = a[0], outf = a[1] || 'pace-lab.html', runs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const names = [...new Set(runs.map(r => r.name))], AG = ['Stone', 'Bronze', 'Iron', 'Classical', 'Medieval', 'Renaissance', 'Gunpowder', 'Industrial', 'Modern'];
  const get = (n, v) => runs.find(r => r.name === n && r.variant === v);
  const yrs = (r, k) => { const x = r.rows.find(q => q.pop >= k); return x ? x.y : '–' };
  const jump = r => { let m = 1, at = 0; for (let i = 1; i < r.rows.length; i++) { const p = r.rows[i - 1].pop, q = r.rows[i].pop; if (p >= 40 && q / p > m) { m = q / p; at = r.rows[i].y } } return [m.toFixed(2), at] };
  const rough = r => { const g = []; for (let i = 1; i < r.rows.length; i++) { const p = r.rows[i - 1].pop; if (p >= 40) g.push(Math.log(r.rows[i].pop / p)) } if (g.length < 3) return '–'; const m = g.reduce((s, x) => s + x, 0) / g.length; return Math.sqrt(g.reduce((s, x) => s + (x - m) ** 2, 0) / g.length).toFixed(3) };
  const W = 420, H = 190, L = 40, B = 22, T = 8, R = 8, COL = { base: '#e0a458', fix: '#6ac3a0' };
  const chart = (n, kind) => { const rs = ['base', 'fix'].map(v => get(n, v)).filter(Boolean); if (!rs.length) return '';
    const ys = r => kind === 'pop' ? r.rows.map(q => q.pop) : r.rows.map((q, i) => i && r.rows[i - 1].pop >= 20 ? Math.log(q.pop / r.rows[i - 1].pop) * 100 : 0);
    const mx = Math.max(1, ...rs.flatMap(ys)), mn = kind === 'pop' ? 0 : Math.min(0, ...rs.flatMap(ys)), xm = Math.max(...rs.map(r => r.rows.length)), X = i => L + i / Math.max(1, xm - 1) * (W - L - R), Y = v => T + (1 - (v - mn) / (mx - mn || 1)) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%"><rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none" stroke="#2a323a"/>`;
    for (let k = 0; k <= 4; k++) { const v = mn + (mx - mn) * k / 4; s += `<text x="${L - 4}" y="${Y(v) + 3}" fill="#8a949e" font-size="9" text-anchor="end">${Math.round(v)}${kind === 'pop' ? '' : '%'}</text>` }
    for (let yv = 0; yv < xm; yv += 5) s += `<text x="${X(yv)}" y="${H - 8}" fill="#8a949e" font-size="9" text-anchor="middle">${yv + 1}</text>`;
    if (kind === 'pop') for (const r of rs.slice(0, 1)) { r.rows.forEach((q, i) => { if (i && q.age !== r.rows[i - 1].age) s += `<line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${H - B}" stroke="#3a4450" stroke-dasharray="2 3"/><text x="${X(i) + 2}" y="${T + 9}" fill="#667" font-size="8">${AG[q.age] || q.age}</text>` }) }
    for (const r of rs) s += `<polyline fill="none" stroke="${COL[r.variant]}" stroke-width="1.6" points="${ys(r).map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`;
    return s + '</svg>' };
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Village Sim pace lab</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:14px system-ui,sans-serif;background:#12171c;color:#dfe6ec;margin:0;padding:16px;max-width:980px;margin:auto}h1{font-size:20px}h2{font-size:15px;margin:22px 0 6px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.c{background:#1a2128;border:1px solid #2a323a;border-radius:8px;padding:8px}.h{color:#8a949e;font-size:12px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border-bottom:1px solid #2a323a;padding:4px 6px;text-align:right}th:first-child,td:first-child{text-align:left}i{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 4px 0 10px}</style></head><body><h1>Pace lab: current birth model against a candidate</h1><div class="h">Same worlds, same seeds. <i style="background:${COL.base}"></i>current (v0.38.1) <i style="background:${COL.fix}"></i>candidate (crowd birth rate seeded from the births so far and smoothed over about 30 days). Dashed lines mark when the village enters a new age. X axis is the year.</div>`;
  html += '<h2>Table: years to reach a size, the biggest one-year jump (from 40 people up), and roughness (spread of the yearly growth rate; lower is smoother)</h2><div class="c"><table><tr><th>World</th><th>Model</th><th>100</th><th>300</th><th>1000</th><th>Last pop</th><th>Biggest jump</th><th>Roughness</th><th>Years run</th></tr>';
  for (const n of names) for (const v of ['base', 'fix']) { const r = get(n, v); if (!r) continue; const [j, at] = jump(r); html += `<tr><td>${n}</td><td style="color:${COL[v]}">${v === 'base' ? 'current' : 'candidate'}</td><td>${yrs(r, 100)}</td><td>${yrs(r, 300)}</td><td>${yrs(r, 1000)}</td><td>${r.rows[r.rows.length - 1].pop}</td><td>×${j} (y${at})</td><td>${rough(r)}</td><td>${r.rows.length}${r.over ? ' ended y' + r.over : ''}</td></tr>` }
  html += '</table></div>';
  for (const n of names) html += `<h2>${n}</h2><div class="g"><div class="c"><div class="h">Population</div>${chart(n, 'pop')}</div><div class="c"><div class="h">Yearly growth rate, percent (log change)</div>${chart(n, 'rate')}</div></div>`;
  fs.writeFileSync(outf, html + '</body></html>'); console.log('wrote', outf, runs.length, 'runs');
} else console.log('usage: see the header of this file');
