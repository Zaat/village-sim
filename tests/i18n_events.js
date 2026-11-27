// v0.39 language layer: detection, lookup with English fallback, arguments, plurals, table sanity
const { loadSim } = require('./lib');
const S = loadSim('I18N,langDetect,langSet,i18n,i18nText,i18nPlural'); let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m) } };
// 1. detection: a saved choice wins, then the first browser language we have, else English
ok(S.langDetect(null, ['es-MX', 'en']) === 'es', 'Spanish from es-MX');
ok(S.langDetect(null, ['fr-FR', 'es-ES', 'en']) === 'es', 'first language we have: fr is skipped, es is taken');
ok(S.langDetect(null, ['fr-FR', 'de']) === 'en', 'no match falls back to English');
ok(S.langDetect('en', ['es']) === 'en', 'a saved choice beats the browser');
ok(S.langDetect('xx', ['es']) === 'es', 'an unknown saved language is ignored');
ok(S.langDetect(null, []) === 'en' && S.langDetect(null, undefined) === 'en', 'no list gives English');
ok(S.langDetect(null, ['ES_ar']) === 'es', 'case and underscore are tolerated');
// 2. lookup
S.langSet('en'); ok(S.i18n('Save now') === 'Save now', 'English returns the text');
S.langSet('es'); ok(S.i18n('Save now') === 'Guardar ahora', 'Spanish line found');
ok(S.i18n('A line nobody translated') === 'A line nobody translated', 'a missing line stays English');
ok(S.i18nText('  Save now  ') === '  Guardar ahora  ', 'whitespace around a line is kept');
ok(S.i18n('constructor') === 'constructor' && S.i18n('__proto__') === '__proto__' && S.i18n('toString') === 'toString', 'object property names are not treated as lines');
ok(S.i18n('Hi {name}, {n} left, {x}', { name: 'Ana', n: 3 }) === 'Hi Ana, 3 left, {x}', 'arguments fill their slots and unknown slots stay');
ok(S.i18nPlural(1, 'villager', 'villagers') === '1 villager' && S.i18nPlural(3, 'villager', 'villagers') === '3 villagers', 'plural helper (English or untranslated)');
ok(S.langSet('zz') === 'en', 'an unknown language falls back to English');
// 3. table sanity: no empty lines, no lost {slots}, keys not accidentally equal to their translation (copy-paste check)
{ const ES = S.I18N.ES; let n = 0, bad = [];
  for (const k in ES) { n++; const v = ES[k]; if (typeof v !== 'string' || !v.trim()) bad.push('empty ' + k); const a = (k.match(/\{\w+\}/g) || []).sort().join(), b = (v.match(/\{\w+\}/g) || []).sort().join(); if (a !== b) bad.push('slots ' + k) }
  ok(bad.length === 0, 'table is clean: ' + bad.slice(0, 3).join('; ')); ok(n >= 150, 'Spanish table has the core UI: ' + n); }
console.log(`i18n_events: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
