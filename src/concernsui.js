'use strict';
/* ==========================================================================
   concernsui.js (v0.24.1): the Concerns badge, panel and toasts.
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
    if (b.dataset.resp) { const ok = respond(world, b.dataset.resp); cnUI.note = ok ? 'Done. See the Events log for how it goes.' : 'That is not possible right now.'; cnUI.sig = ''; renderConcerns(true) }
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
  return `<button data-resp="${id}" ${s.ok ? '' : 'disabled'} title="${escapeHtml(s.blurb + (cost ? ' Costs ' + cost + '.' : ''))}">${escapeHtml(s.label)}${cost && s.ok ? `<small> · ${escapeHtml(cost)}</small>` : ''}${why ? `<small> · ${escapeHtml(why)}</small>` : ''}</button>`;
}
function concernHtml(w, c) {
  return `<div class="cn ${c.sev >= 2 ? 'crit' : 'watch'}"><div class="cnh"><b>${escapeHtml(c.title)}</b><span class="pill">${c.sev >= 2 ? 'Critical' : 'Watch'}</span><span class="hint">since ${cnYear(c.since)}, day ${c.since}</span></div>
    <div>${escapeHtml(c.text)}</div><div class="hint">${escapeHtml(c.why || '')}</div>
    <div class="cnr">${(c.fix || []).map(id => respButton(w, id, c.key)).join('')}<button data-mute="${escapeHtml(c.key)}" title="Hide this concern for a year">Mute</button></div></div>`;
}
function renderConcerns(force) {
  const w = world, C = w && w.concerns; if (!C) return;
  const list = openConcerns(w), crit = list.filter(c => c.sev >= 2).length, hb = $('hudConcern');
  hb.style.display = list.length || cnUI.open ? '' : 'none'; hb.textContent = '⚑ ' + list.length; hb.classList.toggle('crit', crit > 0); hb.title = list.length ? `${list.length} concern${list.length === 1 ? '' : 's'}${crit ? ', ' + crit + ' critical' : ''}` : 'No concerns';
  while (C.pending.length) {
    const p = C.pending.shift(); cnUI.dismissed.delete(p.id); if (!list.some(c => c.id === p.id)) continue; addToast(p);
    if (typeof tt !== 'undefined' && tt) continue;                                   // a fast-forward test is running
    if (alertPrefs.mode === 'pause' && speed > 0) setSpeed(0); else if (alertPrefs.mode === 'slow' && speed > 1) setSpeed(1);
  }
  for (const id of [...cnUI.toasts.keys()]) if (!list.some(c => c.id === id && c.sev >= 2)) removeToast(id);
  if (!cnUI.open) return;
  const sig = w.day + '|' + list.map(c => c.id + ':' + c.sev + ':' + c.text.length).join(',') + '|' + C.hist.length + '|' + cnUI.note;
  if (!force && sig === cnUI.sig) return; cnUI.sig = sig;
  const hist = C.hist.slice(0, 6).map(h => `<div class="hint">${cnYear(h.end)}: ${escapeHtml(h.title.toLowerCase())} eased (since day ${h.since})</div>`).join('');
  $('cnBody').innerHTML = (cnUI.note ? `<div class="cnnote">${escapeHtml(cnUI.note)}</div>` : '') + ordersLine(w)
    + (list.length ? list.sort((a, b) => b.sev - a.sev || a.since - b.since).map(c => concernHtml(w, c)).join('') : '<div class="hint" style="padding:6px 0">Nothing worries the village right now. It watches its population, food and firewood, and the unity of its people and outposts.</div>')
    + (hist ? `<details style="margin-top:8px"><summary class="hint">Recently eased</summary>${hist}</details>` : '');
}
