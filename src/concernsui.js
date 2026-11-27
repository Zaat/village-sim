/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   concernsui.js (v0.24.1, states in 0.24.2a): the Concerns badge, panel and toasts.
   The badge sits in the date bar and counts what worries the village. Clicking
   it (or a toast) opens a panel with each concern, its cause, and the
   responses the player may try. Critical concerns also raise a toast that stays
   until it is dismissed or the trouble passes, and may pause the game or slow
   it to 1× (a setting, off by default). Reads world.concerns only.
   ========================================================================== */
const ALERT_KEY = 'villagesim.alerts';
const alertPrefs = { mode: 'off', toasts: true };
try { Object.assign(alertPrefs, JSON.parse(localStorage.getItem(ALERT_KEY) || '{}')) } catch (e) { }
const saveAlertPrefs = () => { try { localStorage.setItem(ALERT_KEY, JSON.stringify(alertPrefs)) } catch (e) { } };
const cnUI = { open: false, sig: '', toasts: new Map(), dismissed: new Set(), note: '' };
const cnYear = d => 'Year ' + (Math.floor((d - 1) / (CFG.DPS * 4)) + 1);
const costText = c => c ? Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => n + ' ' + k).join(', ') : '';

function concernsInit() {
  $('hudConcern').onclick = () => toggleConcerns();
  $('cnClose').onclick = () => toggleConcerns(false);
  $('alertMode').value = alertPrefs.mode; $('alertToasts').checked = alertPrefs.toasts;
  $('alertMode').onchange = e => { alertPrefs.mode = e.target.value; saveAlertPrefs() };
  $('alertToasts').onchange = e => { alertPrefs.toasts = e.target.checked; saveAlertPrefs(); if (!alertPrefs.toasts) clearToasts() };
  $('cnBody').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.resp) { const ok = respond(world, b.dataset.resp, b.dataset.key); cnUI.note = ok ? '' : 'That is not possible right now.'; cnUI.sig = ''; renderConcerns(true) }
    else if (b.dataset.mute) { muteConcern(world, b.dataset.mute, CFG.DPS * 4); cnUI.sig = ''; renderConcerns(true) }
  });
  $('toasts').addEventListener('click', e => {
    const t = e.target.closest('.toast'); if (!t) return; const id = +t.dataset.id;
    if (e.target.closest('.tx')) { cnUI.dismissed.add(id); removeToast(id) } else toggleConcerns(true);
  });
}
function toggleConcerns(on) {
  cnUI.open = on === undefined ? !cnUI.open : on; $('concernPanel').style.display = cnUI.open ? '' : 'none'; cnUI.sig = ''; cnUI.note = '';
  if (cnUI.open) { for (const id of [...cnUI.toasts.keys()]) { cnUI.dismissed.add(id); removeToast(id) } renderConcerns(true) }
}
function removeToast(id) { const el = cnUI.toasts.get(id); if (el) { el.remove(); cnUI.toasts.delete(id) } }
function clearToasts() { for (const id of [...cnUI.toasts.keys()]) removeToast(id) }
function addToast(c) {
  if (!alertPrefs.toasts || cnUI.open || cnUI.dismissed.has(c.id)) return; removeToast(c.id);
  while (cnUI.toasts.size >= 3) removeToast(cnUI.toasts.keys().next().value);
  const el = document.createElement('div'); el.className = 'toast crit'; el.dataset.id = c.id;
  el.innerHTML = `<button class="tx" title="Dismiss">✕</button><b>${escapeHtml(c.title)}</b><div>${escapeHtml(c.text)}</div><div class="hint">Click to see what can be done</div>`;
  $('toasts').appendChild(el); cnUI.toasts.set(c.id, el);
}
/* called when a world is adopted: show what is already critical, announce nothing new */
function concernsReset() {
  clearToasts(); cnUI.dismissed.clear(); cnUI.sig = ''; cnUI.note = '';
  const C = world.concerns; if (!C) return; C.pending.length = 0;
  for (const c of C.list) if (c.sev >= 2 && !(C.muted[c.key] > world.day)) addToast(c);
}
function ordersLine(w) {
  const O = w.concerns ? w.concerns.orders : {}, bits = [['ration', 'Rationing'], ['food', 'More hands on food'], ['fuel', 'More hands on firewood'], ['allhands', 'All hands']].filter(([k]) => (O[k] || 0) > w.day).map(([k, n]) => `${n} until day ${O[k]}`);
  return bits.length ? `<div class="cnorders">Orders in force: ${bits.join(' · ')}</div>` : '';
}
function respButton(w, id, key) {
  const s = responseState(w, id), why = s.wait ? `ready in ${s.wait} day${s.wait === 1 ? '' : 's'}` : s.why, cost = costText(s.cost);
  return `<button data-resp="${id}" data-key="${escapeHtml(key)}" ${s.ok ? '' : 'disabled'} title="${escapeHtml(s.blurb + (cost ? ' Costs ' + cost + '.' : ''))}">${escapeHtml(s.label)}${cost && s.ok ? `<small> · ${escapeHtml(cost)}</small>` : ''}${why ? `<small> · ${escapeHtml(why)}</small>` : ''}</button>`;
}
const STATE_NAME = { attention: 'Needs your attention', responding: 'Responding', easing: 'Easing', failed: "Didn't work" };
const cnBar = (f, cls) => `<div class="cnbar ${cls || ''}"><i style="width:${Math.round(clamp(f, 0, 1) * 100)}%"></i></div>`;
function actHtml(w, a) {
  const live = actLive(w, a);
  if (a.status === 'council') return `<div class="cnact"><span>${escapeHtml(a.label)}</span><small>council deciding…</small></div>`;
  if (a.status === 'declined') return `<div class="cnact off"><span>${escapeHtml(a.label)}</span><small>council declined (day ${a.at})</small></div>`;
  if (a.status === 'lapsed') return `<div class="cnact off"><span>${escapeHtml(a.label)}</span><small>no answer</small></div>`;
  const left = Math.max(0, a.until - w.day), f = (w.day - a.start) / Math.max(1, a.until - a.start);
  return live ? `<div class="cnact"><span>${escapeHtml(a.label)}${a.status === 'heeded' ? ' <small>(council agreed)</small>' : ''}</span>${cnBar(f, 'act')}<small>${left} day${left === 1 ? '' : 's'} left</small></div>`
    : `<div class="cnact off"><span>${escapeHtml(a.label)}</span><small>ended day ${a.until}</small></div>`;
}
function concernHtml(w, c) {
  const st = concernState(w, c), acts = (c.acts || []).slice(-4), arrow = st.trend > 0 ? '▲ worsening' : st.trend < 0 ? '▼ easing' : '● steady';
  const free = (c.fix || []).filter(id => !st.live.some(a => a.id === id)), btns = free.map(id => respButton(w, id, c.key)).join('') + `<button data-mute="${escapeHtml(c.key)}" title="Hide this concern for a year">Mute</button>`;
  const last = acts[acts.length - 1], note = st.state === 'failed' ? `<div class="cnfail">${escapeHtml(last.label)} ${last.status === 'declined' ? 'was declined' : last.status === 'lapsed' ? 'got no answer' : 'has ended'}, and the trouble remains. Try something else.</div>` : '';
  return `<div class="cn ${c.sev >= 2 ? 'crit' : 'watch'} st-${st.state}"><div class="cnh"><b>${escapeHtml(c.title)}</b><span class="pill">${c.sev >= 2 ? 'Critical' : 'Watch'}</span><span class="spill">${STATE_NAME[st.state]}</span></div>
    <div class="cnm">${cnBar(st.frac, st.trend < 0 ? 'ease' : st.trend > 0 ? 'worse' : '')}<small>${arrow}</small></div>
    <div>${escapeHtml(c.text)}</div><div class="hint">${escapeHtml(c.why || '')} · since ${cnYear(c.since)}, day ${c.since}</div>${note}
    ${acts.map(a => actHtml(w, a)).join('')}
    ${st.state === 'responding' ? `<details class="cnmore"><summary class="hint">More responses</summary><div class="cnr">${btns}</div></details>` : `<div class="cnr">${btns}</div>`}</div>`;
}
function renderConcerns(force) {
  const w = world, C = w && w.concerns; if (!C) return;
  const list = openConcerns(w), crit = list.filter(c => c.sev >= 2).length, hb = $('hudConcern');
  hb.style.display = list.length || cnUI.open ? '' : 'none'; hb.textContent = '⚑ ' + list.length; hb.classList.toggle('crit', crit > 0); const need = list.filter(c => { const k = concernState(w, c).state; return k === 'attention' || k === 'failed' }).length; hb.classList.toggle('calm', list.length > 0 && !need); hb.title = list.length ? `${list.length} concern${list.length === 1 ? '' : 's'}${crit ? ', ' + crit + ' critical' : ''}${need ? ', ' + need + ' need attention' : ', all being handled'}` : 'No concerns';
  while (C.pending.length) {
    const p = C.pending.shift(); cnUI.dismissed.delete(p.id); if (!list.some(c => c.id === p.id)) continue; addToast(p);
    if (typeof tt !== 'undefined' && tt) continue;                                   // a fast-forward test is running
    if (alertPrefs.mode === 'pause' && speed > 0) setSpeed(0); else if (alertPrefs.mode === 'slow' && speed > 1) setSpeed(1);
  }
  for (const id of [...cnUI.toasts.keys()]) if (!list.some(c => c.id === id && c.sev >= 2)) removeToast(id);
  if (!cnUI.open) return;
  const pnl = $('concernPanel'), held = !!(pnl && pnl.matches && pnl.matches(':hover'));       // while the pointer is over the list, only a real change redraws it (the day count would otherwise rebuild it every moment at fast speeds and swallow clicks)
  if (!held || cnUI.dk == null) cnUI.dk = Math.floor(w.day / 4);
  const sig = cnUI.dk + '|' + list.map(c => c.id + ':' + c.sev + ':' + c.text.length + ':' + (c.acts || []).map(a => a.status).join('')).join(',') + '|' + C.hist.length + '|' + cnUI.note;
  if (!force && sig === cnUI.sig) return; cnUI.sig = sig;
  const fresh = C.hist.filter(h => w.day - h.end <= 16).map(h => `<div class="cn done"><b>✓ ${escapeHtml(h.title)}</b> <span class="hint">resolved day ${h.end}${h.did && h.did.length ? ' · tried: ' + escapeHtml(h.did.join(', ').toLowerCase()) : ''}</span></div>`).join(''), hist = C.hist.slice(0, 8).map(h => `<div class="hint">${cnYear(h.end)}: ${escapeHtml(h.title.toLowerCase())} eased (since day ${h.since})</div>`).join('');
  const keep = pnl ? pnl.scrollTop : 0;
  $('cnBody').innerHTML = (cnUI.note ? `<div class="cnnote">${escapeHtml(cnUI.note)}</div>` : '') + ordersLine(w)
    + (list.length ? list.sort((a, b) => b.sev - a.sev || a.since - b.since).map(c => concernHtml(w, c)).join('') : '<div class="hint" style="padding:6px 0">Nothing worries the village right now. It watches its population, food and firewood, and the unity of its people and outposts.</div>')
    + fresh + (hist ? `<details id="cnHist" style="margin-top:8px"${cnUI.histOpen ? ' open' : ''}><summary class="hint">Recently eased</summary>${hist}</details>` : '');
  const hd = $('cnHist'); if (hd) hd.ontoggle = () => { cnUI.histOpen = hd.open };
  if (pnl) pnl.scrollTop = keep;       // a refresh keeps the reader's place
}
