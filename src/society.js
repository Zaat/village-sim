'use strict';
/* ==========================================================================
   society.js — opinions, relationships, groups, council & policy, crime &
   justice, holidays. Rules decide by default. When w.mind is set (the optional
   Claude counsel), it is handed a request with concrete options and picks one;
   its answer is validated and applied, and rules decide if it fails.
   ========================================================================== */
const ISSUES = ['growth', 'labor', 'law', 'defense', 'tax'];
const ISSUE_TXT = {
  growth: { name: 'Growth', hi: 'welcome newcomers and let the village grow', lo: 'keep the village small and close-knit', q: 'whether the village should keep growing' },
  labor: { name: 'Work & leisure', hi: 'make more time for rest, games and festivals', lo: 'put work and industry first', q: 'how much of life belongs to work and how much to rest' },
  law: { name: 'Justice', hi: 'enforce stricter justice', lo: 'favor mercy and leniency', q: 'how harshly wrongdoers should be punished' },
  defense: { name: 'Defense', hi: 'organize a village watch', lo: 'rely on trust and open doors', q: 'whether to keep a watch against danger' },
  tax: { name: 'Taxes', hi: 'raise taxes so the village can afford more', lo: 'keep taxes light and let people keep their earnings', q: 'how much of everyone\'s earnings the village should take' },
};
const REMEDIES = {
  watch: { text: 'set a night watch', apply: g => { g.policy.defense = Math.min(1, g.policy.defense + 0.5) } },
  strict: { text: 'enforce harsher penalties', apply: g => { g.policy.law = Math.min(1, g.policy.law + 0.5) } },
  lenient: { text: 'favor mercy and rehabilitation', apply: g => { g.policy.law = Math.max(-1, g.policy.law - 0.5) } },
  mediation: { text: 'have elders mediate feuds', apply: g => { g.mediation = true } },
  welfare: { text: 'share food with the hungry', apply: g => { g.welfare = true } },
  festival: { text: 'hold a community feast to lift spirits', apply: (g, w) => { g.policy.labor = Math.min(1, g.policy.labor + 0.5); w.forceFeast = true } },
};
const HOLIDAYS = [{ day: 4, name: 'Seedtime Festival' }, { day: 4, name: 'Midsummer Games' }, { day: 8, name: 'Harvest Festival', food: 3 }, { day: 4, name: 'Midwinter Feast' }];
const GROUP_COLORS = ['#e06c75', '#61afef', '#e5c07b', '#98c379', '#c678dd', '#56b6c2', '#d19a66', '#be5046'];
const GROUP_NAMES = {
  role: { farmer: 'The Fieldwrights', woodcutter: 'The Hewers', miner: 'The Stonebreakers', hunter: "The Hunters' Lodge", fisher: 'The Netters', builder: "The Builders' Guild" },
  trait: { cur: 'The Starwatchers', kind: 'The Hearthkeepers', brave: 'The Stalwarts', soc: 'The Fireside Circle', ind: 'The Early Risers' },
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SURNAMES = ['Marsh', 'Ashby', 'Thorne', 'Wren', 'Holloway', 'Fenn', 'Rowe', 'Calder', 'Brook', 'Harrow', 'Vale', 'Stroud', 'Linden', 'Pike'];

const adultsOf = w => w.vills.filter(v => v.isAdult());
const memberOf = (w, id) => w.vills.find(v => v.id === id);
const councilMembers = w => w.gov.council.map(c => ({ v: memberOf(w, c.id), title: c.title })).filter(c => c.v);
const titleOf = (w, v) => { const c = w.gov.council.find(c => c.id === v.id); return c ? c.title : null };
const wardenOf = w => { const c = w.gov.council.find(c => c.title === 'Warden'); return c ? memberOf(w, c.id) : null };
const crimeRate = (w, days) => w.crimeLog.filter(d => d > w.day - days).length;
const motionText = (k, dir) => dir > 0 ? ISSUE_TXT[k].hi : ISSUE_TXT[k].lo;

function initSociety(w) {
  w.gov = { council: [], termEnd: 0, policy: { growth: 0, labor: 0, law: 0, defense: 0, tax: 0 }, approval: 70, welfare: false, mediation: false, nextMeeting: 6, trial: null, decisions: [], elections: 0,
    efficacy: { watch: 0.5, strict: 0.5, lenient: 0.5, mediation: 0.5, welfare: 0.5, festival: 0.5 } };
  w.groups = []; w.groupNext = 1; w.crimes = []; w.crimeLog = []; w.banished = []; w.scars = [];
  w.holiday = null; w.holidayDone = true; w.meetingDay = 0; w.meetingDone = true; w.forceFeast = false; w.mind = null; w.pendingMind = 0;
}
function nudge(w, k, d) { for (const v of w.vills) if (v.isAdult()) v.op[k] = clamp(v.op[k] + d * (0.4 + w.r() * 0.8), -1, 1) }

/* ---------------------------------------------------------------- interactions */
function relOf(w, a, b) { return w.rel.get(w.relKey(a, b)) || 0 }
function groupRivals(w, a, b) {
  if (!a.group || !b.group || a.group === b.group) return false;
  const g = w.groups.find(g => g.id === a.group); return !!(g && (g.stance[b.group] || 0) < -0.3);
}
function socialInteract(w, a, b) {
  const key = w.relKey(a, b), prev = w.rel.get(key) || 0;
  let sim = 0; for (const t of TRAITS) sim += 1 - Math.abs(a.trait[t] - b.trait[t]); sim /= TRAITS.length;
  const kind = (a.trait.kind + b.trait.kind) / 2; let topic = ISSUES[0], diff = 0;
  for (const k of ISSUES) { const d = Math.abs(a.op[k] - b.op[k]); if (d > diff) { diff = d; topic = k } }
  const rivals = groupRivals(w, a, b), grown = !a.isChild() && !b.isChild();
  let mode = 'chat', r = prev;
  if (grown && diff > 0.7 && w.r() < 0.22 + 0.3 * (a.trait.cur + b.trait.cur) / 2 + (rivals ? 0.2 : 0)) mode = 'debate';
  if (mode === 'debate') {
    const ia = a.charisma(), ib = b.charisma(), oa = 0.25 + 0.5 * a.trait.cur, ob = 0.25 + 0.5 * b.trait.cur, f = 1 + prev / 200;
    const oa0 = a.op[topic], ob0 = b.op[topic];
    a.op[topic] = clamp(oa0 + (ob0 - oa0) * ib * ob * 0.35 * f, -1, 1); b.op[topic] = clamp(ob0 + (oa0 - ob0) * ia * oa * 0.35 * f, -1, 1);
    a.debates++; b.debates++; addKnowledge(w, 1 + 1.5 * a.trait.cur, a); addKnowledge(w, 1 + 1.5 * b.trait.cur, b);
    const heated = diff > 1.1 && kind < 0.5 && w.r() < 0.5 + (prev < 0 ? 0.2 : 0);
    r += heated ? -(6 + w.r() * 8) : (2 + w.r() * 3) * (0.5 + sim);
    if (w.r() < 0.07) w.say(`${a.name} and ${b.name} debated ${ISSUE_TXT[topic].q}${heated ? ' and parted angrily' : ' and each gave ground'}.`);
    if (heated && r < -50 && w.settings.crime && w.r() < 0.12) assault(w, w.r() < 0.5 ? a : b, null, a, b);
  } else {
    r += (4 + w.r() * 6 + kind * 3) * Math.max(-0.4, (sim - 0.4) * 2.2) * (prev < -30 ? 0.3 : 1);
    if (r > 30) for (const k of ISSUES) { a.op[k] += (b.op[k] - a.op[k]) * 0.02 * b.charisma(); b.op[k] += (a.op[k] - b.op[k]) * 0.02 * a.charisma() }
    if (w.r() < 0.05) w.say(chatTopic(w, a, b));
  }
  r = clamp(r, -100, 100); w.rel.set(key, r);
  a.social = Math.min(100, a.social + 45); b.social = Math.min(100, b.social + 30);
  if (prev < 50 && r >= 50) { w.say(`${a.name} and ${b.name} became friends.`); a.story(`Became friends with ${b.name}.`); b.story(`Became friends with ${a.name}.`) }
  if (prev > -40 && r <= -40) { w.say(`${a.name} and ${b.name} have fallen out.`); a.story(`Fell out with ${b.name}.`); b.story(`Fell out with ${a.name}.`) }
  if (a.sex !== b.sex && a.isAdult() && b.isAdult() && r >= 50 && a.partner == null && b.partner == null && w.r() < 0.5) pairUp(w, a, b);
  if (a.partner === b.id && a.sex !== b.sex) w.tryConceive(a.sex === 'f' ? a : b, a.sex === 'f' ? b : a);
}
function pairUp(w, a, b) {
  a.partner = b.id; b.partner = a.id; const f = a.sex === 'f' ? a : b, m = a.sex === 'f' ? b : a;
  if (f.home == null && m.home != null) { const h = w.buildings.get(m.home); if (h && h.occ.length < bedsOf(h)) { h.occ.push(f.id); f.home = m.home } }
  else if (m.home == null && f.home != null) { const h = w.buildings.get(f.home); if (h && h.occ.length < bedsOf(h)) { h.occ.push(m.id); m.home = f.home } }
  a.mood = Math.min(100, a.mood + 15); b.mood = Math.min(100, b.mood + 15);
  a.story(`Fell in love with ${b.name}.`); b.story(`Fell in love with ${a.name}.`);
  w.say(`${a.name} and ${b.name} have become a couple.`);
}

/* ---------------------------------------------------------------- groups */
function clustersAt(w, nodes, idx, thr) {
  const n = nodes.length, adj = nodes.map(() => []);
  for (const [k, r] of w.rel) {
    if (r < thr) continue; const [a, b] = k.split('_').map(Number), i = idx.get(a), j = idx.get(b); if (i === undefined || j === undefined) continue;
    adj[i].push([j, r]); adj[j].push([i, r]);
  }
  const lab = nodes.map((v, i) => i), order = nodes.map((v, i) => i);
  for (let it = 0; it < 6; it++) {
    for (let i = n - 1; i > 0; i--) { const j = (w.r() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]] }
    for (const i of order) { const t = new Map(); for (const [j, r] of adj[i]) t.set(lab[j], (t.get(lab[j]) || 0) + r); let best = lab[i], bw = t.get(lab[i]) || 0; for (const [l, x] of t) if (x > bw) { bw = x; best = l } lab[i] = best }
  }
  const clusters = new Map(); lab.forEach((l, i) => { if (!clusters.has(l)) clusters.set(l, []); clusters.get(l).push(nodes[i]) });
  return [...clusters.values()].filter(c => c.length >= 3);
}
function updateGroups(w) {
  const nodes = w.vills.filter(v => !v.isChild()), n = nodes.length, idx = new Map(nodes.map((v, i) => [v.id, i]));
  let clusters = [];
  for (const thr of [55, 65, 75, 85]) {                    // tighten the bond threshold if one circle swallows the village
    clusters = clustersAt(w, nodes, idx, thr); const big = Math.max(0, ...clusters.map(c => c.length));
    if (n < 16 || big <= Math.max(10, 0.4 * n)) break;
  }
  const used = new Set(), fresh = [], unmatched = [];
  for (const members of clusters) {
    const ids = new Set(members.map(v => v.id)); let best = null, bo = 0;
    for (const g of w.groups) { if (used.has(g.id)) continue; let o = 0; for (const id of g.members) if (ids.has(id)) o++; const sc = o / Math.max(g.members.length, members.length); if (sc > bo) { bo = sc; best = g } }
    if (best && bo >= 0.4) { used.add(best.id); best.members = [...ids]; fresh.push(best) } else unmatched.push(members);
  }
  for (const members of unmatched) {
    const g = { id: w.groupNext++, members: members.map(v => v.id), founded: w.day, stance: {}, color: GROUP_COLORS[(w.groupNext - 2) % GROUP_COLORS.length], name: '' };
    g.name = groupName(w, g, members, new Set(fresh.map(x => x.name))); fresh.push(g);
    w.say(`A new circle forms: ${g.name} (${members.slice(0, 4).map(v => v.name).join(', ')}${members.length > 4 ? '…' : ''}).`); for (const v of members) v.story(`Joined ${g.name}.`);
  }
  for (const g of w.groups) if (!used.has(g.id)) w.say(`${g.name} has drifted apart.`);
  w.groups = fresh; for (const v of w.vills) v.group = null;
  const adv = adultsOf(w), avg = f => adv.length ? adv.reduce((s, v) => s + f(v), 0) / adv.length : 0, VM = { trait: {}, op: {} };
  for (const t of TRAITS) VM.trait[t] = avg(v => v.trait[t]); for (const k of ISSUES) VM.op[k] = avg(v => v.op[k]);
  for (const g of fresh) {
    const ms = g.members.map(id => memberOf(w, id)).filter(Boolean); for (const v of ms) v.group = g.id;
    g.leader = ms.reduce((a, b) => (a.charisma() > b.charisma() ? a : b)).id;
    g.op = {}; for (const k of ISSUES) g.op[k] = ms.reduce((s, v) => s + v.op[k], 0) / ms.length;
    g.platform = groupPlatform(w, g, ms, VM);
  }
  for (const g of fresh) for (const h of fresh) {
    if (g === h || g.id > h.id) continue; let s = 0, c = 0;
    for (const a of g.members) for (const b of h.members) { s += w.rel.get(a < b ? a + '_' + b : b + '_' + a) || 0; c++ }
    let od = 0; for (const k of ISSUES) od += Math.abs(g.op[k] - h.op[k]); od /= ISSUES.length;
    const st = clamp((s / Math.max(1, c)) / 40 - od * 0.6, -1, 1), old = g.stance[h.id] || 0; g.stance[h.id] = st; h.stance[g.id] = st;
    if (old > -0.3 && st <= -0.3) w.emit('group', `${g.name} and ${h.name} have fallen into rivalry.`, { g, h });
    else if (old < 0.3 && st >= 0.3) w.emit('group', `${g.name} and ${h.name} have grown close.`, { g, h });
  }
}
function groupName(w, g, members, taken) {
  const fam = {}; for (const v of members) fam[v.family] = (fam[v.family] || 0) + 1;
  const topFam = Object.entries(fam).sort((a, b) => b[1] - a[1])[0];
  let name = null;
  if (topFam[1] / members.length >= 0.6) name = `House ${topFam[0]}`;
  if (!name) { const rl = {}; for (const v of members) if (v.role) rl[v.role] = (rl[v.role] || 0) + 1; const tr = Object.entries(rl).sort((a, b) => b[1] - a[1])[0]; if (tr && tr[1] / members.length >= 0.5) name = GROUP_NAMES.role[tr[0]] }
  if (!name) { let bt = 'soc', bv = 0; for (const t of TRAITS) { const m = members.reduce((s, v) => s + v.trait[t], 0) / members.length; if (m > bv) { bv = m; bt = t } } name = GROUP_NAMES.trait[bt] }
  let out = name, k = 1; while (taken.has(out) && k < 500) { k++; out = name + ' ' + (ROMAN[k] || k) }      // always terminates: every pass tries a new suffix
  return out;
}

/* ---------------------------------------------------------------- council */
const councilSize = n => n < 22 ? 3 : n < 50 ? 5 : 7;
function candidates(w) {
  const sc = v => ({ v, score: v.charisma() + (v.desire && v.desire.kind === 'lead' ? 0.25 : 0) + (v.reputation - 50) / 200 });
  const all = adultsOf(w).filter(v => v.age < 80).map(sc).sort((a, b) => b.score - a.score), out = all.slice(0, 9), have = new Set(out.map(x => x.v.id));
  for (const g of w.groups) { if (g.members.length < 4) continue; const ld = all.find(x => x.v.id === g.leader); if (ld && !have.has(ld.v.id) && out.length < 13) { out.push(ld); have.add(ld.v.id) } }   // each sizeable circle fields its leader
  return out;
}
/* ----- factions: a circle's platform is what its members care about most; voters weigh it at elections ----- */
const FOCUS_TXT = { knowledge: 'learning and discovery', safety: 'safety and a strong defence', community: 'fellowship and good feasts', enterprise: 'honest work and prosperity' };
function groupPlatform(w, g, ms, vm) {            // vm: the village-wide averages, so a platform is what sets the circle apart
  const mean = t => ms.reduce((s, v) => s + v.trait[t], 0) / ms.length - vm.trait[t];
  const issues = ISSUES.map(k => ({ k, dir: Math.sign(g.op[k]), a: Math.abs(g.op[k]), s: 0.25 * Math.abs(g.op[k]) + 0.75 * Math.abs(g.op[k] - vm.op[k]) })).filter(x => x.a > 0.15).sort((a, b) => b.s - a.s).slice(0, 2).map(x => ({ k: x.k, dir: x.dir }));
  const sc = { knowledge: mean('cur'), safety: 0.6 * mean('brave') + 0.4 * (g.op.defense - vm.op.defense), community: 0.6 * mean('soc') + 0.4 * mean('kind'), enterprise: 0.6 * mean('ind') + 0.4 * (vm.op.tax - g.op.tax) };
  return { issues, focus: Object.keys(sc).sort((a, b) => sc[b] - sc[a])[0] };
}
const platformText = g => g.platform ? (g.platform.issues.length ? g.platform.issues.map(i => motionText(i.k, i.dir)).join(' and ') : FOCUS_TXT[g.platform.focus]) : 'no particular cause';
function platformAlign(voter, G) {
  const is = G && G.platform && G.platform.issues; if (!is || !is.length) return 0;
  return is.reduce((s, i) => s + clamp(voter.op[i.k] * i.dir, -1, 1), 0) / is.length;
}
const rulingGroup = w => w.gov.ruling ? w.groups.find(x => x.id === w.gov.ruling.gid) || null : null;
const rulingFocus = w => { const R = rulingGroup(w); return R && R.platform ? R.platform.focus : null };
const TECH_FOCUS = { tools: 'enterprise', mining: 'enterprise', forestry: 'enterprise', trade: 'enterprise', coinage: 'enterprise', seatrade: 'enterprise', ironwork: 'enterprise', watchtowers: 'safety', medicine: 'safety', granary: 'community', carpentry: 'community', boats: 'community', rotation: 'knowledge', plow: 'knowledge', navigation: 'knowledge', masonry: 'knowledge', nets: 'community', lodges: 'safety' };
/* the circle that holds the most council seats (at least two) leads; others are in opposition */
function updateRuling(w, election) {
  const g = w.gov, seats = new Map();
  for (const c of g.council) { const v = memberOf(w, c.id); if (v && v.group) seats.set(v.group, (seats.get(v.group) || 0) + 1) }
  let best = null, n = 0; for (const [gid, k] of seats) if (k > n) { n = k; best = gid }
  const chief = g.council.find(c => c.title === 'Chief'), cv = chief ? memberOf(w, chief.id) : null, cg = cv && cv.group ? w.groups.find(x => x.id === cv.group) : null;
  if (cg && !seats.get(cg.id)) seats.set(cg.id, 1);
  const grp = cg || (best && n >= 2 ? w.groups.find(x => x.id === best) : null), old = g.ruling; if (grp) n = seats.get(grp.id) || 1;      // the Chief's circle leads; else the circle with the most seats (two or more)
  if (!grp) { if (old) { g.ruling = null; w.emit('faction', 'No single circle holds the council now. It governs as a coalition of independents.') } return }
  if (old && old.gid === grp.id) { old.seats = n; old.name = grp.name; if (election) old.terms = (old.terms || 1) + 1; return }
  g.ruling = { gid: grp.id, name: grp.name, seats: n, since: w.day, terms: 1 };
  w.emit('faction', `${grp.name} now leads the council with ${n} of ${g.council.length} seats, pledging ${platformText(grp)}.`, {});
}
/* a circle is content when policy moves its way, bitter when it moves against it */
function factionDay(w) {
  const g = w.gov; updateRuling(w, false);
  for (const G of w.groups) {
    if (!G.platform || !G.platform.issues.length) { G.satisfied = 0; continue }
    const hap = G.platform.issues.reduce((s, i) => s + g.policy[i.k] * i.dir, 0) / G.platform.issues.length; G.satisfied = hap;
    const dm = hap < -0.4 ? -0.35 : hap > 0.4 ? 0.2 : 0; if (dm) for (const id of G.members) { const v = memberOf(w, id); if (v) v.mood = clamp(v.mood + dm, 0, 100) }
  }
}
function voteScore(w, voter, c) {
  let od = 0; for (const k of ISSUES) od += Math.abs(voter.op[k] - c.v.op[k]); od /= ISSUES.length;
  const G = c.v.group ? w.groups.find(x => x.id === c.v.group) : null, R = w.gov.ruling, fatigue = R && c.v.group === R.gid ? Math.min(0.12, 0.04 * (R.terms || 1)) : 0;
  return 0.5 * relOf(w, voter, c.v) / 100 + 0.3 * (1 - od) + (voter.group && voter.group === c.v.group ? 0.25 : 0) + 0.25 * c.score + (voter === c.v ? 0.15 : 0) + 0.3 * platformAlign(voter, G) - fatigue + w.r() * 0.16;
}
function holdElection(w, why) {
  const g = w.gov, ad = adultsOf(w), cands = candidates(w); if (cands.length < 3) return;
  const votes = new Map(cands.map(c => [c.v.id, 0]));
  for (const voter of ad) { let best = null, bs = -9; for (const c of cands) { const s = voteScore(w, voter, c); if (s > bs) { bs = s; best = c } } votes.set(best.v.id, votes.get(best.v.id) + 1) }
  const ranked = cands.map(c => ({ c, n: votes.get(c.v.id) })).sort((a, b) => b.n - a.n).slice(0, councilSize(ad.length));
  const mem = ranked.map(r => r.c.v), chief = mem[0], rest = mem.slice(1), titles = new Map([[chief.id, 'Chief']]);
  const pick = (title, score) => { const p = rest.filter(v => !titles.has(v.id)); if (!p.length) return; p.sort((a, b) => score(b) - score(a)); titles.set(p[0].id, title) };
  pick('Warden', v => v.trait.brave + v.trait.cur * 0.5); pick('Steward', v => v.trait.ind + v.trait.cur * 0.5); pick('Speaker', v => v.trait.soc + v.charisma());
  g.council = mem.map(v => ({ id: v.id, title: titles.get(v.id) || 'Councillor' })); g.termEnd = w.day + CFG.DPS * 4; g.elections++;
  const summary = ranked.map(r => `${r.c.v.name} ${r.n}`).join(', ');
  w.emit('election', `${why === 'first' ? 'The villagers gather to choose their first council.' : 'The council term ends and the villagers vote.'} ${chief.name} is chosen Chief. Votes: ${summary}.`, { chief, members: mem, why });
  for (const v of mem) { v.mood = Math.min(100, v.mood + 10); v.story(`Elected to the village council as ${titles.get(v.id) || 'Councillor'}.`) }
  if (!chief.fulfilledLead) chief.desireBoost = true;
  updateRuling(w, true);
}

function fillCouncil(w) {
  const g = w.gov, ad = adultsOf(w), need = councilSize(ad.length) - g.council.length; if (need <= 0) return;
  const have = new Set(g.council.map(c => c.id)), cands = candidates(w).filter(c => !have.has(c.v.id)); if (!cands.length) return;
  const votes = new Map(cands.map(c => [c.v.id, 0]));
  for (const voter of ad) { let best = null, bs = -9; for (const c of cands) { const s = voteScore(w, voter, c); if (s > bs) { bs = s; best = c } } votes.set(best.v.id, votes.get(best.v.id) + 1) }
  const picked = cands.map(c => ({ c, n: votes.get(c.v.id) })).sort((a, b) => b.n - a.n).slice(0, need);
  for (const { c } of picked) {
    const titles = new Set(g.council.map(x => x.title)), t = !titles.has('Warden') ? 'Warden' : !titles.has('Steward') ? 'Steward' : !titles.has('Speaker') ? 'Speaker' : 'Councillor';
    g.council.push({ id: c.v.id, title: t }); c.v.mood = Math.min(100, c.v.mood + 8); c.v.story(`Chosen for the council as ${t}.`);
    w.emit('election', `${c.v.name} is chosen by the villagers to join the council as ${t}.`, { by: true });
  }
  updateRuling(w, false);
}
/* A deliberation: the rules prepare options and a default; the optional Claude mind may pick one. */
function deliberate(w, req) {
  let done = false;
  req.finish = (id, speeches, reason, source) => {
    if (done) return; done = true; if (!req.options.some(o => o.id === id)) { id = req.default; source = 'rules' }
    w.pendingMind = Math.max(0, w.pendingMind - (req.viaMind ? 1 : 0)); req.apply(id, speeches || [], reason || '', source || 'rules');
  };
  if (w.mind && w.mind.ready(req)) { req.viaMind = true; w.pendingMind++; w.mind.ask(req) } else req.finish(req.default, [], '', 'rules');
}
function recordDecision(w, text, speeches, source) {
  const g = w.gov; g.decisions.unshift({ day: w.day, text, speeches, source }); if (g.decisions.length > 12) g.decisions.pop();
  w.emit('council', `Council: ${text}${source === 'claude' ? ' (deliberated with Claude)' : ''}`, { text, speeches });
  speeches.slice(0, 3).forEach(s => w.say(`   ${s.who}: “${s.line}”`));
}
function councilBase(w) {
  const ms = councilMembers(w);
  return { members: ms.map(m => ({ name: m.v.name, title: m.title, traits: m.v.traitWords().join(', ') || 'even-tempered', op: m.v.op, group: (w.groups.find(x => x.id === m.v.group) || {}).name || null })), history: w.gov.decisions.slice(0, 5).map(d => `Day ${d.day}: ${d.text}`), state: stateBrief(w) };
}
function holdMeeting(w) {
  const g = w.gov, ms = councilMembers(w); if (ms.length < 2) return;
  const pop = w.vills.length, ad = adultsOf(w);
  const rate = crimeRate(w, 8), crisis = w.settings.crime && rate >= Math.max(2, Math.round(pop * 0.05)) && !g.trial;
  const members = ms.map(m => ({ name: m.v.name, title: m.title, traits: m.v.traitWords().join(', ') || 'even-tempered', op: m.v.op, group: (w.groups.find(x => x.id === m.v.group) || {}).name || null }));
  const history = g.decisions.slice(0, 5).map(d => `Day ${d.day}: ${d.text}`);
  const base = { members, history, state: stateBrief(w) };
  if (!crisis && !w.tech.focus && techAvailable(w).length) { researchAgenda(w, base, ms); return }
  if (!crisis && projectAgenda(w, base, ms)) return;
  if (crisis) {
    const options = Object.keys(REMEDIES).map(id => ({ id, text: `${REMEDIES[id].text} (past results score ${g.efficacy[id].toFixed(2)} of 1)` }));
    const score = id => ms.reduce((s, m) => s + remedyPref(m.v, id) + 0.8 * g.efficacy[id] + w.r() * 0.2, 0);
    const def = options.map(o => o.id).sort((a, b) => score(b) - score(a))[0];
    deliberate(w, { ...base, kind: 'crime', topic: `A wave of crime: ${rate} offences in the last 8 days. Which remedy should the council adopt?`, options, default: def,
      apply: (id, sp, reason, src) => {
        REMEDIES[id].apply(g, w); g.trial = { remedy: id, start: w.day, base: rate };
        const champ = ms.slice().sort((a, b) => remedyPref(b.v, id) - remedyPref(a.v, id))[0];
        recordDecision(w, `to curb crime, the council resolved to ${REMEDIES[id].text}. ${champ.v.name} led the argument.`, sp, src);
        nudge(w, 'law', 0.03); learn(w, 'crime', 0.15); g.nextMeeting = w.day + 4;
      } });
    return;
  }
  let issue = null, gap = 0.25, proposer = null;
  for (const k of ISSUES) { const avg = ad.reduce((s, v) => s + v.op[k], 0) / Math.max(1, ad.length), d = avg - g.policy[k]; if (Math.abs(d) > gap) { gap = Math.abs(d); issue = { k, dir: Math.sign(d), avg } } }
  const RG = rulingGroup(w);
  if (!issue && RG && RG.platform && w.r() < 0.7) for (const it of RG.platform.issues) {       // the ruling circle presses its own platform
    if (g.policy[it.k] * it.dir >= 0.5 || Math.abs(g.policy[it.k] + it.dir * 0.5) > 1) continue;
    const who = ms.filter(m => m.v.group === RG.id).sort((a, b) => b.v.op[it.k] * it.dir - a.v.op[it.k] * it.dir)[0];
    if (who) { proposer = who.v; issue = { k: it.k, dir: it.dir, avg: ad.reduce((s, v) => s + v.op[it.k], 0) / Math.max(1, ad.length) }; break }
  }
  if (!issue) {                                           // otherwise a councillor brings a petition of their own
    let bg = 0.5; for (const m of ms) for (const k of ISSUES) { const d = m.v.op[k] - g.policy[k]; if (Math.abs(d) > bg && Math.abs(g.policy[k] + Math.sign(d) * 0.5) <= 1) { bg = Math.abs(d); proposer = m.v; issue = { k, dir: Math.sign(d), avg: ad.reduce((s, v) => s + v.op[k], 0) / Math.max(1, ad.length) } } }
  }
  if (!issue) { g.nextMeeting = w.day + 4; return }
  const { k, dir } = issue, text = motionText(k, dir);
  const votes = ms.map(m => ({ m, yes: m.v.op[k] * dir + (m.title === 'Chief' ? 0.1 : 0) + (w.r() - 0.5) * 0.3 > 0 }));
  const yes = votes.filter(x => x.yes).length, no = votes.length - yes, defId = yes > no || (yes === no && votes[0].yes) ? 'pass' : 'reject';
  deliberate(w, { ...base, kind: 'motion', topic: `Motion on ${ISSUE_TXT[k].name}: the village should ${text}. Public opinion leans ${issue.avg > 0 ? 'toward' : 'against'} it (average ${issue.avg.toFixed(2)}); current policy is ${g.policy[k].toFixed(1)} on a scale from -1 to +1.`,
    options: [{ id: 'pass', text: `Pass: ${text}` }, { id: 'reject', text: 'Reject: leave the policy as it is' }], default: defId,
    apply: (id, sp, reason, src) => {
      const pro = votes.filter(x => x.yes).sort((a, b) => b.m.v.op[k] * dir - a.m.v.op[k] * dir)[0], con = votes.filter(x => !x.yes).sort((a, b) => a.m.v.op[k] * dir - b.m.v.op[k] * dir)[0];
      if (id === 'pass') { g.policy[k] = clamp(g.policy[k] + dir * 0.5, -1, 1); for (const v of ad) v.mood = clamp(v.mood + clamp(v.op[k] * dir * 6, -5, 6), 0, 100) }
      recordDecision(w, `${id === 'pass' ? 'passed' : 'rejected'}: the village should ${text}. ${proposer ? proposer.name + ' brought the petition. ' : ''}${src === 'claude' ? '' : `${yes} for, ${no} against. `}${pro ? pro.m.v.name + ' spoke for it' : ''}${con ? ', ' + con.m.v.name + ' against' : ''}.`, sp, src);
      g.nextMeeting = w.day + 4;
    } });
}
function remedyPref(v, id) {
  const t = v.trait;
  return ({ watch: t.brave * 0.5 + (1 - t.kind) * 0.3 + v.op.defense * 0.4, strict: (1 - t.kind) * 0.5 + v.op.law * 0.5, lenient: t.kind * 0.5 - v.op.law * 0.5, mediation: t.kind * 0.4 + t.cur * 0.3, welfare: t.kind * 0.7, festival: t.soc * 0.6 + v.op.labor * 0.4 })[id];
}
function reviewRemedy(w) {
  const g = w.gov, t = g.trial; if (!t) return; g.trial = null;
  const now = crimeRate(w, 8), delta = (t.base - now) / Math.max(1, t.base), e = g.efficacy[t.remedy];
  g.efficacy[t.remedy] = clamp(0.6 * e + 0.4 * (0.5 + delta * 0.5), 0.05, 0.95);
  const better = now < t.base;
  w.emit('council', `The council reviews its decision to ${REMEDIES[t.remedy].text}: crime ${better ? 'fell' : now === t.base ? 'held steady' : 'rose'} (${t.base} to ${now} offences). ${better ? 'They keep it.' : 'They will try another approach if it continues.'}`, { review: true });
  if (!better && g.efficacy[t.remedy] < 0.3) { if (t.remedy === 'watch') g.policy.defense = Math.max(0, g.policy.defense - 0.5); if (t.remedy === 'strict') g.policy.law = Math.max(0, g.policy.law - 0.5); if (t.remedy === 'welfare') g.welfare = false; if (t.remedy === 'mediation') g.mediation = false }
}
function stateBrief(w) {
  const ad = adultsOf(w), g = w.gov;
  return `Year ${w.year}, ${SEASONS[w.season]}. Population ${w.vills.length}. Food ${w.stock.food}, firewood ${w.stock.wood}. Policies (−1 to +1): growth ${g.policy.growth}, leisure ${g.policy.labor}, strict law ${g.policy.law}, watch ${g.policy.defense}. Crimes in last 8 days: ${crimeRate(w, 8)}. Average mood ${Math.round(ad.reduce((s, v) => s + v.mood, 0) / Math.max(1, ad.length))}/100. Wolves nearby: ${w.animals.some(a => a.kind === 'wolf' && a.alive) ? 'yes' : 'no'}.`;
}

/* ---------------------------------------------------------------- crime & justice */
function crimeDay(w) {
  const g = w.gov, law = g.policy.law, def = g.policy.defense, warden = wardenOf(w);
  for (const v of adultsOf(w)) {
    if (v.stocksUntil > w.tick || v.duty > w.tick) continue;
    const poor = v.hunger < 35 && w.stock.food < w.vills.length * 2.5;
    let p = 0.0025 * (1.4 - v.trait.kind) * (v.mood < 35 ? 3 : v.mood < 50 ? 1.5 : 1) * (poor ? 5 : 1) * (1 - 0.4 * Math.max(0, law)) * (1 + 0.3 * Math.max(0, -law)) * (1 - 0.25 * Math.max(0, def)) * (warden ? 0.8 : 1) * (1 + Math.min(2, v.record * 0.4)) * (w.settings.survival ? 1.4 : 1) * (g.welfare ? 0.6 : 1) * (w.has('coinage') ? ((v.coins || 0) < 4 ? 1.35 : (v.coins || 0) > 60 ? 0.7 : 1) : 1);
    if (v.trait.kind > 0.75) p *= 0.4;
    if (w.r() < p * (projBuilt(w, 'bastion') ? 0.67 : 1)) theft(w, v);
  }
  const wd = wardenOf(w);
  for (const c of w.crimes) {
    if (c.solved || w.day - c.day > 12) continue;
    const p = 0.06 + (c.witnesses.length ? 0.4 : 0) + (wd ? 0.12 + 0.2 * wd.trait.cur : 0) + 0.2 * Math.max(0, def);
    if (w.r() < p) { c.solved = true; trial(w, c) }
  }
  w.crimes = w.crimes.filter(c => !c.solved && w.day - c.day <= 12);
}
function witnesses(w, v) { return w.vills.filter(o => o !== v && !o.sleeping && Math.hypot(o.x - v.x, o.y - v.y) < 7 && w.r() < 0.4).map(o => o.id) }
function theft(w, v) {
  const amt = Math.min(w.stock.food, 2 + ((w.r() * 4) | 0)); if (amt <= 0) return;
  w.stock.food -= amt; v.hunger = Math.min(100, v.hunger + 30); w.crimeLog.push(w.day);
  w.crimes.push({ type: 'theft', day: w.day, culprit: v.id, witnesses: witnesses(w, v), solved: false });
  v.story('Took food from the stores in secret.'); w.say('Food has gone missing from the stores.'); nudge(w, 'law', 0.03); nudge(w, 'defense', 0.03);
}
function assault(w, att, vic, a, b) {
  vic = vic || (att === a ? b : a); vic.health -= 15 + w.r() * 15; vic.cause = 'hunger'; w.crimeLog.push(w.day); att.story(`Struck ${vic.name} in anger.`); vic.story(`Was struck by ${att.name}.`);
  w.say(`${att.name} struck ${vic.name} in a heated quarrel.`); const c = { type: 'assault', day: w.day, culprit: att.id, victim: vic.id, witnesses: [vic.id], solved: true }; trial(w, c);
}
function trial(w, c) {
  const culprit = memberOf(w, c.culprit); if (!culprit) return; const g = w.gov, law = g.policy.law, rep = culprit.record;
  const sevOf = { warning: 0, duty: 1, stocks: 2, banish: 3 }, options = [{ id: 'warning', text: 'A public warning and a pledge to make amends' }, { id: 'duty', text: 'Two days of community labor' }, { id: 'stocks', text: 'A day in the stocks by the campfire' }];
  if (rep >= 2) options.push({ id: 'banish', text: 'Banishment from the village (repeat offender)' });
  const def = rep >= 2 && law > 0.25 ? 'banish' : law > 0.25 ? 'stocks' : law < -0.25 ? 'warning' : 'duty';
  deliberate(w, { kind: 'trial', topic: `${culprit.name} (${culprit.traitWords().join(', ') || 'even-tempered'}, mood ${Math.round(culprit.mood)}/100, hunger ${Math.round(culprit.hunger)}/100, prior offences ${rep}) is accused of ${c.type === 'theft' ? 'stealing food from the village stores' : 'striking ' + ((memberOf(w, c.victim) || {}).name || 'a neighbor')}. Law policy leans ${law > 0 ? 'strict' : law < 0 ? 'lenient' : 'moderate'} (${law}). What sentence should the council pass?`,
    members: councilMembers(w).map(m => ({ name: m.v.name, title: m.title, traits: m.v.traitWords().join(', ') || 'even-tempered', op: m.v.op })), history: g.decisions.slice(0, 4).map(d => `Day ${d.day}: ${d.text}`), state: stateBrief(w), options, default: def,
    apply: (id, sp, reason, src) => {
      culprit.record++; culprit.reputation = Math.max(0, culprit.reputation - 15); culprit.story(`Faced the council for ${c.type}: ${id}.`);
      if (id === 'duty') culprit.duty = w.tick + CFG.TPD * 2; if (id === 'stocks') culprit.stocksUntil = w.tick + CFG.TPD * 0.6; culprit.mood = Math.max(0, culprit.mood - 6 * sevOf[id]);
      const word = { warning: 'was given a public warning', duty: 'was sentenced to two days of community labor', stocks: 'was put in the stocks for a day', banish: 'was banished from the village' }[id];
      if (id === 'banish') { w.vills.splice(w.vills.indexOf(culprit), 1); culprit.alive = false; culprit.endJob(); for (const h of w.houses()) { const i = h.occ.indexOf(culprit.id); if (i >= 0) h.occ.splice(i, 1) } w.banished.push(culprit.name) }
      for (const v of adultsOf(w)) v.mood = clamp(v.mood + clamp(v.op.law * (sevOf[id] - 1) * 2, -3, 3), 0, 100);
      w.emit('crime', `${culprit.name} ${word}${c.type === 'theft' ? ' for stealing food' : ' for assault'}.${reason && src === 'claude' ? ' ' + reason : ''}`, { culprit, id, src });
      sp.slice(0, 2).forEach(s => w.say(`   ${s.who}: “${s.line}”`));
      g.decisions.unshift({ day: w.day, text: `${culprit.name} ${word}`, speeches: sp, source: src }); if (g.decisions.length > 12) g.decisions.pop();
    } });
}

/* ---------------------------------------------------------------- calendar: holidays, moods, daily upkeep */
function setupHoliday(w) {
  w.festival = false; w.holiday = null;
  const h = HOLIDAYS[w.season];
  if (w.seasonDay === h.day && (!h.food || w.stock.food >= w.vills.length * h.food)) { w.festival = true; w.holiday = h.name }
  else if (w.forceFeast) { w.festival = true; w.holiday = 'Community Feast'; w.forceFeast = false }
  else if (w.gov.policy.labor > 0.4 && w.day % 6 === 0) { w.festival = true; w.holiday = 'Day of Rest' }
  if (w.festival) { w.holidayDone = false; w.emit('holiday', `Today is the ${w.holiday}. The village will gather at the fire tonight.`, { name: w.holiday }); nudge(w, 'labor', 0.03) }
}
function resolveHoliday(w) {
  if (w.holidayDone) return; w.holidayDone = true;
  const amph = projBuilt(w, 'amphitheatre'), near = w.vills.filter(v => !v.sleeping && Math.hypot(v.x - w.cx, v.y - w.cy) < (amph ? 16 : 9));
  for (const v of near) v.mood = Math.min(100, v.mood + (amph ? 14 : 8));
  if (w.holiday === 'Midsummer Games') {
    const ps = near.filter(v => !v.isChild() && v.age < 65).sort(() => w.r() - 0.5).slice(0, 10); if (ps.length < 3) return;
    const events = [['footrace', v => v.trait.ind * 0.4 + v.trait.brave * 0.2 - (v.age > 50 ? 0.3 : 0)], ['archery', v => v.skill.hunt + v.trait.cur * 0.2], ['wrestling', v => v.trait.brave * 0.6 + v.trait.ind * 0.3 + (v.sex === 'm' ? 0.1 : 0)], ['riddle contest', v => v.trait.cur * 0.7 + v.trait.soc * 0.2]];
    const winners = [];
    for (const [name, f] of events) {
      const ranked = ps.map(v => ({ v, s: f(v) + w.r() * 0.5 })).sort((a, b) => b.s - a.s), win = ranked[0].v, sec = ranked[1].v;
      win.won = (win.won || 0) + 1; win.mood = Math.min(100, win.mood + 15); win.story(`Won the ${name} at the Midsummer Games.`); winners.push(`${win.name} (${name})`);
      if (win.group && sec.group && win.group !== sec.group) { const g = w.groups.find(x => x.id === win.group), h = w.groups.find(x => x.id === sec.group); if (g && h) { g.stance[h.id] = (g.stance[h.id] || 0) - 0.05; h.stance[g.id] = g.stance[h.id] } }
    }
    w.emit('holiday', `Midsummer Games results: ${winners.join(', ')}.`, { games: true });
  } else w.say(`The ${w.holiday} was enjoyed by all.`);
}
function societyNewDay(w) {
  const g = w.gov, fr = new Map(), en = new Map();
  for (const [k, r] of w.rel) {
    const nr = r * 0.994; if (Math.abs(nr) < 1) { w.rel.delete(k); continue } w.rel.set(k, nr);
    const [a, b] = k.split('_').map(Number); if (nr >= 50) { fr.set(a, (fr.get(a) || 0) + 1); fr.set(b, (fr.get(b) || 0) + 1) } else if (nr <= -40) { en.set(a, (en.get(a) || 0) + 1); en.set(b, (en.get(b) || 0) + 1) }
  }
  for (const v of w.vills) { v.friends = fr.get(v.id) || 0; v.enemies = en.get(v.id) || 0; v.updateMood(); v.checkDesire() }
  const ad = adultsOf(w); g.approval = ad.length ? ad.reduce((s, v) => s + v.mood, 0) / ad.length : 70;
  if (g.mediation) for (const [k, r] of w.rel) if (r < -30) w.rel.set(k, r + 3);
  if (w.stock.food < w.vills.length) nudge(w, 'growth', -0.05);
  if (w.has('coinage')) { const cs = ad.map(v => v.coins || 0).sort((a, b) => a - b), med = cs.length ? cs[cs.length >> 1] : 0; for (const v of ad) v.op.tax = clamp(v.op.tax + clamp((med - (v.coins || 0)) / 300, -0.02, 0.02), -1, 1) }       // the poor lean toward taxes, the comfortable away from them
  for (const v of ad) for (const k of ISSUES) v.op[k] *= 0.995;          // convictions fade without fresh cause, so opinions keep their variety
  factionDay(w);
  setupHoliday(w);
  if (w.settings.crime) crimeDay(w);
  g.council = g.council.filter(c => memberOf(w, c.id));
  if (ad.length >= 8 && w.day >= 5) {
    if (!g.council.length) holdElection(w, 'first'); else if (w.day >= g.termEnd) holdElection(w, 'term');
    else if (g.council.length < councilSize(ad.length)) fillCouncil(w);
  }
  if (g.council.length && !g.council.some(c => c.title === 'Chief')) g.council[0].title = 'Chief';
  if (g.council.length && w.day >= g.nextMeeting - (projBuilt(w, 'hall') ? 1 : 0) && w.meetingDay !== w.day) { w.meetingDay = w.day; w.meetingDone = false }
  if (g.trial && w.day >= g.trial.start + 8) reviewRemedy(w);
}
