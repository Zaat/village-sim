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
    // society: identity, opinions, desires, story
    this.family = parents && (parents[1] || parents[0]) ? (parents[1] || parents[0]).family : SURNAMES[(w.r() * SURNAMES.length) | 0];
    this.partner = null; this.kids = []; this.parentIds = []; this.mood = 70; this.debates = 0; this.desire = null; this.nextDesire = w.day + 2; this.bio = []; this.reputation = 50; this.record = 0;
    this.duty = 0; this.stocksUntil = 0; this.group = null; this.friends = 0; this.enemies = 0; this.won = 0; this.mournUntil = 0;
    const t = this.trait, o = b => clamp((b - 0.5) * 1.8 + (g() - 0.5) * 0.8, -1, 1);
    this.op = { growth: o(0.4 * t.kind + 0.3 * t.soc + 0.3 * t.cur), labor: o(0.6 * (1 - t.ind) + 0.4 * t.soc), law: o(0.5 * (1 - t.kind) + 0.3 * t.brave + 0.2 * (1 - t.cur)), defense: o(0.6 * (1 - t.brave) + 0.2 * (1 - t.kind) + 0.2) };
    if (parents && parents[0]) for (const k of ISSUES) { const a = parents[0].op[k], b = parents[1] ? parents[1].op[k] : a; this.op[k] = clamp(0.6 * (a + b) / 2 + 0.4 * this.op[k], -1, 1) }
    this._st = this.stage();
  }
  isAdult() { return this.age >= CFG.ADULT_DAYS }
  isElder() { return this.age >= CFG.ELDER_DAYS }
  stage() { const a = this.age; return a < CFG.INFANT_DAYS ? 'infant' : a < CFG.CHILD_DAYS ? 'child' : a < CFG.ADULT_DAYS ? 'youth' : a < CFG.ELDER_DAYS ? 'adult' : 'elder' }
  story(text) { this.bio.push({ day: this.w.day, text }); if (this.bio.length > 16) this.bio.shift() }
  charisma() { const t = this.trait; return clamp(0.4 * t.soc + 0.25 * t.cur + 0.2 * t.kind + 0.15 * t.ind + (this.isElder() ? 0.12 : 0) + 0.1 * (this.reputation - 50) / 50, 0, 1) }
  onStage(st) {
    const w = this.w;
    if (st === 'child') this.story('Took first steps and began exploring the village.');
    else if (st === 'youth') this.story('Began learning a trade as an apprentice.');
    else if (st === 'adult') { this.story('Came of age and joined the grown folk of the village.'); w.say(`${this.name} has come of age.`); this.nextDesire = w.day }
    else if (st === 'elder') { this.story('Became an elder of the village.'); w.say(`${this.name} is now counted among the village elders.`) }
  }
  updateMood() {
    const w = this.w; let t = 50 + (this.hunger - 50) * 0.25 + (this.energy - 50) * 0.08 + (this.social - 50) * 0.12 + (this.health - 70) * 0.1;
    if (w.cold) t -= 15; t += Math.min(10, this.friends * 2.5) - Math.min(15, this.enemies * 4);
    let al = 0; for (const k of ISSUES) al += this.op[k] * w.gov.policy[k]; t += al * 4;
    if (this.partner != null) t += 6; if (this.home == null && this.isAdult()) t -= 6; if (this.mournUntil > w.tick) t -= 18; if (this.desire && w.day - this.desire.since > 40) t -= 4;
    this.mood += (clamp(t, 0, 100) - this.mood) * 0.25;
  }
  chooseDesire() {
    const t = this.trait, w = this.w, o = [];
    if (this.partner == null) o.push(['family', 1.1]);
    o.push(['master', 0.5 + t.ind]); if (t.soc > 0.45) o.push(['belong', 0.6 + t.soc]); if (t.cur > 0.4) o.push(['know', 0.3 + t.cur * 1.5]); o.push(['lead', 0.1 + this.charisma() * 1.5]); o.push(['fame', 0.2 + t.brave]);
    let tot = 0; for (const x of o) tot += x[1]; let r = w.r() * tot, pick = o[0][0]; for (const x of o) { r -= x[1]; if (r <= 0) { pick = x[0]; break } }
    this.desire = { kind: pick, key: pick === 'master' ? Object.entries(this.skill).sort((a, b) => b[1] - a[1])[0][0] : null, since: w.day };
    this.story(`Set their heart on a goal: ${this.desireText()}.`);
  }
  desireText() {
    const d = this.desire; if (!d) return '';
    return ({ family: 'to have a family of their own', master: 'to become a master ' + ({ wood: 'woodcutter', stone: 'stonecutter', farm: 'farmer', build: 'builder', hunt: 'hunter', fish: 'fisher' }[d.key]), belong: 'to belong to a close circle of friends', know: 'to understand the world and debate its great questions', lead: 'to lead the village', fame: 'to win glory at the games' })[d.kind];
  }
  checkDesire() {
    const w = this.w, d = this.desire; if (!this.isAdult()) return;
    if (!d) { if (w.day >= this.nextDesire) this.chooseDesire(); return }
    let ok = false;
    switch (d.kind) { case 'family': ok = this.partner != null && this.kids.length >= 1; break; case 'master': ok = this.skill[d.key] >= 0.8; break; case 'belong': ok = this.group != null && this.friends >= 3; break; case 'know': ok = this.debates >= 6; break; case 'lead': ok = w.gov.council.some(c => c.id === this.id); break; case 'fame': ok = this.won > 0; break }
    if (ok) { this.story(`Fulfilled a long-held dream: ${this.desireText()}.`); w.say(`${this.name} has fulfilled a dream: ${this.desireText()}.`); this.mood = Math.min(100, this.mood + 18); this.desire = null; this.nextDesire = w.day + 5 }
  }
  get tx() { return Math.floor(this.x) } get ty() { return Math.floor(this.y) }
  isChild() { return this.age < CFG.CHILD_DAYS }
  wt(base, key) {
    const w = this.w, st = this.isElder() ? 1.3 : this.stage() === 'youth' ? 1.35 : 1;
    return Math.max(4, Math.round(base * (1.25 - 0.4 * this.trait.ind) * (1 - 0.35 * (key ? this.skill[key] : 0)) * st * (1.12 - 0.24 * this.mood / 100) * (1 + 0.12 * w.gov.policy.labor)));
  }
  gain(key) { this.skill[key] = Math.min(1, this.skill[key] + (this.stage() === 'youth' ? 0.024 : 0.012)) }
  traitWords() { const o = []; for (const t of TRAITS) { if (this.trait[t] > 0.66) o.push(TRAIT_WORDS[t][1]); else if (this.trait[t] < 0.34) o.push(TRAIT_WORDS[t][0]) } return o }

  update() {
    const w = this.w, child = this.isChild();
    this.hunger = Math.max(0, this.hunger - (this.sleeping ? 0.02 : 0.04) * (child ? 0.6 : 1) * (w.settings.survival ? 1.25 : 1));
    this.energy = this.sleeping ? Math.min(100, this.energy + 0.15) : Math.max(0, this.energy - 0.025);
    this.social = Math.max(0, this.social - 0.012 - 0.025 * this.trait.soc);
    this.age += 1 / CFG.TPD;
    const stg = this.stage(); if (stg !== this._st) { this._st = stg; this.onStage(stg) }
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
      if (!this.path && !st.maxCost) this.path = w.search(this.tx, this.ty, st.goal, undefined, true);     // boxed in: hack through brush
      if (!this.path) { this.path = []; if (this.hunger < 30) { this.stuck = (this.stuck || 0) + 1; if (this.stuck >= 2) this.rescue() } this.abort(); return false }
    } else { st.t = st.ticks; this.sleeping = !!st.sleep; this.fighting = !!st.fight }
    return true;
  }
  move() {
    const w = this.w; let nxt = this.path[0]; if (nxt === undefined) return;
    if (w.passable(nxt)) w.clearTile(nxt);      // cutting through thick brush
    if (!w.walkable(nxt)) {
      const st = this.cur; if (!st.goal) { this.abort(); return }
      const p = w.search(this.tx, this.ty, st.goal, st.maxCost); if (!p) { this.abort(); return }
      this.path = p; if (!p.length) return; nxt = p[0];
    }
    const here = this.ty * CFG.W + this.tx, t = w.terr[here];
    let speed = (w.road[here] ? 0.16 : t === TERR.ROCK ? 0.07 : 0.09) * (this.age < CFG.INFANT_DAYS ? 0.6 : this.isChild() || this.isElder() ? 0.85 : 1) * (this.jobKind === 'flee' ? 1.5 : 1);
    if (w.season === 3 && !w.road[here]) speed *= 0.85;
    const nx = (nxt % CFG.W) + 0.5, ny = ((nxt / CFG.W) | 0) + 0.5, dx = nx - this.x, dy = ny - this.y, d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.01) this.dir = dx > 0 ? 1 : -1;
    if (d <= speed) { this.x = nx; this.y = ny; this.path.shift() } else { this.x += dx / d * speed; this.y += dy / d * speed }
  }
  rescue() {       // stranded and starving: they wade, climb and stumble their way back to camp
    const w = this.w; this.stuck = 0;
    for (let k = 0; k < 20; k++) { const x = Math.round(w.cx - 1 + (w.r() * 2 - 1) * 3), y = Math.round(w.cy + 1 + (w.r() * 2 - 1) * 3); if (w.walkable(y * CFG.W + x)) { this.x = x + 0.5; this.y = y + 0.5; this.path = []; this.story('Was stranded far from the village and struggled home half-starved.'); w.say(`${this.name} staggers back to the village, half-starved.`); return }
    }
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
    const watch = Math.max(0, w.gov.policy.defense); if (!wolf || wd > 9 + 3 * watch) return false;
    const fighter = !this.isChild() && (this.role === 'hunter' || this.trait.brave > 0.62 - 0.12 * watch || (this.trait.brave > 0.4 && w.vills.filter(v => v.fighting).length >= 1));
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
    if (this.hunger < (w.gov.welfare ? 55 : 40) && w.stock.food > 0) return this.planEat();
    if (w.isNight() || this.energy < 18) return this.planSleep();
    if (this.stocksUntil > w.tick) return this.planStocks();
    if (this.age < CFG.INFANT_DAYS) return this.planWander(3, true);
    if (this.isChild()) return this.planWander(7, true);
    const inCouncil = w.gov.council.some(c => c.id === this.id);
    if (w.tod > 0.52 && w.tod < 0.72 && (w.festival || (inCouncil && w.meetingDay === w.day && !w.meetingDone) || (this.social < 95 && w.r() < 0.35 + 0.55 * this.trait.soc))) return this.planFire();
    if (this.duty > w.tick && (this.planBuild() || this.planGather('wood'))) return;
    if (this.social < 40 + 30 * this.trait.soc && this.planSocial()) return;
    if (this.planWork()) return;
    if (this.social < 90 && this.planSocial()) return;
    this.planWander(6, false);
  }
  planStocks() {
    const w = this.w; this.jobKind = 'stocks';
    this.steps = [go((x, y) => Math.abs(x - w.cx) + Math.abs(y - w.cy) <= 2, null, 'Taken to the stocks', { maxCost: 90 }), work(Math.max(10, Math.ceil(this.stocksUntil - w.tick)), 'In the stocks', null)];
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
    const w = this.w, meet = w.meetingDay === w.day && !w.meetingDone && w.gov.council.some(c => c.id === this.id);
    for (let k = 0; k < 10; k++) {
      const gx = Math.round(w.cx + (w.r() * 2 - 1) * 3), gy = Math.round(w.cy + (w.r() * 2 - 1) * 3);
      if (!w.walkable(gy * CFG.W + gx)) continue;
      this.jobKind = 'fire'; const fest = w.festival;
      this.steps = [go((x, y) => x === gx && y === gy, null, meet ? 'To the council fire' : fest ? 'Off to the ' + w.holiday : 'To the campfire', { maxCost: 90 }),
      work(meet ? 220 : fest ? 200 : 140, meet ? 'In council session' : fest ? w.holiday : 'Talking by the fire', () => {
        let n = 0; for (const o of w.vills) { if (o === this || o.isChild() || o.sleeping || Math.hypot(o.x - this.x, o.y - this.y) > 4.5) continue; if (n >= 2) break; if (fest || w.r() < 0.55) { w.interact(this, o); n++ } }
        if (fest) this.social = Math.min(100, this.social + 40);
      })];
      return;
    }
  }
  planSocial() {
    const w = this.w; let best = null, bd = 1e9;
    for (const o of w.vills) {
      if (o === this || o.sleeping || o.isChild()) continue;
      const rel = w.getRel(this, o), d = Math.abs(o.x - this.x) + Math.abs(o.y - this.y) + (rel > 30 ? -6 : 0) + (rel < -30 ? 18 : 0) - (o.id === this.partner ? 8 : 0) - (this.desire && this.desire.kind === 'family' && this.partner == null && o.sex !== this.sex && o.isAdult() && o.partner == null ? 6 : 0) - (o.group && o.group === this.group ? 4 : 0) + w.r() * 4;
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
    const w = this.w, pop = w.vills.length, s = w.season, autumn = s === 2, winter = s === 3, { tgt, eff } = resourceTargets(w);
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
      if (w.res[tgt] === 0) { if (w.feat[tgt] === FEAT.BUSH) w.regrow.push({ idx: tgt, at: w.tick + 2400 }); else w.clearTile(tgt) }
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
    const amt = Math.round(CFG.FARM_YIELD * (0.8 + 0.5 * this.skill.farm) * (w.settings.survival ? 0.75 : 1));
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
