/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   playui.js — the Play screen (v0.35). Watch mode is untouched; Play adds a toolbar, orders, building, roads and zones.
   The rules: a plain click or tap only ever selects and inspects. Orders go to the "group" (villagers picked with a click,
   shift-click or a box) and are given with a right-click, a long-press, an order button in the inspector or the command bar.
   Build, Road and Zone are explicit tools: leave them with Esc, a right-click, or by tapping Select.
   The simulation side lives in play.js; this file only turns clicks into calls to it.
   ========================================================================== */
const PU = { tool: 'select', type: 'house', zone: 'home', brush: 1, sel: [], hover: null, paint: null, box: null, panel: null, pan: false, hold: null, note: '', noteT: 0, menu: null, ok: null, fx: [] };
const PU_NAMES = { house: 'House', farm: 'Farm', store: 'Store', workshop: 'Workshop', logcamp: 'Logging camp', minecamp: 'Mining camp', lodge: 'Hunting lodge', market: 'Market', plaza: 'Plaza', tavern: 'Tavern' };
const puIc = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const PU_ZCOL = { home: '229,192,123', farm: '152,195,121', work: '97,175,239', civic: '198,120,221' };
const PU_ROLES = [['builder', 'Builder'], ['farmer', 'Farmer'], ['woodcutter', 'Woodcutter'], ['miner', 'Miner'], ['hunter', 'Hunter'], ['fisher', 'Fisher']];
const puOn = () => !!(world && world.play && world.play.on);
const puTile = (sx, sy) => { const p = screenToWorld(sx, sy), T = CFG.T; return { x: Math.floor(p.x / T), y: Math.floor(p.y / T), px: p.x, py: p.y } };
const puIn = (x, y) => x >= 0 && y >= 0 && x < CFG.W && y < CFG.H;
const puGroup = () => (PU.sel = PU.sel.filter(v => v.alive && world.vills.includes(v)));
const puAdults = () => puGroup().filter(v => !v.isChild());
function puNote(t) { PU.note = t; PU.noteT = performance.now(); const el = $('pnote'); if (el) { el.textContent = t; el.style.opacity = 1; clearTimeout(PU._nt); PU._nt = setTimeout(() => { el.style.opacity = 0 }, 3200) } }

/* ---------- the mode ---------- */
function puMode(on) {
  if (!world) return; playSet(world, 'on', on); if (!on) { puPendClear(); PU.tool = 'select'; PU.panel = null; PU.sel = []; PU.menu = null; PU.hover = null; PU.ok = null; puGhostTip() }
  document.body.classList.toggle('playing', !!on); $('ptool').scrollLeft = 0; puRefresh(); if (typeof updateUI === 'function') updateUI();
  if (on) { if (!world.play.auto.build && typeof tipShow === 'function') tipShow('playmode', '<b>You are in charge.</b> The council has stopped building: you place the buildings, roads and fields (Build B, Road R, Zone Z in the bar below) or give villagers orders. Research and jobs stay automatic until you switch them in Village plan. Switch back to Watch and the council takes over again; your choices are kept.', true) }
  else if (typeof tipHide === 'function') tipHide();
}
function puWorld() { PU.sel = []; PU.tool = 'select'; PU.panel = null; PU.menu = null; document.body.classList.toggle('playing', puOn()); puRefresh() }
function puPendClear() { PU.pend = false; PU.dragG = null; const c = $('pconf'); if (c) c.style.display = 'none' }
function puTool(t) { puPendClear(); PU.tool = t; PU.menu = null; PU.paint = null; PU.box = null; if (t !== 'build') { PU.ok = null; puGhostTip() } PU.panel = t === 'select' ? null : t; if (t === 'zone') PU.panel = 'zone'; puRefresh() }

/* ---------- giving orders ---------- */
function puOrder(o, label) {
  const ads = puAdults(); if (!ads.length) { puNote('Pick someone first: click a villager, or drag a box with Shift.'); return 0 }
  const n = playOrder(world, ads.map(v => v.id), o); if (n) { PU.fx.push({ x: (o.x != null ? o.x : ads[0].x) + 0.5, y: (o.y != null ? o.y : ads[0].y) + 0.5, t: performance.now() }); puNote(`${n} ${n === 1 ? 'villager' : 'villagers'}: ${label || o.label || 'ordered'}`) }
  puCmd(); updateUI(); return n;
}
/* what an object in the inspector (or a tile) would be ordered to */
function puTarget(s) {
  if (!world) return null;
  if (s && s.tile) return playOrderAt(world, s.x, s.y);
  if (s && s.type && s.w) { const b = world.buildings.get(s.id); if (b && b.maxHp !== undefined && b.hp < b.maxHp * 0.95 && b.type !== 'campfire') return { k: 'repair', id: b.id, x: b.x, y: b.y, label: 'Repair this' } }
  return null;
}
function puOrderButtons(s) {
  const n = puAdults().length; if (!n) return '';
  const o = puTarget(s), who = n === 1 ? puAdults()[0].name : n + ' villagers';
  let h = `<div class="pord"><div class="hint">Orders for ${escapeHtml(who)}</div><div class="btnrow">`;
  if (o) h += `<button class="on" data-pord="default">${escapeHtml(o.label)}</button>`;
  if (s && s.tile && (!o || o.k !== 'move') && world.terr[s.y * CFG.W + s.x] >= TERR.SAND) h += `<button data-pord="move">Go here</button>`;
  if (!o && !(s && s.tile)) h += `<span class="hint">Select the thing to work on: a tree, a rock, a site or a damaged building.</span>`;
  return h + '</div></div>';
}
function puInspect(el, s) { if (puOn()) { const html = puOrderButtons(s); if (html) el.insertAdjacentHTML('beforeend', html) } }
/* the inspector is rebuilt several times a second, so its buttons act on press and are found again each time (a click can fall between two rebuilds) */
function puTilePanel(w, s) {
  const i = s.y * CFG.W + s.x, f = w.feat[i], bp = w.bpAt.get(i), names = ['Deep water', 'Water', 'Sand', 'Grass', 'Forest floor', 'Rock', 'Peak'];
  const fn = f === FEAT.OAK ? 'An oak' : f === FEAT.PINE ? 'A pine' : f === FEAT.STONE ? 'A rock outcrop' : f === FEAT.BUSH ? 'A berry bush' : '', left = f ? ` · ${Math.round(w.res[i])} left` : '';
  let h = `<h3>Ground</h3><div class="big">${bp ? 'Building site: ' + escapeHtml(PU_NAMES[bp.type] || bp.type) : fn || (TERR_NAMES[w.terr[i]] || 'Ground')}</div><div class="hint">Tile ${s.x}, ${s.y}${fn && !bp ? left : ''}${w.road[i] ? ' · road' : ''}${w.play && w.play.zones[i] ? ' · ' + PLAY_ZONES[w.play.zones[i]] + ' zone' : ''}</div>`;
  if (bp) { const pct = bp.prog != null && bp.need ? Math.round(100 * bp.prog / bp.need) : 0; h += `<div class="hint">${bp.player ? 'Your site. ' : ''}${pct ? 'About ' + pct + '% built.' : 'Not started.'}</div>`; if (bp.player && !pct) h += `<div class="btnrow"><button data-pcancel="${bp.id}">Cancel this site</button></div>` }
  return h;
}
const TERR_NAMES = ['Deep water', 'Shallow water', 'Sand', 'Grass', 'Rock', 'Mountain', 'Ford', 'Bridge'];

/* ---------- the toolbar, panels and command bar ---------- */
function puRefresh() {
  const on = puOn(), tb = $('ptool'); if (!tb) return; $('ptools').style.display = on ? 'inline-flex' : 'none';
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', (b.dataset.mode === 'play') === on));
  if (!on) { $('ppanel').style.display = 'none'; $('pcmd').style.display = 'none'; $('pmenu').style.display = 'none'; return }
  tb.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === PU.tool));
  tb.querySelectorAll('[data-auto]').forEach(b => { const v = world.play.auto[b.dataset.auto] !== false; b.classList.toggle('on', v); b.title = b.dataset.tip + (v ? ': the village plans this itself. Click to take over.' : ': you are in charge. Click to let the village plan it.') });
  const pb = $('ppan'); pb.classList.toggle('on', PU.pan); $('presearch').classList.toggle('on', PU.panel === 'research'); $('pcrowd').classList.toggle('on', PU.panel === 'crowd');
  puPanel(); puCmd();
}
function puCost(c) { return Object.entries(c).filter(([, n]) => n).map(([k, n]) => n + ' ' + k).join(' · ') }
function puPanel() {
  const el = $('ppanel'), w = world, p = PU.panel; if (!p || !puOn()) { el.style.display = 'none'; return } el.style.display = 'block'; let h = '';
  if (p === 'build') {
    h = '<div class="ph">Build <span class="hint">' + (PU.touch ? 'pick one, then tap the map. Drag the ghost, then press ✓.' : 'pick one, then click the map. Esc or right-click to stop.') + '</span></div><div class="pgrid">' + Object.keys(PLACE).map(t => {
      const sp = PLACE[t], lock = sp.tech && !w.has(sp.tech), tip = lock ? 'Needs ' + (TECHS[sp.tech] ? TECHS[sp.tech].name.toLowerCase() : sp.tech) : puCost(CFG.COST[t]);
      return `<button data-ptype="${t}" class="${PU.type === t ? 'on' : ''}" ${lock ? 'disabled' : ''} title="${escapeHtml(tip)}">${puIc(t)}<span>${PU_NAMES[t]}</span><small>${escapeHtml(tip)}</small></button>`
    }).join('') + '</div>';
    if (PU.ok && PU.hover) h += `<div class="hint" style="margin-top:6px">${PU.ok.ok ? (PU.touch ? 'Drag the ghost to move it, then press ✓.' : 'Click the green spot, or press Place.') : escapeHtml(PU.ok.why)}</div><div class="btnrow"><button id="pplace" ${PU.ok.ok ? '' : 'disabled'} class="on">Place here</button></div>`;
  } else if (p === 'road') {
    h = '<div class="ph">Roads <span class="hint">drag along the ground to lay a road. Costs 1 stone a tile. Use ✋ or hold Space to move the map.</span></div>';
  } else if (p === 'zone') {
    h = '<div class="ph">Zones <span class="hint">paint where the village should build. Drag on the map. ✋ or Space moves the map.</span></div><div class="pgrid">' + Object.keys(PLAY_ZONES).map(z => `<button data-pzone="${z}" class="${PU.zone === z ? 'on' : ''}" style="border-left:4px solid rgb(${PU_ZCOL[z]})">${PLAY_ZONES[z]}</button>`).join('') + `<button data-pzone="erase" class="${PU.zone === 'erase' ? 'on' : ''}">Erase</button></div>
      <div class="btnrow" style="margin-top:6px;align-items:center"><span class="hint">Brush</span>${[1, 2, 3, 5].map(n => `<button data-pbrush="${n}" class="${PU.brush === n ? 'on' : ''}">${n === 1 ? 'S' : n === 2 ? 'M' : n === 3 ? 'L' : 'XL'}</button>`).join('')}<button data-pclear style="margin-left:auto">Clear all</button></div>
      <div class="hint" style="margin-top:4px">${w.play.nz ? w.play.nz + ' tiles painted. ' : ''}Homes, farms, work buildings (stores, camps, workshops) and civic buildings (market, plaza, tavern) keep to their own zones when there is room.</div>`;
  } else if (p === 'research') {
    const av = techAvailable(w), cur = w.tech.focus;
    h = `<div class="ph">Research <span class="hint">${autoOn(w, 'research') ? 'The council also picks when you do not.' : 'You choose; the council waits.'}</span></div><div class="plist">` + (av.length ? av.map(id => `<button data-ptech="${id}" class="${cur === id ? 'on' : ''}"><b>${escapeHtml(TECHS[id].name)}</b><small>${escapeHtml(TECHS[id].branch)} · ${techCost(w, id)} knowledge</small><small>${escapeHtml(TECHS[id].desc || '')}</small></button>`).join('') : '<div class="hint">Nothing new to study right now.</div>') + '</div>';
  } else if (p === 'crowd') {
    const C = w.crowd, sh = w.play.share || { food: 0, wood: 0, stone: 0 }, n = C ? Math.round(C.n) : 0;
    h = `<div class="ph">The crowd <span class="hint">${n ? n + ' townsfolk who are not individually in play' : 'Appears once the town outgrows ' + CROWD.focus + ' villagers.'}</span></div>`;
    if (n) h += ['food', 'wood', 'stone'].map(k => `<div class="prow"><span>${k[0].toUpperCase() + k.slice(1)}</span><input type="range" min="0" max="80" step="5" value="${Math.round((sh[k] || 0) * 100)}" data-pshare="${k}"><b>${Math.round((sh[k] || 0) * 100)}%</b></div>`).join('') + `<div class="btnrow"><button data-pshare-auto class="${w.play.share ? '' : 'on'}">Let the town decide</button></div><div class="hint">The rest of the crowd works on crafts, trade and service.</div>`;
  }
  el.innerHTML = h;
  el.querySelectorAll('[data-ptype]').forEach(b => b.onclick = () => { PU.type = b.dataset.ptype; PU.ok = null; if (PU.pend && PU.hover) puGhostCheck(); else puPendClear(); puRefresh() });
  el.querySelectorAll('[data-pzone]').forEach(b => b.onclick = () => { PU.zone = b.dataset.pzone; puRefresh() });
  el.querySelectorAll('[data-pbrush]').forEach(b => b.onclick = () => { PU.brush = +b.dataset.pbrush; puRefresh() });
  el.querySelectorAll('[data-pclear]').forEach(b => b.onclick = () => { const all = Object.keys(w.play.zones).map(i => [i % CFG.W, (i / CFG.W) | 0]); playZone(w, all, null); puRefresh() });
  el.querySelectorAll('[data-ptech]').forEach(b => b.onclick = () => { const r = playResearch(w, b.dataset.ptech); puNote(r.ok ? 'Studying ' + TECHS[b.dataset.ptech].name : r.why); puRefresh(); updateUI() });
  el.querySelectorAll('[data-pshare]').forEach(r => r.oninput = () => { const s = Object.assign({ food: 0, wood: 0, stone: 0 }, w.play.share); s[r.dataset.pshare] = r.value / 100; playSet(w, 'share', s); r.nextElementSibling.textContent = Math.round(w.play.share[r.dataset.pshare] * 100) + '%' });
  el.querySelectorAll('[data-pshare-auto]').forEach(b => b.onclick = () => { playSet(w, 'share', null); puRefresh() });
  const pp = $('pplace'); if (pp) pp.onclick = () => puPlaceAt();
}
function puCmd() {
  const el = $('pcmd'), ads = puAdults(), g = puGroup();
  if (!puOn() || !g.length) { el.style.display = 'none'; return } el.style.display = 'flex';
  const order = g.filter(v => v.order).length, roles = [...new Set(g.map(v => v.roleLock ? v.role : null).filter(Boolean))];
  el.innerHTML = `<b>${g.length === 1 ? escapeHtml(g[0].name) : g.length + ' villagers'}</b>${ads.length < g.length ? '<span class="hint">(children cannot be ordered)</span>' : ''}
    <span class="sep"></span><button data-pk="wood" title="Cut wood">Wood</button><button data-pk="stone" title="Quarry stone">Stone</button><button data-pk="food" title="Pick berries">Berries</button><button data-pk="farm">Farm</button><button data-pk="hunt">Hunt</button><button data-pk="fish">Fish</button>
    <select data-prole title="Give a job that the village keeps"><option value="">Job…</option>${PU_ROLES.map(([r, n]) => `<option value="${r}">${n}</option>`).join('')}<option value="none">No fixed job</option></select>
    <button data-pk="free" ${order || roles.length ? '' : 'disabled'} title="Hand them back to the village">Free</button><button data-pk="clear" title="Stop selecting them">✕</button>`;
  el.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => {
    const k = b.dataset.pk, s = selected && selected.tile ? selected : null;
    if (k === 'clear') { PU.sel = []; puRefresh(); return }
    if (k === 'free') { puOrder({ k: 'free' }, 'handed back to the village'); puRefresh(); return }
    const o = { wood: { k: 'gather', kind: 'wood', label: 'Cut wood' }, stone: { k: 'gather', kind: 'stone', label: 'Quarry stone' }, food: { k: 'gather', kind: 'food', label: 'Pick berries' }, farm: { k: 'farm', label: 'Work the fields' }, hunt: { k: 'hunt', label: 'Hunt' }, fish: { k: 'fish', label: 'Fish' } }[k];
    if (o.k === 'gather' && s) { const f = world.feat[s.y * CFG.W + s.x]; if ((o.kind === 'wood' && (f === FEAT.OAK || f === FEAT.PINE)) || (o.kind === 'stone' && f === FEAT.STONE) || (o.kind === 'food' && f === FEAT.BUSH)) { o.x = s.x; o.y = s.y } }
    puOrder(o); puRefresh();
  });
  const sel = el.querySelector('[data-prole]'); sel.onchange = () => { if (sel.value) { puOrder({ k: 'role', role: sel.value }, sel.value === 'none' ? 'no fixed job' : 'now ' + sel.value + 's'); puRefresh(); updateUI() } };
}

/* ---------- pointer input (called first by the canvas handlers in ui.js; true means handled) ---------- */
const puKeysDown = {};
function puCanvasXY(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
function puLine(a, b, out) { let x0 = a[0], y0 = a[1]; const x1 = b[0], y1 = b[1], dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy; for (let n = 0; n < 400; n++) { out.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx } if (e2 < dx) { err += dx; y0 += sy } } }
function puBrushTiles(x, y, r) { const out = []; if (r <= 1) return [[x, y]]; const k = r - 1; for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) if (dx * dx + dy * dy <= k * k + k) out.push([x + dx, y + dy]); return out }
function puPaintMode() { return puOn() && (PU.tool === 'road' || PU.tool === 'zone') && !PU.pan && !puKeysDown[' '] }
function puDown(e) {
  PU.touch = !!(e.pointerType && e.pointerType !== 'mouse'); clearTimeout(PU._gt);
  if (!puOn()) return false;
  if (e.button === 2) return true;
  const [sx, sy] = puCanvasXY(e), t = puTile(sx, sy); PU.menu = null; $('pmenu').style.display = 'none';
  if (PU.touch && PU.tool === 'build' && PU.pend && PU.gx != null) {                      // a finger on the pending ghost drags it; elsewhere pans the map as usual
    const [bw, bh] = CFG.SIZE[PU.type]; if (t.x >= PU.gx - 1 && t.x <= PU.gx + bw && t.y >= PU.gy - 1 && t.y <= PU.gy + bh) { PU.dragG = { dx: t.x - PU.gx, dy: t.y - PU.gy }; try { cv.setPointerCapture(e.pointerId) } catch (_) { } return true }
  }
  if (puPaintMode()) { PU.paint = { tiles: [], last: [t.x, t.y], seen: new Set() }; puPaintAdd(t.x, t.y); try { cv.setPointerCapture(e.pointerId) } catch (_) { } return true }
  if (PU.tool === 'select' && e.shiftKey && e.pointerType === 'mouse') { PU.box = { x0: sx, y0: sy, x1: sx, y1: sy }; try { cv.setPointerCapture(e.pointerId) } catch (_) { } return true }
  if (PU.tool === 'select' && e.pointerType !== 'mouse' && puGroup().length) { PU.hold = setTimeout(() => { PU.hold = null; PU.holdFired = true; puMenuAt(sx, sy, e.clientX, e.clientY) }, 520) }
  return false;
}
function puPaintAdd(x, y) {
  if (PU.tool === 'road') { const k = x + ',' + y; if (!PU.paint.seen.has(k)) { PU.paint.seen.add(k); PU.paint.tiles.push([x, y]) } }
  else for (const [a, b] of puBrushTiles(x, y, PU.brush)) { const k = a + ',' + b; if (puIn(a, b) && !PU.paint.seen.has(k)) { PU.paint.seen.add(k); PU.paint.tiles.push([a, b]) } }
}
function puMove(e) {
  if (!puOn()) return false;
  const [sx, sy] = puCanvasXY(e), t = puTile(sx, sy);
  if (PU.dragG) { const [bw, bh] = CFG.SIZE[PU.type]; PU.hover = { x: t.x - PU.dragG.dx + (bw >> 1), y: t.y - PU.dragG.dy + (bh >> 1), sx, sy }; puGhostCheck(); return true }
  if (PU.touch && PU.pend) return false;                                                    // panning the map must not carry the pending ghost along
  PU.hover = { x: t.x, y: t.y, sx, sy };
  if (PU.hold && e.buttons) { PU.holdMoved = (PU.holdMoved || 0) + 1; if (PU.holdMoved > 6) { clearTimeout(PU.hold); PU.hold = null } }
  if (PU.tool === 'build') puGhostCheck();
  if (PU.paint) { const l = PU.paint.last; if (l[0] !== t.x || l[1] !== t.y) { const seg = []; puLine(l, [t.x, t.y], seg); for (const [a, b] of seg) puPaintAdd(a, b); PU.paint.last = [t.x, t.y] } return true }
  if (PU.box) { PU.box.x1 = sx; PU.box.y1 = sy; return true }
  return false;
}
function puGhostCheck() { const h = PU.hover; if (!h || PU.tool !== 'build') { PU.ok = null; return } const [bw, bh] = CFG.SIZE[PU.type]; PU.ok = playCanPlace(world, PU.type, h.x - (bw >> 1), h.y - (bh >> 1), false); PU.gx = h.x - (bw >> 1); PU.gy = h.y - (bh >> 1); puGhostTip() }
function puGhostTip() {
  const el = $('pghost'), h = PU.hover; if (!el) return; if (!h || PU.tool !== 'build' || !PU.ok) { el.style.display = 'none'; return }
  el.style.display = 'block'; el.className = PU.ok.ok ? 'ok' : 'bad'; el.textContent = PU.ok.ok ? (PU.ok.note || PU_NAMES[PU.type] + ': ' + puCost(PU.ok.cost)) : PU.ok.why;
  if (PU.pend) { puConfPos(); return }
  const vw = cv.clientWidth, vh = cv.clientHeight, ew = el.offsetWidth, eh = el.offsetHeight, touch = PU.touch;       // keep it on screen, and above the finger on a touchscreen
  el.style.left = Math.max(4, Math.min(vw - ew - 4, h.sx + (touch ? -ew / 2 : 14))) + 'px'; el.style.top = Math.max(4, Math.min(vh - eh - 4, touch ? h.sy - eh - 44 : h.sy + 14)) + 'px';
}
function puPlaceAt() {
  if (PU.gx == null) return; const r = playPlace(world, PU.type, PU.gx, PU.gy);
  if (r.ok) { puNote(`${PU_NAMES[PU.type]} marked. Builders will start soon.`); PU.fx.push({ x: PU.gx + 0.5, y: PU.gy + 0.5, t: performance.now() }); if (PU.touch) { puPendClear(); PU.hover = null; PU.ok = null; puGhostTip(); puUndoChip(r.bp.id) } else puGhostCheck(); puRefresh() } else puNote(r.why);
}
function puUndoChip(id) {                                                                  // a short Undo after a touch placement
  const el = $('pundo'); if (!el) return; clearTimeout(PU._ut); el.style.display = 'flex'; el.innerHTML = `<span>${PU_NAMES[PU.type]} marked</span><button id="pundob">Undo</button>`;
  $('pundob').onclick = () => { const ok = playCancelBp(world, id); el.style.display = 'none'; puNote(ok ? 'Taken back. The materials are returned.' : 'Too late: builders have started.'); puRefresh() };
  PU._ut = setTimeout(() => { el.style.display = 'none' }, 6000);
}
function puConfPos() {                                                                     // the ✓ ✕ pair sits just under the pending ghost, kept on screen
  const c = $('pconf'); if (!c) return; if (!PU.pend || PU.tool !== 'build' || PU.gx == null || !puOn()) { c.style.display = 'none'; return }
  const [bw, bh] = CFG.SIZE[PU.type], z = R.cam.z, T = CFG.T, cx = ((PU.gx + bw / 2) * T - R.cam.x) * z + R.vw / 2, by = ((PU.gy + bh) * T - R.cam.y) * z + R.vh / 2, ty = ((PU.gy) * T - R.cam.y) * z + R.vh / 2;
  c.style.display = 'flex'; $('pcok').disabled = !(PU.ok && PU.ok.ok); const w = c.offsetWidth, h = c.offsetHeight;
  c.style.left = Math.max(4, Math.min(R.vw - w - 4, cx - w / 2)) + 'px'; c.style.top = Math.max(4, Math.min(R.vh - h - 4, by + 10 > R.vh - h - 4 ? ty - h - 10 : by + 10)) + 'px';
  const g = $('pghost'); if (g && PU.ok) { g.style.left = Math.max(4, Math.min(R.vw - g.offsetWidth - 4, cx - g.offsetWidth / 2)) + 'px'; g.style.top = Math.max(4, ty - g.offsetHeight - 6 - (by + 10 > R.vh - h - 4 ? h + 10 : 0)) + 'px' }
}
function puUp(e) {
  if (e.pointerType && e.pointerType !== 'mouse') { clearTimeout(PU._gt); PU._gt = setTimeout(() => { const g = $('pghost'); if (g && !PU.pend) g.style.display = 'none' }, 1800) }
  if (!puOn()) return false;
  if (PU.hold) { clearTimeout(PU.hold); PU.hold = null } PU.holdMoved = 0;
  if (PU.holdFired) { PU.holdFired = false; cv.classList.remove('drag'); return true }
  if (e.button === 2) return true;
  const [sx, sy] = puCanvasXY(e);
  if (PU.paint) {
    const P = PU.paint; PU.paint = null;
    if (PU.tool === 'road') { const r = playRoad(world, P.tiles); puNote(r.ok ? `Road marked: ${r.n} ${r.n === 1 ? 'tile' : 'tiles'}.${r.why ? ' ' + r.why + '.' : ''}` : (r.why || 'No road could be laid there.')) }
    else { const n = playZone(world, P.tiles, PU.zone === 'erase' ? null : PU.zone); if (n) puNote(PU.zone === 'erase' ? 'Zone erased.' : PLAY_ZONES[PU.zone] + ' zone painted.') }
    cv.classList.remove('drag'); puRefresh(); return true;
  }
  if (PU.box) {
    const b = PU.box; PU.box = null; cv.classList.remove('drag'); const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1), T = CFG.T;
    if (x1 - x0 < 6 && y1 - y0 < 6) return true;
    const a = screenToWorld(x0, y0), c = screenToWorld(x1, y1), inb = world.vills.filter(v => v.x * T >= a.x && v.x * T <= c.x && v.y * T - 6 >= a.y && v.y * T - 6 <= c.y);
    PU.sel = e.ctrlKey || e.metaKey ? [...new Set([...puGroup(), ...inb])] : inb; selected = PU.sel[0] || null; if (selected) showTab('village'); puNote(PU.sel.length ? `${PU.sel.length} selected. Right-click to order, or use the bar below.` : 'Nobody in the box.'); puRefresh(); updateUI(); return true;
  }
  if (PU.dragG) { PU.dragG = null; puGhostCheck(); puRefresh(); return true }
  if (PU.tool === 'build' && !(cv._moved > 5)) {
    const t = puTile(sx, sy); PU.hover = { x: t.x, y: t.y, sx, sy }; puGhostCheck();
    if (e.pointerType === 'mouse') puPlaceAt(); else { PU.pend = true; puConfPos(); puRefresh() }     // touch: the tap only sets the ghost down; the tick confirms it
    return true;
  }
  return false;
}
/* after the normal pick in ui.js: keep the group, or fall back to a tile so that orders still have a target */
function puPicked(e, best) {
  if (!puOn() || PU.tool !== 'select') return;
  const [sx, sy] = puCanvasXY(e), t = puTile(sx, sy), multi = e.shiftKey || e.ctrlKey || e.metaKey;
  if (best instanceof Villager) { PU.sel = multi ? (PU.sel.includes(best) ? PU.sel.filter(v => v !== best) : [...puGroup(), best]) : [best] }
  else if (!best && puIn(t.x, t.y)) { selected = { tile: true, x: t.x, y: t.y }; showTab('village') }
  puRefresh(); updateUI();
}
function puMenuAt(sx, sy, cx, cy) {
  const t = puTile(sx, sy); if (!puIn(t.x, t.y) || !puAdults().length) return;
  const o = playOrderAt(world, t.x, t.y), items = []; if (o) items.push(o); if (!o || o.k !== 'move') if (world.terr[t.y * CFG.W + t.x] >= TERR.SAND) items.push({ k: 'move', x: t.x, y: t.y, label: 'Go here' });
  if (!items.length) return; PU.menu = items; const m = $('pmenu'), r = $('stage').getBoundingClientRect();
  m.innerHTML = items.map((o, i) => `<button data-pmi="${i}">${escapeHtml(o.label)}</button>`).join('') + '<button data-pmi="x" class="x">Cancel</button>';
  m.style.display = 'flex'; m.style.left = Math.max(6, Math.min(cx - r.left, r.width - 170)) + 'px'; m.style.top = Math.max(6, Math.min(cy - r.top, r.height - 130)) + 'px';
  m.onclick = ev => { const b = ev.target.closest('[data-pmi]'); if (!b) return; m.style.display = 'none'; if (b.dataset.pmi !== 'x') puOrder(PU.menu[+b.dataset.pmi]); PU.menu = null };
}
function puKey(e) {
  if (!puOn()) return false; const k = e.key.toLowerCase(); if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return false;
  if (k === ' ') puKeysDown[' '] = true;
  if (e.key === 'Escape') { if (PU.menu) { PU.menu = null; $('pmenu').style.display = 'none'; return true } if (PU.tool !== 'select') { puTool('select'); return true } if (PU.panel) { PU.panel = null; puRefresh(); return true } if (PU.sel.length) { PU.sel = []; puRefresh() } return false }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const tools = { b: 'build', r: 'road', z: 'zone', v: 'select' }; if (tools[k]) { puTool(PU.tool === tools[k] ? 'select' : tools[k]); return true }
  return false;
}

/* ---------- drawing on the map (called from render.js inside the world transform) ---------- */
function playDraw(g, w, now) {
  if (!w.play || !w.play.on) return; const T = CFG.T, c = R.cam, z = c.z, tlx = c.x - R.vw / (2 * z), tly = c.y - R.vh / (2 * z), P = w.play;
  const x0 = Math.floor(tlx / T) - 1, x1 = Math.ceil((tlx + R.vw / z) / T) + 1, y0 = Math.floor(tly / T) - 1, y1 = Math.ceil((tly + R.vh / z) / T) + 1;
  if (P.nz) { const zt = PU.tool === 'zone'; g.save(); g.globalAlpha = zt ? 0.42 : 0.2; for (const k in P.zones) { const i = +k, x = i % CFG.W, y = (i / CFG.W) | 0; if (x < x0 || x > x1 || y < y0 || y > y1) continue; g.fillStyle = 'rgb(' + PU_ZCOL[P.zones[k]] + ')'; g.fillRect(x * T, y * T, T, T) } g.restore() }
  g.save(); g.lineWidth = 1;
  for (const v of w.vills) { if (!v.alive) continue; const x = v.x * T, y = v.y * T; if (x < tlx - 20 || x > tlx + R.vw / z + 20 || y < tly - 20 || y > tly + R.vh / z + 20) continue;
    if (PU.sel.includes(v)) { g.strokeStyle = '#ffd866'; g.beginPath(); g.ellipse(x, y, 8, 4, 0, 0, 7); g.stroke(); const o = v.order; if (o && o.x != null) { g.strokeStyle = 'rgba(255,216,102,.5)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, y); g.lineTo((o.x + .5) * T, (o.y + .5) * T); g.stroke(); g.setLineDash([]) } }
    if (v.order || v.roleLock) { g.fillStyle = '#ffd866'; g.fillRect(x - 1, y - 17, 3, 3) } }
  for (const f of PU.fx) { const a = (now - f.t) / 900; if (a > 1) continue; g.strokeStyle = `rgba(255,216,102,${1 - a})`; g.beginPath(); g.arc(f.x * T, f.y * T, 4 + a * 14, 0, 7); g.stroke() } PU.fx = PU.fx.filter(f => now - f.t < 900);
  const h = PU.hover; if (PU.pend) puConfPos();
  if (PU.tool === 'build' && h && PU.ok && PU.gx != null) { const [bw, bh] = CFG.SIZE[PU.type]; g.fillStyle = PU.ok.ok ? 'rgba(80,220,120,.38)' : 'rgba(235,80,80,.38)'; g.fillRect(PU.gx * T, PU.gy * T, bw * T, bh * T); g.strokeStyle = PU.ok.ok ? '#6bff9b' : '#ff7070'; g.strokeRect(PU.gx * T + .5, PU.gy * T + .5, bw * T - 1, bh * T - 1) }
  if (PU.paint) { g.fillStyle = PU.tool === 'road' ? 'rgba(210,190,150,.7)' : 'rgba(' + (PU_ZCOL[PU.zone] || '255,255,255') + ',.5)'; for (const [x, y] of PU.paint.tiles) g.fillRect(x * T, y * T, T, T) }
  else if ((PU.tool === 'road' || PU.tool === 'zone') && h) { g.strokeStyle = '#fff'; const tiles = PU.tool === 'road' ? [[h.x, h.y]] : puBrushTiles(h.x, h.y, PU.brush); for (const [x, y] of tiles) g.strokeRect(x * T + .5, y * T + .5, T - 1, T - 1) }
  if (selected && selected.tile) { g.strokeStyle = '#fff'; g.strokeRect(selected.x * T + .5, selected.y * T + .5, T - 1, T - 1) }
  g.restore();
  if (PU.box) { g.save(); g.setTransform(R.dpr, 0, 0, R.dpr, 0, 0); const b = PU.box; g.fillStyle = 'rgba(255,216,102,.15)'; g.strokeStyle = '#ffd866'; g.fillRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1), Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); g.strokeRect(Math.min(b.x0, b.x1) + .5, Math.min(b.y0, b.y1) + .5, Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0)); g.restore() }
}

/* ---------- wiring ---------- */
function puInit() {
$('sel').addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-pord],[data-pcancel]'); if (!b || !puOn()) return; const s = selected;
  if (b.dataset.pord === 'move') puOrder({ k: 'move', x: s.x, y: s.y, label: 'Go here' }); else if (b.dataset.pord) { const o = puTarget(s); if (o) puOrder(o) }
  else if (playCancelBp(world, +b.dataset.pcancel)) { selected = null; updateUI() } else puNote('Work has already started there.');
});
cv.addEventListener('contextmenu', e => {
  e.preventDefault(); if (!puOn()) return;
  if (PU.tool !== 'select') { puTool('select'); return }
  const [sx, sy] = puCanvasXY(e), t = puTile(sx, sy); if (!puIn(t.x, t.y)) return;
  if (!puAdults().length) { puNote('Pick someone first: click a villager, or drag a box with Shift.'); return }
  if (e.shiftKey) { puMenuAt(sx, sy, e.clientX, e.clientY); return }
  const o = playOrderAt(world, t.x, t.y); if (o) puOrder(o); else puNote('Nothing to do there.');
});
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => puMode(b.dataset.mode === 'play'));
  $('ptool').addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'); if (t) { puTool(PU.tool === t.dataset.tool && t.dataset.tool !== 'select' ? 'select' : t.dataset.tool); return }
    const a = e.target.closest('[data-auto]'); if (a) { playSet(world, a.dataset.auto, world.play.auto[a.dataset.auto] === false); puRefresh(); return }
  });
  $('presearch').onclick = () => { PU.panel = PU.panel === 'research' ? null : 'research'; PU.tool = 'select'; puRefresh() };
  $('pcrowd').onclick = () => { PU.panel = PU.panel === 'crowd' ? null : 'crowd'; PU.tool = 'select'; puRefresh() };
  $('ppan').onclick = () => { PU.pan = !PU.pan; puRefresh() };
  addEventListener('keyup', e => { if (e.key === ' ') puKeysDown[' '] = false });
  puRefresh();
}

if (typeof document !== 'undefined') { const ok = document.getElementById('pcok'), no = document.getElementById('pcno'); if (ok) ok.onclick = () => puPlaceAt(); if (no) no.onclick = () => { puPendClear(); PU.hover = null; PU.ok = null; puGhostTip(); puRefresh() } }
