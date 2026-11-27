'use strict';
/* Shared by every node test: the list of simulation source files, in the order index.html loads them.
   Browser-only files are left out. Adding a module to index.html is all a new file needs. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BROWSER_ONLY = new Set(['render', 'debug', 'statsui', 'concernsui', 'voicesui', 'ui', 'treeui']);
const SRC = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/src="src\/([a-z0-9_]+)\.js"/g)].map(m => m[1]).filter(n => !BROWSER_ONLY.has(n));
const code = extra => SRC.map(f => fs.readFileSync(path.join(ROOT, 'src', f + '.js'), 'utf8')).join('\n') + (extra ? '\n;' + extra : '');
const vm = require('vm');
/* loadSim('World,CFG,...') -> object with those names, sources run in a fresh context */
const loadSim = names => { const ctx = { console, Buffer, performance }; vm.createContext(ctx);
  vm.runInContext(code('Object.assign(globalThis,{' + names + '});'), ctx); return ctx; };
/* checkpoint(S, name) -> a world loaded from tests/checkpoints/NAME.json.gz (made by tools/checkpoint.js); S needs deserializeWorld */
const checkpoint = (S, name) => JSON.parse(require('zlib').gunzipSync(fs.readFileSync(path.join(ROOT, 'tests', 'checkpoints', name + '.json.gz'))));
const loadCheckpoint = (S, name) => S.deserializeWorld(checkpoint(S, name));
/* v0.38 slowed the growth of towns (a long childhood, child deaths, wide birth spacing, few newcomers, an order brake). Suites that only need a big town quickly, and say nothing about pace, switch back to the earlier fast settings with oldPace(CFG). */
const OLD_PACE = { INFANT_DAYS: 3, CHILD_DAYS: 8, ADULT_DAYS: 14, FERTILE_MAX: 85, CHILD_MORT: 0, IMM_CHANCE: 0.1, IMM_MAX: 3, CROWD_DRAW: 0.012, ORDER_BITE: 0, DEP_CAP: 3, PREGNANCY: 960, BIRTH_COOLDOWN: 2400 };
const oldPace = CFG => Object.assign(CFG, OLD_PACE);
module.exports = { ROOT, SRC, BROWSER_ONLY, code, loadSim, checkpoint, loadCheckpoint, oldPace, OLD_PACE };
