/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   places.js — where the village gathers. Beyond the campfire the village
   grows a village square (plaza, with a well) and taverns, and uses its other
   buildings as venues: council sessions in the Great Hall, holidays in the
   amphitheatre, afternoons at the market when merchants are in town.
   ========================================================================== */
Object.assign(CFG.COST, { plaza: { wood: 8, stone: 10 }, tavern: { wood: 30, stone: 8 } });
Object.assign(CFG.BUILD_TIME, { plaza: 200, tavern: 200 });
Object.assign(CFG.SIZE, { plaza: [5, 5], tavern: [3, 3] });
Object.assign(CFG.SOLID, { plaza: false, tavern: true });

const PLACE_NAMES = { plaza: 'village square', tavern: 'tavern' };
/* a free standing spot in or around a building */
function pickSpot(w, b, inside, v) {
  const SP = w.spots || (w.spots = new Map());
  for (let k = 0; k < 16; k++) {
    let x, y;
    if (inside) { x = b.x + ((w.r() * b.w) | 0); y = b.y + ((w.r() * b.h) | 0) }
    else {
      const side = (w.r() * 4) | 0;
      if (side === 0) { x = b.x - 1; y = b.y + ((w.r() * b.h) | 0) } else if (side === 1) { x = b.x + b.w; y = b.y + ((w.r() * b.h) | 0) }
      else if (side === 2) { y = b.y - 1; x = b.x + ((w.r() * b.w) | 0) } else { y = b.y + b.h; x = b.x + ((w.r() * b.w) | 0) }
    }
    if (x < 1 || y < 1 || x >= CFG.W - 1 || y >= CFG.H - 1) continue; const i = y * CFG.W + x;
    if (w.walkable(i) && !(w.bmap[i] && w.blk[i])) { const h = SP.get(i); if (v && h && h.id !== v.id && h.until > w.tick && k < 12) continue; return { x, y } }
  }
  return null;
}
/* landmarks people walk over to look at, and why */
const LANDMARKS = { monument: 'Monument', temple: 'Temple', library: 'Library', lighthouse: 'Lighthouse', bastion: 'Bastion', citadel: 'Citadel', barracks: 'Barracks', watchtower: 'Watchtower', foundry: 'Foundry', granaryhall: 'Great Granary' };
function pickLandmark(w, v) {
  const list = []; for (const t in LANDMARKS) for (const b of w.of(t)) { const pull = t === 'temple' ? 1 + 2 * (v.char ? v.char.piety : 0.3) : t === 'monument' ? 1.5 : t === 'library' ? 0.5 + 2 * v.trait.cur : 1; list.push({ b, pull }) }
  if (!list.length) return null; let tot = 0; for (const x of list) tot += x.pull; let r = w.r() * tot; for (const x of list) { r -= x.pull; if (r <= 0) return x.b } return list[0].b;
}
/* decide where this villager heads for the evening / a session / a holiday */
function gatherPlan(w, v, meet, fest) {
  const first = t => w.of(t)[0], plaza = first('plaza'), hall = first('hall'), amph = first('amphitheatre'), taverns = w.of('tavern');
  let b = null, kind = 'fire', go = 'To the campfire', stay = 'Talking by the fire', ticks = 140, inside = false;
  if (meet) {
    ticks = 220; stay = 'In council session';
    if (hall) { b = hall; kind = 'hall'; go = 'To the Great Hall' } else if (plaza) { b = plaza; inside = true; kind = 'plaza'; go = 'To the village square' } else go = 'To the council fire';
  } else if (fest) {
    ticks = 200; stay = w.holiday; go = 'Off to the ' + w.holiday;
    if (amph) { b = amph; kind = 'amph' } else if (plaza) { b = plaza; inside = true; kind = 'plaza' }
  } else if (v.isAdult() && w.r() < 0.1 + 0.18 * v.trait.cur + 0.12 * (v.char ? v.char.piety : 0) && (b = pickLandmark(w, v))) {
    kind = 'look'; go = `To look at the ${LANDMARKS[b.type]}`; stay = b.type === 'temple' ? 'Praying at the temple' : b.type === 'library' ? 'Browsing the library' : `Admiring the ${LANDMARKS[b.type]}`; ticks = 100;
  } else if (taverns.length && v.isAdult() && w.r() < 0.25 + 0.55 * v.trait.soc) {
    b = taverns[(w.r() * taverns.length) | 0]; kind = 'tavern'; go = 'To the tavern'; stay = 'Talking over a drink at the tavern'; ticks = 160;
  } else if (plaza && w.r() < 0.7) { b = plaza; inside = true; kind = 'plaza'; go = 'To the village square'; stay = 'Talking in the square' }
  let spot = b ? pickSpot(w, b, inside, v) : null;
  if (spot) { const SP = w.spots || (w.spots = new Map()); SP.set(spot.y * CFG.W + spot.x, { id: v.id, until: w.tick + ticks + 400 }); if (SP.size > 300) for (const [k, h] of SP) if (h.until < w.tick) SP.delete(k) }
  if (!spot) {                       // the old campfire ring
    kind = kind === 'hall' || kind === 'amph' || kind === 'tavern' || kind === 'plaza' || kind === 'look' ? 'fire' : kind;
    for (let k = 0; k < 10 && !spot; k++) { const x = Math.round(w.cx + (w.r() * 2 - 1) * 3), y = Math.round(w.cy + (w.r() * 2 - 1) * 3); if (w.walkable(y * CFG.W + x)) spot = { x, y } }
  }
  const bld = spot && b && kind !== 'fire' ? b : (spot ? w.of('campfire')[0] || null : null);
  return spot ? { ...spot, kind, go, stay, ticks, bld } : null;
}
/* an afternoon browse when merchants are in town */
function marketSpot(w) {
  const m = w.of('market')[0]; if (!m || !w.econ || !w.econ.caravan || w.econ.caravan.sea) return null;
  return pickSpot(w, m, false);
}
