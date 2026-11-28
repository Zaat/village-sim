/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   energy.js (v0.40): finite deposits and the energy ladder.

   Stone, coal, oil and peat are no longer endless. Each has a remaining amount
   (stone is counted from the rock tiles themselves; coal, oil and peat are
   seams seeded from the map seed) and the Resources card shows what is left and
   which way it is going. Heat for the winter comes down a ladder:
     wood  ->  peat and coal (once the village can cut and mine them)  ->  power
   Power stations are real, modest buildings (about one per district at most,
   each good for a few score of people). They burn coal or oil, or nothing once
   wind and water are known. A station short of fuel makes less power; the
   village slows a little (never more than 12 percent) and raises a concern
   first. Only if the shortage is ignored for years does heating fall back
   on wood hard enough to hurt.

   State: w.energy = { coal, oil, peat: { total, left, stock }, stone: { start, left },
   hist: [ {d, coal, oil, peat, stone} ], sup, brown, shortDays, runs, ran, prospect, finds }
   Nothing here draws random numbers: seams come from discHash, and the finds
   a prospecting party makes come from it too.
   ========================================================================== */
const ENERGY = { heat: { coal: 2.5, peat: 0.7 }, share: { elec: 0.5, coal: 0.5, peat: 0.2 }, perStation: 140, burn: { coal: 0.5, oil: 0.3 }, stoneRun: 10, histEvery: 4, histKeep: 40 };
Object.assign(CFG.COST, { power: { wood: 30, stone: 40 } }); Object.assign(CFG.BUILD_TIME, { power: 260 }); Object.assign(CFG.SIZE, { power: [3, 2] }); Object.assign(CFG.SOLID, { power: true });

const DEP_NAMES = { stone: 'Stone', coal: 'Coal', oil: 'Oil', peat: 'Peat' };
/* the stone in the ground the villagers can walk to (the home landmass); stone on other land is fetched by boat */
function stoneLeft(w) { let s = 0; const f = w.feat, r = w.res, reg = landRegions(w), home = reg.label[w.cy * CFG.W + w.cx], L = reg.label; for (let i = 0; i < f.length; i++) if (f[i] === FEAT.STONE && L[i] === home) s += r[i]; return s }
/* peat lies in the wet ground round the water: grass beside shallows */
function peatBog(w) {
  const { W, H } = CFG; let n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (w.terr[i] !== TERR.GRASS) continue; if (w.terr[i - 1] === TERR.SHALLOW || w.terr[i + 1] === TERR.SHALLOW || w.terr[i - W] === TERR.SHALLOW || w.terr[i + W] === TERR.SHALLOW) n++ }
  return n;
}
function initEnergy(w) {
  const sc = Math.max(0.6, Math.min(3, CFG.W * CFG.H / 17920));                          // bigger maps hold bigger seams (the standard map is 160 x 112)
  const seam = (k, base, spread) => { const t = Math.round((base + (discHash(w, k) % spread)) * sc); return { total: t, left: t, stock: 0 } };
  const bog = Math.round(Math.min(6000 * sc, peatBog(w) * 30)), s0 = stoneLeft(w);
  return { coal: seam(41, 6000, 4000), oil: seam(43, 3000, 2500), peat: { total: bog, left: bog, stock: 0 }, stone: { start: s0, left: s0 }, hist: [], sup: 0, brown: 0, shortDays: 0, runs: 0, ran: 0, prospect: 0, finds: 0, stonePer: 0 };
}
const EN = w => w.energy || (w.energy = initEnergy(w));

/* ---- the winter's heat and where it comes from ------------------------------ */
const powerCount = w => w.of('power').length;
const powerCover = w => { const n = powerCount(w); return n && w.pop ? Math.min(1, n * ENERGY.perStation / w.pop) : 0 };
/* the heat a winter day needs, in firewood-equivalents (before the ladder) */
function heatNeed(w) {
  return Math.ceil((w.pop * 0.22 + w.houses().length * 0.5 + 1) * (w.harsh ? 1.8 : 1) * (w.settings.survival ? 1.4 : 1) * (1 - 0.1 * styleNow(w)) * fuelFx(w) * hardOf(w).cold);
}
/* what a winter day burns, from the stores as they stand: power first, then coal, then peat, and wood for the rest. Changes nothing. */
function fuelMix(w) {
  const E = EN(w), H = heatNeed(w); let left = H, elec = 0, coal = 0, peat = 0;
  if (w.has('electricity') && E.sup > 0 && powerCount(w)) { elec = Math.min(left, H * ENERGY.share.elec * powerCover(w) * E.sup); left -= elec }
  if (E.coal.stock > 0) { coal = Math.min(E.coal.stock, (left * ENERGY.share.coal) / ENERGY.heat.coal); left -= coal * ENERGY.heat.coal }
  if (E.peat.stock > 0) { peat = Math.min(E.peat.stock, (left * ENERGY.share.peat) / ENERGY.heat.peat); left -= peat * ENERGY.heat.peat }
  return { H, wood: Math.max(0, Math.ceil(left - 1e-9)), elec, coal, peat };
}
/* the winter burn of one day: takes the coal and peat out of the stores and says how much wood is still needed */
function burnFuel(w) {
  const E = EN(w), m = fuelMix(w); E.coal.stock = Math.max(0, E.coal.stock - m.coal); E.peat.stock = Math.max(0, E.peat.stock - m.peat);
  E.lastMix = { H: m.H, wood: m.wood, coal: Math.round(m.coal * ENERGY.heat.coal), peat: Math.round(m.peat * ENERGY.heat.peat), elec: Math.round(m.elec) };
  return m.wood;
}
/* shares of the winter's heat, for the Resources card */
function heatShares(w) {
  const m = fuelMix(w), H = Math.max(1, m.H), c = Math.round(100 * m.coal * ENERGY.heat.coal / H), p = Math.round(100 * m.peat * ENERGY.heat.peat / H), e = Math.round(100 * m.elec / H);
  return { wood: Math.max(0, 100 - c - p - e), coal: c, peat: p, elec: e };
}

/* ---- the daily work -------------------------------------------------------------- */
const matReady = (w, k) => k === 'coal' ? w.has('mining') && matOk(w, 'coal') : k === 'oil' ? w.has('electricity') && matOk(w, 'oil') && powerCount(w) > 0 : k === 'peat' ? w.has('tools') && EN(w).peat.total > 0 : false;
function dig(w, k, target, rate) {
  const d = EN(w)[k]; if (!matReady(w, k) || d.left <= 0 || d.stock >= target) return;
  const q = Math.min(rate, d.left, target - d.stock); d.left -= q; d.stock += q;
}
function energyDay(w) {
  const E = EN(w), n = powerCount(w), pop = w.pop, H = heatNeed(w), ren = w.has('renewables');
  /* mining follows need: a winter's coal and peat, and a few weeks for the stations */
  dig(w, 'coal', H * CFG.DPS * ENERGY.share.coal / ENERGY.heat.coal + (ren ? 0 : n * ENERGY.burn.coal * 24), 0.4 + pop * 0.012);
  dig(w, 'peat', H * CFG.DPS * ENERGY.share.peat / ENERGY.heat.peat, 0.3 + pop * 0.01);
  dig(w, 'oil', ren ? 0 : n * ENERGY.burn.oil * 24, 0.3 + pop * 0.006);
  /* the stations */
  if (!n) { E.sup = 0; E.brown = 0; E.shortDays = 0 }
  else if (ren) { E.sup = 1; E.brown = 0; E.shortDays = 0 }
  else {
    const fc = Math.min(1, E.coal.stock / (n * ENERGY.burn.coal)); E.coal.stock = Math.max(0, E.coal.stock - fc * n * ENERGY.burn.coal);
    const fo = Math.min(1 - fc, E.oil.stock / (n * ENERGY.burn.oil)); E.oil.stock = Math.max(0, E.oil.stock - fo * n * ENERGY.burn.oil);
    E.sup = Math.min(1, fc + fo); E.brown = 1 - E.sup; E.shortDays = E.brown > 0.05 ? E.shortDays + 1 : 0;
  }
  /* stone: counted from the rock; when the quarries thin out and the stores are short, a boat fetches a load from a far shore */
  E.stone.left = stoneLeft(w);
  if (w.day % ENERGY.histEvery === 0) {
    E.hist.push({ d: w.day, coal: Math.round(E.coal.left), oil: Math.round(E.oil.left), peat: Math.round(E.peat.left), stone: E.stone.left }); if (E.hist.length > ENERGY.histKeep) E.hist.shift();
  }
  stoneRun(w, E);
  if (E.prospect && w.day >= E.prospect) prospectDone(w, E);
}
/* the quarries on other land: stone that a party can land and carry to a boat (within RUN_REACH tiles of water a boat can sail to), found by the same water search the timber runs use */
const RUN_REACH = 10;
function stoneRunSite(w, boat) {
  const { W, H } = CFG, reg = landRegions(w), home = reg.label[w.cy * W + w.cx], cand = []; let any = 0;
  for (let i = 0; i < w.feat.length; i++) if (w.feat[i] === FEAT.STONE && w.res[i] > 0 && reg.label[i] !== home) cand.push(i);
  if (!cand.length) return null;
  const mask = new Uint8Array(W * H); for (const i of cand) { const x = i % W, y = (i / W) | 0; for (let dy = -RUN_REACH; dy <= RUN_REACH; dy++) for (let dx = -RUN_REACH; dx <= RUN_REACH; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && dx * dx + dy * dy <= RUN_REACH * RUN_REACH) { mask[ny * W + nx] = 1; any++ } } }
  const path = waterRoute(w, Math.floor(boat.my) * W + Math.floor(boat.mx), (x, y) => mask[y * W + x] === 1); if (!path) return null;
  const end = path[path.length - 1], ex = end % W, ey = (end / W) | 0; cand.sort((a, b) => Math.hypot(a % W - ex, (a / W | 0) - ey) - Math.hypot(b % W - ex, (b / W | 0) - ey)); return { cand, len: path.length };
}
function stoneRun(w, E) {
  if (w.day < (E.nextRun || 0) || w.season === 3 || !w.has('boats') || E.stone.left > E.stone.start * 0.2 || w.stock.stone >= w.capOf('stone') * 0.35) return;
  const boat = w.boats.find(b => b.crew == null && b.state === 'moored' && !b.noSea && w.buildings.get(b.dock)); E.nextRun = w.day + ENERGY.stoneRun; if (!boat) { E.runWhy = w.boats.length ? 'every boat is busy' : 'no boat'; return }
  const site = stoneRunSite(w, boat); if (!site) { E.runWhy = 'no stone within reach of the water'; E.nextRun = w.day + ENERGY.stoneRun * 3; return } E.runWhy = '';
  let load = Math.max(6, Math.round(shipOf(boat).cap * 0.7)), got = 0; for (const i of site.cand) { if (got >= load) break; const t = Math.min(load - got, w.res[i]); w.res[i] -= t; got += t; if (w.res[i] <= 0) w.clearTile(i) }        // the far quarries are finite too
  load = got; w.stock.stone = Math.min(w.capOf('stone'), w.stock.stone + load); E.runs++; E.ran += load;
  if (E.runs === 1 || E.runs % 6 === 0) w.emit('energy', E.runs === 1 ? 'The nearby quarries are running thin. A boat brings back a load of stone from a far shore.' : `Boats have fetched ${E.ran} stone from far shores.`, { kind: 'stonerun' });
}
/* a prospecting party comes back: old seams that are known may open a new face (at most three times a game) */
function prospectDone(w, E) {
  E.prospect = 0; const got = [];
  for (const k of ['coal', 'oil', 'peat']) { const d = E[k]; if (E.finds < 3 && d.total > 0 && (k === 'peat' || matOk(w, k)) && d.left < d.total * 0.6) { const add = Math.round(d.total * 0.25); d.total += add; d.left += add; E.finds++; got.push(DEP_NAMES[k].toLowerCase()) } }
  w.emit('council', got.length ? `The prospectors return: a new face is opened in the ${got.join(' and ')} workings.` : 'The prospectors return with nothing new: the known deposits are all there is.', {});
}

/* ---- power stations ----------------------------------------------------------------- */
function powerScore(w, x, y, d) { const v = typeof lvAt === 'function' ? lvAt(w, x, y) : -1, rel = v > 0 && w.city ? v / w.city.vmax : 0.5; return Math.abs(d - 13) + Math.abs(rel - 0.4) * 12 + w.r() * 2 }
function planPower(w) {
  if (!w.has('electricity') || w.pop < 90 || w.stock.wood < 50 || w.stock.stone < 40 || w.bps.some(b => b.type === 'power')) return;
  const dist = typeof districtsView === 'function' ? districtsView(w).list.length : 1, want = Math.max(1, Math.min(dist, Math.ceil(w.pop / ENERGY.perStation)));
  if (powerCount(w) >= want) return;
  if (!w.has('renewables') && !(matOk(w, 'coal') && EN(w).coal.left > 30) && !(matOk(w, 'oil') && EN(w).oil.left > 30)) return;       // nothing to burn yet
  placeBuilding(w, 'power');
}

/* ---- what people read ---------------------------------------------------------------- */
/* the deposits in play, with what is left and which way it is going (units per day, negative when falling) */
function depositInfo(w) {
  const E = EN(w), out = [];
  const trendOf = k => { const h = E.hist; if (h.length < 2) return 0; const a = h[Math.max(0, h.length - 6)], b = h[h.length - 1]; return b.d > a.d ? (b[k] - a[k]) / (b.d - a.d) : 0 };
  out.push({ id: 'stone', name: 'Stone', left: E.stone.left, total: E.stone.start, trend: trendOf('stone'), stock: Math.floor(w.stock.stone) });
  if (matReady(w, 'coal') || E.coal.left < E.coal.total) out.push({ id: 'coal', name: 'Coal', left: Math.round(E.coal.left), total: E.coal.total, trend: trendOf('coal'), stock: Math.round(E.coal.stock) });
  if (matReady(w, 'oil') || E.oil.left < E.oil.total) out.push({ id: 'oil', name: 'Oil', left: Math.round(E.oil.left), total: E.oil.total, trend: trendOf('oil'), stock: Math.round(E.oil.stock) });
  if (E.peat.total > 0 && (matReady(w, 'peat') || E.peat.left < E.peat.total)) out.push({ id: 'peat', name: 'Peat', left: Math.round(E.peat.left), total: E.peat.total, trend: trendOf('peat'), stock: Math.round(E.peat.stock) });
  return out;
}
const trendWord = t => t < -0.05 ? 'falling' : t > 0.05 ? 'rising' : 'steady';
function depositText(w, id) {
  const d = depositInfo(w).find(x => x.id === id); if (!d || !d.total) return '';
  const pct = Math.round(100 * d.left / d.total), days = d.trend < -0.05 ? Math.round(d.left / -d.trend) : 0;
  return `${d.name} left in the ground: ${Math.round(d.left)} (${pct}% of what there was), ${trendWord(d.trend)}${days && days < CFG.DPS * 4 * 40 ? `; about ${(days / (CFG.DPS * 4)).toFixed(1)} years at this pace` : ''}.`;
}
function energyText(w) {
  const E = EN(w), sh = heatShares(w), bits = [`Winter heat: ${sh.wood}% wood`]; if (sh.coal) bits.push(`${sh.coal}% coal`); if (sh.peat) bits.push(`${sh.peat}% peat`); if (sh.elec) bits.push(`${sh.elec}% power`);
  const n = powerCount(w); return bits.join(', ') + '.' + (n ? ` ${n} power station${n > 1 ? 's' : ''}${E.brown > 0.05 ? `, making ${Math.round(E.sup * 100)}% of the power they could` : ''}.` : '');
}

/* ---- concerns ----------------------------------------------------------------------- */
function energyRules(w, C, found) {
  const E = EN(w), n = powerCount(w), yr = CFG.DPS * 4;
  if (n && E.shortDays >= 3) {
    found.push({ key: 'power', sev: E.shortDays > yr * 2 ? 2 : 1, text: `The power station${n > 1 ? 's are' : ' is'} short of fuel and make${n > 1 ? '' : 's'} ${Math.round(E.sup * 100)}% of the power they could.`,
      why: `${Math.round(E.coal.left)} coal and ${Math.round(E.oil.left)} oil are left in the ground; the village works a little slower while the power is short${E.shortDays > yr ? ', and the shortage has gone on for more than a year' : ''}.`, m: { v: E.sup, ok: 1, bad: 0.3 }, fix: ['prospect', 'nudge_work'] });
  }
  const s = E.stone; if (s.start > 0 && s.left < s.start * 0.25 && w.stock.stone < w.capOf('stone') * 0.3 && w.pop >= 30) {
    found.push({ key: 'stone', sev: 1, text: `Only ${s.left} stone is left in the rock round the village, ${Math.round(100 * s.left / s.start)}% of what there was.`,
      why: w.has('boats') ? (E.runs ? `Boats have fetched ${E.ran} stone from far shores.` : '') + (E.runWhy ? ` No stone run now: ${E.runWhy}.` : '') || 'Boats can fetch stone from other shores.' : 'With no boats the village cannot fetch stone from far away.', m: { v: s.left, ok: s.start * 0.25, bad: 0 }, fix: ['nudge_work'] });
  }
}
