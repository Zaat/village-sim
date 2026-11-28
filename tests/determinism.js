// Things that make the same seed give different worlds in different engines (v0.39.3).  node tests/determinism.js
// 1. no sort() with a comparator that draws random numbers: engines call comparators in different orders, and how often differs
// 2. shuffled() is a fair permutation that draws exactly n-1 numbers
// 3. the sim does not read the wall clock to decide anything (the clock is for the frame budget and the save stamp only)
const fs = require('fs'), path = require('path'), L = require('./lib');
let ok = 0, bad = 0; const check = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); cond ? ok++ : bad++ };
const files = L.SRC.map(f => [f, fs.readFileSync(path.join(L.ROOT, 'src', f + '.js'), 'utf8')]);
const lineOf = (txt, re) => txt.split('\n').map((l, i) => re.test(l) ? i + 1 : 0).filter(Boolean);
const RANDOM_SORT = /\.sort\(\s*(\(\s*\)|\(\s*\w+\s*,\s*\w+\s*\))\s*=>[^)]*(\bw\.r\(\)|\brng\(\)|Math\.random\(\)|\.rand\(\))/;
const hits = []; for (const [f, t] of files) for (const n of lineOf(t, RANDOM_SORT)) hits.push(f + '.js:' + n);
check('no sort with a random comparator', hits.length === 0, hits.join(', '));
const S = L.loadSim('shuffled'); let calls = 0; const r = (() => { let s = 12345; return () => { calls++; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } })();
const a = Array.from({ length: 40 }, (_, i) => i), b = S.shuffled(a, r);
check('shuffled keeps every element once', b.length === 40 && new Set(b).size === 40 && a.every((x, i) => x === i), b.slice(0, 8).join(','));
check('shuffled draws exactly n-1 numbers', calls === 39, calls + ' draws');
check('shuffled really mixes', b.some((x, i) => x !== i));
check('shuffled of 0 or 1 draws nothing', (calls = 0, S.shuffled([], r), S.shuffled([7], r), calls === 0));
const clock = []; for (const [f, t] of files) if (!['world', 'save', 'debug', 'saves', 'playui', 'overui', 'helpui', 'sound'].includes(f)) for (const n of lineOf(t, /Date\.now\(\)|performance\.now\(\)|new Date\(/)) clock.push(f + '.js:' + n);
check('only world.js (frame budget) and save.js (save stamp) read the clock among the simulation files', clock.length === 0, clock.join(', '));
console.log(`determinism: ${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
