/* ==========================================================================
   concerns.js (v0.24.1, states in 0.24.2a): the village watches itself.

   Once a day the village looks at its own numbers and raises a CONCERN when
   something is going wrong: people leaving or dying faster than they are born,
   food or firewood running short, a divided village, a faction or outpost
   about to break away. Each concern has a severity (watch or critical), a
   plain-language reason with the cause, and a few RESPONSES the player may
   try. The village still runs itself: responses are nudges and orders with
   costs and cooldowns, and the council decides whether to heed a nudge.

   Nothing here touches the page. The interface reads w.concerns.list and
   w.concerns.pending, and calls respond(w, id, concernKey).
   ========================================================================== */

const CONCERN_KINDS = {
  pop_fall: 'Population falling fast',
  pop_slide: 'A long decline',
  food: 'Food is running low',
  fuel: 'Not enough firewood for winter',
  housing: 'Not enough homes',
  unity: 'The village is divided',
  faction: 'A rival faction',
  outpost: 'An outpost is slipping away',
  plague: 'A plague is spreading',
  defence: 'The village is poorly defended',
  army: 'The army is going hungry',
};

function initConcerns(w) {
  w.concerns = { v: 1, list: [], hist: [], pending: [], pop: [], led: [], snap: [], cd: {}, orders: {}, muted: {}, lowUnity: 0, raised: 0, critical: 0, used: 0, nid: 1 };
}
const CN = w => w.concerns || (initConcerns(w), w.concerns);

/* the firewood a winter will take (shared with the winter upkeep in world.js) */
function winterWood(w) {
  return Math.ceil((w.pop * 0.3 + w.houses().length * 0.7 + 1) * (w.harsh ? 1.8 : 1) * (w.settings.survival ? 1.4 : 1) * (1 - 0.1 * styleNow(w)));
}

/* which standing orders are in force right now */
function ordersOf(w) {
  const O = w.concerns ? w.concerns.orders : null; if (!O) return NO_ORDERS;
  return { ration: (O.ration || 0) > w.day, food: (O.food || 0) > w.day, fuel: (O.fuel || 0) > w.day, allhands: (O.allhands || 0) > w.day, build: (O.build || 0) > w.day };
}
const NO_ORDERS = { ration: false, food: false, fuel: false, allhands: false, build: false };

/* ----- the ledger: what happened to the population in the last weeks ----- */
function ledgerSince(w, C, days) {
  const first = C.led.find(e => e.d >= w.day - days) || C.led[0], last = C.led[C.led.length - 1];
  if (!first || !last) return { born: 0, died: 0, left: 0, arrived: 0 };
  return { born: last.born - first.born, died: last.died - first.died, left: last.left - first.left, arrived: last.arrived - first.arrived };
}
function causesSince(w, C, days) {
  let snap = null; for (const s of C.snap) if (s.d <= w.day - days) snap = s; if (!snap) snap = C.snap[0]; if (!snap) return [];
  const out = []; for (const k in w.causes) { const n = w.causes[k] - (snap.c[k] || 0); if (n > 0) out.push([k, n]) }
  return out.sort((a, b) => b[1] - a[1]);
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function popWhy(w, C, days) {
  const L = ledgerSince(w, C, days), why = causesSince(w, C, days), S = w.strife, bits = [];
  if (L.left > 0) bits.push(S && w.day - S.lastSecede <= days + 2 ? `${plural(L.left, 'person', 'people')} left with a faction that broke away to found its own settlement` : `${plural(L.left, 'person', 'people')} left (outposts, exile)`);
  if (L.died > 0) bits.push(`${plural(L.died, 'death', 'deaths')}${why.length ? ' (' + why.slice(0, 2).map(([k, n]) => n + ' ' + k.replace(/^was /, '').replace(/^passed away peacefully of /, '')).join(', ') + ')' : ''}`);
  bits.push(`${plural(L.born, 'birth', 'births')}${L.arrived ? ', ' + plural(L.arrived, 'newcomer', 'newcomers') : ''}`);
  return bits.join('; ') + '.';
}

/* ----- the rules ----- */
function popRules(w, C, found) {
  const pop = w.pop; if (pop < 12 || C.pop.length < 8) return;
  const win = C.pop.slice(-32), hi = Math.max(...win), drop = hi - pop, rel = hi ? drop / hi : 0;
  let sudden = false;
  if (hi >= 24 && drop >= 6 && rel >= 0.15) {
    sudden = true; const sev = (rel >= 0.25 && drop >= 12) || (rel >= 0.18 && drop >= 30) ? 2 : 1;
    found.push({ key: 'pop_fall', sev, text: `The village has fallen from ${hi} to ${pop} people in about a year.`, why: popWhy(w, C, 32), m: { v: pop, ok: hi, bad: hi * 0.7 }, fix: ['feast', 'nudge_family', 'nudge_reconcile'] });
  }
  const peak = Math.max(...C.pop);
  if (!sudden && peak >= 40 && C.pop.length >= 96 && pop < 0.65 * peak) {
    const L = ledgerSince(w, C, 64), sev = pop < 0.45 * peak ? 2 : 1;
    found.push({ key: 'pop_slide', sev, text: `The village is down to ${pop} people from a recent peak of ${peak}.`, why: `Over the last two months ${plural(L.born, 'birth', 'births')} against ${plural(L.died, 'death', 'deaths')}${L.left ? ', ' + L.left + ' left' : ''}.`, m: { v: pop, ok: 0.65 * peak, bad: 0.35 * peak }, fix: ['nudge_family', 'feast', 'nudge_work'] });
  }
}
function foodRules(w, C, found) {
  const pop = w.pop; if (pop < 8) return;
  const cover = w.stock.food / pop, starved = causesSince(w, C, 16).filter(([k]) => k === 'starved').reduce((s, [, n]) => s + n, 0);
  const limit = w.season === 3 ? 3 : 2.5, sev = cover < 1.5 || starved > 0 ? 2 : cover < limit ? 1 : 0; if (!sev) return;
  const farms = w.of('farm').length, farmers = w.vills.filter(v => v.role === 'farmer').length;
  found.push({ key: 'food', sev, text: `Only ${Math.floor(w.stock.food)} food is stored for ${pop} people (${cover.toFixed(1)} each).${starved ? ' ' + plural(starved, 'person has', 'people have') + ' starved lately.' : ''}`,
    why: `${farms} farms with ${farmers} farmers${w.season === 3 ? '; the fields are frozen' : ''}${w.drought ? '; a drought has dried the fields' : ''}${w.harsh ? '; the winter is harsh' : ''}.`, m: { v: cover, ok: limit, bad: 0.5 }, fix: ['ration', 'hands_food', 'allhands', 'nudge_work'] });
}
function fuelRules(w, C, found) {
  if (w.season < 1) return; const need = winterWood(w), have = Math.floor(w.stock.wood);
  if (w.season === 3) { if (w.cold) found.push({ key: 'fuel', sev: 2, text: 'The firewood has run out and the village is freezing.', why: `The winter needed about ${need} firewood; only ${have} was stored.`, m: { v: have, ok: need, bad: 0 }, fix: ['hands_fuel', 'allhands', 'nudge_work'] }); return }
  const sev = w.season === 2 && have < need ? 2 : have < need * (w.season === 2 ? 1.5 : 1.3) ? 1 : 0; if (!sev) return;
  found.push({ key: 'fuel', sev, text: `${have} firewood is stored and winter will take about ${need}.`, why: `${w.vills.filter(v => v.role === 'woodcutter').length} woodcutters at work; ${w.houses().length} homes to heat for ${w.pop} people.`, m: { v: have, ok: need * (w.season === 2 ? 1.5 : 1.3), bad: 0 }, fix: ['hands_fuel', 'allhands', 'nudge_work'] });
}
function housingRules(w, C, found) {
  const P = w.priv; if (!P || !w.houses().length) return;
  const ad = Math.max(1, w.vills.filter(v => v.isAdult()).length), out = P.out, crowd = P.crowd, winter = w.season === 3;
  const sev = out >= Math.max(4, ad * 0.12) && winter ? 2 : out >= Math.max(3, ad * 0.08) || crowd >= ad * 0.3 ? 1 : 0; if (!sev) return;
  found.push({ key: 'housing', sev, text: out >= 3 ? `${out} people have no bed of their own${winter ? ' and are sleeping in the cold' : ''}.` : `${crowd} people are sharing a roof against their nature.`,
    why: `${w.beds()} beds for ${w.pop} people${crowd ? '; ' + crowd + ' are crowded in with people they would rather not live with' : ''}${w.bps.some(b => b.type === 'house') ? '; new homes are being built' : ''}${(() => { try { const h = housingDiag(w); return h.why.length ? '; ' + h.why.join('; ') : w.sprawl ? '; homes are now going up further out' : '' } catch (e) { return '' } })()}.`, m: { v: ad - out, ok: ad, bad: ad * 0.8 }, fix: ['hands_build', 'allhands'] });
}
function unityRules(w, C, found) {
  const R = w.regime, S = w.strife; if (!R || w.pop < 14) return;
  const u = R.ax.cohes; C.lowUnity = u < 0.25 ? C.lowUnity + 1 : 0;
  if (S && S.civil) found.push({ key: 'faction', sev: 2, text: 'Civil strife has broken out: neighbours are fighting each other.', why: 'The divisions were not healed in time; peace may only come through a truce, a split or a victory.', m: { v: 0, ok: 1, bad: 0 }, fix: ['nudge_reconcile', 'feast'] });
  else if (S && S.shadow) found.push({ key: 'faction', sev: S.shadow.days >= 8 && u < 0.45 ? 2 : 1, text: `${S.shadow.name} run a rival council under ${S.shadow.leaderName}; the village has two governments.`, why: `They have held out for ${S.shadow.days} days. Left alone they may fight, leave by boat, or fade. Unity is ${u.toFixed(2)}.`, m: { v: u, ok: 0.5, bad: 0.1 }, fix: ['nudge_reconcile', 'nudge_ease', 'feast'] });
  if (C.lowUnity >= 12) {
    const parts = R.divParts || [], names = DIV_NAMES, top = parts.map((x, i) => [x, names[i]]).filter(([x]) => x > 0.04).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, n]) => n);
    found.push({ key: 'unity', sev: u < 0.12 && C.lowUnity >= 24 ? 2 : 1, text: `Unity is ${u.toFixed(2)}: people no longer pull together.`, why: top.length ? `Mostly from ${top.join(' and ')}.` : 'Many small quarrels add up.', m: { v: u, ok: 0.25, bad: 0.05 }, fix: ['feast', 'nudge_ease', 'nudge_reconcile'] });
  }
}
function outpostRules(w, C, found) {
  if (!w.out) return;
  for (const o of w.out.list) if (o.state === 'active' && o.pop >= 6 && o.loyalty < 0.3)
    found.push({ key: 'outpost:' + o.id, sev: o.loyalty < 0.2 ? 2 : 1, title: `${o.name} is slipping away`, text: `${o.name} (${o.pop} people) feels little loyalty to the village (${Math.round(o.loyalty * 100)}%).`, why: 'Outposts that feel forgotten or overtaxed break away and take their people with them.', m: { v: o.loyalty, ok: 0.3, bad: 0.1 }, fix: ['nudge_ease', 'feast'] });
}

function plagueRules(w, C, found) {
  const n = typeof plagueSick === 'function' ? plagueSick(w) : 0; if (!n) return;
  found.push({ key: 'plague', sev: n >= 6 ? 2 : 1, title: 'A plague is spreading', text: `${n} villagers are ill${w.cul.plague.quarantine ? ' (the sick are quarantined)' : ''}.`, why: 'Sickness spreads where people gather; the old and the very young suffer most.', m: { v: n, ok: 0, bad: 8 }, fix: ['ration'] });
}
function warRules(w, C, found) {
  if (!w.war || !w.settings || !w.settings.raids) return; const W = w.war, t = threatLevel(w), n = soldiersHome(w).length, tg = targetSize(w);
  if (t >= 0.35 && n < Math.max(3, tg * 0.5)) found.push({ key: 'defence', sev: t > 0.7 ? 2 : 1, title: 'The village is poorly defended', text: `Hostile neighbours are near, but only ${n} villagers stand in arms (the council wants about ${tg}).`, why: 'A raid on a village with few defenders ends in loot, burning and death.', m: { v: n, ok: Math.max(3, tg * 0.5), bad: 1 }, fix: ['nudge_ease'] });
  if (W.morale < 0.35 && Object.keys(W.rolls).length >= 3) found.push({ key: 'army', sev: W.morale < 0.2 ? 2 : 1, title: 'The army is going hungry', text: `The ranks are demoralised (${Math.round(W.morale * 100)}%): too little food or too many defeats.`, why: 'Soldiers who are hungry or beaten desert, and the village is left open.', m: { v: W.morale, ok: 0.5, bad: 0.2 }, fix: ['feast'] });
}

/* ----- keeping the list: raise, update, resolve ----- */
function concernTitle(k, c) { return c && c.title ? c.title : CONCERN_KINDS[k.split(':')[0]] || k }
function concernsDay(w) {
  const C = CN(w), pop = w.pop;
  C.led.push({ d: w.day, born: w.births, died: w.deaths, left: (w.flow && w.flow.tot.left) || 0, arrived: (w.flow && w.flow.tot.arrived) || 0 }); if (C.led.length > 70) C.led.shift();
  C.pop.push(pop); if (C.pop.length > 192) C.pop.shift();
  if (w.day % 4 === 0) { C.snap.push({ d: w.day, c: { ...w.causes } }); if (C.snap.length > 12) C.snap.shift() }
  if (w.day < 12) return;
  const found = []; popRules(w, C, found); foodRules(w, C, found); fuelRules(w, C, found); housingRules(w, C, found); unityRules(w, C, found); outpostRules(w, C, found); warRules(w, C, found); plagueRules(w, C, found);
  const seen = new Set();
  for (const f of found) {
    seen.add(f.key); let c = C.list.find(x => x.key === f.key);
    if (!c) {
      c = { id: C.nid++, key: f.key, title: concernTitle(f.key, f), sev: f.sev, max: f.sev, since: w.day, text: f.text, why: f.why, fix: f.fix, m: f.m || null, trail: [], acts: [], miss: 0 }; C.list.push(c); C.raised++; statCount(w, 'concern');
      announce(w, C, c, true);
    } else {
      const up = f.sev > c.sev; c.sev = f.sev; c.max = Math.max(c.max, f.sev); c.text = f.text; c.why = f.why; c.fix = f.fix; c.m = f.m || null; c.miss = 0;
      if (up && f.sev === 2) announce(w, C, c, false);
    }
  }
  for (const c of C.list) if (seen.has(c.key)) { c.trail = c.trail || []; c.trail.push(c.m ? c.m.v : 0); if (c.trail.length > 16) c.trail.shift(); settleActs(w, c) }
  for (let i = C.list.length - 1; i >= 0; i--) {
    const c = C.list[i]; if (seen.has(c.key)) continue;
    if (++c.miss >= 3) { C.list.splice(i, 1); C.hist.unshift({ key: c.key, title: c.title, sev: c.max, since: c.since, end: w.day, text: c.text, did: (c.acts || []).map(a => a.label).filter((x, j, a) => a.indexOf(x) === j) }); if (C.hist.length > 12) C.hist.pop(); w.say(`Concern eased: ${c.title.toLowerCase()}.`) }
  }
  for (const k in C.muted) if (C.muted[k] <= w.day) delete C.muted[k];
}
function announce(w, C, c, fresh) {
  if (c.sev >= 2) {
    C.critical++; statCount(w, 'concern_critical', 1, `${c.title}: ${c.text}`); w.emit('concern', `Critical: ${c.title.toLowerCase()}. ${c.text}`, { key: c.key, sev: 2 });
    C.pending.push({ id: c.id, key: c.key, sev: 2, title: c.title, text: c.text, day: w.day }); if (C.pending.length > 20) C.pending.shift();
  } else if (fresh) w.say(`Concern: ${c.title.toLowerCase()}. ${c.text}`);
}
const openConcerns = w => (w.concerns ? w.concerns.list.filter(c => !(w.concerns.muted[c.key] > w.day)) : []);

/* ==========================================================================
   Responses: small player actions with a cost and a cooldown
   ========================================================================== */
const councilHeeds = w => { const R = w.regime, p = clamp(0.4 + 0.35 * (1 - (R ? R.ax.auth : 0.4)) + (w.gov.approval < 50 ? 0.1 : 0), 0.2, 0.9); return w.r() < p };

function askNudge(w, topic, yes, effect, act) {
  ask(w, { kind: 'nudge', topic, options: [{ id: 'yes', text: yes }, { id: 'no', text: 'Decline: leave things as they are' }], default: councilHeeds(w) ? 'yes' : 'no',
    apply: (id, sp, reason, src) => {
      if (act) { act.status = id === 'yes' ? 'heeded' : 'declined'; if (id === 'yes') act.until = w.day + 16, act.start = w.day }
      if (id === 'yes') { effect(); recordDecision(w, `to heed the request and ${yes.charAt(0).toLowerCase() + yes.slice(1)}.`, sp, src) }
      else recordDecision(w, `to decline the request: ${topic.charAt(0).toLowerCase() + topic.slice(1)}`, sp, src);
      w.gov.nextMeeting = Math.min(w.gov.nextMeeting, w.day + 3);
    } });
}
const shiftPolicy = (w, k, d) => { w.gov.policy[k] = clamp(w.gov.policy[k] + d, -1, 1); nudge(w, k, d * 0.2) };

const RESPONSES = {
  feast: {
    dur: 20, label: 'Hold a feast', cd: 48, blurb: 'Everyone gathers at the fire tomorrow. Lifts mood and unity for a while.',
    cost: w => ({ food: Math.max(20, Math.round(w.pop * 1.5)), wood: Math.max(6, Math.round(w.pop * 0.3)) }),
    can: w => { const c = RESPONSES.feast.cost(w); return w.stock.food - c.food < w.pop * 1.5 ? 'Not enough food to spare' : w.stock.wood < c.wood ? 'Not enough firewood' : '' },
    run: w => {
      const c = RESPONSES.feast.cost(w); w.stock.food -= c.food; w.stock.wood -= c.wood; w.forceFeast = true;
      for (const v of w.vills) if (v.isAdult()) v.mood = Math.min(100, v.mood + 6);
      const R = w.regime, S = w.strife; if (R) R.ax.cohes = Math.min(1, R.ax.cohes + 0.05); if (S) S.truceUntil = Math.max(S.truceUntil || 0, w.day + 20); w.gov.approval = Math.min(100, w.gov.approval + 3);
      w.emit('council', 'You call for a feast. Food and firewood are set out, and the village will gather at the fire.', {});
    } },
  ration: {
    dur: 16, label: 'Ration food', cd: 40, blurb: 'Smaller portions for 16 days: food lasts longer, but people grow irritable.',
    can: w => ordersOf(w).ration ? 'Already in force' : '',
    run: w => { CN(w).orders.ration = w.day + 16; w.emit('council', 'Food is rationed for the next sixteen days. Portions are smaller and tempers shorter.', {}) } },
  hands_food: {
    dur: 24, label: 'More hands on food', cd: 48, blurb: 'For 24 days many more people farm, hunt and fish.',
    can: w => ordersOf(w).food ? 'Already in force' : '',
    run: w => { CN(w).orders.food = w.day + 24; w.emit('council', 'More hands are sent to the fields, the woods and the water.', {}) } },
  hands_fuel: {
    dur: 16, label: 'More hands on firewood', cd: 48, blurb: 'For 16 days many more people cut wood.',
    can: w => ordersOf(w).fuel ? 'Already in force' : '',
    run: w => { CN(w).orders.fuel = w.day + 16; w.emit('council', 'Axes are handed out; every spare pair of hands goes to the woodpile.', {}) } },
  hands_build: {
    dur: 20, label: 'Building drive', cd: 48, blurb: 'For 20 days more builders are put on housing and the town builds well ahead of its needs.',
    can: w => ordersOf(w).build ? 'Already in force' : w.stock.wood < 20 ? 'Not enough wood' : '',
    run: w => { CN(w).orders.build = w.day + 20; w.emit('council', 'A building drive is called: more hands go to raising homes.', {}) } },
  allhands: {
    dur: 10, label: 'All hands', cd: 64, blurb: 'For 10 days nobody idles: farming, hunting, fishing and wood all get the most hands. Costs mood.',
    can: w => ordersOf(w).allhands ? 'Already in force' : '',
    run: w => { const C = CN(w); C.orders.allhands = w.day + 10; w.emit('council', 'All hands are called to work. There will be no idling until the crisis passes.', {}) } },
  nudge_family: {
    label: 'Ask: encourage families', cd: 24, blurb: 'The council may push its growth policy up, so more families raise children.',
    can: () => '', run: (w, act) => askNudge(w, 'You ask the council to do more to help families grow.', 'Encourage families', () => shiftPolicy(w, 'growth', 0.3), act) },
  nudge_work: {
    label: 'Ask: less leisure, more work', cd: 24, blurb: 'The council may cut back on rest days and leisure.',
    can: () => '', run: (w, act) => askNudge(w, 'You ask the council to put work before leisure for a while.', 'Cut back on leisure', () => shiftPolicy(w, 'labor', -0.3), act) },
  nudge_ease: {
    label: 'Ask: ease the laws', cd: 24, blurb: 'The council may loosen its strictness to calm the discontented.',
    can: () => '', run: (w, act) => askNudge(w, 'You ask the council to ease its laws and hear the discontented.', 'Ease the laws', () => { shiftPolicy(w, 'law', -0.3); if (w.regime) w.regime.ax.cohes = Math.min(1, w.regime.ax.cohes + 0.02) }, act) },
  nudge_reconcile: {
    label: 'Ask: open reconciliation', cd: 32, blurb: 'The council may open talks with those who are aggrieved.',
    can: () => '', run: (w, act) => askNudge(w, 'You ask the council to open talks with the aggrieved.', 'Open reconciliation talks', () => {
      const R = w.regime, S = w.strife; if (R) R.ax.cohes = Math.min(1, R.ax.cohes + 0.05); w.gov.approval = Math.min(100, w.gov.approval + 2);
      if (S) { S.truceUntil = Math.max(S.truceUntil || 0, w.day + 30); if (S.shadow && w.r() < 0.5) endShadow(w, 'reconciled', `The talks succeed: ${S.shadow.name} set aside their rival council.`) }
    }, act) },
};

function responseState(w, id) {
  const r = RESPONSES[id], C = CN(w), wait = Math.max(0, (C.cd[id] || 0) - w.day), why = r.can(w);
  return { id, label: r.label, blurb: r.blurb, cost: r.cost ? r.cost(w) : null, wait, why, ok: !wait && !why };
}
function respond(w, id, key) {
  const r = RESPONSES[id]; if (!r) return false; const st = responseState(w, id); if (!st.ok) return false;
  const C = CN(w), c = key ? C.list.find(x => x.key === key) : null;
  const act = { id, label: r.label, start: w.day, until: w.day + (r.dur || 0), status: r.dur ? 'active' : 'council', at: w.day };
  if (c) (c.acts = c.acts || []).push(act);
  C.cd[id] = w.day + r.cd; C.used++; statCount(w, 'concern_response'); try { logAction(w, 'response', id + (key ? ' for ' + key : '')) } catch (e) { } r.run(w, act); return true;
}
/* what became of the responses tried on a concern */
function settleActs(w, c) {
  for (const a of c.acts || []) if (a.status === 'council' && w.day - a.at > 40) a.status = 'lapsed';
}
const actLive = (w, a) => a.status === 'council' || ((a.status === 'active' || a.status === 'heeded') && a.until > w.day);
/* how bad (0..1) and which way it is going (-1 easing, 0 steady, 1 worsening) */
function concernGauge(c) {
  const m = c.m; if (!m) return { frac: c.sev >= 2 ? 1 : 0.5, trend: 0 };
  const f = v => clamp((m.ok - v) / (m.ok - m.bad || 1), 0, 1), frac = f(m.v), t = c.trail || [];
  const was = t.length >= 6 ? f(t[Math.max(0, t.length - 9)]) : frac, d = frac - was;
  return { frac, trend: d > 0.04 ? 1 : d < -0.04 ? -1 : 0 };
}
/* the state shown to the player: attention | responding | easing | failed */
function concernState(w, c) {
  const acts = c.acts || [], g = concernGauge(c), live = acts.filter(a => actLive(w, a));
  const state = live.length ? 'responding' : acts.length ? (g.trend < 0 ? 'easing' : 'failed') : g.trend < 0 ? 'easing' : 'attention';
  return { state, live, ...g };
}
function muteConcern(w, key, days = 32) { CN(w).muted[key] = w.day + days }
