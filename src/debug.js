/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   debug.js — diagnostics shared by the UI: error history (kept across page
   loads), a full report you can copy or download, and live performance numbers.
   ========================================================================== */
const APP_VERSION = '0.38.1';
const ERR_KEY = 'villagesim.errors';
const DBG = { fps: 0, tps: 0, frameMs: 0, renderMs: 0, restarts: 0, lastRestart: null, session: new Map(), previous: [], watchdog: [], persistAt: 0 };

function dbgLoadPrevious() { try { DBG.previous = JSON.parse(localStorage.getItem(ERR_KEY) || '[]') } catch (e) { DBG.previous = [] } }
/* record an error that happened outside the simulation (drawing, UI, main loop) */
function dbgNote(where, e) {
  const msg = (e && e.message) || String(e), key = where + ': ' + msg; let r = DBG.session.get(key);
  if (!r) { r = { where, msg, stack: ((e && e.stack) || '').split('\n').slice(0, 6).join('\n'), count: 0, first: { day: typeof world !== 'undefined' && world ? world.day : 0 }, ent: null }; DBG.session.set(key, r); if (DBG.session.size > 30) DBG.session.delete(DBG.session.keys().next().value) }
  r.count++; return r;
}
function dbgAllErrors(w) { return [...(w ? w.dbg.errors.values() : []), ...DBG.session.values()] }
function dbgPersist(w) {
  const now = Date.now(); if (now - DBG.persistAt < 2000) return; DBG.persistAt = now;
  try { const arr = dbgAllErrors(w).slice(-25).map(r => ({ t: now, where: r.where, msg: r.msg, stack: r.stack, count: r.count, day: r.first && r.first.day, ent: r.ent })); if (arr.length) localStorage.setItem(ERR_KEY, JSON.stringify(arr)) } catch (e) { }
}
function dbgSections(w) {
  const d = w.dbg, rows = Object.entries(d.prof).map(([k, p]) => ({ name: k, avgMs: p.t / Math.max(1, p.n), totalMs: p.t, maxMs: p.max, calls: p.n })), tot = rows.reduce((s, r) => s + r.totalMs, 0) || 1;
  for (const r of rows) r.share = r.totalMs / tot; return rows.sort((a, b) => b.totalMs - a.totalMs);
}
function dbgReport(w, speed) {
  const d = w.dbg, mem = (typeof performance !== 'undefined' && performance.memory) ? { usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576), limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576) } : null;
  const secs = dbgSections(w).map(r => ({ ...r, avgMs: +r.avgMs.toFixed(3), totalMs: Math.round(r.totalMs), maxMs: +r.maxMs.toFixed(2), share: +(r.share * 100).toFixed(1) + '%' }));
  return {
    app: 'Village Sim', version: APP_VERSION, when: new Date().toISOString(), userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
    world: { seed: w.seed, settings: w.settings, tick: w.tick, year: w.year, season: SEASONS[w.season], dayOfSeason: w.seasonDay, day: w.day, requestedSpeed: speed },
    counts: { villagers: w.vills.length, animals: w.animals.length, blueprints: w.bps.length, buildings: w.buildings.size, relations: w.rel.size, groups: w.groups.length, councillors: w.gov.council.length, logLines: w.log.length, history: w.hist.length },
    performance: { fps: +DBG.fps.toFixed(1), ticksPerSecond: +DBG.tps.toFixed(1), targetTicksPerSecond: CFG.TPS * speed, avgTickMs: d.ticks ? +(d.tickMs / d.ticks).toFixed(3) : null, maxTickMs: +d.tickMax.toFixed(2), frameMs: +DBG.frameMs.toFixed(2), renderMs: +DBG.renderMs.toFixed(2), memory: mem },
    sections: secs, unstuckVillagers: d.unstuck, watchdogEvents: DBG.watchdog.slice(-10), restarts: DBG.restarts,
    errors: dbgAllErrors(w).map(r => ({ where: r.where, message: r.msg, count: r.count, firstDay: r.first && r.first.day, entity: r.ent, stack: r.stack })),
    previousSessionErrors: DBG.previous, recentEvents: w.log.slice(0, 30).map(l => `D${l.day} ${l.text}`),
  };
}
