'use strict';
/* ==========================================================================
   ui.js — input, panels, settings, the optional Claude counsel, main loop.
   ========================================================================== */
const $ = id => document.getElementById(id);
let world = null, selected = null, speed = 10, follow = false;
const keys = {};
const ROLE_COL = { farmer: '#d8b84a', woodcutter: '#b0562a', miner: '#8a929a', builder: '#e8a03a', hunter: '#3f7d4a', fisher: '#4aa3d8' };
/* panels redraw only when their content actually changed, which stops needless reflow and flicker */
(function () {
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  for (const id of ['statCard', 'techCard', 'econCard', 'livCard', 'projCard', 'chronCard', 'neighCard', 'harbourCard', 'discCard', 'regimeCard', 'councilCard', 'groupCard', 'talkCard', 'log', 'sel', 'diagBody', 'mindLog']) {
    const el = document.getElementById(id); if (!el) continue;
    Object.defineProperty(el, 'innerHTML', { configurable: true, get() { return desc.get.call(this) }, set(v) { if (this._h !== v) { this._h = v; desc.set.call(this, v) } } });
  }
})();
const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Claude counsel (OFF by default) ----------
   The village runs entirely on rules. When this is on, the council and its courts
   hand Claude a concrete list of options (pass a motion, pick a remedy for a crime
   wave, choose a sentence). Claude picks one, informed by each member's personality
   and opinions, the village's state and what worked before, and writes the debate.
   The answer is validated: an unknown choice is ignored and the rules decide. */
const MIND = { on: false, sample: null, ready: false, canRetry: false, busy: false, backoff: 0, count: 0, MAX: 40, entries: [] };
const mindMsg = t => { $('mindStatus').textContent = t };
function mindUI() {
  $('mindLabel').textContent = MIND.on ? 'On — Claude deliberates council decisions' : 'Off — uses your Claude usage when on';
  $('mindToggle').checked = MIND.on; $('mindToggle').disabled = !MIND.ready && !MIND.canRetry;
  $('mindRetry').style.display = MIND.canRetry ? '' : 'none';
}
async function mindInit() {
  try { MIND.sample = (typeof claude !== 'undefined' && claude.use) ? await claude.use('sample') : null } catch (e) { MIND.sample = null }
  MIND.ready = !!MIND.sample;
  if (MIND.ready) mindMsg('Off by default. When on, Claude chooses between options the simulation offers the council and courts (up to ' + MIND.MAX + ' per session). It asks your permission the first time.');
  else if (typeof claude === 'undefined') mindMsg('Not available here: this works on the published page, where the page can call Claude.');
  else { MIND.canRetry = true; mindMsg('This page could not reach Claude yet. Click "Request permission again", or reload the page and allow access when asked.') }
  mindUI();
}
async function mindProbe() {
  if (!MIND.sample) {
    try { MIND.sample = (typeof claude !== 'undefined' && claude.use) ? await claude.use('sample') : null } catch (e) { MIND.sample = null }
    MIND.ready = !!MIND.sample;
    if (!MIND.sample) { MIND.canRetry = true; mindMsg('Claude is still not reachable from this page. Reload the page and choose Allow when the permission prompt appears.'); mindUI(); return false }
  }
  mindMsg('Requesting permission… look for a prompt from Claude and choose Allow.'); MIND.canRetry = false; mindUI();
  try { await MIND.sample('Reply with exactly one word: ready', { modelTier: 'quick', cache: false }); return true }
  catch (e) {
    MIND.canRetry = true; const code = e && e.code;
    if (code === 'not_granted') mindMsg('Permission was not granted. Click "Request permission again" and choose Allow. If no prompt appears, reload the page and try once more.');
    else if (code === 'rate_limited') { MIND.backoff = Date.now() + 120000; mindMsg('Claude is rate limited right now. Try again in a couple of minutes.') }
    else mindMsg('Could not reach Claude (' + (code || 'error') + (e && e.message ? ': ' + String(e.message).slice(0, 120) : '') + '). You can try again.');
    mindUI(); return false;
  }
}
async function mindEnable() {
  const ok = await mindProbe(); MIND.on = ok; MIND.canRetry = !ok; MIND.ready = MIND.ready || ok; mindUI();
  if (ok) mindMsg('On · ' + MIND.count + '/' + MIND.MAX + ' deliberations used. Turn the switch off any time to stop all Claude calls; the rules take over.');
}
const mindApi = {
  ready: () => MIND.on && !!MIND.sample && !MIND.busy && Date.now() >= MIND.backoff && MIND.count < MIND.MAX,
  ask: req => askCounsel(req),
};
function parseJson(text) { const m = String(text || '').match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]) } catch (e) { return null } }
async function askCounsel(req) {
  MIND.busy = true; MIND.count++; mindMsg('The council is deliberating with Claude… (' + MIND.count + '/' + MIND.MAX + ')');
  const names = req.members.map(m => m.name), f = x => (x >= 0 ? '+' : '') + x.toFixed(1);
  const prompt = `You are the deliberative mind of a small village council in a simulation. Decide what the council actually does, in character, from the members' personalities and opinions.\n\nSituation: ${req.topic}\n\nVillage: ${req.state}\n\nCouncil members:\n${req.members.map(m => `- ${m.name} (${m.title}; ${m.traits}${m.group ? '; belongs to ' + m.group : ''}) opinions on a -1..+1 scale: growth ${f(m.op.growth)}, leisure ${f(m.op.labor)}, strict law ${f(m.op.law)}, watch/defense ${f(m.op.defense)}, higher taxes ${f(m.op.tax || 0)}`).join('\n')}\n\nEarlier decisions and how they turned out:\n${req.history.length ? req.history.join('\n') : '(none yet)'}\n\nOptions (choose exactly one id):\n${req.options.map(o => `- ${o.id}: ${o.text}`).join('\n')}\n\nReply with ONLY compact JSON in this form: {"choice":"<one option id>","speeches":[{"who":"<council member name>","line":"<under 25 words, in their voice>"}],"reason":"<one short sentence>"}. Give 2 to 4 speeches that reflect real disagreement where the members' views differ. Pick the option this particular group would most plausibly choose; do not invent options or names.`;
  try {
    const r = await Promise.race([MIND.sample(prompt, { modelTier: 'quick', cache: false }), new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 30000))]);
    const j = parseJson(r.text); if (!j || typeof j.choice !== 'string') throw { code: 'bad_reply' };
    const speeches = (Array.isArray(j.speeches) ? j.speeches : []).filter(s => s && names.includes(s.who) && typeof s.line === 'string').slice(0, 4).map(s => ({ who: s.who, line: s.line.slice(0, 180) }));
    const chosen = req.options.find(o => o.id === j.choice);
    if (chosen) { MIND.entries.unshift({ day: world.day, topic: req.topic, choice: chosen.text, reason: String(j.reason || '').slice(0, 200), speeches }); if (MIND.entries.length > 8) MIND.entries.pop(); renderMind() }
    req.finish(j.choice, speeches, String(j.reason || '').slice(0, 200), 'claude');
    mindMsg('On · ' + MIND.count + '/' + MIND.MAX + ' deliberations used.');
  } catch (e) {
    const code = e && e.code; req.finish(req.default, [], '', 'rules');
    if (code === 'not_granted') { MIND.on = false; MIND.canRetry = true; mindMsg('Permission was withdrawn or denied, so the rules are deciding. Click "Request permission again" to allow it.'); mindUI() }
    else if (code === 'rate_limited') { MIND.backoff = Date.now() + 180000; mindMsg('Rate limited; the rules decide for a few minutes.') }
    else mindMsg('Claude did not return a usable answer (' + (code || 'error') + '); the rules decided this one.');
  } finally { MIND.busy = false }
}
function renderMind() { $('mindLog').innerHTML = MIND.entries.map(e => `<div><b>Day ${e.day}</b> ${escapeHtml(e.choice)}${e.reason ? `<small>${escapeHtml(e.reason)}</small>` : ''}${e.speeches.map(s => `<small><i>${escapeHtml(s.who)}:</i> “${escapeHtml(s.line)}”</small>`).join('')}</div>`).join('') }
$('mindToggle').addEventListener('change', async e => {
  if (e.target.checked) { e.target.disabled = true; await mindEnable(); e.target.disabled = false } else { MIND.on = false; mindMsg('Off. No Claude calls are being made; the rules decide.'); mindUI() }
});
$('mindRetry').addEventListener('click', () => mindEnable());

/* ---------- settings ---------- */
const SETTING_DEFAULTS = { survival: false, disasters: true, crime: true, raids: false };
function loadSettings() { let s = {}; try { s = JSON.parse(localStorage.getItem('villagesim.settings') || '{}') } catch (e) { } return { ...SETTING_DEFAULTS, ...s } }
function saveSettings() { try { localStorage.setItem('villagesim.settings', JSON.stringify(world.settings)) } catch (e) { } }
for (const k of Object.keys(SETTING_DEFAULTS)) $('set_' + k).addEventListener('change', e => { world.settings[k] = e.target.checked; saveSettings() });
$('set_hardship').addEventListener('change', e => {            // live change: noted in the chronicle so it never passes silently
  const v = +e.target.value; if (v === world.settings.hardship) return; world.settings.hardship = v; saveSettings(); lsSet('villagesim.hardship', String(v));
  world.emit('event', `The council notes that life feels ${['gentler', 'as it was', 'harsher'][v]} now (hardship set to ${HARDSHIP[v].name}).`, { kind: 'hardship' });
});

const OPEN_LEVELS = [{ name: 'Off', note: 'Research has limits: scholars, rising costs, and the inputs a technology needs.' }, { name: 'Relaxed', note: 'No input gates, twice the scholar capacity, slower cost growth.' }, { name: 'Unlimited', note: 'Every technology is open at once, cheap and fast; grant any at will.' }];
$('set_philosophy').innerHTML = Object.keys(PHILOSOPHIES).map(k => `<option value="${k}">${PHILOSOPHIES[k].name}</option>`).join('');
$('set_philosophy').addEventListener('change', e => {
  const v = e.target.value; if (v === world.settings.philosophy) return; world.settings.philosophy = v; saveSettings(); lsSet('villagesim.phil', v);
  world.emit('event', `The council turns its mind to a ${PHILOSOPHIES[v].name.toLowerCase()} way of learning. ${PHILOSOPHIES[v].hint}`, { kind: 'philosophy' });
});
$('set_open').addEventListener('change', e => {            // a sandbox switch: always noted in the chronicle and in the records
  const v = +e.target.value; if (v === (world.settings.openKnowledge || 0)) return; world.settings.openKnowledge = v; if (v) world.sandbox = true; saveSettings(); lsSet('villagesim.open', String(v));
  world.emit('event', v ? `Sandbox: knowledge is now ${OPEN_LEVELS[v].name.toLowerCase()}. ${OPEN_LEVELS[v].note}` : 'Knowledge is bound by its limits again.', { kind: 'open' }); renderTech();
});

/* ---------- world lifecycle ---------- */
function adoptWorld(w) {
  try { $('mapnow').textContent = MAP_TYPES[w.arch].label + ' · ' + CFG.W + '×' + CFG.H + ' · seed ' + w.seed + '. ' + MAP_TYPES[w.arch].blurb } catch (e) { }
  if (tt) { tt = null; $('ttGo').disabled = false; $('ttCancel').disabled = true; $('ttSel').disabled = false }
  world = w; world.mind = mindApi; selected = null; follow = false; R.terrKey = '';
  world.listeners.push(type => { if (type === 'season' && !tt && autosaveOn && $('autosave').checked) saveToStorage(false) });
  world.dbg.onFault = () => dbgPersist(world); world.profReset();
  for (const k of Object.keys(SETTING_DEFAULTS)) $('set_' + k).checked = !!world.settings[k]; $('set_hardship').value = String(world.settings.hardship == null ? 1 : world.settings.hardship); $('set_philosophy').value = world.settings.philosophy || 'balanced'; $('set_open').value = String(world.settings.openKnowledge || 0);
  R.cam.x = (world.cx + 1) * CFG.T; R.cam.y = (world.cy + 1) * CFG.T; R.cam.z = Math.max(1.4, Math.min(3, R.vw / 420)); clampCam(); concernsReset(); updateUI();
}
const MAP_SIZES = { compact: { dims: [200, 140], label: 'Compact', note: '200 × 140: quick and close' }, standard: { dims: [260, 180], label: 'Standard', note: '260 × 180: the usual world' }, large: { dims: [340, 236], label: 'Large', note: '340 × 236: room for far settlements' } };
const lsGet = (k, d) => { try { return localStorage.getItem(k) || d } catch (e) { return d } }, lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch (e) { } };
function mapChoice() { const m = lsGet('villagesim.maptype', 'auto'); return MAP_TYPES[m] ? m : 'auto' }
function sizeChoice() { const m = lsGet('villagesim.mapsize', 'standard'); return MAP_SIZES[m] ? m : 'standard' }
/* island and archipelago worlds need sea around them for neighbours, so the compact size is not used for them */
function sizeFor(type, size) { return (size === 'compact' && (type === 'island' || type === 'archipelago')) ? 'standard' : size }
function newWorld(seed, opts) {
  seed = seed >>> 0; const mc = (opts && opts.type) || mapChoice(), type = mc === 'auto' ? pickMapType(seed) : mc, size = sizeFor(type, (opts && opts.size) || sizeChoice());
  adoptWorld(new World(seed, { ...loadSettings(), hardship: (opts && opts.hardship != null) ? opts.hardship : +lsGet('villagesim.hardship', '1'), philosophy: (opts && opts.phil) || lsGet('villagesim.phil', 'balanced'), openKnowledge: (opts && opts.open != null) ? opts.open : +lsGet('villagesim.open', '0'), fade: true, map: type }, MAP_SIZES[size].dims));
}
/* ---- the new-world dialog ---- */
let nwType = 'auto', nwSize = 'standard', nwHard = 1, nwPhil = 'balanced', nwOpen_ = 0;
function nwRender() { if ($('nw_traits')) $('nw_traits').textContent = '';
  $('nw_types').innerHTML = [['auto', 'Auto', 'Chosen by the seed'], ...Object.keys(MAP_TYPES).map(k => [k, MAP_TYPES[k].label, MAP_TYPES[k].blurb])].map(([k, l, b]) => `<button data-t="${k}" class="${nwType === k ? 'sel' : ''}"><b>${l}</b><span>${b}</span></button>`).join('');
  $('nw_sizes').innerHTML = Object.keys(MAP_SIZES).map(k => `<button data-s="${k}" class="${nwSize === k ? 'sel' : ''}"><b>${MAP_SIZES[k].label}</b><span>${MAP_SIZES[k].note}</span></button>`).join('');
  $('nw_hard').innerHTML = HARDSHIP.map((h, i) => `<button data-h="${i}" class="${nwHard === i ? 'sel' : ''}"><b>${h.name}</b><span>${h.note}</span></button>`).join('');
  $('nw_phil').innerHTML = Object.keys(PHILOSOPHIES).map(k => `<button data-p="${k}" class="${nwPhil === k ? 'sel' : ''}"><b>${PHILOSOPHIES[k].name}</b><span>${PHILOSOPHIES[k].hint}</span></button>`).join('');
  $('nw_open').innerHTML = OPEN_LEVELS.map((h, i) => `<button data-o="${i}" class="${nwOpen_ === i ? 'sel' : ''}"><b>${h.name}</b><span>${h.note}</span></button>`).join('');
  const eff = sizeFor(nwType === 'auto' ? 'x' : nwType, nwSize); $('nw_note').textContent = eff !== nwSize ? 'Island and archipelago worlds need sea around them, so they use the Standard size.' : nwSize === 'large' ? 'Large maps take more memory and a little more time per step; they suit settlements and long games.' : '';
}
function nwOpen() { if (drawerOpen()) toggleDrawer(false); nwType = mapChoice(); nwSize = sizeChoice(); nwHard = +lsGet('villagesim.hardship', '1'); nwPhil = lsGet('villagesim.phil', 'balanced'); nwOpen_ = +lsGet('villagesim.open', '0'); $('nw_seed').value = (Math.random() * 1e9) | 0; nwRender(); $('nw').style.display = 'flex'; $('nw_seed').focus(); $('nw_seed').select() }
function nwClose() { $('nw').style.display = 'none' }
$('restart').onclick = nwOpen; $('treeBtn').onclick = () => treeOpen(); $('nw_cancel').onclick = nwClose; $('nw').addEventListener('pointerdown', e => { if (e.target === $('nw')) nwClose() });
$('nw_dice').onclick = () => { $('nw_seed').value = (Math.random() * 1e9) | 0; $('nw_seed').focus(); $('nw_seed').select() };
$('nw_types').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { nwType = b.dataset.t; nwRender() } });
$('nw_hard').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { nwHard = +b.dataset.h; nwRender() } });
$('nw_phil').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { nwPhil = b.dataset.p; nwRender() } });
$('nw_open').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { nwOpen_ = +b.dataset.o; nwRender() } });
$('nw_sizes').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { nwSize = b.dataset.s; nwRender() } });
$('nw_check').onclick = () => {
  const el = $('nw_traits'); el.textContent = 'Generating this world…'; setTimeout(() => {
    try { const v = $('nw_seed').value.trim(), seed = (v === '' || isNaN(+v) ? 1 : +v) >>> 0, type = nwType === 'auto' ? pickMapType(seed) : nwType, size = sizeFor(type, nwSize), w = new World(seed, { map: type }, MAP_SIZES[size].dims);
      el.innerHTML = `<b>${MAP_TYPES[type].label}, ${MAP_SIZES[size].label}, seed ${seed}</b>` + worldTraits(w).map(([k, t]) => `<div><span style="color:#9fb4c8">${k}:</span> ${escapeHtml(t)}</div>`).join('') } catch (e) { el.textContent = 'Could not check this world: ' + e.message }
  }, 30) };
$('nw_seed').addEventListener('input', () => { $('nw_traits').textContent = '' });
$('nw_go').onclick = () => { const v = $('nw_seed').value.trim(); lsSet('villagesim.maptype', nwType); lsSet('villagesim.mapsize', nwSize); lsSet('villagesim.hardship', String(nwHard)); lsSet('villagesim.phil', nwPhil); lsSet('villagesim.open', String(nwOpen_)); nwClose(); newWorld(v === '' || isNaN(+v) ? (Math.random() * 1e9) | 0 : +v, { type: nwType, size: nwSize, hardship: nwHard, phil: nwPhil, open: nwOpen_ }) };
$('nw_seed').addEventListener('keydown', e => { if (e.key === 'Enter') $('nw_go').click(); e.stopPropagation() });

/* ---------- save & load ----------
   Autosave and "Save now" use this browser's storage; Export/Import use a file, which is the
   safe way to keep or move a village. Jobs in progress are not saved: after loading, villagers
   simply decide again. */
const SAVE_KEY = 'villagesim.save', META_KEY = 'villagesim.meta', BACKUP_KEY = 'villagesim.backup', BACKUP_META = 'villagesim.backupmeta';
let autosaveOn = true, DL = null;
(async () => { try { DL = (typeof claude !== 'undefined' && claude.use) ? await claude.use('downloads') : null } catch (e) { DL = null } })();
const seasonName = m => SEASONS[m.season];
const metaText = m => `Year ${m.year}, ${seasonName(m)}, day ${m.day} · ${m.pop} people · seed ${m.seed}`;
function saveInfo(t) { $('saveInfo').textContent = t }
function readMeta(key = META_KEY) { try { const m = JSON.parse(localStorage.getItem(key) || 'null'); return m && m.pop !== undefined ? m : null } catch (e) { return null } }
function saveToStorage(manual) {
  if (!world || world.tick === 0) return false;
  try {
    const json = JSON.stringify(serializeWorld(world)), meta = { ...saveMeta(world), speed };
    localStorage.setItem(SAVE_KEY, json); localStorage.setItem(META_KEY, JSON.stringify(meta));
    saveInfo(`${manual ? 'Saved' : 'Autosaved'} at ${new Date().toLocaleTimeString()}: ${metaText(meta)} (${Math.round(json.length / 1024)} KB).`); $('loadSave').disabled = false; return true;
  } catch (e) { saveInfo('This browser would not store the save (' + ((e && e.name) || 'error') + '). Use "Export file" to keep your village.'); return false }
}
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) { saveInfo('No browser save found.'); return false }
    adoptWorld(deserializeWorld(JSON.parse(raw))); saveInfo('Loaded the browser save: ' + metaText(saveMeta(world)) + '.'); return true;
  } catch (e) { saveInfo('Could not load that save: ' + ((e && e.message) || e)); return false }
}
async function saveTextFile(name, text, okMsg) {
  try {
    if (DL) { const r = await DL.save({ filename: name, data: text }); saveInfo(r.status === 'saved' ? (okMsg || 'Saved ') + name + '.' : 'Sent.') }
    else { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); saveInfo((okMsg || 'Saved ') + name + '.') }
    return true;
  } catch (e) { saveInfo(e && e.code === 'declined' ? 'Cancelled.' : 'Could not save the file (' + ((e && (e.code || e.message)) || 'error') + ').'); return false }
}
async function exportFile() {
  if (!world) return; const json = JSON.stringify(serializeWorld(world)), name = `village-y${world.year}-${SEASONS[world.season].toLowerCase()}-d${world.seasonDay}-seed${world.seed}.json`;
  try {
    if (DL) { const r = await DL.save({ filename: name, data: json }); saveInfo(r.status === 'saved' ? 'Exported ' + name + '.' : 'Export sent.') }
    else { const url = URL.createObjectURL(new Blob([json], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); saveInfo('Exported ' + name + '.') }
  } catch (e) { saveInfo(e && e.code === 'declined' ? 'Export cancelled.' : 'Export did not complete (' + ((e && (e.code || e.message)) || 'error') + '). Try again.') }
}
function importFileObj(file) {
  const rd = new FileReader();
  rd.onload = () => { try { adoptWorld(deserializeWorld(JSON.parse(rd.result))); autosaveOn = true; hideResume(); saveInfo('Imported ' + file.name + ': ' + metaText(saveMeta(world)) + '.') } catch (e) { saveInfo('That file could not be loaded: ' + ((e && e.message) || e)) } };
  rd.onerror = () => saveInfo('Could not read that file.'); rd.readAsText(file);
}
function hideResume() { $('resume').style.display = 'none' }
$('saveNow').onclick = () => saveToStorage(true);
$('loadSave').onclick = () => { if (loadFromStorage()) { autosaveOn = true; hideResume() } };
$('exportBtn').onclick = exportFile; $('importBtn').onclick = () => $('importFile').click();
$('importFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importFileObj(f); e.target.value = '' });
$('resumeBtn').onclick = () => { if (loadFromStorage()) { autosaveOn = true; hideResume(); setSpeed(10) } };
$('resumeNo').onclick = () => {          // keep the old save as a backup before the new village starts overwriting it
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { localStorage.setItem(BACKUP_KEY, raw); localStorage.setItem(BACKUP_META, localStorage.getItem(META_KEY) || '') } } catch (e) { }
  autosaveOn = true; hideResume(); setSpeed(10);
};
setInterval(() => { if (!tt && autosaveOn && $('autosave').checked && speed >= 0) saveToStorage(false) }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && autosaveOn && $('autosave').checked) saveToStorage(false) });
addEventListener('pagehide', () => { if (autosaveOn && $('autosave').checked) saveToStorage(false) });

/* ---------- panels ---------- */
function bar(label, val, col) { return `<div class="hint">${label} ${Math.round(val)}</div><div class="bar"><i style="background:var(--acc);width:${clamp(val, 0, 100)}%;background:${col}"></i></div>` }
function resRow(name, val, cap, col) { return `<div class="res"><span class="hint">${name}</span><div class="bar"><i style="background:var(--acc);width:${clamp(val / cap * 100, 0, 100)}%;background:${col}"></i></div><b>${Math.floor(val)} / ${cap}</b></div>` }
function opBar(label, v) { const a = Math.abs(v) * 50; return `<div class="opr"><span>${label}</span><div class="opb"><i style="left:${v < 0 ? 50 - a : 50}%;width:${a}%;background:${v < 0 ? '#6a8fd0' : '#e0a458'}"></i></div></div>` }
function skillWord(s) { return s > 0.7 ? 'expert' : s > 0.45 ? 'skilled' : s > 0.2 ? 'capable' : 'novice' }
function moodWord(m) { return m > 80 ? 'joyful' : m > 62 ? 'content' : m > 42 ? 'uneasy' : m > 25 ? 'unhappy' : 'miserable' }
function nameOf(id) { const v = world.vills.find(x => x.id === id); return v ? v.name : null }
function updateUI() {
  renderConcerns();
  const w = world, hrs = (6 + w.tod * 24) % 24, hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60), s = w.season;
  $('hudDate').textContent = `Year ${w.year} · ${SEASONS[s]} · Day ${w.seasonDay}`;
  $('hudTime').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${w.isNight() ? ' ☾' : ''} · ${AGES[techEra(w)]}${w.cold ? ' · freezing' : w.festival ? ' · ' + w.holiday : w.harsh && s === 3 ? ' · harsh winter' : w.drought && s === 1 ? ' · drought' : ''}`;
  const cap = w.cap(), an = {}; for (const a of w.animals) if (a.alive) an[a.kind] = (an[a.kind] || 0) + 1;
  const stg = {}; for (const v of w.vills) stg[v.stage()] = (stg[v.stage()] || 0) + 1;
  const roles = {}; for (const v of w.vills) if (v.age >= CFG.CHILD_DAYS && !v.isElder()) roles[v.role || 'forager'] = (roles[v.role || 'forager'] || 0) + 1;
  const ad = w.vills.filter(v => v.isAdult()), mood = ad.length ? ad.reduce((a, v) => a + v.mood, 0) / ad.length : 0;
  $('statCard').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline"><div class="big">Population ${w.vills.length}</div><div class="hint">mood ${moodWord(mood)}</div></div>
    ${flowLine(w)}
    <div class="hint" style="margin-bottom:4px">${stg.infant || 0} infants · ${stg.child || 0} children · ${stg.youth || 0} youths · ${stg.adult || 0} adults · ${stg.elder || 0} elders</div>
    ${resRow('Food', w.stock.food, cap, '#e0a458')}${resRow('Wood', w.stock.wood, cap, '#a8743c')}${resRow('Stone', w.stock.stone, cap, '#9aa3ab')}
    <div class="grid" style="margin-top:6px"><div><span>Homes</span> ${w.houses().length} (${w.beds()} beds)</div><div><span>Fields</span> ${w.of('farm').length}</div><div><span>Storehouses</span> ${w.of('store').length}</div><div><span>Roads</span> ${w.road.reduce((a, b) => a + b, 0)}</div>
    <div><span>Deer</span> ${an.deer || 0}</div><div><span>Wolves</span> ${an.wolf || 0}</div>${w.of('dock').length ? `<div><span>Docks / boats</span> ${w.of('dock').length} / ${w.boats.length}</div>` : ''}${w.of('logcamp').length + w.of('minecamp').length + w.of('lodge').length ? `<div><span>Camps</span> ${w.of('logcamp').length} log · ${w.of('minecamp').length} mine · ${w.of('lodge').length} lodge</div>` : ''}</div>
    <div class="chips">${Object.entries(roles).map(([r, n]) => `<span class="chip"><i style="background:${ROLE_COL[r] || '#888'}"></i>${r} ${n}</span>`).join('')}</div>`;
  if (curTab === 'progress') { renderTech(); renderEcon(); renderLiv(); renderHarbour(); renderDisc(); renderProjects() } else if (curTab === 'world') { renderChron(); renderOutposts(); renderNeigh() } else if (curTab === 'society') { renderRegime(); renderCouncil(); renderLives(); renderGroups() }       // only the visible tab is redrawn
  if (curTab === 'stats') renderStats(); if (curTab === 'events') renderTalk(); if (curTab === 'events') $('log').innerHTML = w.log.slice(0, 60).map(l => `<div><b>D${l.day}</b>${escapeHtml(l.text)}</div>`).join('');
  updateInspector(); drawChart();
}
function techRowHtml(w, id, avail) {
  const t = w.tech, T = TECHS[id], U = unlocksOf(id), open = openLevel(w), gaps = techGaps(w, id), raw = techAvailableRaw(w).includes(id);
  const st = t.known[id] ? 'k' : avail.includes(id) ? 'a' : raw ? 'b' : 'l';
  let tail = AGES[T.age].replace(' Age', '');
  if (st === 'a') tail += ' · ' + techCost(w, id); else if (st === 'b') tail += ' · waiting for ' + gaps.map(g => GATES[g].name).join(', ');
  else if (st === 'l') { const m = T.req.filter(r => !t.known[r]).map(r => TECHS[r].name); tail += m.length ? ' · needs ' + m.join(', ') : ' · opens with the next age' }
  const gv = `<div class="hint btg">${st === 'k' || st === 'a' ? 'Gives: ' : 'Would give: '}${U.gives.map(escapeHtml).join(' · ')}${U.needs.length ? '<br>Needs: ' + U.needs.map(g => (GATES[g].ok(w) ? '✓ ' : '✗ ') + GATES[g].name).join(', ') : ''}</div>`;
  const grant = open && !t.known[id] ? ` <button class="grant" data-grant="${id}" title="Sandbox: learn this now">Grant</button>` : '';
  return `<div class="bt ${st}" title="${escapeHtml(T.desc)}"><span>${T.name}${grant}</span><span class="hint">${tail}</span></div>${gv}`;
}
let techOpen = null;                    // the branch whose list is open in the Ages panel
function renderTech() {
  const w = world, t = w.tech, el = $('techCard'), era = techEra(w), known = Object.keys(t.known), avail = techAvailable(w), total = Object.keys(TECHS).length;
  const focus = t.focus ? TECHS[t.focus] : null, pct = focus ? Math.min(100, t.points / techCost(w, t.focus) * 100) : 0;
  const nextAge = era < AGES.length - 1 ? era + 1 : null, have = AGE_IDS[era].filter(id => t.known[id]).length, need = AGE_NEED[era];
  const ageBar = AGES.map((a, i) => `<i title="${a}" style="background:${i < era ? '#8fd18b' : i === era ? '#e0b070' : '#2b333b'}"></i>`).join('');
  let h = `<div class="era"><b>${AGES[era]}</b><span class="hint">${known.length} of ${total} discoveries</span></div><div class="agebar">${ageBar}</div>
    <div class="hint" style="margin:4px 0 6px">${nextAge !== null ? `${have} of the ${need} needed in the ${AGES[era]} to reach the ${AGES[nextAge]}.` : 'The last age. Everything else is still to be discovered.'}</div>`;
  h += focus ? `<div class="hint">Studying <b style="color:var(--ink)">${focus.name}</b> <span style="color:${BRANCHES[focus.branch].col}">· ${BRANCHES[focus.branch].name.toLowerCase()}</span> · ${Math.round(t.points)} / ${techCost(w, t.focus)}</div><div class="tprog"><i style="width:${pct}%"></i></div><div class="hint">${focus.desc}</div>` : avail.length ? `<div class="hint">The council will choose what to study next.</div>` : `<div class="hint">Nothing to study until the next age begins.</div>`;
  h += `<div class="hint" style="margin:8px 0 3px">Branches of knowledge</div>` + Object.keys(BRANCHES).map(b => {
    const ids = TECH_BY_BRANCH[b], k = ids.filter(id => t.known[id]).length, nowOpen = techOpen === b, open = ids.filter(id => avail.includes(id));
    return `<div class="brrow" data-br="${b}"><span class="brn" style="color:${BRANCHES[b].col}">${BRANCHES[b].name}</span><span class="brbar"><i style="width:${Math.round(100 * k / ids.length)}%;background:${BRANCHES[b].col}"></i></span><span class="hint brk">${k}/${ids.length}${open.length ? ' · ' + open.length + ' open' : ''}</span></div>${nowOpen ? `<div class="brlist">${ids.slice().sort((x, y) => TECHS[x].age - TECHS[y].age).map(id => techRowHtml(w, id, avail)).join('')}</div>` : ''}`;
  }).join('');
  h += t.log.slice(0, 3).map(l => `<div class="techrow"><b>${TECHS[l.id].name}</b> <span class="hint">day ${l.day}${l.by ? ' · led by ' + escapeHtml(l.by) : ''}</span></div>`).join('');
  if (t.lost) h += `<div class="hint" style="margin-top:4px">Knowledge lost to hard times: ${t.lost}.</div>`;
  el.innerHTML = h;
}
$('techCard').addEventListener('click', e => { const gb = e.target.closest('[data-grant]'); if (gb) { grantTech(world, gb.dataset.grant); renderTech(); return } const r = e.target.closest('[data-br]'); if (!r) return; techOpen = techOpen === r.dataset.br ? null : r.dataset.br; renderTech() });
/* the harbour, the fleet and the trade the village runs for itself */
function renderDisc() {
  const w = world, el = $('discCard'), box = $('discBox'), D = w.disc; const show = !!(D && (D.sites.some(s => s.known) || D.exped.length || D.log.length)); box.style.display = show ? '' : 'none'; if (!show) return;
  const mats = MAT_LIST.map(m => { const src = matSource(w, m); return `<span class="chip" title="${src === 'found' ? 'found by an expedition' : src === 'trade' ? 'bought from a neighbour' : 'not yet found: look in the far places once we know the craft, or buy it from a friendly neighbour'}" style="margin-right:6px;color:${src ? '#8fd18b' : '#6c7782'}">${src ? '✓' : '·'} ${MATS[m].name}</span>` }).join('');
  let h = `<div class="hint" style="margin-bottom:3px">Materials the later technologies need</div><div>${mats}</div>`;
  const run = D.exped.filter(e => e.state === 'running' || e.state === 'pending');
  if (run.length) h += `<div class="hint" style="margin:6px 0 2px">On the road</div>` + run.map(e => { const s = D.sites.find(x => x.id === e.site), K = s && SITE_KINDS[s.kind], l = e.leader ? w.vills.find(v => v.id === e.leader) : null; return `<div class="techrow"><b>${K ? K.name : 'An expedition'}</b> <span class="hint">${e.state === 'pending' ? 'waiting for someone to lead it' : (l ? escapeHtml(l.name) + ' leads, ' : '') + (e.mode === 'sea' ? 'by boat' : 'on foot')}</span></div>` }).join('');
  const sites = D.sites.filter(s => s.known && !s.done); if (sites.length) h += `<div class="hint" style="margin:6px 0 2px">Heard of, not yet visited (${sites.length})</div>` + sites.slice(0, 5).map(s => `<div class="techrow"><b>${SITE_KINDS[s.kind].name}</b> <span class="hint">${Math.round(Math.hypot(s.x - w.cx, s.y - w.cy))} tiles ${compass(w, s.x, s.y)}${s.mat && w.has(SURVEY[s.mat]) ? ', may hold ' + MATS[s.mat].name : ''}</span></div>`).join('');
  if (D.log.length) h += `<div class="hint" style="margin:6px 0 2px">Returned</div>` + D.log.slice(0, 3).map(l => `<div class="techrow"><span class="hint">day ${l.day}</span> ${escapeHtml(l.text)}</div>`).join('');
  h += `<div class="hint" style="margin-top:6px">${D.done} expeditions returned · ${D.lost} lost · ${D.lore} old writings found${D.deals ? ' · ' + D.deals + ' lessons bought' : ''}</div>`; el.innerHTML = h;
}
function renderHarbour() {
  const w = world, el = $('harbourCard'), box = $('harbourBox'), t = w.trade2; const show = !!(t && w.neigh && w.has('trade') && (w.of('dock').length || w.neigh.some(n => n.reach === 'land' && n.found))); box.style.display = show ? '' : 'none'; if (!show) return;
  const docks = w.of('dock'), tier = docks.length ? Math.max(...docks.map(dockTier)) : 0, app = tradeAppetite(w), L = t.ledger, coin = w.has('coinage');
  const kinds = {}; for (const b of w.boats) { const k = b.kind || 'fishing'; kinds[k] = (kinds[k] || 0) + 1 }
  const fleet = Object.entries(kinds).map(([k, n]) => `${n} ${SHIPS[k].name.toLowerCase()}${n > 1 ? 's' : ''}`).join(' · ') || 'no ships';
  let h = docks.length ? `<div class="polh"><span><b>${TIERS[tier].name}</b> <span class="hint">${docks.length} landing${docks.length > 1 ? 's' : ''}</span></span><span class="hint">${fleet}</span></div>` : '';
  const up = docks.find(d => d.upg), yard = t.yard[0];
  if (up) h += `<div class="hint">Building a ${TIERS[up.upg.tier].name.toLowerCase()}, ready in ${Math.max(0, up.upg.at - w.day)} days.</div>`;
  if (yard) h += `<div class="hint">A ${SHIPS[yard.kind].name.toLowerCase()} is on the slip, ready in ${Math.max(0, yard.at - w.day)} days.</div>`;
  const a = t.active, an = a && w.neigh.find(n => n.id === a.plan.nid);
  if (a && an) { const sk = a.skipper != null ? w.vills.find(v => v.id === a.skipper) : null; h += `<div style="margin:6px 0 2px">${a.state === 'pending' ? 'A trading trip to' : `${sk ? escapeHtml(sk.name) + ' is on the way to' : 'On the way to'}`} <b>${escapeHtml(an.name)}</b> by ${a.plan.label}${a.state === 'pending' ? ', waiting for someone to take the helm' : ''}.</div>` }
  else h += `<div class="hint" style="margin:6px 0 2px">${app > 1.4 ? 'The village is eager to trade abroad.' : app < 0.6 ? 'The village is wary of foreign trade.' : 'The village trades abroad when it pays.'}${t.lastPlan ? ` Best prospect: ${escapeHtml(t.lastPlan.n)}.` : ''}</div>`;
  const rs = Object.entries(t.routes).filter(([, r]) => r.standing).map(([id, r]) => { const n = w.neigh.find(x => x.id === +id); return n ? `<div class="hint">Standing route to <b style="color:var(--ink)">${escapeHtml(n.name)}</b>: ${r.trips} trip${r.trips === 1 ? '' : 's'}${coin ? ', ' + (r.profit >= 0 ? '+' : '') + r.profit + ' coins' : ''}</div>` : '' }).join(''); h += rs;
  if (L.trips || L.lost) h += `<div class="stats" style="margin-top:6px"><div><span class="hint">Trips made</span><b>${L.trips}</b></div><div><span class="hint">${coin ? 'Profit' : 'Goods gained'}</span><b>${coin ? (L.profit >= 0 ? '+' : '') + L.profit + ' coins' : L.imports + ' loads'}</b></div>${coin ? `<div><span class="hint">Sold abroad</span><b>${L.exports}</b></div><div><span class="hint">Bought abroad</span><b>${L.imports}</b></div>` : ''}${L.lost ? `<div><span class="hint">Lost at sea or road</span><b>${L.lost}</b></div>` : ''}</div>`;
  if (t.trips.length) h += `<div class="story" style="margin-top:6px"><div class="hint">Recent trips</div>${t.trips.slice(0, 3).map(x => `<div><b>D${x.day}</b>${escapeHtml(x.text)}</div>`).join('')}</div>`;
  el.innerHTML = h || '<div class="hint">No trade abroad yet.</div>';
}
/* settlements founded by the village */
const LOY_WORDS = l => l >= 0.75 ? 'devoted' : l >= 0.55 ? 'loyal' : l >= 0.4 ? 'restless' : l >= 0.25 ? 'resentful' : 'on the brink of leaving';
const loyCol = l => l >= 0.55 ? '#7ad07a' : l >= 0.4 ? '#d9c26a' : '#e07a5a';
function renderOutposts() {
  const w = world, el = $('outCard'), box = $('outBox'), S = w.out; const live = S ? S.list.filter(o => o.state !== 'gone') : [], gone = S ? S.list.filter(o => o.state === 'gone') : [];
  const show = !!(S && (live.length || gone.length || S.lastPlan) && w.vills.length >= 1); box.style.display = show ? '' : 'none'; if (!show) return;
  const app = expandAppetite(w); let h = '';
  h += live.map(o => {
    const role = OUT_ROLES[o.role], st = o.state === 'travelling' ? `on the road, arriving in ${Math.max(0, o.arrive - w.day)} day${o.arrive - w.day === 1 ? '' : 's'}` : `${OUT_STAGES[o.stage]} · ${o.pop} people`;
    return `<div class="grp"><a class="lnk" data-oid="${o.id}"><b>${escapeHtml(o.name)}</b></a> <span class="hint">${role.label} · ${st}</span>
      ${o.state === 'active' ? `<div class="polh" style="margin-top:3px"><span class="hint">${LOY_WORDS(o.loyalty)} (${Math.round(o.loyalty * 100)}%)</span><span class="hint">${o.mode === 'sea' ? 'by sea' : 'by land'} · ${Math.round(outFar(w, o.x, o.y))} tiles</span></div><div class="bar"><i style="background:${loyCol(o.loyalty)};width:${Math.round(o.loyalty * 100)}%"></i></div>` : ''}</div>`;
  }).join('');
  if (!live.length) h += `<div class="hint">${S.lastPlan && S.lastPlan.none ? 'The council has looked for good land to settle and found none yet.' : app < 0.6 ? 'The village is wary of leaving home.' : 'No outposts yet. When the village feels cramped or short of timber, stone or food, the council may send settlers.'}</div>`;
  const back = S.back.food + S.back.wood + S.back.stone;
  if (S.founded) h += `<div class="stats" style="margin-top:6px"><div><span class="hint">Founded</span><b>${S.founded}</b></div><div><span class="hint">Sent out</span><b>${S.sent.food + S.sent.wood}</b></div><div><span class="hint">Came home</span><b>${back}</b></div>${S.broke + S.freed ? `<div><span class="hint">Broke away</span><b>${S.broke + S.freed}</b></div>` : ''}${S.failed ? `<div><span class="hint">Failed</span><b>${S.failed}</b></div>` : ''}</div>`;
  if (S.log.length) h += `<div class="story" style="margin-top:6px"><div class="hint">Recent</div>${S.log.slice(0, 4).map(x => `<div>${escapeHtml(x)}</div>`).join('')}</div>`;
  el.innerHTML = h;
}
function outpostPanel(w, o) {
  const role = OUT_ROLES[o.role], travelling = o.state === 'travelling', share = Math.round(outShare(w, o) * 100);
  const rows = [['Kind', role.label], ['People', travelling ? o.pop + ' on the road' : o.pop + ' (room for ' + o.cap + ')'], ['Stage', travelling ? 'not yet built' : OUT_STAGES[o.stage]], ['Distance', Math.round(outFar(w, o.x, o.y)) + ' tiles ' + (o.mode === 'sea' ? 'by sea' : 'on foot') + ', about ' + o.days + ' days'], ['Led by', escapeHtml(o.leader)], ['Founded', dateText(o.day)]];
  if (!travelling) rows.push(['Share sent home', share + '%'], ['Sent so far', (o.sentHome || 0) + ' goods'], ['Making', (OUT_ROLES[o.role].key === 'food' ? 'food' : OUT_ROLES[o.role].key) + ' (' + (Math.round(o.rich * 100)) + '% rich site)']);
  return `<h3>${role.label.replace(/^./, c => c.toUpperCase())}</h3><div class="big">${escapeHtml(o.name)}</div><div class="hint">${travelling ? 'Settlers are on their way to found it.' : `Settlers from the village who ${role.verb}. They feed themselves and send a share home.`}</div>
    ${travelling ? '' : bar('Loyalty to the village: ' + LOY_WORDS(o.loyalty), o.loyalty * 100, loyCol(o.loyalty)) + bar('Stores of food', clamp(o.food / (30 + o.pop * 7) * 100, 0, 100), '#e0a458')}
    ${sec('Details', kvs(rows))}${o.founders && o.founders.length ? sec('Founders', `<div class="hint">${o.founders.map(escapeHtml).join(', ')}${o.fl > o.founders.length ? ' and others' : ''}</div>`) : ''}`;
}
function renderNeigh() {
  const w = world, el = $('neighCard'), box = el.parentElement; box.style.display = w.neigh ? '' : 'none'; if (!w.neigh) return;
  const anyLand = w.neigh.some(n => n.reach === 'land');
  if (!w.has('boats') && !anyLand) { el.innerHTML = '<div class="hint">Beyond the horizon the sea may hide other lands. With boats, the village could one day find out.</div>'; return }
  if (!w.has('boats') && !w.neigh.some(n => n.found)) { el.innerHTML = '<div class="hint">Other peoples live beyond the hills. Hunters and curious villagers will go looking for them.</div>'; return }
  const found = w.neigh.filter(n => n.found), left = w.neigh.length - found.length, vy = w.voyage && w.vills.find(v => v.id === w.voyage.id);
  let html = vy ? (w.voyage.land ? `<div class="hint" style="margin-bottom:6px">🥾 ${escapeHtml(vy.name)} is exploring on foot, looking for other peoples.</div>` : `<div class="hint" style="margin-bottom:6px">⛵ ${escapeHtml(vy.name)} is at sea, bound for unknown shores.</div>`) : '';
  if (w.visit) { const vn = w.neigh.find(x => x.id === w.visit.n); if (vn) html += `<div class="hint" style="margin-bottom:6px">${w.visit.type === 'raid' ? '⚔️ Raiders from' : vn.reach === 'land' ? '🛖 Visitors from' : '⛵ A ship from'} ${escapeHtml(vn.name)} ${vn.reach === 'land' ? 'are in the village.' : 'is at the dock.'}</div>` }
  if (w.fortifyUntil > w.day) html += `<div class="hint" style="margin-bottom:6px">🛡 The village is on guard for ${w.fortifyUntil - w.day} more days.</div>`;
  html += found.map(n => {
    const r = Math.round(n.rel || 0), col = r >= 40 ? '#7ad07a' : r >= 12 ? '#b8d070' : r > -12 ? '#d9c26a' : '#e07a5a', pct = Math.round((r + 100) / 2);
    return `<div class="grp"><b>${escapeHtml(n.name)}</b> <span class="hint">${NEIGH_KINDS[n.kind].label} · about ${n.pop} people</span>
      <div class="polh" style="margin-top:3px"><span class="hint">${relLabel(r)} (${r > 0 ? '+' : ''}${r})</span><span class="hint">${PACT_NAMES[n.pact || 0]}</span></div><div class="bar"><i style="background:${col};width:${pct}%"></i></div>
      <div class="hint">${compass(w, n.x, n.y)} · ${n.reach === 'land' ? Math.max(1, Math.round(n.dist / 108 * 10) / 10) + ' day' + (n.dist > 140 ? 's' : '') + ' on foot' : Math.max(1, Math.round(n.dist / 84 * 10) / 10) + ' day' + (n.dist > 100 ? 's' : '') + ' by boat'} · offers ${escapeHtml(NEIGH_PROFILE[n.kind].goods)}</div>
      ${n.colony ? `<div class="hint">Founded on day ${n.colony.day} by ${escapeHtml(n.colony.circle)}, who left ${n.colony.mode === 'peace' ? 'in peace' : 'in bitterness'}.</div>` : ''}${n.tribute > w.day ? `<div class="hint">Paid for peace until day ${n.tribute}</div>` : ''}${n.hist && n.hist[0] ? `<div class="hint">${escapeHtml(n.hist[0])}</div>` : ''}</div>`;
  }).join('');
  html += left ? `<div class="hint" style="margin-top:6px">${left} more land${left > 1 ? 's' : ''} may lie in the mist.${w.neigh.some(n => !n.found && n.reach === 'navigation') && !w.has('navigation') ? ' The farthest need better navigation.' : ''}</div>` : '';
  el.innerHTML = html;
}
function renderChron() {
  const w = world, C = w.chron, el = $('chronCard'); if (!C) return;
  const ls = Object.keys(LESSONS).filter(k => C.lessons[k] > 0.04).sort((a, b) => C.lessons[b] - C.lessons[a]);
  let html = ls.length ? ls.map(k => `<div class="pol"><div class="polh"><span>${LESSONS[k].name}</span><span class="hint">${C.lessons[k] >= 0.8 ? 'learned hard' : C.lessons[k] >= 0.55 ? 'learned' : C.lessons[k] >= 0.3 ? 'learning' : 'a first scare'}</span></div><div class="bar"><i style="background:var(--acc);width:${Math.round(C.lessons[k] * 100)}%"></i></div></div>`).join('') + '<div class="hint" style="margin-bottom:6px">Hard times teach the village what to prepare for; the lessons fade slowly, and a library helps them last.</div>' : '<div class="hint" style="margin-bottom:6px">Nothing hard has taught the village anything yet.</div>';
  html += '<h3 style="margin-top:8px">Chronicle</h3>' + (C.events.length ? C.events.slice(0, 9).map(e => `<div class="hint" style="margin:3px 0"><b>Y${e.year} D${e.day}</b> ${escapeHtml(e.text.length > 150 ? e.text.slice(0, 147) + '…' : e.text)}</div>`).join('') : '<div class="hint">The first pages are still blank.</div>');
  el.innerHTML = html;
}
function renderProjects() {
  const w = world, P = w.proj, el = $('projCard'); if (!P) return;
  const first = Object.keys(PROJECTS).some(id => w.has(PROJECTS[id].tech));
  if (!first) { el.innerHTML = '<div class="hint">Once the village masters carpentry, masonry or watchtowers, the council may commit to a great project: a hall, library, bastion or monument.</div>'; return }
  let html = '';
  if (P.active) {
    const p = PROJECTS[P.active.type], bp = w.bps.find(b => b.type === P.active.type), have = bp ? bp.have.wood + bp.have.stone : 0, need = bp ? bp.cost.wood + bp.cost.stone : 1, pr = bp ? bp.prog / bp.time : 0;
    html += `<div class="big">${p.name}</div><div class="hint">${escapeHtml(p.pitch)}. Raised since day ${P.active.since}${P.active.names.length ? ' with ' + P.active.names.map(escapeHtml).join(' and ') : ''}.</div>
      <div class="hint" style="margin-top:6px">Materials ${Math.round(100 * have / need)}% · construction ${Math.round(100 * pr)}%</div><div class="bar"><i style="background:var(--acc);width:${Math.round(100 * (0.5 * have / need + 0.5 * pr))}%"></i></div>`;
  } else html += `<div class="hint">${P.cooldown > 0 ? 'The village is resting before its next great undertaking.' : 'No project underway. The council weighs one when stores allow.'}</div>`;
  const done = Object.keys(P.done);
  html += `<div style="margin-top:8px">${done.length ? done.map(id => `<div class="mini"><b>${PROJECTS[id].name}</b> <span class="hint">Year ${P.done[id].year}${P.done[id].names && P.done[id].names.length ? ', by ' + P.done[id].names.map(escapeHtml).join(' and ') : ''}</span><div class="hint">${PROJECTS[id].gives}</div></div>`).join('') : '<div class="hint">Nothing finished yet.</div>'}</div>`;
  const next = projAvailable(w).filter(id => !(P.active && P.active.type === id));
  if (next.length) html += `<div class="hint" style="margin-top:6px">Within reach: ${next.map(id => PROJECTS[id].name).join(', ')}</div>`;
  el.innerHTML = html;
}
function renderEcon() {
  const w = world, E = w.econ, card = $('econCard'), box = card.parentElement; box.style.display = w.has('trade') ? '' : 'none'; if (!w.has('trade')) return;
  const coin = w.has('coinage'), arrow = d => d > 0.15 ? '▲' : d < -0.15 ? '▼' : '•', ad = w.vills.filter(v => v.isAdult()), rich = ad.slice().sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 3), cs = ad.map(v => v.coins || 0).sort((a, b) => a - b);
  const c = E.caravan;
  card.innerHTML = `${coin ? `<div class="era"><b>${Math.round(E.treasury)} coins</b><span class="hint">treasury · tax ${Math.round(taxRate(w) * 100)}%</span></div>` : '<div class="era"><b>Bartering</b><span class="hint">no coins yet</span></div>'}
    <table class="prices">${['wood', 'stone', 'food'].map(k => `<tr><td>${k}</td><td>${coin ? E.prices[k].toFixed(1) + ' coins' : w.stock[k] + ' in store'}</td><td class="tr ${E.trend[k] > 0.15 ? 'up' : E.trend[k] < -0.15 ? 'down' : ''}">${arrow(E.trend[k])}</td></tr>`).join('')}</table>
    <div class="hint">${w.of('market').length ? (c ? `${escapeHtml(c.name)} ${c.sea ? '(by ship) ' : ''}stay until day ${c.leaves}.` : `Next merchants expected around day ${E.nextCaravan}.`) : 'Build a market and merchants will come.'}</div>
    ${E.trades.slice(0, 3).map(t => `<div class="techrow">${escapeHtml(t.text)}<span class="hint">day ${t.day}</span></div>`).join('')}
    ${coin ? `<div class="hint" style="margin-top:6px">Wealth: median ${cs.length ? cs[cs.length >> 1] : 0} coins · richest ${rich.map(v => escapeHtml(v.name) + ' ' + (v.coins || 0)).join(', ') || '–'}</div>` : ''}`;
}
function renderLiv() {
  const w = world, el = $('livCard'); if (!el) return; const S = livelihoodSummary(w), L = LIV(w);
  if (w.vills.length < 6 || !S.adults) { el.innerHTML = '<div class="hint">Too few people for trades yet.</div>'; return }
  const work = S.roles + S.trades, pct = Math.round(100 * work / S.adults), goods = Object.entries(S.goods).filter(([, x]) => x >= 1).map(([k, x]) => k + ' ' + Math.round(x)).join(' · ');
  el.innerHTML = `<div class="era"><b>${pct}% of adults have work</b><span class="hint">${S.roles} in the heavy roles · ${S.trades} in trades · ${S.idle} without</span></div>
    ${S.ot ? `<div class="cnorders">${S.ot === 1 ? 'Volunteers are working longer hours.' : 'Longer hours have been ordered.'}</div>` : ''}
    <table class="prices">${S.rows.slice(0, 9).map(r => `<tr><td>${escapeHtml(r.name)}${L.inv.some(i => i.id === r.id && !i.ok) ? ' <span class="hint">(new idea)</span>' : ''}</td><td>${r.w} ${r.w === 1 ? 'worker' : 'workers'}</td><td class="tr ${r.J < r.D * 0.6 ? 'up' : r.J > r.D * 1.3 ? 'down' : ''}">${r.J < r.D * 0.6 ? 'in demand' : r.J > r.D * 1.3 ? 'crowded' : 'steady'}</td></tr>`).join('')}</table>
    ${goods ? `<div class="hint" style="margin-top:4px">Goods in the village: ${goods}</div>` : ''}
    <div class="hint">Dreams achieved: ${S.stats.dreams} · jobs invented: ${S.stats.invented}${S.stats.failed ? ' (' + S.stats.failed + ' failed)' : ''}</div>`;
}
function renderRegime() {
  const w = world, R = w.regime, el = $('regimeCard'); if (!R) return;
  const col = { auth: '#e0705a', comm: '#c4a24a', pious: '#b89cf0', indus: '#9aa3ab', open: '#6fb0e0', cohes: '#7ad07a' }, chief = councilMembers(w).find(m => m.title === 'Chief'), heir = R.heir ? w.vills.find(v => v.id === R.heir) : null;
  let h = `<div class="big" style="margin-bottom:2px">${escapeHtml(R.label)}</div><div class="hint" style="margin-bottom:8px">${escapeHtml(REGIME_TXT[R.label] || '')}${R.since ? ` <i>(since day ${R.since})</i>` : ''}</div>`;
  h += AXES.map(k => `<div class="polh"><span>${AXIS_TXT[k]}</span><span class="hint">${Math.round(R.ax[k] * 100)}</span></div><div class="bar"><i style="background:${col[k]};width:${Math.round(R.ax[k] * 100)}%"></i></div>`).join('');
  if (chief) h += `<div class="hint" style="margin-top:6px"><b style="color:var(--ink)">${escapeHtml(chief.v.name)}</b> leads. ${escapeHtml(R.leaderText.replace(chief.v.name + ' is', 'Is'))}</div>`;
  h += `<div class="hint" style="margin-top:4px">${R.ax.auth > 0.65 ? 'The Chief names the council.' : 'Councils are elected.'}${heir ? ` Heir: ${escapeHtml(heir.name)}.` : ''}${R.dynasty ? ` ${R.dynasty} inherited leadership${R.dynasty > 1 ? 's' : ''}.` : ''}${R.coups ? ` ${R.coups} coup${R.coups > 1 ? 's' : ''}.` : ''}${R.revolts ? ` ${R.revolts} uprising${R.revolts > 1 ? 's' : ''}.` : ''}${R.purges ? ` ${R.purges} purge${R.purges > 1 ? 's' : ''}.` : ''}${R.prophet ? ` ${escapeHtml(R.prophet.name)} preaches.` : ''}</div>`;
  if (R.history.length) h += `<div class="hint" style="margin-top:6px">${R.history.slice(0, 3).map(x => `Y${x.year}: ${escapeHtml(x.from)} to ${escapeHtml(x.to)}`).join('<br>')}</div>`;
  const S = w.strife;
  if (S) {
    const ln = [];
    if (S.shadow) ln.push(`<b style="color:#e0705a">Rival council:</b> ${escapeHtml(S.shadow.name)} under ${escapeHtml(S.shadow.leaderName)}, ${w.day - S.shadow.since} days`);
    if (S.civil) ln.push(`<b style="color:#e0705a">Fighting</b> between the council and ${escapeHtml(S.civil.name)}`);
    if (S.strike) ln.push(`<b style="color:#d9a24a">Strike:</b> ${escapeHtml(S.strike.name)} over ${escapeHtml(ISSUE_TXT[S.strike.issue].name.toLowerCase())}`);
    if (S.sect) ln.push(`<b style="color:#b89cf0">${escapeHtml(S.sect.name)}</b> (${DOCTRINES[S.sect.doctrine].label.toLowerCase()}, ${S.sect.stance}): ${S.sect.members.length} followers`);
    if (S.secessions || S.clashes || S.strikes || S.schisms) ln.push(`<span class="hint">History: ${S.secessions} secession${S.secessions === 1 ? '' : 's'}, ${S.strikes} strike${S.strikes === 1 ? '' : 's'}, ${S.clashes} clash${S.clashes === 1 ? '' : 'es'}${S.casualties ? ' (' + S.casualties + ' dead)' : ''}, ${S.schisms} sect${S.schisms === 1 ? '' : 's'}</span>`);
    if (ln.length) h += `<div class="hint" style="margin-top:8px;line-height:1.5">${ln.join('<br>')}</div>`;
  }
  el.innerHTML = h;
}
/* one quiet sentence about where the population came from this past year */
function flowLine(w) {
  if (!w.flow) return '';
  const parts = [[flowYear(w, 'born'), 'born'], [flowYear(w, 'arrived'), 'arrived'], [flowYear(w, 'died'), 'died'], [flowYear(w, 'left'), 'left']].filter(p => p[0] > 0).map(p => `${p[0]} ${p[1]}`);
  return parts.length ? `<div class="hint" style="margin:-2px 0 4px">This past year: ${parts.join(', ')}</div>` : '';
}
/* families, wealth and feuds */
function renderLives() {
  const w = world, el = $('livesCard'), L = w.lives; if (!el || !L) return;
  const ad = adultsOf(w), fams = new Map(); for (const v of w.vills) { const f = fams.get(v.family) || { n: 0, wealth: 0, own: 0, st: 0, ad: 0 }; f.n++; if (v.isAdult()) { f.wealth += wealthOf(v); f.st += v.status || 0; f.ad++ } fams.set(v.family, f) }
  for (const b of w.buildings.values()) if (b.owner) { const o = w.vills.find(v => v.id === b.owner); if (o && fams.get(o.family)) fams.get(o.family).own++ }
  const top = [...fams.entries()].filter(([, f]) => f.ad).sort((a, b) => b[1].st - a[1].st || b[1].n - a[1].n).slice(0, 5), feuds = L.feuds.filter(f => !f.over);
  let h = top.length ? `<div class="hint" style="margin-bottom:3px">Leading families</div>` + top.map(([n, f]) => `<div class="polh"><span><b>${escapeHtml(n)}</b> <span class="hint">${f.n} ${f.n === 1 ? 'person' : 'people'}${f.own ? ' · owns ' + f.own : ''}</span></span><span class="hint">${STATUS_WORDS(f.st / f.ad)}</span></div>`).join('') : '';
  h += feuds.length ? `<div class="hint" style="margin:8px 0 3px">Feuds</div>` + feuds.map(f => `<div class="grp"><b>${escapeHtml(f.na)}</b> <span class="hint">against</span> <b>${escapeHtml(f.nb)}</b> <span class="hint">· ${escapeHtml(f.cause)} · since day ${f.since}</span><div class="bar"><i style="background:${f.heat > 0.6 ? '#e07a5a' : '#d9c26a'};width:${Math.round(f.heat * 100)}%"></i></div></div>`).join('') : `<div class="hint" style="margin-top:6px">No family quarrels at the moment.</div>`;
  const S = L.stats; if (S.feuds || S.inherited || S.hobbies) h += `<div class="stats" style="margin-top:6px"><div><span class="hint">Estates passed on</span><b>${S.inherited}</b></div><div><span class="hint">Feuds so far</span><b>${S.feuds}</b></div><div><span class="hint">Mended</span><b>${S.reconciled}</b></div><div><span class="hint">Pastimes enjoyed</span><b>${S.hobbies}</b></div></div>`;
  if (L.log.length) h += `<div class="story" style="margin-top:6px">${L.log.slice(0, 3).map(x => `<div>${escapeHtml(x)}</div>`).join('')}</div>`;
  el.innerHTML = h;
}
function renderCouncil() {
  const w = world, g = w.gov, el = $('councilCard');
  const ENDS = { growth: ['Small and close', 'Growing'], labor: ['Work first', 'More leisure'], law: ['Lenient', 'Strict'], defense: ['Trusting', 'Watchful'], tax: ['Light taxes', 'Heavy taxes'] }, STRENGTH = p => { const a = Math.abs(p); return a < 0.15 ? '' : a < 0.45 ? 'leans' : a < 0.8 ? 'favours' : 'strongly' };
  const meters = ISSUES.map(k => { const p = g.policy[k], e = ENDS[k], a = Math.abs(p), word = STRENGTH(p), side = p > 0 ? e[1] : e[0], col = p > 0 ? '#8fc4e8' : '#e0b070';
    return `<div class="pol"><div class="polh"><span>${ISSUE_TXT[k].name}</span><span class="hint">${word ? word + ' <b style="color:' + col + '">' + side.toLowerCase() + '</b>' : 'balanced'}</span></div><div class="polb"><i class="fill" style="left:${p >= 0 ? 50 : 50 + p * 50}%;width:${a * 50}%;background:${col}"></i><i class="mid"></i><i class="dot" style="left:${(p + 1) / 2 * 100}%"></i></div><div class="polends"><span>${e[0]}</span><span>${e[1]}</span></div></div>` }).join('');
  const mem = councilMembers(w).map(m => { const gr = w.groups.find(x => x.id === m.v.group); return `<span class="chip" title="${escapeHtml(m.v.traitWords().join(', '))}"><i style="background:${gr ? gr.color : '#555'}"></i>${m.title}: ${escapeHtml(m.v.name)}</span>` }).join('');
  const dec = g.decisions.slice(0, 4).map(d => `<div><b>D${d.day}</b>${escapeHtml(d.text)}${d.source === 'claude' ? ' <span class="cl">Claude</span>' : ''}</div>`).join('');
  el.innerHTML = g.council.length ? `<div class="chips" style="margin:0 0 6px">${mem}</div><div class="hint" style="margin-bottom:4px">${(() => { const R = rulingGroup(w); return R ? `Led by <b>${escapeHtml(R.name)}</b>, pledged to ${escapeHtml(platformText(R))}. ` : 'No circle leads; a coalition of independents. ' })()}Approval ${Math.round(g.approval)}% · term ends day ${g.termEnd} · ${g.elections} election${g.elections === 1 ? '' : 's'} held${g.welfare ? ' · food relief' : ''}${g.mediation ? ' · mediation' : ''}</div>${meters}<div class="declog">${dec || '<span class="hint">No decisions yet.</span>'}</div>`
    : `<div class="hint">No council yet. When the village has enough adults (8+), they will hold an election.</div>`;
  const ps = g.council.length ? powerShares(w) : []; if (ps.length) el.innerHTML += `<div class="hint" style="margin:8px 0 3px">Who holds power</div><div class="powbar">${ps.map(x => `<i title="${escapeHtml(x.label)} ${Math.round(x.share * 100)}%" style="width:${(x.share * 100).toFixed(1)}%;background:${x.col}"></i>`).join('')}</div><div class="powkey">${ps.slice(0, 4).map(x => `<span><i style="background:${x.col}"></i>${escapeHtml(x.label)} ${Math.round(x.share * 100)}%</span>`).join('')}</div>`;
}
function renderGroups() {
  const w = world, el = $('groupCard');
  if (!w.groups.length) { el.innerHTML = '<div class="hint">No lasting social circles yet. They form as friendships deepen.</div>'; return }
  el.innerHTML = w.groups.map(g => {
    const ally = w.groups.filter(h => h !== g && (g.stance[h.id] || 0) >= 0.3).map(h => h.name), riv = w.groups.filter(h => h !== g && (g.stance[h.id] || 0) <= -0.3).map(h => h.name);
    const ld = nameOf(g.leader), top = ISSUES.map(k => ({ k, v: g.op[k] })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
    return `<div class="grp"><span class="dot" style="background:${g.color}"></span><b>${escapeHtml(g.name)}</b> <span class="hint">${g.members.length} members${ld ? ' · led by ' + escapeHtml(ld) : ''}</span>
      <div class="hint">${w.gov.ruling && w.gov.ruling.gid === g.id ? '<b>Ruling circle.</b> ' : g.satisfied < -0.4 ? '<b>In opposition, and unhappy.</b> ' : ''}Platform: ${escapeHtml(platformText(g))}${g.platform ? ' · focus on ' + FOCUS_TXT[g.platform.focus] : ''}</div>${ally.length ? `<div class="hint">Friendly with ${escapeHtml(ally.join(', '))}</div>` : ''}${riv.length ? `<div class="hint">Rivals: ${escapeHtml(riv.join(', '))}</div>` : ''}</div>`;
  }).join('');
}

/* ---- selectable-unit panels: small building blocks so every panel reads the same way ---- */
const sec = (title, body) => body ? `<div class="sec"><div class="sech">${title}</div>${body}</div>` : '';
const kvs = rows => `<div class="stats">${rows.filter(Boolean).map(([k, v]) => `<div><span class="hint">${k}</span><b>${v}</b></div>`).join('')}</div>`;
const vlink = (v, extra) => `<a class="lnk" data-vid="${v.id}">${escapeHtml(v.name)}</a>${extra ? ' <span class="hint">' + extra + '</span>' : ''}`;
const dateText = d => `Day ${d} (year ${Math.floor(d / (CFG.DPS * 4)) + 1})`;
const humanAge = days => `${ageYears(days)} (about ${humanYears(days)} in human years)`;
const ageYears = days => { const y = days / (CFG.DPS * 4); return y < 1 ? `${Math.round(days)} days` : `${y.toFixed(1)} years` };
const spark = h => { const mx = Math.max(1, ...h); return `<span class="spark">${h.map((n, i) => `<i style="height:${Math.max(2, Math.round(16 * n / mx))}px;opacity:${i === h.length - 1 ? 0.55 : 1}" title="${n} visit${n === 1 ? '' : 's'}"></i>`).join('')}</span>` };
const BUILDING_NAMES = { plaza: 'Village square', tavern: 'Tavern', hall: 'Great Hall', library: 'Library', bastion: 'Bastion', monument: 'Monument', amphitheatre: 'Amphitheatre', granaryhall: 'Great Granary', lighthouse: 'Lighthouse', temple: 'Temple', foundry: 'Foundry', citadel: 'Citadel', market: 'Market square', house: 'Home', farm: 'Field', store: 'Storehouse', campfire: 'Village campfire', dock: 'Dock', logcamp: 'Logging camp', minecamp: 'Mining camp', lodge: 'Hunting lodge' };
const bName = s => s.type === 'house' ? HOUSE_STYLES[s.style || 0] : s.type === 'store' ? ['Storehouse', 'Timber storehouse', 'Stone granary'][Math.min(2, s.style || 0)] : BUILDING_NAMES[s.type] || s.type;
const OUTPUT = { logcamp: 'firewood', minecamp: 'stone', lodge: 'food', farm: 'food', dock: 'food' };
const VENUES = { monument: 'sightseers', temple: 'visitors', library: 'readers', lighthouse: 'sightseers', bastion: 'sightseers', citadel: 'sightseers', foundry: 'sightseers', granaryhall: 'sightseers', plaza: 'visits', tavern: 'visits', hall: 'visits', amphitheatre: 'visits', market: 'visits', campfire: 'visits', dock: 'landings' };
function buildingPanel(w, s, extra) {
  const pct = Math.max(0, Math.round(100 * s.hp / s.maxHp)), cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  const near = w.vills.filter(v => !v.isChild() && Math.hypot(v.x - cx, v.y - cy) < Math.max(s.w, s.h) + 2.5);
  const proj = PROJECTS[s.type] ? PROJECTS[s.type].gives : '', purpose = { plaza: 'The village meets here in the evenings and for councils when there is no hall. Cobbled once masonry is known.', tavern: 'Adults spend evenings here: talk, rumour, and a lift in spirits.', campfire: 'The first gathering place. Evenings and talk start here.' }[s.type] || '';
  const mat = (BLD_MATERIAL[s.type] || (() => '-'))(s.type === 'plaza' || s.type === 'tavern' ? w : s.style), wr = (BLD_WEAR[s.type] || [0.003])[s.style || 0] || (BLD_WEAR[s.type] || [0.003])[0];
  const facts = kvs([['Age', ageText(w, s)], ['Built', dateText(s.built ?? w.day)], ['Built in', AGES[s.builtEra !== undefined ? s.builtEra : (s.era || 0)]], s.upgraded !== undefined ? ['Rebuilt', dateText(s.upgraded) + ` (${ERAS[s.era || 0]})`] : null, ['Material', escapeHtml(mat)], ['Size', `${s.w} x ${s.h} tiles`], ['Repairs', s.repairs || 0], ['Wear', wr * 100 > 0 ? (wr * 3200).toFixed(1) + '% a year' : '-']]);
  let people = '', use = '';
  if (s.type === 'house') {
    const res = s.occ.map(id => w.vills.find(v => v.id === id)).filter(Boolean), beds = bedsOf(s);
    people = sec('Residents', `<div class="hint">${res.length ? res.length + ' living here' : 'Empty'} · ${beds} beds${res.length > beds ? ' (children and newborns share)' : ''}</div>` + res.map(v => `<div>${vlink(v, `${ageYears(v.age)} (≈${humanYears(v.age)})${v.role && !v.isChild() ? ' · ' + v.role : ''}`)}</div>`).join(''));
  } else if (s.type === 'farm') {
    const fe = s.fert ?? 1;
    people = sec('Field', `<div class="hint">${['Bare soil, waiting to be sown.', 'Crops growing: ' + Math.round(s.g * 100) + '%.', 'Ripe and ready to harvest.'][s.state]}</div><div class="hint">Soil: <b>${fe >= 1.03 ? 'rich' : fe >= 0.9 ? 'good' : fe >= 0.75 ? 'tired' : 'worn out'}</b> (${Math.round(fe * 100)}% yield). ${fe < 0.85 ? 'Fields left bare in winter recover faster; crop rotation wears the soil half as fast.' : ''}</div>`);
  } else if (s.type === 'store') {
    people = sec('Stores', `<div class="hint">The village holds ${Math.round(w.stock.food)} food, ${Math.round(w.stock.wood)} firewood and ${Math.round(w.stock.stone)} stone of ${w.cap()} it can keep. Stores raise the limit by ${100 + (w.has('granary') ? 40 : 0)}.</div>`);
  } else if (s.type === 'dock') {
    const bs = w.boats.filter(b => b.dock === s.id);
    const tr = dockTier(s), kinds = {}; for (const b of bs) { const k = b.kind || 'fishing'; kinds[k] = (kinds[k] || 0) + 1 }
    people = sec('Harbour', `<div class="hint"><b style="color:var(--ink)">${TIERS[tr].name}</b>${s.upg ? ' (building a ' + TIERS[s.upg.tier].name.toLowerCase() + ')' : ''}: ${Object.entries(kinds).map(([k, n]) => n + ' ' + SHIPS[k].name.toLowerCase() + (n > 1 ? 's' : '')).join(', ') || 'no ships'} of ${berths(w, s)} berths (${bs.filter(b => b.state === 'out').length} at sea). ${s.catch ? 'Landed ' + Math.round(s.catch) + ' food in all.' : 'No catch landed yet.'}${tr < 3 ? ' ' + (tr === 1 ? 'A quay adds berths and cargo ships.' : 'A port adds carracks and customs revenue.') : ''}</div>`);
  } else if (s.type === 'logcamp' || s.type === 'minecamp' || s.type === 'lodge') {
    const role = { logcamp: 'woodcutter', minecamp: 'miner', lodge: 'hunter' }[s.type], rad = s.type === 'lodge' ? 22 : 14, ws = w.vills.filter(v => v.role === role && Math.hypot(v.x - cx, v.y - cy) < rad + 6);
    people = sec('Workers', `<div class="hint">${ws.length} ${role}${ws.length === 1 ? '' : 's'} work within reach (${rad} tiles).</div>` + ws.slice(0, 5).map(v => `<div>${vlink(v, v.label)}</div>`).join(''));
  } else if (PROJECTS[s.type]) {
    const d = w.proj && w.proj.done[s.type];
    people = sec('A great work', `<div class="hint">${escapeHtml(proj)}</div>` + (d ? `<div class="hint">Finished ${dateText(d.day)}${d.champ ? '. Championed by ' + escapeHtml(d.champ) : ''}${d.names && d.names.length ? '; ' + escapeHtml(d.names.join(' and ')) + ' pledged their labour' : ''}.</div>` : ''));
  } else if (s.type === 'market') people = sec('Market', `<div class="hint">Where visiting merchants trade. Surplus goods are sold and shortages bought; the council decides how to deal with each visit.</div>`);
  if (VENUES[s.type] || s.vtot) {
    const P = popularity(w, s), regs = Object.entries(s.reg || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ v: w.vills.find(x => x.id === +id), n })).filter(x => x.v);
    const col = P.arrow === '▲' ? '#7ad07a' : P.arrow === '▼' ? '#e0985a' : '#9aa5ae';
    use = sec('Usage', kvs([['This season', P.season], ['Last season', P.last], ['Past year', P.year], ['All time', s.vtot || 0]]) + `<div class="polh" style="margin-top:6px"><span><span style="color:${col}">${P.arrow}</span> Popularity: <b>${P.trend}</b></span>${spark(P.hist)}</div>`
      + `<div class="hint">${P.year ? 'About ' + P.perDay.toFixed(1) + ' ' + (VENUES[s.type] || 'visits') + ' a day. ' : ''}${near.length} villager${near.length === 1 ? '' : 's'} here right now${near.length ? ': ' + near.slice(0, 4).map(v => vlink(v)).join(', ') + (near.length > 4 ? '…' : '') : ''}.</div>`
      + (regs.length ? `<div class="hint">Regulars: ${regs.map(x => vlink(x.v, '×' + x.n)).join(', ')}</div>` : ''));
  }
  if (OUTPUT[s.type]) {
    const O = popularity(w, s, 'oh'), col = O.arrow === '▲' ? '#7ad07a' : O.arrow === '▼' ? '#e0985a' : '#9aa5ae', u = OUTPUT[s.type];
    use += sec('Output', kvs([['This season', Math.round(O.season) + ' ' + u], ['Last season', Math.round(O.last) + ' ' + u], ['Past year', Math.round(O.year) + ' ' + u], ['All time', Math.round(s.otot || 0) + ' ' + u]]) + `<div class="polh" style="margin-top:6px"><span><span style="color:${col}">${O.arrow}</span> Output: <b>${O.trend}</b></span>${spark(O.hist.map(Math.round))}</div>`);
  }
  const hist = [s.last ? `Last event: ${escapeHtml(s.last)}` : '', s.hp / s.maxHp < 0.75 ? (s.repairer ? 'A builder is on the way to mend it.' : 'Needs repair: builders will mend it when wood is available.') : ''].filter(Boolean);
  return `<h3>Building</h3><div class="big">${bName(s)}</div><div class="hint">${escapeHtml(purpose || (s.type === 'logcamp' || s.type === 'minecamp' || s.type === 'lodge' ? extra : '') || '')}</div>
    <div class="polh" style="margin-top:8px"><span>Condition: <b>${condition(s)}</b></span><span class="hint">${Math.round(s.hp)} / ${s.maxHp} hit points</span></div><div class="bar"><i style="background:${conditionColor(s)};width:${pct}%"></i></div>
    ${use}${people}${sec('Details', facts)}${hist.length ? `<div class="hint" style="margin-top:6px">${hist.join('<br>')}</div>` : ''}`;
}
function familyBlock(w, s, home) {
  const by = ids => ids.map(id => w.vills.find(v => v.id === id)).filter(Boolean);
  const ptn = s.partner != null ? by([s.partner])[0] : null, kids = by(s.kids), par = by((s.parentIds || []).filter(x => x != null)), mates = home ? by(home.occ).filter(v => v !== s) : [];
  const fav = Object.entries(s.fav || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${(BUILDING_NAMES[t] || t).toLowerCase()} ×${n}`).join(', ');
  const rows = [['Partner', ptn ? vlink(ptn) : 'none'], par.length ? ['Parents', par.map(v => vlink(v)).join(', ')] : null, ['Children', kids.length ? kids.slice(0, 6).map(v => vlink(v)).join(', ') + (kids.length > 6 ? '…' : '') : 'none'],
    ['Home', home ? `<a class="lnk" data-bid="${home.id}">cabin at ${home.x},${home.y}</a>${mates.length ? ' with ' + mates.map(v => vlink(v)).join(', ') : ''}` : 'none'], fav ? ['Often found at', escapeHtml(fav)] : null,
    s.isAdult() && (s.trade || s.side) ? ['Livelihood', escapeHtml(tradeName(w, s.trade || s.side)) + (s.trade ? '' : ' (side job)') + (s.shop ? ' · own shop' : '')] : null, s.isAdult() && dreamText(s) ? ['Dream', escapeHtml(dreamText(s))] : null,
    s.isAdult() && s.hobby ? ['Hobby', HOBBIES[s.hobby].label] : null, s.status !== undefined && s.isAdult() ? ['Standing', STATUS_WORDS(s.status) + (wealthOf(s) >= 1 ? ' · means ' + (wealthOf(s) < 8 ? 'modest' : wealthOf(s) < 30 ? 'comfortable' : 'considerable') : '')] : null, (() => { const ps = propsOf(w, s); return ps.length ? ['Owns', ps.map(b => b.type === 'house' ? 'a home' : 'a field').join(' and ')] : null })(), (() => { const f = feudOf(w, s); return f ? ['Feud', `${f.ka.has(s.id) ? escapeHtml(f.nb) : escapeHtml(f.na)}'s kin, over ${escapeHtml(f.cause)} (${Math.round(f.heat * 100)}% hot)`] : null })(),
    s.output ? ['Work output', `${Math.round(s.output)} units gathered`] : null, ['Born', dateText(Math.max(0, Math.round(w.day - s.age)))]];
  return sec('Family &amp; life', `<div class="kvl">${rows.filter(Boolean).map(([k, v]) => `<div><span class="hint">${k}</span><span>${v}</span></div>`).join('')}</div>`);
}
function updateInspector() {
  const w = world, s = selected, el = $('sel');
  if (s instanceof Villager && s.alive) {
    const friends = w.vills.filter(o => o !== s).map(o => ({ o, r: w.getRel(s, o) })).filter(x => Math.abs(x.r) > 15).sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 4);
    const home = s.home != null ? w.buildings.get(s.home) : null, sk = Object.entries(s.skill).filter(([, v]) => v > 0.2).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const gr = w.groups.find(x => x.id === s.group), tt = titleOf(w, s), ptn = s.partner != null ? nameOf(s.partner) : null;
    el.innerHTML = `<h3>Villager</h3><div class="big">${escapeHtml(s.name)} <span class="hint">of House ${escapeHtml(s.family)}</span></div>
      <div class="hint">${s.sex === 'f' ? 'Woman' : 'Man'} · ${s.stage()} · age ${humanAge(s.age)}${tt ? ' · council ' + tt : ''}${s.role && !s.isChild() ? ' · ' + s.role : ''}${s.preg > 0 ? ' · expecting' : ''}</div>
      <div class="tags">${s.traitWords().map(t => `<span class="tag">${t}</span>`).join('') || '<span class="tag">Even-tempered</span>'}${gr ? `<span class="tag" style="border-color:${gr.color}">${escapeHtml(gr.name)}</span>` : ''}</div>
      ${s.char ? `<div class="hint" style="margin:4px 0">Character: <b style="color:var(--ink)">${ruthWord(s.char)}</b>, ${faithWord(s.char)}, ${ambWord(s.char)}. ${escapeHtml(upbringingText(s))}</div>` : ''}
      <div style="margin-bottom:6px">${escapeHtml(s.label)}${s.carry ? ' · carrying ' + s.carry.amt + ' ' + s.carry.kind : ''}</div>
      ${thoughtBlock(w, s)}
      ${bar('Mood (' + moodWord(s.mood) + ')', s.mood, '#c678dd')}${bar('Hunger (full)', s.hunger, '#e0a458')}${bar('Energy', s.energy, '#6a8fd0')}${bar('Health', s.health, '#8fd18b')}
      ${s.desire ? `<div class="hint" style="margin:4px 0"><b>Dreams</b> ${escapeHtml(s.desireText())}</div>` : ''}
      ${w.has('coinage') ? `<div class="hint">Coins: ${s.coins || 0} (earned ${s.earned || 0} in all)</div>` : ''}
      ${familyBlock(w, s, home)}
      <div class="hint">Skills: ${sk.length ? sk.map(([k, v]) => k + ' (' + skillWord(v) + ')').join(', ') : 'still learning'}</div>
      <div class="hint">Bonds: ${friends.length ? friends.map(f => escapeHtml(f.o.name) + ' ' + (f.r > 0 ? '+' : '') + Math.round(f.r)).join(', ') : 'none yet'}</div>
      ${s.isChild() ? '' : `<div class="opinions"><div class="hint">Opinions</div>${opBar('Growth', s.op.growth)}${opBar('Leisure', s.op.labor)}${opBar('Strict law', s.op.law)}${opBar('Watch', s.op.defense)}${opBar('Taxes', s.op.tax || 0)}</div>`}
      <div class="story"><div class="hint">Life story</div>${s.bio.slice(-8).reverse().map(b => `<div><b>D${b.day}</b>${escapeHtml(b.text)}</div>`).join('') || '<div class="hint">Just beginning.</div>'}</div>`;
  } else if (s instanceof Animal && s.alive) {
    const mx = s.kind === 'wolf' ? 40 : s.kind === 'deer' ? 20 : 5, near = w.vills.filter(v => !v.isChild() && Math.hypot(v.x - s.x, v.y - s.y) < 8), pack = s.kind === 'wolf' ? w.animals.filter(a => a.alive && a.kind === 'wolf' && Math.hypot(a.x - s.x, a.y - s.y) < 12).length : 0;
    el.innerHTML = `<h3>Animal</h3><div class="big">${s.kind === 'wolf' ? 'Wolf' : s.kind === 'deer' ? (s.sex === 'm' ? 'Stag' : 'Deer') : 'Rabbit'}</div><div class="hint">${s.kind === 'wolf' ? 'A predator. Hunters and brave villagers will fight it; others flee.' : 'Wild game. Hunters track it for food.'}</div>
      ${bar('Health', 100 * Math.max(0, s.hp) / mx, '#8fd18b')}${bar('Hunger (full)', s.hunger, '#e0a458')}
      ${sec('Details', kvs([['Sex', s.sex === 'm' ? 'Male' : 'Female'], s.born !== undefined ? ['Age', ageYears(w.day - s.born)] : null, ['Doing', s.moving ? (s.target ? 'Hunting or fleeing' : 'Roaming') : 'Resting'], ['Position', `${Math.round(s.x)}, ${Math.round(s.y)}`], s.kind === 'wolf' ? ['Pack nearby', pack] : null, ['Villagers near', near.length]]))}`;
  } else if (s && s.role && s.loyalty !== undefined && s.state) {
    el.innerHTML = outpostPanel(w, s);
  } else if (s && s.type && s.w) {
    let extra = ''; if (s.type === 'house') extra = `Sleeps ${s.occ.length} of ${bedsOf(s)}: ${s.occ.map(nameOf).filter(Boolean).join(', ') || 'empty'}`;
    if (s.type === 'market') extra = 'Where visiting merchants trade. Surplus goods are sold and shortages bought; the council decides how to deal with each visit.';
    if (s.type === 'dock') { const bs = w.boats.filter(b => b.dock === s.id); extra = `${bs.length} fishing boat${bs.length === 1 ? '' : 's'} work from here (${bs.filter(b => b.state === 'out').length} at sea). Catches go straight to the stores.` }
    if (s.type === 'logcamp') extra = 'A depot beside the forest. Woodcutters within about 14 tiles work about 15% faster and get a quarter more wood from every tree.';
    if (s.type === 'minecamp') extra = 'A depot at the rockface. Miners within about 14 tiles work faster, carry bigger loads and get more stone.';
    if (s.type === 'lodge') extra = 'A depot near the game trails. Hunters within about 22 tiles strike surer, and hunting parties and foragers can unload here.'; if (s.type === 'farm') extra = ['Bare soil, waiting to be sown.', 'Crops growing: ' + Math.round(s.g * 100) + '%.', 'Ripe and ready to harvest.'][s.state]; if (s.type === 'store') extra = 'Raises the village storage limit.' + (s.style === 2 ? ' Built of stone: the best protection from damp and spoilage.' : ''); if (s.type === 'campfire') extra = 'Where the village gathers, and where the council meets.';
    ensureStats(w, s); el.innerHTML = buildingPanel(w, s, extra);
  } else { el.innerHTML = '<h3>Inspector</h3><div class="hint">Click a villager, animal or building on the map.</div>'; if (s && ((s instanceof Villager) || (s instanceof Animal))) selected = null }
}
/* ---- side panel tabs ---- */
let curTab = 'village'; try { curTab = localStorage.getItem('villagesim.tab') || 'village' } catch (e) { }
function showTab(t) {
  if (!$('tab_' + t)) t = 'village'; curTab = t; try { localStorage.setItem('villagesim.tab', t) } catch (e) { }
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); document.querySelectorAll('.tab').forEach(s => s.classList.toggle('on', s.id === 'tab_' + t));
  if (world) updateUI();
}
$('outCard').addEventListener('click', e => { const a = e.target.closest('a.lnk'); if (!a || !world || !a.dataset.oid) return; e.preventDefault(); const o = world.out.list.find(x => x.id === +a.dataset.oid); if (o) { selected = o; R.cam.x = o.x * CFG.T + 8; R.cam.y = o.y * CFG.T + 8; follow = false; showTab('village'); updateUI() } });
$('sel').addEventListener('click', e => {
  const a = e.target.closest('a.lnk'); if (!a || !world) return; e.preventDefault(); let o = null;
  if (a.dataset.vid) o = world.vills.find(v => v.id === +a.dataset.vid); else if (a.dataset.bid) o = world.buildings.get(+a.dataset.bid); else if (a.dataset.oid) o = world.out.list.find(x => x.id === +a.dataset.oid);
  if (o) { selected = o; const T = CFG.T; R.cam.x = (o.x + (o.w || 0) / 2) * T; R.cam.y = (o.y + (o.h || 0) / 2) * T; follow = o instanceof Villager; showTab('village'); updateUI() }
});
$('tabbar').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab) }); showTab(curTab);
const chart = $('chart'), cc = chart.getContext('2d');
function drawChart() {
  const h = world.hist, cw = chart.width, ch = chart.height; cc.clearRect(0, 0, cw, ch); if (h.length < 2) return;
  const n = h.length, maxP = Math.max(10, ...h.map(p => p.pop)), maxF = Math.max(40, ...h.map(p => p.food)), bw = (cw - 2) / (n - 1), cols = ['#2e4a2a', '#4a4a22', '#4a3622', '#2a3a4a'];
  h.forEach((p, i) => { cc.fillStyle = cols[p.season]; cc.globalAlpha = 0.5; cc.fillRect(1 + i * bw, 0, bw + 1, ch); cc.globalAlpha = 1 });
  const line = (key, max, col) => { cc.strokeStyle = col; cc.lineWidth = 1.5; cc.beginPath(); h.forEach((p, i) => { const X = i / (n - 1) * (cw - 2) + 1, Y = ch - 3 - (p[key] / max) * (ch - 8); i ? cc.lineTo(X, Y) : cc.moveTo(X, Y) }); cc.stroke() };
  line('food', maxF, '#e0a458'); line('pop', maxP, '#8fd18b'); cc.fillStyle = '#c4ccd3'; cc.font = '10px sans-serif'; cc.fillText('pop max ' + maxP, 4, 11);
}

/* ---------- input ---------- */
const cv = $('cv'); initRender(cv, $('mini'));
let drag = null;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, moved: 0 }; cv.classList.add('drag') });
cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; if (drag.moved > 5) { R.cam.x -= dx / R.cam.z; R.cam.y -= dy / R.cam.z; follow = false; clampCam() } });
cv.addEventListener('pointerup', e => { cv.classList.remove('drag'); if (drag && drag.moved <= 5) { const r = cv.getBoundingClientRect(); pick(e.clientX - r.left, e.clientY - r.top) } drag = null });
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top) }, { passive: false });
function pick(sx, sy) {
  { const bv = bubbleAt(sx, sy); if (bv) { selected = bv; showTab('village'); updateUI(); return } }
  const p = screenToWorld(sx, sy), T = CFG.T, rad = Math.max(11, 16 / R.cam.z); let best = null, bd = rad;
  for (const v of world.vills) { const d = Math.hypot(v.x * T - p.x, v.y * T - 6 - p.y); if (d < bd) { bd = d; best = v } }
  for (const a of world.animals) if (a.alive) { const d = Math.hypot(a.x * T - p.x, a.y * T - 5 - p.y); if (d < bd) { bd = d; best = a } }
  if (!best && world.out) for (const o of world.out.list) if (o.state === 'active') { const d = Math.hypot(o.x * T + 8 - p.x, o.y * T + 4 - p.y); if (d < Math.max(34, 30 / R.cam.z)) { best = o; break } }
  if (!best) { const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T); if (tx >= 0 && ty >= 0 && tx < CFG.W && ty < CFG.H) { const id = world.bmap[ty * CFG.W + tx], b = id ? world.buildings.get(id) : null; if (b) best = b; else { const t2 = Math.floor((p.y + 14) / T), id2 = world.bmap[t2 * CFG.W + tx]; if (id2) best = world.buildings.get(id2) } } }
  if (best !== selected) voiceUnpin(); selected = best; if (!best) follow = false; else showTab('village'); updateUI();
}
const mini = $('mini');
function miniGo(e) { const r = mini.getBoundingClientRect(); R.cam.x = (e.clientX - r.left) / r.width * CFG.W * CFG.T; R.cam.y = (e.clientY - r.top) / r.height * CFG.H * CFG.T; follow = false; clampCam() }
mini.addEventListener('pointerdown', e => { mini.setPointerCapture(e.pointerId); miniGo(e); mini._d = true }); mini.addEventListener('pointermove', e => { if (mini._d) miniGo(e) }); mini.addEventListener('pointerup', () => mini._d = false);
const SPEED_STEPS = [0.25, 0.5, 1, 3, 10, 30, 100]; let lastSpeed = 10, pendingTicks = 0;
const speedText = s => s <= 0 ? 'Paused' : s >= 999 ? 'Max' : s === 0.25 ? '¼×' : s === 0.5 ? '½×' : s + '×';
function setSpeed(s) {
  speed = s; if (s > 0) lastSpeed = s;
  document.querySelectorAll('[data-sp]').forEach(b => b.classList.toggle('on', +b.dataset.sp === s));
  $('playBtn').textContent = s > 0 ? '⏸' : '▶'; $('playBtn').classList.toggle('paused', s === 0); $('spLabel').textContent = speedText(s);
}
const stepSpeed = dir => { const cur = speed > 0 ? speed : lastSpeed; let i = SPEED_STEPS.findIndex(x => x >= cur); if (i < 0) i = SPEED_STEPS.length - 1; if (dir > 0 && SPEED_STEPS[i] <= cur) i++; else if (dir < 0) i--; setSpeed(SPEED_STEPS[clamp(i, 0, SPEED_STEPS.length - 1)]) };
const advance = big => { if (tt) return; pendingTicks += CFG.TPD * (big ? CFG.DPS : 1); if (speed > 0) { lastSpeed = speed; setSpeed(0) } };
document.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => setSpeed(+b.dataset.sp));
$('playBtn').onclick = () => setSpeed(speed > 0 ? 0 : lastSpeed || 10); $('spDown').onclick = () => stepSpeed(-1); $('spUp').onclick = () => stepSpeed(1); $('stepBtn').onclick = e => advance(e.shiftKey);
$('zin').onclick = () => zoomAt(1.3, R.vw / 2, R.vh / 2); $('zout').onclick = () => zoomAt(1 / 1.3, R.vw / 2, R.vh / 2);
$('fol').onclick = () => { follow = !follow && !!selected; $('fol').classList.toggle('on', follow) };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return; keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') { e.preventDefault(); setSpeed(speed === 0 ? lastSpeed || 10 : 0) }
  if (e.key === '[') stepSpeed(-1); if (e.key === ']') stepSpeed(1); if (e.key === '.') advance(e.shiftKey); if (e.key === '>') advance(true);
  const m = { '1': 1, '2': 3, '3': 10, '4': 30, '5': 999 }[e.key]; if (m) setSpeed(m);       // 5 is a hidden "as fast as it can go" for testing
  if (e.key === '+' || e.key === '=') zoomAt(1.2, R.vw / 2, R.vh / 2); if (e.key === '-') zoomAt(1 / 1.2, R.vw / 2, R.vh / 2);
  if (e.key.toLowerCase() === 'f') $('fol').click(); if (e.key.toLowerCase() === 'g') toggleDrawer();
  if (e.key === 'Escape') { if ($('nw').style.display !== 'none') nwClose(); else if (drawerOpen()) toggleDrawer(false); else { selected = null; follow = false; updateUI() } }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false });
addEventListener('resize', () => { resizeRender(); clampCam() });

/* ---------- diagnostics panel ---------- */
const AUTORESUME_KEY = 'villagesim.autoresume';
let diagTimer = 0, lastDiag = { frames: 0, t: performance.now(), tick: 0 };
function fmt(x, d = 2) { return Number.isFinite(x) ? x.toFixed(d) : '–' }
function updateDiag() {
  const w = world, d = w.dbg, secs = dbgSections(w), errs = dbgAllErrors(w), total = errs.reduce((s, r) => s + r.count, 0), want = CFG.TPS * speed, eff = DBG.tps / CFG.TPS;
  const limited = speed > 0 && speed < 100 && DBG.tps < want * 0.7 && want > 0;
  $('diagBadge').textContent = total ? total + ' error' + (total === 1 ? '' : 's') : limited ? 'slow' : 'ok'; $('diagBadge').classList.toggle('bad', total > 0);
  const hw = $('hudWarn'); if (total || limited) { hw.style.display = ''; hw.textContent = total ? '⚠ ' + total + ' error' + (total === 1 ? '' : 's') : '⏱ running at ' + fmt(eff, 1) + '× (CPU-limited)' } else hw.style.display = 'none';
  if (!drawerOpen()) return;
  const rows = secs.slice(0, 6).map(r => `<tr><td>${r.name}</td><td>${fmt(r.avgMs, 3)} ms avg · ${fmt(r.maxMs, 1)} max · ${Math.round(r.share * 100)}%</td></tr>`).join('');
  $('diagBody').innerHTML = `<table><tr><td>Speed</td><td>${fmt(eff, 1)}× actual of ${speed}× requested${limited ? ' · <span class="err">can\'t keep up</span>' : ''}</td></tr>
    <tr><td>Per tick</td><td>${d.ticks ? fmt(d.tickMs / d.ticks, 3) : '–'} ms avg · ${fmt(d.tickMax, 1)} ms worst</td></tr><tr><td>Frame</td><td>${fmt(DBG.fps, 0)} fps · draw ${fmt(DBG.renderMs, 1)} ms</td></tr>
    <tr><td>Villagers / animals</td><td>${w.vills.length} / ${w.animals.length}</td></tr><tr><td>Bonds tracked</td><td>${w.rel.size}</td></tr><tr><td>Freed from being stuck</td><td>${d.unstuck}</td></tr>
    <tr><td>Watchdog restarts</td><td>${DBG.restarts}</td></tr></table>
    <div class="hint">Where the time goes (last 10 s)</div><table>${rows || '<tr><td>No data yet</td></tr>'}</table>
    ${errs.length ? '<div class="hint">Errors this session</div>' + errs.slice(-5).map(r => `<div class="err">${escapeHtml(r.where)}: ${escapeHtml(r.msg)} ×${r.count}${r.ent ? ' (' + escapeHtml(r.ent) + ')' : ''}</div>`).join('') : '<div class="okk">No errors this session.</div>'}
    ${DBG.previous.length ? `<div class="hint" style="margin-top:4px">Previous session left ${DBG.previous.length} error record(s), latest: ${escapeHtml(DBG.previous[DBG.previous.length - 1].where)}: ${escapeHtml(DBG.previous[DBG.previous.length - 1].msg)}</div>` : ''}`;
}
async function reportAction(kind) {
  const text = JSON.stringify(dbgReport(world, speed), null, 2);
  if (kind === 'save') return saveTextFile(`village-diagnostics-y${world.year}-d${world.day}.json`, text, 'Saved report ');
  let ok = false; try { await navigator.clipboard.writeText(text); ok = true } catch (e) { }
  const ta = $('diagText'); if (ok) { saveInfo('Report copied to the clipboard.'); ta.style.display = 'none' } else { ta.value = text; ta.style.display = ''; ta.focus(); ta.select(); saveInfo('The browser blocked copying. The report is in the box below: select all and copy it.') }
}
$('diagCopy').onclick = () => reportAction('copy'); $('diagSave').onclick = () => reportAction('save');
$('diagProf').onclick = () => { world.profReset(); world.dbg.errors.clear(); DBG.session.clear(); DBG.previous = []; try { localStorage.removeItem(ERR_KEY) } catch (e) { } updateDiag() };
$('diagCheck').onclick = () => { const before = world.dbg.total; world.sanity(); for (const v of world.vills) { try { v.abort(0) } catch (e) { } } saveInfo(world.dbg.total > before ? 'Self-check repaired corrupted values and reset every villager’s current job.' : 'Self-check found nothing to repair; every villager’s current job was reset.'); updateDiag() };
const drawer = $('drawer'), drawerOpen = () => drawer.classList.contains('open');
function toggleDrawer(open) { drawer.classList.toggle('open', open === undefined ? !drawerOpen() : open); $('gear').classList.toggle('on', drawerOpen()); if (drawerOpen()) updateDiag() }
$('gear').onclick = () => toggleDrawer(); $('drawerClose').onclick = () => toggleDrawer(false);
$('hudWarn').onclick = () => { toggleDrawer(true); $('diagCard').open = true; $('diagCard').scrollIntoView({ block: 'center' }) };
$('autoresume').checked = (() => { try { return localStorage.getItem(AUTORESUME_KEY) !== '0' } catch (e) { return true } })();
$('autoresume').addEventListener('change', e => { try { localStorage.setItem(AUTORESUME_KEY, e.target.checked ? '1' : '0') } catch (_) { } });

/* ---------- main loop: nothing in here is allowed to stop it ---------- */
let last = performance.now(), acc = 0, uiAcc = 0, miniAcc = 0, lastFrameAt = performance.now(), frames = 0;
/* ---- time travel: run the simulation flat out for a chosen span, then report what changed ---- */
let tt = null;
function startTimeTravel(days) {
  if (tt || !world) return; const w = world;
  try { localStorage.setItem('villagesim.pretravel', JSON.stringify(serializeWorld(w))) } catch (e) { $('ttInfo').textContent = 'Could not keep a copy to undo with, so nothing was skipped. Use Export file, then try again.'; return }
  tt = { target: w.tick + days * CFG.TPD, start: w.tick, days, prevSpeed: speed, t0: performance.now(), day0: w.day, pop0: w.vills.length, deaths0: w.deaths, chron0: w.chron ? w.chron.events.length : 0, known0: new Set(Object.keys(w.tech.known)), done0: new Set(Object.keys(w.proj.done)), logMark: (w.chron && w.chron.events[0]) || null };
  setSpeed(0); $('ttGo').disabled = true; $('ttCancel').disabled = false; $('ttSel').disabled = true; $('ttResult').innerHTML = '';
}
function stepTimeTravel() {
  const w = world, T = tt, t0 = performance.now();
  try { while (w.tick < T.target && !T.cancel && performance.now() - t0 < 24) w.step() } catch (e) { dbgNote('timetravel', e); dbgPersist(w); T.cancel = true }
  const p = Math.min(1, (w.tick - T.start) / (T.target - T.start)), el = (performance.now() - T.t0) / 1000;
  $('ttBar').style.width = Math.round(p * 100) + '%'; $('ttInfo').textContent = `Day ${w.day}, year ${w.year}: ${Math.round(p * 100)}% · ${Math.round(el)}s${p > 0.05 ? ' · about ' + Math.round(el / p * (1 - p)) + 's left' : ''}`;
  if (w.tick >= T.target || T.cancel) finishTimeTravel();
}
function finishTimeTravel() {
  const w = world, T = tt; tt = null; setSpeed(T.prevSpeed > 0 ? T.prevSpeed : 10);
  $('ttGo').disabled = false; $('ttCancel').disabled = true; $('ttSel').disabled = false; $('ttBar').style.width = '100%';
  const newTech = Object.keys(w.tech.known).filter(k => !T.known0.has(k)).map(k => TECHS[k].name), newProj = Object.keys(w.proj.done).filter(k => !T.done0.has(k)).map(k => PROJECTS[k].name);
  const evs = w.chron ? w.chron.events.slice(0, Math.max(0, w.chron.events.length - T.chron0)).filter(e => e.kind === 'event' || e.kind === 'faction' || e.kind === 'era' || e.kind === 'diplomacy' || e.kind === 'voyage' || e.kind === 'regime').slice(0, 5) : [];
  const spanDays = w.day - T.day0, esc = escapeHtml;
  $('ttInfo').textContent = T.cancel ? 'Stopped early.' : 'Done.';
  $('ttResult').innerHTML = `<b>${spanDays} days passed.</b> Population ${T.pop0} → ${w.vills.length}, ${w.deaths - T.deaths0} died.${newTech.length ? `<br>Discovered: ${esc(newTech.join(', '))}.` : ''}${newProj.length ? `<br>Built: ${esc(newProj.join(', '))}.` : ''}${w.gov.ruling ? `<br>${esc(w.gov.ruling.name)} leads the council.` : ''}${evs.length ? '<br>' + evs.map(e => '· ' + esc(e.text.length > 90 ? e.text.slice(0, 87) + '…' : e.text)).join('<br>') : ''}`;
  w.say(`Time travel: ${spanDays} days passed.`); $('ttResult').innerHTML += '<div style="margin-top:6px"><button id="ttUndo">Undo: go back to before</button></div>'; $('ttUndo').onclick = undoTimeTravel;
}
function undoTimeTravel() {
  if (tt) return;
  try { const raw = localStorage.getItem('villagesim.pretravel'); if (!raw) { $('ttInfo').textContent = 'No earlier copy found.'; return } adoptWorld(deserializeWorld(JSON.parse(raw))); setSpeed(10); $('ttResult').textContent = ''; $('ttInfo').textContent = 'Back to before the skip.'; $('ttBar').style.width = '0' }
  catch (e) { $('ttInfo').textContent = 'Could not restore: ' + ((e && e.message) || e) }
}
$('ttGo').onclick = () => startTimeTravel(+$('ttSel').value); $('ttCancel').onclick = () => { if (tt) tt.cancel = true };
function frame(now) {
  const ts = performance.now(); lastFrameAt = ts; frames++;
  try {
    const dt = Math.min(100, now - last); last = now;
    if (tt) stepTimeTravel();
    if (pendingTicks > 0 && !tt) { const t0 = performance.now(); try { while (pendingTicks > 0 && performance.now() - t0 < 30) { world.step(); pendingTicks-- } } catch (e) { dbgNote('step', e); dbgPersist(world); pendingTicks = 0 } }
    if (speed > 0) {
      acc += dt / 1000 * CFG.TPS * speed; let n = Math.floor(acc); acc -= n; const t0 = performance.now();
      const budget = speed >= 100 ? 45 : 14; try { while (n-- > 0) { world.step(); if (performance.now() - t0 > budget) { acc = 0; break } } } catch (e) { dbgNote('step', e); dbgPersist(world) }
    }
    const pan = 520 * dt / 1000 / R.cam.z, c = R.cam;
    if (keys['w'] || keys['arrowup']) { c.y -= pan; follow = false } if (keys['s'] || keys['arrowdown']) { c.y += pan; follow = false } if (keys['a'] || keys['arrowleft']) { c.x -= pan; follow = false } if (keys['d'] || keys['arrowright']) { c.x += pan; follow = false }
    if (follow && selected && Number.isFinite(selected.x) && Number.isFinite(selected.y) && selected.alive !== false) { const tx = selected.type ? (selected.x + selected.w / 2) * CFG.T : selected.x * CFG.T, ty = selected.type ? (selected.y + selected.h / 2) * CFG.T : selected.y * CFG.T; c.x += (tx - c.x) * 0.12; c.y += (ty - c.y) * 0.12 }
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.z) || c.z <= 0) { c.x = (world.cx + 1) * CFG.T; c.y = (world.cy + 1) * CFG.T; c.z = Number.isFinite(c.z) && c.z > 0 ? c.z : 2; follow = false }       // a bad number in the camera would otherwise break every frame
    const r0 = performance.now(); R.speed = speed; try { clampCam(); render(world, selected, now) } catch (e) { dbgNote('render', e); dbgPersist(world) } DBG.renderMs = DBG.renderMs * 0.9 + (performance.now() - r0) * 0.1;
    uiAcc += dt; if (uiAcc > 300) { uiAcc = 0; try { updateUI() } catch (e) { dbgNote('ui', e); dbgPersist(world) } }
    miniAcc += dt; if (miniAcc > 120) { miniAcc = 0; try { drawMinimap(world, selected) } catch (e) { dbgNote('minimap', e) } }
  } catch (e) { dbgNote('frame', e); dbgPersist(world) }
  finally { DBG.frameMs = DBG.frameMs * 0.9 + (performance.now() - ts) * 0.1; requestAnimationFrame(frame) }
}

/* once a second: live numbers, and the watchdog */
let wd = { tick: 0, changedAt: performance.now(), stage: 0 };
setInterval(() => {
  const nowT = performance.now(), dt = (nowT - lastDiag.t) / 1000; if (dt <= 0) return;
  DBG.fps = (frames - lastDiag.frames) / dt; DBG.tps = (world.tick - lastDiag.tick) / dt; lastDiag = { frames, t: nowT, tick: world.tick };
  if (++diagTimer % 10 === 0) world.profReset();
  try { updateDiag() } catch (e) { }
  const drawn = frames - (wd.fr || 0); wd.fr = frames;
  { const eff = DBG.tps / CFG.TPS; $('rate').textContent = speed > 0 && speed < 100 && eff < speed * 0.8 ? 'running at ' + (eff < 1 ? eff.toFixed(1) : Math.round(eff)) + '×' : pendingTicks > 0 ? 'stepping…' : '' }
  if (document.hidden) { wd.changedAt = nowT; wd.tick = world.tick; lastFrameAt = nowT; return }      // browsers pause hidden pages; that is not a freeze
  if (drawn === 0) {                                                // no frame was drawn this second
    wd.changedAt = nowT; wd.tick = world.tick; wd.stage = 0;       // nothing can move without frames, so this is never counted as the village freezing (an unfocused or covered window is throttled by the system)
    if (nowT - lastFrameAt > 4000) { lastFrameAt = nowT; if (document.hasFocus()) { DBG.restarts++; DBG.watchdog.push({ at: new Date().toISOString(), reason: 'frame loop stalled' }) } requestAnimationFrame(frame) }
    return;
  }
  if (world.tick !== wd.tick) { wd.tick = world.tick; wd.changedAt = nowT; wd.stage = 0 }
  else if (speed > 0 && nowT - wd.changedAt > 8000) {               // frames are drawn but the village has not moved
    const reason = 'simulation made no progress for ' + Math.round((nowT - wd.changedAt) / 1000) + ' s (stage ' + (wd.stage + 1) + ')'; DBG.restarts++; DBG.watchdog.push({ at: new Date().toISOString(), reason }); dbgNote('watchdog', new Error(reason));
    try { if (wd.stage === 0) { world.sanity(); for (const v of world.vills) { try { v.abort(0) } catch (e) { } } }      // 1st: repair numbers and reset every job
      else if (wd.stage === 1) { saveToStorage(false); if (loadFromStorage()) saveInfo('The village stopped responding, so it was reloaded from the last autosave.') }   // 2nd: reload the last autosave
    } catch (e) { dbgNote('recover', e) }
    wd.stage = Math.min(2, wd.stage + 1); wd.changedAt = nowT; dbgPersist(world);
  }
}, 1000);
addEventListener('error', e => { dbgNote('window', e.error || new Error(e.message)); if (world) dbgPersist(world) });
addEventListener('unhandledrejection', e => { dbgNote('promise', e.reason); if (world) dbgPersist(world) });

window.__sim = { get world() { return world }, select(o) { selected = o; updateUI() }, newWorld, setSpeed, saveToStorage, loadFromStorage, run(n) { for (let i = 0; i < n; i++) world.step() }, R, MIND, DBG, dbgReport: () => dbgReport(world, speed) };
dbgLoadPrevious();
initStatsUI(); concernsInit(); voicesInit(); voicesAiInit(); newWorld((Math.random() * 1e9) | 0); mindInit(); requestAnimationFrame(frame);
{
  const m = readMeta();
  if (m) {
    $('loadSave').disabled = false; let resumed = false;
    if ($('autoresume').checked) { autosaveOn = false; resumed = loadFromStorage(); if (resumed) { autosaveOn = true; setSpeed(m.speed > 0 ? m.speed : 10); saveInfo('Resumed your saved village automatically: ' + metaText(m) + '.') } }
    if (!resumed) { autosaveOn = false; setSpeed(0); $('resumeInfo').textContent = metaText(m) + (m.savedAt ? ' · saved ' + new Date(m.savedAt).toLocaleString() : ''); $('resume').style.display = 'flex'; saveInfo('A saved village is waiting: ' + metaText(m) + '.') }
  }
}
