'use strict';
/* ==========================================================================
   culture.js — society depth (v0.31).
     - culture: weddings, funerals and a storytelling night lift moods and build a
       slow "culture" score; the score feeds the library's science;
     - science: scholars add a little to the research in hand once the village
       has a library, a school of thought or a lot of curious minds;
     - disasters: spring floods and plague (a council decision: quarantine or not);
     - guilds: a trade with enough members organises, pays dues, and its members
       are steadier;
     - outposts get a council head of their own, which steadies their loyalty;
     - knowledge: the council may sell lessons to friendly neighbours, and spies
       come and go (a neighbour steals a craft; the council may send one back).
   Randomness comes from per-day streams of its own (warR in war.js).
   ========================================================================== */

const GUILD_NAMES = { farmer: 'Growers', fisher: 'Net-makers', hunter: 'Hunters', woodcutter: 'Foresters', miner: 'Stone-cutters', builder: 'Builders' };
function CUL(w) {
  return w.cul || (w.cul = { score: 0, weddings: 0, funerals: 0, tales: 0, nextTale: 20, floods: 0, plague: null, plagues: 0, plagueDead: 0, nextPlague: 60, guilds: [], dues: 0, sold: 0, stolen: 0, caught: 0, earned: 0, nextSale: 40, nextSpy: 50, nextOwnSpy: 70, deaths: 0, wed: {}, sci: 0 })
}
const culR = (w, salt) => warR(w, 1000 + salt);

/* ----- culture ----- */
function cultureDay(w) {
  const C = CUL(w), R = culR(w, 1), ad = adultsOf(w);
  // weddings: a couple who have been together a while hold a feast once
  if (w.day % 3 === 0) for (const v of ad) {
    if (v.partner == null || C.wed[v.id] || v.id > v.partner) continue; const p = w.vills.find(x => x.id === v.partner); if (!p || C.wed[p.id]) continue;
    C.wed[v.id] = C.wed[p.id] = w.day; C.weddings++; C.score = Math.min(100, C.score + 0.8);
    for (const x of ad) if (x.mood !== undefined) x.mood = Math.min(100, x.mood + (x === v || x === p ? 10 : 2));
    w.emit('culture', `${v.name} and ${p.name} are wed, and the village feasts together.`, { kind: 'wedding' }); break
  }
  // funerals: the village gathers for those who died since last time
  if (w.deaths > C.deaths) {
    const n = w.deaths - C.deaths; C.deaths = w.deaths;
    if (w.pop >= 8 && n) { C.funerals += n; C.score = Math.min(100, C.score + 0.4 * n); for (const x of ad) if (x.mournUntil > w.tick) { x.mournUntil -= Math.min(x.mournUntil - w.tick, CFG.TPD * 2); x.mood = Math.min(100, x.mood + 3) } if (n >= 1) w.emit('culture', `The village gathers to bury ${n > 1 ? n + ' of its own' : 'one of its own'} and share memories.`, { kind: 'funeral' }) }
  }
  // a storytelling night in winter and at feasts
  if (w.day >= C.nextTale && ad.length >= 10 && (w.season === 3 || R() < 0.3) && !w.cold) {
    C.nextTale = w.day + 18 + ((R() * 10) | 0); C.tales++; C.score = Math.min(100, C.score + 0.6);
    for (const x of ad) x.mood = Math.min(100, x.mood + 2);
    w.say('An evening of stories and songs by the fire lifts everyone’s spirits.')
  }
  C.score = Math.max(0, C.score - 0.05 - 0.0011 * C.score);                                      // traditions need keeping up
}

/* ----- science: culture and curiosity feed research ----- */
function scienceDay(w) {
  const C = CUL(w), t = w.tech; if (!t || !t.focus || w.day % 4) return;
  const cur = adultsOf(w).filter(v => v.trait.cur > 0.6).length, lib = projBuilt(w, 'library') ? 1 : 0, boost = (0.4 * lib + 0.01 * cur + 0.004 * C.score) * 0.6;
  if (boost > 0.05) { t.points += boost; C.sci += boost }
}

/* ----- disasters ----- */
function disasterDay(w) {
  const C = CUL(w), R = culR(w, 2); if (!w.settings.disasters || w.day < 20) return;
  // spring flood
  if (w.season === 0 && w.pop >= 12 && R() < 0.01 * (1 - 0.5 * lesson(w, 'storm'))) {
    const fs = w.of('farm'); let n = 0; for (const b of fs) if (R() < 0.5) { b.state = 0; b.g = 0; n++ }
    const lost = Math.round(w.stock.food * (0.1 + 0.1 * R())); w.stock.food -= lost; C.floods++; learn(w, 'storm', 0.15);
    w.emit('event', `The spring melt floods the low ground: ${n} field${n === 1 ? '' : 's'} washed out and ${lost} food spoiled.`, { kind: 'flood' })
  }
  // plague
  const P = C.plague;
  if (!P) {
    if (w.pop >= 30 && w.day >= C.nextPlague && (w.season === 0 || w.season === 2) && R() < 0.007 * (1 + (w.neigh && w.neigh.some(n => n.met && n.tradeCount > 3) ? 0.6 : 0)) * (1 - 0.6 * lesson(w, 'fever') - (w.has('medicine') ? 0.3 : 0))) startPlague(w, C, R);
    return
  }
  plagueDay(w, C, P, R)
}
function startPlague(w, C, R) {
  const ad = w.vills.filter(v => v.age > 5); if (!ad.length) return; const first = ad[(R() * ad.length) | 0];
  C.plague = { start: w.day, sick: { [first.id]: w.day }, quarantine: false, dead: 0, cured: 0 }; C.plagues++;
  w.emit('event', `A sickness spreads from ${first.name}. People are falling ill, and the council must decide what to do.`, { kind: 'plague' });
  ask(w, { kind: 'diplomacy', topic: 'A plague has broken out in the village. How should the council respond?', default: w.has('medicine') || avgTrait(w, 'kind') < 0.5 ? 'quarantine' : 'carryon',
    options: [{ id: 'quarantine', text: 'Quarantine the sick and keep the healthy apart (slower spread, but work and feasts stop for a while)' }, { id: 'carryon', text: 'Carry on as usual and tend the sick as neighbours do' }],
    apply: (id, sp, reason, src) => { C.plague && (C.plague.quarantine = id === 'quarantine'); recordDecision(w, id === 'quarantine' ? 'to quarantine the sick during the plague.' : 'to carry on and tend the sick during the plague.', sp, src); w.gov.nextMeeting = w.day + 4 } })
}
function plagueDay(w, C, P, R) {
  const ids = Object.keys(P.sick).map(Number), med = w.has('medicine') ? 0.5 : 1, byId = id => w.vills.find(v => v.id === id);
  for (const id of ids) {
    const v = byId(id); if (!v) { delete P.sick[id]; continue }
    const days = w.day - P.sick[id]; v.health -= (v.isElder() ? 7 : v.isChild() ? 5 : 4) * med; v.cause = 'fever'; v.mood = Math.max(0, v.mood - 4);
    if (v.health <= 0) { delete P.sick[id]; P.dead++; C.plagueDead++; continue }
    if (days >= 7 + ((R() * 4) | 0)) { delete P.sick[id]; P.cured++; continue }
    if (R() < 0.3 * (P.quarantine ? 0.35 : 1) * (1 - 0.3 * lesson(w, 'fever'))) { const o = w.vills[(R() * w.vills.length) | 0]; if (o && !P.sick[o.id] && !P.immune) P.sick[o.id] = w.day }
  }
  if (!Object.keys(P.sick).length || w.day - P.start > 40) {
    w.emit('event', `The plague has passed. ${P.dead} died, ${P.cured} recovered.`, { kind: 'plague_end' }); learn(w, 'fever', 0.25 + 0.05 * Math.min(6, P.dead)); C.nextPlague = w.day + 90; C.plague = null
  }
}
const plagueSick = w => w.cul && w.cul.plague ? Object.keys(w.cul.plague.sick).length : 0;

/* ----- guilds ----- */
function guildDay(w) {
  const C = CUL(w); if (!w.has('coinage') || w.day % 8) return;
  const by = {}; for (const v of adultsOf(w)) { const k = v.trade || v.role; if (k && GUILD_NAMES[k]) (by[k] = by[k] || []).push(v) }
  for (const k of Object.keys(by)) if (by[k].length >= 5 && !C.guilds.some(g => g.trade === k)) {
    const g = { trade: k, name: GUILD_NAMES[k] + '’ Guild', day: w.day, members: by[k].length, dues: 0 }; C.guilds.push(g);
    w.emit('culture', `The village’s ${k}s found the ${g.name}.`, { kind: 'guild', trade: k })
  }
  for (const g of C.guilds) {
    const ms = adultsOf(w).filter(v => (v.trade || v.role) === g.trade); g.members = ms.length;
    if (g.members < 3) { g.dead = true; continue }
    const d = 0.4 * g.members; g.dues += d; C.dues += d; if (w.econ) w.econ.treasury += d * 0.3;
    for (const v of ms) v.mood = Math.min(100, v.mood + 0.5)
  }
  C.guilds = C.guilds.filter(g => !g.dead)
}

/* ----- outposts get councils of their own ----- */
function outpostCouncils(w) {
  if (!w.out || w.day % 4) return; const R = culR(w, 3);
  for (const o of w.out.list) {
    if (o.state !== 'active') continue;
    if (!o.head && o.pop >= 8 && w.day - o.day > 20) { const nm = R() < 0.5 ? NAMES_M : NAMES_F; o.head = nm[(R() * nm.length) | 0]; o.headDay = w.day; w.emit('outpost', `${o.name} chooses ${o.head} to lead its own council.`, { o, kind: 'council' }) }
    if (o.head) { o.aid = (o.aid || 0) + 0.003; if (o.loyalty < 0.3 && w.day >= (o.petAt || 0)) { o.petAt = w.day + 40; w.say(`${o.head} of ${o.name} sends word: the people there feel forgotten.`) } }
  }
}

/* ----- selling knowledge and spies ----- */
function knowledgeDay(w) {
  const C = CUL(w), R = culR(w, 4); if (!w.neigh || !w.has('trade')) return;
  // sell lessons to a friendly neighbour
  if (w.day >= C.nextSale && w.econ && money(w)) {
    C.nextSale = w.day + 30 + ((R() * 16) | 0); let best = null;
    for (const n of w.neigh) { if (!n.found || !n.met || n.rel < 25 || !n.knows || isHostile(n)) continue; for (const id of Object.keys(w.tech.known)) if (TECHS[id] && !n.knows.includes(id) && TECHS[id].age <= 3) { const price = Math.max(10, Math.round(TECHS[id].cost * 0.04 * (0.7 + 0.6 * clamp(n.rel / 100, 0, 1)))); if (!best || price > best.price) best = { n, id, price } } }
    if (best) {
      const { n, id, price } = best, T = TECHS[id];
      ask(w, { kind: 'diplomacy', topic: `Scholars of ${n.name} offer ${price} coins for lessons in ${T.name.toLowerCase()}. They would also learn how the village works.`, default: n.rel > 40 ? 'sell' : 'keep',
        options: [{ id: 'sell', text: `Sell the lessons (${price} coins; they will know it too)` }, { id: 'keep', text: 'Keep the knowledge to ourselves' }],
        apply: (cid, sp, reason, src) => {
          if (cid === 'sell' && !n.knows.includes(id)) { n.knows.push(id); w.econ.treasury += price; C.sold++; C.earned += price; n.rel += 4; recordDecision(w, `to sell lessons in ${T.name.toLowerCase()} to ${n.name} for ${price} coins.`, sp, src); w.emit('research', `Teachers from the village sell lessons in ${T.name.toLowerCase()} to ${n.name} for ${price} coins.`, { kind: 'sale', nid: n.id, price }) }
          else recordDecision(w, `not to sell lessons in ${T.name.toLowerCase()} to ${n.name}.`, sp, src); w.gov.nextMeeting = w.day + 4
        } })
    }
  }
  // a neighbour's spy takes a craft
  if (w.day >= C.nextSpy) {
    C.nextSpy = w.day + 40 + ((R() * 30) | 0);
    const n = w.neigh.find(x => x.met && x.knows && (x.kind === 'raiders' || x.rel < 0) && Object.keys(w.tech.known).some(id => !x.knows.includes(id) && TECHS[id] && TECHS[id].age <= 4));
    if (n) {
      const guard = 0.3 + 0.25 * Math.max(0, w.gov.policy.law) + (towerBuilt(w) ? 0.1 : 0) + (w.rx ? 0.2 * w.rx.A : 0);
      if (R() < guard) { C.caught++; n.rel -= 6; w.emit('diplomacy', `A stranger from ${n.name} is caught watching the workshops and sent away.`, { n, kind: 'spy' }) }
      else { const ids = Object.keys(w.tech.known).filter(id => !n.knows.includes(id) && TECHS[id] && TECHS[id].age <= 4); const id = ids[(R() * ids.length) | 0]; n.knows.push(id); w.say(`Word comes that ${n.name} has learned ${TECHS[id].name.toLowerCase()}; a spy may have been at work.`); C.stolen++ }
    }
  }
  // our own spy: the council may try to take a craft from a rival
  if (w.day >= C.nextOwnSpy && w.econ && w.econ.treasury >= 40 && w.pop >= 30) {
    C.nextOwnSpy = w.day + 60 + ((R() * 40) | 0); const open = techAvailableRaw(w); if (!open.length) return;
    let pick = null; for (const n of w.neigh) { if (!n.found || !n.met || !n.knows || n.rel > 20) continue; const id = open.find(x => n.knows.includes(x)); if (id) { pick = { n, id }; break } }
    if (!pick) return; const { n, id } = pick, T = TECHS[id], cost = 25;
    ask(w, { kind: 'diplomacy', topic: `${n.name} knows ${T.name.toLowerCase()}, which the village lacks. A spy could try to learn it for ${cost} coins, but if caught the quarrel would worsen.`, default: avgTrait(w, 'brave') > 0.55 ? 'spy' : 'no',
      options: [{ id: 'spy', text: `Send a spy to ${n.name} (${cost} coins; about 55% to succeed)` }, { id: 'no', text: 'Do nothing' }],
      apply: (cid, sp, reason, src) => {
        if (cid !== 'spy' || w.econ.treasury < cost || w.tech.known[id]) { recordDecision(w, 'not to send a spy.', sp, src); return }
        w.econ.treasury -= cost; const R2 = culR(w, 5);
        if (R2() < 0.55) { const t = w.tech, f0 = t.focus, p0 = t.points; t.focus = id; t.points = techCost(w, id) + p0; discover(w); t.focus = f0 === id ? null : f0; t.points = p0; C.stolenBy = (C.stolenBy || 0) + 1; recordDecision(w, `to send a spy to ${n.name}, who brought back ${T.name.toLowerCase()}.`, sp, src); w.emit('research', `A spy returns from ${n.name} with the secret of ${T.name.toLowerCase()}.`, { kind: 'spy_won', nid: n.id }) }
        else { n.rel -= 15; n.grudge = (n.grudge || 0) + 0.2; C.lostSpies = (C.lostSpies || 0) + 1; recordDecision(w, `to send a spy to ${n.name}, who was caught.`, sp, src); dlog(w, n, `${n.name} catches a spy from the village. Relations sour.`, 'spy') }
        w.gov.nextMeeting = w.day + 4
      } })
  }
}

function cultureAll(w) {
  cultureDay(w); scienceDay(w); disasterDay(w); guildDay(w); outpostCouncils(w); knowledgeDay(w)
}
