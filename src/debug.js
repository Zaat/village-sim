/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   debug.js — diagnostics shared by the UI: error history (kept across page
   loads), a full report you can copy or download, and live performance numbers.
   ========================================================================== */
const APP_VERSION = '0.40';
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
  try { const arr = dbgAllErrors(w).slice(-25).map(r => ({ v: APP_VERSION, t: now, where: r.where, msg: r.msg, stack: r.stack, count: r.count, day: r.first && r.first.day, ent: r.ent })); if (arr.length) localStorage.setItem(ERR_KEY, JSON.stringify(arr)) } catch (e) { }
}
function dbgSections(w) {
  const d = w.dbg, rows = Object.entries(d.prof).map(([k, p]) => ({ name: k, avgMs: p.t / Math.max(1, p.n), totalMs: p.t, maxMs: p.max, calls: p.n })), tot = rows.reduce((s, r) => s + r.totalMs, 0) || 1;
  for (const r of rows) r.share = r.totalMs / tot; return rows.sort((a, b) => b.totalMs - a.totalMs);
}
/* one line saying what is limiting the speed, so a report explains itself (v0.39.2) */
function perfVerdict(sp) {
  if (!(sp > 0)) return 'paused';
  const raf = DBG.rafFps || 0, busy = (DBG.frameMs || 0) * raf / 10, draw = (DBG.renderMs || 0) * raf / 10, eff = DBG.tps / (CFG.TPS * sp), budget = sp >= 100 ? 45 : 14;
  if (eff >= 0.9) return 'on speed';
  if (busy > 85 && draw > 50) return `drawing takes ${Math.round(draw)}% of the time (${(DBG.renderMs || 0).toFixed(1)} ms a draw, ${raf.toFixed(0)} frame calls a second), so the simulation only gets what is left`;
  if ((DBG.stepMs || 0) > budget * 0.8) return `ticking is the limit: ${(DBG.stepMs || 0).toFixed(0)} ms of every frame goes to ticks`;
  return `neither drawing (${Math.round(draw)}%) nor ticking is saturated (${Math.round(busy)}% busy): the page is being slowed from outside (other programs, power saving, a throttled window)`;
}
function timerStep() { let a = performance.now(), b = a, n = 0; while (b === a && n++ < 2e6) b = performance.now(); return +(b - a).toFixed(4) }
/* Is anything lying on top of the tab buttons? For each button: what element is on top at its centre, and which cursor shows there (#174: tabs that did not react to clicks in a full-screen window). */
function tabProbe() {
  if (typeof document === 'undefined') return null;
  const bar = document.getElementById('tabbar'); if (!bar) return null;
  const out = { buttons: 0, covered: [], cursor: null, bar: null };
  const br = bar.getBoundingClientRect(); out.bar = br.width ? Math.round(br.left) + ',' + Math.round(br.top) + ' ' + Math.round(br.width) + 'x' + Math.round(br.height) : 'hidden';
  for (const b of bar.querySelectorAll('button')) {
    const r = b.getBoundingClientRect(); if (!r.width || !r.height) continue; out.buttons++;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), ok = top && (top === b || b.contains(top));
    if (!ok) out.covered.push((b.dataset.tab || b.textContent.trim()) + ' under ' + (top ? top.tagName.toLowerCase() + (top.id ? '#' + top.id : '') + (top.className && typeof top.className === 'string' ? '.' + top.className.split(' ')[0] : '') : 'nothing'));
    else if (!out.cursor) out.cursor = getComputedStyle(b).cursor;
  }
  return out;
}
function dbgReport(w, speed) {
  const d = w.dbg, mem = (typeof performance !== 'undefined' && performance.memory) ? { usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576), limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576) } : null;
  const secs = dbgSections(w).map(r => ({ ...r, avgMs: +r.avgMs.toFixed(3), totalMs: Math.round(r.totalMs), maxMs: +r.maxMs.toFixed(2), share: +(r.share * 100).toFixed(1) + '%' }));
  return {
    app: 'Village Sim', version: APP_VERSION, when: new Date().toISOString(), userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
    world: { seed: w.seed, settings: w.settings, tick: w.tick, year: w.year, season: SEASONS[w.season], dayOfSeason: w.seasonDay, day: w.day, requestedSpeed: speed },
    counts: { villagers: w.vills.length, animals: w.animals.length, blueprints: w.bps.length, buildings: w.buildings.size, relations: w.rel.size, groups: w.groups.length, councillors: w.gov.council.length, logLines: w.log.length, history: w.hist.length },
    performance: { fps: +DBG.fps.toFixed(1), frameCallsPerSecond: +(DBG.rafFps || 0).toFixed(1), ticksPerSecond: +DBG.tps.toFixed(1), targetTicksPerSecond: CFG.TPS * speed, avgTickMs: d.ticks ? +(d.tickMs / d.ticks).toFixed(3) : null, maxTickMs: +d.tickMax.toFixed(2), frameMs: +DBG.frameMs.toFixed(2), renderMs: +DBG.renderMs.toFixed(2), stepMs: +(DBG.stepMs || (d.ticks ? d.tickMs / d.ticks * (DBG.tps / Math.max(1, DBG.rafFps || 1)) : 0) || 0).toFixed(2), ticksPerFrame: +(DBG.tpf || (DBG.tps || 0) / Math.max(1, DBG.rafFps || 1) || 0).toFixed(2), longestFrameMs: Math.round(DBG.dtMax || 0), speedSetting: speed, secondsAtThisSpeed: Math.round((performance.now() - (DBG.speedSince || 0)) / 1000), busyPercent: Math.round((DBG.frameMs || 0) * (DBG.rafFps || 0) / 10), drawPercent: Math.round((DBG.renderMs || 0) * (DBG.rafFps || 0) / 10), verdict: perfVerdict(speed), cores: navigator.hardwareConcurrency || null, timerStepMs: timerStep(), focused: document.hasFocus(), visible: document.visibilityState, memory: mem, lastSeconds: (DBG.hist || []).slice(-30) },
    village: (() => { try { return diagText(w).split('\n') } catch (e) { return ['(snapshot unavailable: ' + (e && e.message || e) + ')'] } })(),
    crowd: w.crowd ? { people: w.crowd.n, kids: w.crowd.kids, adults: w.crowd.adults, elders: w.crowd.elders, workers: w.crowd.workers, hungry: w.crowd.hungry, simulatedVillagers: w.vills.length } : null,
    activity: (() => { const L = {}; for (const v of w.vills) { const k = v.sleeping ? 'Sleeping' : (v.label || 'none'); L[k] = (L[k] || 0) + 1 } return Object.entries(L).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => k + ': ' + n) })(),
    world2: { age: typeof techEra === 'function' ? AGES[techEra(w)] : null, techs: Object.keys(w.tech.known).length, culture: w.cul ? Math.round(w.cul.score) : null, coins: Math.round((w.gov && w.gov.coins) || 0), outposts: (w.out && w.out.list ? w.out.list.length : 0), peoplesMet: (w.neigh || []).filter(n => n.found).length, playing: !!(w.play && w.play.on), loadedFrom: w.loadedFrom || 'new world' },
    device: typeof innerWidth !== 'undefined' ? { storage: DBG.persist || null, tabs: (() => { try { return tabProbe() } catch (e) { return null } })(), viewport: innerWidth + 'x' + innerHeight, dpr: devicePixelRatio, layout: (document.body.dataset.layout || 'docked'), language: (typeof I18N !== 'undefined' ? I18N.lang : '?'), fullscreen: !!document.fullscreenElement, touch: navigator.maxTouchPoints || 0 } : null,
    stats: (() => { try { const S = w.stats; if (!S || !S.days.length) return null; const n = S.days.length, take = id => (S.s[id] || []).slice(Math.max(0, n - 6)); return { lastDays: S.days.slice(Math.max(0, n - 6)), pop: take('pop'), food: take('food'), mood: take('mood') } } catch (e) { return null } })(),
    sections: secs, unstuckVillagers: d.unstuck, watchdogEvents: DBG.watchdog.slice(-10), restarts: DBG.restarts,
    errors: dbgAllErrors(w).map(r => ({ where: r.where, message: r.msg, count: r.count, firstDay: r.first && r.first.day, entity: r.ent, stack: r.stack })),
    previousSessionErrors: DBG.previous, lastLoadError: DBG.lastLoadError || null, recentEvents: w.log.slice(0, 30).map(l => `D${l.day} ${l.text}`),
  };
}
