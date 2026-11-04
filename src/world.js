'use strict';
/* ==========================================================================
   world.js — terrain generation, buildings, pathfinding, seasons, main step.
   ========================================================================== */
const SEARCH_BUDGET = 150000;                       // path-search nodes allowed per tick (a full flood of the biggest map is about 80000)
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
class World {
  constructor(seed, settings = {}, dims) {
    const [mw, mh] = dims || CFG.MAP_NEW; CFG.W = mw; CFG.H = mh; this.arch = (settings && settings.map && mw >= 200) ? settings.map : 'island'; this.full = FULL_MAPS.has(this.arch);
    this.ox = this.full ? -9999 : (mw - 160) >> 1; this.oy = this.full ? -9999 : (mh - 112) >> 1; this.hx = this.ox; this.hy = this.oy; this.coastSides = [0, 0, 0, 0];     // the home island always occupies the same 160x112 window; wider maps add open sea for other islands
    this.neigh = null; this.fog = false; this.seen = null; this.seenVer = 0; this.voyage = null; this.voyageCd = 0; this.visit = null; this.fortifyUntil = 0; this.dipDay = 0;
    this.dbg = { errors: new Map(), total: 0, prof: {}, ticks: 0, tickMs: 0, tickMax: 0, unstuck: 0, lastTickAt: 0, onFault: null };
    this.seed = seed >>> 0; this.rng = mulberry32(this.seed);
    this.settings = { survival: false, disasters: true, crime: true, raids: false, hardship: 1, ...settings, map: this.arch }; initSociety(this); initTech(this); initEcon(this); initProjects(this); initHistory(this); initRegime(this); initStrife(this); initTrade2(this); initOutposts(this); initBridges(this); initLives(this); initStats(this); initConcerns(this);
    const N = CFG.W * CFG.H, { W, H } = CFG;
    this.terr = new Uint8Array(N); this.feat = new Uint8Array(N); this.res = new Uint8Array(N);
    this.road = new Uint8Array(N); this.bmap = new Int16Array(N); this.blk = new Uint8Array(N);
    this.storeAdj = new Uint8Array(N); this.bldAdj = new Uint8Array(N); this.campAdj = { wood: new Uint8Array(N), stone: new Uint8Array(N), food: new Uint8Array(N) };
    this.shade = new Uint8Array(N); this.fish = new Uint8Array(N).fill(CFG.FISH_MAX); this.claim = new Int32Array(N).fill(-1);
    this.grid = []; this.wolfList = []; for (let i = 0; i < Math.ceil(CFG.W / 6) * Math.ceil(CFG.H / 6); i++) this.grid.push([]); this._hk = new Float32Array(N * 4 + 16); this._hv = new Int32Array(N * 4 + 16); this._d = new Float32Array(N); this._p = new Int32Array(N); this._seen = new Int32Array(N); this._ds = new Int32Array(N); this._st = 0;
    this.buildings = new Map(); this.bnext = 1; this.bps = []; this.bpAt = new Map(); this.bpnext = 1;
    this.regrow = []; this.young = []; this.wet = 0; this.log = []; this.hist = []; this.listeners = []; this.connected = new Set();
    this.vills = []; this.animals = []; this.nextId = 1; this.tick = 0; this.rel = new Map();
    this.stock = { ...CFG.START_STOCK }; if (this.settings.survival) for (const k in this.stock) this.stock[k] = Math.floor(this.stock[k] * 0.6); this.inbound = { wood: 0, stone: 0, food: 0 };
    this.nameUse = 0; this.births = 0; this.deaths = 0; this.causes = {};
    this.harsh = false; this.drought = false; this.cold = false; this.festival = false; this.fishOK = false;
    this.gen(); for (let i = 0; i < N; i++) if (this.terr[i] === TERR.DEEP) this.fish[i] = CFG.FISH_DEEP;
    this.spawn();
    this.say('A small band of settlers makes camp beside the water.');
  }
  /* ----- time ----- */
  get day() { return Math.floor(this.tick / CFG.TPD) + 1 }
  get tod() { return (this.tick % CFG.TPD) / CFG.TPD }            // 0 = sunrise
  get season() { return Math.floor((this.day - 1) / CFG.DPS) % 4 }
  get seasonDay() { return (this.day - 1) % CFG.DPS + 1 }
  get year() { return Math.floor((this.day - 1) / (CFG.DPS * 4)) + 1 }
  isNight() { return this.tod > 0.72 }
  r() { return this.rng() }
  say(text) { this.log.unshift({ day: this.day, season: this.season, text }); if (this.log.length > 120) this.log.pop() }
  emit(type, text, data) { if (text) this.say(text); try { statFromEmit(this, type, text, data) } catch (e) { console.error(e) } try { noteEvent(this, type, text, data) } catch (e) { console.error(e) } for (const f of this.listeners) { try { f(type, text, data) } catch (e) { console.error(e) } } }

  /* ----- generation ----- */
  gen() {
    const { W, H } = CFG, rng = this.rng, full = this.full, nz = full ? makeNoise(rng, W, H) : makeNoise(rng);
    const e1 = nz(46), e2 = nz(20), e3 = nz(9), e4 = nz(4), m1 = nz(28), m2 = nz(11), r1 = nz(7);
    const E = new Float32Array(W * H), M = new Float32Array(W * H);
    const OX = full ? 0 : this.ox, OY = full ? 0 : this.oy, RW = full ? W : 160, RH = full ? H : 112, fade = !full && (this.settings.fade || this.arch === 'archipelago'), fshape = full ? fullShape(this, rng) : null, ashape = this.arch === 'archipelago' ? archipelagoShape(rng) : null;
    for (let y = OY; y < OY + RH; y++) for (let x = OX; x < OX + RW; x++) {
      const xx = x - OX, yy = y - OY, i = y * W + x; let e = 0.5 * e1(xx, yy) + 0.3 * e2(xx, yy) + 0.15 * e3(xx, yy) + 0.05 * e4(xx, yy);
      e = (e - 0.5) * 1.6 + 0.5;
      if (full) e += fshape(x, y); else { const dx = (xx - 80) / 80, dy = (yy - 56) / 56; e -= 0.34 * Math.pow(Math.min(1, ashape ? ashape(xx, yy) : Math.hypot(dx, dy) / 1.05), 2.6); if (ashape) e += 0.1; if (fade) e -= 0.6 * smooth01(0, 10, 10 - Math.min(xx, 159 - xx, yy, 111 - yy)) }
      E[i] = e; M[i] = 0.6 * m1(xx, yy) + 0.4 * m2(xx, yy); this.shade[i] = (rng() * 5) | 0;
      this.terr[i] = e < 0.28 ? TERR.DEEP : e < 0.34 ? TERR.SHALLOW : e < 0.37 ? TERR.SAND : e > 0.80 ? TERR.PEAK : e > 0.66 ? TERR.ROCK : TERR.GRASS;
    }
    this.E = E; this.M = M; if (this.arch === 'river') carveRivers(this, rng);
    // choose a start: flat grass, close to water, near hills, near the map middle (on the biggest connected land for the new map types)
    let best = null, bs = -1e9; const reg = this.arch !== 'island' ? landRegions(this) : null, big = reg ? Math.max(...reg.sizes) : 0, fx = this.arch === 'peninsula' ? W * 0.7 : W / 2, fy = H / 2;
    const sx0 = full ? 30 : OX + 14, sx1 = full ? W - 30 : OX + 160 - 14, sy0 = full ? 24 : OY + 14, sy1 = full ? H - 24 : OY + 112 - 14;
    for (let y = sy0; y < sy1; y += 3) for (let x = sx0; x < sx1; x += 3) {
      if (reg && reg.sizes[reg.label[y * W + x]] < big * 0.6) continue;
      let grass = 0; for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) if (this.terr[(y + dy) * W + x + dx] === TERR.GRASS) grass++;
      if (grass < 40) continue;
      let water = 0, rock = 0;
      for (let a = 0; a < 8; a++) for (const d of [9, 14, 20]) {
        const px = Math.round(x + Math.cos(a * 0.785) * d), py = Math.round(y + Math.sin(a * 0.785) * d); if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const t = this.terr[py * W + px]; if (t === TERR.SHALLOW) water++; if (t === TERR.ROCK) rock++;
      }
      let s = grass * 2 + Math.min(water, 6) * 8 + Math.min(rock, 6) * 5 - Math.hypot(x - fx, y - fy) * 0.8;
      if (reg) {                                         // new map types: fishers need a shore they can actually walk to
        const lb = reg.label[y * W + x]; let shore = 0;
        for (let dy = -22; dy <= 22 && shore < 6; dy += 2) for (let dx = -22; dx <= 22; dx += 2) { const px = x + dx, py = y + dy; if (px < 2 || py < 2 || px >= W - 2 || py >= H - 2 || this.terr[py * W + px] !== TERR.SHALLOW) continue; const q = py * W + px; if (reg.label[q - 1] === lb || reg.label[q + 1] === lb || reg.label[q - W] === lb || reg.label[q + W] === lb) { shore++; if (shore >= 6) break } }
        if (shore < 6) s -= 90;
      }
      if (s > bs) { bs = s; best = [x, y] }
    }
    [this.cx, this.cy] = best || [W >> 1, H >> 1]; this._reg = null;
    this.hx = full ? clamp(this.cx - 80, 1, W - 161) : OX; this.hy = full ? clamp(this.cy - 56, 1, H - 113) : OY;
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      const i = (this.cy + dy) * W + this.cx + dx; if (Math.hypot(dx, dy) < 7.5) this.terr[i] = TERR.GRASS;
    }
    // vegetation & resources
    for (let y = OY; y < OY + RH; y++) for (let x = OX; x < OX + RW; x++) {
      const i = y * W + x, t = this.terr[i], m = M[i], e = E[i];
      if (Math.hypot(x - this.cx, y - this.cy) < 7.5) continue;
      if (t === TERR.GRASS) {
        const p = clamp((m - 0.46) * 2.4, 0, 0.78) * (0.55 + 0.9 * r1(x - OX, y - OY));
        if (rng() < p) { this.feat[i] = e > 0.58 || m < 0.5 && rng() < 0.3 ? FEAT.PINE : FEAT.OAK; this.res[i] = 4 }
        else if (rng() < 0.014) { this.feat[i] = FEAT.BUSH; this.res[i] = 4 }
      } else if (t === TERR.ROCK) {
        if (rng() < 0.5) { this.feat[i] = FEAT.STONE; this.res[i] = 8 } else if (rng() < 0.1) { this.feat[i] = FEAT.PINE; this.res[i] = 4 }
      }
    }
    for (let k = 0; k < 8; k++) { const a = rng() * 6.28, d = 8 + rng() * 4; this.put(FEAT.BUSH, Math.round(this.cx + Math.cos(a) * d), Math.round(this.cy + Math.sin(a) * d), 0, 4) }
    const count = f => { let n = 0; for (let i = 0; i < W * H; i++) if (this.feat[i] === f) n++; return n };
    const cluster = (f, res, min, rmin, rmax, rad) => { let g = 0; while (count(f) < min && g++ < 30) { const a = rng() * 6.28, d = rmin + rng() * (rmax - rmin); this.put(f, Math.round(this.cx + Math.cos(a) * d), Math.round(this.cy + Math.sin(a) * d), rad, res) } };
    cluster(FEAT.OAK, 4, 500, 9, 22, 3); cluster(FEAT.STONE, 8, 90, 11, 24, 2);
    this.trees = 0; for (let i = 0; i < W * H; i++) if (this.feat[i] === FEAT.OAK || this.feat[i] === FEAT.PINE) this.trees++; this.trees0 = this.trees;
    // can villagers fish? (shallow water with walkable shore near camp)
    for (let y = 0; y < H && !this.fishOK; y++) for (let x = 0; x < W; x++) {
      if (this.terr[y * W + x] !== TERR.SHALLOW || Math.hypot(x - this.cx, y - this.cy) > 32) continue;
      for (const [dx, dy] of NB) { const j = (y + dy) * W + x + dx; if (this.terr[j] === TERR.GRASS || this.terr[j] === TERR.SAND) { this.fishOK = true; break } }
    }
    if (this.arch !== 'island' && this.fishOK) {                       // new map types: fishing only counts if a shore can really be walked to from the camp
      const NBS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      this.fishOK = !!this.search(this.cx, this.cy + 2, (x, y) => { for (const [dx, dy] of NBS) if (this.terr[(y + dy) * W + x + dx] === TERR.SHALLOW) return true; return false }, 120, true);
    }
    this.addBuilding('campfire', this.cx, this.cy);
    this.addBuilding('store', this.cx + CFG.LATTICE, this.cy);
    spawnWildlife(this);
    if (full) genFullNeighbours(this); else if (this.ox > 0) genNeighbours(this);                     // other lands: on foot across the continent, or islands in the open sea (new, wider maps only)
  }
  put(f, x, y, rad, res) {
    const { W, H } = CFG;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad + 1) continue; const px = x + dx, py = y + dy;
      if (px < 1 || py < 1 || px >= W - 1 || py >= H - 1) continue; const i = py * W + px;
      if (Math.hypot(px - this.cx, py - this.cy) < 7.5 || this.terr[i] === TERR.DEEP || this.terr[i] === TERR.SHALLOW || this.terr[i] === TERR.PEAK) continue;
      if (this.bmap[i] || this.feat[i] && f === FEAT.BUSH) continue;
      this.feat[i] = f; this.res[i] = res; if (f === FEAT.STONE && this.terr[i] === TERR.GRASS) this.terr[i] = TERR.ROCK;
    }
  }
  spawn() {
    let k = 0, guard = 0;
    while (k < CFG.START_VILLAGERS && guard++ < 200) {
      const x = this.cx - 5 + ((this.r() * 11) | 0), y = this.cy + 2 + ((this.r() * 5) | 0);
      if (!this.walkable(y * CFG.W + x)) continue;
      this.vills.push(new Villager(this, k % 2 ? 'f' : 'm', 14 + this.r() * 26, x, y)); k++;
    }
  }

  /* ----- buildings ----- */
  addBuilding(type, x, y) {
    const [w, h] = CFG.SIZE[type], b = { id: this.bnext++, type, x, y, w, h, occ: [], state: 0, g: 0, claim: 0 };
    this.buildings.set(b.id, b);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const i = (y + dy) * CFG.W + x + dx; this.bmap[i] = b.id; if (CFG.SOLID[type]) this.blk[i] = 1; this.road[i] = 0 }
    if (CFG.SOLID[type]) this.markAdj(b, this.adjFor(type));
    return b;
  }
  markAdj(b, extra) {
    const { W } = CFG;
    for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      const inX = x >= b.x && x < b.x + b.w, inY = y >= b.y && y < b.y + b.h;
      if ((inX && inY) || (!inX && !inY)) continue;
      const i = y * W + x; this.bldAdj[i] = 1; if (extra) extra[i] = 1;
    }
  }
  houses() { const a = []; for (const b of this.buildings.values()) if (b.type === 'house') a.push(b); return a }
  of(type) { const a = []; for (const b of this.buildings.values()) if (b.type === type) a.push(b); return a }
  adjFor(type) { return type === 'store' ? this.storeAdj : type === 'logcamp' ? this.campAdj.wood : type === 'minecamp' ? this.campAdj.stone : type === 'lodge' ? this.campAdj.food : null }
  /* is there a camp for this resource close by? (logging camp for wood, mining camp for stone, lodge for food) */
  campNear(kind, x, y, r = 14) { const type = kind === 'wood' ? 'logcamp' : kind === 'stone' ? 'minecamp' : 'lodge'; for (const b of this.buildings.values()) if (b.type === type && Math.hypot(b.x + 1 - x, b.y + 1 - y) <= r) return b; return null }
  has(id) { return !!this.tech.known[id] }
  beds() { let n = 0; for (const b of this.buildings.values()) if (b.type === 'house') n += bedsOf(b); return n }
  cap() { return Math.round((60 + (100 + (this.has('granary') ? 40 : 0)) * this.of('store').length + (projBuilt(this, 'granaryhall') ? 120 : 0)) * (1 + techFx(this, 'store'))) }
  passable(i) { const t = this.terr[i], f = this.feat[i]; return (t === TERR.GRASS || t === TERR.SAND || t === TERR.ROCK) && this.blk[i] === 0 && (f === FEAT.OAK || f === FEAT.PINE || f === FEAT.BUSH) }
  clearTile(i) { const f = this.feat[i]; if (f === FEAT.OAK || f === FEAT.PINE) this.trees--; this.feat[i] = 0; this.res[i] = 0 }
  walkable(i) { const t = this.terr[i]; return (t === TERR.GRASS || t === TERR.SAND || t === TERR.ROCK || t === TERR.FORD || t === TERR.BRIDGE) && this.feat[i] === 0 && this.blk[i] === 0 }
  nearStock(x, y, i) { return this.storeAdj[i] === 1 }
  nearRect(x, y, b) { const dx = x < b.x ? b.x - x : x >= b.x + b.w ? x - (b.x + b.w - 1) : 0, dy = y < b.y ? b.y - y : y >= b.y + b.h ? y - (b.y + b.h - 1) : 0; return dx + dy <= 1 }
  assignHome(v) {
    if (v.home != null) return;
    let best = null, bd = 1e9; const pv = privOf(v);
    for (const h of this.houses()) {
      if (h.occ.length >= bedsOf(h)) continue;
      if (h.cabin && h.owner != null && h.owner !== v.id && !(v.partner != null && h.owner === v.partner)) continue;      // a cabin belongs to the one who built it (and their partner)
      const n = h.occ.length, d = Math.abs(h.x - this.cx) + Math.abs(h.y - this.cy) - (n === 0 ? 14 * pv : 5 * pv * n) - (n > 0 ? (1 - pv) * 2.5 * Math.min(n, 2) : 0);      // private people look for empty houses, sociable ones for company
      if (d < bd) { bd = d; best = h }
    }
    if (best) { best.occ.push(v.id); v.home = best.id; claimHome(this, best, v) }
  }
  pending() { const p = { wood: 0, stone: 0 }; for (const b of this.bps) for (const t of ['wood', 'stone']) p[t] += Math.max(0, b.cost[t] - b.have[t] - b.inc[t]); return p }
  complete(bp) {
    bp.alive = false; this.bps.splice(this.bps.indexOf(bp), 1);
    for (let dy = 0; dy < bp.h; dy++) for (let dx = 0; dx < bp.w; dx++) this.bpAt.delete((bp.y + dy) * CFG.W + bp.x + dx);
    if (bp.type === 'road') { this.road[bp.idx] = this.has('concrete') ? 4 : this.has('roads') ? 3 : this.has('masonry') ? 2 : 1; return }
    if (bp.type === 'bridge') { bridgeTileDone(this, bp); return }
    if (bp.type === 'upgrade') { const b = this.buildings.get(bp.target); if (b) { b.style = bp.toStyle; ensureStats(this, b); restyle(this, b); this.say(`A ${HOUSE_STYLES[bp.toStyle - 1].toLowerCase()} has been rebuilt as a ${HOUSE_STYLES[bp.toStyle].toLowerCase()}.`) } return }
    const b = this.addBuilding(bp.type, bp.x, bp.y); b.style = bp.type === 'house' || bp.type === 'store' ? styleNow(this) : 0;
    ensureStats(this, b);
    if (PROJECTS[bp.type]) { projectDone(this, b, bp); return }
    if (bp.type === 'dock') { b.dir = bp.dir; addBoat(this, b); this.say('A new dock is finished, and a fishing boat is launched.'); if (this.has('navigation')) addBoat(this, b); return }
    if (bp.type === 'market') this.say('A market square is opened. Merchants will know where to find us.');
    if (bp.type === 'plaza') this.say(this.has('masonry') ? 'A cobbled village square is finished, with a well at its heart.' : 'A village square is laid out around a new well. The village has a place to meet.');
    if (bp.type === 'tavern') this.say('A tavern opens its doors. Evenings will be livelier.');
    if (bp.type === 'logcamp') this.say('A logging camp is raised beside the forest.');
    if (bp.type === 'minecamp') this.say('A mining camp opens at the rockface.');
    if (bp.type === 'lodge') this.say('A hunting lodge is built near the game trails.');
    if (bp.type === 'house' && bp.cabin) { cabinDone(this, b, bp); return }
    if (bp.type === 'house') this.say(`A new ${HOUSE_STYLES[b.style].toLowerCase()} is finished.`);
    if (bp.type === 'farm') this.say('A new field is ready for sowing.');
    if (bp.type === 'store') this.say(b.style >= 2 ? 'A stone granary is raised, so the village can keep more.' : 'A storehouse is raised, so the village can keep more.');
  }

  /* ----- pathfinding: Dijkstra, roads cheap, sand/rock slightly dear ----- */
  search(sx, sy, goal, maxCost = 1e9, through = false) {
    if (this._nodes > SEARCH_BUDGET) { this.deferredSearch = true; this.dbg.deferred = (this.dbg.deferred || 0) + 1; return null }       // too many map floods this tick: the caller waits and tries again
    const { W, H } = CFG, dist = this._d, prev = this._p, seen = this._seen, ds = this._ds, hk = this._hk, hv = this._hv, st = ++this._st;
    const s = sy * W + sx; dist[s] = 0; seen[s] = st; prev[s] = -1; let hs = 1; hk[0] = 0; hv[0] = s;
    while (hs > 0) {
      const u = hv[0]; hs--;
      if (hs > 0) { const lk = hk[hs], lv = hv[hs]; let i = 0; for (; ;) { let c = 2 * i + 1; if (c >= hs) break; if (c + 1 < hs && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c } hk[i] = lk; hv[i] = lv }
      if (ds[u] === st) continue; ds[u] = st; this._nodes++; const ux = u % W, uy = (u / W) | 0;
      if (goal(ux, uy, u)) { const path = []; let c = u; while (c !== s) { path.push(c); c = prev[c] } path.reverse(); return path }
      if (dist[u] > maxCost) continue;
      for (let k = 0; k < 4; k++) {
        const nx = ux + NB[k][0], ny = uy + NB[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const v = ny * W + nx; if (ds[v] === st) continue; let extra = 0;
        if (!this.walkable(v)) { if (!through || !this.passable(v)) continue; extra = 6 }
        const t = this.terr[v], nd = dist[u] + extra + (this.road[v] ? 0.55 : t === TERR.GRASS ? 1 : t === TERR.SAND ? 1.15 : 1.4);
        if (seen[v] !== st || nd < dist[v]) {
          dist[v] = nd; seen[v] = st; prev[v] = u;
          let i = hs++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= nd) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p } hk[i] = nd; hv[i] = v;
        }
      }
    }
    return null;
  }
  /* ----- natural movement: straight, diagonal shortcuts instead of staircases ----- */
  /* can a walker go straight between two tile centres, staying about 0.3 tile clear of obstacles, over plain ground only? */
  clearLine(x0, y0, x1, y1) {
    const { W } = CFG, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < 1e-6) return true;
    const n = Math.ceil(len / 0.2), px = -dy / len * 0.3, py = dx / len * 0.3;
    for (let k = 1; k < n; k++) {
      const t = k / n, x = x0 + dx * t, y = y0 + dy * t;
      for (let m = -1; m <= 1; m++) { const i = Math.floor(y + py * m) * W + Math.floor(x + px * m); if (!this.walkable(i)) return false; const tr = this.terr[i]; if (tr !== TERR.GRASS && tr !== TERR.SAND) return false }
    }
    return true;
  }
  /* string-pulling: keep only the waypoints that are needed; never leave a road, never cut through brush or odd ground */
  smoothPath(sx, sy, path) {
    if (path.length < 3) return path; const W = CFG.W, out = []; let ax = sx + 0.5, ay = sy + 0.5, i = 0;
    while (i < path.length) {
      let best = i; const lim = Math.min(path.length - 1, i + 14);
      for (let j = lim; j > i; j--) {
        let road = false; for (let k = i; k <= j; k++) if (this.road[path[k]]) { road = true; break } if (road) continue;
        if (this.clearLine(ax, ay, (path[j] % W) + 0.5, ((path[j] / W) | 0) + 0.5)) { best = j; break }
      }
      out.push(path[best]); ax = (path[best] % W) + 0.5; ay = ((path[best] / W) | 0) + 0.5; i = best + 1;
    }
    return out;
  }
  /* ----- social ----- */
  relKey(a, b) { return a.id < b.id ? a.id + '_' + b.id : b.id + '_' + a.id }
  getRel(a, b) { return this.rel.get(this.relKey(a, b)) || 0 }
  interact(a, b) { socialInteract(this, a, b) }
  interactOld(a, b) {
    const prev = this.getRel(a, b); let sim = 0; for (const t of TRAITS) sim += 1 - Math.abs(a.trait[t] - b.trait[t]); sim /= TRAITS.length;
    const kind = (a.trait.kind + b.trait.kind) / 2, r = clamp(prev + (4 + this.r() * 6 + kind * 3) * (0.55 + 0.9 * sim), 0, 100); this.rel.set(this.relKey(a, b), r);
    a.social = Math.min(100, a.social + 45); b.social = Math.min(100, b.social + 30);
    if (prev < 50 && r >= 50) this.say(`${a.name} and ${b.name} became friends.`);
    if (!a.isChild() && !b.isChild()) {
      if (this.r() < 0.06) this.say(chatTopic(this, a, b));
      if (a.trait.cur + b.trait.cur > 1.25 && this.r() < 0.5) this.emit('chat', null, { a, b });
      if (a.sex !== b.sex && r >= 40) this.tryConceive(a.sex === 'f' ? a : b, a.sex === 'f' ? b : a);
    }
  }
  tryConceive(f, m) {
    if (!f.isAdult() || !m.isAdult() || f.partner !== m.id) return;
    if (f.preg > 0 || this.tick - f.lastBirth < CFG.BIRTH_COOLDOWN || f.age > CFG.FERTILE_MAX * (this.lifeScale || 1)) return;
    if (this.vills.length + 1 > this.beds()) return;
    const gp = this.gov.policy.growth; if (this.stock.food < this.vills.length * 3.5 * (1 - 0.25 * gp) * (this.settings.survival ? 1.3 : 1)) return;
    if (this.r() < CFG.BIRTH_CHANCE * (1 + 0.3 * gp) * (this.rx ? this.rx.birth : 1) * hardOf(this).fert * fertilityMult(this)) { f.preg = CFG.PREGNANCY; f.father = m.id; this.say(`${f.name} is expecting a child.`); f.story('Learned a child was on the way.') }
  }
  birth(f) {
    const dad = this.vills.find(v => v.id === f.father), c = new Villager(this, this.r() < 0.5 ? 'f' : 'm', 0, f.tx, f.ty, null, [f, dad]);
    c.home = f.home; c.parentIds = [f.id, dad ? dad.id : null]; if (f.home != null) { const h = this.buildings.get(f.home); if (h) h.occ.push(c.id) }
    f.kids.push(c.id); if (dad) dad.kids.push(c.id); c.story(`Born to ${f.name}${dad ? ' and ' + dad.name : ''} of House ${c.family}.`); f.story(`Gave birth to ${c.name}.`); if (dad) dad.story(`Became a father to ${c.name}.`);
    this.vills.push(c); f.lastBirth = this.tick; this.births++; noteFlow(this, 'born');
    this.emit('birth', `${c.name} ${c.family} was born to ${f.name}${dad ? ' and ' + dad.name : ''}.`, { c, f });
  }
  kill(v, why) {
    try { onChiefDeath(this, v) } catch (e) { this.fault('succession', e) }
    v.alive = false; v.endJob(); this.vills.splice(this.vills.indexOf(v), 1); this.deaths++; noteFlow(this, 'died'); this.causes[why] = (this.causes[why] || 0) + 1;
    for (const h of this.houses()) { const k = h.occ.indexOf(v.id); if (k >= 0) h.occ.splice(k, 1) }
    const grieve = (id, d, days, txt) => { const o = this.vills.find(x => x.id === id); if (o) { o.mournUntil = this.tick + CFG.TPD * days; o.mood = Math.max(0, o.mood - d); o.story(txt); experience(o, 'loss', d / 20) } };
    if (v.partner != null) { const p = this.vills.find(x => x.id === v.partner); if (p) p.partner = null; grieve(v.partner, 25, 6, `Lost ${v.name}, their partner.`) }
    for (const id of v.kids) grieve(id, 15, 4, `Lost their parent ${v.name}.`);
    for (const id of v.parentIds) if (id != null) grieve(id, 20, 5, `Lost their child ${v.name}.`);
    try { inheritFrom(this, v) } catch (e) { this.fault('inherit', e) }
    this.emit('death', `${v.name} ${v.family} ${why}.`, { v, why });
  }
  removeBuilding(b) {
    this.buildings.delete(b.id); const { W } = CFG;
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) { const i = (b.y + dy) * W + b.x + dx; this.bmap[i] = 0; this.blk[i] = 0 }
    this.storeAdj.fill(0); this.bldAdj.fill(0); for (const k in this.campAdj) this.campAdj[k].fill(0); for (const x of this.buildings.values()) if (CFG.SOLID[x.type]) this.markAdj(x, this.adjFor(x.type));
    for (const id of b.occ) { const v = this.vills.find(x => x.id === id); if (v) { v.home = null; v.mood = Math.max(0, v.mood - 20); v.story('Lost their home.') } }
    this.connected.delete(b.id); this.scars.push({ x: b.x, y: b.y, w: b.w, h: b.h, until: this.tick + CFG.TPD * 3 });
  }

  /* ----- calendar hooks ----- */
  onNewDay() {
    const s = this.season, pop = this.vills.length;
    if (this.seasonDay === 1 && this.day > 1) {
      if (s === 0) { this.harsh = false; this.say('Spring arrives. The snow melts and the fields stir.') }
      if (s === 1) this.say('Summer begins. Long warm days.')
      if (s === 2) { this.drought = false; this.say('Autumn comes. Time to bring in the harvest and stack firewood.') }
      if (s === 3) this.say('Winter settles in. The fields are frozen.');
      if (s === 0) { this.wet = Math.round((this.r() * 2 - 1) * 100) / 100; if (this.day > 8 && Math.abs(this.wet) > 0.55) this.say(this.wet > 0 ? 'A wet year: crops should do well and the streams run full.' : 'A dry year: the fields will struggle without rain.') }
      this.emit('season', null, { season: s });
    }
    const stc = this.gov.council.find(c => c.title === 'Steward'), std = stc ? this.vills.find(v => v.id === stc.id) : null;
    this.stock.food = Math.floor(this.stock.food * (1 - (s === 1 ? 0.04 : 0.015) * (std ? 1 - 0.3 * std.trait.ind : 1) * (this.has('granary') ? 0.7 : 1) * (projBuilt(this, 'granaryhall') ? 0.7 : 1) * (1 - Math.min(0.5, techFx(this, 'store')))));
    if (s === 3) {
      const need = winterWood(this);
      if (this.stock.wood >= need) { this.stock.wood -= need; if (this.cold) this.say('Warm hearths again; the cold has eased.'); this.cold = false }
      else { this.stock.wood = 0; if (!this.cold) this.emit('cold', 'The firewood has run out. The village is freezing!'); this.cold = true }
    } else this.cold = false;
    for (const k of ['wood', 'stone', 'food']) this.stock[k] = Math.min(this.stock[k], this.cap());
    animalsNewDay(this);
    townNewDay(this);
    societyNewDay(this);
    techDay(this);
    tradeDay(this);
    routesDay(this);
    outpostDay(this);
    bridgeDay(this);
    neighbourDay(this);
    buildingDay(this);
    characterDay(this);
    regimeDay(this);
    strifeDay(this);
    livesDay(this);
    projectDay(this);
    historyDay(this);
    livelihoodsDay(this);
    concernsDay(this);
    statsDay(this);
  }

  /* ----- diagnostics: every subsystem is timed and isolated, so one bug cannot stop the village ----- */
  fault(where, e, ent) {
    const d = this.dbg, msg = (e && e.message) || String(e), stack = ((e && e.stack) || '').split('\n').slice(0, 6).join('\n'), key = where + ': ' + msg;
    let r = d.errors.get(key);
    if (!r) { r = { where, msg, stack, count: 0, first: { day: this.day, tick: this.tick }, last: null, ent: ent ? `${ent.constructor.name} #${ent.id} ${ent.name || ent.kind || ''}` : null }; d.errors.set(key, r); if (d.errors.size > 40) d.errors.delete(d.errors.keys().next().value) }
    r.count++; r.last = { day: this.day, tick: this.tick }; d.total++;
    if (d.onFault) { try { d.onFault(r) } catch (_) { } }
    return r;
  }
  section(name, fn) {
    const t0 = nowMs(); try { fn() } catch (e) { this.fault(name, e) }
    const dt = nowMs() - t0, p = this.dbg.prof[name] || (this.dbg.prof[name] = { t: 0, n: 0, max: 0 }); p.t += dt; p.n++; if (dt > p.max) p.max = dt;
  }
  entityFault(kind, ent, e) {
    this.fault(kind + '.update', e, ent); ent.faults = (ent.faults || 0) + 1;
    try { if (ent.abort) ent.abort(0) } catch (_) { }
    if (ent.faults >= 8) {                         // a villager or animal that keeps failing is removed rather than allowed to spam errors forever
      ent.alive = false; if (kind === 'villager') { const k = this.vills.indexOf(ent); if (k >= 0) this.vills.splice(k, 1); this.say(`${ent.name} has vanished without a trace.`) }
    }
  }
  /* repairs corrupted numbers and frees villagers that have stopped making progress */
  sanity() {
    const bad = x => !Number.isFinite(x); let fixed = 0, unstuck = 0;
    for (const v of this.vills) {
      if (bad(v.x) || bad(v.y) || v.x < 0 || v.y < 0 || v.x >= CFG.W || v.y >= CFG.H) { v.x = this.cx + 0.5; v.y = this.cy + 2.5; try { v.abort(0) } catch (_) { } fixed++ }
      for (const k of ['hunger', 'energy', 'social', 'health', 'mood', 'age']) if (bad(v[k])) { v[k] = k === 'age' ? 20 : 70; fixed++ }
      if (v.path && v.path.some(p => !(p >= 0))) { v.path = []; fixed++ }
      if (!v.sleeping && v._px === v.x && v._py === v.y && v._pl === v.label && v._pt !== undefined && this.tick - v._pt >= CFG.TPD * 2) { try { v.abort(0) } catch (_) { } unstuck++; v._pt = this.tick }
      else if (v._px !== v.x || v._py !== v.y || v._pl !== v.label || v._pt === undefined) { v._px = v.x; v._py = v.y; v._pl = v.label; v._pt = this.tick }
    }
    for (const a of this.animals) if (bad(a.x) || bad(a.y)) { a.alive = false; fixed++ }
    for (const k in this.stock) if (!Number.isFinite(this.stock[k])) { this.stock[k] = 0; fixed++ }
    if (fixed) this.fault('sanity', new Error(`repaired ${fixed} corrupted values`));
    this.dbg.unstuck += unstuck;
  }
  profReset() { this.dbg.prof = {}; this.dbg.ticks = 0; this.dbg.tickMs = 0; this.dbg.tickMax = 0 }

  /* villagers bucketed into 6-tile cells, so animals only look at the neighbours that matter */
  rebuildGrid() {
    const gw = Math.ceil(CFG.W / 6); for (const c of this.grid) c.length = 0;
    for (const v of this.vills) { const i = ((v.y / 6) | 0) * gw + ((v.x / 6) | 0); if (this.grid[i]) this.grid[i].push(v) }
    this.wolfList = this.animals.filter(a => a.kind === 'wolf' && a.alive);
  }
  /* ----- main step ----- */
  nature() {
    if (this.tick % 4800 === 0 && this.season < 3 && this.young.length) {                  // saplings take about 12 days of growing weather to reach full size
      for (let k = this.young.length - 1; k >= 0; k--) { const i = this.young[k], f = this.feat[i]; if (f !== FEAT.OAK && f !== FEAT.PINE || this.res[i] >= 4) { this.young.splice(k, 1); continue } this.res[i]++; if (this.res[i] >= 4) this.young.splice(k, 1) }
    }
    const g = GROW[this.season] * (1 + 0.15 * this.wet) * (this.drought ? 0.5 : 1) * (this.settings.survival ? 0.85 : 1) * (this.has('rotation') ? 1.15 : 1);
    for (const b of this.buildings.values()) if (b.type === 'farm' && b.state === 1) { b.g += g / CFG.FARM_GROW; if (b.g >= 1) { b.state = 2; b.g = 1 } }
    if (this.tick % 50 === 0) for (let k = this.regrow.length - 1; k >= 0; k--) { const g = this.regrow[k]; if (g.at > this.tick || this.season >= 3) continue; if (g.tree) { const i = g.idx; if (this.terr[i] === TERR.GRASS && !this.feat[i] && !this.bmap[i] && !this.road[i] && !this.bpAt.has(i)) { this.feat[i] = g.tree; this.res[i] = 1; this.young.push(i); this.trees++ } } else this.res[g.idx] = 4; this.regrow.splice(k, 1) }
    if (this.tick % Math.round((this.settings.survival ? 400 : 200) * (projBuilt(this, 'lighthouse') ? 0.7 : 1)) === 0 && this.season < 3) for (let i = 0; i < this.fish.length; i++) if ((this.terr[i] === TERR.SHALLOW && this.fish[i] < CFG.FISH_MAX) || (this.terr[i] === TERR.DEEP && this.fish[i] < CFG.FISH_DEEP)) this.fish[i]++;
    if (this.tick % 100 === 0 && this.season < 2 && this.trees < this.trees0 * (this.has('forestry') ? 1.6 : 1.3)) {      // saplings spread from existing woods (capped, and never beside roads or buildings); foresters replant more
      for (let a = 0; a < (this.has('forestry') ? 24 : 14); a++) {
        const x = this.hx + 1 + ((this.r() * 158) | 0), y = this.hy + 1 + ((this.r() * 110) | 0), i = y * CFG.W + x;
        if (this.terr[i] !== TERR.GRASS || this.feat[i] || this.bmap[i] || this.road[i] || this.bpAt.has(i) || this.claim[i] >= 0) continue;
        if (Math.hypot(x - this.cx, y - this.cy) < 8) continue;
        let busy = false; for (let dy = -2; dy <= 2 && !busy; dy++) for (let dx = -2; dx <= 2; dx++) { const j = (y + dy) * CFG.W + x + dx; if (this.road[j] || this.bmap[j]) { busy = true; break } } if (busy) continue;
        let near = false; for (const [dx, dy] of NB) { const f = this.feat[(y + dy) * CFG.W + x + dx]; if (f === FEAT.OAK || f === FEAT.PINE) { near = true; break } }
        if (near && this.r() < 0.5) { this.feat[i] = this.E[i] > 0.58 ? FEAT.PINE : FEAT.OAK; this.res[i] = 1; this.young.push(i); this.trees++ }
      }
    }
  }
  step() {
    const t0 = nowMs(), d = this.dbg; this.tick++; this._nodes = 0; this.deferredSearch = false;
    if (this.tick % CFG.TPD === 0) { this._nodes = -1e9; this.section('calendar', () => this.onNewDay()); this._nodes = 0; this.section('sanity', () => this.sanity()) }       // daily planning is not rationed
    this.section('nature', () => this.nature());
    if (this.tick % 4 === 0) this.section('grid', () => this.rebuildGrid());
    this.section('animals', () => { for (const a of this.animals) if (a.alive) { try { a.update() } catch (e) { this.entityFault('animal', a, e) } } if (this.tick % 20 === 0) this.animals = this.animals.filter(a => a.alive) });
    this.section('villagers', () => { for (const v of this.vills.slice()) if (v.alive) { try { v.update() } catch (e) { this.entityFault('villager', v, e) } } });
    if (this.tick % 60 === 0) this.section('planner', () => planTown(this));
    if (this.tick % 400 === 0) this.section('groups', () => updateGroups(this));
    if (!this.holidayDone && this.tod > 0.68) this.section('holiday', () => resolveHoliday(this));
    if (!this.meetingDone && this.tod > 0.62) { this.meetingDone = true; this.section('council', () => holdMeeting(this)) }
    if (this.tick % 240 === 0) this.section('roles', () => assignRoles(this));
    if (this.fog && this.tick % 40 === 0) this.section('fog', () => revealTick(this));
    if (this.tick % 100 === 0) {
      this.hist.push({ pop: this.vills.length, food: this.stock.food, wood: this.stock.wood, stone: this.stock.stone, season: this.season });
      if (this.hist.length > 1500) this.hist.shift();
    }
    const dt = nowMs() - t0; d.ticks++; d.tickMs += dt; if (dt > d.tickMax) d.tickMax = dt; d.lastTickAt = nowMs();
  }
}
