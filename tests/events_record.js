// v0.39.3 event record: every logged line is classified, positioned where known, kept in compact long form, saved and loaded
const L = require('./lib'), vm = require('vm'), fs = require('fs');
const ctx = L.loadSim('World,CFG,serializeWorld,deserializeWorld,evKind,evRecord,evTrim,evFeed,evYears,evNow,evYearOf,EV_GROUPS,EV_KEEP,initEvents,ST,statCount');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
// classification
const K = (t, x, d) => JSON.stringify(ctx.evKind(t, x || '', d));
ok(K('birth', 'A was born.') === '["people",1]', 'birth: ' + K('birth', 'A was born.'));
ok(K('event', 'Fire!', { kind: 'fire' }) === '["hard",2]', 'fire is big hardship');
ok(K('event', 'Storm', { kind: 'storm' }) === '["hard",1]', 'storm is medium hardship');
ok(K('event', 'Newcomers', { kind: 'newcomers' }) === '["people",1]', 'newcomers are people');
ok(K('death', 'X died.', { v: {}, lead: true }) === '["people",2]' && K('death', 'X died.', { v: {} }) === '["people",1]', 'a leader\'s death is big, others medium');
ok(K('diplomacy', 't', { kind: 'raid' }) === '["world",2]' && K('diplomacy', 't', { kind: 'aid' }) === '["world",1]', 'diplomacy tiers');
ok(K('era', 'New age') === '["progress",2]', 'an era is big progress');
ok(K(undefined, 'A new dock is finished, and a fishing boat is launched.') === '["progress",1]', 'say: dock finished');
ok(K(undefined, 'Mara and Jon have become a couple.') === '["people",1]', 'say: couple');
ok(K(undefined, 'Mara and Jon became friends.') === '["people",0]', 'say: friends are small');
ok(K(undefined, 'Zzz something unknown.') === '["people",0]', 'say: unknown wording is small');
// a played world
const w = L.loadCheckpoint(ctx, 'isl555_d200'); for (let t = 0; t < 1200 * 60; t++) w.step();
const E = w.ev; ok(E && E.list.length > 20, 'events recorded: ' + (E ? E.list.length : 0));
ok(E.list.every((e, i) => i === 0 || e.i > E.list[i - 1].i), 'ids increase');
ok(E.list.every(e => ctx.EV_GROUPS[e.g] && e.t >= 0 && e.t <= 2 && typeof e.s === 'string' && e.s.length > 3 && Number.isInteger(e.d)), 'every entry has a group, a tier, text and a day');
const pos = E.list.filter(e => e.x !== undefined); ok(pos.length > 5, 'some events carry a place: ' + pos.length);
ok(pos.every(e => Number.isFinite(e.x) && Number.isFinite(e.y) && e.x >= 0 && e.y >= 0 && e.x <= ctx.CFG.W && e.y <= ctx.CFG.H), 'places are on the map');
ok(w.log[0].i === E.list[E.list.length - 1].i, 'the flat log shares ids with the record');
const withPos = w.log.filter(l => l.x !== undefined); ok(withPos.every(l => E.list.find(e => e.i === l.i && e.x === l.x)), 'log places match the record');
// feed filters
const big = ctx.evFeed(w, { minTier: 2, limit: 500 }); ok(big.every(e => e.t === 2), 'important filter');
const ppl = ctx.evFeed(w, { group: 'people', limit: 500 }); ok(ppl.length > 0 && ppl.every(e => e.g === 'people'), 'group filter');
ok(ctx.evFeed(w, { limit: 7 }).length <= 7 && ctx.evFeed(w, { limit: 7 })[0].i === E.list[E.list.length - 1].i, 'newest first, limited');
// years and now
const Y = ctx.evYears(w); ok(Y.length >= 1 && Y[0].current && Y[0].year === ctx.evYearOf(w.day), 'years: current first');
ok(Y.every(r => r.births >= 0 && r.deaths >= 0 && Array.isArray(r.big) && Array.isArray(r.spark)), 'year rows are complete');
ok(Y[0].end === w.pop, 'the current year ends at the present population');
const N = ctx.evNow(w), sh = Object.values(N.share).reduce((a, b) => a + b, 0); ok(sh >= 96 && sh <= 104, 'activity shares add to about 100: ' + sh); ok(N.n === w.vills.length && Number.isFinite(N.mood), 'now has counts and mood');
// trimming keeps the important ones
const w2 = new ctx.World(9, {}); for (let i = 0; i < 4000; i++) w2.say('Line ' + i + (i % 50 === 0 ? ' a fire starts' : i % 7 === 0 ? ' a new field is ready for sowing.' : ''), null);
ok(w2.ev.list.length <= 2601, 'bounded while running: ' + w2.ev.list.length);
ok(w2.ev.list.length <= 2600 + 1, 'list stays bounded: ' + w2.ev.list.length);
ctx.serializeWorld(w2); const t2 = w2.ev.list.filter(e => e.t === 2).length, t0 = w2.ev.list.filter(e => e.t === 0).length; ok(t2 === 80 && t0 <= 150 + 1, 'big kept, small trimmed: ' + t2 + ' big, ' + t0 + ' small');
// save and load
const d = JSON.parse(JSON.stringify(ctx.serializeWorld(w))); const w3 = ctx.deserializeWorld(d);
ok(w3.ev && w3.ev.list.length === E.list.length && w3.ev.next === E.next, 'the record survives a save');
delete d.ev; const w4 = ctx.deserializeWorld(d); const n4 = w4.ev.list.length; ok(n4 > 5 && n4 <= 120 && w4.ev.list.every((e, i) => i === 0 || e.i > w4.ev.list[i - 1].i), 'an older save without the record loads and starts it from the log: ' + n4); w4.say('after load'); ok(w4.ev.list.length === n4 + 1 && w4.ev.list[n4].s === 'after load', 'and carries on');
// same seed, same record (nothing here uses the random stream)
const a = new ctx.World(33, {}), b = new ctx.World(33, {}); for (let t = 0; t < 1200 * 12; t++) { a.step(); b.step() } ok(JSON.stringify(a.ev) === JSON.stringify(b.ev) && a.rng.s === b.rng.s, 'deterministic');
ok(w.dbg.total === 0 && a.dbg.total === 0, 'no errors: ' + [...w.dbg.errors.values()].map(e => e.where + ' ' + e.msg).join(';'));
console.log(fail ? 'FAILED ' + fail : 'events record passed ' + pass); process.exit(fail ? 1 : 0);
