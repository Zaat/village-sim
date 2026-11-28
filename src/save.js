/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   save.js — snapshot and restore a whole village (no DOM).
   Terrain is regenerated from the seed; everything that changes is stored.
   Jobs in progress are not saved: after loading, villagers simply decide again
   (carried loads and half-finished trips are lost, nothing else).
   ========================================================================== */
const SAVE_VERSION = 1;
function b64enc(u8) {
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
}
function b64dec(str, len) {
  const bin = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary'), u = new Uint8Array(len);
  for (let i = 0; i < len; i++) u[i] = bin.charCodeAt(i); return u;
}
/* run-length coding for the big map arrays (mostly long runs of one value): "R:" + base64 of (value, run) byte pairs */
function packArr(u8) {
  const out = []; let i = 0; while (i < u8.length) { const v = u8[i]; let n = 1; while (i + n < u8.length && u8[i + n] === v && n < 255) n++; out.push(v, n); i += n }
  return 'R:' + b64enc(Uint8Array.from(out));
}
function unpackArr(str, len) {
  if (typeof str !== 'string' || str.slice(0, 2) !== 'R:') return b64dec(str, len);       // older saves stored plain base64
  const bin = typeof atob === 'function' ? atob(str.slice(2)) : Buffer.from(str.slice(2), 'base64').toString('binary'), u = new Uint8Array(len); let p = 0;
  for (let i = 0; i + 1 < bin.length && p < len; i += 2) { const v = bin.charCodeAt(i), n = bin.charCodeAt(i + 1); for (let k = 0; k < n && p < len; k++) u[p++] = v }
  return u;
}
const VILL_KEYS = ['fav', 'strikeUntil', 'char', 'life', 'id', 'sex', 'age', 'name', 'x', 'y', 'look', 'trait', 'skill', 'role', 'hunger', 'energy', 'social', 'health', 'carry', 'label', 'home', 'sleeping', 'preg', 'father', 'lastBirth', 'wait', 'dir', 'family', 'partner', 'kids', 'parentIds', 'mood', 'debates', 'desire', 'nextDesire', 'bio', 'reputation', 'record', 'duty', 'stocksUntil', 'group', 'friends', 'enemies', 'won', 'mournUntil', 'op', 'cause', '_st', 'coins', 'output', 'earned', 'hobby', 'wealth', 'status', 'hobbyDay', 'trade', 'side', 'asp', 'tskill', 'tradeSince', 'inc', 'shop', 'trial'];
const ANIMAL_KEYS = ['id', 'kind', 'x', 'y', 'hp', 'tx', 'ty', 'wait', 'life', 'hunger', 'dir', 'sex', 'moving', 'fleeing'];
const pickKeys = (o, keys) => { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r };

function serializeWorld(w) {
  return {
    v: SAVE_VERSION, appV: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null, lifeV: 2, savedAt: Date.now(), dims: [CFG.W, CFG.H], seed: w.seed, settings: { ...w.settings }, rngState: w.rng.s, tick: w.tick,
    arrays: { feat: packArr(w.feat), res: packArr(w.res), road: packArr(w.road), fish: packArr(w.fish) },
    stock: { ...w.stock }, counters: { nextId: w.nextId, nameUse: w.nameUse, bnext: w.bnext, bpnext: w.bpnext, groupNext: w.groupNext, births: w.births, abirths: w.abirths || 0, deaths: w.deaths, trees: w.trees, trees0: w.trees0 },
    flags: { harsh: w.harsh, drought: w.drought, cold: w.cold, festival: w.festival, holiday: w.holiday, holidayDone: w.holidayDone, meetingDay: w.meetingDay, meetingDone: w.meetingDone, forceFeast: w.forceFeast },
    causes: w.causes, dlog: w.dlog, dyr: w.dyr, regrow: w.regrow, scars: w.scars, banished: w.banished, crimes: w.crimes, crimeLog: w.crimeLog, connected: [...w.connected],
    log: w.log.slice(0, 120), ev: (w.ev && (evTrim(w.ev), w.ev)) || null, hist: w.hist.slice(-600), rel: [...w.rel].map(([k, r]) => [k, Math.round(r * 10) / 10]),
    gov: w.gov, groups: w.groups,
    buildings: [...w.buildings.values()].map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, occ: b.occ, state: b.state, g: b.g, style: b.style || 0, dir: b.dir, proj: b.proj, hp: b.hp, maxHp: b.maxHp, tier: b.tier, upg: b.upg, built: b.built, era: b.era, builtEra: b.builtEra, upgraded: b.upgraded, vh: b.vh, vser: b.vser, vtot: b.vtot, reg: b.reg, catch: b.catch, oh: b.oh, oser: b.oser, otot: b.otot, fert: b.fert, repairs: b.repairs, last: b.last, owner: b.owner, cabin: b.cabin })),
    bps: w.bps.map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, have: b.have, prog: b.prog, target: b.target, toStyle: b.toStyle, dir: b.dir, bridge: b.bridge, player: b.player, cost: b.type === 'bridge' ? b.cost : undefined })),
    regime: w.regime, strife: w.strife, wet: w.wet, flow: w.flow, neigh: w.neigh, voyageCd: w.voyageCd, dip: { fortifyUntil: w.fortifyUntil, dipDay: w.dipDay }, seen: w.seen ? packArr(w.seen) : null,
    tech: w.tech, econ: w.econ, proj: w.proj, chron: w.chron, boats: w.boats.map(b => ({ id: b.id, dock: b.dock, kind: b.kind, hold: b.hold })), trade2: w.trade2 ? { ...w.trade2, active: null } : null, war: w.war ? JSON.parse(JSON.stringify(w.war)) : null, cul: w.cul ? JSON.parse(JSON.stringify(w.cul)) : null, city: w.city ? JSON.parse(JSON.stringify(w.city)) : null,
    over: w.over || null, lowDays: w.lowDays || 0, lastGone: w.lastGone || null,
    play: w.play ? JSON.parse(JSON.stringify(w.play)) : null, crowd: w.crowd ? JSON.parse(JSON.stringify(w.crowd)) : null, alog: w.alog || [], out: w.out ? JSON.parse(JSON.stringify(w.out, (k, v) => k[0] === '_' ? undefined : v)) : null, stats: w.stats || null, concerns: w.concerns ? JSON.parse(JSON.stringify(w.concerns)) : null, liv: w.liv ? JSON.parse(JSON.stringify(w.liv)) : null, lives: w.lives ? JSON.parse(JSON.stringify(w.lives, (k, v) => v instanceof Set ? [...v] : v)) : null, bridges: w.bridges ? JSON.parse(JSON.stringify(w.bridges, (k, v) => k === 'bp' ? undefined : v)) : null,
    terra: w.terra ? JSON.parse(JSON.stringify(w.terra)) : null, disc: w.disc ? JSON.parse(JSON.stringify(w.disc)) : null, timber: w.timber ? { ...w.timber } : null, voices: w.voices ? JSON.parse(JSON.stringify(w.voices)) : null, sandbox: !!w.sandbox,
    vills: w.vills.map(v => pickKeys(v, VILL_KEYS)), animals: w.animals.filter(a => a.alive).map(a => pickKeys(a, ANIMAL_KEYS)),
  };
}

function deserializeWorld(d) {
  if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION || !d.seed === undefined) throw new Error('This is not a compatible Village Sim save.');
  const dims = d.dims || [160, 112]; CFG.W = dims[0]; CFG.H = dims[1];             // older saves are the original 160x112 world
  const N = CFG.W * CFG.H, w = new World(d.seed, d.settings, dims);          // regenerates the same terrain, then we replace the dynamic state
  w.loadedFrom = 'save written by ' + (d.appV ? 'v' + d.appV : 'an older version'); w.vills = []; w.animals = []; w.buildings.clear(); w.bmap.fill(0); w.blk.fill(0); w.storeAdj.fill(0); w.bldAdj.fill(0); for (const k in w.campAdj) w.campAdj[k].fill(0); w.bps = []; w.bpAt.clear(); w.claim.fill(-1);
  w.feat.set(unpackArr(d.arrays.feat, N)); w.res.set(unpackArr(d.arrays.res, N)); w.road.set(unpackArr(d.arrays.road, N)); w.fish.set(unpackArr(d.arrays.fish, N));
  w.tick = d.tick; w.stock = { ...d.stock }; w.inbound = { wood: 0, stone: 0, food: 0 };
  Object.assign(w, d.counters, d.flags); w.causes = d.causes || {}; w.dlog = d.dlog || []; w.dyr = d.dyr || {}; w.regrow = d.regrow || []; w.scars = d.scars || []; w.banished = d.banished || []; w.crimes = d.crimes || []; w.crimeLog = d.crimeLog || [];
  w.connected = new Set(d.connected || []); w.log = d.log || []; if (d.ev && Array.isArray(d.ev.list)) w.ev = d.ev; else evBackfill(w); w.hist = d.hist || []; w.rel = new Map(d.rel || []); w.gov = d.gov; w.groups = d.groups || [];
  for (const s of d.buildings) {
    const b = { ...s, claim: 0 }; w.buildings.set(b.id, b); w._bv = (w._bv | 0) + 1;
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) { const i = (b.y + dy) * CFG.W + b.x + dx; w.bmap[i] = b.id; if (CFG.SOLID[b.type]) w.blk[i] = 1 }
  }
  for (const b of w.buildings.values()) if (CFG.SOLID[b.type]) w.markAdj(b, w.adjFor(b.type));
  for (const s of d.bps) { const bp = makeBp(w, s.type, s.x, s.y, s.type === 'upgrade' ? { target: s.target, toStyle: s.toStyle } : s.type === 'bridge' ? { cost: s.cost, bridge: s.bridge } : s.dir ? { dir: s.dir } : undefined); if (s.proj) { bp.proj = true; bp.maxWorkers = 6 } bp.id = s.id; bp.have = s.have; bp.prog = s.prog; if (s.player) bp.player = true }
  if (d.voices) w.voices = d.voices;
  if (d.play) w.play = d.play;
  if (d.over) w.over = d.over; w.lowDays = d.lowDays || 0; if (d.lastGone) w.lastGone = d.lastGone;
  if (d.econ) w.econ = d.econ; if (d.proj) w.proj = d.proj; if (d.chron) w.chron = d.chron; if (d.regime) { w.regime = d.regime; if (!w.regime.ax) w.regime.ax = defaultAxes() } w.wet = d.wet || 0; if (d.trade2) w.trade2 = d.trade2; else initTrade2(w); if (d.out) w.out = d.out; else initOutposts(w); w.war = d.war || null; w.cul = d.cul || null; w.city = d.city || null; w.crowd = d.crowd || null; w.alog = d.alog || []; if (d.bridges) { w.bridges = d.bridges; restoreBridges(w) } else initBridges(w); if (d.terra) { w.terra = d.terra; restoreTerra(w) } else initTerra(w); if (d.disc) restoreDisc(w, d.disc); else initDisc(w); w.timber = d.timber || null; w.sandbox = !!d.sandbox || !!(w.settings && w.settings.openKnowledge); if (d.stats) { w.stats = d.stats; statsEnsure(w.stats) } else initStats(w); if (d.concerns) w.concerns = d.concerns; else initConcerns(w); if (d.liv) w.liv = d.liv; else initLiv(w); if (d.lives) { w.lives = d.lives; for (const f of w.lives.feuds) { f.ka = new Set(f.ka); f.kb = new Set(f.kb) } } else initLives(w); w.flow = d.flow || null; w.young = []; for (let i = 0; i < w.feat.length; i++) if ((w.feat[i] === FEAT.OAK || w.feat[i] === FEAT.PINE) && w.res[i] > 0 && w.res[i] < 4) w.young.push(i);
  w.rx = rxBuildings(w, rxFrom(w.regime.ax)); if (d.strife) w.strife = d.strife; else initStrife(w);
  if (d.neigh && w.neigh) { w.neigh = d.neigh; w.voyageCd = d.voyageCd || 0; if (d.dip) { w.fortifyUntil = d.dip.fortifyUntil || 0; w.dipDay = d.dip.dipDay || 0 } if (d.seen) { w.seen.set(unpackArr(d.seen, N)); w.seenVer++ } } else if (!d.neigh) { w.neigh = null; w.fog = false; w.seen = null } if (w.gov.policy.tax === undefined) w.gov.policy.tax = 0;
  if (d.tech) w.tech = d.tech; w.boats = []; for (const s of d.boats || []) { const dk = w.buildings.get(s.dock); if (dk && dk.dir) { const bt = new Boat(w, dk, s.kind || 'fishing'); bt.id = s.id; w.boats.push(bt); if (s.hold) for (const k of TRADE_KEYS) if (s.hold[k]) w.stock[k] = Math.min(w.cap(), w.stock[k] + s.hold[k]) } }
  w.bpnext = d.counters.bpnext;
  for (const s of d.vills) {
    const v = Object.create(Villager.prototype); Object.assign(v, s);
    if (!d.lifeV && typeof v.age === 'number') v.age = v.age < 14 ? v.age * CFG.ADULT_DAYS / 14 : CFG.ADULT_DAYS + (v.age - 14) * (CFG.OLD_DAYS - CFG.ADULT_DAYS) / (CFG.OLD_DAYS - 14);       // saves from before v0.38 counted adulthood from day 14; stretch the early years so everyone keeps their stage
    v.w = w; v.alive = true; v.steps = []; v.cur = null; v.path = []; v.claim = -1; v.claimB = null; v.inb = null; v.haul = null; v.bpWork = null; v.jobKind = null; v.failUntil = {};
    if (v.op.tax === undefined) v.op.tax = 0; v.coins = v.coins || 0; v.output = v.output || 0; v.earned = v.earned || 0;
    v.fighting = false; v.emote = null; v.sleeping = false; v.label = 'Idle'; v.wait = 0; v.stuck = 0; w.vills.push(v);
  }
  for (const s of d.animals) { const a = Object.create(Animal.prototype); Object.assign(a, s); a.w = w; a.alive = true; a.target = null; w.animals.push(a) }
  w.nextId = d.counters.nextId; w.rng.s = d.rngState; w.mind = null; w.pendingMind = 0;
  playRelink(w);
  return w;
}
const saveMeta = w => ({ year: w.year, day: w.day, season: w.season, pop: w.pop, seed: w.seed, savedAt: Date.now() });
