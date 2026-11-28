/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   design.js — City design, first version (v0.40).
   A town is laid out by many small choices, and in the real world those
   choices were often made by one authority with a plan: a Roman camp's grid,
   a medieval town that simply grew, a bastide built around its square, a
   baroque star of avenues, a garden city of greens. Here the council
   COMMISSIONS a layout style from a small library, every district gets a
   beauty score, and a ledger of projects (squares, remodelling, heritage
   homes) is decided through the council like any other matter.
   Left for later: transport, ageing looks beyond the palettes, and rebuilding
   a culture's whole look.
   ========================================================================== */
const DESIGN = { first: 80, every: 4, projEvery: 24, rethink: 3, ledgerMax: 20, squareRadius: 9 };
/* the library: real town-plan families as data. compact shifts layoutBias; w weights what each style counts as beautiful */
const DESIGN_STYLES = {
  organic: { name: 'Grown town', real: 'a medieval town that simply grew', blurb: 'Lanes follow the old paths. Cheap and quick; charming in small doses, muddled when large.', compact: -0.12, need: 0, w: { uniform: -6, square: 14, shore: 8, green: 4 } },
  grid: { name: 'Gridded town', real: 'a Roman camp or a Greek colony', blurb: 'Straight streets and equal plots. Easy to build and to defend; beautiful when the homes match.', compact: 0.10, need: 0, w: { uniform: 14, square: 8, shore: 4, green: 0 } },
  bastide: { name: 'Square-centred town', real: 'a bastide of southern France', blurb: 'Everything faces one market square with covered walks. Compact and safe; the square matters most.', compact: 0.20, need: 0, w: { uniform: 6, square: 22, shore: 2, green: 0 } },
  radial: { name: 'Radial avenues', real: 'a baroque city of avenues and vistas', blurb: 'Avenues meet at monuments. Grand once the village can afford brick and stone.', compact: 0.10, need: 3, w: { uniform: 10, square: 16, shore: 6, green: 4 } },
  garden: { name: 'Garden town', real: 'a garden city of greens and low homes', blurb: 'Low density, lawns and gardens around a common. Loved by its people; it needs room.', compact: -0.22, need: 4, w: { uniform: 4, square: 10, shore: 6, green: 16 } },
};
const designState = w => w.design || (w.design = { style: null, since: 0, pop0: 0, next: 0, nextProj: 0, beauty: {}, avg: 0, ledger: [], seq: 0 });
const designStyle = w => { const s = w.design && w.design.style; return s ? DESIGN_STYLES[s] || null : null };
/* the council's lean on layoutBias (city.js adds this) */
const designCompact = w => { const s = designStyle(w); return s ? s.compact : 0 };

function designFit(w, id) {       // how well a style suits this village now: the rules' own pick when the council cannot decide
  const pop = w.pop, ph = (w.settings && w.settings.philosophy) || 'balanced', threat = typeof threatLevel === 'function' ? Math.min(1, threatLevel(w)) : 0, A = w.rx ? Math.min(1, w.rx.A || 0) : 0.3, top = styleNow(w);
  if (id === 'organic') return 1 + (A < 0.3 ? 0.5 : 0) - (pop > 250 ? 0.4 : 0);
  if (id === 'grid') return 1 + (ph === 'practical' ? 0.5 : 0) + A * 0.6 + (pop > 150 ? 0.3 : 0);
  if (id === 'bastide') return 0.7 + threat * 1.6 + (ph === 'mercantile' ? 0.8 : 0) + (ph === 'martial' ? 0.4 : 0);
  if (id === 'radial') return 0.4 + (pop > 300 ? 0.8 : 0) + A * 0.8 + (ph === 'martial' ? 0.5 : 0);
  if (id === 'garden') return 0.3 + (pop > 400 ? 0.9 : 0) + (A < 0.4 ? 0.4 : 0) + (ph === 'practical' ? -0.3 : 0.2) + (top >= 5 ? 0.3 : 0);
  return 0;
}
const designOptions = w => Object.keys(DESIGN_STYLES).filter(id => styleNow(w) >= DESIGN_STYLES[id].need);

/* ----- beauty: a score 0..100 per district, from what is built and how it sits ----- */
function nearType(w, type, x, y, r) { const r2 = r * r; for (const b of w.buildings.values()) if (b.type === type) { const dx = b.x - x, dy = b.y - y; if (dx * dx + dy * dy <= r2) return true } return false }
function districtBeauty(w, d, st) {
  const H = Math.max(1, d.homes), avg = d.tiers.reduce((a, n, i) => a + n * i, 0) / H, uni = Math.max(...d.tiers) / H, S = st ? st.w : DESIGN_STYLES.organic.w;
  let v = 22 + Math.min(30, avg * 6) + S.uniform * uni;
  if (nearType(w, 'plaza', d.cx, d.cy, DESIGN.squareRadius)) v += S.square; else if (nearType(w, 'market', d.cx, d.cy, DESIGN.squareRadius)) v += S.square * 0.4;
  const x = Math.round(d.cx), y = Math.round(d.cy); if (waterAt(w, x + 7, y) || waterAt(w, x - 7, y) || waterAt(w, x, y + 7) || waterAt(w, x, y - 7)) v += S.shore;
  let bad = 0; for (const b of w.buildings.values()) { const n = typeof NUISANCE !== 'undefined' && NUISANCE[b.type]; if (!n) continue; const dx = b.x - d.cx, dy = b.y - d.cy; if (dx * dx + dy * dy < 64) bad += n }
  v -= Math.min(24, bad * 0.5);
  let heri = 0; for (const h of w.houses()) if (h.heritage && Math.abs(h.x - d.cx) < 9 && Math.abs(h.y - d.cy) < 9) heri++; v += Math.min(10, heri * 3);
  v += S.green * Math.max(0, 1 - d.density / 6);       // open ground reads as green only for the styles that value it
  return Math.max(0, Math.min(100, Math.round(v)));
}
function designScore(w) {
  const D = designState(w), view = districtsView(w), st = designStyle(w); let sum = 0, n = 0; D.beauty = {};
  for (const d of view.list) { const b = districtBeauty(w, d, st); D.beauty[d.key] = b; sum += b * d.pop; n += d.pop }
  D.avg = n ? Math.round(sum / n) : 0; return D;
}

/* ----- the commission: the council picks a layout style ----- */
function commission(w, why) {
  const D = designState(w), ids = designOptions(w), cur = D.style;
  const ranked = ids.map(id => ({ id, f: designFit(w, id) + (id === cur ? 0.35 : 0) })).sort((a, b) => b.f - a.f || (a.id < b.id ? -1 : 1)), def = ranked[0].id;
  const options = ids.map(id => ({ id, text: `${DESIGN_STYLES[id].name}, like ${DESIGN_STYLES[id].real}. ${DESIGN_STYLES[id].blurb}` })); if (cur) options.push({ id: 'keep', text: `Keep the ${DESIGN_STYLES[cur].name.toLowerCase()} the village already follows` });
  D.next = w.day + 9999;       // set again when the council has answered
  ask(w, { kind: 'design', topic: `${why} The council can commission a plan for how the town grows from here. Each plan leans the new streets and homes differently, and each has its own idea of what is beautiful.`, options, default: cur ? 'keep' : def,
    apply: (id, sp, reason, src) => {
      D.next = w.day + 30;
      if (id === 'keep' || !DESIGN_STYLES[id]) { D.pop0 = w.pop; recordDecision(w, `to keep following the ${cur ? DESIGN_STYLES[cur].name.toLowerCase() : 'old ways'}.`, sp, src); return }
      D.style = id; D.since = w.day; D.pop0 = w.pop; D.nextProj = w.day + 6;
      recordDecision(w, `to lay out the town as a ${DESIGN_STYLES[id].name.toLowerCase()}, after ${DESIGN_STYLES[id].real}.`, sp, src); w.emit('design', `The council commissions a plan: the town will grow as a ${DESIGN_STYLES[id].name.toLowerCase()}.`, { id });
    } });
}

/* ----- the ledger: projects with a state ----- */
function ledgerAdd(w, kind, d, text, extra) { const D = designState(w), e = { id: ++D.seq, kind, day: w.day, dist: d.name, text, state: 'approved', ...(extra || {}) }; D.ledger.unshift(e); if (D.ledger.length > DESIGN.ledgerMax) D.ledger.pop(); return e }
function ledgerTick(w) {
  const D = designState(w);
  for (const e of D.ledger) {
    if (e.state !== 'approved') continue;
    if (e.bp && !w.bps.some(b => b.id === e.bp)) { e.state = 'done'; e.done = w.day }       // the plan is gone from the board: the work was finished
    else if (e.kind === 'square' && e.plazas !== undefined && w.of('plaza').length > e.plazas) { e.state = 'done'; e.done = w.day }
    else if (w.day - e.day > 90) e.state = 'lapsed';       // never took shape: call it lapsed rather than carry it for ever
  }
}
function pickRemodel(w, d) {
  const top = styleNow(w); let best = null;
  for (const h of w.houses()) { if (h.heritage || w.bpAt.has(h.y * CFG.W + h.x) || (h.style || 0) >= top) continue; if (Math.floor(h.x / DIST.cell) !== d.gx || Math.floor(h.y / DIST.cell) !== d.gy) continue; if (!best || (h.style || 0) < (best.style || 0)) best = h }
  return best;
}
function pickHeritage(w, d) {
  let best = null; for (const h of w.houses()) { if (h.heritage || (h.built === undefined) || w.day - h.built < 60) continue; if (Math.floor(h.x / DIST.cell) !== d.gx || Math.floor(h.y / DIST.cell) !== d.gy) continue; if (!best || h.built < best.built) best = h }
  return best;
}
function proposeProject(w) {
  const D = designState(w), view = districtsView(w), st = designStyle(w);
  const cands = view.list.filter(d => d.pop >= 12 && D.beauty[d.key] !== undefined).sort((a, b) => D.beauty[a.key] - D.beauty[b.key] || a.key - b.key);
  const open = new Set(D.ledger.filter(e => e.state === 'approved').map(e => e.dist)); const d = cands.find(c => !open.has(c.name)); if (!d) return false;
  const canSquare = d.pop >= 25 && !nearType(w, 'plaza', d.cx, d.cy, DESIGN.squareRadius) && w.stock.wood >= 20 && w.has('carpentry');
  const rem = w.stock.wood >= 16 && w.stock.stone >= 8 ? pickRemodel(w, d) : null, her = pickHeritage(w, d);
  const options = [];
  if (canSquare) options.push({ id: 'square', text: `Lay out a square in ${d.name}, so there is somewhere to meet and something to look at` });
  if (rem) options.push({ id: 'remodel', text: `Rebuild an old home in ${d.name} in the better style the village now knows` });
  if (her) options.push({ id: 'heritage', text: `Keep the oldest home in ${d.name} as it is, and look after it as part of the town's story` });
  if (!options.length) return false;
  options.push({ id: 'wait', text: `Leave ${d.name} for now` });
  const b = D.beauty[d.key], def = canSquare ? 'square' : rem && b < 45 ? 'remodel' : her ? 'heritage' : rem ? 'remodel' : 'wait';
  ask(w, { kind: 'design', topic: `${d.name} scores ${b} out of 100 for looks, the lowest of the town's districts that has a choice to make${st ? ` by the ideals of a ${st.name.toLowerCase()}` : ''}. What should the council do about it?`, options, default: def,
    apply: (id, sp, reason, src) => {
      if (id === 'square' && canSquare) { const pl = w.of('plaza').length; placeBuilding(w, 'plaza', false, { x: Math.round(d.cx), y: Math.round(d.cy) }); ledgerAdd(w, 'square', d, `A square for ${d.name}`, { plazas: pl }); recordDecision(w, `to lay out a square in ${d.name}.`, sp, src) }
      else if (id === 'remodel' && rem && !w.bpAt.has(rem.y * CFG.W + rem.x)) { const bp = makeBp(w, 'upgrade', rem.x, rem.y, { target: rem.id, toStyle: (rem.style || 0) + 1 }); ledgerAdd(w, 'remodel', d, `An old home rebuilt in ${d.name}`, { bp: bp.id }); recordDecision(w, `to rebuild an old home in ${d.name}.`, sp, src) }
      else if (id === 'heritage' && her) { her.heritage = true; ledgerAdd(w, 'heritage', d, `The oldest home in ${d.name} kept as it is`, {}); w.sayAt(her, `The council marks an old home in ${d.name} to be kept as it is.`); recordDecision(w, `to keep the oldest home in ${d.name} as it is.`, sp, src) }
      else recordDecision(w, `to leave ${d.name} for now.`, sp, src);
    } });
  return true;
}

/* the day hook (city slot): score every few days, commission at the right size, then a project every few weeks */
function designDay(w) {
  if (w.pop < DESIGN.first && !(w.design && w.design.style)) return;
  const D = designState(w); if (!autoOn(w, 'build')) return;
  if (w.day % DESIGN.every === 0 || !D.avg) designScore(w);
  ledgerTick(w);
  if (w.day >= D.next && ((!D.style && w.pop >= DESIGN.first) || (D.style && w.pop >= D.pop0 * DESIGN.rethink && D.pop0 > 0))) commission(w, D.style ? `The town has grown to ${w.pop} people since the plan was drawn.` : `The village has grown to ${w.pop} people, and homes are going up wherever there is room.`);
  else if (D.style && w.day >= D.nextProj && D.next < w.day + 5000) { D.nextProj = w.day + DESIGN.projEvery; proposeProject(w) }
}
/* one line for the City card */
function designText(w) {
  const D = w.design, st = designStyle(w); if (!D || !st) return '';
  return `The council follows a plan: a <b>${st.name.toLowerCase()}</b>, after ${st.real}. The town's looks score <b>${D.avg}</b> out of 100.`;
}
