'use strict';
/* ==========================================================================
   outposts.js — v0.21 settlements and expansion.
   The council can send a party of settlers to found an outpost: a logging or
   quarry camp, a fishing station or a farming hamlet, on land (by foot) or
   over the water (by ship). An outpost is a light record, not a second
   simulation: it feeds itself, grows (camp, hamlet, village, town), and
   every few days sends a share of what it makes home along a visible route.
   Whether to found one is weighed against its cost (settlers, supplies,
   risk); how long an outpost stays loyal depends on the share taken, the
   distance, hunger and the help it gets. A neglected outpost can break away
   and become a neighbour of its own.
   ========================================================================== */
const OUT_ROLES = {
  timber: { label: 'logging outpost', key: 'wood', rate: 0.5, verb: 'fell timber' },
  quarry: { label: 'quarry outpost', key: 'stone', rate: 0.38, verb: 'cut stone' },
  farming: { label: 'farming hamlet', key: 'food', rate: 1.05, verb: 'work the fields' },
  fishing: { label: 'fishing station', key: 'food', rate: 1.2, verb: 'fish the shore' }
};
const OUT_STAGES = ['camp', 'hamlet', 'village', 'town'], OUT_STAGE_POP = [0, 8, 18, 32];
const OUT_NAMES = ['Ash', 'Birch', 'Cold', 'Dun', 'East', 'Fair', 'Gull', 'Hollow', 'Iron', 'Kelp', 'Lark', 'Mill', 'North', 'Oak', 'Pine', 'Reed', 'Salt', 'Thorn', 'West', 'Wren'];
const OUT_TAILS = ['field', 'holt', 'stead', 'reach', 'rest', 'end', 'cross', 'wick', 'bury', 'garth'];
const OUT_SPEED = { land: 18, sea: 26 };                  // tiles a party or a cart covers per day
const outPrice = { wood: 3, stone: 4, food: 2 };

function initOutposts(w) { w.out = { list: [], next: 1, nextPlan: 40, founded: 0, failed: 0, freed: 0, broke: 0, last: null, sent: { food: 0, wood: 0 }, back: { food: 0, wood: 0, stone: 0 }, lost: 0, hauls: 0, log: [] } }
const OP = w => w.out || (initOutposts(w), w.out);
const outLog = (w, text) => { const S = OP(w); S.log.unshift(`D${w.day}: ${text}`); if (S.log.length > 8) S.log.pop() };
const outpostsAlive = w => OP(w).list.filter(o => o.state !== 'gone');
const outCap = w => Math.min(5, 1 + Math.floor(w.pop / 22));

/* ----- where could we settle? ----- */
function homeTile(w) { return { x: w.cx, y: w.cy + 2 } }
function siteRead(w, x, y) {          // what lies around a site: trees, stone, grass, shore, fish
  const { W, H } = CFG; let trees = 0, stone = 0, rock = 0, grass = 0, shore = 0, fish = 0, land = 0;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const xx = x + dx, yy = y + dy; if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1 || dx * dx + dy * dy > 40) continue; const i = yy * W + xx, t = w.terr[i], f = w.feat[i];
    if (t >= TERR.SAND) land++;
    if (f === FEAT.OAK || f === FEAT.PINE) trees++; else if (f === FEAT.STONE) stone++;
    if (t === TERR.ROCK) rock++; else if (t === TERR.GRASS && !f) grass++;
    if (t <= TERR.SHALLOW) { fish += w.fish[i]; if (dx * dx + dy * dy <= 30) { for (const [ax, ay] of NB) { const j = (yy + ay) * W + xx + ax; if (w.terr[j] >= TERR.SAND) { shore++; break } } } }
  }
  return { trees, stone, rock, grass, shore, fish: shore ? fish / Math.max(1, shore + 4) / 5 : 0, land };
}
function richness(s) {
  return { timber: Math.min(1.5, s.trees / 22), quarry: Math.min(1.5, (s.stone + 0.3 * s.rock) / 11), farming: Math.min(1.5, s.grass / 45 * (1 - Math.min(0.8, s.trees / 60))), fishing: Math.min(1.5, s.shore / 9 * Math.min(1.3, 0.5 + s.fish)) };
}
function outWants(w) {          // how much the village needs each product right now
  const pop = w.pop, forest = w.trees0 ? w.trees / w.trees0 : 1;
  return {
    timber: w.stock.wood < 30 + pop || forest < 0.6 ? 1 : 0.35, quarry: w.stock.stone < 20 + pop * 0.5 ? 0.95 : 0.3,
    farming: w.stock.food < pop * 3 ? 0.9 : 0.4, fishing: w.stock.food < pop * 3 ? 0.85 : 0.35
  };
}
function expandPressure(w) {
  const pop = w.pop, free = w.beds() - pop, g = w.gov.policy.growth;
  const forest = w.trees0 ? w.trees / w.trees0 : 1;
  return clamp((pop >= 30 ? 0.15 : 0) + (pop >= 50 ? 0.15 : 0) + (pop >= 70 ? 0.25 : 0) + (pop >= 110 ? 0.2 : 0) + (free <= 1 && pop >= 20 ? 0.35 : 0) + (w.stock.wood < 25 || forest < 0.55 ? 0.35 : 0) + (w.stock.stone < 12 ? 0.2 : 0) + (w.stock.food < pop * 2.5 ? 0.25 : 0) + 0.3 * g, 0, 1.4);
}
function expandAppetite(w) {      // regime and policy: bold, industrial and open towns expand; wary, communal ones less
  const rx = w.rx; if (!rx) return 1; if (w.gov.policy.growth < -0.75) return 0.2;
  return clamp(1 + 0.8 * rx.O + 0.4 * (w.regime && w.regime.ax ? w.regime.ax.indus - 0.5 : 0) - 0.5 * rx.P - 0.3 * rx.C + 0.3 * w.gov.policy.growth, 0.2, 2);
}
const outFar = (w, x, y) => Math.hypot(x - w.cx, y - w.cy);

/* a land route on foot; a sea route from a dock; both cached on the record's plan and never saved */
function outLandRoute(w, x, y) {
  const goal = (xx, yy) => Math.abs(xx - x) + Math.abs(yy - y) <= 2, h = homeTile(w);
  return w.search(h.x, h.y, goal, 900) || w.search(h.x, h.y, goal, 900, true) || null;
}
function outSeaRoute(w, x, y) {
  if (!w.has('boats')) return null; const docks = w.of('dock').filter(d => d.dir); if (!docks.length) return null;
  const d = docks.reduce((a, b) => (Math.hypot(a.x - x, a.y - y) < Math.hypot(b.x - x, b.y - y) ? a : b)), boat = { mx: d.x + 0.5 + d.dir[0], my: d.y + 0.5 + d.dir[1] };
  const p = seaPath(w, boat, { cx: x, cy: y, r: 2 }); return p ? { path: p, dock: d.id } : null;
}
function routeDays(len, mode) { return Math.max(1, Math.ceil(len / OUT_SPEED[mode])) }

function findOutpostSites(w, want) {
  const { W, H } = CFG, taken = [...outpostsAlive(w).map(o => ({ x: o.x, y: o.y, r: 14 })), ...(w.neigh || []).map(n => ({ x: n.x, y: n.y, r: (n.r || 10) + 8 }))];
  const canSea = w.has('boats') && w.of('dock').length > 0, wants = outWants(w), out = [];
  const h = homeTile(w), regs = landRegions(w), home = regs.label[h.y * W + h.x];
  const bl = [...w.buildings.values()].map(b => [b.x, b.y]); let reach = 0; for (const [bx, by] of bl) reach = Math.max(reach, Math.hypot(bx - w.cx, by - w.cy));       // never within the village's own sprawl
  for (let y = 6; y < H - 6; y += 3) for (let x = 6; x < W - 6; x += 3) {
    const i = y * W + x; if (w.terr[i] !== TERR.GRASS || w.feat[i] || w.bmap[i]) continue; if (w.seen && !w.seen[i]) continue;
    const d = outFar(w, x, y); if (d < Math.max(28, reach + 12) || d > 150) continue; if (bl.some(([bx, by]) => Math.hypot(bx - x, by - y) < 16)) continue; if (taken.some(t => Math.hypot(t.x - x, t.y - y) < t.r)) continue;
    const s = siteRead(w, x, y); if (s.land < 40) continue; const rich = richness(s), same = regs.label[i] === home;
    if (!same && !canSea) continue; if (same && d > 95) continue;
    for (const role in rich) { const sc = rich[role] * wants[role] / (1 + d / 90); if (rich[role] >= 0.55) out.push({ x, y, role, rich: rich[role], score: sc, d, same, read: s }) }
  }
  out.sort((a, b) => b.score - a.score); const picked = [];
  for (const c of out) { if (picked.length >= 4) break; if (picked.some(p => Math.hypot(p.x - c.x, p.y - c.y) < 14)) continue; picked.push(c) }
  return picked;
}

/* ----- the plan: gain, cost, risk, then the council ----- */
function planOutpost(w) {
  const sites = findOutpostSites(w), n = clamp(Math.round(w.pop * 0.14), 4, 9); let best = null;
  for (const s of sites) {
    let mode = 'land', route = null, days = 0;
    if (s.same) { route = outLandRoute(w, s.x, s.y); if (route) days = routeDays(route.length, 'land') }
    if (!route) { const sr = outSeaRoute(w, s.x, s.y); if (sr) { mode = 'sea'; route = sr.path; days = routeDays(route.length, 'sea') } }
    if (!route) continue;
    const role = OUT_ROLES[s.role], workers = n * 0.65, horizon = 110, share = outShare(w, null), rate = role.rate * s.rich * (w.has('tools') ? 1.1 : 1);
    const gain = rate * workers * Math.max(0, horizon - days - 14) * outPrice[role.key] * share * 0.85;
    const food = Math.round(n * 2.2 + days * n * 0.7), wood = 6 + n, supplies = food * outPrice.food + wood * outPrice.wood;
    const risk = (mode === 'sea' ? 0.12 : 0.07) + (w.season === 3 ? 0.05 : 0), cb = costBenefit(w, { gain, cost: supplies, risk, stake: supplies + n * 20, days: days + 6, crew: n * 0.7, min: 1.6 });
    const plan = { ...s, mode, route, days, n, food, wood, share, cb, gain, risk };
    if (!best || cb.ratio * s.score > best.cb.ratio * best.score) best = plan;
  }
  return best;
}
function outShare(w, o) {         // the share of an outpost's surplus that comes home
  const tax = w.gov.policy.tax; return clamp(0.45 + 0.18 * tax + (w.rx ? 0.1 * w.rx.A - 0.12 * w.rx.C : 0) + (o ? o.trib : 0), 0.15, 0.85);
}
function outDecide(w) {
  const S = OP(w); if (w.day < S.nextPlan) return; S.nextPlan = w.day + 10;
  if (w.pop < 22 || w.day < 50 || outpostsAlive(w).length >= outCap(w)) return;
  if (outpostsAlive(w).some(o => o.state === 'travelling' || w.day - o.day < 40)) return;       // let the last one find its feet first
  if (w.tradeLock || (w.gov.council.length && w.gov.trial)) return;
  const press = expandPressure(w), app = expandAppetite(w); if (press * app < 0.5) return;
  const kids = w.vills.filter(v => v.isAdult()).length; if (kids < 14 || w.stock.food < w.pop * 2 + 12 || w.stock.wood < 16) return;
  const p = planOutpost(w); S.lastPlan = p ? { day: w.day, role: p.role, mode: p.mode, ratio: Math.round(p.cb.ratio * 10) / 10, go: p.cb.go } : { day: w.day, none: true };
  if (!p || !p.cb.go) { S.nextPlan = w.day + 14; return }
  proposeOutpost(w, p, press, app);
}
function proposeOutpost(w, p, press, app) {
  const S = OP(w), role = OUT_ROLES[p.role], way = p.mode === 'sea' ? `by ship (about ${p.days} days)` : `on foot (about ${p.days} days)`, where = compass(w, p.x, p.y);
  const text = `found a ${role.label} ${Math.round(p.d)} tiles to the ${where}, ${way}: ${p.n} settlers with ${p.food} food and ${p.wood} firewood`;
  const why = [expandPressure(w) > 0.6 ? 'The village is feeling cramped or short of supplies.' : '', app > 1.2 ? 'The village is bold and keen to expand.' : app < 0.6 ? 'The village is wary of leaving home.' : ''].filter(Boolean).join(' ');
  const options = [{ id: 'found', text: `Found it: ${text}` }, { id: 'small', text: `Send a smaller, cheaper party first (${Math.max(4, p.n - 2)} settlers, little food)` }, { id: 'wait', text: 'Not now: stay together and wait' }];
  const def = p.cb.ratio >= 2.5 && app > 0.8 ? 'found' : press * app > 0.75 ? 'found' : 'wait';
  ask(w, {
    kind: 'expand', topic: `Settlers could ${text}. The site is rich in ${p.role === 'timber' ? 'timber' : p.role === 'quarry' ? 'stone' : p.role === 'fishing' ? 'fish' : 'good soil'}. Expected return about ${Math.round(p.gain)} coins' worth over the first few years against about ${Math.round(p.cb.total)} in supplies, labour and risk (ratio ${Math.round(p.cb.ratio * 10) / 10}), ${Math.round(p.risk * 100)}% risk of losing the party. ${why}`, options, default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'wait') { S.nextPlan = w.day + 20; recordDecision(w, `not to found an outpost for now.`, sp, src); return }
      const q = id === 'small' ? { ...p, n: Math.max(4, p.n - 2), food: Math.round(p.food * 0.7), wood: Math.round(p.wood * 0.7) } : p;
      const ok = sendSettlers(w, q); recordDecision(w, ok ? `to found a ${role.label} to the ${where}.` : `to found a ${role.label}, but no party could be raised.`, sp, src); w.gov.nextMeeting = w.day + 3;
    }
  });
}

/* ----- the party leaves ----- */
function pickSettlers(w, n) {
  const council = new Set(w.gov.council.map(c => c.id)), away = v => v.jobKind === 'voyage' || v.boat || v.jobKind === 'trade';
  const adults = w.vills.filter(v => v.isAdult() && !v.isElder() && v.age < CFG.OLD_DAYS * 0.6 && !council.has(v.id) && !away(v));
  const score = v => 0.6 * v.trait.brave + 0.5 * v.trait.cur + 0.4 * v.char.amb + (v.home == null ? 0.4 : 0) + (100 - v.mood) / 150 + w.r() * 0.3;
  adults.sort((a, b) => score(b) - score(a)); const party = new Set();
  for (const v of adults) {
    if (party.size >= n) break; if (party.has(v.id)) continue; party.add(v.id);
    if (v.partner != null && party.size < n) { const p = w.vills.find(o => o.id === v.partner); if (p && !council.has(p.id) && !away(p) && p.isAdult()) party.add(p.id) }
  }
  for (const v of w.vills) if (party.size < n + 3 && v.isChild() && v.parentIds && v.parentIds.some(p => party.has(p))) party.add(v.id);
  return w.vills.filter(v => party.has(v.id));
}
function sendSettlers(w, p) {
  const S = OP(w), folk = pickSettlers(w, p.n); if (folk.length < 3) return false;
  const adults = folk.filter(v => v.isAdult()), leader = adults.slice().sort((a, b) => b.char.amb + b.trait.soc - a.char.amb - a.trait.soc)[0] || folk[0];
  const food = Math.min(p.food, Math.max(0, w.stock.food - w.pop)), wood = Math.min(p.wood, Math.max(0, w.stock.wood - 8)); w.stock.food -= food; w.stock.wood -= wood; S.sent.food += food; S.sent.wood += wood;
  const names = folk.map(v => v.name); for (const v of folk) { v.story(`${firstName(v.name)} set out with the settlers to found a new outpost.`); departVillager(w, v) }
  let nm = '', g = 0; do nm = OUT_NAMES[(w.r() * OUT_NAMES.length) | 0] + OUT_TAILS[(w.r() * OUT_TAILS.length) | 0]; while (S.list.some(o => o.name === nm) && g++ < 20);
  const lt = leader && leader.trait ? leader.trait : null, temper = clamp((lt ? 0.35 * (lt.soc - 0.5) - 0.3 * (lt.ind - 0.5) : 0) + (w.r() - 0.5) * 0.24, -0.2, 0.2);       // each settlement has its own temper: its leader's character and the luck of the founding
  const o = { id: S.next++, name: nm, x: p.x, y: p.y, role: p.role, mode: p.mode, rich: Math.round(p.rich * 100) / 100, state: 'travelling', day: w.day, arrive: w.day + p.days, days: p.days, pop: folk.length, founders: names.slice(0, 6), leader: leader.name, fl: folk.length,
    food: food, wood: 0, stone: 0, loyalty: clamp(0.8 + temper, 0.5, 1), temper, trib: 0, aid: 0, stage: 0, cap: Math.round(8 + p.rich * 10 + (p.read ? p.read.land / 20 : 0)), nextHaul: 0, cargo: [], made: 0, sentHome: 0, hungry: 0, lowDays: 0, supplied: { food, wood }, log: [] };
  S.list.push(o); o._route = p.route; S.founded++; S.last = { day: w.day, name: nm };
  w.emit('outpost', `${leader.name} leads ${folk.length} settlers ${p.mode === 'sea' ? 'aboard a ship' : 'on the road'} to found ${nm}, a ${OUT_ROLES[p.role].label} ${Math.round(outFar(w, p.x, p.y))} tiles to the ${compass(w, p.x, p.y)}.`, { o });
  for (const v of w.vills) if (!v.isChild()) v.mood = Math.max(0, v.mood - 1);
  return true;
}

/* ----- days in an outpost's life ----- */
function arrive(w, o) {
  const S = OP(w), risk = (o.mode === 'sea' ? 0.12 : 0.07) + (w.season === 3 ? 0.05 : 0), lost = Math.round(o.pop * (w.r() < risk ? 0.2 + 0.4 * w.r() : 0));
  if (lost >= o.pop - 1 || o.pop - lost < 2) { o.state = 'gone'; o.fate = 'lost'; S.failed++; S.lost += o.pop; outLog(w, `${o.name}: the party was lost on the way.`); return w.emit('outpost', `No word comes from the settlers bound for ${o.name}. The party was lost on the way.`, { o }) }
  o.pop -= lost; o.state = 'active'; o.nextHaul = w.day + 6; o.day = w.day; clearCamp(w, o);
  w.emit('outpost', lost ? `The settlers reach ${o.name}, but ${lost} did not survive the journey. ${o.pop} begin to build.` : `The settlers reach ${o.name} and begin to build. ${o.pop} souls under ${firstName(o.leader)}.`, { o });
  outLog(w, `${o.name} founded (${o.pop} settlers).`); revealCircle(w, o.x, o.y, 14);
}
function clearCamp(w, o) {
  const { W } = CFG; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const i = (o.y + dy) * W + o.x + dx; if (Math.hypot(dx, dy) < 2.6 && w.terr[i] >= TERR.SAND && !w.bmap[i]) { if (w.feat[i] === FEAT.OAK || w.feat[i] === FEAT.PINE) w.trees--; w.feat[i] = 0; w.res[i] = 0; if (w.terr[i] === TERR.SAND || w.terr[i] === TERR.ROCK) w.terr[i] = TERR.GRASS } }
}
function outTend(w, o) {
  const S = OP(w), role = OUT_ROLES[o.role], pop = o.pop, workers = pop * 0.62, winter = w.season === 3, farm = o.role === 'farming';
  const seasonal = farm ? (winter ? 0.25 : w.season === 2 ? 1.5 : w.season === 1 ? 1.1 : 0.9) : o.role === 'fishing' ? (winter ? 0.7 : 1) : (winter ? 0.8 : 1);
  const made = role.rate * o.rich * workers * seasonal * (w.has('tools') ? 1.1 : 1) * (0.6 + 0.4 * Math.min(1, o.loyalty + 0.3));
  const sub = role.key === 'food' ? 0 : 0.42 * workers * (winter ? 0.4 : 1);                // plain work needs a garden or foraging to eat
  o.food += (role.key === 'food' ? made : 0) + sub + 0.15 * pop * (winter ? 0.3 : 1); if (role.key !== 'food') o[role.key] += made; o.made += made;
  o.food -= pop * 0.82; o.food = Math.min(o.food, 30 + pop * 7);
  if (o.food < 0) { o.food = 0; o.hungry = Math.min(10, o.hungry + 1); if (w.r() < 0.5 && pop > 3) { o.pop--; outLog(w, `${o.name}: someone starved.`) } } else o.hungry = Math.max(0, o.hungry - 1);
  const room = o.cap - o.pop; if (o.hungry === 0 && o.food > pop * 1.5 && room > 0 && w.r() < pop * 0.018) o.pop++;
  if (w.r() < pop * 0.0035 && pop > 4) o.pop--;
  if (w.has('masonry') && !o.masonry) { o.masonry = 1; o.cap += 6 }
  const st = OUT_STAGE_POP.filter(x => o.pop >= x).length - 1; if (st > o.stage) { o.stage = st; w.emit('outpost', `${o.name} has grown into a ${OUT_STAGES[st]}: ${o.pop} souls.`, { o }); outLog(w, `${o.name} became a ${OUT_STAGES[st]}.`) } else if (st < o.stage - 0) o.stage = Math.max(0, st);
  if (o.pop <= 2) { o.state = 'gone'; o.fate = 'failed'; S.failed++; outLog(w, `${o.name} died out.`); return w.emit('outpost', `${o.name} has died out; its fields and huts are empty.`, { o }) }
  // loyalty drifts toward what the outpost experiences
  const share = outShare(w, o), target = clamp(0.64 - 1.1 * (share - 0.42) - outFar(w, o.x, o.y) / 520 - (o.hungry > 2 ? 0.25 : 0) - 0.18 * Math.min(1.2, o.pop / Math.max(12, w.pop)) - Math.min(0.15, (w.day - o.day) / 1200) + o.aid + (w.rx ? -0.12 * w.rx.A + 0.08 * w.rx.C : 0) + (o.stage >= 2 ? -0.05 : 0) + (o.temper || 0) + 0.04 * Math.sin((w.day + o.id * 37) / 23), 0, 1);
  o.loyalty += (target - o.loyalty) * 0.05; o.aid *= 0.985;
  if (w.day >= o.nextHaul) haul(w, o, share);
  const rest = []; for (const c of o.cargo) { if (w.day < c.at) { rest.push(c); continue } if (c.lost) { outLog(w, `A load from ${o.name} was lost on the way.`); continue } for (const k of ['wood', 'stone', 'food']) if (c[k]) { w.stock[k] = Math.min(w.stock[k] + c[k], w.cap() + 40); S.back[k] += c[k] } o.sentHome += (c.wood || 0) + (c.stone || 0) + (c.food || 0) } o.cargo = rest;
  if (o.loyalty < 0.2 && o.pop >= 8) { o.lowDays++; if (o.lowDays >= 8) return breakAway(w, o) } else o.lowDays = Math.max(0, o.lowDays - 1);
  if (o.loyalty < 0.4 && w.day >= (o.askAt || 0) && o.pop >= 6) { o.askAt = w.day + 24; askAboutOutpost(w, o) }
}
function haul(w, o, share) {
  const S = OP(w), role = OUT_ROLES[o.role], key = role.key; o.nextHaul = w.day + 6 + (o.stage >= 2 ? 0 : 2);
  const surplus = key === 'food' ? o.food - o.pop * 6 : o[key], amt = Math.floor(Math.max(0, surplus) * share * (0.55 + 0.45 * o.loyalty)); if (amt < 4) return;
  o[key] -= key === 'food' ? amt : amt; o.hauled = (o.hauled || 0) + amt; S.hauls++;
  const lostRisk = (o.mode === 'sea' ? 0.07 : 0.04) + (w.season === 3 ? 0.04 : 0), c = { at: w.day + routeDays(Array.isArray(o._route) && o._route.length ? o._route.length : outFar(w, o.x, o.y), o.mode), from: w.day, lost: w.r() < lostRisk }; c[key] = amt; o.cargo.push(c);
}
function askAboutOutpost(w, o) {
  const options = [{ id: 'aid', text: `Send food and firewood to ${o.name} to show it has not been forgotten (about 12 food and 6 firewood)` }, { id: 'lighter', text: `Take a smaller share from ${o.name} for now` }, { id: 'ignore', text: 'Leave things as they are' }];
  const def = w.stock.food > 40 && w.stock.wood > 20 ? 'aid' : 'lighter';
  ask(w, { kind: 'outpost', topic: `${o.name}, our ${OUT_ROLES[o.role].label}, grows restless (${Math.round(o.loyalty * 100)}% loyal${o.hungry > 2 ? ', and hungry' : ''}). The settlers feel ${outShare(w, o) > 0.55 ? 'the share taken is heavy' : 'far from home'}. How should the council answer?`, options, default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'aid') { const f = give(w, 'food', 12), wd = give(w, 'wood', 6); o.food += f; o.wood += 0; o.aid = Math.min(0.3, o.aid + 0.16); OP(w).sent.food += f; OP(w).sent.wood += wd; o.supplied.food += f; recordDecision(w, `to send help to ${o.name}.`, sp, src) }
      else if (id === 'lighter') { o.trib = Math.max(-0.25, o.trib - 0.15); o.aid = Math.min(0.3, o.aid + 0.05); recordDecision(w, `to ease the share ${o.name} sends home.`, sp, src) }
      else { o.loyalty -= 0.03; recordDecision(w, `to leave ${o.name} to itself.`, sp, src) }
    } });
}
/* an outpost that has had enough: it becomes a neighbour of its own */
function breakAway(w, o) {
  const S = OP(w); o.state = 'gone'; o.fate = 'free'; S.broke++;
  if (!w.neigh) { outLog(w, `${o.name} broke away.`); return w.emit('diplomacy', `${o.name} has had enough of taxes and distance. Its ${o.pop} people declare themselves free and want nothing more to do with the village.`) }
  const kind = o.role === 'fishing' || o.role === 'timber' ? 'traders' : o.role === 'quarry' ? 'scholars' : 'farmers', angry = o.loyalty < 0.12 || o.hungry > 2;
  const nb = { id: Math.max(0, ...w.neigh.map(x => x.id)) + 1, name: o.name, kind, x: o.x, y: o.y, cx: o.x, cy: o.y, r: 6, pop: o.pop, found: true, foundDay: w.day, dist: Math.round(outFar(w, o.x, o.y)), reach: o.mode === 'sea' ? 'boats' : 'land' };
  initNeighbour(w, nb); nb.pop = o.pop; nb.met = true; nb.knows = Object.keys(w.tech.known); nb.rel = angry ? -22 : 6; nb.temper = clamp(0.3 + 0.2 * w.r(), 0.05, 0.95); nb.strength = Math.round(nb.pop * (0.4 + nb.temper));
  nb.nextVisit = w.day + 10; nb.nextAid = w.day + 40; nb.nextTreaty = w.day + 20; nb.grudge = angry ? 25 : 0; nb.colony = { day: w.day, year: w.year, leader: o.leader, circle: 'settlers of ' + o.name, mode: angry ? 'bitter' : 'peace', founders: o.fl, outpost: true };
  w.neigh.push(nb); outLog(w, `${o.name} broke away.`);
  w.emit('diplomacy', `${o.name} has had enough of taxes and distance. Its ${o.pop} people declare themselves free, and the village must now deal with them as neighbours${angry ? ', and they have not forgotten' : ''}.`, { n: nb, kind: 'contact' });
}
function outpostDay(w) {
  const S = OP(w);
  for (const o of S.list) { if (o.state === 'travelling') { if (w.day >= o.arrive) arrive(w, o) } else if (o.state === 'active') outTend(w, o) }
  outDecide(w);
  if (S.list.length > 24) S.list = S.list.filter(o => o.state !== 'gone' || w.day - (o.endDay = o.endDay || w.day) < 200);
}
/* ----- helpers for the interface ----- */
function outpostRouteTiles(w, o) {          // the route as tile indices (rebuilt after a load)
  if (o._route === undefined || o._route === null) { o._route = o.mode === 'sea' ? ((outSeaRoute(w, o.x, o.y) || {}).path || []) : (outLandRoute(w, o.x, o.y) || []) }
  return Array.isArray(o._route) ? o._route : [];
}
function outpostSummary(w) {
  const S = OP(w), live = outpostsAlive(w); return { n: live.length, active: live.filter(o => o.state === 'active').length, pop: live.reduce((s, o) => s + o.pop, 0), S };
}
