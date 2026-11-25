// v0.36 growth: births follow what the village can hold (birthDamp), settled couples try daily (coupleDay), young singles court (courtDay, never kin)
const { loadSim, loadCheckpoint } = require('./lib');
const S = loadSim('World,CFG,birthDamp'); let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
const w = loadCheckpoint(S, 'isl12_y4');
// 1. damping follows capacity, not a head-count
const d0 = S.birthDamp(w); ok(d0 >= 0.3 && d0 <= 1, 'damping in range: ' + d0);
const bedsReal = w.beds; w.beds = () => w.pop + 1; const dFull = S.birthDamp(w); w.beds = () => w.pop * 3; const dRoomy = S.birthDamp(w); w.beds = bedsReal;
ok(dFull < dRoomy, `a full village damps births more than a roomy one (${dFull.toFixed(2)} < ${dRoomy.toFixed(2)})`); ok(dFull <= 0.5, 'a village with no spare beds is damped hard: ' + dFull.toFixed(2));
const food0 = w.stock.food; w.stock.food = 0; ok(S.birthDamp(w) <= 0.31, 'an empty larder damps births to the floor'); w.stock.food = food0;
ok(S.CFG.BIRTH_DAMP === 0, 'the fixed 300 ceiling is off by default');
// 2. courtship pairs young singles, never kin
const kin = (a, b) => a.parentIds.some(id => id != null && (b.parentIds.includes(id) || b.id === id)) || b.parentIds.includes(a.id);
const pairs0 = w.vills.filter(v => v.partner != null).length, before = new Set(w.vills.filter(v => v.partner != null).map(v => v.id));
S.CFG.COURT_TRY = 1; w.courtDay(); const pairs1 = w.vills.filter(v => v.partner != null).length; S.CFG.COURT_TRY = 0.03;
ok(pairs1 >= pairs0, 'court never breaks couples'); const singlesF = w.vills.filter(v => v.sex === 'f' && v.partner == null && v.isAdult() && v.age <= S.CFG.FERTILE_MAX * (w.lifeScale || 1));
ok(w.vills.every(v => v.partner == null || (w.vills.find(x => x.id === v.partner) || {}).partner === v.id), 'partners are mutual');
const fresh = w.vills.filter(v => v.partner != null && !before.has(v.id)); ok(fresh.length > 0, 'courtship paired some singles: ' + fresh.length); ok(fresh.every(v => !kin(v, w.vills.find(x => x.id === v.partner))), 'no kin pairs formed by courtship');
// 3. couples try without chatting: with the old route silenced, births still happen over a season
const w2 = loadCheckpoint(S, 'isl12_y4'); const b0 = w2.births; for (let t = 0; t < 1200 * 32; t++) w2.step();
ok(w2.births - b0 > 10, 'births in a year: ' + (w2.births - b0)); ok(w2.dbg.total === 0, 'no errors: ' + [...w2.dbg.errors.values()].map(e => e.where + ' ' + e.msg).join(';'));
console.log(fail ? 'FAILED ' + fail : 'growth passed ' + pass); process.exit(fail ? 1 : 0);
