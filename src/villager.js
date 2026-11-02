'use strict';
/* ==========================================================================
   villager.js — individuals: personality, skills, needs, roles, jobs.
   A job is a list of lazy steps: {type:'go',goal} and {type:'work',ticks}.
   ========================================================================== */
const go = (goal, path, label, extra) => Object.assign({ type: 'go', goal, path, label }, extra);
const work = (ticks, label, done, extra) => Object.assign({ type: 'work', ticks, label, done }, extra);

class Villager {
  constructor(w, sex, age, x, y, traits, parents) {
    this.w = w; this.id = w.nextId++; this.sex = sex; this.age = age;
    const list = sex === 'f' ? NAMES_F : NAMES_M, n = w.nameUse++;
    this.name = list[n % list.length] + (n >= list.length * 2 ? ' ' + (1 + (n / list.length | 0)) : '');
    this.x = x + 0.5; this.y = y + 0.5; this.alive = true; this.look = (hash2(this.id, 7) % 1000);
    this.trait = {};
    const g = () => (w.r() + w.r() + w.r()) / 3;
    for (const t of TRAITS) {
      if (parents && parents[0]) { const a = parents[0].trait[t], b = parents[1] ? parents[1].trait[t] : a; this.trait[t] = clamp((a + b) / 2 + (g() - 0.5) * 0.5, 0.02, 0.98) }
      else this.trait[t] = clamp(0.5 + (g() - 0.5) * 1.5, 0.03, 0.97);
    }
    this.skill = { wood: w.r() * 0.25, stone: w.r() * 0.25, farm: w.r() * 0.25, build: w.r() * 0.25, hunt: w.r() * 0.25, fish: w.r() * 0.25 };
    if (age < 1) for (const k in this.skill) this.skill[k] = 0;
    this.role = null;
    this.hunger = 75 + w.r() * 25; this.energy = 70 + w.r() * 30; this.social = 50 + w.r() * 40; this.health = 100;
    this.carry = null; this.steps = []; this.cur = null; this.path = []; this.label = 'Idle';
    this.home = null; this.sleeping = false; this.preg = 0; this.father = null; this.lastBirth = -1e9; this.wait = 0;
    this.claim = -1; this.claimB = null; this.inb = null; this.haul = null; this.bpWork = null; this.jobKind = null; this.failUntil = {};
    this.dir = 1; this.fighting = false; this.cause = 'hunger'; this.emote = null;
  }
  get tx() { return Math.floor(this.x) } get ty() { return Math.floor(this.y) }
  isChild() { return this.age < CFG.CHILD_DAYS }
  wt(base, key) { return Math.max(4, Math.round(base * (1.25 - 0.4 * this.trait.ind) * (1 - 0.35 * (key ? this.skill[key] : 0)))) }
  gain(key) { this.skill[key] = Math.min(1, this.skill[key] + 0.012) }
  traitWords() { const o = []; for (const t of TRAITS) { if (this.trait[t] > 0.66) o.push(TRAIT_WORDS[t][1]); else if (this.trait[t] < 0.34) o.push(TRAIT_WORDS[t][0]) } return o }

  update() {
    const w = this.w, child = this.isChild();
    this.hunger = Math.max(0, this.hunger - (this.sleeping ? 0.02 : 0.04) * (child ? 0.6 : 1));
    this.energy = this.sleeping ? Math.min(100, this.energy + 0.15) : Math.max(0, this.energy - 0.025);
    this.social = Math.max(0, this.social - 0.012 - 0.025 * this.trait.soc);
    this.age += 1 / CFG.TPD;
    if (this.hunger <= 0) { this.health -= 0.05; this.cause = 'hunger' }
    else if (this.hunger > 40 && this.health < 100) this.health = Math.min(100, this.health + 0.02);
    if (w.cold) { this.health -= 0.012; this.cause = 'cold' }
    if (this.health <= 0) { w.kill(this, this.cause === 'wolf' ? 'was killed by a wolf' : this.cause === 'cold' ? 'froze to death' : this.cause === 'fever' ? 'succumbed to the fever' : 'starved'); return }
    if (this.age > CFG.OLD_DAYS && w.r() < ((this.age - CFG.OLD_DAYS) * 0.03) / CFG.TPD) { w.kill(this, 'passed away peacefully of old age'); return }
    if (this.preg > 0) { this.preg--; if (this.preg === 0) w.birth(this) }
    if ((w.tick + this.id) % 10 === 0 && !this.sleeping && this.checkDanger()) return;
    if (this.hunger < 18 && w.stock.food > 0 && this.jobKind !== 'eat' && this.jobKind !== 'flee' && !this.carry && !this.sleeping) { this.abort(0); this.planEat() }

    if (!this.cur) {
      if (this.steps.length) { this.cur = this.steps.shift(); if (!this.begin()) return }
      else {
        this.endJob(); this.label = 'Idle'; this.emote = null;
        if (this.wait > 0) { this.wait--; return }
        this.decide(); if (!this.steps.length) this.wait = 20;
        return;
      }
    }
    const st = this.cur;
    if (st.type === 'go') { this.move(); if (this.cur && this.path.length === 0) this.cur = null }
    else {
      const fin = st.until ? (st.until() || --st.t <= 0) : --st.t <= 0;
      if (fin) { this.sleeping = false; this.fighting = false; const d = st.done; this.cur = null; if (d) d() }
    }
  }
  begin() {
    const st = this.cur, w = this.w;
    if (st.check && !st.check()) { this.abort(0); return false }
    if (st.label) this.label = st.label;
    if (st.type === 'go') {
      this.path = st.path || w.search(this.tx, this.ty, st.goal, st.maxCost); st.path = null;
      if (!this.path) { this.path = []; this.abort(); return false }
    } else { st.t = st.ticks; this.sleeping = !!st.sleep; this.fighting = !!st.fight }
    return true;
  }
  move() {
    const w = this.w; let nxt = this.path[0]; if (nxt === undefined) return;
    if (!w.walkable(nxt)) {
      const st = this.cur; if (!st.goal) { this.abort(); return }
      const p = w.search(this.tx, this.ty, st.goal, st.maxCost); if (!p) { this.abort(); return }
      this.path = p; if (!p.length) return; nxt = p[0];
    }
    const here = this.ty * CFG.W + this.tx, t = w.terr[here];
    let speed = (w.road[here] ? 0.16 : t === TERR.ROCK ? 0.07 : 0.09) * (this.isChild() ? 0.85 : 1) * (this.jobKind === 'flee' ? 1.5 : 1);
    if (w.season === 3 && !w.road[here]) speed *= 0.85;
    const nx = (nxt % CFG.W) + 0.5, ny = ((nxt / CFG.W) | 0) + 0.5, dx = nx - this.x, dy = ny - this.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.01) this.dir = dx > 0 ? 1 : -1;
    if (d <= speed) { this.x = nx; this.y = ny; this.path.shift() } else { this.x += dx / d * speed; this.y += dy / d * speed }
  }
  abort(wait = 30) { this.steps = []; this.cur = null; this.path = []; this.sleeping = false; this.fighting = false; this.carry = null; this.endJob(); this.wait = wait }
  endJob() {
    const w = this.w;
    if (this.claim >= 0) { w.claim[this.claim] = -1; this.claim = -1 }
    if (this.claimB) { this.claimB.claim = 0; this.claimB = null }
    if (this.inb) { w.inbound[this.inb.kind] -= this.inb.amt; this.inb = null }
    if (this.haul) { if (!this.haul.done && this.haul.bp.alive) this.haul.bp.inc[this.haul.type] -= this.haul.amt; this.haul = null }
    if (this.bpWork) { this.bpWork.workers--; this.bpWork = null }
    this.jobKind = null;
  }

  /* ----- danger: wolves ----- */
  checkDanger() {
    const w = this.w; let wolf = null, wd = 99;
    for (const a of w.animals) if (a.kind === 'wolf' && a.alive) { const d = Math.hypot(a.x - this.x, a.y - this.y); if (d < wd) { wd = d; wolf = a } }
    if (!wolf || wd > 9) return false;
    const fighter = !this.isChild() && (this.role === 'hunter' || this.trait.brave > 0.62 || (this.trait.brave > 0.4 && w.vills.filter(v => v.fighting).length >= 1));
    if (fighter) { if (this.jobKind !== 'fight') { this.abort(0); this.planFight(wolf) } return true }
    if (this.jobKind !== 'flee') { this.abort(0); this.planFlee() }
    return true;
  }
  planFight(wolf) {
    this.jobKind = 'fight';
    this.steps = [go((x, y) => Math.hypot(x + 0.5 - wolf.x, y + 0.5 - wolf.y) <= 2.2, null, 'Charging the wolf'), work(15, 'Fighting the wolf', null, { fight: true })];
  }
  planFlee() {
    const w = this.w; this.jobKind = 'flee'; this.emote = '!';
    this.steps = [go((x, y, i) => w.bldAdj[i] === 1, null, 'Fleeing!'), work(160, 'Hiding indoors', null)];
  }

  /* ----- decision making: a priority list shaped by personality ----- */
  decide() {
    const w = this.w;
    if (this.checkDanger()) return;
    if (this.hunger < 40 && w.stock.food > 0) return this.planEat();
    if (w.isNight() || this.energy < 18) return this.planSleep();
    if (this.isChild()) return this.planWander(7, true);
    if (w.tod > 0.52 && w.tod < 0.72 && (w.festival || (this.social < 95 && w.r() < 0.35 + 0.55 * this.trait.soc))) return this.planFire();
    if (this.social < 40 + 30 * this.trait.soc && this.planSocial()) return;
    if (this.planWork()) return;
    if (this.social < 90 && this.planSocial()) return;
    this.planWander(6, false);
  }
  planEat() {
    const w = this.w; this.jobKind = 'eat';
    this.steps = [go((x, y, i) => w.nearStock(x, y, i), null, 'To the stores'), work(8, 'Eating', () => { if (w.stock.food > 0) { w.stock.food--; this.hunger = Math.min(100, this.hunger + CFG.EAT_RESTORE) } })];
  }
  planSleep() {
    const w = this.w; this.jobKind = 'sleep'; w.assignHome(this);
    const hb = this.home != null ? w.buildings.get(this.home) : null;
    const goal = hb ? (x, y) => w.nearRect(x, y, hb) : (x, y, i) => w.nearStock(x, y, i);
    this.steps = [go(goal, null, 'Heading to bed'), work(1200, 'Sleeping', null, { sleep: true, until: () => (!w.isNight() && this.energy >= 55) || this.energy >= 100 })];
  }
  planWander(r, home) {
    const w = this.w;
    for (let k = 0; k < 8; k++) {
      const bx = home ? w.cx : this.tx, by = home ? w.cy : this.ty, gx = Math.round(bx + (w.r() * 2 - 1) * r), gy = Math.round(by + (w.r() * 2 - 1) * r);
      if (gx < 1 || gy < 1 || gx >= CFG.W - 1 || gy >= CFG.H - 1 || !w.walkable(gy * CFG.W + gx)) continue;
      this.jobKind = 'wander'; this.steps = [go((x, y) => x === gx && y === gy, null, 'Wandering', { maxCost: 40 }), work(40 + (w.r() * 80 | 0), 'Idling', null)]; return;
    }
  }
  planFire() {
    const w = this.w;
    for (let k = 0; k < 10; k++) {
      const gx = Math.round(w.cx + (w.r() * 2 - 1) * 3), gy = Math.round(w.cy + (w.r() * 2 - 1) * 3);
      if (!w.walkable(gy * CFG.W + gx)) continue;
      this.jobKind = 'fire'; const fest = w.festival;
      this.steps = [go((x, y) => x === gx && y === gy, null, fest ? 'Off to the festival' : 'To the campfire', { maxCost: 90 }),
      work(fest ? 200 : 140, fest ? 'Feasting by the fire' : 'Talking by the fire', () => {
        let n = 0; for (const o of w.vills) { if (o === this || o.isChild() || o.sleeping || Math.hypot(o.x - this.x, o.y - this.y) > 4.5) continue; if (n >= 3) break; if (fest || w.r() < 0.55) { w.interact(this, o); n++ } }
        if (fest) this.social = Math.min(100, this.social + 40);
      })];
      return;
    }
  }
  planSocial() {
    const w = this.w; let best = null, bd = 1e9;
    for (const o of w.vills) {
      if (o === this || o.sleeping || o.isChild()) continue;
      const d = Math.abs(o.x - this.x) + Math.abs(o.y - this.y) + (w.getRel(this, o) > 30 ? -6 : 0) - (o.sex !== this.sex ? 3 : 0) + w.r() * 4;
      if (d < bd) { bd = d; best = o }
    }
    if (!best) return false;
    const o = best, ox = o.tx, oy = o.ty; this.jobKind = 'social';
    this.steps = [go((x, y) => Math.abs(x - ox) + Math.abs(y - oy) <= 1, null, 'Looking for ' + o.name, { maxCost: 70 }),
    work(50, 'Chatting with ' + o.name, () => { if (o.alive && Math.abs(o.x - this.x) + Math.abs(o.y - this.y) <= 3) w.interact(this, o); else this.social = Math.min(100, this.social + 8) })];
    return true;
  }

  /* ----- work: role first, then whatever the village lacks ----- */
  planWork() {
    const w = this.w, pop = w.vills.length, pend = w.pending(), s = w.season, autumn = s === 2, winter = s === 3, cap = w.cap();
    const tgt = {
      wood: 16 + 3 * pop + pend.wood + (autumn ? pop * 3 + w.houses().length * 6 : 0) + (winter ? pop * 2 : 0), stone: 6 + 2 * pop + pend.stone,
      food: 10 + 4 * pop + (autumn ? pop * 8 : 0) + (s === 1 ? pop * 3 : 0)
    };
    for (const k in tgt) tgt[k] = Math.min(tgt[k], cap * 0.95);
    const eff = { wood: w.stock.wood + w.inbound.wood, stone: w.stock.stone + w.inbound.stone, food: w.stock.food + w.inbound.food };
    const def = {}; for (const k in tgt) def[k] = (tgt[k] - eff[k]) / tgt[k];
    const tries = [], T = (name, fn) => tries.push([name, fn]);
    const foodAny = () => this.planFarm() || (this.role === 'fisher' ? this.planFish() || this.planHunt() : this.planHunt() || this.planFish()) || this.planGather('food');
    if (w.stock.food < pop * 1.5) T('crisis', foodAny);
    switch (this.role) {
      case 'builder': T('build', () => this.planBuild()); break;
      case 'farmer': if (!winter) T('farm', () => this.planFarm()); break;
      case 'woodcutter': T('wood', () => def.wood > -0.1 && this.planGather('wood')); break;
      case 'miner': T('stone', () => def.stone > -0.1 && this.planGather('stone')); break;
      case 'hunter': T('hunt', () => def.food > -0.2 && this.planHunt()); break;
      case 'fisher': T('fish', () => def.food > -0.2 && this.planFish()); break;
    }
    const builders = w.vills.filter(v => v.jobKind === 'build' || v.jobKind === 'haul').length;
    if (builders < Math.max(1, Math.ceil(w.vills.length / 6))) T('build2', () => this.planBuild());
    const order = Object.keys(def).sort((a, b) => def[b] - def[a]);
    for (const k of order) if (def[k] > 0) T(k, () => k === 'food' ? foodAny() : this.planGather(k));
    for (const [name, fn] of tries) {
      if ((this.failUntil[name] || 0) > w.tick) continue;
      if (fn()) return true; this.failUntil[name] = w.tick + 250;
    }
    return false;
  }
  deliverSteps() {
    const w = this.w;
    return [go((x, y, i) => w.nearStock(x, y, i), null, 'Carrying to stores', { check: () => !!this.carry }), work(6, 'Storing', () => { if (this.carry) { w.stock[this.carry.kind] = Math.min(w.cap(), w.stock[this.carry.kind] + this.carry.amt); this.carry = null } })];
  }
  planGather(kind) {
    const w = this.w;
    if (kind === 'food' && w.season >= 3) return false;
    let tgt = -1;
    const path = w.search(this.tx, this.ty, (x, y) => {
      for (const [dx, dy] of NB) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= CFG.W || ny >= CFG.H) continue; const n = ny * CFG.W + nx, f = w.feat[n];
        const ok = kind === 'wood' ? (f === FEAT.OAK || f === FEAT.PINE) : kind === 'stone' ? f === FEAT.STONE : f === FEAT.BUSH && w.res[n] > 0;
        if (ok && w.claim[n] < 0) { tgt = n; return true }
      } return false;
    }, 75);
    if (!path || tgt < 0) return false;
    w.claim[tgt] = this.id; this.claim = tgt; this.jobKind = 'gather';
    const amt = Math.min(CFG.CARRY, w.res[tgt]); this.inb = { kind, amt }; w.inbound[kind] += amt;
    const key = kind === 'wood' ? 'wood' : kind === 'stone' ? 'stone' : null, time = this.wt(kind === 'wood' ? 60 : kind === 'stone' ? 80 : 35, key);
    this.steps = [go(null, path, 'Heading out'), work(time, kind === 'wood' ? 'Chopping wood' : kind === 'stone' ? 'Quarrying stone' : 'Picking berries', () => {
      const take = Math.min(CFG.CARRY, w.res[tgt]); w.res[tgt] -= take;
      if (w.res[tgt] === 0) { if (w.feat[tgt] === FEAT.BUSH) w.regrow.push({ idx: tgt, at: w.tick + 2400 }); else w.feat[tgt] = FEAT.NONE }
      this.carry = { kind, amt: take }; if (key) this.gain(key);
    }), ...this.deliverSteps()];
    return true;
  }
  planFarm() {
    const w = this.w, s = w.season; let fb = null;
    const path = w.search(this.tx, this.ty, (x, y, i) => {
      const id = w.bmap[i]; if (!id) return false; const b = w.buildings.get(id);
      if (b && b.type === 'farm' && !b.claim && (b.state === 2 || (b.state === 0 && s < 2))) { fb = b; return true } return false;
    }, 90);
    if (!path || !fb) return false;
    const b = fb, harvest = b.state === 2; b.claim = this.id; this.claimB = b; this.jobKind = 'farm';
    const amt = Math.round(CFG.FARM_YIELD * (0.8 + 0.5 * this.skill.farm));
    this.steps = [go(null, path, 'To the field'), work(this.wt(harvest ? 55 : 40, 'farm'), harvest ? 'Harvesting' : 'Sowing seeds', () => {
      if (harvest && b.state === 2) { this.carry = { kind: 'food', amt }; b.state = 0; b.g = 0; this.gain('farm') } else if (!harvest && b.state === 0) { b.state = 1; b.g = 0; this.gain('farm') }
    })];
    if (harvest) { this.inb = { kind: 'food', amt }; w.inbound.food += amt; this.steps.push(...this.deliverSteps()) }
    return true;
  }
  planHunt() {
    const w = this.w; let best = null, bd = 48;
    for (const a of w.animals) { if (!a.alive || a.kind === 'wolf') continue; const d = Math.hypot(a.x - this.x, a.y - this.y); if (d < bd) { bd = d; best = a } }
    if (!best) return false;
    const a = best; this.jobKind = 'hunt';
    this.steps = [go((x, y) => Math.hypot(x + 0.5 - a.x, y + 0.5 - a.y) <= 5.2, null, 'Stalking ' + (a.kind === 'deer' ? 'a deer' : 'a rabbit'), { maxCost: 70, check: () => a.alive }),
    work(this.wt(25, 'hunt'), 'Taking aim', () => {
      if (a.alive && Math.hypot(a.x - this.x, a.y - this.y) <= 7.5 && w.r() < 0.5 + 0.45 * this.skill.hunt) { a.alive = false; this.carry = { kind: 'food', amt: a.kind === 'deer' ? 10 : 3 }; this.gain('hunt'); this.gain('hunt') }
    }), ...this.deliverSteps()];
    return true;
  }
  planFish() {
    const w = this.w; if (!w.fishOK) return false; let spot = -1, wt = -1;
    const path = w.search(this.tx, this.ty, (x, y, i) => {
      if (w.claim[i] >= 0) return false;
      for (const [dx, dy] of NB) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < CFG.W && ny < CFG.H) { const j = ny * CFG.W + nx; if (w.terr[j] === TERR.SHALLOW && w.fish[j] > 0) { spot = i; wt = j; return true } } } return false;
    }, 80);
    if (!path || spot < 0) return false;
    w.claim[spot] = this.id; this.claim = spot; this.jobKind = 'fish'; const amt = 2 + (this.skill.fish > 0.6 ? 1 : 0); this.inb = { kind: 'food', amt }; w.inbound.food += amt;
    this.steps = [go(null, path, 'To the shore'), work(this.wt(100, 'fish'), 'Fishing', () => { if (w.fish[wt] > 0) { w.fish[wt]--; this.carry = { kind: 'food', amt }; this.gain('fish') } }), ...this.deliverSteps()];
    return true;
  }
  planBuild() {
    const w = this.w, near = bp => (x, y) => w.nearRect(x, y, bp);
    for (const bp of w.bps) {
      if (bp.ready() && bp.workers < 2) {
        bp.workers++; this.bpWork = bp; this.jobKind = 'build'; const chunk = Math.min(30, bp.time - bp.prog);
        this.steps = [go(near(bp), null, 'To the building site', { maxCost: 120 }), work(this.wt(chunk, 'build'), 'Building a ' + bp.type, () => { if (!bp.alive) return; bp.prog += chunk; this.gain('build'); if (bp.prog >= bp.time) w.complete(bp) }, { check: () => bp.alive })];
        return true;
      }
    }
    for (const bp of w.bps) for (const type of ['wood', 'stone']) {
      const need = bp.cost[type] - bp.have[type] - bp.inc[type];
      if (need > 0 && w.stock[type] > 0) {
        const amt = Math.min(need, CFG.CARRY, w.stock[type]); bp.inc[type] += amt; const h = this.haul = { bp, type, amt, done: false }; this.jobKind = 'haul';
        this.steps = [go((x, y, i) => w.nearStock(x, y, i), null, 'Fetching ' + type), work(6, 'Loading ' + type, () => {
          const take = Math.min(h.amt, w.stock[type]); w.stock[type] -= take; bp.inc[type] -= (h.amt - take); h.amt = take; if (take > 0) this.carry = { kind: type, amt: take };
        }), go(near(bp), null, 'Hauling ' + type, { maxCost: 150 }), work(6, 'Delivering ' + type, () => { if (this.carry && bp.alive) { bp.have[type] += h.amt; bp.inc[type] -= h.amt; h.done = true } this.carry = null }, { check: () => bp.alive && !!this.carry })];
        return true;
      }
    }
    return false;
  }
}
