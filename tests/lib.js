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
module.exports = { ROOT, SRC, BROWSER_ONLY, code, loadSim };
