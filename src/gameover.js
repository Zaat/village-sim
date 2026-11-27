/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   gameover.js — the end of a village (v0.35). Two ways it can end today:
     extinct    no one is left, in play or in the crowd
     collapse   fewer than 5 people for a whole month (32 days), after the first year and a half
   (a third, being absorbed by a rival, comes with the rivals in a later release).
   The sim only records it as w.over; the screen that shows it, and offers to carry on or start again, is in overui.js.
   Carrying on is always allowed: `ack` just means the player has seen it.
   ========================================================================== */
const OVER = { low: 5, days: 32, grace: 48 };
function gameoverDay(w) {
  if (w.over) return;
  const pop = w.pop;
  if (pop <= 0) { w.over = { kind: 'extinct', day: w.day, year: w.year, last: w.lastGone ? w.lastGone.name : null, ack: false }; w.emit('event', w.lastGone ? `${w.lastGone.name} was the last. The village is empty.` : 'The village is empty.', { kind: 'gameover' }); return }
  if (w.day < OVER.grace) { w.lowDays = 0; return }
  if (pop < OVER.low) w.lowDays = (w.lowDays || 0) + 1; else w.lowDays = 0;
  if (w.lowDays >= OVER.days) {
    const left = w.vills.map(v => v.name);
    w.over = { kind: 'collapse', day: w.day, year: w.year, left, ack: false };
    w.emit('event', `With only ${pop === 1 ? 'one soul' : pop + ' people'} left, ${left.length ? left.join(', ') : 'the village'} can no longer keep the village alive.`, { kind: 'gameover' });
  }
}
