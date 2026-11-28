/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   events.js — v0.39.3: the village's event record (no DOM, no random numbers).
   Every line the village logs (World.say, World.emit) also lands here with:
     g  group  (people, hard, society, progress, world)
     t  tier   (2 big, 1 medium, 0 small)
     x,y  where it happened, in tiles, when the caller knew (else absent)
   The flat log keeps the latest 120 lines as before; this list keeps the
   important ones for the whole game, in compact form (big events: up to 1200,
   medium: up to 700, small: only the latest 150), so a long village can still
   tell its own story. The Events tab (eventsui.js) shows it as Now, Feed and
   Years. Nothing here changes the simulation: it only watches.
   ========================================================================== */
const EV_GROUPS = {
  people: { label: 'People', icon: '👪' },
  hard: { label: 'Hardships', icon: '⚠️' },
  society: { label: 'Society', icon: '🏛️' },
  progress: { label: 'Progress', icon: '💡' },
  world: { label: 'World', icon: '🌍' }
};
const EV_TIERS = ['small', 'medium', 'big'];
const EV_KEEP = { 2: 1200, 1: 700, 0: 150 }, EV_TRIM_AT = 2600;
const evDaysYear = () => CFG.DPS * 4;       // v0.40: was a fixed 128, which made the Years view lump four game years into one (a year is four seasons of CFG.DPS days)

/* emit type -> [group, tier]; 'event' and 'diplomacy' and 'death' look at their data as well */
const EV_TYPES = {
  regime: ['society', 2], council: ['society', 1], war: ['world', 2], trade: ['world', 1], outpost: ['world', 2], diplomacy: ['world', 1], livelihood: ['society', 1],
  timber: ['world', 1], rumour: ['world', 0], research: ['progress', 1], election: ['society', 2], culture: ['people', 1], project: ['progress', 2], holiday: ['people', 1],
  group: ['society', 1], feud: ['society', 2], faction: ['society', 2], expedition: ['progress', 1], discovery: ['progress', 2], wolfslain: ['hard', 1], voyage: ['world', 2],
  terraform: ['progress', 1], techloss: ['progress', 2], season: ['world', 0], lesson: ['hard', 1], era: ['progress', 2], death: ['people', 1], crime: ['society', 1],
  concern: ['society', 1], cold: ['hard', 1], chat: ['people', 0], bridge: ['progress', 2], birth: ['people', 1]
};
const EV_HARD = { fire: 2, storm: 1, fever: 1, wolves: 1, harsh: 1, drought: 2, flood: 2, plague: 2 };
const EV_WIDE = new Set(['storm', 'fever', 'harsh', 'drought', 'newcomers', 'flood', 'plague', 'plague_end', 'hardship', 'philosophy', 'open', 'gameover']);
const EV_DIP_BIG = new Set(['contact', 'treaty', 'raid']);
/* lines logged with say() have no type: sort them by their wording */
const EV_WORDS = [
  [/\bwas born\b|\bis expecting\b/i, 'people', 1], [/\bbecome a couple\b|\bwed\b|\bmarried\b/i, 'people', 1],
  [/\bbecame friends\b|\bfallen out\b|\bdebated\b|\bhas come of age\b|\bnow counted among\b|\bdrifted apart\b|\bnew circle\b/i, 'people', 0],
  [/\bfulfilled a dream\b|\bstories and songs\b|\bwas enjoyed\b/i, 'people', 1], [/\btakes up work\b|\btries a new line\b|\bgives up on\b/i, 'society', 0],
  [/\bConcern:/i, 'society', 1], [/\bwolf is attacking\b/i, 'hard', 0], [/\bstruck\b|\btook food\b|\bgone missing\b|\bhas been\b.*\bstolen\b|\bthief\b/i, 'society', 1],
  [/\bfire\b|\bblaze\b|\bburn/i, 'hard', 2], [/\bstorm\b|\bflood\b|\bdrought\b|\bfever\b|\bfamine\b|\bstarv|\bwinter\b|\bwet year\b|\bdry year\b/i, 'hard', 1],
  [/\bis finished\b|\bare finished\b|\bis raised\b|\bis opened\b|\bopens its doors\b|\bis ready for sowing\b|\bis launched\b|\bhas been rebuilt\b|\bnew cabin\b|\bis laid out\b/i, 'progress', 1],
  [/\bbridge\b|\bterraform|\bsets its mind\b|\bnew homes and storehouses\b|\bexpedition\b|\bwreck\b/i, 'progress', 1],
  [/\bcouncil\b|\bmeeting\b|\bstrike\b|\bcoup\b|\bsecede|\brival council\b|\belection\b/i, 'society', 1],
  [/\braid|\bdefen[cs]e\b|\bdefenders\b|\bwatch of villagers\b|\bstand with the village\b|\btrad(e|ing)\b|\bcaravan\b|\bvoyage\b|\bship\b|\bmerchants?\b/i, 'world', 1]
];
function evKind(type, text, data) {
  if (type && type !== 'say') {
    if (type === 'event') { const k = data && data.kind; const t = EV_HARD[k]; return t !== undefined ? ['hard', t] : k === 'newcomers' ? ['people', 1] : ['hard', 1] }
    if (type === 'diplomacy') return ['world', data && EV_DIP_BIG.has(data.kind) ? 2 : 1];
    if (type === 'death') return ['people', data && data.lead ? 2 : 1];
    if (EV_TYPES[type]) return EV_TYPES[type];
  }
  for (const [re, g, t] of EV_WORDS) if (re.test(text)) return [g, t];
  return ['people', 0];
}
function evPos(at, data) {
  const pick = o => o && typeof o.x === 'number' && typeof o.y === 'number' && Number.isFinite(o.x) && Number.isFinite(o.y) ? o : null;
  let p = pick(at);
  if (!p && data) p = pick(data.at) || pick(data.v) || pick(data.c) || pick(data.f) || pick(data.a) || pick(data.b) || pick(data.n && data.n.found ? data.n : null);
  if (!p) return null;
  const w = p.w, h = p.h;       // buildings give their top-left corner and size: use the middle
  return [Math.round((p.x + (typeof w === 'number' && w > 0 ? w / 2 : 0)) * 10) / 10, Math.round((p.y + (typeof h === 'number' && h > 0 ? h / 2 : 0)) * 10) / 10];
}
function initEvents(w) { w.ev = { v: 1, next: 1, list: [] } }
function evEnsure(w) { if (!w.ev || !Array.isArray(w.ev.list)) initEvents(w); return w.ev }
function evTrim(E) {
  const keep = new Set(), by = { 0: [], 1: [], 2: [] };
  for (let i = E.list.length - 1; i >= 0; i--) { const e = E.list[i], t = e.t in by ? e.t : 0; if (by[t].length < EV_KEEP[t]) by[t].push(e) }
  for (const t in by) for (const e of by[t]) keep.add(e);
  E.list = E.list.filter(e => keep.has(e));
}
/* record one line; returns the entry (also shared with the flat log, so a click on either finds the place) */
function evRecord(w, text, type, data, at) {
  const E = evEnsure(w), [g, t] = evKind(type, text, data), pos = evPos(at, data);
  const e = { i: E.next++, d: w.day, g, t, s: text };
  if (pos) { e.x = pos[0]; e.y = pos[1] } else if (type === 'event' && data && EV_WIDE.has(data.kind)) e.v = 1       // v: the whole village, no single spot
  E.list.push(e); if (E.list.length > EV_TRIM_AT) evTrim(E);
  return e;
}
/* a save from before the record: start it from the 120 logged lines (no places, wording only) so the Feed is not empty */
function evBackfill(w) {
  w.ev = null; initEvents(w); const E = w.ev, lines = (w.log || []).slice().reverse();
  for (const l of lines) { const [g, t] = evKind(undefined, l.text || '', null); const e = { i: E.next++, d: l.day, g, t, s: l.text }; E.list.push(e); l.i = e.i; l.g = g; l.t = t }
}
const evYearOf = day => Math.floor((day - 1) / evDaysYear()) + 1;

/* ---- views: filtered feed, yearly rows, the "now" numbers ---- */
function evFeed(w, opt) {
  const E = evEnsure(w), o = opt || {}, minT = o.minTier || 0, g = o.group || null, n = o.limit || 80, out = [];
  for (let i = E.list.length - 1; i >= 0 && out.length < n; i--) { const e = E.list[i]; if (e.t < minT || (g && e.g !== g)) continue; if (o.fromDay && e.d < o.fromDay) break; out.push(e) }
  return out;
}
/* one row per completed or current year: people at the start and end, births, deaths, arrivals, the big events, the best tale */
function evYears(w) {
  const S = w.stats, E = evEnsure(w), cur = evYearOf(w.day), rows = [];
  const yv = k => (S && S.ev && S.ev[k] && S.ev[k].y) || [];
  const born = yv('born'), died = yv('died'), arr = yv('arrivals');
  const popAt = day => { if (!S || !S.s || !S.s.pop || !S.days || !S.days.length) return null; let best = null; for (let i = 0; i < S.days.length; i++) { if (S.days[i] <= day) best = S.s.pop[i]; else break } return best == null ? S.s.pop[0] : best };       // before the first sample (the first year's start) the village had the people it began with
  const big = {}; for (const e of E.list) if (e.t === 2) (big[evYearOf(e.d)] = big[evYearOf(e.d)] || []).push(e);
  const tales = (w.chron && w.chron.tales) || [], bestTale = {}; for (const t of tales) { const y = t.year || evYearOf(t.day); if (!bestTale[y] || t.score > bestTale[y].score) bestTale[y] = t }
  const first = S && S.startDay ? evYearOf(S.startDay) : 1;
  for (let y = cur; y >= first; y--) {
    const d0 = (y - 1) * evDaysYear() + 1, d1 = y * evDaysYear();
    const start = popAt(d0), end = y === cur ? w.pop : popAt(d1);
    const spark = []; if (S && S.s && S.s.pop) for (let i = 0; i < S.days.length; i++) if (S.days[i] >= d0 && S.days[i] <= d1) spark.push(S.s.pop[i]);
    rows.push({ year: y, current: y === cur, start, end, births: born[y - 1] || 0, deaths: died[y - 1] || 0, arrivals: arr[y - 1] || 0, big: big[y] || [], tale: bestTale[y] || null, spark });
  }
  return rows;
}
/* what the village is doing this moment: shares by activity, plus counts for the last eight days (a "week") */
const EV_DOING = { sleep: 'sleeping', social: 'socialising', leisure: 'free time', wander: 'free time' };
function evNow(w) {
  const n = w.vills.length || 1, doing = { working: 0, sleeping: 0, socialising: 0, 'free time': 0 };
  for (const v of w.vills) { if (v.isChild && v.isChild()) { doing['free time']++; continue } const k = v.sleeping ? 'sleep' : v.jobKind; const g = EV_DOING[k]; if (g) doing[g]++; else if (!k) doing['free time']++; else doing.working++ }
  const E = evEnsure(w), from = w.day - 7, week = { births: 0, deaths: 0, big: 0, events: 0 };
  for (let i = E.list.length - 1; i >= 0; i--) { const e = E.list[i]; if (e.d < from) break; week.events++; if (e.t === 2) week.big++; if (e.g === 'people' && /\bwas born\b/.test(e.s)) week.births++ }
  const deaths = w.dlog ? w.dlog.filter(d => d.day >= from).length : 0; week.deaths = deaths;
  const adults = w.vills.filter(v => v.isAdult()), mood = adults.length ? adults.reduce((a, v) => a + v.mood, 0) / adults.length : 0;
  const C = w.concerns, top = C && C.list && C.list.length ? C.list.slice().sort((a, b) => b.sev - a.sev)[0] : null;
  return { n: w.vills.length, doing, share: Object.fromEntries(Object.entries(doing).map(([k, c]) => [k, Math.round(100 * c / n)])), mood, week, concern: top ? { title: top.title, sev: top.sev } : null };
}
