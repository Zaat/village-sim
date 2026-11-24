'use strict';
/* ==========================================================================
   history.js — the village chronicle and what it teaches. Hard events
   (famine, fire, storms, fever, wolves, hard winters, crime waves) leave a
   LESSON that grows with each blow and fades slowly, and a library helps it
   last. Lessons change what the village prepares for: deeper food reserves,
   fire watch, healers, firewood stacks, research priorities, defence. The
   chronicle also keeps the village's milestones for the history card.
   ========================================================================== */
const LESSONS = {
  famine: { name: 'Famine', teaches: 'keep deeper food reserves and plant more fields' },
  fire: { name: 'Fire', teaches: 'keep a fire watch, so fewer blazes take hold' },
  storm: { name: 'Storms', teaches: 'shelter the young crops, so storms flatten fewer fields' },
  fever: { name: 'Fever', teaches: 'tend the sick early, so outbreaks come milder and rarer' },
  wolves: { name: 'Wolves', teaches: 'stay ready: the village leans toward a watch and stronger walls' },
  cold: { name: 'Hard winters', teaches: 'stack far more firewood before winter' },
  crime: { name: 'Crime', teaches: 'take law and order more seriously' },
  raids: { name: 'Raids', teaches: 'keep a watch on the dock and stand ready to defend the village' }
};
const LESSON_STEPS = [0.3, 0.55, 0.8];
const CHRON_KINDS = new Set(['regime', 'outpost', 'bridge', 'feud', 'techloss', 'diplomacy', 'voyage', 'discovery', 'era', 'project', 'election', 'lesson', 'event', 'cold', 'faction', 'concern', 'livelihood', 'war', 'culture']);
function initHistory(w) { w.chron = { lessons: Object.fromEntries(Object.keys(LESSONS).map(k => [k, 0])), noted: Object.fromEntries(Object.keys(LESSONS).map(k => [k, 0])), events: [] } }
const lesson = (w, k) => (w.chron ? w.chron.lessons[k] || 0 : 0);
function chronicle(w, kind, text) {
  const C = w.chron; if (!C || !text) return;
  C.events.unshift({ day: w.day, year: w.year, kind, text }); if (C.events.length > 40) C.events.pop();
}
/* each blow teaches a little; a lesson that has grown past a step is announced once */
function learn(w, k, amt) {
  const C = w.chron; if (!C || !(k in C.lessons)) return;
  C.lessons[k] = Math.min(1, C.lessons[k] + amt);
  const lvl = LESSON_STEPS.filter(s => C.lessons[k] >= s).length;
  if (lvl > C.noted[k]) {
    C.noted[k] = lvl;
    w.emit('lesson', `${['', 'The village is learning', 'The village has learned', 'The village has learned hard'][lvl]} from ${LESSONS[k].name.toLowerCase()}: ${LESSONS[k].teaches}.`, { k, lvl });
    if (lvl === 2 && (k === 'wolves' || k === 'crime')) { const pk = k === 'wolves' ? 'defense' : 'law'; w.gov.policy[pk] = Math.max(w.gov.policy[pk], 0.5) }    // the council tightens policy; opinions are left to the villagers
  }
}
/* called from World.emit and World.kill */
function noteEvent(w, type, text, data) {
  if (!w.chron) return;
  if (type === 'event' && data && data.kind) {
    const k = data.kind;
    if (k === 'fire') learn(w, 'fire', 0.25); else if (k === 'storm') learn(w, 'storm', 0.2); else if (k === 'fever') learn(w, 'fever', 0.04 + 0.0015 * (data.sick || 0));
    else if (k === 'wolves') learn(w, 'wolves', 0.05); else if (k === 'harsh') learn(w, 'cold', 0.1); else if (k === 'drought') learn(w, 'famine', 0.06);
    if (k !== 'newcomers') chronicle(w, 'event', text);
  } else if (type === 'cold') { learn(w, 'cold', 0.2); chronicle(w, 'cold', text) }
  else if (CHRON_KINDS.has(type) && type !== 'event') chronicle(w, type, text);
  else if (type === 'death' && data) {
    const why = data.why;
    if (why === 'starved') { learn(w, 'famine', 0.05); for (const v of w.vills) if (v.isAdult()) experience(v, 'hunger', 0.25); const C = w.chron; if (!C.lastFamine || w.day - C.lastFamine > 20) { C.lastFamine = w.day; statCount(w, 'famine', 1, 'Famine'); chronicle(w, 'event', `Famine: ${data.v.name} ${data.v.family} starved. Food has run short.`) } }
    else if (why === 'froze to death') learn(w, 'cold', 0.07); else if (why === 'was killed by a wolf') learn(w, 'wolves', 0.04); else if (why === 'succumbed to the fever') learn(w, 'fever', 0.02);
  }
}
function historyDay(w) {
  const C = w.chron; if (!C) return; const keep = projBuilt(w, 'library') ? 0.995 : 0.99;       // a library keeps lessons alive
  for (const k in C.lessons) { C.lessons[k] *= keep; if (C.lessons[k] < 0.02) { C.lessons[k] = 0; C.noted[k] = 0 } else C.noted[k] = Math.min(C.noted[k], LESSON_STEPS.filter(s => C.lessons[k] >= s - 0.1).length) }
}
/* what the village has learned adds to how badly it wants a discovery */
function lessonNeed(w, id) {
  const L = k => lesson(w, k);
  return ({ granary: 0.4 * L('famine'), rotation: 0.4 * L('famine'), nets: 0.25 * L('famine'), masonry: 0.3 * L('fire'), carpentry: 0.15 * L('storm'), medicine: 0.45 * L('fever'), watchtowers: 0.4 * L('wolves') + 0.35 * L('raids'), ironwork: 0.15 * L('wolves') + 0.2 * L('raids'), forestry: 0.3 * L('cold'), tools: 0.1 * L('cold') })[id] || 0;
}

/* ---- causes of death (v0.32): every death is logged with a plain cause, the year and the age group, so the player can see what is killing people ---- */
const DEATH_KINDS = {
  age: { label: 'Old age', col: '#9aa5ae', tip: 'A natural end. Better health care and food let people live longer.' },
  starved: { label: 'Hunger', col: '#e0a458', tip: 'Build more farms and storehouses, keep a larger food reserve, send hands to the fields.' },
  cold: { label: 'Cold', col: '#6a8fd0', tip: 'Stock firewood before winter and build enough warm homes; warmer clothes and fuel tech help.' },
  wolf: { label: 'Wolves', col: '#b8896a', tip: 'Raise the watch, hunt the packs and keep children close to the village.' },
  fever: { label: 'Illness', col: '#c678dd', tip: 'Medicine, clean water and quarantine slow plague and fever.' },
  sea: { label: 'The sea', col: '#4fa3c7', tip: 'Fewer voyages in storm seasons and better ships and navigation.' },
  fight: { label: 'Fighting', col: '#e07a6a', tip: 'Raids, war and unrest: soldiers, watchtowers, treaties and a calmer council.' }
};
function deathKey(why) {
  return /old age/.test(why) ? 'age' : /starv/.test(why) ? 'starved' : /froze/.test(why) ? 'cold' : /wolf/.test(why) ? 'wolf' : /fever|plague|sick/.test(why) ? 'fever' : /sea/.test(why) ? 'sea' : /raid|battle|unrest/.test(why) ? 'fight' : 'age';
}
function noteDeath(w, v, why) {
  const k = deathKey(why), y = w.year, g = v.isChild() ? 'child' : v.isElder() ? 'elder' : 'adult';
  const Y = (w.dyr[y] = w.dyr[y] || {}); Y[k] = (Y[k] || 0) + 1; Y[g] = (Y[g] || 0) + 1;
  w.dlog.unshift({ day: w.day, name: v.name, age: Math.floor(v.age / (CFG.DPS * 4)), k, g }); if (w.dlog.length > 40) w.dlog.length = 40;
}
