'use strict';
/* ==========================================================================
   stats.js — v0.23 statistics and insight.
   A civilization's story in numbers, kept for the whole run:
   • series: ~30 measures sampled every 4 days (people, food, wealth, inequality,
     mood, regime axes, policy, knowledge, expansion), thinned when very long;
   • events: counters with a per-year history for the rare and common things that
     happen (births, each kind of death, fires, coups, strikes, feuds, outposts...);
   • firsts and marks: the day each kind of event first happened, and notable
     events pinned to the timeline;
   • summary(): the handful of numbers a multi-world sweep compares.
   Nothing here changes the simulation; it only watches.
   ========================================================================== */
const STAT_EVERY = 4, STAT_CAP = 2400;
const STAT_GROUPS = ['People', 'Hardship', 'Society', 'Economy & expansion', 'Knowledge', 'Conflict', 'Growth limits'];
const STAT_EVENTS = [
  ['born', 'Births', 'People'], ['cabin', 'Cabins built', 'People'], ['arrivals', 'Newcomers arrive', 'People'], ['couples', 'Couples formed', 'People'], ['died', 'Deaths (all)', 'People'],
  ['died_age', 'Died of old age', 'People'], ['died_hunger', 'Starved', 'People'], ['died_cold', 'Froze', 'People'], ['died_fever', 'Died of fever', 'People'], ['died_wolf', 'Killed by wolves', 'People'], ['died_sea', 'Lost at sea', 'People'], ['died_violence', 'Killed in raids or strife', 'People'],
  ['fire', 'Fires', 'Hardship'], ['storm', 'Storms', 'Hardship'], ['drought', 'Droughts', 'Hardship'], ['harsh_winter', 'Harsh winters', 'Hardship'], ['fever', 'Fever outbreaks', 'Hardship'], ['wolves', 'Wolf attacks', 'Hardship'], ['famine', 'Famines', 'Hardship'], ['collapse', 'Buildings collapsed', 'Hardship'], ['cargo_lost', 'Cargoes lost', 'Hardship'],
  ['election', 'Elections', 'Society'], ['decision', 'Council decisions', 'Society'], ['coup', 'Coups', 'Society'], ['uprising', 'Uprisings', 'Society'], ['purge', 'Purges', 'Society'], ['reform', 'Reforms', 'Society'], ['rival_council', 'Rival councils', 'Society'], ['strike', 'Strikes', 'Society'], ['civil_strife', 'Civil strife', 'Society'], ['secession', 'Secessions', 'Society'], ['sect', 'Sects founded', 'Society'],
  ['theft', 'Thefts', 'Society'], ['assault', 'Assaults', 'Society'], ['trial', 'Trials', 'Society'], ['banished', 'Banishments', 'Society'], ['feud', 'Feuds begun', 'Society'], ['feud_mended', 'Feuds mended', 'Society'], ['estate', 'Estates passed on', 'Society'], ['holiday', 'Holidays', 'Society'],
  ['deal', 'Market deals', 'Economy & expansion'], ['trip', 'Trading trips', 'Economy & expansion'], ['ship_built', 'Ships built', 'Economy & expansion'], ['harbour_upgrade', 'Harbour upgrades', 'Economy & expansion'], ['voyage', 'Peoples discovered', 'Economy & expansion'], ['outpost_founded', 'Outposts founded', 'Economy & expansion'], ['outpost_failed', 'Outposts failed', 'Economy & expansion'], ['outpost_free', 'Outposts broke away', 'Economy & expansion'], ['bridge', 'Bridges built', 'Economy & expansion'], ['wedding', 'Weddings', 'Society'], ['funeral', 'Funerals', 'Society'], ['guild', 'Guilds founded', 'Society'], ['flood', 'Floods', 'Hardship'], ['plague', 'Plagues', 'Hardship'], ['tech_sold', 'Lessons sold abroad', 'Economy & expansion'], ['spy_won', 'Crafts taken by our spies', 'Economy & expansion'], ['campaign', 'Campaigns launched', 'Conflict'], ['war_won', 'Campaigns won', 'Conflict'], ['war_lost', 'Campaigns lost', 'Conflict'], ['war_drawn', 'Campaigns drawn', 'Conflict'], ['outpost_attacked', 'Outposts attacked', 'Conflict'], ['outpost_defended', 'Outpost attacks beaten off', 'Conflict'],
  ['terraform', 'Terraform works done', 'Economy & expansion'], ['expedition', 'Expeditions returned', 'Economy & expansion'], ['expedition_lost', 'Expeditions lost', 'Economy & expansion'], ['rumour', 'Sites heard of', 'Economy & expansion'], ['research_deal', 'Lessons bought from neighbours', 'Knowledge'],
  ['concern', 'Concerns raised', 'Society'], ['concern_critical', 'Critical concerns', 'Society'], ['concern_response', 'Responses tried', 'Society'], ['invention', 'Jobs invented', 'Economy & expansion'], ['invention_failed', 'Inventions that failed', 'Economy & expansion'], ['overtime', 'Overtime calls', 'Society'], ['aspiration', 'Dreams achieved', 'People'], ['discovery', 'Discoveries', 'Knowledge'], ['tech_lost', 'Knowledge lost', 'Knowledge'], ['era', 'New ages', 'Knowledge'], ['project', 'Great works finished', 'Knowledge'], ['lesson', 'Lessons learned', 'Knowledge'],
  ['lim_try', 'Birth attempts by couples', 'Growth limits'], ['lim_ok', 'Conceptions', 'Growth limits'], ['lim_preg', 'Stopped: already expecting', 'Growth limits'], ['lim_cool', 'Stopped: too soon after a birth', 'Growth limits'], ['lim_age', 'Stopped: past fertile age', 'Growth limits'],
  ['lim_dep', 'Stopped: too many young children at home', 'Growth limits'], ['lim_beds', 'Stopped: no free bed', 'Growth limits'], ['lim_food', 'Stopped: food stores too low', 'Growth limits'], ['lim_dice', 'Stopped: chance (damping, policy, hardship)', 'Growth limits'],
].map(([key, label, group]) => ({ key, label, group }));
const STAT_LABEL = Object.fromEntries(STAT_EVENTS.map(e => [e.key, e.label]));
const MARKED = new Set(['concern_critical', 'tech_lost', 'coup', 'uprising', 'secession', 'civil_strife', 'famine', 'era', 'outpost_founded', 'outpost_free', 'bridge', 'sect', 'rival_council', 'project', 'voyage', 'fever', 'strike']);

const STAT_SERIES = [
  { id: 'pop', label: 'Population', group: 'People', get: w => w.pop },
  { id: 'crowd', label: 'Townsfolk beyond the villagers in play', group: 'People', get: w => w.crowd ? w.crowd.n : 0 },
  { id: 'focus', label: 'Villagers in play', group: 'People', get: w => w.vills.length },
  { id: 'fpairs', label: 'Fertile couples', group: 'Growth limits', get: w => w.vills.filter(v => v.sex === 'f' && v.isAdult() && v.partner != null && v.age <= CFG.FERTILE_MAX * (w.lifeScale || 1)).length },
  { id: 'fsingle', label: 'Fertile women without a partner', group: 'Growth limits', get: w => w.vills.filter(v => v.sex === 'f' && v.isAdult() && v.partner == null && v.age <= CFG.FERTILE_MAX * (w.lifeScale || 1)).length },
  { id: 'prosp', label: 'Prosperity index (fertility and newcomers)', group: 'People', get: w => w.prosp == null ? 1 : w.prosp },
  { id: 'beds', label: 'Beds', group: 'People', get: w => w.beds() },
  { id: 'outside', label: 'Sleeping outside', group: 'People', get: w => w.priv ? w.priv.out : 0 },
  { id: 'crowded', label: 'Crowded against their nature', group: 'People', get: w => w.priv ? w.priv.crowd : 0 },
  { id: 'adults', label: 'Adults', group: 'People', get: w => w.vills.filter(v => v.isAdult() && !v.isElder()).length },
  { id: 'elders', label: 'Elders', group: 'People', get: w => w.vills.filter(v => v.isElder()).length },
  { id: 'young', label: 'Children and youths', group: 'People', get: w => w.vills.filter(v => !v.isAdult()).length },
  { id: 'age', label: 'Average age (years)', group: 'People', get: w => w.vills.length ? w.vills.reduce((s, v) => s + v.age, 0) / w.vills.length * CFG.LIFE_BASE / CFG.DPS / 4 : 0 },
  { id: 'births', label: 'Births per 4 days', group: 'People', delta: 'born' },
  { id: 'deaths', label: 'Deaths per 4 days', group: 'People', delta: 'died' },
  { id: 'food', label: 'Food stock', group: 'Resources', get: w => w.stock.food },
  { id: 'wood', label: 'Wood stock', group: 'Resources', get: w => w.stock.wood },
  { id: 'stone', label: 'Stone stock', group: 'Resources', get: w => w.stock.stone },
  { id: 'treasury', label: 'Treasury (coins)', group: 'Resources', get: w => w.econ ? w.econ.treasury : 0 },
  { id: 'wealth', label: 'Average wealth', group: 'Resources', get: w => { const a = adultsOf(w); return a.length ? a.reduce((s, v) => s + wealthOf(v), 0) / a.length : 0 } },
  { id: 'gini', label: 'Inequality (Gini)', group: 'Society', get: w => { const a = adultsOf(w).map(wealthOf).sort((x, y) => x - y), t = a.reduce((s, x) => s + x, 0); if (!t) return 0; let c = 0; a.forEach((x, i) => { c += (2 * (i + 1) - a.length - 1) * x }); return c / (a.length * t) } },
  { id: 'worry', label: 'Share of thoughts that are worries (%)', group: 'Society', get: w => w.voices ? w.voices.worry || 0 : 0 },
  { id: 'chats', label: 'Conversations per day', group: 'Society', get: w => w.voices ? w.voices.chats || 0 : 0 },
  { id: 'mood', label: 'Average mood', group: 'Society', get: w => { const a = adultsOf(w); return a.length ? a.reduce((s, v) => s + v.mood, 0) / a.length : 0 } },
  { id: 'status', label: 'Average standing', group: 'Society', get: w => { const a = adultsOf(w); return a.length ? a.reduce((s, v) => s + (v.status || 0), 0) / a.length : 0 } },
  { id: 'unity', label: 'Unity', group: 'Society', get: w => w.regime.ax.cohes },
  { id: 'auth', label: 'Authority', group: 'Society', get: w => w.regime.ax.auth },
  { id: 'comm', label: 'Community', group: 'Society', get: w => w.regime.ax.comm },
  { id: 'pious', label: 'Faith', group: 'Society', get: w => w.regime.ax.pious },
  { id: 'indus', label: 'Industry', group: 'Society', get: w => w.regime.ax.indus },
  { id: 'open', label: 'Openness', group: 'Society', get: w => w.regime.ax.open },
  { id: 'circles', label: 'Social circles', group: 'Society', get: w => w.groups.length },
  { id: 'employed', label: 'Adults with work (%)', group: 'Economy & expansion', get: w => { const a = w.vills.filter(v => v.isAdult() && !v.isElder()); return a.length ? Math.round(100 * a.filter(v => v.role || v.trade).length / a.length) : 0 } },
  { id: 'trades', label: 'Trades in practice', group: 'Economy & expansion', get: w => new Set(w.vills.filter(v => v.trade || v.side).map(v => v.trade || v.side)).size },
  { id: 'concerns', label: 'Open concerns', group: 'Society', get: w => w.concerns ? w.concerns.list.length : 0 },
  { id: 'feuds', label: 'Active feuds', group: 'Society', get: w => w.lives ? w.lives.feuds.filter(f => !f.over).length : 0 },
  { id: 'crime', label: 'Crimes per 4 days', group: 'Society', delta: ['theft', 'assault'] },
  { id: 'p_law', label: 'Policy: strictness', group: 'Policy', get: w => w.gov.policy.law },
  { id: 'p_tax', label: 'Policy: taxes', group: 'Policy', get: w => w.gov.policy.tax },
  { id: 'p_labor', label: 'Policy: leisure', group: 'Policy', get: w => w.gov.policy.labor },
  { id: 'p_growth', label: 'Policy: growth', group: 'Policy', get: w => w.gov.policy.growth },
  { id: 'p_defense', label: 'Policy: watchfulness', group: 'Policy', get: w => w.gov.policy.defense },
  { id: 'techs', label: 'Technologies known', group: 'Knowledge', get: w => Object.keys(w.tech.known).length },
  { id: 'tage', label: 'Technology age (0 = Stone)', group: 'Knowledge', get: w => villageAge(w) },
  ...Object.keys(BRANCHES).map(b => ({ id: 'tb_' + b, label: 'Known: ' + BRANCHES[b].name, group: 'Knowledge', get: w => TECH_BY_BRANCH[b].filter(id => w.tech.known[id]).length })),
  { id: 'projects', label: 'Great works', group: 'Knowledge', get: w => Object.keys(w.proj.done).length },
  { id: 'buildings', label: 'Buildings', group: 'Knowledge', get: w => w.buildings.size },
  { id: 'houses', label: 'Homes', group: 'Knowledge', get: w => w.houses().length },
  { id: 'hamlets', label: 'Hamlets', group: 'Knowledge', get: w => w.city ? w.city.hamlets.length : 0 },
  { id: 'landval', label: 'Land value at homes', group: 'Knowledge', get: w => typeof cityStats === 'function' && w._lv ? cityStats(w).avgLv : 0 },
  { id: 'dense', label: 'Beds in dense housing (%)', group: 'Knowledge', get: w => { const hs = w.houses(); let all = 0, d = 0; for (const b of hs) { const n = bedsOf(b); all += n; if ((b.style || 0) >= 4) d += n } return all ? Math.round(100 * d / all) : 0 } },
  { id: 'culture', label: 'Culture (0-100)', group: 'Society', get: w => w.cul ? Math.round(w.cul.score) : 0 },
  { id: 'guilds', label: 'Guilds', group: 'Society', get: w => w.cul ? w.cul.guilds.length : 0 },
  { id: 'sick', label: 'People ill with plague', group: 'Hardship', get: w => typeof plagueSick === 'function' ? plagueSick(w) : 0 },
  { id: 'soldiers', label: 'Soldiers', group: 'Conflict', get: w => w.war ? Object.keys(w.war.rolls).length : 0 },
  { id: 'armypow', label: 'Army strength', group: 'Conflict', get: w => w.war && typeof armyPower === 'function' ? Math.round(armyPower(w) * 10) / 10 : 0 },
  { id: 'outposts', label: 'Outposts alive', group: 'Expansion', get: w => w.out ? w.out.list.filter(o => o.state === 'active').length : 0 },
  { id: 'neigh', label: 'Peoples known', group: 'Expansion', get: w => w.neigh ? w.neigh.filter(n => n.found).length : 0 },
  { id: 'ships', label: 'Ships', group: 'Expansion', get: w => w.boats.length },
  { id: 'trips', label: 'Trading trips (total)', group: 'Expansion', get: w => w.trade2 ? w.trade2.ledger.trips : 0 },
  { id: 'blocked', label: 'Technologies waiting on a missing input', group: 'Knowledge', get: w => techBlocked(w).length },
  { id: 'caphit', label: 'Days scholars hit their daily limit (total)', group: 'Knowledge', get: w => w.tech.capHit || 0 },
  { id: 'works', label: 'Terraform works built', group: 'Expansion', get: w => w.terra ? w.terra.built : 0 },
  { id: 'wontiles', label: 'Tiles won from rock and water', group: 'Expansion', get: w => w.terra ? w.terra.tiles : 0 },
  { id: 'sitesknown', label: 'Sites heard of and not yet visited', group: 'Expansion', get: w => w.disc ? w.disc.sites.filter(s => s.known && !s.done).length : 0 },
  { id: 'finds', label: 'Expeditions with a find (total)', group: 'Expansion', get: w => w.disc ? w.disc.finds : 0 },
  { id: 'mats', label: 'Materials in hand (of 4)', group: 'Knowledge', get: w => MAT_LIST.filter(m => matOk(w, m)).length },
  { id: 'fishstock', label: 'Fish in the water (average per tile x100)', group: 'Expansion', get: w => { if (!w._wn) { let n = 0; for (let i = 0; i < w.terr.length; i++) if (w.terr[i] <= TERR.SHALLOW) n++; w._wn = n || 1 } let t = 0; const f = w.fish; for (let i = 0; i < f.length; i++) t += f[i]; return Math.round(100 * t / w._wn) } },
  { id: 'outpop', label: 'People living in outposts', group: 'Expansion', get: w => w.out ? w.out.list.reduce((t, o) => t + (o.state === 'active' ? o.pop || 0 : 0), 0) : 0 },
  { id: 'deernear', label: 'Deer within 25 tiles of the village', group: 'Expansion', get: w => deerNear(w) }
];
const SERIES_BY_ID = Object.fromEntries(STAT_SERIES.map(s => [s.id, s]));

function initStats(w) {
  w.stats = { v: 1, every: STAT_EVERY, days: [], s: {}, ev: {}, prev: {}, firsts: {}, marks: [], eras: [], startDay: w.day };
  for (const s of STAT_SERIES) w.stats.s[s.id] = [];
}
/* old saves: add any series the file lacks and pad short ones, so every series lines up with `days` */
function statsEnsure(S) {
  const n = S.days.length;
  for (const s of STAT_SERIES) { const a = S.s[s.id] || (S.s[s.id] = []); while (a.length < n) a.push(0); if (a.length > n) a.length = n }
}
const ST = w => w.stats || (initStats(w), w.stats);
/* one thing happened: count it in the total and in this year's column */
function statCount(w, key, n = 1, text) {
  const S = ST(w), e = S.ev[key] || (S.ev[key] = { n: 0, y: [] }), yi = w.year - 1;
  e.n += n; while (e.y.length <= yi) e.y.push(0); e.y[yi] += n;
  if (!S.firsts[key]) S.firsts[key] = { day: w.day, text: text || STAT_LABEL[key] || key };
  if (MARKED.has(key) && S.marks.length < 600) S.marks.push({ day: w.day, key, text: text || STAT_LABEL[key] });
  if (key === 'era') S.eras.push({ day: w.day, text: text || '' });
}
const evTotal = (w, k) => (ST(w).ev[k] || { n: 0 }).n;
/* every emitted event passes through here once; most counts come from its type and tags */
function statFromEmit(w, type, text, data) {
  const c = (k, t) => statCount(w, k, 1, t || text), d = data || {}, tx = text || '';
  switch (type) {
    case 'birth': c('born'); break;
    case 'death': { c('died'); const why = String(d.why || ''); c(/hunger|starv/.test(why) ? 'died_hunger' : /old age|peacefully/.test(why) ? 'died_age' : /froze/.test(why) ? 'died_cold' : /fever/.test(why) ? 'died_fever' : /wolf/.test(why) ? 'died_wolf' : /sea/.test(why) ? 'died_sea' : /raid|strife|struck|fight|battle/.test(why) ? 'died_violence' : 'died_other'); break }
    case 'event': {
      const k = d.kind; if (k === 'flood') c('flood'); else if (k === 'plague') c('plague'); else if (k === 'fire' || /^Fire/.test(tx)) c('fire'); else if (k === 'storm' || /violent storm/.test(tx)) c('storm'); else if (k === 'drought') c('drought'); else if (k === 'harsh') c('harsh_winter'); else if (k === 'fever' || /fever sweeps/.test(tx)) c('fever'); else if (k === 'wolves') c('wolves'); else if (k === 'newcomers') c('arrivals');
      else if (/^Famine/.test(tx)) c('famine'); else if (/collapses/.test(tx)) c('collapse'); else if (/cargo was lost/.test(tx)) c('cargo_lost'); break
    }
    case 'cold': break;
    case 'election': c('election'); break;
    case 'council': c('decision'); break;
    case 'regime':
      if (d.coup) c('coup'); else if (d.revolt) c('uprising'); else if (d.reform) c('reform'); else if (d.purge) c('purge'); else if (d.secession) c('secession'); else if (d.shadow === true) c('rival_council'); else if (d.civil) c('civil_strife');
      else if (/put down their tools/.test(tx)) c('strike'); else if (/founds a movement/.test(tx)) c('sect'); else if (/Fighting breaks out/.test(tx)) c('civil_strife'); break;
    case 'crime': c('trial'); if (d.id === 'banish') c('banished'); break;
    case 'feud': if (/begins/.test(tx)) c('feud'); else if (/faded/.test(tx)) c('feud_mended'); break;
    case 'holiday': if (!d.games) c('holiday'); break;
    case 'trade': if (d.trip) c('trip'); else if (d.ship) c('ship_built'); else if (d.harbour) c('harbour_upgrade'); else if (d.deal) c('deal'); break;
    case 'voyage': c('voyage'); break;
    case 'outpost': if (/settlers.*to found|aboard a ship|on the road/.test(tx)) c('outpost_founded'); else if (/died out|lost on the way/.test(tx)) c('outpost_failed'); break;
    case 'diplomacy': if (/declare themselves free/.test(tx)) c('outpost_free'); break;
    case 'bridge': c('bridge'); break;
    case 'culture': if (d.kind === 'wedding') c('wedding'); else if (d.kind === 'funeral') c('funeral'); else if (d.kind === 'guild') c('guild'); break;
    case 'war': if (d.kind === 'campaign') { if (d.outcome === 'won') c('war_won'); else if (d.outcome === 'lost') c('war_lost'); else if (d.outcome === 'drawn') c('war_drawn'); else if (d.outcome === 'march') c('campaign') } else if (d.kind === 'outpost') { if (d.outcome === 'repelled') c('outpost_defended'); else c('outpost_attacked') } break;
    case 'discovery': c('discovery'); break;
    case 'terraform': c('terraform'); break;
    case 'expedition': c(d.lost ? 'expedition_lost' : 'expedition'); break;
    case 'rumour': c('rumour'); break;
    case 'research': if (d.kind === 'sale') c('tech_sold'); else if (d.kind === 'spy_won') c('spy_won'); else c('research_deal'); break;
    case 'era': c('era'); break;
    case 'techloss': c('tech_lost'); break;
    case 'project': if (d.done) c('project'); break;
    case 'lesson': c('lesson'); break;
  }
}
function statsDay(w) {
  const S = ST(w); if (w.day % STAT_EVERY !== 0) return;
  if (!S.fixed) { statsEnsure(S); S.fixed = true }
  S.days.push(w.day);
  for (const s of STAT_SERIES) {
    let v;
    if (s.delta) { const keys = Array.isArray(s.delta) ? s.delta : [s.delta], tot = keys.reduce((a, k) => a + evTotal(w, k), 0); v = tot - (S.prev[s.id] || 0); S.prev[s.id] = tot } else { try { v = s.get(w) } catch (e) { v = 0 } }
    S.s[s.id].push(Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0);
  }
  if (S.days.length > STAT_CAP) {                // very long runs: halve the oldest half by averaging pairs
    const half = S.days.length >> 1, thin = a => { const o = []; for (let i = 0; i < half; i += 2) o.push(a[i + 1] === undefined ? a[i] : Math.round((a[i] + a[i + 1]) / 2 * 1000) / 1000); return o.concat(a.slice(half)) };
    S.days = (() => { const o = []; for (let i = 0; i < half; i += 2) o.push(S.days[i + 1] === undefined ? S.days[i] : S.days[i + 1]); return o.concat(S.days.slice(half)) })(); for (const k in S.s) S.s[k] = thin(S.s[k]);
  }
}
/* ---------- reading the record ---------- */
function statsYears(w) { return Math.max(1, w.year) }
function evRate(w, key, years) {            // events per year over the last `years` completed-or-current years
  const e = ST(w).ev[key]; if (!e) return 0; const yi = w.year, from = Math.max(0, yi - years), n = e.y.slice(from, yi).reduce((a, b) => a + b, 0); return n / Math.max(1, yi - from);
}
function seriesPoints(w, id, fromDay) {
  const S = ST(w), a = S.s[id] || [], out = []; for (let i = 0; i < a.length; i++) if (S.days[i] >= fromDay) out.push([S.days[i], a[i]]); return out;
}
function statsRecords(w) {
  const S = ST(w), rec = [], ser = id => S.s[id] || [], at = (id, f) => { const a = ser(id); if (!a.length) return null; let bi = 0; for (let i = 1; i < a.length; i++) if (f(a[i], a[bi])) bi = i; return { v: a[bi], day: S.days[bi] } };
  const add = (label, r, fmt) => { if (r) rec.push({ label, text: (fmt || (x => Math.round(x * 100) / 100))(r.v), day: r.day }) };
  add('Largest population', at('pop', (a, b) => a > b)); add('Smallest population since day 40', (() => { const a = ser('pop'); let bi = -1; for (let i = 0; i < a.length; i++) if (S.days[i] >= 40 && (bi < 0 || a[i] < a[bi])) bi = i; return bi >= 0 ? { v: a[bi], day: S.days[bi] } : null })());
  add('Most unequal', at('gini', (a, b) => a > b), x => x.toFixed(2)); add('Most united', at('unity', (a, b) => a > b), x => x.toFixed(2)); add('Most divided', at('unity', (a, b) => a < b), x => x.toFixed(2)); add('Happiest', at('mood', (a, b) => a > b), x => Math.round(x) + '/100'); add('Gloomiest', at('mood', (a, b) => a < b), x => Math.round(x) + '/100');
  add('Most feuds at once', at('feuds', (a, b) => a > b)); add('Most outposts at once', at('outposts', (a, b) => a > b)); add('Biggest food stock', at('food', (a, b) => a > b));
  const yrs = (k) => { const e = S.ev[k]; if (!e) return null; let bi = 0; e.y.forEach((n, i) => { if (n > e.y[bi]) bi = i }); return e.y[bi] > 0 ? { v: e.y[bi], day: bi * 32 + 1, year: bi + 1 } : null };
  for (const [k, l] of [['born', 'Most births in a year'], ['died', 'Most deaths in a year'], ['trial', 'Most trials in a year'], ['discovery', 'Most discoveries in a year']]) { const r = yrs(k); if (r) rec.push({ label: l, text: r.v, day: r.day, year: r.year }) }
  const R = w.regime; if (R && R.history) rec.push({ label: 'Regime changes', text: R.history.length + (R.history.length >= 8 ? '+' : ''), day: null });
  return rec;
}
/* a handful of numbers to compare whole worlds in a sweep */
function statsSummary(w) {
  const S = ST(w), last = id => { const a = S.s[id] || []; return a.length ? a[a.length - 1] : 0 }, mean = id => { const a = S.s[id] || []; return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 }, max = id => Math.max(0, ...(S.s[id] || [0])), yrs = statsYears(w), t = k => evTotal(w, k);
  return { years: +(w.day / 32).toFixed(1), pop: last('pop'), peakPop: max('pop'), meanPop: +mean('pop').toFixed(1), meanMood: +mean('mood').toFixed(1), meanGini: +mean('gini').toFixed(3), maxGini: +max('gini').toFixed(3), meanUnity: +mean('unity').toFixed(3), meanAuth: +mean('auth').toFixed(3), meanOpen: +mean('open').toFixed(3), meanPious: +mean('pious').toFixed(3), meanIndus: +mean('indus').toFixed(3), meanComm: +mean('comm').toFixed(3),
    born: t('born'), died: t('died'), starved: t('died_hunger'), violence: t('died_violence'), unrest: t('coup') + t('uprising') + t('strike') + t('rival_council') + t('civil_strife'), coups: t('coup'), secessions: t('secession'), strikes: t('strike'), feuds: t('feud'), crimes: t('theft') + t('assault'), trips: t('trip'), deals: t('deal'), outposts: t('outpost_founded'), discoveries: t('discovery'), projects: t('project'), techs: last('techs'), fires: t('fire'), fevers: t('fever'), famines: t('famine'), growthPerYear: +((last('pop') - (S.s.pop[0] || 0)) / yrs).toFixed(2) };
}
function statsCSV(w) {
  const S = ST(w), ids = STAT_SERIES.map(s => s.id), rows = [['day', 'year', ...ids].join(',')];
  S.days.forEach((d, i) => rows.push([d, Math.floor((d - 1) / 32) + 1, ...ids.map(id => (S.s[id] || [])[i])].join(',')));
  const ev = ['', 'event,total,' + Array.from({ length: Math.max(1, w.year) }, (_, i) => 'year' + (i + 1)).join(',')]; for (const e of STAT_EVENTS) { const x = S.ev[e.key]; if (x) ev.push([e.key, x.n, ...Array.from({ length: Math.max(1, w.year) }, (_, i) => x.y[i] || 0)].join(',')) }
  return rows.join('\n') + '\n' + ev.join('\n');
}
