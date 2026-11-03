// Insight report across many worlds:  node tools/insight.js [DAYS=320] [CONC=2] [SEEDS_PER_MAP=2]
// Runs tools/insight_one.js for every map type and several seeds, then reports means by map and regime and the
// strongest correlations between features, plus a few specific questions (does early inequality predict later unrest?).
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const DAYS = +process.argv[2] || 320, CONC = +process.argv[3] || 2, PER = +process.argv[4] || 2, MAPS = ['island', 'archipelago', 'continent', 'peninsula', 'lakeland', 'river'];
const jobs = []; for (const m of MAPS) for (let i = 0; i < PER; i++) jobs.push([101 + i * 37 + MAPS.indexOf(m) * 7, m]);
const results = []; let next = 0, running = 0;
if (process.argv[2] === '--from') { const R0 = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); results.push(...R0); setImmediate(() => finish()); jobs.length = 0 }
function launch() {
  while (running < CONC && next < jobs.length) {
    const [seed, map] = jobs[next++]; running++; let out = '';
    const c = spawn('node', [path.join(__dirname, 'insight_one.js'), String(seed), map, String(DAYS)]); c.stdout.on('data', d => out += d);
    c.on('close', () => { running--; try { results.push(JSON.parse(out.trim().split('\n').pop())); console.error(`done ${results.length}/${jobs.length}: ${map} ${seed}`) } catch (e) { console.error('failed', map, seed) } if (results.length + 0 === jobs.length || (next >= jobs.length && running === 0)) finish(); else launch() });
  }
}
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
function corr(xs, ys) { const n = xs.length; if (n < 5) return null; const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2 } return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null }
function finish() {
  const R = results, num = Object.keys(R[0]).filter(k => typeof R[0][k] === 'number' && !['seed', 'errors', 'years'].includes(k)), lines = [];
  lines.push(`# Insight report: ${R.length} worlds x ${DAYS} days (${(DAYS / 32).toFixed(1)} years)\n`);
  lines.push('## By map type\n\n| map | pop | peak | mood | inequality | unity | unrest | trips | outposts |\n|---|---|---|---|---|---|---|---|---|');
  for (const m of MAPS) { const r = R.filter(x => x.map === m); if (r.length) lines.push(`| ${m} | ${mean(r.map(x => x.pop)).toFixed(0)} | ${mean(r.map(x => x.peakPop)).toFixed(0)} | ${mean(r.map(x => x.meanMood)).toFixed(0)} | ${mean(r.map(x => x.meanGini)).toFixed(2)} | ${mean(r.map(x => x.meanUnity)).toFixed(2)} | ${mean(r.map(x => x.unrest)).toFixed(1)} | ${mean(r.map(x => x.trips)).toFixed(1)} | ${mean(r.map(x => x.outposts)).toFixed(1)} |`) }
  const regs = [...new Set(R.map(x => x.regime))]; lines.push('\n## By final regime\n\n| regime | worlds | pop | mood | inequality | unrest | feuds | discoveries |\n|---|---|---|---|---|---|---|---|');
  for (const g of regs) { const r = R.filter(x => x.regime === g); lines.push(`| ${g} | ${r.length} | ${mean(r.map(x => x.pop)).toFixed(0)} | ${mean(r.map(x => x.meanMood)).toFixed(0)} | ${mean(r.map(x => x.meanGini)).toFixed(2)} | ${mean(r.map(x => x.unrest)).toFixed(1)} | ${mean(r.map(x => x.feuds)).toFixed(1)} | ${mean(r.map(x => x.discoveries)).toFixed(1)} |`) }
  const GROUP = {}; for (const [g, ks] of Object.entries({ size: ['pop', 'peakPop', 'meanPop', 'growthPerYear', 'born', 'died', 'lateGrowth'], mood: ['meanMood', 'lateMood', 'earlyMood'], trade: ['trips', 'deals', 'tradeLate'], unrest: ['unrest', 'lateUnrest', 'earlyUnrest', 'coups', 'strikes', 'secessions'], knowledge: ['techs', 'discoveries', 'projects'], inequality: ['meanGini', 'maxGini', 'earlyGini', 'earlyWealth'], hunger: ['starved', 'famines'] })) for (const k of ks) GROUP[k] = g;
  const pairs = []; for (let i = 0; i < num.length; i++) for (let j = i + 1; j < num.length; j++) { if (GROUP[num[i]] && GROUP[num[i]] === GROUP[num[j]]) continue; const r = corr(R.map(x => x[num[i]]), R.map(x => x[num[j]])); if (r !== null && Math.abs(r) >= 0.5) pairs.push([num[i], num[j], r]) }
  pairs.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2])); lines.push(`\n## Strongest correlations (|r| >= 0.5, n = ${R.length}; small samples, treat as hints)\n`); for (const [a, b, r] of pairs.slice(0, 25)) lines.push(`- ${a} vs ${b}: r = ${r.toFixed(2)}`);
  const q = [['Does early inequality predict later unrest?', 'earlyGini', 'lateUnrest'], ['Does early unrest predict later unrest?', 'earlyUnrest', 'lateUnrest'], ['Do rich worlds (early wealth) grow faster later?', 'earlyWealth', 'lateGrowth'], ['Does inequality lower mood?', 'meanGini', 'meanMood'], ['Does trade go with growth?', 'tradeLate', 'lateGrowth'], ['Does openness go with discovery?', 'meanOpen', 'discoveries'], ['Does authority go with unrest?', 'meanAuth', 'unrest'], ['Does unity go with population?', 'meanUnity', 'meanPop'], ['Does crime go with inequality?', 'meanGini', 'crimes']];
  lines.push('\n## Specific questions\n'); for (const [t, a, b] of q) { const r = corr(R.map(x => x[a]), R.map(x => x[b])); lines.push(`- ${t} (${a} vs ${b}): ${r === null ? 'not enough variation' : 'r = ' + r.toFixed(2)}`) }
  lines.push('\n## Worlds\n\n```json\n' + R.map(x => JSON.stringify(x)).join('\n') + '\n```'); const out = lines.join('\n');
  fs.writeFileSync(path.join(process.cwd(), 'insight-report.md'), out); fs.writeFileSync(path.join(process.cwd(), 'insight-results.json'), JSON.stringify(R)); console.log(out.split('\n## Worlds')[0]);
}
if (process.argv[2] !== '--from') launch();
