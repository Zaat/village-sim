'use strict';
/* ==========================================================================
   projects.js — great projects. The council weighs a big, costly building
   (hall, library, bastion, monument). The social circles whose members care
   most about it back it and lend their hands; the whole village benefits
   when it is finished. One project at a time. Counsel (Claude) may choose.
   ========================================================================== */
const PROJECTS = {
  hall: {
    name: 'Great Hall', tech: 'carpentry', size: [4, 3], cost: { wood: 70, stone: 20 }, time: 900, minPop: 22,
    pitch: 'a great hall where the council can meet and the village can feast', gives: 'The council meets more often, approval rises, and feasts lift everyone’s mood.',
    fit: v => 0.6 * v.trait.soc + 0.2 * (v.op.labor + 1) / 2 + 0.2 * (v.op.law + 1) / 2,
    need: w => clamp((72 - w.gov.approval) / 40, 0, 1)
  },
  library: {
    name: 'Library', tech: 'masonry', size: [3, 3], cost: { wood: 40, stone: 60 }, time: 1000, minPop: 28,
    pitch: 'a stone library to keep what the village has learned', gives: 'Everything the villagers learn counts half again as much, so discoveries come sooner.',
    fit: v => 0.7 * v.trait.cur + 0.15 * (v.op.growth + 1) / 2 + 0.15 * (1 - v.trait.brave),
    need: w => clamp(0.6 - Object.keys(w.tech.known).length / 30, 0, 1)
  },
  bastion: {
    name: 'Bastion', tech: 'watchtowers', size: [3, 3], cost: { wood: 30, stone: 90 }, time: 1100, minPop: 30,
    pitch: 'a stone bastion to guard the village', gives: 'Wolves come half as often, thefts and brawls fall by a third.',
    fit: v => 0.45 * v.trait.brave + 0.4 * (v.op.defense + 1) / 2 + 0.15 * (v.op.law + 1) / 2,
    need: w => clamp(crimeRate(w, 16) / Math.max(4, w.vills.length * 0.15) + (w.animals.some(a => a.kind === 'wolf' && a.alive) ? 0.3 : 0), 0, 1)
  },
  monument: {
    name: 'Monument', tech: 'masonry', size: [3, 3], cost: { wood: 20, stone: 80 }, time: 1000, minPop: 35,
    pitch: 'a monument to the village’s founders and those it has lost', gives: 'A steady lift in mood, and newcomers are drawn to the village.',
    fit: v => 0.4 * v.trait.soc + 0.3 * (1 - v.trait.ind) + 0.3 * v.trait.kind,
    need: w => clamp((62 - avgMood(w)) / 30, 0, 1)
  }
};
for (const id in PROJECTS) {
  const p = PROJECTS[id]; CFG.COST[id] = p.cost; CFG.SIZE[id] = p.size; CFG.BUILD_TIME[id] = p.time; CFG.SOLID[id] = true;
}
const projBuilt = (w, id) => !!(w.proj && w.proj.done[id]);
const avgMood = w => { const a = adultsOf(w); return a.length ? a.reduce((s, v) => s + v.mood, 0) / a.length : 60 };
function initProjects(w) { w.proj = { active: null, done: {}, cooldown: 10 } }
function projAvailable(w) {
  const pop = adultsOf(w).length + 0;
  return Object.keys(PROJECTS).filter(id => { const p = PROJECTS[id]; return w.has(p.tech) && !projBuilt(w, id) && w.vills.length >= p.minPop && pop >= 8 });
}
/* which circles back it: those whose members like it, best first */
function projBackers(w, id) {
  const p = PROJECTS[id], out = [];
  for (const g of w.groups) {
    const ms = g.members.map(i => w.vills.find(v => v.id === i)).filter(v => v && !v.isChild());
    if (ms.length < 2) continue; out.push({ g, fit: ms.reduce((s, v) => s + p.fit(v), 0) / ms.length });
  }
  return out.sort((a, b) => b.fit - a.fit);
}
/* The council's agenda item. Returns true when it used the meeting. */
function projectAgenda(w, base, ms) {
  const P = w.proj; if (!P || P.active || P.cooldown > 0) return false;
  const ids = projAvailable(w).filter(id => w.stock.wood >= PROJECTS[id].cost.wood * 0.5 && w.stock.stone >= PROJECTS[id].cost.stone * 0.35);
  if (!ids.length || w.bps.length > 4) return false;
  const ad = adultsOf(w), score = {};
  for (const id of ids) {
    const p = PROJECTS[id], pub = ad.reduce((s, v) => s + p.fit(v), 0) / ad.length, cou = ms.reduce((s, m) => s + p.fit(m.v), 0) / ms.length;
    score[id] = 0.35 * pub + 0.25 * cou + 0.4 * p.need(w) + w.r() * 0.08;
  }
  const best = ids.slice().sort((a, b) => score[b] - score[a])[0], go = score[best] > 0.46 - Math.min(0.14, 0.035 * (P.waits || 0));       // each refusal makes the next vote a little easier
  const options = ids.map(id => ({ id, text: `Build the ${PROJECTS[id].name}, ${PROJECTS[id].pitch}. Cost ${PROJECTS[id].cost.wood} firewood and ${PROJECTS[id].cost.stone} stone, many days of work. ${PROJECTS[id].gives}` }));
  options.push({ id: 'wait', text: 'Wait: the village is not ready to commit to a great project yet' });
  deliberate(w, { ...base, kind: 'project', topic: `The council is asked to commit the village to one great project. It takes many hands for many days and drains the stores, but it benefits everyone when finished. ${PROJECTS[best].name} has the most support.`, options, default: go ? best : 'wait',
    apply: (id, sp, reason, src) => {
      const g = w.gov;
      if (id === 'wait') { P.cooldown = 6; P.waits = (P.waits || 0) + 1; recordDecision(w, 'to hold off on any great project for now.', sp, src); g.nextMeeting = w.day + 4; return }
      const bp = placeBuilding(w, id);
      if (!bp) { P.cooldown = 8; recordDecision(w, `to raise a ${PROJECTS[id].name}, but no good site could be found. They will try again.`, sp, src); g.nextMeeting = w.day + 4; return }
      bp.maxWorkers = 6; bp.proj = true;
      const back = projBackers(w, id).filter(x => x.fit > 0.5).slice(0, 3), champ = ms.slice().sort((a, b) => PROJECTS[id].fit(b.v) - PROJECTS[id].fit(a.v))[0];
      P.waits = 0; P.active = { type: id, since: w.day, backers: back.map(x => x.g.id), names: back.map(x => x.g.name), champ: champ.v.name };
      recordDecision(w, `to raise a ${PROJECTS[id].name}, ${PROJECTS[id].pitch}. ${champ.v.name} led the argument${back.length ? '; ' + back.map(x => x.g.name).join(' and ') + ' pledged their labour' : ''}.`, sp, src);
      w.emit('project', `Work begins on the ${PROJECTS[id].name}.`, { id });
      g.nextMeeting = w.day + 4;
    } });
  return true;
}
function projectDone(w, b, bp) {
  const P = w.proj, id = bp.type, p = PROJECTS[id], a = P.active && P.active.type === id ? P.active : { backers: [], names: [], champ: '' };
  P.done[id] = { day: w.day, year: w.year, champ: a.champ, names: a.names, x: b.x, y: b.y }; P.active = null; P.cooldown = 14;
  const ad = adultsOf(w); for (const v of w.vills) v.mood = clamp(v.mood + (a.backers.includes(v.group) ? 10 : 5), 0, 100);
  if (id === 'hall') w.gov.approval = clamp(w.gov.approval + 10, 0, 100);
  if (id === 'library') w.tech.points += 40;
  w.emit('project', `The ${p.name} is finished! ${a.names.length ? a.names.join(' and ') + ' are proud of their work. ' : ''}${p.gives}`, { id, done: true });
  w.gov.decisions.unshift({ day: w.day, text: `the ${p.name} was completed after ${w.day - (a.since || w.day)} days of labour`, speeches: [], source: 'rules' }); if (w.gov.decisions.length > 12) w.gov.decisions.pop();
  void ad;
}
function projectDay(w) {
  const P = w.proj; if (!P) return;
  if (P.cooldown > 0) P.cooldown--;
  if (P.active && !w.bps.some(b => b.type === P.active.type)) P.active = null;       // site lost: forget it
  if (projBuilt(w, 'monument')) for (const v of adultsOf(w)) v.mood = clamp(v.mood + 0.6, 0, 100);
  if (projBuilt(w, 'hall') && w.festival) for (const v of adultsOf(w)) v.mood = clamp(v.mood + 0.8, 0, 100);
}
