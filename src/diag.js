/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   diag.js (v0.33): what is needed to look at a run without guessing.

   • worldLine(w): one plain line of text with everything that makes a world:
     version, seed, map, size, hardship, philosophy, open knowledge, the
     switches, and how far the run has got. Paste it in a message.
   • logAction(w, kind, text): a small saved log of the player's own choices
     (concern responses, settings changes). A seed plus settings gets the
     same world; the log says which of the player's hands moved it.
   • diagText(w): the world line plus a snapshot of the moment: people,
     homes and beds, what blocks building, projects, concerns, faults.
   Pure simulation: no page access, no random numbers.
   ========================================================================== */
const SIZE_NAMES = { 200: 'compact', 260: 'standard', 340: 'large' };
const HARD_NAMES = ['gentle', 'normal', 'harsh'];
function worldLine(w) {
  const s = w.settings || {}, ver = typeof APP_VERSION !== 'undefined' ? 'v' + APP_VERSION : 'v?', sz = SIZE_NAMES[CFG.W] || (CFG.W + 'x' + CFG.H), yr = Math.floor((w.day - 1) / (CFG.DPS * 4)) + 1, dy = ((w.day - 1) % (CFG.DPS * 4)) + 1;
  const sw = ['survival', 'disasters', 'crime', 'raids'].map(k => k + ' ' + (s[k] ? 'on' : 'off')).join(', ');
  return `${ver} · seed ${w.seed} · ${w.arch} · ${sz} · hardship ${HARD_NAMES[s.hardship == null ? 1 : s.hardship] || s.hardship} · ${s.philosophy || 'balanced'} · open knowledge ${['off', 'relaxed', 'unlimited'][s.openKnowledge || 0] || s.openKnowledge} · ${sw} · year ${yr} day ${dy} (tick ${w.tick})`;
}
/* the short form shown in Settings; the full line (copied on click) is what the Seed box can parse */
function worldLineShort(w) {
  const s = w.settings || {}, ver = typeof APP_VERSION !== 'undefined' ? 'v' + APP_VERSION : 'v?', sz = SIZE_NAMES[CFG.W] || (CFG.W + 'x' + CFG.H), yr = Math.floor((w.day - 1) / (CFG.DPS * 4)) + 1, dy = ((w.day - 1) % (CFG.DPS * 4)) + 1;
  return `${ver} · seed ${w.seed} · ${w.arch} · ${sz} · ${HARD_NAMES[s.hardship == null ? 1 : s.hardship] || s.hardship} · year ${yr} day ${dy}`;
}
function logAction(w, kind, text) {
  const L = w.alog || (w.alog = []); L.push({ t: w.tick, k: kind, a: text }); if (L.length > 300) L.splice(0, L.length - 300);
}
function diagText(w) {
  const pop = w.pop, bps = w.bps.filter(b => b.type !== 'road'), out = [worldLine(w)];
  out.push(`people ${pop} · homes ${w.houses().length} · beds ${w.beds()} · projects open ${bps.length} (${bps.filter(b => !b.ready()).length} waiting for materials)`);
  out.push('stock: ' + Object.keys(w.stock).map(k => k + ' ' + Math.floor(w.stock[k])).join(', ') + ` · trees ${w.trees} of ${w.trees0 || '?'} · boats ${(w.boats || []).length} · season ${['spring', 'summer', 'autumn', 'winter'][w.season] || w.season}${w.cold ? ' · COLD (out of firewood)' : ''}`);
  if (w.beds() < pop + 2 && typeof housingDiag === 'function') { try { const h = housingDiag(w); out.push('housing held up: ' + (h.why.join('; ') || 'no cause found') + `\nfree sites near ${JSON.stringify(h.close)}\nfree sites wide ${JSON.stringify(h.wide)}`) } catch (e) { } }
  const cn = typeof openConcerns === 'function' ? openConcerns(w) : []; if (cn.length) out.push('concerns: ' + cn.map(c => c.key + '(' + c.sev + ')').join(', '));
  if (w.dbg) out.push(`deferred searches ${w.dbg.deferred || 0} · faults ${w.dbg.total || 0}`);
  const L = w.alog || []; if (L.length) out.push(`your actions (${L.length}): ` + L.slice(-8).map(a => `y${Math.floor((a.t / CFG.TPD - 1) / (CFG.DPS * 4)) + 1} ${a.k} ${a.a}`).join(' | '));
  return out.join('\n');
}

/* the reverse of worldLine: take a pasted line apart. Returns what it could read (seed, map, size, hardship 0-2, phil, open 0-2, switches) or null when there is no seed in it. */
function parseWorldLine(text) {
  const t = String(text || ''), m = /seed\s+(\d+)/.exec(t); if (!m) return null;
  const out = { seed: +m[1] >>> 0 }, parts = t.split('·').map(x => x.trim()), si = parts.findIndex(x => /^seed\b/.test(x));
  if (si >= 0) { const mp = parts[si + 1], sz = parts[si + 2]; if (mp && /^[a-z]+$/.test(mp)) out.map = mp; if (sz && (SIZE_NAMES[200] === sz || sz === 'standard' || sz === 'large')) out.size = sz }
  const h = /hardship\s+(gentle|normal|harsh)/.exec(t); if (h) out.hardship = HARD_NAMES.indexOf(h[1]);
  const hi = parts.findIndex(x => /^hardship\b/.test(x)); if (hi >= 0 && parts[hi + 1] && /^[a-z]+$/.test(parts[hi + 1]) && !/^open|^year|^survival/.test(parts[hi + 1])) out.phil = parts[hi + 1];
  const o = /open knowledge\s+(off|relaxed|unlimited)/.exec(t); if (o) out.open = ['off', 'relaxed', 'unlimited'].indexOf(o[1]);
  for (const k of ['survival', 'disasters', 'crime', 'raids']) { const r = new RegExp(k + '\\s+(on|off)').exec(t); if (r) (out.switches || (out.switches = {}))[k] = r[1] === 'on' }
  return out;
}
