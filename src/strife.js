/* ============================================================================
   strife.js — when a village divides (v0.15)

   A circle that feels unheard can set up a rival council, call a strike, or
   fight in the streets. A split that cannot be mended ends with a boat: the
   circle sails off and founds a settlement of its own, which becomes a
   neighbour with its own memory of how it left. A charismatic believer can
   found a sect with a doctrine of its own, which the council may tolerate,
   embrace or suppress.
   ========================================================================== */
const DOCTRINES = {
  zealots: { label: 'Zealots', blurb: 'insist on one true way and press it on everyone', names: ['the Unbending', 'the Burning Word', 'the Pure Flame'] },
  ascetics: { label: 'Ascetics', blurb: 'give up comfort and property to live simply together', names: ['the Quiet Fast', 'the Bare Hearth', 'the Open Hand'] },
  reformers: { label: 'Reformers', blurb: 'welcome questions and teach that faith should be lived, not imposed', names: ['the Lantern', 'the Wayfarers', 'the Second Dawn'] }
};
const COLONY_STEADS = ['stead', 'holm', 'haven', 'ford', 'wick'];

function initStrife(w) {
  w.strife = { shadow: null, strike: null, civil: null, sect: null, secessions: 0, crushes: 0, strikes: 0, clashes: 0, schisms: 0, casualties: 0, lastShadow: -999, lastStrike: -999, lastSecede: -999, lastSchism: -999, truceUntil: 0, log: [] };
}
const sOf = w => { if (!w.strife) initStrife(w); return w.strife };
const vOf = (w, ids) => ids.map(i => memberOf(w, i)).filter(Boolean);
const canSail = w => !!(w.neigh && w.neigh.length && (w.has('boats') || w.of('dock').length > 0 || w.neigh.some(n => n.reach === 'land')));
const bestOf = (list, f) => list.reduce((a, b) => (a && f(a) >= f(b) ? a : b), null);
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const firstName = n => String(n).split(' ')[0];
function slog(w, text) { const S = sOf(w); S.log.unshift(`D${w.day}: ${text}`); if (S.log.length > 6) S.log.pop() }

/* how much the village's divisions weigh on its unity right now */
const SECEDE_GAP = 128, SECEDE_SHARE = 0.3, SECEDE_RELIEF = 140;      // a faction may leave about once in four years, and never more than 30% of the adults
function strifeDiv(w) {
  const S = w.strife; if (!S) return 0; let d = 0;
  if (S.shadow) d += 0.2; if (S.strike) d += 0.08; if (S.civil) d += 0.18;
  if (S.sect) { const share = S.sect.members.length / Math.max(8, w.vills.length), k = S.sect.doctrine === 'zealots' ? 0.5 : 0.3; d += k * share * (S.sect.stance === 'embraced' ? 0.4 : S.sect.stance === 'suppressed' ? 1.2 : 1) }
  if (w.day < S.truceUntil) d -= 0.1;
  if (S.reliefUntil && w.day < S.reliefUntil) d -= 0.16 * (S.reliefUntil - w.day) / SECEDE_RELIEF;           // the air clears after a faction leaves
  return d;
}
/* what the great buildings of a regime add to its effects */
function rxBuildings(w, rx) {
  if (projBuilt(w, 'foundry')) { rx.prod *= 1.08; rx.know *= 1.05 }
  if (projBuilt(w, 'temple')) { rx.crime *= 0.85; rx.devotion = true }
  if (projBuilt(w, 'citadel')) { rx.def += 1.5; rx.crime *= 0.85 }
  return rx;
}

/* ----- once a day ----- */
function strifeDay(w) {
  const S = sOf(w), R = w.regime; if (!R) return; const ad = adultsOf(w); if (ad.length < 10) return;
  if (S.shadow || S.civil || S.strike || S.sect) S.active = true;
  shadowDay(w, ad); civilDay(w, ad); strikeDay(w, ad); sectDay(w, ad);
}

/* how aggrieved is one villager: unhappy, at odds with the way things are run, or far from the policies in force */
function personalGrievance(w, v) {
  const a = w.regime.ax, st = styleOf(v), dist = (Math.abs(st.auth - a.auth) + Math.abs(st.comm - a.comm) + Math.abs(st.pious - a.pious)) / 3;
  const gap = ISSUES.reduce((s, k) => s + Math.abs(v.op[k] - w.gov.policy[k]), 0) / ISSUES.length;
  return 0.4 * clamp((62 - v.mood) / 25, 0, 1) + 0.4 * clamp((dist - 0.1) / 0.2, 0, 1) + 0.3 * clamp((gap - 0.3) / 0.5, 0, 1) + feudGrievance(w, v);
}
/* the aggrieved of every circle make a bloc: those who might back a rival council or a strike */
function aggrievedBloc(w, ad) {
  const council = new Set(w.gov.council.map(c => c.id)), ruling = w.gov.ruling ? w.gov.ruling.gid : -1, chief = chiefOf(w);
  const pool = ad.filter(v => !council.has(v.id) && v.group !== ruling && !(chief && v.group && v.group === chief.group) && v.age < 75 && personalGrievance(w, v) >= 0.4);
  if (pool.length < Math.max(5, Math.round(0.1 * ad.length)) || pool.length > 0.6 * ad.length) return null;
  const leader = bestOf(pool, v => v.charisma() + 0.4 * v.char.amb); const byG = new Map(); for (const v of pool) if (v.group) byG.set(v.group, (byG.get(v.group) || 0) + 1);
  const top = [...byG.entries()].sort((a, b) => b[1] - a[1])[0], tg = top && w.groups.find(g => g.id === top[0]);
  const name = tg && top[1] >= 0.4 * pool.length ? tg.name : `${firstName(leader.name)}’s Party`, op = {}; for (const k of ISSUES) op[k] = pool.reduce((s, v) => s + v.op[k], 0) / pool.length;
  return { name, members: pool.map(v => v.id), op, leader };
}
/* ===== rival council ===== */
function endShadow(w, how, text) {
  const S = w.strife, sh = S.shadow; if (!sh) return; S.shadow = null; S.lastShadow = w.day;
  if (text) w.emit('regime', text, { shadow: how }); slog(w, text || `The rival council ends (${how}).`);
}
function shadowDay(w, ad) {
  const S = w.strife, R = w.regime, chief = chiefOf(w);
  if (S.shadow) {
    const sh = S.shadow, leader = memberOf(w, sh.leader), ms = vOf(w, sh.ids).filter(v => !v.isChild()), g = { name: sh.name, members: sh.ids, op: sh.op };
    sh.days = w.day - sh.since;
    if (!leader || ms.length < 4) return endShadow(w, 'faded', `The rival council of ${sh.name} fades away as its members drift apart.`);
    for (const v of ms) if (v.mood < 72) v.mood = Math.min(100, v.mood + 0.8);                       // they feel heard by their own
    for (const v of ad) if (!ms.includes(v)) v.mood = Math.max(0, v.mood - 0.1);
    if (R.ax.cohes > 0.62 && w.gov.approval > 68 && w.r() < 0.1) return endShadow(w, 'reconciled', `Calm returns, and ${sh.name} quietly set aside their rival council.`);
    if (!sh.asked && sh.days >= 4 && !S.civil) { sh.asked = true; return respondShadow(w, sh, g, leader, ms, chief) }
    if (S.civil) return;
    if (sh.days >= 12 && !sh.sailAsked && ms.length >= 5 && canSail(w) && w.day - S.lastSecede > SECEDE_GAP && w.r() < 0.1) { sh.sailAsked = true; return secessionTalks(w, g, leader, ms, 'standoff') }
    if (sh.days >= 8 && w.settings.crime && R.ax.cohes < 0.45 && w.day >= S.truceUntil && w.r() < 0.1) return startCivil(w, ad, g, leader, ms);
    return;
  }
  if (w.day < 50 || ad.length < 16 || w.day - S.lastShadow < 40 || w.day < S.truceUntil || R.ax.cohes > 0.55 || S.civil) return;
  const p = 0.012 + 0.08 * (0.55 - R.ax.cohes) / 0.55 + (R.ax.auth > 0.6 ? 0.015 : 0); if (w.r() >= p) return;
  const bl = aggrievedBloc(w, ad); if (!bl) return; const leader = bl.leader, ms = vOf(w, bl.members);
  if (canSail(w) && bl.members.length >= 6 && (S.crushes > 0 || R.ax.cohes < 0.38) && w.day - S.lastSecede > SECEDE_GAP && w.r() < 0.4) { S.lastShadow = w.day; w.emit('regime', `${bl.name} have had enough. ${leader.name} tells the council that ${bl.members.length} of them would rather leave than fight.`, { weary: true }); return secessionTalks(w, { name: bl.name, members: bl.members, op: bl.op }, leader, ms, 'weary') }
  S.shadow = { name: bl.name, ids: bl.members, op: bl.op, leader: leader.id, leaderName: leader.name, since: w.day, days: 0, asked: false };
  experience(leader, 'power', 1); leader.story(`Set up a rival council for ${bl.name}.`);
  w.emit('regime', `${bl.name} no longer recognise the council. ${leader.name} gathers ${ms.length} of them under the old trees as a rival council, and the village has two governments.`, { shadow: true });
  slog(w, `${bl.name} set up a rival council under ${leader.name}.`);
}
function respondShadow(w, sh, g, leader, ms, chief) {
  const R = w.regime, S = w.strife, gap = ISSUES.map(k => ({ k, d: g.op[k] - w.gov.policy[k] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  const hard = R.ax.auth > 0.6 || (chief && chief.char.ruth > 0.65), soft = !hard && avgTrait(w, 'kind') > 0.5;
  const options = [
    { id: 'seat', text: `Give ${leader.name} and ${g.name} a seat at the council table, and meet them on ${ISSUE_TXT[gap.k].name.toLowerCase()}` },
    { id: 'ignore', text: `Ignore the rival council and wait for it to wither` }
  ];
  if (R.ax.auth > 0.3 || w.settings.crime) options.push({ id: 'crush', text: `Seize ${leader.name} and break up the rival council` });
  ask(w, { kind: 'faction', topic: `${g.name} (${ms.length} members, unhappy with the village's direction) have set up a rival council led by ${leader.name}. They want the policy on ${ISSUE_TXT[gap.k].name.toLowerCase()} changed. How should the council answer?`, options, default: hard ? 'crush' : soft ? 'seat' : 'ignore',
    apply: (id, sp, reason, src) => {
      if (id === 'seat') {
        const gov = w.gov, k = gap.k; gov.policy[k] = clamp(gov.policy[k] + 0.3 * Math.sign(gap.d), -1, 1);
        const keep = gov.council.filter(c => c.title === 'Chief'), rest = gov.council.filter(c => c.title !== 'Chief').slice(0, Math.max(0, councilSize(adultsOf(w).length) - 2));
        gov.council = [...keep, ...rest, { id: leader.id, title: 'Councillor' }]; for (const v of ms) v.mood = Math.min(100, v.mood + 8);
        R.ax.cohes = Math.min(1, R.ax.cohes + 0.06); recordDecision(w, `to seat ${leader.name} of ${g.name} on the council and ease the policy on ${ISSUE_TXT[k].name.toLowerCase()}.`, sp, src);
        endShadow(w, 'absorbed', `${leader.name} takes a seat on the council, and the rival council of ${g.name} is dissolved. Their grievance is heard.`);
      } else if (id === 'crush') {
        const share = ms.length / Math.max(1, adultsOf(w).length), power = defenseScore(w) + (projBuilt(w, 'citadel') ? 2 : 0) + 3 * R.ax.auth, failP = clamp(0.15 + 1.2 * (share - 0.1) + 0.2 * (leader.trait.brave - 0.5) - 0.04 * power, 0.05, 0.7);
        if (w.settings.crime && w.r() < failP) { recordDecision(w, `to seize ${leader.name} and break up the rival council of ${g.name}, which went badly wrong.`, sp, src); w.say(`The council's men try to seize ${leader.name}, but ${g.name} stand together and drive them off.`); S.crushes++; w.gov.nextMeeting = w.day + 4; return startCivil(w, adultsOf(w), g, leader, ms) }
        S.crushes++; leader.stocksUntil = w.tick + CFG.TPD * 3; leader.story('Was seized for leading a rival council.'); for (const v of ms) v.mood = Math.max(0, v.mood - 8);
        R.ax.auth = Math.min(1, R.ax.auth + 0.04); R.unrest += 8; R.lastPurge = w.day; R.purges++; recordDecision(w, `to seize ${leader.name} and break up the rival council of ${g.name}.`, sp, src);
        endShadow(w, 'crushed', `The council has ${leader.name} seized and the rival council of ${g.name} broken up. The village is quiet, and nobody believes it is over.`);
      } else { w.gov.approval = Math.max(0, w.gov.approval - 2); recordDecision(w, `to ignore the rival council of ${g.name} and let it wither.`, sp, src); slog(w, 'The council ignores the rival council.') }
      w.gov.nextMeeting = w.day + 4;
    } });
}

/* ===== strikes ===== */
function strikeDay(w, ad) {
  const S = w.strife, R = w.regime, st = S.strike;
  if (st) {
    const ms = vOf(w, st.ids); if (w.day >= st.until || ms.length < 2) return endStrike(w, 'ran its course');
    for (const v of ms) v.strikeUntil = w.tick + CFG.TPD * 1.2;
    for (const v of ad) if (!ms.includes(v)) v.mood = Math.max(0, v.mood - 0.4);
    if (!st.asked && w.day - st.since >= 1) { st.asked = true; respondStrike(w, st) }
    return;
  }
  if (w.day < 45 || ad.length < 14 || w.day - S.lastStrike < 30 || S.civil) return;
  const gov = w.gov; if (R.ax.auth > 0.75 && gov.approval > 35) return;               // too dangerous under a very hard hand
  if (w.r() >= 0.02 * (1 + 2 * Math.max(0, 0.6 - R.ax.cohes))) return;
  const bl = aggrievedBloc(w, ad); if (!bl) return; const ms = vOf(w, bl.members).filter(v => !v.isChild());
  const dem = ISSUES.map(k => ({ k, d: bl.op[k] - gov.policy[k] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0], days = 3 + ((w.r() * 4) | 0);
  S.strike = { name: bl.name, ids: ms.map(v => v.id), issue: dem.k, dir: Math.sign(dem.d) || 1, since: w.day, until: w.day + days, asked: false }; S.strikes++; S.lastStrike = w.day;
  for (const v of ms) v.strikeUntil = w.tick + CFG.TPD * 1.2;
  w.emit('regime', `${bl.name} put down their tools. ${ms.length} villagers refuse to work until the council changes its policy on ${ISSUE_TXT[dem.k].name.toLowerCase()}.`, { strike: true }); slog(w, `${bl.name} went on strike.`);
}
function endStrike(w, how, text) { const S = w.strife, st = S.strike; if (!st) return; S.strike = null; for (const v of vOf(w, st.ids)) v.strikeUntil = 0; const t = text || `The strike of ${st.name} ${how}. Work resumes.`; w.say(t); slog(w, t) }
function respondStrike(w, st) {
  const R = w.regime, chief = chiefOf(w), ms = vOf(w, st.ids), name = ISSUE_TXT[st.issue].name.toLowerCase(), hard = R.ax.auth > 0.6 || (chief && chief.char.ruth > 0.65);
  const options = [{ id: 'concede', text: `Meet the strikers: shift the policy on ${name} toward their demand` }, { id: 'hold', text: `Refuse, and let the strike run its course` }];
  if (R.ax.auth > 0.3 || w.settings.crime) options.push({ id: 'break', text: `Order the strikers back to work, with their leaders put in the stocks` });
  ask(w, { kind: 'faction', topic: `${st.name} (${ms.length} villagers) are on strike over the village's policy on ${name}. Stores and building are slowing. What does the council do?`, options, default: hard ? 'break' : avgTrait(w, 'kind') > 0.5 ? 'concede' : 'hold',
    apply: (id, sp, reason, src) => {
      const gov = w.gov;
      if (id === 'concede') { gov.policy[st.issue] = clamp(gov.policy[st.issue] + 0.3 * st.dir, -1, 1); for (const v of ms) v.mood = Math.min(100, v.mood + 8); gov.approval = Math.min(100, gov.approval + 2); R.ax.cohes = Math.min(1, R.ax.cohes + 0.03); recordDecision(w, `to meet the strike of ${st.name} and shift the policy on ${name}.`, sp, src); endStrike(w, 'ended', `The council gives ground on ${name}, and the strike of ${st.name} ends in handshakes.`) }
      else if (id === 'break') { const lead = ms.slice().sort((a, b) => b.charisma() - a.charisma()).slice(0, 2); for (const v of lead) { v.stocksUntil = w.tick + CFG.TPD * 2; v.story('Was put in the stocks for leading a strike.') } for (const v of ms) v.mood = Math.max(0, v.mood - 10); R.ax.auth = Math.min(1, R.ax.auth + 0.02); R.unrest += 6; recordDecision(w, `to break the strike of ${st.name} by force.`, sp, src); endStrike(w, 'was broken', `The strike of ${st.name} is broken: ${lead.map(v => v.name).join(' and ')} are locked in the stocks and the rest go back to work, sullen.`) }
      else { gov.approval = Math.max(0, gov.approval - 2); recordDecision(w, `to refuse the strike of ${st.name} and wait it out.`, sp, src) }
      gov.nextMeeting = w.day + 4;
    } });
}

/* ===== civil strife ===== */
function startCivil(w, ad, g, leader, ms) {
  const S = w.strife; S.civil = { ids: g.members.slice(), op: g.op, name: g.name, leader: leader.id, since: w.day, rounds: 0, dead: [], hurt: 0 };
  w.emit('regime', `Fighting breaks out between the council's supporters and ${g.name}. Blows are traded in the streets and the village is afraid.`, { civil: true }); slog(w, `Fighting began between the council and ${g.name}.`);
}
function civilDay(w, ad) {
  const S = w.strife, c = S.civil, R = w.regime; if (!c) return;
  const g = { name: c.name, members: c.ids, op: c.op || {} }, leader = memberOf(w, c.leader), chief = chiefOf(w);
  const rebels = vOf(w, c.ids).filter(v => !v.isChild()), council = new Set(w.gov.council.map(x => x.id));
  const loyal = ad.filter(v => !rebels.includes(v) && (council.has(v.id) || (chief && (relOf(w, chief, v) > 5 || (v.group && v.group === chief.group))) || styleOf(v).auth > 0.55));
  const fit = v => v.alive && v.trait.brave > 0.42 && v.age < 65 && v.health > 30;
  const fr = rebels.filter(fit), fl = loyal.filter(fit);
  for (const v of ad) v.mood = Math.max(0, v.mood - 1.2);
  c.rounds++;
  const clash = (list, foes) => { const picks = list.slice().sort(() => w.r() - 0.5).slice(0, 1 + ((w.r() * 2) | 0)); for (const v of picks) { const roll = w.r(); if (roll < 0.1 && foes.length) { v.health = 0; v.cause = 'strife'; c.dead.push(v.name); S.casualties++ } else if (roll < 0.4) { v.health = Math.max(5, v.health - 35); c.hurt++; v.mood = Math.max(0, v.mood - 10) } } };
  clash(fr, fl); clash(fl, fr); S.clashes++;
  const sR = fr.length + (leader ? leader.charisma() * 2 : 0) + 0.5 * rebels.length, sL = fl.length + 2 + defenseScore(w) + 0.5 * loyal.length + (projBuilt(w, 'citadel') ? 2 : 0) + 3 * R.ax.auth;
  if (c.rounds < 3 + ((c.since + 1) % 3) && !(c.rounds >= 2 && (fr.length < 2 || fl.length < 2))) return;
  S.civil = null; S.truceUntil = w.day + 30;
  const out = sL > 1.4 * sR ? 'crushed' : sR > 1.4 * sL ? 'overthrown' : 'stalemate', fallen = c.dead.length ? ` ${c.dead.join(', ')} did not survive.` : '';
  if (out === 'crushed') {
    if (leader) { leader.stocksUntil = w.tick + CFG.TPD * 4; leader.story('Lost the fight against the council and was locked in the stocks.') } for (const v of rebels) v.mood = Math.max(0, v.mood - 10);
    R.ax.auth = Math.min(1, R.ax.auth + 0.05); R.ax.cohes = Math.min(1, R.ax.cohes + 0.05); R.unrest += 10; R.lastPurge = w.day; R.purges++;
    endShadow(w, 'crushed'); w.emit('regime', `The fighting ends: the council's side holds the village.${fallen} ${g.name} are beaten and ${leader ? leader.name + ' is locked in the stocks' : 'their leader is gone'}. The peace that follows is not a happy one.`, { civilEnd: 'crushed' });
  } else if (out === 'overthrown' && leader) {
    const crew = rebels.filter(v => v !== leader).sort((a, b) => b.char.amb - a.char.amb).slice(0, councilSize(ad.length) - 1), titles = ['Warden', 'Steward', 'Speaker'], old = w.gov.council.map(x => memberOf(w, x.id)).filter(Boolean);
    w.gov.council = [{ id: leader.id, title: 'Chief' }, ...crew.map((v, i) => ({ id: v.id, title: titles[i] || 'Councillor' }))]; w.gov.termEnd = w.day + CFG.DPS * 8; w.gov.elections++;
    const st = styleOf(leader); R.ax.auth = clamp(0.5 * R.ax.auth + 0.5 * st.auth + 0.05, 0, 1); R.ax.cohes = Math.max(0, R.ax.cohes - 0.04); R.lastCoup = w.day; R.coups++; R.noManage = 0; experience(leader, 'power', 3); leader.story('Won the fight for the village.');
    for (const o of old) if (!w.gov.council.some(x => x.id === o.id)) o.mood = Math.max(0, o.mood - 10); if (chief) { chief.stocksUntil = w.tick + CFG.TPD * 2; chief.story('Lost the fight and was locked in the stocks.') }
    endShadow(w, 'won'); w.emit('regime', `The fighting ends in victory for ${g.name}.${fallen} ${leader.name} takes the leadership and the old council is dismissed.`, { civilEnd: 'overthrown', coup: leader });
  } else {
    w.emit('regime', `The fighting dies down with neither side the winner.${fallen} Everyone is tired of it, and a hard question remains: can these two halves live together?`, { civilEnd: 'stalemate' });
    if (leader && rebels.length >= 5 && canSail(w)) return secessionTalks(w, g, leader, rebels, 'stalemate');
    R.ax.cohes = Math.min(1, R.ax.cohes + 0.06); endShadow(w, 'truce', `A truce is made and ${g ? g.name : 'the rebels'} lay down their arms; the rival council is dissolved.`);
  }
}

/* ===== secession: a circle sails away ===== */
function secessionTalks(w, g, leader, ms, why) {
  const R = w.regime, hard = R.ax.auth > 0.6, folk = ms.filter(v => !v.isChild()).length;
  const options = [{ id: 'let', text: `Let them go in peace: give ${g.name} a boat's stores of food and firewood for the crossing` }, { id: 'forbid', text: `Forbid the departure and keep the village whole by force` }];
  ask(w, { kind: 'faction', topic: `${g.name} (${folk} adults) can no longer live under the same council. ${why === 'stalemate' ? 'The fighting has ended in stalemate.' : why === 'weary' ? 'They see no future in arguing.' : 'The standoff has lasted for days.'} ${leader.name} says they will take boats and found a settlement of their own across the water. Do we let them go?`, options, default: hard && R.ax.auth > 0.7 && chiefOf(w) && chiefOf(w).char.ruth > 0.6 ? 'forbid' : 'let',
    apply: (id, sp, reason, src) => {
      if (id === 'let') { recordDecision(w, `to let ${g.name} depart in peace and found their own settlement.`, sp, src); secede(w, g, leader, 'peace') }
      else { recordDecision(w, `to forbid ${g.name} from leaving.`, sp, src); R.unrest += 8; const S = w.strife; if (S.shadow) S.shadow.sailAsked = false; if (!S.civil && w.settings.crime) startCivil(w, adultsOf(w), g, leader, ms); else secede(w, g, leader, 'flight') }
      w.gov.nextMeeting = w.day + 4;
    } });
}
function departVillager(w, v) {
  v.endJob(); v.alive = false; const i = w.vills.indexOf(v); if (i >= 0) w.vills.splice(i, 1); noteFlow(w, 'left');
  for (const h of w.houses()) { const k = h.occ.indexOf(v.id); if (k >= 0) h.occ.splice(k, 1) }
  for (const o of w.vills) { if (o.partner === v.id) o.partner = null }
  w.gov.council = w.gov.council.filter(c => c.id !== v.id);
}
function findColonySite(w, host) {
  const { W, H } = CFG, OX = w.ox, OY = w.oy, out = [], taken = w.neigh.map(n => ({ x: n.x, y: n.y }));
  const inWin = (x, y) => x >= OX && x < OX + 160 && y >= OY && y < OY + 112;
  for (let y = Math.round(host.y) - 12; y <= Math.round(host.y) + 12; y++) for (let x = Math.round(host.x) - 12; x <= Math.round(host.x) + 12; x++) {
    if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4 || inWin(x, y)) continue;
    const d = Math.hypot(x - host.x, y - host.y); if (d < 7 || d > 12 || w.terr[y * W + x] !== TERR.GRASS) continue; if (taken.some(t => Math.hypot(t.x - x, t.y - y) < 7)) continue;
    let land = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (w.terr[(y + dy) * W + x + dx] >= TERR.SAND) land++; if (land >= 21) out.push({ x, y });
  }
  return out.length ? out[(w.r() * out.length) | 0] : null;
}
function secede(w, g, leader, mode) {
  const S = w.strife, council = new Set(w.gov.council.filter(c => c.title === 'Chief').map(c => c.id));
  const away = v => v.jobKind === 'voyage' || v.boat;
  let core = vOf(w, g.members).filter(v => !v.isChild() && !council.has(v.id) && !away(v) && v.age < 80);
  const maxCore = Math.max(3, Math.floor(SECEDE_SHARE * adultsOf(w).length)); if (core.length > maxCore) core = core.sort((a, b) => personalGrievance(w, b) - personalGrievance(w, a)).slice(0, maxCore);      // only the most aggrieved go; the rest stay
  if (core.length < 3) return endShadow(w, 'faded', `${g.name} decide to stay after all.`);
  const set = new Set(core.map(v => v.id)); for (const v of w.vills) if (!set.has(v.id) && !council.has(v.id) && !away(v) && v.isChild() && v.parentIds.some(p => set.has(p))) set.add(v.id);
  for (const v of core) if (v.partner != null && !set.has(v.partner)) { const p = memberOf(w, v.partner); if (p && !council.has(p.id) && !away(p) && w.r() < 0.5) set.add(p.id) }
  const folk = vOf(w, [...set]), adults = folk.filter(v => !v.isChild()), n = folk.length;
  const avg = f => adults.reduce((s, v) => s + f(v), 0) / adults.length;
  const kind = avg(v => v.char.ruth) > 0.58 && avg(v => v.trait.brave) > 0.5 ? 'raiders' : avg(v => v.trait.cur) > 0.55 ? 'scholars' : avg(v => v.trait.ind) > 0.55 ? 'traders' : 'farmers';
  const hosts = w.neigh.slice().sort((a, b) => a.dist - b.dist), host = hosts[(w.r() * Math.min(2, hosts.length)) | 0], site = host ? findColonySite(w, host) : null;
  const gifts = mode === 'peace' ? { food: Math.min(w.stock.food, 12 + 2 * n), wood: Math.min(w.stock.wood, 8 + n) } : { food: 0, wood: 0 };
  w.stock.food -= gifts.food; w.stock.wood -= gifts.wood;
  const story = `left ${mode === 'peace' ? 'in peace' : 'in bitterness'} after a split with the council`;
  for (const v of folk) { v.story(`${firstName(v.name)} ${story} and sailed away.`); departVillager(w, v) }
  S.secessions++; S.lastSecede = w.day; S.shadow = null; S.lastShadow = w.day; S.truceUntil = w.day + 40; S.reliefUntil = w.day + SECEDE_RELIEF;
  const R = w.regime; R.ax.cohes = Math.min(1, R.ax.cohes + 0.12); R.ax.auth = clamp(R.ax.auth + (mode === 'peace' ? 0 : 0.05), 0, 1);
  for (const v of w.vills) if (!v.isChild()) { v.mood = Math.max(0, v.mood - (mode === 'peace' ? 2 : 5)); }
  if (!site) { w.emit('regime', `${g.name} (${n} souls) board boats and sail over the horizon in search of new shores. They are not heard from again.`, { secession: true }); slog(w, `${g.name} sailed away beyond the horizon.`); return }
  const base = leader ? firstName(leader.name) : 'Free', name = base + COLONY_STEADS[(w.r() * COLONY_STEADS.length) | 0];
  const nb = { id: Math.max(0, ...w.neigh.map(x => x.id)) + 1, name, kind, x: site.x, y: site.y, cx: host.cx, cy: host.cy, r: host.r, pop: n, found: true, foundDay: w.day, dist: Math.round(Math.hypot(site.x - w.cx, site.y - w.cy)), reach: 'boats' };
  initNeighbour(w, nb); nb.pop = n; nb.met = true; nb.knows = Object.keys(w.tech.known); nb.rel = mode === 'peace' ? 28 : -35; nb.temper = clamp(0.2 + 0.5 * avg(v => v.char.ruth) + (mode === 'peace' ? 0 : 0.15), 0.05, 0.95); nb.strength = Math.round(nb.pop * (0.4 + nb.temper));
  nb.nextVisit = w.day + 8; nb.nextAid = w.day + 30; nb.nextTreaty = w.day + 15 + (mode === 'peace' ? 0 : 40); nb.grudge = mode === 'peace' ? 0 : 40;
  nb.colony = { day: w.day, year: w.year, leader: leader ? leader.name : '', circle: g.name, mode, founders: n };
  w.neigh.push(nb); revealCircle(w, site.x, site.y, 12); if (w.seenVer !== undefined) w.seenVer++;
  w.emit('diplomacy', mode === 'peace'
    ? `${g.name} sail away with the council's blessing, ${n} souls in all, and found ${name} on the shore of ${host.name}'s island. ${leader ? leader.name : 'Their leader'} promises friendship.`
    : `${g.name} slip away by boat, ${n} souls in all, and found ${name} on the shore of ${host.name}'s island. They leave angry, and they will remember how.`, { n: nb, kind: 'contact' });
  slog(w, `${g.name} founded ${name}.`);
}

/* ===== sects ===== */
function sectDay(w, ad) {
  const S = w.strife, R = w.regime, sc = S.sect;
  if (sc) {
    const ms = vOf(w, sc.members).filter(v => !v.isChild()); sc.members = ms.map(v => v.id); const founder = memberOf(w, sc.founder);
    if (ms.length < 3) { S.sect = null; S.lastSchism = w.day; return w.emit('regime', `${cap(sc.name)} dwindle until there is no one left to gather. Their way is forgotten.`, { sect: 'gone' }) }
    const st = sc.stance, k = st === 'embraced' ? 1.5 : st === 'tolerated' ? 0.7 : 0, d = sc.doctrine;
    for (const v of ms) v.mood = Math.min(100, v.mood + (st === 'suppressed' ? -0.4 : 0.6));
    if (d === 'zealots') { R.ax.pious = Math.min(1, R.ax.pious + 0.0006 * k); R.ax.open = Math.max(0, R.ax.open - 0.0006 * k); R.ax.auth = Math.min(1, R.ax.auth + 0.0003 * k); if (st !== 'embraced') for (const v of ad) if (!ms.includes(v) && v.char.piety < 0.45) v.mood = Math.max(0, v.mood - 0.25) }
    else if (d === 'ascetics') { R.ax.indus = Math.max(0, R.ax.indus - 0.0004 * k); R.ax.comm = Math.min(1, R.ax.comm + 0.0004 * k) }
    else { R.ax.open = Math.min(1, R.ax.open + 0.0006 * k); R.ax.auth = Math.max(0, R.ax.auth - 0.0003 * k) }
    if (st === 'suppressed') { R.unrest += 0.5; if (w.r() < 0.05) { const m = ms[(w.r() * ms.length) | 0]; if (m) { sc.members = sc.members.filter(i => i !== m.id); m.story(`Gave up ${sc.name} under pressure.`) } } }
    else if (w.r() < 0.12) { const pool = ad.filter(v => !sc.members.includes(v.id) && v.char.piety > 0.45 && v.age < 75 && (v.group && founder && v.group === founder.group || relOf(w, founder || ms[0], v) > 5)); const o = pool[(w.r() * pool.length) | 0]; if (o) { sc.members.push(o.id); experience(o, 'prophecy', 0.6); o.story(`Joined ${sc.name}.`) } }
    if (d === 'zealots' && st === 'tolerated' && w.settings.crime && w.r() < 0.03) { const a = ms[(w.r() * ms.length) | 0], b = ad.filter(v => !ms.includes(v) && v.char.piety < 0.45)[0]; if (a && b && !a.isChild() && !b.isChild()) { w.say(`A zealot of ${sc.name} denounces ${b.name} in the street, and ${a.name} and ${b.name} come to blows.`); assault(w, a, b, a, b) } }
    if (projBuilt(w, 'temple') && st !== 'suppressed' && !sc.reconciled && w.r() < 0.04) { sc.reconciled = true; R.ax.cohes = Math.min(1, R.ax.cohes + 0.05); w.emit('regime', `In the new temple, the faithful of ${sc.name} and the old ways pray under one roof. The rift between them narrows.`, { sect: 'reconciled' }) }
    return;
  }
  if (w.day < 90 || ad.length < 18 || w.day - S.lastSchism < 120) return;
  const devout = ad.filter(v => v.char.piety > 0.65 && v.charisma() > 0.45 && v.age < 75); if (!devout.length) return;
  const psplit = R.psplit || 0, p = 0.0008 + 0.012 * psplit + (R.prophet && w.day - R.prophet.since > 20 ? 0.004 : 0); if (w.r() >= p) return;
  const f = (R.prophet && memberOf(w, R.prophet.id)) || bestOf(devout, v => v.char.piety * v.charisma()); if (!f || f.char.piety < 0.6) return;
  const dw = { zealots: 0.6 * f.char.ruth + 0.4 * (1 - f.trait.cur), ascetics: 0.5 * (1 - f.char.amb) + 0.5 * f.trait.kind, reformers: 0.6 * f.trait.cur + 0.4 * (1 - f.char.ruth) }, d = Object.keys(dw).sort((a, b) => (dw[b] + 0.12 * w.r()) - (dw[a] + 0.12 * w.r()))[0], nm = DOCTRINES[d].names[(w.r() * DOCTRINES[d].names.length) | 0];
  const ms = ad.filter(v => v.char.piety > 0.5 && (v === f || (v.group && v.group === f.group) || relOf(w, f, v) > 12 || w.r() < 0.2)); if (ms.length < 4) return;
  S.sect = { name: nm, doctrine: d, founder: f.id, founderName: f.name, members: ms.map(v => v.id), since: w.day, stance: 'tolerated' }; S.schisms++; S.lastSchism = w.day;
  for (const v of ms) experience(v, 'prophecy', 0.4); experience(f, 'power', 1); f.story(`Founded ${nm}.`);
  w.emit('regime', `${f.name} founds a movement, ${nm}. They ${DOCTRINES[d].blurb}. ${ms.length} follow, and the older faith of the village is uneasy.`, { sect: true });
  const hard = R.ax.auth > 0.6, aligned = (d === 'zealots' && R.ax.pious > 0.68) || (d === 'reformers' && R.ax.open > 0.62) || (d === 'ascetics' && R.ax.comm > 0.62);
  ask(w, { kind: 'faction', topic: `${f.name} has founded ${nm}, a movement of ${ms.length} who ${DOCTRINES[d].blurb}. Other villagers are uneasy. How should the council treat them?`,
    options: [{ id: 'tolerate', text: `Tolerate them: let them gather, but give them no standing` }, { id: 'embrace', text: `Embrace them: honour ${nm} and let their teaching shape the village` }, { id: 'suppress', text: `Suppress them: forbid their gatherings and silence ${f.name}` }],
    default: hard && !aligned ? 'suppress' : aligned ? 'embrace' : 'tolerate',
    apply: (id, sp, reason, src) => {
      const sc2 = w.strife.sect; if (!sc2) return; sc2.stance = id === 'embrace' ? 'embraced' : id === 'suppress' ? 'suppressed' : 'tolerated';
      if (id === 'suppress') { f.stocksUntil = w.tick + CFG.TPD * 2; for (const v of vOf(w, sc2.members)) v.mood = Math.max(0, v.mood - 6); R.unrest += 5; R.ax.auth = Math.min(1, R.ax.auth + 0.02) }
      if (id === 'embrace') { for (const v of vOf(w, sc2.members)) v.mood = Math.min(100, v.mood + 6); w.gov.approval = Math.max(0, w.gov.approval - (aligned ? 0 : 3)) }
      recordDecision(w, `to ${id === 'embrace' ? 'embrace' : id === 'suppress' ? 'suppress' : 'tolerate'} ${nm}, the movement of ${f.name}.`, sp, src); w.gov.nextMeeting = w.day + 4;
    } });
}
