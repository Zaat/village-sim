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
const VILL_KEYS = ['id', 'sex', 'age', 'name', 'x', 'y', 'look', 'trait', 'skill', 'role', 'hunger', 'energy', 'social', 'health', 'carry', 'label', 'home', 'sleeping', 'preg', 'father', 'lastBirth', 'wait', 'dir', 'family', 'partner', 'kids', 'parentIds', 'mood', 'debates', 'desire', 'nextDesire', 'bio', 'reputation', 'record', 'duty', 'stocksUntil', 'group', 'friends', 'enemies', 'won', 'mournUntil', 'op', 'cause', '_st'];
const ANIMAL_KEYS = ['id', 'kind', 'x', 'y', 'hp', 'tx', 'ty', 'wait', 'life', 'hunger', 'dir', 'sex', 'moving', 'fleeing'];
const pickKeys = (o, keys) => { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r };

function serializeWorld(w) {
  return {
    v: SAVE_VERSION, savedAt: Date.now(), seed: w.seed, settings: { ...w.settings }, rngState: w.rng.s, tick: w.tick,
    arrays: { feat: b64enc(w.feat), res: b64enc(w.res), road: b64enc(w.road), fish: b64enc(w.fish) },
    stock: { ...w.stock }, counters: { nextId: w.nextId, nameUse: w.nameUse, bnext: w.bnext, bpnext: w.bpnext, groupNext: w.groupNext, births: w.births, deaths: w.deaths, trees: w.trees, trees0: w.trees0 },
    flags: { harsh: w.harsh, drought: w.drought, cold: w.cold, festival: w.festival, holiday: w.holiday, holidayDone: w.holidayDone, meetingDay: w.meetingDay, meetingDone: w.meetingDone, forceFeast: w.forceFeast },
    causes: w.causes, regrow: w.regrow, scars: w.scars, banished: w.banished, crimes: w.crimes, crimeLog: w.crimeLog, connected: [...w.connected],
    log: w.log.slice(0, 120), hist: w.hist.slice(-600), rel: [...w.rel].map(([k, r]) => [k, Math.round(r * 10) / 10]),
    gov: w.gov, groups: w.groups,
    buildings: [...w.buildings.values()].map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, occ: b.occ, state: b.state, g: b.g, style: b.style || 0, dir: b.dir })),
    bps: w.bps.map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, have: b.have, prog: b.prog, target: b.target, toStyle: b.toStyle, dir: b.dir })),
    tech: w.tech, boats: w.boats.map(b => ({ id: b.id, dock: b.dock })),
    vills: w.vills.map(v => pickKeys(v, VILL_KEYS)), animals: w.animals.filter(a => a.alive).map(a => pickKeys(a, ANIMAL_KEYS)),
  };
}

function deserializeWorld(d) {
  if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION || !d.seed === undefined) throw new Error('This is not a compatible Village Sim save.');
  const N = CFG.W * CFG.H, w = new World(d.seed, d.settings);          // regenerates the same terrain, then we replace the dynamic state
  w.vills = []; w.animals = []; w.buildings.clear(); w.bmap.fill(0); w.blk.fill(0); w.storeAdj.fill(0); w.bldAdj.fill(0); for (const k in w.campAdj) w.campAdj[k].fill(0); w.bps = []; w.bpAt.clear(); w.claim.fill(-1);
  w.feat.set(b64dec(d.arrays.feat, N)); w.res.set(b64dec(d.arrays.res, N)); w.road.set(b64dec(d.arrays.road, N)); w.fish.set(b64dec(d.arrays.fish, N));
  w.tick = d.tick; w.stock = { ...d.stock }; w.inbound = { wood: 0, stone: 0, food: 0 };
  Object.assign(w, d.counters, d.flags); w.causes = d.causes || {}; w.regrow = d.regrow || []; w.scars = d.scars || []; w.banished = d.banished || []; w.crimes = d.crimes || []; w.crimeLog = d.crimeLog || [];
  w.connected = new Set(d.connected || []); w.log = d.log || []; w.hist = d.hist || []; w.rel = new Map(d.rel || []); w.gov = d.gov; w.groups = d.groups || [];
  for (const s of d.buildings) {
    const b = { ...s, claim: 0 }; w.buildings.set(b.id, b);
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) { const i = (b.y + dy) * CFG.W + b.x + dx; w.bmap[i] = b.id; if (CFG.SOLID[b.type]) w.blk[i] = 1 }
  }
  for (const b of w.buildings.values()) if (CFG.SOLID[b.type]) w.markAdj(b, w.adjFor(b.type));
  for (const s of d.bps) { const bp = makeBp(w, s.type, s.x, s.y, s.type === 'upgrade' ? { target: s.target, toStyle: s.toStyle } : s.dir ? { dir: s.dir } : undefined); bp.id = s.id; bp.have = s.have; bp.prog = s.prog }
  if (d.tech) w.tech = d.tech; w.boats = []; for (const s of d.boats || []) { const dk = w.buildings.get(s.dock); if (dk && dk.dir) { const bt = new Boat(w, dk); bt.id = s.id; w.boats.push(bt) } }
  w.bpnext = d.counters.bpnext;
  for (const s of d.vills) {
    const v = Object.create(Villager.prototype); Object.assign(v, s);
    v.w = w; v.alive = true; v.steps = []; v.cur = null; v.path = []; v.claim = -1; v.claimB = null; v.inb = null; v.haul = null; v.bpWork = null; v.jobKind = null; v.failUntil = {};
    v.fighting = false; v.emote = null; v.sleeping = false; v.label = 'Idle'; v.wait = 0; v.stuck = 0; w.vills.push(v);
  }
  for (const s of d.animals) { const a = Object.create(Animal.prototype); Object.assign(a, s); a.w = w; a.alive = true; a.target = null; w.animals.push(a) }
  w.nextId = d.counters.nextId; w.rng.s = d.rngState; w.mind = null; w.pendingMind = 0;
  return w;
}
const saveMeta = w => ({ year: w.year, day: w.day, season: w.season, pop: w.vills.length, seed: w.seed, savedAt: Date.now() });
