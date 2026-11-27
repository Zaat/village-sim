/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   timber.js (v0.37): wood from far shores.

   A village on islands or round a lake can use up the trees it can walk to
   while whole forests stand across the water. When a woodcutter finds no
   tree within reach and the stores are short, a villager now takes a free
   boat to the nearest shore with trees, fells a boatload there, and sails
   home. The trip is a real job (dock, provisioning, sailing, felling, mooring,
   carrying to the store), so a boat that is busy cannot go, and a trip is
   dropped if the villager is called away.

   The state is small: w.timber = { next, runs, wood, lost, none, last, why }.
   `why` says what stopped the last attempt, so the firewood concern can name
   the reason ("no boat", "no shore with trees in reach").
   Nothing here draws random numbers except the sea loss roll (disasters on).
   ========================================================================== */
const TIMBER = { minTrees: 5, landing: 3, speed: 0.07, fell: 110, cooldown: 6 };
const TM = w => w.timber || (w.timber = { next: 0, runs: 0, wood: 0, lost: 0, none: 0, last: null, why: '' });
const isTimber = (w, i) => { const f = w.feat[i]; return (f === FEAT.OAK || f === FEAT.PINE) && w.res[i] >= 3 };
function timberAround(w, x, y, r) {
  let n = 0; for (let yy = Math.max(0, y - r); yy <= Math.min(CFG.H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(CFG.W - 1, x + r); xx++) if (isTimber(w, yy * CFG.W + xx)) n++;
  return n;
}
/* the shore a boat could fetch timber from: the nearest water tile with enough trees beside it, away from where the woodcutters already go */
function timberPath(w, boat) {
  const start = Math.floor(boat.my) * CFG.W + Math.floor(boat.mx);
  return waterRoute(w, start, (x, y) => Math.hypot(x - w.cx, y - w.cy) > 9 && timberAround(w, x, y, 2) >= TIMBER.minTrees);
}
/* a woodcutter with no tree in reach: can a boat help? Returns true when the villager has been given the trip. */
function timberStart(w, v) {
  const t = TM(w);
  if (!w.has('boats') || w.season === 3 || w.day < t.next || !v.isAdult() || v.age >= 56 || v.energy < 45) return false;
  if (w.stock.wood >= Math.max(w.pop * 3, fuelWant(w, 0.9))) return false;               // well supplied: no need
  const boats = w.boats.filter(b => b.crew == null && b.state === 'moored' && !b.noSea && w.buildings.get(b.dock)).sort((a, b) => shipOf(b).cap - shipOf(a).cap);
  if (!boats.length) { t.why = w.boats.length ? 'every boat is busy' : 'no boat'; t.next = w.day + TIMBER.cooldown; return false }
  let boat = null, path = null; for (const b of boats) { const p = timberPath(w, b); if (p) { boat = b; path = p; break } }
  if (!path) { t.why = 'no shore with trees within reach of the water'; t.none++; t.next = w.day + TIMBER.cooldown * 2; return false }
  const dock = w.buildings.get(boat.dock), { W } = CFG, len = path.length, trip = Math.ceil(len / shipOf(boat).speed), end = path[len - 1], ex = end % W, ey = (end / W) | 0;
  const load = Math.max(8, Math.round(shipOf(boat).cap * (1 + 0.4 * techFx(w, 'sea')))), at = p => { const c = path[Math.min(len - 1, Math.floor(p * len))]; if (v.hunger < 45) v.hunger = 45; if (v.energy < 40) v.energy = 40; boat.x = (c % W) + 0.5; boat.y = ((c / W) | 0) + 0.5; v.x = boat.x; v.y = boat.y; const nx = path[Math.min(len - 1, Math.floor(p * len) + 1)]; if (nx !== undefined && nx % W !== c % W) { v.dir = nx % W > c % W ? 1 : -1; boat.dir = v.dir } };
  boat.crew = v.id; v.boat = boat; v.jobKind = 'timber'; v.inb = { kind: 'wood', amt: load }; w.inbound.wood += load; t.why = ''; t.last = { day: w.day, load, len };
  v.steps = [go((x, y) => x === dock.x && y === dock.y, null, 'To the dock', { maxCost: 120, check: () => boat.crew === v.id }), work(30, 'Provisioning the boat', () => { boat.state = 'out'; v.x = boat.x; v.y = boat.y }),
    work(trip, 'Sailing to a wooded shore', null, { onTick: at }),
    work(Math.max(40, Math.round(load * 4)), 'Felling timber on the far shore', () => { v.carry = { kind: 'wood', amt: timberFell(w, ex, ey, load) }; if (v.carry.amt <= 0) v.carry = null }),
    work(1, 'Setting course for home', () => { if (w.settings.disasters && w.r() < 0.006 + 0.0003 * len) { v.health = 0; v.cause = 'sea'; t.lost++; w.emit('timber', `${v.name} was lost at sea with a boatload of timber.`, { lost: true }) } }),
    work(trip, 'Sailing home with the timber', null, { onTick: p => at(1 - p) }), work(10, 'Mooring the boat', () => { v.x = dock.x + 0.5; v.y = dock.y + 0.5; boat.home(); v.boat = null; if (v.carry) { t.runs++; t.wood += v.carry.amt; w.emit('timber', `${v.name} brings ${v.carry.amt} loads of timber across the water.`, { wood: v.carry.amt }); statCount(w, 'timber_wood', v.carry.amt) } }),
    ...v.deliverSteps('wood')];
  return true;
}
/* fell trees round the landing until the boat is full; the stumps regrow like any others */
function timberFell(w, x, y, load) {
  const R = TIMBER.landing, list = []; for (let yy = Math.max(0, y - R); yy <= Math.min(CFG.H - 1, y + R); yy++) for (let xx = Math.max(0, x - R); xx <= Math.min(CFG.W - 1, x + R); xx++) { const i = yy * CFG.W + xx; if (isTimber(w, i)) list.push([Math.hypot(xx - x, yy - y), i]) }
  list.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let got = 0;
  for (const [, i] of list) {
    if (got >= load) break; const take = Math.min(load - got, w.res[i]); w.res[i] -= take; got += take;
    if (w.res[i] > 0) { if (!w.young.includes(i)) w.young.push(i) }
    else { const kindF = w.feat[i]; w.clearTile(i); if (w.r() < (w.has('forestry') ? 0.9 : 0.5)) w.regrow.push({ idx: i, at: w.tick + CFG.TPD * (w.has('forestry') ? 2 : 4), tree: kindF }) }
  }
  return got;
}

/* once a day: when timber runs are held up only because every boat is out, the harbour adds a boat (a berth must be free) */
function timberDay(w) {
  const t = TM(w); if (t.why !== 'every boat is busy' || w.day < (t.boatNext || 0) || w.season === 3) return;
  t.boatNext = w.day + 6;
  if (w.stock.wood >= fuelWant(w, 0.9) || w.stock.wood < 14 || !w.has('boats')) return;
  const d = w.of('dock').find(k => w.boats.filter(b => b.dock === k.id).length < berths(w, k)); if (!d) { t.why = 'every boat is busy and the docks have no free berth'; return }
  w.stock.wood -= 12; const b = addBoat(w, d, 'fishing'); t.boats = (t.boats || 0) + 1; w.emit('timber', 'Another boat is launched to fetch timber from the far shores.', { boat: b.id, built: true });
}
