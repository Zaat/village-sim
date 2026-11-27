/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   water.js — docks and boats. A boat is driven by the villager who crews it
   (see Villager.planBoatFish): they walk to the dock, board, sail straight out
   from the dock, fish, sail home and carry the catch to the stores.
   ========================================================================== */
/* ship kinds: a fishing boat can carry a little cargo; cargo ships and carracks are built at a quay or port */
const SHIPS = { fishing: { name: 'Fishing boat', cap: 24, speed: 0.07, upkeep: 1 }, cargo: { name: 'Cargo ship', cap: 70, speed: 0.085, upkeep: 3 }, carrack: { name: 'Carrack', cap: 140, speed: 0.1, upkeep: 5 }, barge: { name: 'River barge', cap: 36, speed: 0.075, upkeep: 1 } };
class Boat {
  constructor(w, dock, kind = 'fishing') { this.w = w; this.id = w.nextId++; this.dock = dock.id; this.kind = kind; this.hold = null; this.crew = null; this.state = 'moored'; this.setMoor(dock); this.x = this.mx; this.y = this.my; this.dir = dock.dir[0] >= 0 ? 1 : -1 }
  setMoor(dock) { const [ux, uy] = dock.dir; this.mx = dock.x + 0.5 + ux; this.my = dock.y + 0.5 + uy }
  /* number of open-water tiles in a straight line out from the mooring (the mooring tile is the first) */
  range() {
    const w = this.w, d = w.buildings.get(this.dock); if (!d) return 0; const [ux, uy] = d.dir; let n = 0;
    for (let k = 0; k <= 9; k++) { const x = Math.floor(this.mx) + ux * k, y = Math.floor(this.my) + uy * k; if (x < 0 || y < 0 || x >= CFG.W || y >= CFG.H || w.terr[y * CFG.W + x] > TERR.SHALLOW) break; n = k + 1 }
    return n;
  }
  home() { this.state = 'moored'; this.crew = null; this.x = this.mx; this.y = this.my }
}
function addBoat(w, dock, kind) { const b = new Boat(w, dock, kind); w.boats.push(b); return b }
const shipOf = b => SHIPS[b.kind || 'fishing']
