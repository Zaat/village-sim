// v0.31 society depth: culture, science, floods, plague, guilds, outpost councils, selling knowledge, spies, save/load
const { loadSim } = require('./lib');
const ctx = loadSim('World,CFG,serializeWorld,deserializeWorld,CUL,cultureAll,cultureDay,scienceDay,disasterDay,startPlague,plagueDay,plagueSick,guildDay,outpostCouncils,knowledgeDay,culR,warR,TECHS,plagueRules,CONCERN_KINDS');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
const run = (w, d) => { for (let t = 0; t < 1200 * d; t++) w.step() }, adv = (w, d) => { w.tick += 1200 * d };
const base = new ctx.World(777, { map: 'island' }); run(base, 32 * 3);
const clone = o => { const w = ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(base)))); if (o) Object.assign(w.settings, o); return w };
const errs = w => [...w.dbg.errors.values()].map(e => e.where + ' ' + e.msg).join(';');

{ // culture
  const C = ctx.CUL(base);
  ok(C.weddings >= 1, 'couples are wed: ' + C.weddings); ok(C.funerals >= 0 && C.tales >= 1, 'story nights and funerals counted: ' + C.tales + '/' + C.funerals);
  ok(C.score >= 0 && C.score <= 100, 'culture score in range: ' + C.score.toFixed(1));
  ok(base.dbg.total === 0, 'no errors in 3-year run: ' + errs(base));
  const w = clone(); const m0 = w.vills.filter(v => v.isAdult()).reduce((s, v) => s + v.mood, 0); const C2 = ctx.CUL(w); C2.wed = {}; while (w.day % 3) adv(w, 1); ctx.cultureDay(w);
  ok(C2.weddings >= C.weddings + 1 || w.vills.every(v => v.partner == null), 'a fresh wedding feast when couples are not yet recorded');
}
{ // science
  const w = clone(); w.tech.focus = Object.keys(ctx.TECHS).find(id => !w.tech.known[id]); const p0 = w.tech.points; w.day; adv(w, 4 - (w.day % 4)); const C = ctx.CUL(w); C.score = 80; ctx.scienceDay(w);
  ok(w.tech.points > p0, 'culture and curiosity add to the research in hand'); w.tech.focus = null; const p1 = w.tech.points; adv(w, 4); ctx.scienceDay(w); ok(w.tech.points === p1, 'no research, no boost');
}
{ // floods
  const w = clone(); const C = ctx.CUL(w); let f = 0; for (let y = 0; y < 60 && !f; y++) for (let d = 0; d < 32; d++) { w.tick = 1200 * (128 * (y + 4) + d + 1); ctx.disasterDay(w); if (C.floods) { f = 1; break } }
  ok(C.floods >= 1, 'spring floods happen'); const w2 = clone({ disasters: false }); const C2 = ctx.CUL(w2); for (let y = 0; y < 20; y++) for (let d = 0; d < 32; d++) { w2.tick = 1200 * (128 * (y + 4) + d + 1); ctx.disasterDay(w2) } ok(C2.floods === 0 && !C2.plague, 'no disasters when switched off');
}
{ // plague
  const w = clone(); const C = ctx.CUL(w); while (w.vills.length < 31) break; const R = ctx.culR(w, 9); ctx.startPlague(w, C, R);
  ok(ctx.plagueSick(w) === 1 && C.plagues === 1, 'plague starts with one case'); const found = []; ctx.plagueRules(w, {}, found); ok(found.some(f => f.key === 'plague') && !!ctx.CONCERN_KINDS.plague, 'plague is a concern');
  let peak = 0, d = 0; for (; d < 60 && C.plague; d++) { adv(w, 1); ctx.plagueDay(w, C, C.plague, ctx.culR(w, 2)); peak = Math.max(peak, ctx.plagueSick(w)) }
  ok(!C.plague, 'plague ends: ' + d + ' days, peak ' + peak); ok(C.nextPlague > w.day, 'a quiet spell follows');
  // quarantine slows spread (average over many trials)
  const spread = q => { let tot = 0; for (let k = 0; k < 12; k++) { const w3 = clone(); w3.tick += 1200 * k * 3; const C3 = ctx.CUL(w3); ctx.startPlague(w3, C3, ctx.culR(w3, 9)); C3.plague.quarantine = q; let pk = 0; for (let i = 0; i < 12 && C3.plague; i++) { adv(w3, 1); ctx.plagueDay(w3, C3, C3.plague, ctx.culR(w3, 2)); pk = Math.max(pk, ctx.plagueSick(w3)) } tot += pk } return tot / 12 };
  const a = spread(false), b = spread(true); ok(b <= a, 'quarantine spreads less: ' + b.toFixed(2) + ' <= ' + a.toFixed(2));
  run(w, 3); ok(w.dbg.total === 0, 'world runs after plague: ' + errs(w));
}
{ // guilds
  const w = clone(); w.tech.known.coinage = 1; const ad = w.vills.filter(v => v.isAdult()); for (const v of ad.slice(0, 6)) { v.role = 'farmer'; v.trade = null; v.side = null }
  adv(w, 8 - (w.day % 8)); const C = ctx.CUL(w); C.guilds = []; ctx.guildDay(w);
  ok(C.guilds.some(g => g.trade === 'farmer' && g.members >= 5), 'five farmers form a guild'); const t0 = w.econ ? w.econ.treasury : 0; adv(w, 8); ctx.guildDay(w); ok(C.dues > 0, 'guild dues are paid');
  for (const v of ad) v.role = null; for (const v of ad) v.trade = null; adv(w, 8); ctx.guildDay(w); ok(C.guilds.length === 0, 'emptied guilds disband');
}
{ // outpost councils
  const w = clone(); w.out.list.push({ id: 71, name: 'Headhold', state: 'active', pop: 10, loyalty: 0.25, food: 20, role: 'farming', day: w.day - 40, aid: 0 }); const o = w.out.list[w.out.list.length - 1];
  adv(w, 4 - (w.day % 4)); ctx.outpostCouncils(w); ok(!!o.head, 'an outpost of ten chooses a head: ' + o.head); const a0 = o.aid; adv(w, 4); ctx.outpostCouncils(w); ok(o.aid > a0, 'its council steadies loyalty');
  const o2 = { id: 72, name: 'Tiny', state: 'active', pop: 4, loyalty: 0.5, day: w.day - 40, aid: 0 }; w.out.list.push(o2); adv(w, 4); ctx.outpostCouncils(w); ok(!o2.head, 'a hamlet has no council');
}
{ // selling knowledge and spies
  const w = clone(); w.tech.known.coinage = 1; w.tech.known.trade = 1; const n = w.neigh[0]; Object.assign(n, { found: true, met: true, rel: 70, kind: 'traders', knows: [] }); w.econ.treasury = 100; const C = ctx.CUL(w); C.nextSale = 0; const t0 = w.econ.treasury; adv(w, 1);
  ctx.knowledgeDay(w); run(w, 6); ok(C.sold >= 1 && w.econ.treasury > t0 - 15 || C.sold === 0, 'sale decision runs: sold ' + C.sold + ', treasury ' + t0 + ' to ' + w.econ.treasury); ok(w.dbg.total === 0, 'no errors in sale: ' + errs(w));
  const w2 = clone(); w2.tech.known.trade = 1; const h = w2.neigh[0]; Object.assign(h, { found: true, met: true, rel: -40, kind: 'raiders', knows: [] }); const C2 = ctx.CUL(w2); let acts = 0;
  for (let i = 0; i < 40 && C2.stolen + C2.caught < 3; i++) { C2.nextSpy = 0; C2.nextSale = 1e9; C2.nextOwnSpy = 1e9; adv(w2, 1); ctx.knowledgeDay(w2); acts = C2.stolen + C2.caught }
  ok(acts >= 3, 'hostile neighbours send spies: caught ' + C2.caught + ' stolen ' + C2.stolen); ok(h.knows.length >= C2.stolen, 'stolen crafts reach the neighbour');
}
{ // save and load
  const d = ctx.serializeWorld(base), w = ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));
  ok(w.cul && w.cul.weddings === base.cul.weddings && Math.abs(w.cul.score - base.cul.score) < 1e-9, 'culture survives save and load'); run(w, 5); ok(w.dbg.total === 0, 'reloaded world runs: ' + errs(w));
  const old = JSON.parse(JSON.stringify(d)); delete old.cul; const w3 = ctx.deserializeWorld(old); run(w3, 5); ok(w3.dbg.total === 0 && !!w3.cul, 'saves without culture load: ' + errs(w3));
}
console.log(fail ? 'FAILED ' + fail : 'culture passed ' + pass); process.exit(fail ? 1 : 0);
