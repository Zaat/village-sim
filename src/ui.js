'use strict';
/* ==========================================================================
   ui.js — input, panels, settings, the optional Claude counsel, main loop.
   ========================================================================== */
const $ = id => document.getElementById(id);
let world = null, selected = null, speed = 10, follow = false;
const keys = {};
const ROLE_COL = { farmer: '#d8b84a', woodcutter: '#b0562a', miner: '#8a929a', builder: '#e8a03a', hunter: '#3f7d4a', fisher: '#4aa3d8' };
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
  const prompt = `You are the deliberative mind of a small village council in a simulation. Decide what the council actually does, in character, from the members' personalities and opinions.\n\nSituation: ${req.topic}\n\nVillage: ${req.state}\n\nCouncil members:\n${req.members.map(m => `- ${m.name} (${m.title}; ${m.traits}${m.group ? '; belongs to ' + m.group : ''}) opinions on a -1..+1 scale: growth ${f(m.op.growth)}, leisure ${f(m.op.labor)}, strict law ${f(m.op.law)}, watch/defense ${f(m.op.defense)}`).join('\n')}\n\nEarlier decisions and how they turned out:\n${req.history.length ? req.history.join('\n') : '(none yet)'}\n\nOptions (choose exactly one id):\n${req.options.map(o => `- ${o.id}: ${o.text}`).join('\n')}\n\nReply with ONLY compact JSON in this form: {"choice":"<one option id>","speeches":[{"who":"<council member name>","line":"<under 25 words, in their voice>"}],"reason":"<one short sentence>"}. Give 2 to 4 speeches that reflect real disagreement where the members' views differ. Pick the option this particular group would most plausibly choose; do not invent options or names.`;
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
const SETTING_DEFAULTS = { survival: false, disasters: true, crime: true };
function loadSettings() { let s = {}; try { s = JSON.parse(localStorage.getItem('villagesim.settings') || '{}') } catch (e) { } return { ...SETTING_DEFAULTS, ...s } }
function saveSettings() { try { localStorage.setItem('villagesim.settings', JSON.stringify(world.settings)) } catch (e) { } }
for (const k of Object.keys(SETTING_DEFAULTS)) $('set_' + k).addEventListener('change', e => { world.settings[k] = e.target.checked; saveSettings() });

/* ---------- world lifecycle ---------- */
function adoptWorld(w) {
  world = w; world.mind = mindApi; selected = null; follow = false; R.terrKey = '';
  for (const k of Object.keys(SETTING_DEFAULTS)) $('set_' + k).checked = !!world.settings[k];
  R.cam.x = (world.cx + 1) * CFG.T; R.cam.y = (world.cy + 1) * CFG.T; R.cam.z = Math.max(1.4, Math.min(3, R.vw / 420)); clampCam(); updateUI();
}
function newWorld(seed) { seed = seed >>> 0; $('seed').value = seed; adoptWorld(new World(seed, loadSettings())) }

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
    const json = JSON.stringify(serializeWorld(world)), meta = saveMeta(world);
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
setInterval(() => { if (autosaveOn && $('autosave').checked && speed >= 0) saveToStorage(false) }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && autosaveOn && $('autosave').checked) saveToStorage(false) });
addEventListener('pagehide', () => { if (autosaveOn && $('autosave').checked) saveToStorage(false) });

/* ---------- panels ---------- */
function bar(label, val, col) { return `<div class="hint">${label} ${Math.round(val)}</div><div class="bar"><i style="width:${clamp(val, 0, 100)}%;background:${col}"></i></div>` }
function resRow(name, val, cap, col) { return `<div class="res"><span class="hint">${name}</span><div class="bar"><i style="width:${clamp(val / cap * 100, 0, 100)}%;background:${col}"></i></div><b>${val} / ${cap}</b></div>` }
function opBar(label, v) { const a = Math.abs(v) * 50; return `<div class="opr"><span>${label}</span><div class="opb"><i style="left:${v < 0 ? 50 - a : 50}%;width:${a}%;background:${v < 0 ? '#6a8fd0' : '#e0a458'}"></i></div></div>` }
function skillWord(s) { return s > 0.7 ? 'expert' : s > 0.45 ? 'skilled' : s > 0.2 ? 'capable' : 'novice' }
function moodWord(m) { return m > 80 ? 'joyful' : m > 62 ? 'content' : m > 42 ? 'uneasy' : m > 25 ? 'unhappy' : 'miserable' }
function nameOf(id) { const v = world.vills.find(x => x.id === id); return v ? v.name : null }
function updateUI() {
  const w = world, hrs = (6 + w.tod * 24) % 24, hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60), s = w.season;
  $('hudDate').textContent = `Year ${w.year} · ${SEASONS[s]} · Day ${w.seasonDay}`;
  $('hudTime').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${w.isNight() ? ' ☾' : ''}${w.cold ? ' · freezing' : w.festival ? ' · ' + w.holiday : w.harsh && s === 3 ? ' · harsh winter' : w.drought && s === 1 ? ' · drought' : ''}`;
  const cap = w.cap(), an = {}; for (const a of w.animals) if (a.alive) an[a.kind] = (an[a.kind] || 0) + 1;
  const stg = {}; for (const v of w.vills) stg[v.stage()] = (stg[v.stage()] || 0) + 1;
  const roles = {}; for (const v of w.vills) if (v.age >= CFG.CHILD_DAYS && !v.isElder()) roles[v.role || 'forager'] = (roles[v.role || 'forager'] || 0) + 1;
  const ad = w.vills.filter(v => v.isAdult()), mood = ad.length ? ad.reduce((a, v) => a + v.mood, 0) / ad.length : 0;
  $('statCard').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline"><div class="big">Population ${w.vills.length}</div><div class="hint">mood ${moodWord(mood)}</div></div>
    <div class="hint" style="margin-bottom:4px">${stg.infant || 0} infants · ${stg.child || 0} children · ${stg.youth || 0} youths · ${stg.adult || 0} adults · ${stg.elder || 0} elders</div>
    ${resRow('Food', w.stock.food, cap, '#e0a458')}${resRow('Wood', w.stock.wood, cap, '#a8743c')}${resRow('Stone', w.stock.stone, cap, '#9aa3ab')}
    <div class="grid" style="margin-top:6px"><div><span>Cabins</span> ${w.houses().length} (${w.houses().length * CFG.HOUSE_CAP} beds)</div><div><span>Fields</span> ${w.of('farm').length}</div><div><span>Storehouses</span> ${w.of('store').length}</div><div><span>Roads</span> ${w.road.reduce((a, b) => a + b, 0)}</div>
    <div><span>Deer</span> ${an.deer || 0}</div><div><span>Wolves</span> ${an.wolf || 0}</div></div>
    <div class="chips">${Object.entries(roles).map(([r, n]) => `<span class="chip"><i style="background:${ROLE_COL[r] || '#888'}"></i>${r} ${n}</span>`).join('')}</div>`;
  renderCouncil(); renderGroups();
  $('log').innerHTML = w.log.slice(0, 60).map(l => `<div><b>D${l.day}</b>${escapeHtml(l.text)}</div>`).join('');
  updateInspector(); drawChart();
}
function renderCouncil() {
  const w = world, g = w.gov, el = $('councilCard');
  const meters = ISSUES.map(k => { const p = g.policy[k], t = ISSUE_TXT[k]; return `<div class="pol"><div class="polh"><span>${t.name}</span><span class="hint">${p === 0 ? 'balanced' : (p > 0 ? 'leans: ' : 'leans: ') + (p > 0 ? t.hi : t.lo)}</span></div><div class="polb"><i class="mid"></i><i class="dot" style="left:${(p + 1) / 2 * 100}%"></i></div></div>` }).join('');
  const mem = councilMembers(w).map(m => { const gr = w.groups.find(x => x.id === m.v.group); return `<span class="chip" title="${escapeHtml(m.v.traitWords().join(', '))}"><i style="background:${gr ? gr.color : '#555'}"></i>${m.title}: ${escapeHtml(m.v.name)}</span>` }).join('');
  const dec = g.decisions.slice(0, 4).map(d => `<div><b>D${d.day}</b>${escapeHtml(d.text)}${d.source === 'claude' ? ' <span class="cl">Claude</span>' : ''}</div>`).join('');
  el.innerHTML = g.council.length ? `<div class="chips" style="margin:0 0 6px">${mem}</div><div class="hint" style="margin-bottom:4px">Approval ${Math.round(g.approval)}% · term ends day ${g.termEnd} · ${g.elections} election${g.elections === 1 ? '' : 's'} held${g.welfare ? ' · food relief' : ''}${g.mediation ? ' · mediation' : ''}</div>${meters}<div class="declog">${dec || '<span class="hint">No decisions yet.</span>'}</div>`
    : `<div class="hint">No council yet. When the village has enough adults (8+), they will hold an election.</div>`;
}
function renderGroups() {
  const w = world, el = $('groupCard');
  if (!w.groups.length) { el.innerHTML = '<div class="hint">No lasting social circles yet. They form as friendships deepen.</div>'; return }
  el.innerHTML = w.groups.map(g => {
    const ally = w.groups.filter(h => h !== g && (g.stance[h.id] || 0) >= 0.3).map(h => h.name), riv = w.groups.filter(h => h !== g && (g.stance[h.id] || 0) <= -0.3).map(h => h.name);
    const ld = nameOf(g.leader), top = ISSUES.map(k => ({ k, v: g.op[k] })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
    return `<div class="grp"><span class="dot" style="background:${g.color}"></span><b>${escapeHtml(g.name)}</b> <span class="hint">${g.members.length} members${ld ? ' · led by ' + escapeHtml(ld) : ''}</span>
      <div class="hint">Cares most about: ${top && Math.abs(top.v) > 0.15 ? escapeHtml(motionText(top.k, Math.sign(top.v))) : 'no strong cause'}</div>${ally.length ? `<div class="hint">Friendly with ${escapeHtml(ally.join(', '))}</div>` : ''}${riv.length ? `<div class="hint">Rivals: ${escapeHtml(riv.join(', '))}</div>` : ''}</div>`;
  }).join('');
}
function updateInspector() {
  const w = world, s = selected, el = $('sel');
  if (s instanceof Villager && s.alive) {
    const friends = w.vills.filter(o => o !== s).map(o => ({ o, r: w.getRel(s, o) })).filter(x => Math.abs(x.r) > 15).sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 4);
    const home = s.home != null ? w.buildings.get(s.home) : null, sk = Object.entries(s.skill).filter(([, v]) => v > 0.2).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const gr = w.groups.find(x => x.id === s.group), tt = titleOf(w, s), ptn = s.partner != null ? nameOf(s.partner) : null;
    el.innerHTML = `<h3>Villager</h3><div class="big">${escapeHtml(s.name)} <span class="hint">of House ${escapeHtml(s.family)}</span></div>
      <div class="hint">${s.sex === 'f' ? 'Woman' : 'Man'} · ${s.stage()} · age ${s.age.toFixed(0)} days${tt ? ' · council ' + tt : ''}${s.role && !s.isChild() ? ' · ' + s.role : ''}${s.preg > 0 ? ' · expecting' : ''}</div>
      <div class="tags">${s.traitWords().map(t => `<span class="tag">${t}</span>`).join('') || '<span class="tag">Even-tempered</span>'}${gr ? `<span class="tag" style="border-color:${gr.color}">${escapeHtml(gr.name)}</span>` : ''}</div>
      <div style="margin-bottom:6px">${escapeHtml(s.label)}${s.carry ? ' · carrying ' + s.carry.amt + ' ' + s.carry.kind : ''}</div>
      ${bar('Mood (' + moodWord(s.mood) + ')', s.mood, '#c678dd')}${bar('Hunger (full)', s.hunger, '#e0a458')}${bar('Energy', s.energy, '#6a8fd0')}${bar('Health', s.health, '#8fd18b')}
      ${s.desire ? `<div class="hint" style="margin:4px 0"><b>Dreams</b> ${escapeHtml(s.desireText())}</div>` : ''}
      <div class="hint">Partner: ${ptn ? escapeHtml(ptn) : 'none'} · children: ${s.kids.length} · home: ${home ? 'cabin at ' + home.x + ',' + home.y : 'none'}</div>
      <div class="hint">Skills: ${sk.length ? sk.map(([k, v]) => k + ' (' + skillWord(v) + ')').join(', ') : 'still learning'}</div>
      <div class="hint">Bonds: ${friends.length ? friends.map(f => escapeHtml(f.o.name) + ' ' + (f.r > 0 ? '+' : '') + Math.round(f.r)).join(', ') : 'none yet'}</div>
      ${s.isChild() ? '' : `<div class="opinions"><div class="hint">Opinions</div>${opBar('Growth', s.op.growth)}${opBar('Leisure', s.op.labor)}${opBar('Strict law', s.op.law)}${opBar('Watch', s.op.defense)}</div>`}
      <div class="story"><div class="hint">Life story</div>${s.bio.slice(-8).reverse().map(b => `<div><b>D${b.day}</b>${escapeHtml(b.text)}</div>`).join('') || '<div class="hint">Just beginning.</div>'}</div>`;
  } else if (s instanceof Animal && s.alive) {
    el.innerHTML = `<h3>Animal</h3><div class="big">${s.kind === 'wolf' ? 'Wolf' : s.kind === 'deer' ? (s.sex === 'm' ? 'Stag' : 'Deer') : 'Rabbit'}</div><div class="hint">${s.kind === 'wolf' ? 'A predator. Hunters and brave villagers will fight it; others flee.' : 'Wild game. Hunters track it for food.'} Health ${Math.max(0, Math.round(s.hp))}.</div>`;
  } else if (s && s.type && s.w) {
    const names = { house: 'Cabin', farm: 'Field', store: 'Storehouse', campfire: 'Village campfire' };
    let extra = ''; if (s.type === 'house') extra = `Sleeps ${s.occ.length} of ${CFG.HOUSE_CAP}: ${s.occ.map(nameOf).filter(Boolean).join(', ') || 'empty'}`; if (s.type === 'farm') extra = ['Bare soil, waiting to be sown.', 'Crops growing: ' + Math.round(s.g * 100) + '%.', 'Ripe and ready to harvest.'][s.state]; if (s.type === 'store') extra = 'Raises the village storage limit.'; if (s.type === 'campfire') extra = 'Where the village gathers, and where the council meets.';
    el.innerHTML = `<h3>Building</h3><div class="big">${names[s.type] || s.type}</div><div class="hint">${extra}</div>`;
  } else { el.innerHTML = '<h3>Inspector</h3><div class="hint">Click a villager, animal or building on the map.</div>'; if (s && ((s instanceof Villager) || (s instanceof Animal))) selected = null }
}
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
  const p = screenToWorld(sx, sy), T = CFG.T, rad = Math.max(11, 16 / R.cam.z); let best = null, bd = rad;
  for (const v of world.vills) { const d = Math.hypot(v.x * T - p.x, v.y * T - 6 - p.y); if (d < bd) { bd = d; best = v } }
  for (const a of world.animals) if (a.alive) { const d = Math.hypot(a.x * T - p.x, a.y * T - 5 - p.y); if (d < bd) { bd = d; best = a } }
  if (!best) { const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T); if (tx >= 0 && ty >= 0 && tx < CFG.W && ty < CFG.H) { const id = world.bmap[ty * CFG.W + tx], b = id ? world.buildings.get(id) : null; if (b) best = b; else { const t2 = Math.floor((p.y + 14) / T), id2 = world.bmap[t2 * CFG.W + tx]; if (id2) best = world.buildings.get(id2) } } }
  selected = best; if (!best) follow = false; updateUI();
}
const mini = $('mini');
function miniGo(e) { const r = mini.getBoundingClientRect(); R.cam.x = (e.clientX - r.left) / r.width * CFG.W * CFG.T; R.cam.y = (e.clientY - r.top) / r.height * CFG.H * CFG.T; follow = false; clampCam() }
mini.addEventListener('pointerdown', e => { mini.setPointerCapture(e.pointerId); miniGo(e); mini._d = true }); mini.addEventListener('pointermove', e => { if (mini._d) miniGo(e) }); mini.addEventListener('pointerup', () => mini._d = false);
function setSpeed(s) { speed = s; document.querySelectorAll('[data-sp]').forEach(b => b.classList.toggle('on', +b.dataset.sp === s)) }
document.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => setSpeed(+b.dataset.sp));
$('zin').onclick = () => zoomAt(1.3, R.vw / 2, R.vh / 2); $('zout').onclick = () => zoomAt(1 / 1.3, R.vw / 2, R.vh / 2);
$('fol').onclick = () => { follow = !follow && !!selected; $('fol').classList.toggle('on', follow) };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return; keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') { e.preventDefault(); setSpeed(speed === 0 ? 10 : 0) }
  const m = { '1': 1, '2': 3, '3': 10, '4': 30 }[e.key]; if (m) setSpeed(m);
  if (e.key === '+' || e.key === '=') zoomAt(1.2, R.vw / 2, R.vh / 2); if (e.key === '-') zoomAt(1 / 1.2, R.vw / 2, R.vh / 2);
  if (e.key.toLowerCase() === 'f') $('fol').click(); if (e.key === 'Escape') { selected = null; follow = false; updateUI() }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false });
addEventListener('resize', () => { resizeRender(); clampCam() });
$('restart').onclick = () => { const v = $('seed').value.trim(); newWorld(v === '' || isNaN(+v) ? (Math.random() * 1e9) | 0 : +v) };
$('seed').addEventListener('keydown', e => { if (e.key === 'Enter') $('restart').click() });

/* ---------- main loop ---------- */
let last = performance.now(), acc = 0, uiAcc = 0, miniAcc = 0;
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  if (speed > 0) { acc += dt / 1000 * CFG.TPS * speed; let n = Math.floor(acc); acc -= n; const t0 = performance.now(); while (n-- > 0) { world.step(); if (performance.now() - t0 > 14) { acc = 0; break } } }
  const pan = 520 * dt / 1000 / R.cam.z, c = R.cam;
  if (keys['w'] || keys['arrowup']) { c.y -= pan; follow = false } if (keys['s'] || keys['arrowdown']) { c.y += pan; follow = false } if (keys['a'] || keys['arrowleft']) { c.x -= pan; follow = false } if (keys['d'] || keys['arrowright']) { c.x += pan; follow = false }
  if (follow && selected && selected.x !== undefined && selected.alive !== false) { const tx = selected.type ? (selected.x + selected.w / 2) * CFG.T : selected.x * CFG.T, ty = selected.type ? (selected.y + selected.h / 2) * CFG.T : selected.y * CFG.T; c.x += (tx - c.x) * 0.12; c.y += (ty - c.y) * 0.12 }
  clampCam(); render(world, selected, now);
  uiAcc += dt; if (uiAcc > 300) { uiAcc = 0; updateUI() } miniAcc += dt; if (miniAcc > 120) { miniAcc = 0; drawMinimap(world, selected) }
  requestAnimationFrame(frame);
}
window.__sim = { get world() { return world }, newWorld, setSpeed, saveToStorage, loadFromStorage, run(n) { for (let i = 0; i < n; i++) world.step() }, R, MIND };
newWorld((Math.random() * 1e9) | 0); mindInit(); requestAnimationFrame(frame);
{ const m = readMeta(); if (m) { autosaveOn = false; setSpeed(0); $('loadSave').disabled = false; $('resumeInfo').textContent = metaText(m) + (m.savedAt ? ' · saved ' + new Date(m.savedAt).toLocaleString() : ''); $('resume').style.display = 'flex'; saveInfo('A saved village is waiting: ' + metaText(m) + '.') } }
