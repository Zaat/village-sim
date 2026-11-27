/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* ==========================================================================
   config.js — constants, enums and small utilities shared by every module.
   All balance numbers live in CFG. No DOM access in the simulation files.
   ========================================================================== */
const CFG = {
  W: 160, H: 112, MAP_NEW: [260, 180], T: 16,            // map size (tiles), tile size (world px)
  TPD: 1200, TPS: 20,               // ticks per day, ticks per second at 1x
  DPS: 8,                           // days per season (year = 4 seasons)
  INFANT_DAYS: 5, CHILD_DAYS: 17, ADULT_DAYS: 29, ELDER_DAYS: 80, FERTILE_MAX: 70, OLD_DAYS: 120, CHILD_MORT: 0.0035, IMM_CHANCE: 0.03, IMM_MAX: 2, CROWD_DRAW: 0.005, ORDER_BASE: 350, ORDER_BITE: 0.4,   // life stages (in days)
  BIRTH_DAMP: 0, COUPLE_TRY: 0.1, COURT_TRY: 0.03, FARM_SLOPE: 5, BIRTH_MULT: 1, DEP_CAP: 2, LIFE_BASE: 2.8,                      // ageing slows by this factor (v0.35: all stage thresholds above stay in 'life days'); real days of life = life days x LIFE_BASE
  START_VILLAGERS: 8,
  START_STOCK: { wood: 24, stone: 6, food: 40 },
  COST: { house: { wood: 8, stone: 3 }, farm: { wood: 3, stone: 0 }, store: { wood: 10, stone: 4 }, road: { wood: 0, stone: 1 }, dock: { wood: 12, stone: 0 }, logcamp: { wood: 14, stone: 0 }, minecamp: { wood: 12, stone: 4 }, lodge: { wood: 16, stone: 2 }, market: { wood: 16, stone: 4 }, bridge: { wood: 3, stone: 0 } },
  BUILD_TIME: { house: 160, farm: 60, store: 140, road: 20, dock: 100, upgrade: 120, logcamp: 140, minecamp: 150, lodge: 140, market: 130, bridge: 70 },
  SIZE: { house: [2, 2], farm: [3, 2], store: [2, 2], campfire: [1, 1], dock: [1, 1], logcamp: [2, 2], minecamp: [2, 2], lodge: [2, 2], market: [3, 2], bridge: [1, 1] },
  SOLID: { house: true, store: true, campfire: true, farm: false, dock: false, logcamp: true, minecamp: true, lodge: true, market: false },
  HOUSE_CAP: 4, FARM_YIELD: 6, FARM_GROW: 2400, FISH_MAX: 5, FISH_DEEP: 9, CARRY: 4, EAT_RESTORE: 55,
  BIRTH_CHANCE: 0.35, PREGNANCY: 3000, BIRTH_COOLDOWN: 9000,
  LATTICE: 3,                        // buildings snap to a 3-tile grid so lanes stay open
};
const TERR = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, ROCK: 4, PEAK: 5, FORD: 6, BRIDGE: 7 };      // FORD: shallow river crossing, BRIDGE: built span; both walkable
const FEAT = { NONE: 0, OAK: 1, PINE: 2, STONE: 3, BUSH: 4 };
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const GROW = [1, 1.3, 0.6, 0];       // crop growth multiplier by season
const ROLES = ['builder', 'farmer', 'hunter', 'fisher', 'woodcutter', 'miner'];
const TRAITS = ['soc', 'ind', 'cur', 'brave', 'kind'];
const TRAIT_WORDS = { soc: ['Reserved', 'Gregarious'], ind: ['Easygoing', 'Hardworking'], cur: ['Practical', 'Curious'], brave: ['Timid', 'Brave'], kind: ['Gruff', 'Kind'] };
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* a villager's age in days, translated into familiar "human years" for display only: infant 0-3, child to 10, youth to 18, adult to about 62, elder to 90 */
const HUMAN_AGE = [[0, 0], [3, 3], [8, 10], [14, 18], [80, 62], [120, 90]];
function humanYears(days) {
  const A = HUMAN_AGE; if (days <= 0) return 0;
  for (let i = 1; i < A.length; i++) if (days <= A[i][0]) return Math.round(A[i - 1][1] + (A[i][1] - A[i - 1][1]) * (days - A[i - 1][0]) / (A[i][0] - A[i - 1][0]));
  return Math.round(90 + (days - 120) * 0.25);
}

function mulberry32(a) { const f = function () { f.s = (f.s + 0x6D2B79F5) | 0; let t = f.s; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }; f.s = a | 0; return f }   // f.s is the state, so saves can resume the exact stream
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return (h ^ h >>> 16) >>> 0 }

class Heap {
  constructor() { this.k = []; this.v = [] }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p } k[i] = key; v[i] = val
  }
  pop() {
    const k = this.k, v = this.v; const rv = v[0]; const lk = k.pop(), lv = v.pop(); const n = k.length;
    if (n > 0) { let i = 0; for (; ;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c } k[i] = lk; v[i] = lv }
    return rv
  }
  get size() { return this.k.length }
}

/* smooth value noise: makeNoise(rng)(scale) -> (x,y)=>0..1 */
function makeNoise(rng, bw = 160, bh = 112) {          // lattice size is fixed to the home window, so the home island never depends on the map size
  return (scale) => {
    const gw = Math.ceil(bw / scale) + 2, gh = Math.ceil(bh / scale) + 2;
    const g = new Float32Array(gw * gh).map(() => rng());
    return (x, y) => {
      const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy);
      let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    };
  };
}

const NAMES_M = ['Alder', 'Bram', 'Cael', 'Doran', 'Eryk', 'Finn', 'Gareth', 'Hale', 'Ivo', 'Jorin', 'Kellan', 'Lorcan', 'Marek', 'Niall', 'Osric', 'Pell', 'Quill', 'Rowan', 'Soren', 'Tobin', 'Ulric', 'Vance', 'Wystan', 'Yarrow', 'Aldous', 'Bryn', 'Corwin', 'Dunstan', 'Elric', 'Fenwick'];
const NAMES_F = ['Ada', 'Brea', 'Cora', 'Dara', 'Elin', 'Faye', 'Gwen', 'Hana', 'Isla', 'Juna', 'Kira', 'Lena', 'Mira', 'Nessa', 'Orla', 'Perrin', 'Rhea', 'Sela', 'Tilda', 'Una', 'Vera', 'Wren', 'Ysolde', 'Zora', 'Aveline', 'Briar', 'Cerys', 'Delphine', 'Edda', 'Fleur'];
