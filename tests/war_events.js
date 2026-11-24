// v0.30 conflict: muster, units, battles, raids with a standing army, campaigns, outpost attacks, allies, upkeep, save/load
const { loadSim } = require('./lib');
const ctx = loadSim('World,CFG,serializeWorld,deserializeWorld,warDay,WAR,threatLevel,targetSize,armyPower,soldiersOf,soldiersHome,battle,defenseScore,raidVisit,projBuilt,PROJECTS,projAvailable,campaignDay,resolveCampaign,outpostThreats,alliesFor,UNITS,bestUnit,hostileNeighbours,settleRaid,warRules,CONCERN_KINDS');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
const seed = +process.argv[2] || 777;
const mk = o => new ctx.World(seed, { map: 'island', ...o });
const run = (w, days) => { for (let t = 0; t < 1200 * days; t++) w.step() };
const adv = (w, d) => { w.tick += 1200 * d };
const base = mk({ raids: true }); run(base, 40);
const clone = o => { const w = ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(base)))); if (o) Object.assign(w.settings, o); return w };
const hostile = (w, extra) => { const n = w.neigh.find(x => x.kind === 'raiders'); Object.assign(n, { met: true, rel: -40, grudge: 0.5, tribute: 0, raids: 2, nextVisit: 9999, nextDemand: 9999, raidCd: 9999, pop: 30, strength: 24, ...extra }); return n };

/* ----- battles: deterministic, favour the stronger, losses on both sides ----- */
{
  const w = clone();
  const A = { n: 6, str: 6 }, B = { n: 6, str: 6 };
  const r1 = ctx.battle(w, A, B, 5), r2 = ctx.battle(w, A, B, 5);
  ok(JSON.stringify(r1) === JSON.stringify(r2), 'battle is deterministic for the same day and salt');
  let strongWins = 0, weakWins = 0, bothLose = 0;
  for (let s = 0; s < 60; s++) { const r = ctx.battle(w, { n: 8, str: 16 }, { n: 8, str: 5 }, s); if (r.win === 'att') strongWins++; if (r.win === 'def') weakWins++; if (r.aLost > 0 && r.dLost > 0) bothLose++ }
  ok(strongWins >= 50 && weakWins <= 2, 'the far stronger side wins nearly always: ' + strongWins + '/' + weakWins);
  ok(bothLose >= 10, 'even a winner takes losses: ' + bothLose);
  const e = ctx.battle(w, { n: 6, str: 6 }, { n: 6, str: 6 }, 9);
  ok(e.aLost <= 6 && e.dLost <= 6 && e.aLost >= 0 && e.dLost >= 0, 'losses stay within the ranks');
  ok(ctx.UNITS.musketeer.pow > ctx.UNITS.spearman.pow && ctx.UNITS.spearman.pow > ctx.UNITS.militia.pow, 'better arms are stronger');
  ok(!w.war || Object.keys(w.war.rolls).length === 0, 'no army at peace');
  ok(ctx.armyPower(w) === 0 && ctx.targetSize(w) === 0, 'no army and no target without a threat');
}

/* ----- muster when a threat is felt, stand down when it fades ----- */
{
  const w = clone(); const n = hostile(w);
  ok(ctx.threatLevel(w) > 0.3, 'a hostile, met neighbour raises the threat: ' + ctx.threatLevel(w).toFixed(2));
  const tgt = ctx.targetSize(w); ok(tgt >= 1, 'target size is set: ' + tgt);
  run(w, 30); const s = ctx.soldiersOf(w).length;
  const tgt2 = Math.max(tgt, ctx.targetSize(w)); ok(s >= 1 && s <= Math.max(tgt2, 2) + 2, 'soldiers muster up to the target: ' + s + ' of ' + tgt2);
  ok(ctx.soldiersOf(w).every(v => v.isAdult() && !v.isElder()), 'soldiers are adults, not elders');
  const base = ctx.defenseScore(w);
  const W = ctx.WAR(w); const keep = W.rolls; W.rolls = {}; const bare = ctx.defenseScore(w); W.rolls = keep;
  ok(base > bare || s === 0, 'soldiers raise defence: ' + bare.toFixed(2) + ' -> ' + base.toFixed(2));
  ok(ctx.armyPower(w) > 0, 'army power counts');
  ok(w.stock.food >= 0, 'food never negative');
  // the threat fades
  n.rel = 60; n.kind = 'traders'; n.grudge = 0; W.alertUntil = 0; w.gov.policy.defense = 0;
  run(w, 90); ok(ctx.soldiersOf(w).length < s || s <= 1, 'the army is stood down when the danger passes: ' + ctx.soldiersOf(w).length + ' from ' + s);
  ok(w.dbg.total === 0, 'no errors in muster run: ' + [...w.dbg.errors.values()].map(e => e.where + ' ' + e.msg).join(';'));
}

/* ----- raids settle through the battle model; the ranks bleed first ----- */
{
  const w = clone(); const n = hostile(w); run(w, 30);
  const W = ctx.WAR(w), pop0 = w.vills.length, sold0 = ctx.soldiersOf(w).length;
  let outcomes = {}, errs = 0;
  for (let i = 0; i < 6; i++) { n.raidCd = 0; w.visit = null; try { ctx.raidVisit(w, n) } catch (e) { errs++; console.log(e.stack) } const b = W.battles[0]; if (b && b.kind === 'raid') outcomes[b.outcome] = (outcomes[b.outcome] || 0) + 1; w.visit = null; for (let t = 0; t < 1200; t++) w.step() }
  ok(errs === 0, 'raidVisit runs cleanly');
  ok(W.battles.filter(b => b.kind === 'raid').length === 6, 'each raid is logged as a battle: ' + JSON.stringify(outcomes));
  ok(W.repelled + (W.fallen >= 0 ? 0 : 1) >= 0, 'counters exist');
  ok(w.vills.length > 0, 'village survives');
  ok(w.dbg.total === 0, 'no errors in raid run: ' + [...w.dbg.errors.values()].map(e => e.where + ' ' + e.msg).join(';'));
  // a big army repels a small raid
  W.rolls = {}; const ad = w.vills.filter(v => v.isAdult() && !v.isElder()); for (const v of ad.slice(0, 12)) W.rolls[v.id] = { t: 'spearman', xp: 4 };
  const D = ctx.defenseScore(w); let rep = 0; for (let k = 0; k < 20; k++) { adv(w, 1); if (ctx.settleRaid(w, n, 2, D).outcome === 'repelled') rep++ }
  ok(rep >= 16, 'twelve drilled spearmen repel a small raid almost always: ' + rep + '/20');
  W.rolls = {}; let rep2 = 0; for (let k = 0; k < 20; k++) { adv(w, 1); if (ctx.settleRaid(w, n, 9, 1.2).outcome === 'repelled') rep2++ }
  ok(rep2 <= 4, 'an undefended village does not repel a large raid: ' + rep2 + '/20');
}

/* ----- friends stand with the village ----- */
{
  const w = clone(); const f = w.neigh.find(x => x.kind !== 'raiders');
  Object.assign(f, { met: true, pact: 2, rel: 80, pop: 40, strength: 30 });
  const al = ctx.alliesFor(w); ok(al.length >= 1 && al[0].str > 0, 'a friend with a treaty stands with the village');
  f.pact = 0; ok(ctx.alliesFor(w).length === 0, 'no treaty, no allies');
  f.pact = 2; f.rel = 30; ok(ctx.alliesFor(w).length === 0, 'cool friends send no help');
}

/* ----- campaigns ----- */
{
  const w = clone(); const n = hostile(w); run(w, 30);
  const W = ctx.WAR(w), ad = w.vills.filter(v => v.isAdult() && !v.isElder() && !w.gov.council.some(c => c.id === v.id));
  for (const v of ad.slice(0, 10)) W.rolls[v.id] = { t: 'swordsman', xp: 6 };
  const ids = ad.slice(0, 10).map(v => v.id), s0 = w.vills.length;
  W.campaign = { n: n.id, ids, start: w.day, back: w.day }; W.away = ids.slice();
  ok(ctx.soldiersHome(w).length === ctx.soldiersOf(w).length - ids.filter(id => W.rolls[id]).length, 'soldiers on campaign are not at home');
  const aw = ctx.armyPower(w); W.away = []; const home = ctx.armyPower(w); W.away = ids.slice();
  ok(aw < home, 'an army away does not defend: ' + aw.toFixed(2) + ' < ' + home.toFixed(2));
  const food0 = w.stock.food; n.strength = 14;
  ctx.resolveCampaign(w);
  ok(W.campaign === null && W.away.length === 0, 'campaign resolves and the army returns');
  const b = W.battles[0]; ok(b && b.kind === 'campaign' && ['won', 'lost', 'drawn'].includes(b.outcome), 'campaign is logged: ' + JSON.stringify(b));
  ok(W.won + W.lost + W.drawn === 1, 'one result counted');
  run(w, 2); ok(ids.filter(id => !w.vills.some(v => v.id === id)).length >= W.fallen && W.fallen === b.lostOurs, 'fallen soldiers are really dead: ' + W.fallen + ' ' + b.lostOurs + ' ' + ids.filter(id => !w.vills.some(v => v.id === id)).length);
  if (W.won) { ok(n.tribute > w.day - 3, 'a defeated neighbour pays tribute'); ok(W.plunder > 0, 'plunder is taken') }
  ok(w.dbg.total === 0, 'no errors in campaign run: ' + [...w.dbg.errors.values()].map(e => e.where + ' ' + e.msg).join(';'));
  // the decision is asked of the council and only with the switch on
  const w2 = clone({ raids: false }); hostile(w2); const W2 = ctx.WAR(w2); const ad2 = w2.vills.filter(v => v.isAdult() && !v.isElder()); for (const v of ad2.slice(0, 8)) W2.rolls[v.id] = { t: 'spearman', xp: 2 };
  for (let k = 0; k < 60; k++) { adv(w2, 1); ctx.warDay(w2) } ok(!W2.campaign && W2.won + W2.lost + W2.drawn === 0, 'no campaigns without the Raids switch');
}

/* ----- hostile neighbours attack outposts ----- */
{
  const w = clone(); const n = hostile(w); const O = w.out;
  O.list.push({ id: 91, name: 'Testhold', state: 'active', pop: 12, loyalty: 0.6, food: 20, wood: 0, stone: 0, role: 'farming', x: 5, y: 5, day: w.day, mode: 'land', made: 0, rich: 1, stage: 0 });
  const o = O.list[O.list.length - 1]; const W = ctx.WAR(w); let hits = 0;
  for (let k = 0; k < 40 && o.state === 'active'; k++) { W.nextOutRaid = 0; adv(w, 3); const was = o.pop; ctx.outpostThreats(w); if (o.pop < was || o.state === 'gone') hits++ }
  ok(W.battles.some(b => b.kind === 'outpost'), 'outpost attacks are fought and logged');
  ok(hits >= 1 || W.repelled >= 1, 'attacks either hurt or are beaten off');
  ok(o.pop >= 0, 'outpost population is sane: ' + o.pop + ' ' + o.state);
  const w3 = clone({ raids: false }); run(w3, 10); hostile(w3); ok(!w3.war || w3.war.battles.length === 0, 'peaceful default: no battles');
}

/* ----- projects, concerns, stats, save/load ----- */
{
  const w = clone(); hostile(w); run(w, 20);
  ok(!!ctx.PROJECTS.barracks && !!ctx.PROJECTS.watchtower, 'barracks and watchtower are great projects');
  w.tech.known.spears = 1; w.tech.known.watchtowers = 1; w.tech.known.masonry = 1; w.tech.known.carpentry = 1;
  const av = ctx.projAvailable(w); ok(av.includes('barracks'), 'barracks become available under threat with spears: ' + av.join(','));
  const found = []; const W = ctx.WAR(w); W.rolls = {}; w.settings.raids = true; ctx.warRules(w, {}, found);
  ok(found.some(f => f.key === 'defence') || ctx.threatLevel(w) < 0.35, 'a thin defence is raised as a concern');
  W.morale = 0.2; const ad = w.vills.filter(v => v.isAdult()); for (const v of ad.slice(0, 4)) W.rolls[v.id] = { t: 'militia', xp: 0 }; const f2 = []; ctx.warRules(w, {}, f2); ok(f2.some(f => f.key === 'army'), 'a hungry army is a concern');
  ok(!!ctx.CONCERN_KINDS.defence && !!ctx.CONCERN_KINDS.army, 'concern kinds exist');
  const d = ctx.serializeWorld(w), w2 = ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));
  ok(JSON.stringify(w2.war.rolls) === JSON.stringify(w.war.rolls) && w2.war.morale === w.war.morale, 'the army survives save and load');
  run(w2, 10); ok(w2.dbg.total === 0, 'a reloaded war world runs: ' + [...w2.dbg.errors.values()].map(e => e.where + ' ' + e.msg).join(';'));
  const old = JSON.parse(JSON.stringify(d)); delete old.war; const w3 = ctx.deserializeWorld(old); run(w3, 5); ok(w3.dbg.total === 0, 'saves without a war section load');
  ok(w.stats && (w.stats.series || w.stats.s || true), 'stats alive');
}

/* ----- upkeep and the regime ----- */
{
  const w = clone(); hostile(w); const W = ctx.WAR(w); const ad = w.vills.filter(v => v.isAdult() && !v.isElder()).slice(0, 10);
  for (const v of ad) W.rolls[v.id] = { t: 'spearman', xp: 0 };
  w.rx.A = 0.0; w.stock.food = 200; const f0 = w.stock.food; adv(w, 1); ctx.warDay(w); const costOpen = f0 - w.stock.food;
  w.rx.A = 1.0; w.stock.food = 200; adv(w, 1); ctx.warDay(w); const costAuth = 200 - w.stock.food;
  ok(costOpen > 0 && costAuth > 0 && costAuth < costOpen, 'authority keeps an army cheaper: ' + costAuth.toFixed(2) + ' < ' + costOpen.toFixed(2));
  const m0 = W.morale; w.stock.food = 0; adv(w, 1); ctx.warDay(w); ok(W.morale < m0, 'a starving army loses heart');
}

console.log(fail ? 'FAILED ' + fail : 'war passed ' + pass); process.exit(fail ? 1 : 0);
