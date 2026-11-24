#!/usr/bin/env node
// tools/checkpoint.js - make and inspect checkpoint worlds (saved, gzipped) that tests and probes start from instead of simulating the early game again.
//   node tools/checkpoint.js make NAME SEED MAP DAYS [--opts='{"hardship":0}']   run a fresh world for DAYS days and save tests/checkpoints/NAME.json.gz
//   node tools/checkpoint.js list                                                  show what exists
// A checkpoint is a real save (serializeWorld). Loading one always continues the same way, but not exactly like the original straight run
// (villagers come back idle, paths are replanned), so tests that start from a checkpoint check behaviour, not the straight-run trajectory.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = path.resolve(__dirname, '..', 'tests', 'checkpoints');
const [cmd, name, seed, map, days] = process.argv.slice(2).filter(a => !a.startsWith('--')), flag = process.argv.find(a => a.startsWith('--opts='));
if (cmd === 'list') { for (const f of fs.existsSync(DIR) ? fs.readdirSync(DIR) : []) { if (!f.endsWith('.json.gz')) continue; const m = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, f)))).meta || {}; console.log(f.padEnd(28), (fs.statSync(path.join(DIR, f)).size / 1024).toFixed(0).padStart(5) + ' KB', JSON.stringify(m)) } process.exit(0) }
if (cmd !== 'make' || !name || !seed || !days) { console.log('usage: node tools/checkpoint.js make NAME SEED MAP DAYS [--opts=JSON] | list'); process.exit(1) }
const S = require('../tests/lib').loadSim('World,CFG,serializeWorld'), opts = { ...(flag ? JSON.parse(flag.slice(7)) : {}), ...(map && map !== '-' ? { map } : {}) };
const w = new S.World(+seed, opts); for (let t = 0; t < 1200 * +days; t++) w.step();
const d = S.serializeWorld(w); d.meta = { name, seed: +seed, opts, days: +days, pop: w.pop, version: (fs.readFileSync(path.resolve(__dirname, '..', 'src', 'debug.js'), 'utf8').match(/APP_VERSION = '([^']+)'/) || [])[1] };
fs.mkdirSync(DIR, { recursive: true }); const out = path.join(DIR, name + '.json.gz'); fs.writeFileSync(out, zlib.gzipSync(JSON.stringify(d), { level: 9 }));
console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB', 'pop', w.pop, 'day', w.day);
