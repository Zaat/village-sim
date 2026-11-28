// v0.40 energy ladder: finite deposits with remaining and trend, the fuel mix, power stations, brownouts, the stone boat, save round trip
const { loadSim, loadCheckpoint } = require('./lib'); const S = loadSim('World,CFG,EN,energyDay,fuelMix,heatNeed,winterWood,burnFuel,powerCount,depositInfo,depositText,energyText,energyRules,respond,RESPONSES,serializeWorld,deserializeWorld,matOk,DISC,landRegions,planPower,stoneLeft,openConcerns,initConcerns,placeBuilding,FEAT');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
const days = (w, n) => { for (let i = 0; i < 1200 * n; i++) w.step() };
const mk = () => loadCheckpoint(S, 'lake765_y7');
// --- deposits are seeded from the map: the same seed gives the same seams, and they are finite
const a = new S.World(12, { map: 'island' }), b = new S.World(12, { map: 'island' }); const Ea = S.EN(a), Eb = S.EN(b);
ok(Ea.coal.total === Eb.coal.total && Ea.oil.total === Eb.oil.total && Ea.peat.total === Eb.peat.total, 'the same seed gives the same seams');
ok(Ea.coal.total >= 3500 && Ea.oil.total >= 1800 && Ea.stone.start > 0, `seams and stone exist: coal ${Ea.coal.total} oil ${Ea.oil.total} stone ${Ea.stone.start}`);
// --- without coal or power the winter burns only wood
const w = mk(); w.tech.known.mining = 1; const E = S.EN(w); E.coal.stock = 0; E.peat.stock = 0; E.sup = 0;
let m = S.fuelMix(w); ok(m.wood === m.H && m.coal === 0 && m.peat === 0 && m.elec === 0, 'bare ladder: all heat from wood ' + JSON.stringify(m));
ok(S.winterWood(w) === m.wood, 'winterWood is the wood left over');
// --- coal in the stores saves wood, no more than half of the heat
E.coal.stock = 500; m = S.fuelMix(w); ok(m.wood < m.H && m.coal > 0 && m.coal * 2.5 <= m.H * 0.5 + 1e-6, `coal takes up to half the heat: wood ${m.wood} of ${m.H}, coal ${m.coal.toFixed(1)}`);
const stockBefore = E.coal.stock; w.stock.wood = 9999; const need = S.burnFuel(w); ok(E.coal.stock < stockBefore && need === m.wood, 'burning takes the coal from the pile and returns the wood still needed');
// --- mining works only when coal is known, follows need, and the seam only falls
const w2 = mk(); const E2 = S.EN(w2); w2.tech.known.mining = 1; E2.coal.stock = 0; S.DISC(w2).mats.coal = 1; ok(S.matOk(w2, 'coal'), 'coal is found');
let last = E2.coal.left; let mono = true; for (let d = 0; d < 60; d++) { w2.tick += 1200; S.energyDay(w2); if (E2.coal.left > last + 1e-9) mono = false; last = E2.coal.left }
ok(mono && E2.coal.left < E2.coal.total && E2.coal.stock > 0 && E2.coal.left >= 0, `the seam falls and the pile grows: left ${E2.coal.left.toFixed(0)} of ${E2.coal.total}, stock ${E2.coal.stock.toFixed(0)}`);
const w3 = mk(); const E3 = S.EN(w3); w3.tech.known.mining = 0; for (let d = 0; d < 20; d++) { w3.tick += 1200; S.energyDay(w3) } ok(E3.coal.left === E3.coal.total, 'no mining without the technology');
// --- the trend and the text
w2.tick += 1200 * ((4 - w2.day % 4) % 4); for (let d = 0; d < 40; d++) { w2.tick += 1200; S.energyDay(w2) }
const info = S.depositInfo(w2).find(x => x.id === 'coal'); ok(info && info.trend <= 0 && /Coal left in the ground: \d+ \(\d+% of what there was\)/.test(S.depositText(w2, 'coal')), 'text names what is left and the pace: ' + S.depositText(w2, 'coal'));
ok(/Winter heat: \d+% wood/.test(S.energyText(w2)), 'energy text: ' + S.energyText(w2));
// --- power stations: two stations, no fuel -> a brownout, slower work, a concern first (never a hardship at once)
const w4 = mk(); const E4 = S.EN(w4); w4.tech.known.electricity = 1; w4.tech.known.mining = 1; E4.coal.stock = 0; E4.oil.stock = 0; E4.coal.left = 0; E4.oil.left = 0;
const spots = []; for (let y = 3; y < 100 && spots.length < 2; y += 6) for (let x = 3; x < 150 && spots.length < 2; x += 9) if (!w4.bmap[y * S.CFG.W + x]) spots.push([x, y]);
for (const [x, y] of spots) w4.addBuilding('power', x, y); ok(S.powerCount(w4) === 2, 'two stations stand');
const v = w4.vills.find(q => q.isAdult()); const base = v.wt(100); for (let d = 0; d < 5; d++) { w4.tick += 1200; S.energyDay(w4) }
ok(E4.sup === 0 && E4.brown === 1 && E4.shortDays >= 5, 'no fuel: no power ' + JSON.stringify({ sup: E4.sup, brown: E4.brown }));
const slow = v.wt(100); ok(slow > base && slow <= Math.round(base * 1.13), `a brownout slows work by at most 12%: ${base} -> ${slow}`);
let found = []; S.energyRules(w4, null, found); ok(found.length === 1 && found[0].key === 'power' && found[0].sev === 1 && found[0].fix.includes('prospect'), 'a concern is raised, not yet serious');
E4.shortDays = S.CFG.DPS * 4 * 3; found = []; S.energyRules(w4, null, found); ok(found[0].sev === 2, 'ignored for years it turns serious');
// power on: coverage heats part of the village; renewables make power without fuel
const w5 = mk(); const E5 = S.EN(w5); w5.tech.known.electricity = 1; w5.tech.known.renewables = 1; w5.addBuilding('power', 5, 5); w5.tick += 1200; S.energyDay(w5);
ok(E5.sup === 1 && E5.brown === 0, 'wind and water need no fuel'); m = S.fuelMix(w5); ok(m.elec > 0 && m.wood < m.H, `power takes part of the heat: elec ${m.elec.toFixed(1)} of ${m.H}`);
// --- the stone boat: when the home quarries are spent, a boat fetches stone from another island, and that stone is finite too
const w6 = loadCheckpoint(S, 'isl555_d200'); const E6 = S.EN(w6); const reg = S.landRegions(w6), home = reg.label[w6.cy * S.CFG.W + w6.cx]; let far0 = 0;
for (let i = 0; i < w6.feat.length; i++) if (w6.feat[i] === S.FEAT.STONE) { if (reg.label[i] === home) w6.res[i] = 0; else far0 += w6.res[i] }
Object.defineProperty(w6, 'season', { get: () => 1, configurable: true }); w6.stock.stone = 0; E6.stone.start = 500; E6.stone.left = 0; E6.nextRun = 0; w6.tick += 1200 * 30; S.energyDay(w6);
let far1 = 0; for (let i = 0; i < w6.feat.length; i++) if (w6.feat[i] === S.FEAT.STONE && reg.label[i] !== home) far1 += w6.res[i];
ok(far0 > 0, 'there is stone on another island: ' + far0);
ok(E6.runs >= 1 && w6.stock.stone > 0 && far1 < far0 && far0 - far1 === E6.ran, `a boat fetches stone and the far quarry shrinks by what it took: runs ${E6.runs}, stone ${w6.stock.stone}, far ${far0} -> ${far1}`);
// --- prospecting reopens a spent seam, at most three times
const w7 = mk(); const E7 = S.EN(w7); w7.tech.known.mining = 1; S.DISC(w7).mats.coal = 1; E7.coal.left = E7.coal.total * 0.2; const t0 = E7.coal.total;
S.initConcerns(w7); ok(S.respond(w7, 'prospect', 'power'), 'the prospect response can be ordered'); ok(E7.prospect > w7.day, 'prospectors are out'); w7.tick += 1200 * (E7.prospect - w7.day); S.energyDay(w7);
ok(E7.coal.total > t0 && E7.finds === 1, 'a new face is opened: ' + t0 + ' -> ' + E7.coal.total);
// --- the save keeps it
const w8 = mk(); S.EN(w8).coal.left = 321; S.EN(w8).runs = 4; const r = S.deserializeWorld(JSON.parse(JSON.stringify(S.serializeWorld(w8))));
ok(r.energy && r.energy.coal.left === 321 && r.energy.runs === 4, 'energy survives a save and load');
console.log(fail ? 'FAILED ' + fail : 'energy_ladder ok'); process.exit(fail ? 1 : 0);
