#!/usr/bin/env node
// tools/run.js - the test runner.
//   node tools/run.js              quick: only the suites the changed files can affect (vs the last full green run)
//   node tools/run.js full         every node suite, 2 at a time, writes the green stamp when all pass
//   node tools/run.js resume       only the node suites not yet green for exactly these sources and their own test file (tests/.passed.json); stamps green when all are
//   node tools/run.js pages        browser page tests (playwright), stamps pages green
//   node tools/run.js a b c        just these suites
//   options: --bail (stop at the first failure), --jobs=N
// Prints each result as it finishes. Suite timings are kept in tests/timings.json and used to order the next run.
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'), T = path.join(ROOT, 'tests'), STAMP = path.join(T, '.stamp.json'), TIMES = path.join(T, 'timings.json');
const cfg = JSON.parse(fs.readFileSync(path.join(T, 'suites.json'), 'utf8'));
const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), names = args.filter(a => !a.startsWith('--'));
const bail = flags.includes('--bail'), jobsFlag = flags.find(a => a.startsWith('--jobs=')), JOBS = jobsFlag ? +jobsFlag.slice(7) : (args[0] === 'pages' ? 1 : 2); // page tests run in real time, so one at a time
const mode = names[0] === 'full' || names[0] === 'resume' || names[0] === 'pages' || names[0] === 'quick' ? names.shift() : (names.length ? 'list' : 'quick');
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { return d } };
const fileHashes = () => { // every file that can change what the game or a test does
  const out = {}, add = f => { out[path.relative(ROOT, f)] = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex') };
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) if (f.endsWith('.js')) add(path.join(ROOT, 'src', f));
  for (const f of ['index.html', 'style.css', 'tests/lib.js', 'tests/suites.json', 'tests/golden.json']) if (fs.existsSync(path.join(ROOT, f))) add(path.join(ROOT, f));
  for (const s of [...cfg.node, ...cfg.pages]) { const f = path.join(T, s + '.js'); if (fs.existsSync(f)) add(f) }
  return out;
};
const isUi = k => { const m = /^src\/(\w+)\.js$/.exec(k); return !!(m && cfg.ui_only.includes(m[1])) || k === 'style.css' || cfg.pages.some(n => k === 'tests/' + n + '.js') };
const total = h => crypto.createHash('sha1').update(Object.keys(h).filter(k => !isUi(k)).sort().map(k => k + h[k]).join('')).digest('hex').slice(0, 12); // node suites never load browser-only files
const uiTotal = h => crypto.createHash('sha1').update(Object.keys(h).sort().map(k => k + h[k]).join('')).digest('hex').slice(0, 12);
const simHash = h => uiTotal(Object.fromEntries(Object.entries(h).filter(([k]) => /^src\/|index\.html|style\.css|^tests\/(ui_|concerns_ui)/.test(k))));
const H = fileHashes(), stamp = read(STAMP, {}), times = read(TIMES, {});
if (names[0] === 'hash') { console.log(total(H)); process.exit(0); }
if (names[0] === 'simhash') { console.log(simHash(H)); process.exit(0); }

// which suites can the changed files affect?
function affected() {
  const was = stamp.files || {}, ch = Object.keys(H).filter(k => H[k] !== was[k]);
  if (!stamp.files) return { list: cfg.node, why: 'no green run on record: everything' };
  const set = new Set(), why = [];
  for (const f of ch) {
    const m = /^src\/(\w+)\.js$/.exec(f), base = m && m[1];
    if (base && cfg.ui_only.includes(base)) { why.push(f + ' (browser only)'); continue }
    if (/^tests\/(\w+)\.js$/.test(f)) { const s = /^tests\/(\w+)\.js$/.exec(f)[1]; if (cfg.node.includes(s)) set.add(s); why.push(f); continue }
    if (f === 'index.html' || f === 'style.css') { why.push(f + ' (browser only)'); continue }
    why.push(f);
    for (const s of (cfg.touch[base] || cfg.node)) set.add(s);
  }
  return { list: cfg.node.filter(s => set.has(s)), why: why.length ? 'changed: ' + why.join(', ') : 'nothing changed since the last full green run' };
}
const PASSED = path.join(T, '.passed.json'), sha = x => crypto.createHash('sha1').update(x).digest('hex').slice(0, 12);
const simInputs = h => sha(Object.keys(h).filter(k => !isUi(k) && (!/^tests\//.test(k) || /^tests\/(lib\.js|golden\.json)$/.test(k))).sort().map(k => k + h[k]).join(''));
const keyOf = (h, s) => simInputs(h) + ':' + (h['tests/' + s + '.js'] || '');   // a suite is green for these sources plus its own test file
let list, kind = 'node';
if (mode === 'full') list = cfg.node;
else if (mode === 'resume') { const pm = read(PASSED, {}); list = cfg.node.filter(n => pm[n] !== keyOf(H, n)); console.log('resume: ' + (cfg.node.length - list.length) + ' suites already green for these sources, ' + list.length + ' to run' + (list.length ? ': ' + list.join(', ') : '')); if (!list.length) { fs.writeFileSync(STAMP, JSON.stringify({ ...stamp, files: H, hash: total(H), simHash: simHash(H), time: new Date().toISOString(), suites: cfg.node.length, resumed: true }, null, 1)); console.log(' green stamp written: ' + total(H)); process.exit(0) } }
else if (mode === 'pages') { list = cfg.pages; kind = 'pages' }
else if (mode === 'list') list = names;
else { const a = affected(); list = a.list; console.log(a.why + (list.length ? ' -> ' + list.length + ' suite(s)' : ' -> no node suites needed')) }
// order: quick/failure-prone first, then the slowest first so the two workers finish together
const first = cfg.first, est = s => times[s] || cfg.est[s] || 30;
list = [...list.filter(s => first.includes(s)).sort((a, b) => first.indexOf(a) - first.indexOf(b)), ...list.filter(s => !first.includes(s)).sort((a, b) => est(b) - est(a))];
if (!list.length) process.exit(0);

const results = {}; let next = 0, running = 0, failed = 0; const T0 = Date.now(); const procs = new Set();
const fmt = n => { n = Math.round(n); return n >= 60 ? Math.floor(n / 60) + 'm' + String(n % 60).padStart(2, '0') + 's' : n + 's' };
function done() {
  const wall = (Date.now() - T0) / 1000, sum = Object.values(results).reduce((a, r) => a + r.sec, 0);
  console.log('\n suite                     time   result');
  for (const s of Object.keys(results).sort((a, b) => results[b].sec - results[a].sec)) console.log(' ' + s.padEnd(24) + fmt(results[s].sec).padStart(6) + '   ' + (results[s].ok ? results[s].line : 'FAILED'));
  console.log(`\n ${list.length} suites, ${failed} failed, ${fmt(wall)} wall (${fmt(sum)} of work on ${JOBS} workers)`);
  fs.writeFileSync(TIMES, JSON.stringify(times, null, 1));
  if (kind === 'node') { const pm = read(PASSED, {}); for (const n of Object.keys(results)) { if (results[n].ok) pm[n] = keyOf(H, n); else delete pm[n] } fs.writeFileSync(PASSED, JSON.stringify(pm, null, 1)) }
  if (!failed && Object.keys(results).length === list.length) {
    if (mode === 'full' || (mode === 'quick' && list.length === cfg.node.length) || (mode === 'resume' && cfg.node.every(n => read(PASSED, {})[n] === keyOf(H, n)))) { fs.writeFileSync(STAMP, JSON.stringify({ ...stamp, files: H, hash: total(H), simHash: simHash(H), time: new Date().toISOString(), suites: list.length }, null, 1)); console.log(' green stamp written: ' + total(H)) }
    if (mode === 'pages') fs.writeFileSync(STAMP, JSON.stringify({ ...stamp, pagesHash: simHash(H), pagesTime: new Date().toISOString() }, null, 1)), console.log(' page tests stamped for source ' + simHash(H));
  }
  process.exit(failed ? 1 : 0);
}
function launch() {
  while (running < JOBS && next < list.length && !(bail && failed)) {
    const s = list[next++], f = path.join(T, s + '.js'), t0 = Date.now();
    if (!fs.existsSync(f)) { failed++; results[s] = { ok: false, sec: 0 }; console.log('MISSING tests/' + s + '.js'); continue }
    running++; const log = '/tmp/chk_' + s + '.log', out = fs.openSync(log, 'w');
    const p = cp.spawn('node', [f], { cwd: ROOT, stdio: ['ignore', out, out] }); procs.add(p);
    p.on('exit', code => {
      procs.delete(p); running--; const sec = (Date.now() - t0) / 1000, txt = fs.readFileSync(log, 'utf8');
      const bad = /^\d+ passed, [1-9]\d* failed|, [1-9]\d* failed/m.test(txt) ;
      const ok = code === 0 && !/^DIFF/m.test(txt) && !bad;
      const line = (txt.split('\n').filter(l => /passed|no errors|errors 0|ms\/tick|golden/.test(l)).pop() || '').trim().slice(0, 70);
      results[s] = { ok, sec, line }; if (ok) times[s] = Math.round(sec * 10) / 10; else failed++;
      console.log((ok ? 'ok     ' : 'FAILED ') + s.padEnd(22) + fmt(sec).padStart(6) + '  ' + (ok ? line : ''));
      if (!ok) { console.log(txt.split('\n').filter(Boolean).slice(-12).map(l => '   | ' + l).join('\n')); if (bail) { for (const q of procs) q.kill(); return done() } }
      if (next >= list.length && !running) done(); else launch();
    });
  }
  if (!running && (next >= list.length || (bail && failed))) done();
}
launch();
