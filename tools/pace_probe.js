#!/usr/bin/env node
/* Pace probe (v0.38.1): one world, per-year population, techs known, age, births and deaths, and the year each age began.
   node tools/pace_probe.js SEED MAP YEARS [HARDSHIP 0-2] [old] [size standard|large]   ("old" = v0.37 pace settings) */
const { loadSim, oldPace } = require('../tests/lib');
const [, , seed, map, years, hard, old, size] = process.argv;
const S = loadSim('World,CFG,AGES,techEra'); if (old === 'old') oldPace(S.CFG);
const w = new S.World(+seed || 12, { map: map || 'island', hardship: +(hard ?? 1) }, size === 'large' ? [340, 236] : undefined); w.settings.hardship = +(hard ?? 1); if (process.env.ALL) Object.assign(w.settings, { survival: true, disasters: true, crime: true, raids: true });
const firstAge = {}; let prevAge = -1; const t0 = Date.now();
for (let d = 1; d <= (+years || 40) * 32; d++) {
  for (let t = 0; t < 1200; t++) w.step();
  const age = S.techEra(w); if (age !== prevAge) { prevAge = age; firstAge[S.AGES[age]] = +(d / 32).toFixed(1) }
  if (d % 32 === 0) { const y = d / 32; if (y % 2 === 0 || y <= 5) console.log(`y${y} pop ${w.pop} vills ${w.vills.length} techs ${Object.keys(w.tech.known).length} ${S.AGES[age]} order ${(w.order ?? 1).toFixed(2)} ${((Date.now() - t0) / 1000) | 0}s`) }
  if (w.over) { console.log('GAME OVER year', d / 32, w.over.why || w.over.kind); break }
}
console.log('AGES (sim year entered):', JSON.stringify(firstAge));
