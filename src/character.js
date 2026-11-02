'use strict';
/* ==========================================================================
   character.js — who a villager grows up to be. Beyond the five basic traits,
   every villager has a CHARACTER: ruthlessness, piety and ambition. These are
   partly inherited, then formed by UPBRINGING (a household's warmth or
   harshness, scarcity, lost parents, the climate of fear under a strong
   hand) and by what life brings (loss, famine, raids, power). The people who
   end up leading are shaped by all of it, and in turn shape the village
   (see regime.js).
   ========================================================================== */
const clampC = (x, a = 0.02, b = 0.98) => Math.max(a, Math.min(b, x));

/* called from the Villager constructor */
function initChar(w, v, parents) {
  const g = () => (w.r() + w.r() + w.r()) / 3, t = v.trait, P = parents && parents[0] ? parents.filter(Boolean) : null;
  if (P && P.length && P[0].char) {
    const avg = k => P.reduce((s, p) => s + (p.char ? p.char[k] : 0.5), 0) / P.length, auth = w.regime ? w.regime.ax.auth : 0.3;
    v.char = { ruth: clampC(0.55 * avg('ruth') + 0.45 * (0.5 + (g() - 0.5) * 0.9)), piety: clampC(0.55 * avg('piety') + 0.45 * (0.5 + (g() - 0.5) * 0.9)), amb: clampC(0.5 * avg('amb') + 0.5 * (0.5 + (g() - 0.5) * 0.9)) };
    const pk = P.reduce((s, p) => s + p.trait.kind, 0) / P.length, pr = avg('ruth');
    v.life = { harsh: clampC(0.45 * pr + 0.25 * (1 - pk) + 0.2 * auth + 0.1 * 0.3, 0, 1), warm: clampC(0.55 * pk + 0.3 * (1 - pr) + 0.15 * 0.5, 0, 1), orphan: 0, lean: 0, fest: 0, born: w.day, tags: [] };
  } else {                                                    // the founding generation: temperament comes with the person
    v.char = { ruth: clampC(0.5 + (g() - 0.5) * 1.3 - 0.3 * (t.kind - 0.5)), piety: clampC(0.5 + (g() - 0.5) * 1.3 - 0.15 * (t.cur - 0.5)), amb: clampC(0.45 + (g() - 0.5) * 1.1 + 0.25 * (t.brave - 0.5) + 0.2 * (t.ind - 0.5)) };
    v.life = { harsh: 0.5, warm: 0.5, orphan: 0, lean: 0, fest: 0, born: w.day, tags: [], founder: true };
  }
}
/* repair older saves: derive a character from traits */
function ensureChar(w, v) {
  if (v.char && v.life) return v; const t = v.trait;
  v.char = { ruth: clampC(0.5 - 0.5 * (t.kind - 0.5) + (Math.random() - 0.5) * 0.2), piety: clampC(0.5 - 0.15 * (t.cur - 0.5) + (Math.random() - 0.5) * 0.3), amb: clampC(0.45 + 0.25 * (t.brave - 0.5) + 0.2 * (t.ind - 0.5)) };
  v.life = { harsh: 0.5, warm: 0.5, orphan: 0, lean: 0, fest: 0, born: w.day, tags: [], founder: true, formed: v.isAdult() }; return v;
}
const livingParent = (w, v) => v.parentIds.some(id => id != null && w.vills.some(x => x.id === id));
/* once a day, for the young: the household around them leaves its mark */
function characterDay(w) {
  const fed = w.stock.food > w.vills.length * 6;
  for (const v of w.vills) {
    ensureChar(w, v); if (v.isAdult()) continue; const L = v.life;
    const ps = v.parentIds.map(id => w.vills.find(x => x.id === id)).filter(Boolean), pr = ps.length ? ps.reduce((s, p) => s + p.char.ruth, 0) / ps.length : 0.55, pk = ps.length ? ps.reduce((s, p) => s + p.trait.kind, 0) / ps.length : 0.4;
    const lean = v.hunger < 35 ? 1 : 0, orphan = v.parentIds.length && !ps.length ? 1 : 0, A = w.regime ? Math.max(0, w.regime.ax.auth - 0.4) / 0.6 : 0;
    const h = 0.4 * pr + 0.2 * lean + 0.2 * orphan + 0.2 * A, wm = 0.5 * pk + 0.2 * (fed ? 1 : 0.2) + 0.15 * (w.festival ? 1 : 0.3) + 0.15 * (ps.length ? 1 : 0);
    L.harsh += (h - L.harsh) * 0.025; L.warm += (wm - L.warm) * 0.025; L.lean += lean; L.orphan = orphan || L.orphan;
    if (w.festival) L.fest++;
  }
}
/* the moment a child comes of age, what they lived through settles into who they are */
function formAdult(w, v) {
  ensureChar(w, v); const L = v.life, C = v.char, t = v.trait; if (L.formed) return; L.formed = true;
  if (!L.founder) {
    C.ruth = clampC(0.40 * C.ruth + 0.30 * L.harsh + 0.15 * (1 - L.warm) + 0.15 * (1 - t.kind));
    C.piety = clampC(0.55 * C.piety + 0.20 * L.harsh + 0.10 * (L.orphan ? 1 : 0) + 0.15 * (1 - t.cur));
    C.amb = clampC(0.45 * C.amb + 0.25 * t.brave + 0.15 * t.ind + 0.15 * L.harsh);
  }
  L.tags = [];
  if (!L.founder) {
    if (L.harsh > 0.6) L.tags.push('hardship'); else if (L.warm > 0.62 && L.harsh < 0.45) L.tags.push('loving home'); if (L.orphan) L.tags.push('lost a parent young'); if (L.lean > 40) L.tags.push('hungry years');
    if (w.regime && w.regime.ax.auth > 0.65) L.tags.push('grew up under a strong hand');
  }
  if (L.tags.length && !L.founder) v.story(`Came of age after ${L.tags.slice(0, 2).join(' and ')}.`);
}
/* things that happen to grown people also change them */
function experience(v, kind, amt = 1) {
  if (!v.char) return; const C = v.char;
  if (kind === 'loss') { C.piety = clampC(C.piety + 0.03 * amt); C.ruth = clampC(C.ruth - 0.004 * amt) }
  else if (kind === 'hunger') { C.ruth = clampC(C.ruth + 0.006 * amt); C.piety = clampC(C.piety + 0.006 * amt) }
  else if (kind === 'raid') { C.ruth = clampC(C.ruth + 0.02 * amt); C.amb = clampC(C.amb + 0.01 * amt) }
  else if (kind === 'power') { C.amb = clampC(C.amb + 0.02 * amt); C.ruth = clampC(C.ruth + 0.006 * amt) }
  else if (kind === 'fest') { C.piety = clampC(C.piety + 0.002 * amt); C.ruth = clampC(C.ruth - 0.002 * amt) }
  else if (kind === 'kindness') { C.ruth = clampC(C.ruth - 0.006 * amt) }
  else if (kind === 'prophecy') C.piety = clampC(C.piety + 0.12 * amt);
}
const ruthWord = c => c.ruth > 0.72 ? 'ruthless' : c.ruth > 0.58 ? 'hard' : c.ruth < 0.28 ? 'gentle' : c.ruth < 0.42 ? 'kind-hearted' : 'even-handed';
const faithWord = c => c.piety > 0.72 ? 'deeply devout' : c.piety > 0.58 ? 'devout' : c.piety < 0.28 ? 'a doubter' : c.piety < 0.4 ? 'worldly' : 'quietly believing';
const ambWord = c => c.amb > 0.72 ? 'driven for power' : c.amb > 0.58 ? 'ambitious' : c.amb < 0.3 ? 'content with little' : 'steady';
function upbringingText(v) {
  const L = v.life; if (!L) return ''; if (L.founder) return 'One of the founders: their character came with them to the island.';
  const bits = []; if (L.harsh > 0.6) bits.push('raised in a harsh household'); else if (L.warm > 0.62 && L.harsh < 0.45) bits.push('raised in a warm, loving home'); else bits.push('raised in an ordinary household');
  if (L.orphan) bits.push('lost a parent young'); if (L.lean > 40) bits.push('knew hungry years'); if (L.tags.includes('grew up under a strong hand')) bits.push('grew up in a climate of fear');
  const s = bits.join(', '); return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
