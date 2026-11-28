// v0.40 city design: commission of a layout style, beauty per district, project ledger (square / remodel / heritage), heritage skips upgrades, save round trip
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,DESIGN,DESIGN_STYLES,designState,designStyle,designDay,designScore,designCompact,designOptions,designText,commission,proposeProject,districtsView,layoutBias,planUpgrades,serializeWorld,deserializeWorld,styleNow');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const days = (w, n) => { for (let i = 0; i < 1200 * n; i++) w.step() };
const w = loadCheckpoint(S, process.argv[2] || 'lake765_y7');
ok(w.pop >= S.DESIGN.first, 'checkpoint is large enough: ' + w.pop);
// --- nothing before the size, and the library is data
ok(Object.keys(S.DESIGN_STYLES).length >= 5, 'the library holds the five families');
const small = new S.World(5, { map: 'island' }); S.designDay(small); ok(!small.design, 'a tiny village has no plan');
// --- the commission picks a style and leans the layout
const before = S.layoutBias(w).compact; w.design = null; w.tech.known.carpentry = w.tech.known.carpentry || 1;
S.designDay(w); const D = S.designState(w);
ok(D.style && S.DESIGN_STYLES[D.style], 'a style is commissioned: ' + D.style);
ok(w.gov.decisions.length === 0 || /lay out the town/.test(w.gov.decisions[0].text), 'the council records it');
ok(Math.abs(S.layoutBias(w).compact - before - S.DESIGN_STYLES[D.style].compact) < 0.0001 || S.layoutBias(w).compact === 1 || S.layoutBias(w).compact === 0.1, 'the style leans layoutBias');
ok(!S.designOptions(w).includes('garden') || S.styleNow(w) >= 4, 'late styles wait for the knowledge');
// --- beauty per district, 0..100, stable for the same town
S.designScore(w); const keys = Object.keys(D.beauty); ok(keys.length > 0 && keys.every(k => D.beauty[k] >= 0 && D.beauty[k] <= 100), 'beauty in range for ' + keys.length + ' districts');
const a1 = D.avg; S.designScore(w); ok(D.avg === a1, 'the score is deterministic');
// --- projects enter the ledger and finish
D.nextProj = 0; w.stock.wood = Math.max(w.stock.wood, 200); w.stock.stone = Math.max(w.stock.stone, 100);
for (let i = 0; i < 6 && !D.ledger.length; i++) { D.nextProj = 0; S.designDay(w); w.tick += 1200 * 4 }
ok(D.ledger.length > 0, 'a project is approved: ' + JSON.stringify(D.ledger[0]));
const e = D.ledger[0]; ok(e && ['square', 'remodel', 'heritage'].includes(e.kind) && e.state === 'approved', 'a ledger entry has a kind and a state');
if (e && e.kind === 'heritage') { ok([...w.houses()].some(h => h.heritage), 'a home is marked heritage'); const before2 = w.bps.filter(b => b.type === 'upgrade').length; w.nextUpgrade = 0; S.planUpgrades(w); ok([...w.bps].filter(b => b.type === 'upgrade').every(b => !(w.buildings.get(b.target) || {}).heritage), 'heritage homes are not rebuilt') }
// --- the sim keeps running and the plan survives a save
days(w, 3); ok(w.design.style === D.style, 'plan survives running');
const d2 = JSON.parse(JSON.stringify(S.serializeWorld(w))); ok(d2.design && d2.design.style === D.style && Array.isArray(d2.design.ledger), 'the plan is saved');
console.log(fail ? fail + ' FAILED' : 'city_design ok: ' + D.style + ' avg ' + D.avg + ' ledger ' + D.ledger.length);
process.exit(fail ? 1 : 0);
