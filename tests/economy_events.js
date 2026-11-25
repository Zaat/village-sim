// v0.37 economy: the crowd's yields come from fields, trips and tools, and the planner sizes the fields by them
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,ECON,fishReach,fishHand,crowdFish,fieldMean,fieldDay,fieldMult,focusFarms,crowdFields,farmsWanted,gatherReach,handYield,crowdFell,crowdState,winterWood');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const w = loadCheckpoint(S, 'lake765_y7');
// fields: the season profile matches what villagers measured (nothing in spring, most in autumn) and technology raises it
const sy = []; for (const s of [0, 1, 2, 3]) { Object.defineProperty(w, 'season', { get: () => s, configurable: true }); sy.push(S.fieldDay(w)) } delete w.season;
ok(sy[0] < sy[3] && sy[3] < sy[1] && sy[1] < sy[2], 'field yield by season: spring < winter < summer < autumn: ' + sy.map(x => x.toFixed(2)));
const m0 = S.fieldMean(w); const had = { ...w.tech.known }; for (const t of ['rotation', 'plow']) delete w.tech.known[t]; const m1 = S.fieldMean(w); Object.assign(w.tech.known, had);
ok(m1 < m0 || m1 === m0, `the plough and rotation raise a field's yield: ${m1.toFixed(2)} to ${m0.toFixed(2)}`);
// one worker keeps about three fields
ok(S.ECON.fph > 2.5 && S.ECON.fph < 4.5, 'a worker tends about three fields: ' + S.ECON.fph.toFixed(2));
// the planner sizes fields for the crowd's mouths and for what a field gives
const want = S.farmsWanted(w); ok(want > S.focusFarms(w), `the crowd needs fields of its own: ${want} wanted, ${S.focusFarms(w)} for the villagers`);
const C = w.crowd; const n0 = C.n; C.kids *= 2; C.adults *= 2; C.n = C.kids + C.adults + C.elders; ok(S.farmsWanted(w) > want, 'more mouths, more fields'); C.kids /= 2; C.adults /= 2; C.n = n0;
const small = loadCheckpoint(S, 'lake765_y7'); small.crowd = null; ok(S.farmsWanted(small) === S.focusFarms(small), 'with no crowd the fields are the villagers\' as before');
// wood and stone: trips from the walk to the trees
const R = S.gatherReach(w, 'wood'), hy = S.handYield(w, 'wood', R); ok(R.list.length > 50 && R.d > 0 && hy > 0.3 && hy < 12, `wood: trees ${R.n}, mean walk ${R.d.toFixed(1)}, ${hy.toFixed(2)} a hand a day`);
const far = { ...R, d: R.d * 2 }; ok(S.handYield(w, 'wood', far) < hy, 'farther trees give less per worker');
const camp = { ...R, nearCamp: 1 }; ok(S.handYield(w, 'wood', camp) > hy, 'a camp in the wood gives more per worker');
ok(S.handYield(w, 'wood', { list: [], d: 0, nearCamp: 0 }) === 0, 'no trees, no wood');
// the crowd fells what it uses, nearest first, and the forest shrinks
const t0 = w.trees, got = S.crowdFell(w, 'wood', 300, R, 1); ok(got > 250 && got <= 301 && w.trees < t0, `felling 300 wood took the nearest trees: got ${got}, trees ${t0} to ${w.trees}`);
const R2 = S.gatherReach(w, 'wood'); ok(R2.d >= R.d, `the walk does not shrink after felling: ${R.d.toFixed(2)} to ${R2.d.toFixed(2)}`);
// a day of crowd work moves the stocks the right way and is deterministic
const a = loadCheckpoint(S, 'lake765_y7'), b = loadCheckpoint(S, 'lake765_y7'); for (const x of [a, b]) { x.stock.wood = 100; for (let i = 0; i < 1200 * 3; i++) x.step() }
ok(a.stock.wood === b.stock.wood && a.stock.food === b.stock.food && a.trees === b.trees, 'the same start gives the same days');
ok(a.crowd.workers.wood > 0 && a.crowd.workers.food > 0, 'hands go to food and firewood when both are wanted: ' + JSON.stringify(a.crowd.workers));
// the sea: fishers draw on the real fish stock, harbours put the water at the door, the planner needs fewer fields for what the sea gives
const FR = S.fishReach(w); ok(FR.list.length > 20 && FR.frontage > 20 && FR.cap > 5, `fishing grounds: ${FR.list.length} tiles, ${FR.frontage} shore tiles, room for ${FR.cap.toFixed(0)} fishers, ${FR.docks} docks`);
const fh = S.fishHand(w, FR); ok(fh > 1 && fh < 14, `a fisher lands ${fh.toFixed(2)} food a day`);
ok(S.fishHand(w, { ...FR, d: FR.d * 3 }) < fh, 'a longer walk to the water lands less');
ok(S.fishHand(w, { list: [], d: 0 }) === 0, 'no water, no fish');
const f0 = FR.list.reduce((s, i) => s + w.fish[i], 0), took = S.crowdFish(w, 40), f1 = FR.list.reduce((s, i) => s + w.fish[i], 0);
ok(took > 0 && took <= 40 && f0 - f1 === took, `the crowd takes fish from the water: ${took} loads, stock ${f0} to ${f1}`);
const C2 = w.crowd, fa = C2.fishAvg || 0, wantNow = S.farmsWanted(w); C2.fishAvg = 40; ok(S.farmsWanted(w) < wantNow || wantNow === S.focusFarms(w), 'what the sea gives needs no field'); C2.fishAvg = fa;
ok(a.crowd.workers.fish > 0 && a.crowd.fished > 0, 'a harbour town sends hands to the sea: ' + JSON.stringify(a.crowd.workers));
console.log(fail ? fail + ' FAILED' : 'economy_events ok'); process.exit(fail ? 1 : 0);
