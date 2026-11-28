#!/usr/bin/env node
// tools/mathcheck.js - do Math.sin and Math.cos give the same bits in every engine we run on?
//
// The simulation is deterministic for a seed, but a few places use Math.sin / Math.cos (animals, discovery, map generation, outposts,
// town, world, villager). The language does not promise identical results for them across engines, so a save or a seed could in
// principle diverge between, say, Chrome and Firefox. This computes both functions over the ranges the simulation uses and compares
// Node (V8) with whatever Playwright browsers are installed (chromium, firefox, webkit).
//
// It then does what matters more: it builds the same worlds in each engine and compares them bit for bit (the first 10 days of seed 777,
// plus the terrain and first days of every map type), which is how a bug like a random sort comparator shows up (v0.39.3 fixed six).
//
//   node tools/mathcheck.js            report, exit 0
//   node tools/mathcheck.js --strict   exit 1 if the worlds differ between engines
//   node tools/mathcheck.js --strict-math   exit 1 if the sin/cos values differ too (they do by 1 ulp in some builds, and the worlds still agree)
//   node tools/mathcheck.js --only=node,chromium
//
// Needs Playwright only for the browser engines (NODE_PATH may point at its node_modules); without it only Node is reported.
const crypto = require('crypto');
const args = process.argv.slice(2), strict = args.includes('--strict'), strictMath = args.includes('--strict-math'), onlyArg = args.find(a => a.startsWith('--only=')), only = onlyArg ? onlyArg.slice(7).split(',') : null;

/* runs in every engine; returns the results as plain numbers (JSON round-trips a double exactly) */
function sample() {
  const xs = [];
  for (let i = 0; i < 63000; i++) xs.push(i * 1e-4);                        // one turn, finely
  for (let i = 0; i < 20000; i++) xs.push(-3.15 + i * 3.15e-4);              // around zero, both signs
  for (let i = 0; i < 20000; i++) xs.push(i * 0.0137);                       // a few hundred radians
  for (let i = 0; i < 20000; i++) xs.push((i * 2.399 + (i % 97)) % 6.283);   // the id-based angles the villagers use
  for (let i = 0; i < 10000; i++) xs.push(i * 11.3 + 0.5);                   // large arguments, where engines differ most
  const out = new Array(xs.length * 2);
  for (let i = 0; i < xs.length; i++) { out[2 * i] = Math.sin(xs[i]); out[2 * i + 1] = Math.cos(xs[i]) }
  return out;
}
/* worlds: runs in every engine, source text of the simulation is given in `src`; returns a table of exact hashes */
const WORLD_PROBE = `(days, seeds) => {
  const dv = new DataView(new ArrayBuffer(8)), h = a => { let x = 2166136261; for (let i = 0; i < a.length; i++) { dv.setFloat64(0, +a[i]); x = Math.imul(x ^ dv.getUint32(0), 16777619) >>> 0; x = Math.imul(x ^ dv.getUint32(4), 16777619) >>> 0 } return x };
  const out = {}, w = new World(777);
  out.terr = h(w.terr); out.feat = h(w.feat);
  for (let d = 1; d <= days; d++) { for (let t = 0; t < 1200; t++) w.step(); out['day' + String(d).padStart(2, '0')] = h(w.vills.flatMap(v => [v.x, v.y, v.mood])) + ':' + w.vills.length + ':' + h(w.animals.flatMap(a => [a.x, a.y])) }
  for (const t of MAP_ORDER) for (const s of seeds) { const m = new World(s, { type: t, size: 'standard' }); for (let k = 0; k < 40; k++) m.step(); out[t + s] = h(m.terr) + ':' + h(m.feat) + ':' + h(m.vills.flatMap(v => [v.x, v.y])) }
  return out;
}`;
const bits = new DataView(new ArrayBuffer(8));
const hashOf = arr => { const h = crypto.createHash('sha1'); for (const v of arr) { bits.setFloat64(0, v); h.update(Buffer.from(bits.buffer.slice(0))) } return h.digest('hex').slice(0, 16) };
const ulps = (a, b) => { bits.setFloat64(0, a); const ia = bits.getBigInt64(0); bits.setFloat64(0, b); const ib = bits.getBigInt64(0); return Number(ia > ib ? ia - ib : ib - ia) };
const want = name => !only || only.includes(name);

(async () => {
  const results = {};
  if (want('node')) results.node = { version: 'node ' + process.version, data: sample() };
  let pw = null; try { pw = require('playwright') } catch (e) { console.log('(playwright not found: only Node is checked)') }
  if (pw) for (const name of ['chromium', 'firefox', 'webkit']) {
    if (!want(name)) continue;
    let b; try { b = await pw[name].launch() } catch (e) { console.log(`(${name} is not installed: skipped)`); continue }
    try { const p = await b.newPage(); results[name] = { version: name + ' ' + b.version(), data: await p.evaluate(`(${sample.toString()})()`) } } finally { await b.close() }
  }
  // the worlds: node loads the simulation sources the way the tests do, the browsers load index.html
  const worlds = {}, DAYS = 10, SEEDS = [1, 2, 3, 5, 8, 21, 42, 4242];
  if (want('node')) { const L = require('../tests/lib'), vm = require('vm'), S = L.loadSim('World,CFG,MAP_ORDER'); L.oldPace(S.CFG); worlds.node = vm.runInContext('(' + WORLD_PROBE + ')(' + DAYS + ',' + JSON.stringify(SEEDS) + ')', S) }
  if (pw) for (const name of ['chromium', 'firefox', 'webkit']) {
    if (!want(name)) continue;
    let b; try { b = await pw[name].launch() } catch (e) { continue }
    try { const p = await b.newPage(); await p.goto('file:///' + require('path').resolve(__dirname, '..', 'index.html').replace(/\\/g, '/')); await p.waitForTimeout(800); const L = require('../tests/lib'); worlds[name] = await p.evaluate('(() => { Object.assign(CFG, ' + JSON.stringify(L.OLD_PACE) + '); return (' + WORLD_PROBE + ')(' + DAYS + ',' + JSON.stringify(SEEDS) + ') })()') } finally { await b.close() }
  }
  const names = Object.keys(results); if (!names.length) { console.log('nothing to compare'); process.exit(0) }
  const ref = results[names[0]]; let differ = 0;
  console.log(`values per engine: ${ref.data.length}`);
  for (const n of names) {
    const r = results[n], h = hashOf(r.data); let nd = 0, worst = 0, first = -1;
    if (r !== ref) for (let i = 0; i < ref.data.length; i++) if (r.data[i] !== ref.data[i]) { nd++; worst = Math.max(worst, ulps(r.data[i], ref.data[i])); if (first < 0) first = i }
    if (nd) differ++;
    console.log(`${n.padEnd(9)} ${r.version.padEnd(22)} hash ${h}` + (r === ref ? '  (reference)' : nd ? `  DIFFERS in ${nd} values, up to ${worst} ulp, first at index ${first}` : '  identical'));
  }
  console.log(differ ? `\n${differ} engine(s) differ from ${names[0]} in sin/cos values.` : '\nsin/cos: all engines agree bit for bit.');
  // the worlds
  const wn = Object.keys(worlds); let wdiff = 0;
  if (wn.length > 1) {
    console.log(`\nworlds (${DAYS} days of seed 777, and ${Object.keys(worlds[wn[0]]).length - 2 - DAYS} maps), compared with ${wn[0]}:`);
    for (const n of wn.slice(1)) {
      const bad = Object.keys(worlds[wn[0]]).filter(k => worlds[n][k] !== worlds[wn[0]][k]);
      if (bad.length) wdiff++;
      console.log(`  ${n.padEnd(9)} ` + (bad.length ? `DIFFERENT in ${bad.length}: ${bad.slice(0, 6).join(', ')}` : 'identical'));
    }
    console.log(wdiff ? '\nthe same seed does not give the same world in every engine.' : '\nthe same seed gives the same world in every engine.');
  } else console.log('\n(only one engine available: worlds not compared)');
  process.exit((strict && wdiff) || (strictMath && differ) ? 1 : 0);
})();
