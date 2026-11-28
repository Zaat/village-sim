/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* overui.js — the end screen (v0.35): what the village was, how it ended, and a choice to carry on or begin again */
let overUp = false;
function overInit() {
  $('over_cont').onclick = () => { if (world && world.over) world.over.ack = true; overHide() };
  $('over_again').onclick = () => { const w = world; overHide(); const size = Object.keys(MAP_SIZES).find(k => MAP_SIZES[k].dims[0] === CFG.W && MAP_SIZES[k].dims[1] === CFG.H) || 'standard', s = w.settings || {}; newWorld(w.seed, { type: w.arch, size, hardship: s.hardship, phil: s.philosophy, open: s.openKnowledge }) };
  $('over_new').onclick = () => { overHide(); if (world && world.over) world.over.ack = true; nwOpen() };
  $('over_copy').onclick = () => { try { navigator.clipboard.writeText(worldLine(world)); $('over_copy').textContent = 'Copied' } catch (e) { } };
}
function overHide() { overUp = false; $('over').style.display = 'none' }
function overCheck() {
  if (!world || !world.over || world.over.ack || overUp) return;
  overUp = true; setSpeed(0); const w = world, o = w.over, s = statsSummary(w), ex = o.kind === 'extinct';
  $('over_title').textContent = ex ? 'The village is empty' : 'The village could not go on';
  $('over_text').textContent = ex ? (o.last ? `${o.last} was the last. ` : '') + `No one is left. It lasted ${s.years} years, and ${s.born} children were born in that time.` : `Only ${o.left.length === 1 ? o.left[0] : o.left.join(', ')} remained for a whole month, too few to farm, build or raise children. The village ends in year ${o.year}.`;
  const rows = [['Lasted', `${s.years} years`], ['Largest', `${s.peakPop} people`], ['Born / died', `${s.born} / ${s.died}`], ['Era', AGES[techEra(w)]], ['Technologies', s.techs], ['Great works', s.projects || 0]];
  $('over_facts').innerHTML = rows.map(([k, v]) => `<div><span class="hint">${k}</span><b>${escapeHtml(String(v))}</b></div>`).join('');
  const c = $('over_chart'), g = c.getContext('2d'), S = ST(w), a = S.s.pop || []; g.clearRect(0, 0, c.width, c.height);
  if (a.length > 1) { const mx = Math.max(10, ...a); g.strokeStyle = '#8fd18b'; g.lineWidth = 2; g.beginPath(); a.forEach((p, i) => { const X = 2 + i / (a.length - 1) * (c.width - 4), Y = c.height - 4 - p / mx * (c.height - 10); i ? g.lineTo(X, Y) : g.moveTo(X, Y) }); g.stroke(); g.fillStyle = '#c4ccd3'; g.font = '10px sans-serif'; g.fillText('population, peak ' + mx, 4, 11) }
  { const tl = topTales(w, 6), el = $('over_tales'); if (el) el.innerHTML = tl.length ? '<div class="hint" style="margin:8px 0 3px">Tales from the village</div>' + tl.map(t => `<div class="tale"><span class="hint">Year ${t.year}</span> ${escapeHtml(t.text)}</div>`).join('') : '' }
  { const cr = typeof councilRecord === 'function' && w.concerns ? councilRecord(w) : null, el = $('over_rec'); if (el) el.textContent = cr && cr.total ? 'Council record: ' + cr.title + (cr.rating === null ? '' : ' (' + Math.round(100 * cr.rating) + '%)') + '. ' + cr.n.answered + ' concerns answered, ' + cr.n.eased + ' eased on their own, ' + cr.n.bad + ' ended badly.' : '' }
  $('over_line').textContent = worldLine(w); $('over_copy').textContent = 'Copy world line'; $('over').style.display = 'flex';
}
