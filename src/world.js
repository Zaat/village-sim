'use strict';
/* ==========================================================================
   world.js — terrain generation, buildings, pathfinding, seasons, main step.
   ========================================================================== */
class World {
  constructor(seed) {
    this.seed = seed >>> 0; this.rng = mulberry32(this.seed);
    const N = CFG.W * CFG.H, { W, H } = CFG;
    this.terr = new Uint8Array(N); this.feat = new Uint8Array(N); this.res = new Uint8Array(N);
    this.road = new Uint8Array(N); this.bmap = new Int16Array(N); this.blk = new Uint8Array(N);
    this.storeAdj = new Uint8Array(N); this.bldAdj = new Uint8Array(N);
    this.shade = new Uint8Array(N); this.fish = new Uint8Array(N).fill(CFG.FISH_MAX); this.claim = new Int32Array(N).fill(-1);
    this._d = new Float32Array(N); this._p = new Int32Array(N); this._seen = new Int32Array(N); this._ds = new Int32Array(N); this._st = 0;
    this.buildings = new Map(); this.bnext = 1; this.bps = []; this.bpAt = new Map(); this.bpnext = 1;
    this.regrow = []; this.log = []; this.hist = []; this.listeners = []; this.connected = new Set();
    this.vills = []; this.animals = []; this.nextId = 1; this.tick = 0; this.rel = new Map();
    this.stock = { ...CFG.START_STOCK }; this.inbound = { wood: 0, stone: 0, food: 0 };
    this.nameUse = 0; this.births = 0; this.deaths = 0; this.causes = {};
    this.harsh = false; this.drought = false; this.cold = false; this.festival = false; this.fishOK = false;
    this.gen(); this.spawn();
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
  emit(type, text, data) { if (text) this.say(text); for (const f of this.listeners) { try { f(type, text, data) } catch (e) { console.error(e) } } }

  /* ----- generation ----- */
  gen() {
    const { W, H } = CFG, rng = this.rng, nz = makeNoise(rng);
    const e1 = nz(46), e2 = nz(20), e3 = nz(9), e4 = nz(4), m1 = nz(28), m2 = nz(11), r1 = nz(7);
    const E = new Float32Array(W * H), M = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let e = 0.5 * e1(x, y) + 0.3 * e2(x, y) + 0.15 * e3(x, y) + 0.05 * e4(x, y);
      e = (e - 0.5) * 1.6 + 0.5;
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
      e -= 0.34 * Math.pow(Math.min(1, Math.hypot(dx, dy) / 1.05), 2.6);
      E[i] = e; M[i] = 0.6 * m1(x, y) + 0.4 * m2(x, y); this.shade[i] = (rng() * 5) | 0;
      this.terr[i] = e < 0.28 ? TERR.DEEP : e < 0.34 ? TERR.SHALLOW : e < 0.37 ? TERR.SAND : e > 0.80 ? TERR.PEAK : e > 0.66 ? TERR.ROCK : TERR.GRASS;
    }
    this.E = E; this.M = M;
    // choose a start: flat grass, close to water, near hills, near the map middle
    let best = null, bs = -1e9;
    for (let y = 14; y < H - 14; y += 3) for (let x = 14; x < W - 14; x += 3) {
      let grass = 0; for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) if (this.terr[(y + dy) * W + x + dx] === TERR.GRASS) grass++;
      if (grass < 40) continue;
      let water = 0, rock = 0;
      for (let a = 0; a < 8; a++) for (const d of [9, 14, 20]) {
        const px = Math.round(x + Math.cos(a * 0.785) * d), py = Math.round(y + Math.sin(a * 0.785) * d); if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const t = this.terr[py * W + px]; if (t === TERR.SHALLOW) water++; if (t === TERR.ROCK) rock++;
      }
      const s = grass * 2 + Math.min(water, 6) * 8 + Math.min(rock, 6) * 5 - Math.hypot(x - W / 2, y - H / 2) * 0.8;
      if (s > bs) { bs = s; best = [x, y] }
    }
    [this.cx, this.cy] = best || [W >> 1, H >> 1];
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      const i = (this.cy + dy) * W + this.cx + dx; if (Math.hypot(dx, dy) < 7.5) this.terr[i] = TERR.GRASS;
    }
    // vegetation & resources
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = this.terr[i], m = M[i], e = E[i];
      if (Math.hypot(x - this.cx, y - this.cy) < 7.5) continue;
      if (t === TERR.GRASS) {
        const p = clamp((m - 0.46) * 2.4, 0, 0.78) * (0.55 + 0.9 * r1(x, y));
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
    // can villagers fish? (shallow water with walkable shore near camp)
    for (let y = 0; y < H && !this.fishOK; y++) for (let x = 0; x < W; x++) {
      if (this.terr[y * W + x] !== TERR.SHALLOW || Math.hypot(x - this.cx, y - this.cy) > 32) continue;
      for (const [dx, dy] of NB) { const j = (y + dy) * W + x + dx; if (this.terr[j] === TERR.GRASS || this.terr[j] === TERR.SAND) { this.fishOK = true; break } }
    }
    this.addBuilding('campfire', this.cx, this.cy);
    this.addBuilding('store', this.cx + CFG.LATTICE, this.cy);
    spawnWildlife(this);
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
      this.vills.push(new Villager(this, k % 2 ? 'f' : 'm', 10 + this.r() * 20, x, y)); k++;
    }
  }

  /* ----- buildings ----- */
  addBuilding(type, x, y) {
    const [w, h] = CFG.SIZE[type], b = { id: this.bnext++, type, x, y, w, h, occ: [], state: 0, g: 0, claim: 0 };
    this.buildings.set(b.id, b);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const i = (y + dy) * CFG.W + x + dx; this.bmap[i] = b.id; if (CFG.SOLID[type]) this.blk[i] = 1; this.road[i] = 0 }
    if (CFG.SOLID[type]) this.markAdj(b, type === 'store' ? this.storeAdj : null);
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
  cap() { return 60 + 100 * this.of('store').length }
  walkable(i) { const t = this.terr[i]; return (t === TERR.GRASS || t === TERR.SAND || t === TERR.ROCK) && this.feat[i] === 0 && this.blk[i] === 0 }
  nearStock(x, y, i) { return this.storeAdj[i] === 1 }
  nearRect(x, y, b) { const dx = x < b.x ? b.x - x : x >= b.x + b.w ? x - (b.x + b.w - 1) : 0, dy = y < b.y ? b.y - y : y >= b.y + b.h ? y - (b.y + b.h - 1) : 0; return dx + dy <= 1 }
  assignHome(v) {
    if (v.home != null) return;
    let best = null, bd = 1e9;
    for (const h of this.houses()) { if (h.occ.length >= CFG.HOUSE_CAP) continue; const d = Math.abs(h.x - this.cx) + Math.abs(h.y - this.cy); if (d < bd) { bd = d; best = h } }
    if (best) { best.occ.push(v.id); v.home = best.id }
  }
  pending() { const p = { wood: 0, stone: 0 }; for (const b of this.bps) for (const t of ['wood', 'stone']) p[t] += Math.max(0, b.cost[t] - b.have[t] - b.inc[t]); return p }
  complete(bp) {
    bp.alive = false; this.bps.splice(this.bps.indexOf(bp), 1);
    for (let dy = 0; dy < bp.h; dy++) for (let dx = 0; dx < bp.w; dx++) this.bpAt.delete((bp.y + dy) * CFG.W + bp.x + dx);
    if (bp.type === 'road') { this.road[bp.idx] = 1; return }
    this.addBuilding(bp.type, bp.x, bp.y);
    if (bp.type === 'house') this.say('A new cabin is finished.');
    if (bp.type === 'farm') this.say('A new field is ready for sowing.');
    if (bp.type === 'store') this.say('A storehouse is raised, so the village can keep more.');
  }

  /* ----- pathfinding: Dijkstra, roads cheap, sand/rock slightly dear ----- */
  search(sx, sy, goal, maxCost = 1e9) {
    const { W, H } = CFG, dist = this._d, prev = this._p, seen = this._seen, ds = this._ds, st = ++this._st;
    const s = sy * W + sx; dist[s] = 0; seen[s] = st; prev[s] = -1; const h = new Heap(); h.push(0, s);
    while (h.size) {
      const u = h.pop(); if (ds[u] === st) continue; ds[u] = st; const ux = u % W, uy = (u / W) | 0;
      if (goal(ux, uy, u)) { const path = []; let c = u; while (c !== s) { path.push(c); c = prev[c] } path.reverse(); return path }
      if (dist[u] > maxCost) continue;
      for (let k = 0; k < 4; k++) {
        const nx = ux + NB[k][0], ny = uy + NB[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const v = ny * W + nx; if (ds[v] === st || !this.walkable(v)) continue;
        const t = this.terr[v], nd = dist[u] + (this.road[v] ? 0.55 : t === TERR.GRASS ? 1 : t === TERR.SAND ? 1.15 : 1.4);
        if (seen[v] !== st || nd < dist[v]) { dist[v] = nd; seen[v] = st; prev[v] = u; h.push(nd, v) }
      }
    }
    return null;
  }

  /* ----- social ----- */
  relKey(a, b) { return a.id < b.id ? a.id + '_' + b.id : b.id + '_' + a.id }
  getRel(a, b) { return this.rel.get(this.relKey(a, b)) || 0 }
  interact(a, b) {
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
    if (f.preg > 0 || this.tick - f.lastBirth < CFG.BIRTH_COOLDOWN || f.age > CFG.FERTILE_MAX) return;
    if (this.vills.length + 1 > this.houses().length * CFG.HOUSE_CAP) return;
    if (this.stock.food < this.vills.length * 3.5) return;
    if (this.r() < CFG.BIRTH_CHANCE) { f.preg = CFG.PREGNANCY; f.father = m.id; this.say(`${f.name} is expecting a child.`) }
  }
  birth(f) {
    const dad = this.vills.find(v => v.id === f.father), c = new Villager(this, this.r() < 0.5 ? 'f' : 'm', 0, f.tx, f.ty, null, [f, dad]);
    c.home = f.home; if (f.home != null) { const h = this.buildings.get(f.home); if (h) h.occ.push(c.id) }
    this.vills.push(c); f.lastBirth = this.tick; this.births++;
    this.emit('birth', `${c.name} was born to ${f.name}${dad ? ' and ' + dad.name : ''}.`, { c, f });
  }
  kill(v, why) {
    v.alive = false; v.endJob(); this.vills.splice(this.vills.indexOf(v), 1); this.deaths++; this.causes[why] = (this.causes[why] || 0) + 1;
    for (const h of this.houses()) { const k = h.occ.indexOf(v.id); if (k >= 0) h.occ.splice(k, 1) }
    this.emit('death', `${v.name} ${why}.`, { v, why });
  }

  /* ----- calendar hooks ----- */
  onNewDay() {
    const s = this.season, pop = this.vills.length;
    if (this.seasonDay === 1 && this.day > 1) {
      if (s === 0) { this.harsh = false; this.say('Spring arrives. The snow melts and the fields stir.') }
      if (s === 1) this.say('Summer begins. Long warm days.')
      if (s === 2) { this.drought = false; this.say('Autumn comes. Time to bring in the harvest and stack firewood.') }
      if (s === 3) this.say('Winter settles in. The fields are frozen.');
      this.emit('season', null, { season: s });
    }
    this.stock.food = Math.floor(this.stock.food * (1 - (s === 1 ? 0.04 : 0.015)));
    if (s === 3) {
      const need = Math.ceil((this.vills.length * 0.5 + this.houses().length * 1 + 1) * (this.harsh ? 1.8 : 1));
      if (this.stock.wood >= need) { this.stock.wood -= need; if (this.cold) this.say('Warm hearths again; the cold has eased.'); this.cold = false }
      else { this.stock.wood = 0; if (!this.cold) this.emit('cold', 'The firewood has run out. The village is freezing!'); this.cold = true }
    } else this.cold = false;
    for (const k of ['wood', 'stone', 'food']) this.stock[k] = Math.min(this.stock[k], this.cap());
    animalsNewDay(this);
    townNewDay(this);
  }

  /* ----- main step ----- */
  step() {
    this.tick++;
    if (this.tick % CFG.TPD === 0) this.onNewDay();
    const g = GROW[this.season] * (this.drought ? 0.5 : 1);
    for (const b of this.buildings.values()) if (b.type === 'farm' && b.state === 1) { b.g += g / CFG.FARM_GROW; if (b.g >= 1) { b.state = 2; b.g = 1 } }
    if (this.tick % 50 === 0) for (let k = this.regrow.length - 1; k >= 0; k--) if (this.regrow[k].at <= this.tick && this.season < 3) { this.res[this.regrow[k].idx] = 4; this.regrow.splice(k, 1) }
    if (this.tick % 200 === 0 && this.season < 3) for (let i = 0; i < this.fish.length; i++) if (this.fish[i] < CFG.FISH_MAX && this.terr[i] === TERR.SHALLOW) this.fish[i]++;
    if (this.tick % 100 === 0 && this.season < 2) {      // saplings spread from existing woods
      for (let a = 0; a < 20; a++) {
        const x = 1 + ((this.r() * (CFG.W - 2)) | 0), y = 1 + ((this.r() * (CFG.H - 2)) | 0), i = y * CFG.W + x;
        if (this.terr[i] !== TERR.GRASS || this.feat[i] || this.bmap[i] || this.road[i] || this.bpAt.has(i) || this.claim[i] >= 0) continue;
        if (Math.hypot(x - this.cx, y - this.cy) < 8) continue;
        let near = false; for (const [dx, dy] of NB) { const f = this.feat[(y + dy) * CFG.W + x + dx]; if (f === FEAT.OAK || f === FEAT.PINE) { near = true; break } }
        if (near && this.r() < 0.5) { this.feat[i] = this.E[i] > 0.58 ? FEAT.PINE : FEAT.OAK; this.res[i] = 4 }
      }
    }
    for (const a of this.animals) if (a.alive) a.update();
    if (this.tick % 20 === 0) this.animals = this.animals.filter(a => a.alive);
    for (const v of this.vills.slice()) if (v.alive) v.update();
    if (this.tick % 60 === 0) planTown(this);
    if (this.tick % 240 === 0) assignRoles(this);
    if (this.tick % 100 === 0) {
      this.hist.push({ pop: this.vills.length, food: this.stock.food, wood: this.stock.wood, stone: this.stock.stone, season: this.season });
      if (this.hist.length > 1500) this.hist.shift();
    }
  }
}
