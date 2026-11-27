#!/usr/bin/env node
/* Pace probe (v0.38.1): one world, per-year population, techs known, age, births and deaths, and the year each age began.
   node tools/pace_probe.js SEED MAP YEARS [HARDSHIP 0-2] [old] [size standard|large]   ("old" = v0.37 pace settings) */
const { loadSim, oldPace } = require('../tests/lib');
const [, , seed, map, years, hard, old, size] = process.argv;
const S = loadSim('World,CFG,AGES,techEra'); if (old === 'old') oldPace(S.CFG);
if (process.env.CFGX) Object.assign(S.CFG, JSON.parse(process.env.CFGX));
const w = new S.World(+seed || 12, { map: map || 'island', hardship: +(hard ?? 1) }, size === 'large' ? [340, 236] : undefined); w.settings.hardship = +(hard ?? 1); if (process.env.ALL) Object.assign(w.settings, { survival: true, disasters: true, crime: true, raids: true });
if (process.env.SW !== undefined) { const on = new Set(process.env.SW.split(',')); for (const k of ['survival', 'disasters', 'crime', 'raids']) w.settings[k] = on.has(k) } /* SW=survival,crime sets exactly these on (SW= for none) */
const EV = {}; { const e0 = w.emit.bind(w); w.emit = (t, m, o) => { const k = o && o.kind; if (k) EV[k] = (EV[k] || 0) + 1; return e0(t, m, o) } }
const firstAge = {}; let prevAge = -1; const t0 = Date.now();
for (let d = 1; d <= (+years || 40) * 32; d++) {
  for (let t = 0; t < 1200; t++) w.step();
  const age = S.techEra(w); if (age !== prevAge) { prevAge = age; firstAge[S.AGES[age]] = +(d / 32).toFixed(1) }
  if (d % 32 === 0) { const y = d / 32; if (y % 2 === 0 || y <= 5) console.log(`y${y} pop ${w.pop} vills ${w.vills.length} techs ${Object.keys(w.tech.known).length} ${S.AGES[age]} order ${(w.order ?? 1).toFixed(2)} ${((Date.now() - t0) / 1000) | 0}s`) }
  if (w.over) { console.log('GAME OVER year', d / 32, w.over.why || w.over.kind); break }
}
console.log('AGES (sim year entered):', JSON.stringify(firstAge));

const D = {}; let ndeath = 0; for (const y in (w.dyr || {})) { const r = w.dyr[y]; for (const k in r) if (typeof r[k] === 'number') D[k] = (D[k] || 0) + r[k] } console.log('DEATHS by key:', JSON.stringify(D)); console.log('SETTINGS:', JSON.stringify({ s: w.settings.survival, d: w.settings.disasters, c: w.settings.crime, r: w.settings.raids }), 'final pop', w.pop);
console.log('EVENTS by kind:', JSON.stringify(EV));
