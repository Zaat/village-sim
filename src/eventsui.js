/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   eventsui.js — v0.39.3: the Events tab (browser only).
   Three views over the event record (events.js):
     Now    what the village is doing this moment, mood, season, the top concern
            and counts for the last eight days (a "week"); it is what you read at
            high speed, where the feed would only scroll past.
     Feed   the events, newest first, grouped by day, with filter chips. Big and
            medium events are kept for the whole game; at fast speeds "All"
            shows only those and folds the rest into a count.
     Years  one row per year (people at the start and end, births, deaths,
            arrivals, the big events and the best tale), older years folded
            into decades.
   A 📍 button on a line moves the map to where it happened and rings the spot;
   new events that have a place ring it briefly on their own (pins).
   Talk of the village sits below, open at slow speeds and folded when fast.
   ========================================================================== */
const EVUI = { chip: 'all', rows: 60, open: new Set(['y']), talkOpen: null };
const EV_CHIPS = [['all', 'All'], ['big', 'Important'], ['people', 'People'], ['hard', 'Hardships'], ['society', 'Society'], ['progress', 'Progress'], ['world', 'World']];       // shown through i18n()
const EV_DOING_COL = { working: '#d9a441', sleeping: '#5b6c9d', socialising: '#c97b9a', 'free time': '#79b0c9' };
try { const c = localStorage.getItem('villagesim.evchip'); if (c && EV_CHIPS.some(x => x[0] === c)) EVUI.chip = c } catch (e) { }

/* ---- pins: short rings on the map where an event happened (real time, whatever the game speed) ---- */
const PIN_MS = 5500, PIN_MAX = 8;
function pinAdd(x, y, tier, strong) {
  R.pins = R.pins || []; const now = performance.now();
  R.pins = R.pins.filter(p => now - p.t0 < PIN_MS && !(Math.abs(p.x - x) < 0.6 && Math.abs(p.y - y) < 0.6));
  R.pins.push({ x, y, t0: now, tier, strong: !!strong }); if (R.pins.length > PIN_MAX) R.pins.shift();
}
/* called every frame: ring each new logged event that has a place (only the more important ones when it is fast) */
function pinsUpdate(w, now) {
  if (!w.log || !w.log.length) return; const top = w.log[0].i || 0;
  if (R.pinSeen === undefined || R.pinWorld !== w) { R.pinSeen = top; R.pinWorld = w; R.pins = []; return }
  if (top === R.pinSeen) return; const sp = typeof speed === 'number' ? speed : 1, minT = sp > 30 ? 2 : sp > 3 ? 1 : 0;
  for (let k = w.log.length - 1; k >= 0; k--) { const l = w.log[k]; if (!(l.i > R.pinSeen)) continue; if (l.x !== undefined && l.t >= minT) pinAdd(l.x, l.y, l.t, false) }
  R.pinSeen = top;
}
function drawPins(g, now, tlx, tly, z) {
  if (!R.pins || !R.pins.length) return; const T = CFG.T; R.pins = R.pins.filter(p => now - p.t0 < PIN_MS);
  for (const p of R.pins) {
    const f = Math.max(0, (now - p.t0) / PIN_MS), sx = (p.x * T + T / 2 - tlx) * z, sy = (p.y * T + T / 2 - tly) * z; if (!(Number.isFinite(sx) && Number.isFinite(sy))) continue;
    const col = p.tier === 2 ? '255,120,90' : p.tier === 1 ? '255,214,110' : '190,220,255', a = 1 - f;
    g.save(); g.lineWidth = p.strong ? 3 : 2;
    for (let k = 0; k < 2; k++) { const ph = (f * 2.2 + k * 0.5) % 1, r = (10 + ph * 26) * (p.strong ? 1.3 : 1); g.strokeStyle = `rgba(${col},${Math.max(0, a * (1 - ph))})`; g.beginPath(); g.arc(sx, sy, r, 0, 6.2832); g.stroke() }
    g.fillStyle = `rgba(${col},${Math.max(0.15, a)})`; g.beginPath(); g.arc(sx, sy, p.strong ? 5 : 3.5, 0, 6.2832); g.fill(); g.restore();
  }
}

/* ---- Now ---- */
function renderEvNow() {
  const w = world, el = $('nowCard'); if (!el || !w) return; const N = evNow(w), sp = typeof speed === 'number' ? speed : 1;
  const wet = w.wet > 0.55 ? ' · ' + i18n('a wet year') : w.wet < -0.55 ? ' · ' + i18n('a dry year') : '';
  const seg = Object.entries(N.doing).filter(([, c]) => c > 0).map(([k, c]) => `<i style="width:${(100 * c / Math.max(1, N.n)).toFixed(1)}%;background:${EV_DOING_COL[k]}" title="${i18n(k)}: ${c}"></i>`).join('');
  const leg = Object.entries(N.share).map(([k, p]) => `<span><i style="background:${EV_DOING_COL[k]}"></i>${i18n(k)} ${p}%</span>`).join('');
  const wk = N.week, bits = [i18nPlural(wk.events, 'event', 'events') + (wk.big ? ' (' + i18n('{n} big', { n: wk.big }) + ')' : ''), i18n('{n} born', { n: wk.births }), i18n('{n} died', { n: wk.deaths })];
  el.innerHTML = `<h3>${i18n('Now')}</h3><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${i18n(SEASONS[w.season])}</b>, ${i18n('day {n}', { n: w.seasonDay })}${wet}</div><div class="hint">${i18n('mood')} ${i18n(moodWord(N.mood))}</div></div>
    <div class="evbar" role="img" aria-label="${i18n('What the villagers in play are doing')}">${seg}</div><div class="evleg">${leg}</div>
    <div class="hint" style="margin-top:4px">${N.concern ? i18n('Top concern:') + ' ' + escapeHtml(N.concern.title) : i18n('No pressing concerns.')}</div>
    <div class="hint">${i18n('Last eight days:')} ${bits.join(' · ')}</div>${sp > 10 ? '<div class="hint">' + i18n('Fast speed: this card is the live picture; the feed below shows what mattered.') + '</div>' : ''}`;
}

/* ---- Feed ---- */
function evRowHtml(e) {
  const gi = EV_GROUPS[e.g] ? EV_GROUPS[e.g].icon : '•', go = e.x !== undefined ? `<button class="evgo" data-x="${e.x}" data-y="${e.y}" title="${i18n('Show on the map')}" aria-label="${i18n('Show on the map')}">📍</button>` : e.v ? `<button class="evgo" data-v="1" title="${i18n('The whole village: go to the village')}" aria-label="${i18n('Go to the village')}">🏘️</button>` : '';
  return `<div class="evl t${e.t}"><span class="evic" title="${EV_GROUPS[e.g] ? i18n(EV_GROUPS[e.g].label) : ''}">${gi}</span><span class="evtx">${escapeHtml(e.text !== undefined ? e.text : e.s)}</span>${go}</div>`;
}
function renderEvFeed() {
  const w = world, el = $('feedCard'); if (!el || !w) return; const sp = typeof speed === 'number' ? speed : 1, chip = EVUI.chip;
  const fast = sp > 10 && chip === 'all', opt = { limit: EVUI.rows + 1, minTier: chip === 'big' || fast ? (chip === 'big' ? 2 : 1) : 0, group: ['people', 'hard', 'society', 'progress', 'world'].includes(chip) ? chip : null };
  const list = evFeed(w, opt), more = list.length > EVUI.rows; if (more) list.pop();
  let h = `<h3>${i18n('Events')}</h3><div class="evchips">${EV_CHIPS.map(([k, l]) => `<button data-chip="${k}" class="${chip === k ? 'on' : ''}">${i18n(l)}</button>`).join('')}</div>`;
  if (fast) { const folded = evFeed(w, { limit: 400, fromDay: w.day - 7 }).filter(e => e.t === 0).length; h += `<div class="hint" style="margin:4px 0">${i18n('Fast speed: showing the important lines')}${folded ? '; ' + i18n('{n} minor ones in the last eight days are folded away', { n: folded }) : ''}.</div>` }
  if (!list.length) h += '<div class="hint" style="margin-top:6px">' + i18n('Nothing here yet.') + '</div>';
  let day = -1; for (const e of list) { if (e.d !== day) { day = e.d; h += `<div class="evday">${ydTag(e.d)} <span class="hint">${i18n(SEASONS[Math.floor((e.d - 1) / CFG.DPS) % 4])}</span></div>` } h += evRowHtml(e) }
  if (more) h += `<button class="evmore" id="evMore">${i18n(EVUI.rows > 60 ? 'Show more' : 'Show older events')}</button>`;
  el.innerHTML = h;
}

/* ---- Years ---- */
function evYearRowHtml(r) {
  const flow = r.start != null && r.end != null ? i18n('{a} → {b} people', { a: r.start, b: r.end }) : r.end != null ? i18n('{n} people', { n: r.end }) : '';
  const sp = r.spark.length > 1 ? sparkSvg(r.spark, r.current ? '#8fd18b' : '#8fc4e8') : '';
  const big = r.big.slice(-12).map(e => evRowHtml(e)).join(''), tale = r.tale ? `<div class="hint" style="margin-top:3px">${i18n('Tale:')} ${escapeHtml(r.tale.text)}</div>` : '';
  const sum = `<b>${i18n('Year {n}', { n: r.year })}</b>${r.current ? ' <span class="hint">' + i18n('so far') + '</span>' : ''} <span class="hint">${flow}</span>${sp ? ' <span class="evsp">' + sp + '</span>' : ''}<div class="hint">${i18n('{n} born', { n: r.births })} · ${i18n('{n} died', { n: r.deaths })} · ${i18n('{n} arrived', { n: r.arrivals })}${r.big.length ? ' · ' + i18nPlural(r.big.length, 'big event', 'big events') : ''}</div>`;
  return `<details class="evyr" data-k="y${r.year}"${r.current ? ' data-cur="1"' : ''}${EVUI.open.has('y' + r.year) || (r.current && EVUI.open.has('y')) ? ' open' : ''}><summary>${sum}</summary>${big || '<div class="hint">' + i18n('No big events.') + '</div>'}${tale}</details>`;
}
function evDecadeHtml(d, rows) {
  const a = rows[rows.length - 1], b = rows[0], births = rows.reduce((s, r) => s + r.births, 0), deaths = rows.reduce((s, r) => s + r.deaths, 0), arr = rows.reduce((s, r) => s + r.arrivals, 0);
  const big = rows.flatMap(r => r.big).slice(-14).map(e => evRowHtml(e)).join('');
  return `<details class="evyr" data-k="d${d}"${EVUI.open.has('d' + d) ? ' open' : ''}><summary><b>${i18n('Years {a}–{b}', { a: a.year, b: b.year })}</b> <span class="hint">${i18n('{a} → {b} people', { a: a.start != null ? a.start : '?', b: b.end != null ? b.end : '?' })}</span><div class="hint">${i18n('{n} born', { n: births })} · ${i18n('{n} died', { n: deaths })} · ${i18n('{n} arrived', { n: arr })}</div></summary>${big || '<div class="hint">' + i18n('No big events.') + '</div>'}</details>`;
}
function renderEvYears() {
  const w = world, el = $('yearsCard'); if (!el || !w) return; const rows = evYears(w), single = rows.slice(0, 10), older = rows.slice(10);
  let h = '<h3>' + i18n('Years') + '</h3>' + single.map(evYearRowHtml).join('');
  if (older.length) { const dec = {}; for (const r of older) (dec[Math.floor((r.year - 1) / 10)] = dec[Math.floor((r.year - 1) / 10)] || []).push(r); h += Object.keys(dec).sort((a, b) => b - a).map(d => evDecadeHtml(+d, dec[d])).join('') }
  el.innerHTML = h || '<h3>' + i18n('Years') + '</h3><div class="hint">' + i18n('The first year is still being written.') + '</div>';
}

function renderEvents() { if (!world) return; renderEvNow(); renderEvFeed(); renderEvYears(); renderTalk() }

/* ---- clicks ---- */
(function () {
  const feed = document.getElementById('feedCard'), years = document.getElementById('yearsCard'), talk = document.getElementById('talkCard'); if (!feed) return;
  const go = e => { const b = e.target.closest('.evgo'); if (!b || !world) return false; evShowAt(b.dataset.v ? null : +b.dataset.x, b.dataset.v ? null : +b.dataset.y); return true };
  feed.addEventListener('click', e => {
    if (go(e)) return; const c = e.target.closest('[data-chip]');
    if (c) { EVUI.chip = c.dataset.chip; EVUI.rows = 60; try { localStorage.setItem('villagesim.evchip', EVUI.chip) } catch (_) { } renderEvFeed(); return }
    if (e.target.closest('#evMore')) { EVUI.rows += 60; renderEvFeed() }
  });
  years.addEventListener('click', go);
  years.addEventListener('click', e => { const s = e.target.closest('summary'); if (!s) return; setTimeout(() => { const d = s.parentElement; if (!d || !d.dataset || !d.dataset.k) return; if (d.open) EVUI.open.add(d.dataset.k); else { EVUI.open.delete(d.dataset.k); if (d.dataset.cur) EVUI.open.delete('y') } }, 0) });       // the click is the player's choice; redraws keep it
  if (talk) talk.addEventListener('click', e => { if (!e.target.closest('summary')) return; setTimeout(() => { const d = document.getElementById('talkDet'); if (d) EVUI.talkOpen = d.open }, 0) });       // only the player's own click counts, not the open attribute a redraw sets
})();
