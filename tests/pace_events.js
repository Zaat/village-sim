// v0.38 growth pace: a long childhood, children can die, newcomers arrive as adults, a big town loses order, and a young town grows slowly
const { loadSim, checkpoint, loadCheckpoint } = require('./lib');
const S = loadSim('World,CFG,Villager,prosperityDay,deserializeWorld'); let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
const { CFG } = S;
// 1. life stages: childhood is long, and the stages stay in order
ok(CFG.ADULT_DAYS >= 25 && CFG.ADULT_DAYS < CFG.ELDER_DAYS, 'adulthood comes late: ' + CFG.ADULT_DAYS);
ok(CFG.INFANT_DAYS < CFG.CHILD_DAYS && CFG.CHILD_DAYS < CFG.ADULT_DAYS && CFG.FERTILE_MAX < CFG.OLD_DAYS, 'stages are in order');
// 2. children die of fevers and accidents: with the hazard on, some of forty die in a year and most do not; with it off, none do (they are fed every day)
const kidsDie = hazard => { CFG.CHILD_MORT = hazard; const w = new S.World(12, { map: 'continent' }); const kids = []; for (let i = 0; i < 40; i++) { const v = new S.Villager(w, i % 2 ? 'f' : 'm', 6, w.cx, w.cy); w.vills.push(v); kids.push(v) }
  for (let d = 0; d < 32; d++) { for (const v of kids) if (v.alive) { v.hunger = 100; v.health = 100 } for (let t = 0; t < 1200; t++) w.step() } return kids.filter(v => !v.alive).length };
{ const base = CFG.CHILD_MORT, on = kidsDie(base), off = kidsDie(0); CFG.CHILD_MORT = base;
  ok(on >= 3 && on <= 20, 'some children die in a year, most live: ' + on + ' of 40'); ok(off === 0, 'with the hazard off none die: ' + off); }
// 3. order: a small town keeps the peace, a vast one strains
{ const w = new S.World(12, { map: 'continent' }); for (let d = 0; d < 3; d++) for (let t = 0; t < 1200; t++) w.step();
  S.prosperityDay(w); ok(w.order === 1, 'a small town keeps order: ' + w.order);
  w.crowd = { kids: 0, adults: 3000, elders: 0, n: 3000, acc: {} }; S.prosperityDay(w); ok(w.order < 0.6 && w.order > 0, 'a vast town loses order: ' + w.order);
  const p = w.prosp; w.crowd = null; S.prosperityDay(w); ok(w.prosp > p, 'order costs prosperity: ' + p + ' vs ' + w.prosp); }
// 4. a young town grows slowly: six years from eight people stays well under the old doubling pace
{ const w = new S.World(12, { map: 'continent' }); for (let t = 0; t < 1200 * 32 * 6; t++) w.step();
  ok(w.pop >= 20 && w.pop <= 90, 'six years in, the town is small: ' + w.pop); }
// 5. a save from before v0.38 (no lifeV) keeps everybody in their stage: adults stay adults, children stay children
{ const raw = checkpoint(S, 'isl12_y4'), w = loadCheckpoint(S, 'isl12_y4'); ok(!raw.lifeV && raw.vills.length > 0, 'the checkpoint is an old save');
  ok(raw.vills.every(r => (r.age >= 14) === w.vills.find(v => v.id === r.id).isAdult()), 'old adults stay adults and old children stay children'); }
console.log(fail ? 'pace_events FAILED ' + fail : 'pace_events passed ' + pass); process.exit(fail ? 1 : 0);
