'use strict';
/* ==========================================================================
   regime.js — how the village is run, as it actually turns out. Nothing is
   rolled or scripted. Six slow-moving qualities of the village (authority,
   community, faith, industry, openness, unity) are pulled by:
     - who leads (their character and upbringing, see character.js),
     - what the village has lived through (crisis, plenty, losses, raids),
     - how divided or united its people are.
   Those qualities decide a regime (a tyranny, a communal state, a spiritual
   commonwealth, a merchant republic, an industrial state, a fractured town,
   a free council...) and have real consequences for work, mood, crime,
   learning, trade and succession. Strongmen seize power, prophets rise,
   hard regimes meet uprisings, and chiefs hand power to their children.
   ========================================================================== */
const DIV_NAMES = ['rivalries between circles', 'polarised opinions', 'discontent', 'a split in faith', 'gaps between the circles on policy', 'a large opposition', 'people who feel alien under this rule', 'inequality', 'a recent coup', 'a recent purge', 'open strife'];
const AXES = ['auth', 'comm', 'pious', 'indus', 'open', 'cohes'];
const AXIS_TXT = { auth: 'Authority', comm: 'Community', pious: 'Faith', indus: 'Industry', open: 'Openness', cohes: 'Unity' };
const REGIME_TXT = {
  'Founders’ Village': 'No strong creed has formed yet; the founders’ habits still rule.',
  'Free Council': 'Power is shared and answerable. Debate is lively and leaders can be voted out.',
  'Tyranny': 'One hard hand rules by fear. Work is driven and crime is cowed, but the people are bitter and learning suffers.',
  'Autocracy': 'A strong ruler decides; most obey. Order and speed come at a price in freedom and mood.',
  'Communal State': 'Everything is held in common under firm direction. Wealth is equal, trade is stifled, individualists chafe.',
  'Commune': 'The village works as one household, by consent. Fellowship is high; markets are small.',
  'Spiritual Commonwealth': 'Shared faith binds the village. Few crimes, many festivals, gentle spirits, and a cautious mind.',
  'Theocracy': 'Priests and faith command the village. Obedience and ritual are strong; questioning is not welcome.',
  'Merchant Republic': 'Trade and openness rule. Wealth, learning and visitors flow, and so does inequality.',
  'Industrial State': 'Work, tools and output come first. Production and invention surge; rest and gentleness do not.',
  'Fractured Town': 'The village never really united. Circles feud, councils stall, and every project is a struggle.'
};
const defaultAxes = () => ({ auth: 0.35, comm: 0.4, pious: 0.35, indus: 0.15, open: 0.3, cohes: 0.7 });
function initRegime(w) { w.regime = { ax: defaultAxes(), label: 'Founders’ Village', since: 0, cand: null, candDays: 0, history: [], heir: null, dynasty: 0, prophet: null, coups: 0, revolts: 0, unrest: 0, lastCoup: -999, lastProphet: -999, noManage: 0, leaderText: '', purges: 0 }; w.rx = rxFrom(w.regime.ax) }
const chiefOf = w => { const c = w.gov.council.find(c => c.title === 'Chief'); return c ? memberOf(w, c.id) : null };

/* what a village this way inclined actually experiences */
function rxFrom(a) {
  const A = Math.max(0, a.auth - 0.45) / 0.55, C = Math.max(0, a.comm - 0.5) / 0.5, P = Math.max(0, a.pious - 0.5) / 0.5, I = Math.max(0, a.indus - 0.4) / 0.6, O = Math.max(0, a.open - 0.5) / 0.5;
  return {
    A, C, P, I, O,
    prod: 1 + 0.10 * A + 0.08 * I + 0.04 * C - 0.05 * P,               // work speed (divide work time by this)
    know: Math.max(0.55, 1 + 0.25 * O + 0.15 * I - 0.3 * P - 0.3 * A),   // how fast learning counts
    crime: Math.max(0.3, (1 - 0.4 * A) * (1 - 0.3 * P) * (1 + 0.8 * Math.max(0, 0.6 - a.cohes))),
    birth: 1 + 0.15 * P - 0.10 * A,
    trade: (C > 0.2 ? 1.6 : 1) * (O > 0.2 ? 0.7 : 1),                   // caravan interval multiplier
    def: 1.2 * A + 0.5 * I,
    devotion: a.pious > 0.6,
  };
}
function regimeLabel(a, leader) {
  if (a.cohes < 0.3) return 'Fractured Town';
  if (a.auth > 0.65 && a.comm > 0.72) return 'Communal State';
  if (a.auth > 0.65 && a.pious > 0.66) return 'Theocracy';
  if (a.auth > 0.65) return leader && leader.ruth > 0.6 ? 'Tyranny' : 'Autocracy';
  if (a.pious > 0.64) return 'Spiritual Commonwealth';
  if (a.indus > 0.68) return 'Industrial State';
  if (a.open > 0.72 && a.comm < 0.55) return 'Merchant Republic';
  if (a.comm > 0.66) return 'Commune';
  if (a.auth < 0.4) return 'Free Council';
  return 'Founders’ Village';
}

/* how one person would run things */
function styleOf(v) {
  ensureChar(v.w, v); const c = v.char, t = v.trait;
  return { auth: 0.4 * c.ruth + 0.25 * c.amb + 0.2 * (1 - t.kind) + 0.15 * t.brave, comm: 0.5 * (1 - t.ind) + 0.25 * t.soc + 0.25 * t.kind - 0.2 * (c.amb - 0.5), pious: c.piety,
    indus: 0.4 * t.cur + 0.3 * t.ind + 0.3 * c.amb, open: 0.4 * t.cur + 0.3 * t.soc + 0.3 * t.kind, cohes: 0.5 * t.soc + 0.3 * t.kind + 0.2 * (1 - c.amb) - 0.25 * (c.ruth - 0.5) };
}
/* the weighted style of those who lead: the Chief counts for five */
function leaderVector(w) {
  const ms = councilMembers(w); if (!ms.length) return null; let tot = 0; const s = Object.fromEntries(AXES.map(k => [k, 0])), L = { ruth: 0, piety: 0, amb: 0, kind: 0 };
  for (const m of ms) { const st = styleOf(m.v), wt = m.title === 'Chief' ? 5 : 1; tot += wt; for (const k of AXES) s[k] += wt * st[k]; L.ruth += wt * m.v.char.ruth; L.piety += wt * m.v.char.piety; L.amb += wt * m.v.char.amb; L.kind += wt * m.v.trait.kind }
  for (const k of AXES) s[k] /= tot; for (const k in L) L[k] /= tot; s.c = L; return s;
}
function polarization(ad) {
  if (ad.length < 6) return 0; let s = 0; for (const k of ISSUES) { const m = ad.reduce((x, v) => x + v.op[k], 0) / ad.length; s += Math.sqrt(ad.reduce((x, v) => x + (v.op[k] - m) * (v.op[k] - m), 0) / ad.length) } return s / ISSUES.length;
}
function crisisIndex(w) {
  const pop = w.vills.length, crime = w.settings.crime ? clamp(crimeRate(w, 8) / Math.max(3, pop * 0.08), 0, 1) : 0;
  return clamp(0.5 * crime + 0.9 * Math.max(lesson(w, 'famine'), 1.1 * lesson(w, 'raids'), 0.7 * lesson(w, 'wolves'), 0.7 * lesson(w, 'cold'), 0.6 * lesson(w, 'fever')), 0, 1);
}

/* once a day */
function regimeDay(w) {
  const R = w.regime; if (!R) return; const ad = adultsOf(w); if (ad.length < 6) return;
  const L = leaderVector(w), a = R.ax, crisis = crisisIndex(w), approval = w.gov.approval;
  const roles = ad.filter(v => v.role === 'miner' || v.role === 'woodcutter' || v.role === 'builder').length / ad.length;
  const pairs = w.groups.length * (w.groups.length - 1) / 2; let riv = 0; for (const g of w.groups) for (const h of w.groups) if (g.id < h.id && (g.stance[h.id] || 0) < -0.3) riv++;
  const disc = ad.filter(v => v.mood < 40).length / ad.length; let alien0 = 0; for (const v of ad) { const st = styleOf(v); alien0 += (Math.abs(st.auth - a.auth) + Math.abs(st.comm - a.comm) + Math.abs(st.pious - a.pious)) / 3 / ad.length }
  let gap = 0, gn = 0; for (const g of w.groups) for (const h of w.groups) if (g.id < h.id && g.op && h.op) { gap += ISSUES.reduce((s, k) => s + Math.abs(g.op[k] - h.op[k]), 0) / ISSUES.length; gn++ }
  const pm = ad.reduce((s, v) => s + v.char.piety, 0) / ad.length, psplit = clamp(Math.sqrt(ad.reduce((s, v) => s + (v.char.piety - pm) * (v.char.piety - pm), 0) / ad.length) / 0.3, 0, 1);
  const opp = w.groups.filter(g => g.satisfied < -0.4).reduce((s, g) => s + g.members.length, 0) / Math.max(1, ad.length);
  const divParts = [0.22 * (pairs ? riv / pairs : 0), 0.2 * clamp(polarization(ad) / 0.5, 0, 1), 0.18 * disc, 0.12 * psplit, 0.14 * clamp((gn ? gap / gn : 0) / 0.5, 0, 1), 0.14 * clamp(opp / 0.4, 0, 1), 0.22 * clamp((alien0 - 0.1) / 0.2, 0, 1), 0.15 * (w.has('coinage') ? giniOf(ad) : 0), 0.1 * clamp(1 - (w.day - R.lastCoup) / 60, 0, 1), 0.08 * clamp(1 - (w.day - (R.lastPurge || -999)) / 60, 0, 1), strifeDiv(w)], div = divParts.reduce((s, x) => s + x, 0); R.div = div; R.psplit = psplit; R.alien = alien0; R.divParts = divParts;
  const wealth = w.has('coinage') ? giniOf(ad) : 0, techs = id => (w.has(id) ? 1 : 0);
  const T = {}, P = Object.fromEntries(AXES.map(k => [k, 0]));
  for (const v of ad) { const st = styleOf(v); for (const k of AXES) P[k] += st[k] / ad.length }
  // the people's own temper is the ground; the character of those in charge is felt strongly on top of it
  for (const k of AXES) T[k] = L ? 0.25 + 0.5 * P[k] + 1.7 * (L[k] - P[k]) : a[k];
  R.pop = P;
  T.auth += 0.45 * crisis - (approval > 70 && crisis < 0.15 ? 0.12 : 0) + 0.08 * (w.gov.policy.law + w.gov.policy.defense) / 2;
  T.comm += 0.3 * wealth + 0.12 * (w.stock.food < ad.length * 2 ? 1 : 0) - 0.1 * (w.econ && w.econ.trades.length > 4 ? 1 : 0);
  T.pious += 0.25 * (lesson(w, 'famine') + lesson(w, 'fever') + lesson(w, 'cold')) / 3 + (R.prophet ? 0.18 : 0);
  T.indus += 0.5 * (roles - 0.45) + 0.02 * (techs('mining') + techs('ironwork') + techs('forestry') + techs('tools'));
  T.open += 0.1 * w.gov.policy.growth + (w.neigh ? 0.04 * w.neigh.filter(n => n.pact > 0).length : 0) - 0.3 * lesson(w, 'raids') - 0.05 - 0.2 * Math.max(0, a.auth - 0.4) - 0.15 * Math.max(0, a.pious - 0.45) - 0.1 * crisis;
  T.cohes = 0.4 * T.cohes + 0.6 * clamp(1.0 - 3.1 * div, 0, 1);
  for (const k of AXES) { T[k] += 0.25 * (a[k] - 0.5); T[k] = clamp(T[k], 0, 1); a[k] = clamp(a[k] + (T[k] - a[k]) * 0.02, 0, 1) }       // a way of life reinforces itself
  // the label changes only when the change lasts
  const cand = regimeLabel(a, L && L.c);
  if (cand !== R.label) { if (cand === R.cand) R.candDays++; else { R.cand = cand; R.candDays = 1 } if (R.candDays >= 8) { const old = R.label; R.label = cand; R.since = w.day; R.candDays = 0; R.history.unshift({ day: w.day, year: w.year, from: old, to: cand }); if (R.history.length > 8) R.history.pop(); if (w.day > 20) w.emit('regime', `The village has become ${/^[AEIOU]/.test(cand) ? 'an' : 'a'} ${cand}. ${REGIME_TXT[cand] || ''}`, { label: cand }) } } else { R.cand = null; R.candDays = 0 }
  w.rx = rxBuildings(w, rxFrom(a));
  R.leaderText = leaderText(w);
  updateHeir(w);
  if (w.day % 2 === 0) regimeEvents(w, crisis, approval, ad);
  // people internalise the regime a little each day
  const rx = w.rx; for (const v of ad) { if (rx.A > 0.2) { v.op.law = clamp(v.op.law + 0.0012 * rx.A * (1 - v.trait.ind), -1, 1); v.op.labor = clamp(v.op.labor - 0.001 * rx.A, -1, 1) } if (rx.P > 0.2) v.op.growth = clamp(v.op.growth + 0.0008 * rx.P, -1, 1); if (rx.C > 0.2) v.op.tax = clamp(v.op.tax + 0.001 * rx.C, -1, 1) }
}
function giniOf(ad) { const cs = ad.map(v => v.coins || 0).sort((a, b) => a - b), tot = cs.reduce((a, b) => a + b, 0); if (!tot) return 0; let c = 0; cs.forEach((x, i) => { c += (2 * (i + 1) - cs.length - 1) * x }); return c / (cs.length * tot) }
function leaderText(w) {
  const c = chiefOf(w); if (!c) return ''; ensureChar(w, c); return `${c.name} is ${ruthWord(c.char)}, ${faithWord(c.char)} and ${ambWord(c.char)}. ${upbringingText(c)}`;
}
function updateHeir(w) {
  const R = w.regime, c = chiefOf(w); if (!c || R.ax.auth < 0.5) { R.heir = null; return }
  const kids = c.kids.map(id => w.vills.find(v => v.id === id)).filter(k => k && k.isAdult()); if (!kids.length) { R.heir = null; return }
  kids.sort((a, b) => (0.5 * b.charisma() + 0.3 * b.char.amb + 0.2 * b.char.ruth * R.ax.auth) - (0.5 * a.charisma() + 0.3 * a.char.amb + 0.2 * a.char.ruth * R.ax.auth)); R.heir = kids[0].id;
}
/* mood under the regime depends on who you are */
function regimeMood(v) {
  const w = v.w, rx = w.rx; if (!rx || !v.char) return 0; let m = 0;
  m += -11 * rx.A * (0.3 + 0.9 * v.trait.ind) + 3 * rx.A * v.char.ruth;
  m += rx.C * (4 * (1 - v.trait.ind) - 5 * v.trait.ind);
  m += rx.P * (5 * v.char.piety - 3 * (1 - v.char.piety) * v.trait.cur);
  m -= 2 * rx.I; m += 2 * rx.O * v.trait.cur;
  if (w.regime.ax.cohes < 0.45) m -= 6 * (0.45 - w.regime.ax.cohes) / 0.45;
  return m;
}
/* when a Chief dies, a designated heir may inherit the leadership */
function onChiefDeath(w, v) {
  const R = w.regime, g = w.gov, c = g.council.find(x => x.id === v.id); if (!R || !c || c.title !== 'Chief') return;
  const heir = R.heir ? w.vills.find(x => x.id === R.heir && x.alive) : null;
  if (heir && R.ax.auth > 0.5) {
    const ex = g.council.find(x => x.id === heir.id); g.council = g.council.filter(x => x.id !== v.id);
    if (ex) ex.title = 'Chief'; else g.council.unshift({ id: heir.id, title: 'Chief' }); g.council.sort((a, b) => (b.title === 'Chief') - (a.title === 'Chief'));
    R.dynasty++; experience(heir, 'power', 2); heir.mood = Math.min(100, heir.mood + 10); heir.story(`Inherited the leadership from ${v.name}.`);
    w.emit('regime', `${v.name} has died. ${heir.name}, ${ruthWord(heir.char)} and ${ambWord(heir.char)}, takes up the leadership as their child and heir.`, { succession: true });
  } else { g.termEnd = Math.min(g.termEnd, w.day + 2) }
}
/* with enough authority the Chief does not stand for election: loyalists fill the council */
function managedElection(w, why) {
  const R = w.regime; if (!R || why === 'first' || R.ax.auth <= 0.65 || w.day < R.noManage) return false; const chief = chiefOf(w); if (!chief || chief.age > CFG.OLD_DAYS * 0.9) return false;
  const g = w.gov, ad = adultsOf(w), size = councilSize(ad.length), prev = new Set(g.council.map(c => c.id));
  const cands = ad.filter(v => v !== chief && v.age < 80).map(v => ({ v, s: 0.5 * Math.max(0, relOf(w, chief, v)) / 100 + 0.3 * (v.group && v.group === chief.group ? 1 : 0) + 0.2 * v.char.amb + 0.15 * (prev.has(v.id) ? 1 : 0) + 0.1 * (1 - v.trait.ind) })).sort((a, b) => b.s - a.s).slice(0, size - 1);
  const titles = ['Warden', 'Steward', 'Speaker']; g.council = [{ id: chief.id, title: 'Chief' }, ...cands.map((c, i) => ({ id: c.v.id, title: titles[i] || 'Councillor' }))]; g.termEnd = w.day + CFG.DPS * 4; g.elections++;
  w.emit('election', `The term ends, but ${chief.name} does not stand to be judged: the Chief names a council of loyal supporters, and no one dares object.`, { managed: true }); return true;
}
/* ----- events that arise from the conditions ----- */
function regimeEvents(w, crisis, approval, ad) {
  const R = w.regime, g = w.gov, chief = chiefOf(w), pop = ad.length;
  if (R.prophet && !w.vills.some(v => v.id === R.prophet.id)) { R.prophet = null }
  // unrest builds where a hard regime is hated
  if (R.ax.auth > 0.6 && approval < 53) R.unrest += 2; else if (R.ax.auth > 0.7 && approval < 66) R.unrest += 1; else if (R.ax.auth > 0.5 && approval < 45) R.unrest += 1; else if (R.ax.auth > 0.6 && (R.alien || 0) > 0.2 && ad.filter(v => v.mood < 50).length >= 0.25 * pop) R.unrest += 1; else R.unrest = Math.max(0, R.unrest - 2);
  // 1. uprising
  if (R.unrest >= 24 && pop >= 14 && ad.filter(v => v.mood < 48).length >= 0.18 * pop && w.r() < 0.1 * (projBuilt(w, 'citadel') ? 0.5 : 1)) return uprising(w, ad, chief);
  // 2. a strongman seizes power
  if (R.ax.auth < 0.75 && pop >= 14 && w.day - R.lastCoup > 80 && w.day > 60) { const p = 0.055 * (projBuilt(w, 'citadel') ? 0.5 : 1) * (0.3 + 1.4 * crisis + (approval < 55 ? 0.5 : 0)) * (1 + 2.5 * Math.max(0, 0.6 - R.ax.cohes)); if (w.r() < p && tryCoup(w, ad, chief, crisis)) return }
  // 3. a prophet rises
  if (!R.prophet && pop >= 12 && w.day - R.lastProphet > 120) {
    const cand = ad.filter(v => v.char.piety > 0.7 && v.charisma() > 0.5 && v.age < 75).sort((a, b) => b.char.piety * b.charisma() - a.char.piety * a.charisma())[0];
    if (cand && w.r() < 0.015 + 0.08 * crisis) {
      R.prophet = { id: cand.id, name: cand.name, since: w.day }; R.lastProphet = w.day; let n = 0;
      for (const o of ad) if (o !== cand && (o.group && o.group === cand.group || relOf(w, cand, o) > 10 || w.r() < 0.25)) { experience(o, 'prophecy', 1 - 0.4 * o.trait.cur); n++ }
      experience(cand, 'power', 1); cand.reputation = Math.min(100, cand.reputation + 10); cand.mood = Math.min(100, cand.mood + 12); cand.story('Began to preach, and many listened.'); R.ax.pious = Math.min(1, R.ax.pious + 0.08);
      w.emit('regime', `${cand.name} begins to preach of a higher meaning${crisis > 0.35 ? ' in these hard times' : ''}. ${n} listen and take it to heart.`, { prophet: cand });
    }
  }
  // 4. a hard ruler purges critics
  if (R.ax.auth > 0.7 && chief && chief.char.ruth > 0.55 && w.day - (R.lastPurge || -999) > 50 && w.r() < 0.09) {
    const targets = ad.filter(v => v !== chief && !g.council.some(c => c.id === v.id)).sort((a, b) => (relOf(w, chief, a) - 20 * a.trait.ind - 10 * a.op.law) - (relOf(w, chief, b) - 20 * b.trait.ind - 10 * b.op.law)).slice(0, 1 + (w.r() < 0.4 ? 1 : 0));
    if (targets.length) { R.lastPurge = w.day; R.purges++; for (const t of targets) { t.stocksUntil = w.tick + CFG.TPD * 3; t.mood = Math.max(0, t.mood - 15); w.rel.set(w.relKey(chief, t), -60); t.story(`Was seized on ${chief.name}'s orders for speaking out.`) } for (const v of ad) v.mood = Math.max(0, v.mood - 1.5); w.emit('regime', `${chief.name} has ${targets.map(t => t.name).join(' and ')} seized and locked in the stocks as critics. The village goes quiet.`, { purge: true }) }
  }
  // 5. a gentle chief eases a heavy hand
  if (R.ax.auth > 0.55 && chief && chief.char.ruth < 0.4 && approval < 60 && w.r() < 0.02) { R.ax.auth = Math.max(0, R.ax.auth - 0.12); w.emit('regime', `${chief.name} eases the heavy hand: some orders are withdrawn and some grievances heard.`, { reform: true }) }
  // 6. a divided village turns on itself
  if (R.ax.cohes < 0.45 && w.settings.crime && w.groups.length >= 2 && w.r() < 0.08) {
    const rivals = []; for (const g1 of w.groups) for (const g2 of w.groups) if (g1.id < g2.id && (g1.stance[g2.id] || 0) < -0.2) rivals.push([g1, g2]);
    if (rivals.length) { const [g1, g2] = rivals[(w.r() * rivals.length) | 0], a = memberOf(w, g1.members[(w.r() * g1.members.length) | 0]), b = memberOf(w, g2.members[(w.r() * g2.members.length) | 0]); if (a && b && !a.isChild() && !b.isChild()) { w.say(`Hot words between ${g1.name} and ${g2.name} come to blows: ${a.name} and ${b.name} fight in the street.`); assault(w, a, b, a, b) } }
  }
}
function tryCoup(w, ad, chief, crisis) {
  const R = w.regime, g = w.gov;
  const cand = ad.filter(v => v !== chief && v.age < 70 && v.char.amb > 0.58 && v.char.ruth > 0.42 && v.charisma() > 0.48).sort((a, b) => b.char.amb * b.charisma() - a.char.amb * a.charisma())[0]; if (!cand) return false;
  const followers = ad.filter(o => o !== cand && (o.group && o.group === cand.group || relOf(w, cand, o) > 25) && o.char.ruth > 0.35); if (followers.length < Math.max(3, Math.round(0.06 * ad.length))) return false;
  const size = councilSize(ad.length), crew = followers.sort((a, b) => b.char.amb - a.char.amb).slice(0, size - 1), titles = ['Warden', 'Steward', 'Speaker'], old = g.council.map(c => memberOf(w, c.id)).filter(Boolean);
  g.council = [{ id: cand.id, title: 'Chief' }, ...crew.map((v, i) => ({ id: v.id, title: titles[i] || 'Councillor' }))]; g.termEnd = w.day + CFG.DPS * 8; g.elections++;
  R.ax.auth = Math.min(1, R.ax.auth + 0.15); R.ax.cohes = Math.max(0, R.ax.cohes - 0.08); R.lastCoup = w.day; R.coups++; R.noManage = 0; experience(cand, 'power', 3); cand.story('Seized the leadership of the village.');
  for (const o of old) if (!g.council.some(c => c.id === o.id)) { o.mood = Math.max(0, o.mood - 10); if (o === chief) { o.stocksUntil = w.tick + CFG.TPD * 2; o.story('Was thrown from power and locked in the stocks.') } }
  for (const v of ad) if (v.trait.ind > 0.6 && v.char.ruth < 0.45) v.mood = Math.max(0, v.mood - 6);
  w.emit('regime', `${cand.name}, ${ruthWord(cand.char)} and ${ambWord(cand.char)}, seizes power with ${crew.length} supporters${crisis > 0.35 ? ' in a time of crisis' : ''}. The old council is dismissed${chief ? ' and ' + chief.name + ' is locked in the stocks' : ''}.`, { coup: cand }); return true;
}
function uprising(w, ad, chief) {
  const R = w.regime, g = w.gov, leader = ad.filter(v => !g.council.some(c => c.id === v.id) && v.trait.brave > 0.5 && v.charisma() > 0.5).sort((a, b) => b.charisma() - a.charisma())[0] || null;
  R.ax.auth = Math.max(0.1, R.ax.auth - 0.35); R.unrest = 0; R.revolts++; R.noManage = w.day + 60; g.termEnd = w.day;
  const fighters = ad.filter(v => v.trait.brave > 0.55).sort(() => w.r() - 0.5).slice(0, 3), dead = []; for (const f of fighters) if (w.r() < 0.35) { f.health = -1; f.cause = 'strife'; dead.push(f) }
  for (const v of ad) { v.mood = Math.min(100, v.mood + (v.char.ruth < 0.55 ? 6 : -6)) }
  if (chief) { chief.stocksUntil = w.tick + CFG.TPD * 3; chief.mood = Math.max(0, chief.mood - 15); chief.story('Was overthrown by the people.') }
  if (leader) { experience(leader, 'power', 2); leader.reputation = Math.min(100, leader.reputation + 12); leader.story('Led the uprising against the hard rule.') }
  w.emit('regime', `The people rise against ${chief ? chief.name : 'their rulers'}${leader ? ', led by ' + leader.name : ''}. The old order is overthrown${dead.length ? ' and ' + dead.map(d => d.name).join(', ') + (dead.length > 1 ? ' fall' : ' falls') + ' in the struggle' : ''}. A new council will be chosen freely.`, { revolt: true });
}

/* what the regime wants to learn about (added to the council's sense of need) */
function regimeNeed(w, id) {
  const rx = w.rx; if (!rx) return 0;
  const tbl = { mining: rx.I, ironwork: 0.8 * rx.I + 0.8 * rx.A, forestry: 0.6 * rx.I, tools: 0.6 * rx.I, watchtowers: 0.8 * rx.A, medicine: rx.P, granary: 0.6 * rx.P + 0.6 * rx.C, rotation: 0.6 * rx.C, plow: 0.5 * rx.C, trade: rx.O, coinage: rx.O, seatrade: rx.O, navigation: 0.7 * rx.O, boats: 0.5 * rx.O, masonry: 0.3 * rx.A + 0.3 * rx.I, carpentry: 0.2 * rx.C };
  return 0.2 * (tbl[id] || 0);
}
/* what a great work means to this kind of village */
function regimeProjectBias(w, id) {
  const rx = w.rx; if (!rx) return 0;
  const tbl = { bastion: 0.5 * rx.A + 0.3 * rx.I, monument: 0.6 * rx.A + 0.5 * rx.P, library: 0.5 * rx.O - 0.4 * rx.P - 0.3 * rx.A, hall: 0.4 * rx.C + 0.2 * rx.O, amphitheatre: 0.4 * rx.C + 0.3 * rx.P, granaryhall: 0.4 * rx.C + 0.2 * rx.P, lighthouse: 0.5 * rx.O + 0.2 * rx.I, temple: 0.6 * rx.P + 0.2 * rx.C, foundry: 0.7 * rx.I + 0.2 * rx.A, citadel: 0.6 * rx.A + 0.2 * rx.I, barracks: 0.5 * rx.A + 0.2 * rx.I, watchtower: 0.3 * rx.A + 0.2 * rx.O };
  return 0.2 * (tbl[id] || 0);
}
