/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   statsui.js — the Stats tab: a civilization in numbers, a chart you choose
   (series, window, event marks), a table of events with yearly rates and
   trends, records and firsts, and export. Reads world.stats only.
   ========================================================================== */
const STAT_VIEWS = {
  overview: { label: 'Overview', ids: ['pop', 'food', 'mood'] },
  people: { label: 'People', ids: ['pop', 'births', 'deaths'] },
  wealth: { label: 'Wealth & mood', ids: ['wealth', 'gini', 'mood'] },
  regime: { label: 'Regime', ids: ['auth', 'comm', 'pious', 'open', 'unity'] },
  policy: { label: 'Policy', ids: ['p_law', 'p_tax', 'p_labor', 'p_defense'] },
  growth: { label: 'Growth', ids: ['pop', 'houses', 'techs', 'outposts'] },
  deaths: { label: 'Deaths', ids: ['d_age', 'd_hunger', 'd_cold', 'd_illness', 'd_other'] }
};
const STAT_COLORS = ['#8fd18b', '#e0b070', '#8fc4e8', '#e08fa8', '#b08fe8', '#d9c26a'];
let statUI = { sel: ['pop', 'food', 'mood'], win: 0, renderedDay: -1, hover: null }; try { const s = JSON.parse(localStorage.getItem('villagesim.statui') || 'null'); if (s && Array.isArray(s.sel)) { statUI.sel = s.sel.filter(id => SERIES_BY_ID[id]).slice(0, 5); statUI.win = s.win || 0 } } catch (e) { }
if (!statUI.sel.length) statUI.sel = ['pop'];
const saveStatUI = () => { try { localStorage.setItem('villagesim.statui', JSON.stringify({ sel: statUI.sel, win: statUI.win })) } catch (e) { } };
const fmtStat = (id, v) => { if (v === undefined || !Number.isFinite(v)) return '–'; const a = Math.abs(v); return a >= 1000 ? Math.round(v).toLocaleString() : a >= 100 ? String(Math.round(v)) : a >= 10 ? v.toFixed(1) : v.toFixed(2) };
const yearOf = d => Math.floor((d - 1) / (CFG.DPS * 4)) + 1;

function chartData(w) {
  const S = w.stats, last = S.days.length ? S.days[S.days.length - 1] : w.day, from = statUI.win ? Math.max(0, last - statUI.win * CFG.DPS * 4) : 0;
  return { S, from, last, series: statUI.sel.map((id, i) => ({ id, def: SERIES_BY_ID[id], color: STAT_COLORS[i % STAT_COLORS.length], pts: seriesPoints(w, id, from) })).filter(s => s.def) };
}
function drawStatChart() {
  const w = world, cv = $('statChart'); if (!cv || !w || !w.stats) return; const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth || 300, ch = 210;
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr) }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
  const { S, from, last, series } = chartData(w), L = series.length ? 40 : 8, Rr = series.length > 1 ? 40 : 8, T = 8, B = 28, pw = cw - L - Rr, ph = ch - T - B, x0 = from || (S.days[0] || 0), x1 = Math.max(last, x0 + 1), X = d => L + (d - x0) / (x1 - x0) * pw;
  g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(L, T, pw, ph);
  // years grid
  const y0 = yearOf(x0), y1 = yearOf(x1), step = Math.max(1, Math.ceil((y1 - y0 + 1) / 8)); g.font = '10px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#7d8790'; g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  const span = x1 - x0;
  if (span <= CFG.DPS * 4 * 2) { // up to two years shown: ticks in days, so the first year is not bare (v0.38.1)
    const ds = [1, 2, 4, 8, 16, 32].find(k => span / k <= 8) || 32; for (let d = Math.ceil(x0 / ds) * ds; d <= x1; d += ds) { g.beginPath(); g.moveTo(X(d), T); g.lineTo(X(d), T + ph); g.stroke(); g.fillText('Y' + yearOf(d) + ' d' + (((d - 1) % (CFG.DPS * 4)) + 1), X(d), ch - 14) }
  } else for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const d = (y - 1) * CFG.DPS * 4 + 1; if (d < x0 || d > x1) continue; g.beginPath(); g.moveTo(X(d), T); g.lineTo(X(d), T + ph); g.stroke(); g.fillText('Y' + y, X(d), ch - 14) }
  // lines, each scaled to its own range
  for (const s of series) {
    if (s.pts.length < 2) continue; let lo = Infinity, hi = -Infinity; for (const [, v] of s.pts) { if (v < lo) lo = v; if (v > hi) hi = v } if (hi - lo < 1e-9) { hi = lo + 1 }
    s.lo = lo; s.hi = hi; g.strokeStyle = s.color; g.lineWidth = 1.6; g.beginPath(); s.pts.forEach(([d, v], i) => { const x = X(d), y = T + ph - (v - lo) / (hi - lo) * ph * 0.92 - ph * 0.04; i ? g.lineTo(x, y) : g.moveTo(x, y) }); g.stroke();
  }
  // value scales: the first line's range on the left, the second line's on the right, in their own colours (every line is scaled to its own range)
  series.slice(0, 2).forEach((s, i) => { if (s.lo === undefined) return; g.fillStyle = s.color; g.textAlign = i ? 'left' : 'right'; const tx = i ? L + pw + 3 : L - 3; g.fillText(fmtStat(s.id, s.hi), tx, T + 9); g.fillText(fmtStat(s.id, s.lo), tx, T + ph - 2); g.fillText(fmtStat(s.id, (s.lo + s.hi) / 2), tx, T + ph / 2 + 3) });
  g.textAlign = 'center';
  // age markers and notable events along the bottom
  const marks = S.marks.filter(m => m.day >= x0 && m.day <= x1); g.textAlign = 'center';
  for (const e of S.eras) if (e.day >= x0 && e.day <= x1) { g.strokeStyle = 'rgba(224,176,112,.45)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(e.day), T); g.lineTo(X(e.day), T + ph); g.stroke(); g.setLineDash([]) }
  for (const m of marks) { const bad = /coup|uprising|civil|famine|fever|strike|secession|rival/.test(m.key); g.fillStyle = bad ? '#e07a5a' : '#8fd18b'; const x = X(m.day); g.beginPath(); g.moveTo(x, T + ph + 3); g.lineTo(x - 3, T + ph + 9); g.lineTo(x + 3, T + ph + 9); g.closePath(); g.fill() }
  if (!series.some(s => s.pts.length >= 2)) { g.fillStyle = '#7d8790'; g.textAlign = 'center'; g.fillText('Data appears after a few days of play.', cw / 2, T + ph / 2) }
  // hover crosshair
  const h = statUI.hover; if (h && h.x >= L && h.x <= L + pw) {
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(h.x, T); g.lineTo(h.x, T + ph); g.stroke();
    const d = x0 + (h.x - L) / pw * (x1 - x0); let tip = `<b>Day ${Math.round(d)} · year ${yearOf(d)}</b>`;
    for (const s of series) { let bi = -1, bd = 1e9; s.pts.forEach(([dd], i) => { const k = Math.abs(dd - d); if (k < bd) { bd = k; bi = i } }); if (bi >= 0) tip += `<div><i style="background:${s.color}"></i>${escapeHtml(s.def.label)} <b>${fmtStat(s.id, s.pts[bi][1])}</b></div>` }
    const near = marks.filter(m => Math.abs(m.day - d) <= (x1 - x0) / 40).slice(0, 3); for (const m of near) tip += `<div class="hint">D${m.day}: ${escapeHtml(m.text || m.key)}</div>`;
    const tt = $('statTip'); tt.innerHTML = tip; tt.style.display = 'block'; tt.style.left = Math.min(cw - 170, Math.max(0, h.x + 10)) + 'px'; tt.style.top = '4px';
  } else $('statTip').style.display = 'none';
  $('statLegend').innerHTML = series.map(s => `<span class="statchip" data-rm="${s.id}" title="Click to remove"><i style="background:${s.color}"></i>${escapeHtml(s.def.label)} <b>${fmtStat(s.id, s.pts.length ? s.pts[s.pts.length - 1][1] : NaN)}</b><span class="hint"> ${s.lo !== undefined ? fmtStat(s.id, s.lo) + '–' + fmtStat(s.id, s.hi) : ''}</span> ✕</span>`).join('');
}
function sparkSvg(arr, color) {
  if (!arr.length) return ''; const n = Math.min(arr.length, 24), a = arr.slice(-n), mx = Math.max(1, ...a), bw = 3, gap = 1, W = n * (bw + gap); return `<svg width="${W}" height="14" viewBox="0 0 ${W} 14">${a.map((v, i) => `<rect x="${i * (bw + gap)}" y="${14 - Math.round(v / mx * 13) - (v > 0 ? 1 : 0)}" width="${bw}" height="${Math.round(v / mx * 13) + (v > 0 ? 1 : 0)}" fill="${color}" opacity=".85"/>`).join('')}</svg>`;
}
/* v0.39.4: write a panel only when its markup changed. Rebuilding the preset buttons several times a second (every game day at 100x and Max) removed the button under the pointer, so hover and clicks were lost. */
function setHtmlIfChanged(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html } }
let statLastRender = 0;
function renderStats(force) {
  const w = world; if (!w || !w.stats || !$('statSummary')) return; const day = w.day;
  const nowMs = performance.now(); if (!force && !statUI.dirty && (statUI.renderedDay === day || nowMs - statLastRender < 400)) { drawStatChart(); return } statLastRender = nowMs; statUI.renderedDay = day; statUI.dirty = false;
  const S = w.stats, sm = statsSummary(w), yrs = Math.max(1, w.year);
  // summary
  const cell = (k, v) => `<div><span class="hint">${k}</span><b>${v}</b></div>`;
  $('statSummary').innerHTML = `<div class="stats">${cell('Age of the village', `${(w.day / 32).toFixed(1)} years`)}${cell('Population', `${sm.pop} <span class="hint">peak ${sm.peakPop}</span>`)}${cell('Born / died', `${sm.born} / ${sm.died}`)}${cell('Technologies', sm.techs)}${cell('Great works', sm.projects)}${cell('Peoples known', (w.neigh || []).filter(n => n.found).length)}${cell('Outposts founded', sm.outposts)}${cell('Unrest events', sm.unrest)}</div>
    <div class="hint" style="margin-top:6px">Average mood ${Math.round(sm.meanMood)}, inequality ${sm.meanGini.toFixed(2)}, unity ${sm.meanUnity.toFixed(2)} over the whole run.</div>`;
  // chart controls
  setHtmlIfChanged($('statViews'), Object.entries(STAT_VIEWS).map(([k, v]) => `<button data-view="${k}" class="${v.ids.join() === statUI.sel.join() ? 'on' : ''}">${v.label}</button>`).join(''));
  setHtmlIfChanged($('statWin'), [[5, '5 years'], [20, '20 years'], [0, 'All']].map(([n, l]) => `<button data-win="${n}" class="${statUI.win === n ? 'on' : ''}">${l}</button>`).join(''));
  const opts = STAT_SERIES.map(s => `<option value="${s.id}">${escapeHtml(s.group + ': ' + s.label)}</option>`).join(''); const sel = $('statAdd'); if (!sel.dataset.ready) { sel.innerHTML = '<option value="">+ add a measure…</option>' + opts; sel.dataset.ready = 1 }
  drawStatChart();
  // events
  const win = 5, rows = STAT_GROUPS.map(gp => {
    const evs = STAT_EVENTS.filter(e => e.group === gp && S.ev[e.key]); if (!evs.length) return '';
    return `<div class="statgrp"><div class="hint" style="margin:8px 0 2px">${gp}</div>${evs.map(e => {
      const x = S.ev[e.key], r = evRate(w, e.key, win), prev = (() => { const yi = w.year, a = x.y.slice(Math.max(0, yi - 2 * win), Math.max(0, yi - win)); return a.length ? a.reduce((p, c) => p + c, 0) / a.length : null })(), trend = prev === null || (prev === 0 && r === 0) ? '' : r > prev * 1.25 + 0.1 ? '<span class="up">▲</span>' : r < prev * 0.75 - 0.1 ? '<span class="dn">▼</span>' : '<span class="hint">▬</span>';
      return `<div class="evrow" title="${escapeHtml(e.label)}: first on day ${S.firsts[e.key] ? S.firsts[e.key].day : '?'}"><span>${escapeHtml(e.label)}</span><span class="evn">${x.n}</span><span class="hint evr">${r >= 10 ? Math.round(r) : r.toFixed(1)}/yr ${trend}</span>${sparkSvg(x.y, '#8fc4e8')}</div>`
    }).join('')}</div>`
  }).join('');
  $('statEvents').innerHTML = rows || '<div class="hint">Events are counted as they happen.</div>';
  // records and firsts
  const recs = statsRecords(w), firsts = Object.entries(S.firsts).filter(([k]) => !/^died_|^born$|^couples$|^decision$|^deal$|^trial$/.test(k)).sort((a, b) => a[1].day - b[1].day).slice(0, 14);
  $('statRecords').innerHTML = (recs.length ? `<div class="hint" style="margin-bottom:2px">Records</div>` + recs.map(r => `<div class="evrow"><span>${escapeHtml(r.label)}</span><span class="evn">${r.text}</span><span class="hint evr">${r.year ? 'year ' + r.year : r.day ? 'day ' + r.day : ''}</span></div>`).join('') : '') +
    (firsts.length ? `<div class="hint" style="margin:8px 0 2px">Firsts</div>` + firsts.map(([k, f]) => `<div class="evrow"><span>${escapeHtml(STAT_LABEL[k] || k)}</span><span class="hint evr" style="flex:1;text-align:right">day ${f.day}, year ${yearOf(f.day)}</span></div>`).join('') : '');
}
function initStatsUI() {
  const cv = $('statChart'); if (!cv) return;
  $('statViews').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; statUI.sel = (b.classList.contains('on') && b.dataset.view !== 'overview' ? STAT_VIEWS.overview : STAT_VIEWS[b.dataset.view]).ids.slice(); saveStatUI(); statUI.dirty = true; renderStats(true) });
  $('statWin').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; statUI.win = +b.dataset.win; saveStatUI(); statUI.dirty = true; renderStats(true) });
  $('statAdd').addEventListener('change', e => { const id = e.target.value; e.target.value = ''; if (id && !statUI.sel.includes(id)) { statUI.sel.push(id); if (statUI.sel.length > 5) statUI.sel.shift(); saveStatUI(); statUI.dirty = true; renderStats(true) } });
  $('statLegend').addEventListener('click', e => { const c = e.target.closest('[data-rm]'); if (!c || statUI.sel.length < 2) return; statUI.sel = statUI.sel.filter(x => x !== c.dataset.rm); saveStatUI(); statUI.dirty = true; renderStats(true) });
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); statUI.hover = { x: e.clientX - r.left }; drawStatChart() }); cv.addEventListener('pointerleave', () => { statUI.hover = null; drawStatChart() });
  const dl = (name, text, type) => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 500) } catch (x) { } };
  const tag = () => `village-y${world.year}-seed${world.seed}`;
  $('statCsv').onclick = () => dl(tag() + '-stats.csv', statsCSV(world), 'text/csv'); $('statJson').onclick = () => dl(tag() + '-stats.json', JSON.stringify({ seed: world.seed, map: world.arch, day: world.day, summary: statsSummary(world), stats: world.stats }, null, 1), 'application/json');
}

/* v0.39.1: hover a stat name anywhere in the side panel to see its history. Names are matched to series here, so no card needs its own markup. */
const SPARK_NAMES = { 'Population': 'pop', 'Food': 'food', 'Food stock': 'food', 'Wood': 'wood', 'Stone': 'stone', 'Mood': 'mood', 'Average mood': 'mood', 'Unity': 'unity', 'Culture': 'culture', 'Technologies': 'techs', 'Buildings': 'buildings', 'Homes': 'houses', 'Treasury': 'treasury', 'Adults': 'adults', 'Elders': 'elders', 'Feuds': 'feuds', 'Authority': 'auth', 'Community': 'comm', 'Faith': 'pious', 'Industry': 'industry', 'Openness': 'open', 'Born / died': 'births', 'Soldiers': 'soldiers' };
function tagSparks() {
  const side = document.getElementById('side'); if (!side) return;
  for (const el of side.querySelectorAll('.hint, .polh>span:first-child, .stats>div>span, .stats span.hint')) {
    if (el.dataset.spark !== undefined) continue; const t = el.textContent.trim(), id = SPARK_NAMES[t]; if (id === 'industry') { el.dataset.spark = 'indus'; continue } if (id) { el.dataset.spark = id; el.classList.add('sparkable') }
  }
}
(function () {
  let tip = null;
  const hide = () => { if (tip) tip.style.display = 'none' };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-spark]'); if (!el || !world || !world.stats) return hide();
    const id = el.dataset.spark, S = world.stats, a = S.s[id], def = STAT_SERIES.find(s => s.id === id); if (!a || !def || a.length < 3) return hide();
    if (!tip) { tip = document.createElement('div'); tip.className = 'stattip'; tip.style.cssText = 'position:fixed;z-index:60;pointer-events:none;width:230px;padding:8px'; document.body.appendChild(tip) }
    const n = Math.min(a.length, 160), v = a.slice(-n), lo = Math.min(...v), hi = Math.max(...v), sp = Math.max(1e-9, hi - lo), W = 214, H = 54;
    const d0 = S.days[S.days.length - n] ?? 0, d1 = S.days[S.days.length - 1] ?? world.day, L = CFG.DPS * 4, yd = d => 'Y' + (Math.floor((d - 1) / L) + 1) + ' D' + (((d - 1) % L) + 1);
    const pts = v.map((x, i) => (i / Math.max(1, n - 1) * W).toFixed(1) + ',' + (H - 3 - (x - lo) / sp * (H - 6)).toFixed(1)).join(' ');
    tip.innerHTML = `<div style="font-weight:600;margin-bottom:3px">${escapeHtml(i18n(def.label))}</div><svg width="${W}" height="${H}"><polyline fill="none" stroke="#8fd18b" stroke-width="1.5" points="${pts}"/></svg><div class="hint" style="display:flex;justify-content:space-between"><span>${yd(d0)}</span><span>now ${fmtStat(id, v[v.length - 1])}</span></div><div class="hint">low ${fmtStat(id, lo)} · high ${fmtStat(id, hi)}</div>`;
    const r = el.getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = Math.max(8, Math.min(innerWidth - 246, r.left)) + 'px'; tip.style.top = Math.min(innerHeight - 130, r.bottom + 6) + 'px';
  });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('[data-spark]')) hide() });
})();
