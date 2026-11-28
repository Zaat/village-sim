/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
/* ===== economy.js: what the crowd's work yields (v0.37) =====
   The crowd is the same kind of people as the villagers in play, counted instead of followed, so what a crowd worker
   produces comes from the same things that decide what a villager produces, not from a free number:
   - FOOD comes from FIELDS. A field gives what a villager's harvest gives (FARM_YIELD, the plough, rotation, every farming
     technology, the hardship level) by the season the villagers measured: nothing in spring, most in summer and autumn,
     a little in winter. A worker can tend about three fields at once (a field needs a sowing and a harvest visit and idles
     while it grows), so food is limited by the number of fields first and by hands second. The planner builds fields for
     the crowd's mouths at that yield, so better farming means fewer fields per person, not more food from nowhere.
   - WOOD and STONE come from TRIPS. A trip is a walk to the nearest standing trees or rock, the cutting, and the walk back,
     exactly the villager's job. How far the nearest trees are from a store or camp decides the yield, so a forest that is cut
     back, a camp built in the wood, a road or a better axe all change it. The crowd fells the trees it uses.
   - HANDS go where the town's need is largest: mouths first, then firewood and building, then stone. What is left over serves.
   Everything is derived each day from the world, with no random numbers (felling uses the crowd's own stream). */
const ECON = { work: 700, eff: 0.45, fieldYear: 41, profile: [0.1, 1.5, 1.95, 0.5], fieldTicks: 91, load: 4, near: 120, speed: 0.11, trip: 10 };
ECON.fph = ECON.work * ECON.eff / ECON.fieldTicks;                       // fields one worker can keep: the day's usable work over the work one field needs each day
const fieldMult = w => (w.has('rotation') ? 1.25 : 1) * (w.has('plow') ? 1.25 : 1) * (1 + techFx(w, 'farm')) * hardOf(w).crop * (w.settings.survival ? 0.75 : 1);
const fieldMean = w => ECON.fieldYear / CFG.DPS / 4 * fieldMult(w);       // food a field gives per day over a whole year
const fieldDay = w => ECON.fieldYear / CFG.DPS / 4 * ECON.profile[w.season] * fieldMult(w) * (w.drought ? 0.6 : 1);
/* the fields the villagers in play work (as the planner has always sized them), and the rest, which the crowd tends */
const focusFarms = w => { const n = w.vills.length; return Math.min(30 + Math.max(0, Math.floor((n - 130) / (CFG.FARM_SLOPE || 5))), Math.ceil((n + 1) / (3.2 / (1 + 0.15 * lesson(w, 'famine'))))) };
const crowdFields = w => Math.max(0, w.of('farm').length - focusFarms(w));
const crowdEat = C => C.kids * 0.5 + (C.adults + C.elders) * 0.85;
/* how many fields the town should have: the villagers' as before, plus enough for the crowd's mouths at this age's yield */
function farmsWanted(w) {
  const C = w.crowd, base = focusFarms(w); if (!C || C.n <= 0) return base;
  return base + Math.max(0, Math.ceil((crowdEat(C) - (C.fishAvg || 0)) * 0.8 / Math.max(0.3, fieldMean(w))));       // what the sea already gives needs no field
}
/* the nearest workable trees (or rock) and how far they are from the nearest store or camp: { d: mean walk in tiles, list: tile indices, nearCamp: share within reach of a camp } */
function gatherReach(w, kind) {
  const { W, H } = CFG, campType = kind === 'wood' ? 'logcamp' : 'minecamp', dep = [], camps = [];
  for (const b of w.buildings.values()) { if (b.type === 'store') dep.push([b.x + 1, b.y + 1]); else if (b.type === campType) { dep.push([b.x + 1, b.y + 1]); camps.push([b.x + 1, b.y + 1]) } }
  if (!dep.length) dep.push([w.cx, w.cy]);
  const found = [];
  for (let i = 0; i < W * H; i++) {
    const f = w.feat[i]; if (kind === 'wood' ? (f !== FEAT.OAK && f !== FEAT.PINE) || w.res[i] < 3 : f !== FEAT.STONE || w.res[i] < 1) continue;
    const x = i % W, y = (i / W) | 0; let e2 = 1e18; for (const p of dep) { const dx = p[0] - x, dy = p[1] - y, e = dx * dx + dy * dy; if (e < e2) e2 = e } found.push([Math.sqrt(e2), i]);       // squared distances in the loop (v0.40: the day-change cost)
  }
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const k = Math.min(found.length, ECON.near), list = found.slice(0, k);
  let s = 0, nc = 0; for (const [d, i] of list) { s += d; const x = i % W, y = (i / W) | 0; if (camps.some(p => Math.hypot(p[0] - x, p[1] - y) <= 14)) nc++ }
  return { d: k ? s / k : 0, list: list.map(a => a[1]), n: found.length, nearCamp: k ? nc / k : 0 };
}
/* what one crowd worker brings home in a day: trips a day times the load, from the walk and the cutting time */
function handYield(w, kind, R) {
  if (!R.list.length) return 0;
  const camp = R.nearCamp, load = (ECON.load + (kind === 'stone' ? 2 * camp : 0)) * (kind === 'wood' ? 1 + 0.25 * camp : 1), base = kind === 'wood' ? 60 : 80;
  const cut = base * 0.95 * (w.has('tools') ? 0.9 : 1) * (w.has('ironwork') ? 0.9 : 1) / (1 + techFx(w, 'work')) * (1 - 0.15 * camp), walk = 2 * R.d * 1.3 / ECON.speed + ECON.trip;
  return ECON.work * ECON.eff / (cut + walk) * load;
}
/* the crowd fells what it uses, nearest first: partly cut trees grow back, felled ones may be replanted (more of them when the forest is thin, because people plant when wood is dear), rock does not return */
function crowdFell(w, kind, amount, R, salt) {
  if (amount <= 0) return 0; const rr = crowdR(w, 900 + salt), bonus = kind === 'wood' ? 1 + 0.25 * R.nearCamp : 1; let left = amount;
  for (const i of R.list) {
    if (left <= 0) break; const f = w.feat[i]; if (kind === 'wood' ? (f !== FEAT.OAK && f !== FEAT.PINE) : f !== FEAT.STONE) continue;
    const take = Math.min(w.res[i], Math.ceil(left / bonus)); if (take <= 0) continue; w.res[i] -= take; left -= take * bonus;
    if (w.res[i] > 0) { if (kind === 'wood' && !w.young.includes(i)) w.young.push(i) }
    else { w.clearTile(i); if (kind === 'wood' && rr() < Math.min(0.97, (w.has('forestry') ? 0.9 : 0.5) + 0.45 * clamp(1 - w.trees / Math.max(1, w.trees0 * 0.8), 0, 1))) w.regrow.push({ idx: i, at: w.tick + CFG.TPD * (w.has('forestry') ? 2 : 4), tree: f }) }
  }
  return amount - Math.max(0, left);
}

/* ----- the sea (v0.37): a crowd fisher works the same water the villagers fish ----------------------------------------
   Fish are counted in every water tile (w.fish) and come back by the water's own rule, so the crowd draws on the real stock.
   A fisher walks to the nearest shore tile from a store or a dock and lands one load per trip, exactly the villager's job;
   boats and nets lift the load. Docks put the water at the door, so the walk is short, and with boats they open the deep water
   near the dock. How many people can fish at once is limited by the shore they can stand on and the boats the docks berth,
   so a coast feeds more people where it has harbours, and a town short of farmland can turn to the sea. Fields come first for
   the bulk of the food (a diet of fish alone is not kept up); the sea supplies a share, and everything the fields cannot give. */
const FISH = { shoreHand: 5, boatsPerDock: 3, crew: 4, seaReach: 9, trip: 100, winter: 0.7, cured: 0.75, share: 0.3, base: 120, perDock: 50, take: 0.08 };       // take: the share of the fish standing in the grounds that can be landed each day without thinning them
function fishReach(w) {
  const key = w.day >> 2; if (w._fishR && w._fishR.key === key) return w._fishR;
  const { W, H } = CFG, dep = [], docks = w.of('dock'), seaOK = w.has('boats') && docks.length; let frontage = 0;
  for (const b of w.buildings.values()) if (b.type === 'store' || b.type === 'dock') dep.push([b.x + 1, b.y + 1]);
  if (!dep.length) dep.push([w.cx, w.cy]);
  const found = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x, t = w.terr[i]; if (t > TERR.SHALLOW) continue;
    let shore = false, sea = false;
    if (t === TERR.SHALLOW) for (const [dx, dy] of NB) { const tt = w.terr[(y + dy) * W + x + dx]; if (tt === TERR.GRASS || tt === TERR.SAND) { shore = true; break } }
    if (seaOK) for (const k of docks) if ((k.x - x) * (k.x - x) + (k.y - y) * (k.y - y) <= FISH.seaReach * FISH.seaReach) { sea = true; break }
    if (!shore && !sea) continue;
    let e2 = 1e18; for (const p of dep) { const dx = p[0] - x, dy = p[1] - y, e = dx * dx + dy * dy; if (e < e2) e2 = e } const d = Math.sqrt(e2);
    if (shore && d <= 60) frontage++;
    if (d <= 70) found.push([d, i]);
  }
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const k = Math.min(found.length, FISH.base + FISH.perDock * docks.length), list = found.slice(0, k); let s = 0; for (const [d] of list) s += d;
  const cap = seaOK ? docks.length * FISH.boatsPerDock * FISH.crew + frontage / FISH.shoreHand * 0.5 : frontage / FISH.shoreHand;
  return (w._fishR = { key, list: list.map(a => a[1]), d: k ? s / k : 0, frontage, cap: k ? cap : 0, docks: docks.length, boats: seaOK ? docks.length * FISH.boatsPerDock : 0 });
}
/* loads one fisher lands in a day, and what a load is worth */
const fishLoad = w => (2 + (w.has('nets') ? 1 : 0) + Math.round(2 * techFx(w, 'sea')) + (w.has('boats') && w.of('dock').length ? 1 : 0)) * FISH.cured;       // a quarter of the catch's work goes to gutting, salting and drying, because fish do not keep
function fishTrips(w, R) {
  if (!R.list.length) return 0;
  const walk = 2 * R.d * 1.3 / ECON.speed + ECON.trip, cast = FISH.trip * (w.has('nets') ? 0.85 : 1) / (1 + techFx(w, 'work'));
  return ECON.work * ECON.eff / (cast + walk) * (w.season === 3 ? FISH.winter : 1);
}
const fishHand = (w, R) => fishTrips(w, R) * fishLoad(w);
/* how many loads the grounds can give in a day: a fixed share of what swims there now, so a fished-out bay gives little until it fills again */
const fishAllow = (w, R) => { let s = 0; for (const i of R.list) s += w.fish[i]; return FISH.take * s };
/* the crowd takes the fish it lands from the nearest water, one tile at a time */
function crowdFish(w, trips) {
  const R = fishReach(w), n = R.list.length; if (trips <= 0 || !n) return 0;
  const rr = crowdR(w, 950); let left = Math.min(trips, fishAllow(w, R)), got = 0, start = (rr() * Math.min(n, 40)) | 0;
  for (let k = 0; k < n && left > 0; k++) { const i = R.list[(start + k) % n], f = w.fish[i]; if (f <= 0) continue; const take = Math.min(f, Math.ceil(left)); w.fish[i] -= take; left -= take; got += take }
  return got;
}
