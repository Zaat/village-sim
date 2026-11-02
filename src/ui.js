'use strict';
/* ==========================================================================
   ui.js — input, panels, the optional Claude narrator, and the main loop.
   ========================================================================== */
const $ = id => document.getElementById(id);
let world = null, selected = null, speed = 10, follow = false;
const keys = {};
const ROLE_COL = { farmer: '#d8b84a', woodcutter: '#b0562a', miner: '#8a929a', builder: '#e8a03a', hunter: '#3f7d4a', fisher: '#4aa3d8' };

/* ---------- Claude narrator (hybrid mode: OFF by default) ----------
   The simulation runs entirely on rules. When this toggle is on, the page asks
   Claude only for notable moments: a season chronicle, big events, and the
   occasional conversation between two curious villagers. Rate-limited. */
const NAR = { on: false, sample: null, ready: false, busy: false, backoff: 0, count: 0, MAX: 40, last: {}, entries: [] };
const NAR_GAP = { season: 20000, event: 20000, chat: 45000, death: 60000, birth: 90000 };
async function narInit() {
  try { NAR.sample = (typeof claude !== 'undefined' && claude.use) ? await claude.use('sample') : null } catch (e) { NAR.sample = null }
  NAR.ready = !!NAR.sample; $('narToggle').disabled = !NAR.ready;
  $('narStatus').textContent = NAR.ready ? 'Off by default. When on, Claude writes occasional chronicle entries and villager conversations (up to ' + NAR.MAX + ' per session).' : 'Not available here. It works on the published page, where Claude can be called.';
}
function narSummary(w) {
  const recent = w.log.slice(0, 8).map(l => l.text).reverse().join(' ');
  const pick = w.vills.filter(v => !v.isChild()).sort(() => Math.random() - 0.5).slice(0, 3).map(v => `${v.name} (${v.role || 'villager'}; ${v.traitWords().join(', ') || 'even-tempered'})`).join('; ');
  return `Year ${w.year}, ${SEASONS[w.season]}, day ${w.seasonDay} of the season. Population ${w.vills.length} (${w.vills.filter(v => v.isChild()).length} children). Stores: food ${w.stock.food}, firewood ${w.stock.wood}, stone ${w.stock.stone}. ${w.houses().length} cabins, ${w.of('farm').length} fields. Wolves nearby: ${w.animals.some(a => a.kind === 'wolf' && a.alive) ? 'yes' : 'no'}. Recent happenings: ${recent}. Some villagers: ${pick}.`;
}
async function narrate(kind, text, data) {
  if (!NAR.on || !NAR.sample || NAR.busy || Date.now() < NAR.backoff || NAR.count >= NAR.MAX) return;
  const gap = NAR_GAP[kind] || 30000, now = Date.now(); if (now - (NAR.last[kind] || 0) < gap) return;
  if (kind === 'death' || kind === 'birth') { if (Math.random() > 0.35) return }
  let prompt, tag;
  const sum = narSummary(world);
  if (kind === 'chat') {
    const { a, b } = data; tag = `${a.name} & ${b.name}`;
    prompt = `You voice characters in a small medieval village simulation. ${sum}\n\nWrite a short overheard conversation between ${a.name} (${a.traitWords().join(', ')}, ${a.role || 'villager'}) and ${b.name} (${b.traitWords().join(', ')}, ${b.role || 'villager'}). They are curious people talking about something real in their world (the season, the stars, a better way to farm or build, the wolves, what lies beyond the hills). 3 to 4 lines, formatted "Name: line", each under 22 words. Show their personalities. Output only the dialogue.`;
  } else {
    tag = kind === 'season' ? SEASONS[world.season] + ', Year ' + world.year : (text || kind);
    prompt = `You are the chronicler of a small medieval village in a simulation. ${sum}\n\nWhat just happened: ${text || 'The season changed to ' + SEASONS[world.season] + '.'}\n\nWrite 2 to 3 vivid sentences (under 60 words) for the village chronicle about this moment. Stay faithful to the facts above; do not invent numbers or named characters beyond those given. Output only the entry.`;
  }
  NAR.busy = true; NAR.last[kind] = now; NAR.count++;
  $('narStatus').textContent = 'Claude is writing… (' + NAR.count + '/' + NAR.MAX + ')';
  try {
    const r = await NAR.sample(prompt, { modelTier: 'quick' });
    NAR.entries.unshift({ tag, text: (r.text || '').trim(), day: world.day, kind }); if (NAR.entries.length > 30) NAR.entries.pop();
    $('narStatus').textContent = 'On · ' + NAR.count + '/' + NAR.MAX + ' used this session.'; renderChron();
  } catch (e) {
    const code = e && e.code;
    if (code === 'not_granted') { NAR.on = false; $('narToggle').checked = false; $('narLabel').textContent = 'Off — uses your Claude usage when on'; $('narStatus').textContent = 'Permission was not granted, so the narrator is off.' }
    else if (code === 'rate_limited') { NAR.backoff = Date.now() + 180000; $('narStatus').textContent = 'Rate limited; pausing for a few minutes.' }
    else $('narStatus').textContent = 'The narrator hit an error and skipped this one.';
  } finally { NAR.busy = false }
}
function renderChron() { $('chron').innerHTML = NAR.entries.map(e => `<div>${escapeHtml(e.text).replace(/\n/g, '<br>')}<small>Day ${e.day} · ${escapeHtml(e.tag)}</small></div>`).join('') }
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
$('narToggle').addEventListener('change', e => {
  NAR.on = e.target.checked && NAR.ready; $('narLabel').textContent = NAR.on ? 'On — Claude narrates notable moments' : 'Off — uses your Claude usage when on';
  $('narStatus').textContent = NAR.on ? 'On · ' + NAR.count + '/' + NAR.MAX + ' used this session.' : 'Off. No Claude calls are being made.';
  if (NAR.on) narrate('season', 'The narrator begins keeping the chronicle.');
});

/* ---------- world lifecycle ---------- */
function newWorld(seed) {
  seed = seed >>> 0; $('seed').value = seed; world = new World(seed); selected = null; follow = false; R.terrKey = '';
  world.listeners.push((type, text, data) => { if (type === 'season' && data) narrate('season', 'The season turned to ' + SEASONS[data.season] + '.'); else narrate(type, text, data) });
  R.cam.x = (world.cx + 1) * CFG.T; R.cam.y = (world.cy + 1) * CFG.T; R.cam.z = Math.max(1.4, Math.min(3, R.vw / 420)); clampCam(); updateUI();
}

/* ---------- panels ---------- */
function bar(label, val, col) { return `<div class="hint">${label} ${Math.round(val)}</div><div class="bar"><i style="width:${clamp(val, 0, 100)}%;background:${col}"></i></div>` }
function resRow(name, val, cap, col) { return `<div class="res"><span class="hint">${name}</span><div class="bar"><i style="width:${clamp(val / cap * 100, 0, 100)}%;background:${col}"></i></div><b>${val} / ${cap}</b></div>` }
function skillWord(s) { return s > 0.7 ? 'expert' : s > 0.45 ? 'skilled' : s > 0.2 ? 'capable' : 'novice' }
function updateUI() {
  const w = world, hrs = (6 + w.tod * 24) % 24, hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60), s = w.season;
  $('hudDate').textContent = `Year ${w.year} · ${SEASONS[s]} · Day ${w.seasonDay}`;
  $('hudTime').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${w.isNight() ? ' ☾' : ''}${w.cold ? ' · freezing' : w.festival ? ' · festival' : w.harsh && s === 3 ? ' · harsh winter' : w.drought && s === 1 ? ' · drought' : ''}`;
  const kids = w.vills.filter(v => v.isChild()).length, cap = w.cap(), an = {}; for (const a of w.animals) if (a.alive) an[a.kind] = (an[a.kind] || 0) + 1;
  const roles = {}; for (const v of w.vills) if (!v.isChild()) roles[v.role || 'forager'] = (roles[v.role || 'forager'] || 0) + 1;
  $('statCard').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline"><div class="big">Population ${w.vills.length}</div><div class="hint">${kids} children</div></div>
    ${resRow('Food', w.stock.food, cap, '#e0a458')}${resRow('Wood', w.stock.wood, cap, '#a8743c')}${resRow('Stone', w.stock.stone, cap, '#9aa3ab')}
    <div class="grid" style="margin-top:6px"><div><span>Cabins</span> ${w.houses().length} (${w.houses().length * CFG.HOUSE_CAP} beds)</div><div><span>Fields</span> ${w.of('farm').length}</div><div><span>Storehouses</span> ${w.of('store').length}</div><div><span>Roads</span> ${w.road.reduce((a, b) => a + b, 0)}</div>
    <div><span>Deer</span> ${an.deer || 0}</div><div><span>Wolves</span> ${an.wolf || 0}</div></div>
    <div class="chips">${Object.entries(roles).map(([r, n]) => `<span class="chip"><i style="background:${ROLE_COL[r] || '#888'}"></i>${r} ${n}</span>`).join('')}</div>`;
  $('log').innerHTML = w.log.slice(0, 50).map(l => `<div><b>D${l.day}</b>${escapeHtml(l.text)}</div>`).join('');
  updateInspector(); drawChart();
}
function updateInspector() {
  const w = world, s = selected, el = $('sel');
  if (s instanceof Villager && s.alive) {
    const friends = w.vills.filter(o => o !== s).map(o => ({ o, r: w.getRel(s, o) })).filter(x => x.r > 0).sort((a, b) => b.r - a.r).slice(0, 3);
    const home = s.home != null ? w.buildings.get(s.home) : null, sk = Object.entries(s.skill).filter(([, v]) => v > 0.2).sort((a, b) => b[1] - a[1]).slice(0, 3);
    el.innerHTML = `<h3>Villager</h3><div class="big">${s.name}</div><div class="hint">${s.sex === 'f' ? 'Woman' : 'Man'}${s.isChild() ? ' (child)' : ''} · age ${s.age.toFixed(1)} days · ${s.isChild() ? 'child' : (s.role || 'forager')}${s.preg > 0 ? ' · expecting' : ''}</div>
      <div class="tags">${s.traitWords().map(t => `<span class="tag">${t}</span>`).join('') || '<span class="tag">Even-tempered</span>'}</div>
      <div style="margin-bottom:6px">${escapeHtml(s.label)}${s.carry ? ' · carrying ' + s.carry.amt + ' ' + s.carry.kind : ''}</div>
      ${bar('Hunger (full)', s.hunger, '#e0a458')}${bar('Energy', s.energy, '#6a8fd0')}${bar('Social', s.social, '#d77a8f')}${bar('Health', s.health, '#8fd18b')}
      <div class="hint">Skills: ${sk.length ? sk.map(([k, v]) => k + ' (' + skillWord(v) + ')').join(', ') : 'still learning'}</div>
      <div class="hint">Home: ${home ? 'cabin at ' + home.x + ',' + home.y : 'none'}</div>
      <div class="hint">Closest: ${friends.length ? friends.map(f => f.o.name + ' (' + Math.round(f.r) + ')').join(', ') : 'nobody yet'}</div>`;
  } else if (s instanceof Animal && s.alive) {
    el.innerHTML = `<h3>Animal</h3><div class="big">${s.kind === 'wolf' ? 'Wolf' : s.kind === 'deer' ? (s.sex === 'm' ? 'Stag' : 'Deer') : 'Rabbit'}</div><div class="hint">${s.kind === 'wolf' ? 'A predator. Hunters and brave villagers will fight it; others flee.' : 'Wild game. Hunters track it for food.'} Health ${Math.max(0, Math.round(s.hp))}.</div>`;
  } else if (s && s.type && s.w) {
    const names = { house: 'Cabin', farm: 'Field', store: 'Storehouse', campfire: 'Village campfire' };
    let extra = ''; if (s.type === 'house') extra = `Sleeps ${s.occ.length} of ${CFG.HOUSE_CAP}: ${s.occ.map(id => (w.vills.find(v => v.id === id) || {}).name).filter(Boolean).join(', ') || 'empty'}`; if (s.type === 'farm') extra = ['Bare soil, waiting to be sown.', 'Crops growing: ' + Math.round(s.g * 100) + '%.', 'Ripe and ready to harvest.'][s.state]; if (s.type === 'store') extra = 'Raises the village storage limit.';
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
window.__sim = { get world() { return world }, newWorld, setSpeed, run(n) { for (let i = 0; i < n; i++) world.step() }, R, NAR };
newWorld((Math.random() * 1e9) | 0); narInit(); requestAnimationFrame(frame);
