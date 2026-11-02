// Seed sweep: node tests/sweep.js [seeds=8] [days=192] [conc=4] [forced]  -> table + variety/degeneracy report
const { spawn } = require('child_process'), path = require('path');
const n = +(process.argv[2] || 8), days = +(process.argv[3] || 192), conc = +(process.argv[4] || 4), forced = process.argv[5] === 'forced';
const seeds = Array.from({ length: n }, (_, i) => 101 + i * 37), out = [];
let next = 0, running = 0, done = 0;
function launch() {
  while (running < conc && next < seeds.length) {
    const s = seeds[next++]; running++;
    const p = spawn(process.execPath, [path.join(__dirname, 'sweep_one.js'), s, days, forced ? 'forced' : ''], { stdio: ['ignore', 'pipe', 'pipe'] }); let buf = '', err = '';
    p.stdout.on('data', d => buf += d); p.stderr.on('data', d => err += d);
    p.on('close', () => { running--; done++; try { out.push(JSON.parse(buf.trim().split('\n').pop())) } catch (e) { out.push({ seed: s, crashed: true, err: err.slice(0, 300) }) } if (done === seeds.length) report(); else launch() });
  }
}
function std(a) { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length) }
function report() {
  out.sort((a, b) => a.seed - b.seed); const ok = out.filter(r => !r.crashed);
  console.log(`Seed sweep: ${n} worlds x ${days} days (${forced ? 'forced tech' : 'natural pace'})\n`);
  console.log('seed  pop peak min  homes tech proj grp elec mood appr gini found/pact raids  ruling                 err  ms/tick');
  for (const r of out) { if (r.crashed) { console.log(r.seed, 'CRASHED', r.err); continue }
    console.log(String(r.seed).padEnd(5), String(r.pop).padStart(3), String(r.peak).padStart(4), String(r.minPop).padStart(4), String(r.houses).padStart(5), String(r.techs).padStart(4), String(r.projects).padStart(4), String(r.groups).padStart(3), String(r.elections).padStart(4), String(r.mood).padStart(4), String(r.approval).padStart(4), String(r.gini).padStart(5), `${r.found}/${r.pacts}`.padStart(8), String(r.raids).padStart(5), ' ' + String(r.ruling || '-').slice(0, 22).padEnd(22), String(r.errors).padStart(3), String(r.msTick).padStart(7)) }
  console.log('\nRegimes:'); for (const r of ok) console.log('  ' + String(r.seed).padEnd(5) + String(r.regime).padEnd(24) + Object.entries(r.ax).map(([k, v]) => k + ' ' + v.toFixed(2)).join(' ') + `  div ${r.div}  shifts ${r.shifts} coups ${r.coups} revolts ${r.revolts} dynasty ${r.dynasty} purges ${r.purges} prophet ${r.prophet ? 'y' : 'n'}`);
  const labels = new Set(ok.map(r => r.regime)); console.log(`  distinct regimes: ${labels.size} of ${ok.length}  (${[...labels].join(', ')})`);
  for (const k of ['auth', 'comm', 'pious', 'indus', 'open', 'cohes']) console.log(`  axis ${k.padEnd(6)} sd ${std(ok.map(r => r.ax[k])).toFixed(2)}  min ${Math.min(...ok.map(r => r.ax[k]))}  max ${Math.max(...ok.map(r => r.ax[k]))}`);
  const col = k => ok.map(r => r[k]), m = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  console.log('\nVariety (spread across seeds):');
  for (const k of ['pop', 'techs', 'projects', 'groups', 'mood', 'gini', 'treasury']) { const a = col(k); console.log(`  ${k.padEnd(9)} mean ${m(a).toFixed(1).padStart(7)}  sd ${std(a).toFixed(1).padStart(6)}  min ${Math.min(...a)}  max ${Math.max(...a)}`) }
  const pol = ['growth', 'labor', 'law', 'defense', 'tax'].map(k => `${k} ${(std(ok.map(r => r.policy[k]))).toFixed(2)}`).join('  '); console.log('  policy sd:', pol);
  const dead = ok.filter(r => r.pop < 8 || r.minPop !== null && r.minPop < 6).length, crashed = out.filter(r => r.crashed).length, errs = ok.filter(r => r.errors > 0).length, stalled = ok.filter(r => r.techs <= 2).length;
  const warn = []; if (crashed) warn.push(`${crashed} crashed`); if (errs) warn.push(`${errs} worlds logged errors`); if (dead) warn.push(`${dead} near-extinct`); if (stalled) warn.push(`${stalled} tech-stalled (<=2 techs)`);
  if (std(col('pop')) < 8) warn.push('population barely varies across seeds'); if (std(col('techs')) < 0.8) warn.push('tech progress barely varies'); if (labels.size < Math.min(3, ok.length)) warn.push('regimes barely differ across seeds');
  const lessonsSeen = new Set(ok.flatMap(r => Object.keys(r.lessons))); console.log('  lessons seen (>0.2):', [...lessonsSeen].join(', ') || '-');
  console.log('\n' + (warn.length ? 'WARNINGS: ' + warn.join('; ') : 'No degenerate worlds detected.'));
  require('fs').writeFileSync('/tmp/sweep.json', JSON.stringify(out, null, 1));
}
launch();
