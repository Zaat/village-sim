/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   war.js — the village at arms (v0.30).
   Soldiers are real villagers; a roll (w.war.rolls: id -> {t, xp}) says who
   stands in the ranks and with what kit. Battles are abstract: two sides, a
   few rounds, casualties on both. The same model settles raids on the
   village, attacks on outposts and the council's own campaigns.
     - the army grows when a threat is felt and is stood down when it fades;
     - unit types follow the war techs (militia -> spearmen -> ... -> muskets);
     - a Barracks drills the ranks, a Watchtower gives early warning;
     - friends (pact 2) may stand with the village;
     - upkeep and size depend on the regime (authority keeps big armies cheaply).
   Nothing here touches the DOM. Randomness comes from a per-day stream of
   its own, so war never disturbs the rest of the simulation's dice.
   ========================================================================== */

const UNITS = {
  militia: { one: 'militiaman', name: 'Militia', pow: 1.0, tech: null, tier: 0 },
  spearman: { one: 'spearman', name: 'Spearmen', pow: 1.5, tech: 'spears', tier: 1 },
  archer: { one: 'archer', name: 'Archers', pow: 1.7, tech: 'bows', tier: 2 },
  swordsman: { one: 'swordsman', name: 'Swordsmen', pow: 2.2, tech: 'armour', tier: 3 },
  legionary: { one: 'legionary', name: 'Legionaries', pow: 2.8, tech: 'legion', tier: 4 },
  musketeer: { one: 'musketeer', name: 'Musketeers', pow: 3.8, tech: 'muskets', tier: 5 }
};
const UNIT_ORDER = ['musketeer', 'legionary', 'swordsman', 'archer', 'spearman', 'militia'];
const bestUnit = (w, barracks) => UNIT_ORDER.find(k => { const u = UNITS[k]; return (!u.tech || w.has(u.tech)) && (barracks || u.tier <= 2) });

function WAR(w) {
  return w.war || (w.war = { rolls: {}, away: [], won: 0, lost: 0, drawn: 0, fallen: 0, slain: 0, plunder: 0, repelled: 0, sacked: 0, relieved: 0, battles: [], alertUntil: 0, campaign: null, nextCampaign: 0, nextOutRaid: 0, morale: 0.7, peak: 0, upkeepDue: 0 })
}
const warR = (w, salt) => { let h = (w.seed ^ 0x57A11B0D ^ Math.imul(w.day + 1, 0x9E3779B1) ^ Math.imul((salt | 0) + 7, 0x85EBCA6B)) | 0; h = Math.imul(h ^ h >>> 16, 0x45D9F3B); h = Math.imul(h ^ h >>> 16, 0x45D9F3B); const r = mulberry32((h ^ h >>> 16) >>> 0); r(); r(); return r };

/* ----- who serves ----- */
function soldiersOf(w) { const W = WAR(w); return w.vills.filter(v => W.rolls[v.id]) }
function soldiersHome(w) { const W = WAR(w); return soldiersOf(w).filter(v => !W.away.includes(v.id)) }
function unitPower(r) { return UNITS[r.t].pow * (1 + Math.min(0.5, (r.xp || 0) / 12)) }
function barracksBuilt(w) { return projBuilt(w, 'barracks') }
function towerBuilt(w) { return projBuilt(w, 'watchtower') }
function armyPower(w) {
  const W = WAR(w), home = soldiersHome(w); let s = 0; for (const v of home) s += unitPower(W.rolls[v.id]);
  return 0.25 * s * (barracksBuilt(w) ? 1.25 : 1) * (0.7 + 0.4 * W.morale)
}

/* ----- how much danger does the village feel? 0 (none) .. ~1.5 ----- */
function hostileNeighbours(w) { return (w.neigh || []).filter(n => n.met && n.kind === 'raiders' && n.rel < -10 && n.tribute <= w.day) }
function threatLevel(w) {
  if (!w.settings || !w.settings.raids) return 0;                      // peace is the default: no switch, no danger felt
  let t = 0; for (const n of hostileNeighbours(w)) t += 0.25 + Math.min(0.35, n.strength / 80) + (n.grudge > 0.3 ? 0.15 : 0);
  t += 0.5 * lesson(w, 'raids'); if (w.strife && (w.strife.shadow || w.strife.civil)) t += 0.2; if (WAR(w).alertUntil > w.day) t += 0.15;
  return Math.min(1.5, t)
}
function targetSize(w) {
  const ad = adultsOf(w).length, t = threatLevel(w), A = w.rx ? w.rx.A : 0.3, pol = Math.max(0, w.gov.policy.defense);
  if (t < 0.05) return 0;
  return Math.round(ad * Math.min(0.2, (0.03 + 0.09 * Math.min(1, t) + 0.04 * pol + (barracksBuilt(w) ? 0.02 : 0)) * (0.8 + 0.6 * A)))
}

/* ----- one battle, in rounds. Sides: {n men, str total strength, name} ----- */
function battle(w, att, def, salt, opt) {
  const R = warR(w, salt), o = opt || {}; let an = att.n, dn = def.n, as = att.str, ds = def.str, rounds = 0;
  const a0 = Math.max(1, att.n), d0 = Math.max(1, def.n);
  for (let r = 0; r < 3; r++) {
    rounds++; const ea = Math.max(0.1, as * (0.85 + 0.3 * R())) * (o.attMorale || 1), ed = Math.max(0.1, ds * (0.85 + 0.3 * R())) * (o.defMorale || 1) * (o.defBonus || 1);
    const pa = ea / (ea + ed), la = Math.min(an, Math.round(a0 * 0.26 * (1 - pa) * 2 * (0.7 + 0.6 * R()))), ld = Math.min(dn, Math.round(d0 * 0.26 * pa * 2 * (0.7 + 0.6 * R())));
    an -= la; dn -= ld; as *= an / Math.max(1, an + la); ds *= dn / Math.max(1, dn + ld);
    if (an <= 0 || dn <= 0 || an / a0 < 0.4 || dn / d0 < 0.4) break
  }
  const aFrac = 1 - an / a0, dFrac = 1 - dn / d0, diff = dFrac - aFrac;
  return { win: diff > 0.08 ? 'att' : diff < -0.08 ? 'def' : 'draw', aLost: att.n - an, dLost: def.n - dn, aFrac, dFrac, rounds }
}
function logBattle(w, rec) { const W = WAR(w); W.battles.unshift({ d: w.day, ...rec }); if (W.battles.length > 24) W.battles.pop() }

/* ----- muster, drill, upgrades, upkeep (daily) ----- */
function eligible(w) {
  const W = WAR(w), cm = new Set(w.gov.council.map(c => c.id));
  return adultsOf(w).filter(v => !W.rolls[v.id] && !v.isElder() && v.age < 55 && v.health > 50 && !cm.has(v.id)).sort((a, b) => b.trait.brave - a.trait.brave || a.id - b.id)
}
function warDay(w) {
  const W = WAR(w); if (!w.settings || !w.neigh) { return }
  for (const id of Object.keys(W.rolls)) if (!w.vills.some(v => v.id === +id)) { delete W.rolls[id]; W.away = W.away.filter(x => x !== +id) }
  const home = soldiersOf(w), tgt = targetSize(w), barr = barracksBuilt(w);
  // muster up to the target, a few at a time; stand down slowly when it falls
  if (home.length < tgt && w.day % 2 === 0) {
    const pool = eligible(w), n = Math.min(pool.length, Math.max(1, Math.ceil((tgt - home.length) / 3)), 3);
    for (let i = 0; i < n; i++) { const v = pool[i]; W.rolls[v.id] = { t: 'militia', xp: 0, d: w.day }; v.story && v.story(`Took up arms for the village.`) }
    if (n && home.length === 0) w.say(`The council musters a watch of villagers: ${n} take up arms.`);
  } else if (home.length > tgt && w.day % 6 === 0 && !W.campaign) {
    const v = home.filter(x => !W.away.includes(x.id)).sort((a, b) => (W.rolls[a.id].xp - W.rolls[b.id].xp) || b.id - a.id)[0]; if (v) delete W.rolls[v.id]
  }
  const live = soldiersOf(w);
  // better kit: one soldier a day moves up, if the stores allow
  const best = bestUnit(w, barr);
  if (live.length && w.day % 3 === 0) {
    const up = live.filter(v => UNITS[W.rolls[v.id].t].tier < UNITS[best].tier).sort((a, b) => UNITS[W.rolls[a.id].t].tier - UNITS[W.rolls[b.id].t].tier || a.id - b.id)[0];
    if (up) { const cost = { wood: 2 + UNITS[best].tier, stone: UNITS[best].tier >= 3 ? 2 : 0 }; if (w.stock.wood >= cost.wood + 20 && w.stock.stone >= cost.stone + 10) { w.stock.wood -= cost.wood; w.stock.stone -= cost.stone; W.rolls[up.id].t = best } }
  }
  // drill: experience builds slowly, faster with a barracks
  if (w.day % 4 === 0) for (const v of live) { const r = W.rolls[v.id]; r.xp = Math.min(12, (r.xp || 0) + (barr ? 0.5 : 0.2)) }
  // upkeep: grain for the ranks, cheaper where authority is strong
  const A = w.rx ? w.rx.A : 0.3, per = (0.05 + 0.02 * live.reduce((s, v) => s + UNITS[W.rolls[v.id].t].tier, 0) / Math.max(1, live.length)) * (1.3 - 0.5 * A);
  const cost = live.length * per; if (cost > 0) {
    if (w.stock.food >= cost + 6) { w.stock.food -= cost; W.morale = Math.min(1, W.morale + 0.01) }
    else { W.morale = Math.max(0.1, W.morale - 0.03); if (live.length > 2 && w.day % 5 === 0) { const v = live[live.length - 1]; delete W.rolls[v.id] } }
  }
  W.peak = Math.max(W.peak, live.length);
  if (w.settings.raids) { try { outpostThreats(w) } catch (e) { w.fault('war', e) } try { campaignDay(w) } catch (e) { w.fault('war', e) } }
  if (W.campaign) resolveCampaign(w)
}

/* ----- friends who stand with the village ----- */
function alliesFor(w) {
  return (w.neigh || []).filter(n => n.met && n.pact === 2 && n.rel > 55 && n.kind !== 'raiders' && n.strength >= 6).map(n => ({ n, str: Math.min(5, n.strength * 0.18), men: Math.min(6, Math.round(n.pop * 0.1)) })).slice(0, 2)
}

/* ----- the raid on the village: called by diplomacy.raidVisit ----- */
function defenceSide(w, D) {
  const home = soldiersHome(w), ally = alliesFor(w), men = Math.max(3, home.length) + ally.reduce((s, a) => s + a.men, 0);
  return { n: men, str: D + ally.reduce((s, a) => s + a.str, 0), ally }
}
function settleRaid(w, n, attackers, D) {
  const W = WAR(w), side = defenceSide(w, D), att = { n: attackers, str: attackers * 1.1 + (n.grudge > 0.3 ? 0.5 : 0) };
  const warned = towerBuilt(w) || W.alertUntil > w.day;
  const res = battle(w, att, { n: side.n, str: side.str }, n.id * 31 + 7, { defMorale: 0.8 + 0.3 * W.morale, defBonus: warned ? 1.12 : 1 });
  const outcome = res.win === 'def' ? 'repelled' : res.win === 'draw' ? 'partial' : 'heavy';
  const dead = Math.min(soldiersHome(w).length, Math.round(res.dLost * (side.n ? soldiersHome(w).length / side.n : 0)));
  return { outcome, res, side, dead }
}
function afterRaid(w, n, st, victims) {
  const W = WAR(w), home = soldiersHome(w);
  // the dead are chosen among the ranks first
  const fall = home.filter(v => !victims.includes(v)).sort((a, b) => a.id - b.id).slice(0, Math.max(0, st.dead - victims.filter(v => W.rolls[v.id]).length));
  for (const v of fall) { v.health = -1; v.cause = 'war'; victims.push(v) }
  W.fallen += victims.filter(v => W.rolls[v.id]).length; W.alertUntil = w.day + 20;
  for (const v of home) if (W.rolls[v.id]) W.rolls[v.id].xp = Math.min(12, W.rolls[v.id].xp + (st.outcome === 'repelled' ? 1.2 : 0.6));
  if (st.outcome === 'repelled') { W.repelled++; W.morale = Math.min(1, W.morale + 0.1) } else W.morale = Math.max(0.15, W.morale - (st.outcome === 'heavy' ? 0.25 : 0.1));
  logBattle(w, { kind: 'raid', foe: n.name, outcome: st.outcome, ours: st.side.n, lostOurs: st.res.dLost, lostTheirs: st.res.aLost, allies: st.side.ally.map(a => a.n.name) });
  if (st.side.ally.length) { for (const a of st.side.ally) a.n.rel = Math.min(100, a.n.rel + 2); w.say(`${st.side.ally.map(a => a.n.name).join(' and ')} stand${st.side.ally.length > 1 ? '' : 's'} with the village against the raiders.`) }
  if (st.res.dLost || st.res.aLost) w.say(st.outcome === 'repelled' ? `The defence holds: ${st.res.aLost} raiders and ${st.res.dLost} defenders fall.` : `The fight at the village costs ${st.res.dLost} defenders and ${st.res.aLost} raiders.`);
  W.slain += st.res.aLost; n.strength = Math.max(6, n.strength - st.res.aLost)
}

/* ----- hostile neighbours attack the outposts ----- */
function outpostThreats(w) {
  const W = WAR(w); if (!w.out || w.day < W.nextOutRaid) return;
  const hostile = hostileNeighbours(w).filter(n => n.rel < -18); if (!hostile.length) return;
  const outs = w.out.list.filter(o => o.state === 'active' && o.pop >= 4); if (!outs.length) return;
  const R = warR(w, 11); W.nextOutRaid = w.day + 12 + ((R() * 10) | 0);
  if (R() > 0.45) return;
  const o = outs[(R() * outs.length) | 0], n = hostile[(R() * hostile.length) | 0];
  const garrison = Math.min(3, o.pop * 0.15), relief = soldiersHome(w).length >= 6 && R() < 0.6 ? 2 : 0;
  const att = { n: Math.max(3, Math.round(n.strength / 8)), str: Math.max(3, n.strength / 8) * 1.0 }, def = { n: Math.round(o.pop * 0.4 + relief), str: o.pop * 0.18 + garrison + relief * 1.8 };
  const res = battle(w, att, def, o.id * 17 + n.id, {});
  if (res.win === 'def') {
    W.repelled++; W.slain += res.aLost; o.loyalty = Math.min(1, o.loyalty + 0.05); logBattle(w, { kind: 'outpost', foe: n.name, at: o.name, outcome: 'repelled', lostOurs: res.dLost, lostTheirs: res.aLost });
    w.emit('war', `${o.name} drives off attackers from ${n.name}${relief ? ', with soldiers sent from the village' : ''}.`, { n, kind: 'outpost', outcome: 'repelled' });
  } else {
    const lost = Math.min(o.pop - 1, Math.max(1, Math.round(o.pop * (res.win === 'att' ? 0.5 : 0.2))));
    o.pop -= lost; o.loyalty = Math.max(0, o.loyalty - 0.12); W.fallen += 0; o.food = Math.max(0, o.food * 0.5);
    if (o.pop < 3 || res.win === 'att' && o.pop < 6) { o.state = 'gone'; o.fate = 'sacked'; W.sacked++; w.emit('war', `${o.name} is overrun by ${n.name}'s warriors and abandoned.`, { n, kind: 'outpost', outcome: 'sacked' }) }
    else w.emit('war', `Attackers from ${n.name} strike ${o.name}: ${lost} of its people are lost.`, { n, kind: 'outpost', outcome: 'raided' });
    logBattle(w, { kind: 'outpost', foe: n.name, at: o.name, outcome: o.state === 'gone' ? 'sacked' : 'raided', lostOurs: lost, lostTheirs: res.aLost }); W.slain += res.aLost
  }
}

/* ----- the council's own campaign against a hostile neighbour ----- */
function campaignTargets(w) { return hostileNeighbours(w).filter(n => n.rel < -20 && (n.raids >= 1 || n.grudge > 0.3) && (n.kind === 'raiders')) }
function campaignDay(w) {
  const W = WAR(w); if (W.campaign || w.visit || w.day < W.nextCampaign || w.season === 3 || w.pop < 30) return;
  const home = soldiersHome(w); if (home.length < 6) return;
  const tg = campaignTargets(w).filter(n => true)[0]; if (!tg) return;
  W.nextCampaign = w.day + 24;
  const mine = home.slice(0, Math.min(home.length, Math.max(6, Math.round(home.length * 0.7)))), str = mine.reduce((s, v) => s + unitPower(W.rolls[v.id]), 0) * 0.9, their = tg.strength * 0.5 + 2;
  const odds = str / (str + their), bold = avgTrait(w, 'brave') > 0.5 || odds > 0.62;
  const options = [{ id: 'strike', text: `Send ${mine.length} soldiers against ${tg.name}, to break their warriors and take what they have raided (risky: some will not come home)` }, { id: 'envoys', text: `Send envoys with a gift to ${tg.name} to buy peace instead` }, { id: 'hold', text: 'Hold the ranks at home and keep watch' }];
  ask(w, { kind: 'diplomacy', topic: `${tg.name} has raided or threatened the village again and again. The army stands ${mine.length} strong, and the odds of a campaign look ${odds > 0.62 ? 'good' : odds > 0.45 ? 'even' : 'poor'}. What does the council decide?`, options, default: bold && odds > 0.5 ? 'strike' : odds < 0.4 ? 'envoys' : 'hold',
    apply: (id, sp, reason, src) => {
      if (id === 'strike') { W.campaign = { n: tg.id, ids: mine.map(v => v.id), start: w.day, back: w.day + (byLand(tg) ? 4 : 7) }; W.away = mine.map(v => v.id); recordDecision(w, `to march on ${tg.name} with ${mine.length} soldiers.`, sp, src); w.emit('war', `${mine.length} soldiers set out against ${tg.name}.`, { n: tg, kind: 'campaign', outcome: 'march' }) }
      else if (id === 'envoys') { give(w, 'food', 15); give(w, 'wood', 10); tg.rel += 12; recordDecision(w, `to send envoys with gifts to ${tg.name} rather than march.`, sp, src); dlog(w, tg, `Envoys carry gifts to ${tg.name}; the talk is wary but peaceful.`, 'envoy') }
      else recordDecision(w, `to hold the ranks at home.`, sp, src);
      w.gov.nextMeeting = w.day + 4
    } })
}
function resolveCampaign(w) {
  const W = WAR(w), c = W.campaign; if (!c || w.day < c.back) return;
  const n = (w.neigh || []).find(x => x.id === c.n), ids = c.ids.filter(id => w.vills.some(v => v.id === id)); W.campaign = null; W.away = [];
  if (!n || !ids.length) return;
  const ours = ids.map(id => W.rolls[id]).filter(Boolean), str = ours.reduce((s, r) => s + unitPower(r), 0) * 0.9;
  const res = battle(w, { n: ids.length, str }, { n: Math.max(3, Math.round(n.strength / 5)), str: n.strength * 0.5 + 2 }, n.id * 13 + 5, { attMorale: 0.9 + 0.2 * W.morale, defBonus: 1.1 });
  const vs = ids.map(id => w.vills.find(v => v.id === id)).filter(Boolean).sort((a, b) => a.id - b.id), dead = vs.slice(0, res.aLost);
  for (const v of dead) { v.health = -1; v.cause = 'war' } W.fallen += dead.length; W.slain += res.dLost;
  for (const r of ours) r.xp = Math.min(12, r.xp + (res.win === 'att' ? 2 : 1));
  if (res.win === 'att') {
    const f = { food: Math.round(8 + n.pop * 0.6), wood: Math.round(5 + n.pop * 0.3), stone: Math.round(4 + n.pop * 0.2) }; for (const k of ['food', 'wood', 'stone']) w.stock[k] = Math.min(w.capOf(k), w.stock[k] + f[k]); W.plunder += f.food + f.wood + f.stone;
    W.won++; W.morale = Math.min(1, W.morale + 0.15); n.strength = Math.max(5, n.strength - res.dLost * 2); n.raidCd = w.day + 70; n.tribute = w.day + 45; n.rel = Math.min(n.rel, -5); n.grudge = (n.grudge || 0) + 0.2;
    for (const v of w.vills) if (v.isAdult()) { v.mood = Math.min(100, v.mood + 3); experience(v, 'raid', 0.1) }
    w.emit('war', `The army returns from ${n.name} victorious${dead.length ? `, though ${dead.map(v => v.name).join(', ')} did not come home` : ''}. ${n.name} will pay tribute for a time. Plunder: ${f.food} food, ${f.wood} firewood, ${f.stone} stone.`, { n, kind: 'campaign', outcome: 'won', fallen: dead.length });
  } else if (res.win === 'def') {
    W.lost++; W.morale = Math.max(0.15, W.morale - 0.25); n.strength += 2; n.rel -= 8; n.raidCd = Math.min(n.raidCd, w.day + 8); n.grudge = (n.grudge || 0) + 0.2;
    for (const v of w.vills) v.mood = Math.max(0, v.mood - 6);
    w.emit('war', `The campaign against ${n.name} fails. ${dead.length} soldiers are lost, and the survivors straggle home.`, { n, kind: 'campaign', outcome: 'lost', fallen: dead.length });
  } else {
    W.drawn++; W.morale = Math.max(0.15, W.morale - 0.05); n.rel -= 4; n.strength = Math.max(5, n.strength - res.dLost);
    w.emit('war', `The army fights ${n.name}'s warriors to a bloody standstill and withdraws with ${dead.length} fallen.`, { n, kind: 'campaign', outcome: 'drawn', fallen: dead.length });
  }
  logBattle(w, { kind: 'campaign', foe: n.name, outcome: res.win === 'att' ? 'won' : res.win === 'def' ? 'lost' : 'drawn', ours: ids.length, lostOurs: res.aLost, lostTheirs: res.dLost })
}
