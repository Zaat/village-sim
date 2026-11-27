/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   treeui.js — v0.27 the dependency tree: every technology as a box in its
   branch (rows) and age (columns), with a line from each technology to what it
   unlocks. Click a box for what it gives and needs; the boxes it depends on and
   the ones that depend on it light up. With Open knowledge on, a Grant button
   learns it at once.
   ========================================================================== */
const TREE_W = 124, TREE_H = 22, TREE_GAP = 26, TREE_LAB = 96;
let treeSel = null, treeLay = null;
function treeLayout() {
  if (treeLay) return treeLay;
  const bs = Object.keys(BRANCHES), cell = {}, stack = {}; for (const b of bs) stack[b] = 1;
  for (const id in TECHS) { const T = TECHS[id], k = T.branch + ':' + T.age; (cell[k] = cell[k] || []).push(id); stack[T.branch] = Math.max(stack[T.branch], cell[k].length) }
  const top = {}; let y = 24; for (const b of bs) { top[b] = y; y += stack[b] * (TREE_H + 4) + 12 }
  const pos = {}; for (const k in cell) { const [b, a] = k.split(':'); cell[k].forEach((id, i) => { pos[id] = { x: TREE_LAB + (+a) * (TREE_W + TREE_GAP), y: top[b] + i * (TREE_H + 4) } }) }
  treeLay = { pos, top, stack, w: TREE_LAB + AGES.length * (TREE_W + TREE_GAP), h: y }; return treeLay;
}
function treeKin(id) {                        // everything this technology rests on, and everything resting on it
  const up = new Set(), down = new Set(), goUp = x => { for (const r of TECHS[x].req) if (!up.has(r)) { up.add(r); goUp(r) } }, goDown = x => { for (const o in TECHS) if (TECHS[o].req.includes(x) && !down.has(o)) { down.add(o); goDown(o) } };
  goUp(id); goDown(id); return { up, down };
}
function renderTree() {
  const w = world, L = treeLayout(), t = w.tech, avail = techAvailable(w), raw = techAvailableRaw(w), kin = treeSel ? treeKin(treeSel) : null;
  const state = id => t.known[id] ? 'k' : avail.includes(id) ? 'a' : raw.includes(id) ? 'b' : 'l', COL = { k: '#3f7f46', a: '#5d86b8', b: '#a98a45', l: '#2a323a' };
  let s = `<svg width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">`;
  AGES.forEach((a, i) => { s += `<text x="${TREE_LAB + i * (TREE_W + TREE_GAP) + TREE_W / 2}" y="14" fill="${i <= villageAge(w) ? '#e0b070' : '#6d7780'}" font-size="11" text-anchor="middle">${a}</text>` });
  for (const b in BRANCHES) s += `<text x="4" y="${L.top[b] + 14}" fill="${BRANCHES[b].col}" font-size="11">${BRANCHES[b].name}</text>`;
  let edges = '';
  for (const id in TECHS) for (const r of TECHS[id].req) {
    const A = L.pos[r], B = L.pos[id]; if (!A || !B) continue; const x1 = A.x + TREE_W, y1 = A.y + TREE_H / 2, x2 = B.x, y2 = B.y + TREE_H / 2, mx = (x1 + x2) / 2;
    const hot = kin && ((id === treeSel && kin.up.has(r)) || (r === treeSel) || (kin.up.has(id) && kin.up.has(r)) || (kin.down.has(r) && kin.down.has(id)) || (kin.down.has(id) && r === treeSel) || (kin.up.has(r) && id === treeSel));
    edges += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${hot ? '#e0b070' : t.known[r] && t.known[id] ? '#3f7f46' : '#39424b'}" stroke-width="${hot ? 1.8 : 1}" opacity="${kin && !hot ? 0.25 : 1}"/>`;
  }
  s += edges;
  for (const id in TECHS) {
    const P = L.pos[id], T = TECHS[id], st = state(id), dim = kin && id !== treeSel && !kin.up.has(id) && !kin.down.has(id);
    s += `<g data-tid="${id}" style="cursor:pointer" opacity="${dim ? 0.3 : 1}"><rect x="${P.x}" y="${P.y}" width="${TREE_W}" height="${TREE_H}" rx="4" fill="${COL[st]}" stroke="${id === treeSel ? '#fff' : BRANCHES[T.branch].col}" stroke-width="${id === treeSel ? 2 : 0.8}"/><text x="${P.x + 6}" y="${P.y + 15}" fill="${st === 'l' ? '#8a949d' : '#fff'}" font-size="10.5">${escapeHtml(T.name.length > 20 ? T.name.slice(0, 19) + '…' : T.name)}</text><title>${escapeHtml(T.name + ' — ' + T.desc)}</title></g>`;
  }
  $('treeSvg').innerHTML = s + '</svg>';
  const d = $('treeInfo');
  if (!treeSel) { d.innerHTML = `<div class="hint">Click a technology. <span style="color:#7fb38a">■</span> known · <span style="color:#7aa0d0">■</span> open · <span style="color:#c9a46a">■</span> waiting for an input · <span style="color:#6d7780">■</span> locked. ${openLevel(w) ? 'Open knowledge is on: pick one and press Grant.' : ''}</div>`; return }
  const T = TECHS[treeSel], U = unlocksOf(treeSel), st = state(treeSel), grant = openLevel(w) && !t.known[treeSel] ? ` <button class="grant" data-grant="${treeSel}">Grant</button>` : '';
  d.innerHTML = `<div><b style="color:${BRANCHES[T.branch].col}">${escapeHtml(T.name)}</b>${grant} <span class="hint">${BRANCHES[T.branch].name.toLowerCase()} · ${AGES[T.age]} · ${t.known[treeSel] ? 'known since day ' + t.known[treeSel] : 'cost ' + techCost(w, treeSel)}</span></div><div class="hint">${escapeHtml(T.desc)}</div>
    <div class="hint"><b>Gives:</b> ${U.gives.map(escapeHtml).join(' · ')}</div>${U.needs.length ? `<div class="hint"><b>Needs:</b> ${U.needs.map(g => (GATES[g].ok(w) ? '✓ ' : '✗ ') + GATES[g].name).join(', ')}</div>` : ''}
    <div class="hint"><b>Builds on:</b> ${T.req.length ? T.req.map(r => (t.known[r] ? '✓ ' : '✗ ') + TECHS[r].name).join(', ') : 'nothing'}${st === 'l' && T.age > villageAge(w) ? ' · waits for the ' + AGES[T.age] : ''}</div>`;
}
function treeOpen() { treeSel = null; $('tree').style.display = 'flex'; renderTree(); const sc = $('treeSvg'); if (sc) { sc.scrollLeft = 0; sc.scrollTop = 0 } $('tree').scrollTop = 0 }
function treeClose() { $('tree').style.display = 'none' }
$('treeSvg').addEventListener('click', e => { const g = e.target.closest('[data-tid]'); treeSel = g ? (treeSel === g.dataset.tid ? null : g.dataset.tid) : null; renderTree() });
$('treeInfo').addEventListener('click', e => { const b = e.target.closest('[data-grant]'); if (b) { grantTech(world, b.dataset.grant); renderTree(); renderTech() } });
$('treeClose').onclick = treeClose; $('tree').addEventListener('pointerdown', e => { if (e.target === $('tree')) treeClose() });
