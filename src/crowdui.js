/* The living crowd (browser only, render only).
   The townsfolk beyond the villagers in play (crowd.js keeps them as counts) are drawn as small figures that follow the day:
   at their door at sunrise, off to the field, camp, quarry, dock or market, working there, to the plaza in the evening, home, and inside at night.
   Nothing here touches the simulation: no sim state, no saves, no random numbers, and it never calls world.search (that would spend the sim's own search budget).
   It runs its own small flood over the walkable tiles, a few per frame, and keeps every route it finds. */

const CW = {
  w: null, bv: -1, lists: null, grid: null, adj: new Map(), homes: new Map(), routes: new Map(), fails: new Map(),
  stamp: null, prev: null, queue: null, gen: 0, floods: 0, perFrame: 3, cap: 9000, staleDays: 24,
  stats: { floods: 0, hits: 0, misses: 0, fails: 0, figures: 0, walking: 0, working: 0 }
};
const CW_ROLES = ['food', 'wood', 'stone', 'fish', 'serve'];
const CW_SITE = { food: ['farm'], wood: ['logcamp', 'lodge'], stone: ['minecamp'], fish: ['dock'], serve: ['market', 'workshop', 'tavern', 'hall', 'plaza'] };
const CW_SOCIAL = ['plaza', 'campfire', 'tavern'];
const CW_CELL = 12;
const CW_COAT = ['#5b7fb5', '#b5655b', '#6a9b5a', '#8a6ab0', '#c99a4a', '#5b9ba5'], CW_SKIN = ['#e8c9a4', '#c99a74', '#8d6240'];

/* the day's timetable, in fractions of a day (0 = sunrise); each figure is shifted a little so the town does not move in step */
const CW_DAY = { leave: 0.06, arrive: 0.14, finish: 0.52, social: 0.60, home: 0.70, in: 0.78 };

function cwReset(w) {
  CW.w = w; CW.bv = -1; CW.routes.clear(); CW.fails.clear(); CW.adj.clear(); CW.homes.clear();
  CW.stats = { floods: 0, hits: 0, misses: 0, fails: 0, figures: 0, walking: 0, working: 0 };
}
/* the lists of places by kind and a coarse grid over them, rebuilt only when a building went up or came down */
function cwBuild(w) {
  CW.bv = w._bv | 0; CW.adj.clear(); CW.homes.clear();
  CW.lists = {}; CW.grid = {};
  const kinds = new Set([...CW_SOCIAL]); for (const r of CW_ROLES) for (const k of CW_SITE[r]) kinds.add(k);
  for (const k of kinds) {
    const a = w.of(k).filter(b => !b.site), m = new Map(); CW.lists[k] = a;
    for (const b of a) { const key = ((b.x / CW_CELL) | 0) + ',' + ((b.y / CW_CELL) | 0); let c = m.get(key); if (!c) m.set(key, c = []); c.push(b) }
    CW.grid[k] = m;
  }
}
/* the few places of this kind nearest to a building (ring by ring over the grid), nearest first */
function cwNearest(kinds, h, n) {
  const cx = ((h.x / CW_CELL) | 0), cy = ((h.y / CW_CELL) | 0), out = [];
  for (const k of kinds) {
    const m = CW.grid[k]; if (!m || !m.size) continue;
    let found = 0;
    for (let r = 0; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const c = m.get((cx + dx) + ',' + (cy + dy)); if (c) for (const b of c) { out.push(b); found++ }
      }
      if (found >= n && r >= 1) break;
    }
  }
  out.sort((a, b) => (Math.abs(a.x - h.x) + Math.abs(a.y - h.y)) - (Math.abs(b.x - h.x) + Math.abs(b.y - h.y)) || a.id - b.id);
  return out.slice(0, n);
}
/* where a building can be entered from: the walkable tile nearest its door (the middle of its bottom edge) */
function cwAdj(w, b) {
  let a = CW.adj.get(b.id); if (a !== undefined) return a;
  const { W, H } = CFG, mx = b.x + (b.w >> 1); let best = -1, bd = 1e9;
  for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue; if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) continue;
    if (!w.walkable(y * W + x)) continue; const d = Math.abs(x - mx) + (y < b.y + b.h ? 6 : 0) + Math.abs(y - (b.y + b.h));
    if (d < bd) { bd = d; best = y * W + x }
  }
  CW.adj.set(b.id, best); return best;
}
/* a plain flood from one tile until a tile next to the target building is reached; returns the tile indices or null */
function cwFlood(w, from, dest) {
  const { W, H } = CFG, N = W * H;
  if (!CW.stamp || CW.stamp.length !== N) { CW.stamp = new Int32Array(N); CW.prev = new Int32Array(N); CW.queue = new Int32Array(N); CW.gen = 0 }
  const st = CW.stamp, pv = CW.prev, q = CW.queue, gen = ++CW.gen; let qh = 0, qt = 0;
  st[from] = gen; pv[from] = -1; q[qt++] = from;
  while (qh < qt && qh < CW.cap) {
    const i = q[qh++], x = i % W, y = (i / W) | 0;
    if (w.nearRect(x, y, dest)) { const out = []; for (let k = i; k !== -1; k = pv[k]) out.push(k); out.reverse(); return out }
    if (x > 0) { const j = i - 1; if (st[j] !== gen && w.walkable(j)) { st[j] = gen; pv[j] = i; q[qt++] = j } }
    if (x < W - 1) { const j = i + 1; if (st[j] !== gen && w.walkable(j)) { st[j] = gen; pv[j] = i; q[qt++] = j } }
    if (y > 0) { const j = i - W; if (st[j] !== gen && w.walkable(j)) { st[j] = gen; pv[j] = i; q[qt++] = j } }
    if (y < H - 1) { const j = i + W; if (st[j] !== gen && w.walkable(j)) { st[j] = gen; pv[j] = i; q[qt++] = j } }
  }
  return null;
}
/* a route between two buildings as points (tile centres) and running lengths; kept until it is old; a few new floods per frame at most */
function cwRoute(w, a, b) {
  const key = a.id + '>' + b.id, r = CW.routes.get(key);
  if (r && (w.day - r.day <= CW.staleDays || CW.floods >= CW.perFrame)) { CW.stats.hits++; return r }
  if (!r && CW.fails.has(key) && w.day - CW.fails.get(key) < 12) return null;
  if (CW.floods >= CW.perFrame) { CW.stats.misses++; return r || null }
  CW.floods++; CW.stats.floods++;
  const from = cwAdj(w, a); if (from < 0 || !w.buildings.has(a.id) || !w.buildings.has(b.id)) { CW.fails.set(key, w.day); return null }
  const path = cwFlood(w, from, b); if (!path) { CW.fails.set(key, w.day); CW.stats.fails++; CW.routes.delete(key); return null }
  const { W } = CFG, n = path.length, xs = new Float32Array(n), ys = new Float32Array(n), len = new Float32Array(n);
  for (let k = 0; k < n; k++) { xs[k] = (path[k] % W) + 0.5; ys[k] = ((path[k] / W) | 0) + 0.5; if (k) len[k] = len[k - 1] + Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]) }
  const out = { xs, ys, len, n, total: len[n - 1], day: w.day }; CW.routes.set(key, out); CW.fails.delete(key); return out;
}
/* the point a fraction p (0..1) of the way along a route, binary search over the running lengths */
function cwAt(r, p, out) {
  const d = Math.max(0, Math.min(1, p)) * r.total; let lo = 0, hi = r.n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.len[m] <= d) lo = m; else hi = m }
  const seg = r.len[hi] - r.len[lo], t = seg > 0 ? (d - r.len[lo]) / seg : 0;
  out.x = r.xs[lo] + (r.xs[hi] - r.xs[lo]) * t; out.y = r.ys[lo] + (r.ys[hi] - r.ys[lo]) * t; out.dx = r.xs[hi] - r.xs[lo]; return out;
}
/* what a house's people do: the role of each figure follows the share of the town doing each job (crowd.js workers) */
function cwHome(w, h, C) {
  let p = CW.homes.get(h.id); if (p) return p;
  p = { soc: cwNearest(CW_SOCIAL, h, 1)[0] || null, site: {} };
  for (const r of CW_ROLES) p.site[r] = cwNearest(CW_SITE[r], h, 3);
  CW.homes.set(h.id, p); return p;
}
function cwRole(C, u) {
  const n = Math.max(1, C.n), wk = C.workers || {}; let acc = 0;
  for (const r of CW_ROLES) { acc += (wk[r] || 0) / n; if (u < acc) return r }
  return null;
}
/* a spot at the workplace: inside the field, or around the other buildings */
function cwSpot(b, role, hs, out) {
  if (role === 'food' && b.type === 'farm') { out.x = b.x + (hs % b.w) + 0.5; out.y = b.y + (((hs >> 4) % b.h)) + 0.5; return out }
  const a = ((hs >> 3) % 628) / 100, rx = b.w / 2 + 0.75, ry = b.h / 2 + 0.6;
  out.x = b.x + b.w / 2 + Math.cos(a) * rx; out.y = b.y + b.h / 2 + Math.sin(a) * ry; return out;
}
function cwTool(g, role, ax, ay, sw) {
  if (role === 'food') { g.fillStyle = '#8a6a4a'; g.fillRect(ax + 3, ay - 9 + sw * 3, 1, 7); g.fillStyle = '#9aa0a6'; g.fillRect(ax + 3, ay - 3 + sw * 3, 2, 1) }
  else if (role === 'wood') { g.fillStyle = '#8a6a4a'; g.fillRect(ax + 3 - sw * 2, ay - 9 + sw * 2, 1, 6); g.fillStyle = '#c0c4c8'; g.fillRect(ax + 2 - sw * 2, ay - 9 + sw * 2, 3, 2) }
  else if (role === 'stone') { g.fillStyle = '#8a6a4a'; g.fillRect(ax + 3, ay - 9 + sw * 3, 1, 7); g.fillStyle = '#c0c4c8'; g.fillRect(ax + 1, ay - 9 + sw * 3, 5, 1) }
  else if (role === 'fish') { g.fillStyle = '#8a6a4a'; g.fillRect(ax + 3, ay - 12, 1, 8); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(ax + 4, ay - 12, 3, 1) }
}
function cwFigure(g, ax, ay, s, small, bob, step) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(ax - 2, ay + 1, 5, 1);
  g.fillStyle = '#3a3a4a'; g.fillRect(ax - 1, ay - 2 + (step ? 1 : 0), 1, 3 - (step ? 1 : 0)); g.fillRect(ax + 1, ay - 2 + (step ? 0 : 1), 1, 3 - (step ? 0 : 1));
  g.fillStyle = CW_COAT[s % 6]; g.fillRect(ax - 2, ay - 7 + small - bob, 5, 5 - small);
  g.fillStyle = CW_SKIN[(s >> 3) % 3]; g.fillRect(ax - 1, ay - 10 + small - bob, 3, 3);
}

function drawCrowd(g, w, inView, T, now) {
  const C = w.crowd, hs = w.houses(); if (!hs.length) return;
  if (CW.w !== w) cwReset(w);
  CW.floods = 0;
  const sp = R.speed === undefined ? 1 : R.speed, live = sp <= 30;      // fast play: the old still look at the doors, there is no time to follow anyone
  if ((w._bv | 0) !== CW.bv) cwBuild(w);
  const per = C.n / hs.length, tod = w.tod, night = tod >= CW_DAY.in, st = CW.stats; st.figures = 0; st.walking = 0; st.working = 0;
  const P = { x: 0, y: 0, dx: 0 }, Q = { x: 0, y: 0 };
  for (const h of hs) {
    if (!inView(h.x, h.y, h.w, h.h) && !(live && cwNear(h, inView))) continue;
    const k = Math.min(8, Math.max(0, Math.round(per + ((h.id * 7919) % 5 - 2) * 0.3)));
    const home = live ? cwHome(w, h, C) : null, doorX = h.x + h.w / 2, doorY = h.y + h.h + 0.5;
    for (let i = 0; i < k; i++) {
      const hh = hash2(h.id, i + 11), s = hh % 97, small = (s % 7) === 0 ? 2 : 0;
      if (!live) {                                                 // the still look at the doors; v0.40: shown at every hour, because at 100x a day lasts under a second and hiding them at night made the crowd blink
        const ph = ((now / 700) + s) % 6.283, bob = Math.abs(Math.sin(ph)) < 0.35 ? 1 : 0;
        const ax = Math.round((doorX + ((s % 9) - 4) * 0.34 + Math.sin(ph * 0.4) * 0.15) * T), ay = Math.round((doorY + (((s / 9) | 0) % 4) * 0.3) * T) - bob;
        cwFigure(g, ax, ay, s, small, 0, 0); st.figures++; continue;
      }
      const t = (tod + ((hh >> 8) % 40) / 1000) % 1;                // a stagger of up to 0.04 of a day
      if (t >= CW_DAY.in) continue;                                // asleep inside
      const role = cwRole(C, ((hh >> 12) % 1000) / 1000), sites = role ? home.site[role] : null, site = sites && sites.length ? sites[(hh >> 4) % sites.length] : null;
      const soc = home.soc, going = (hh >> 20) % 5 !== 0;          // one in five stays in of an evening
      let x = doorX + (((hh >> 5) % 9) - 4) * 0.3, y = doorY + (((hh >> 9) % 4)) * 0.28, mode = 'idle', rolePlay = null, bob = 0, step = 0;
      const wob = ((hh >> 2) % 5 - 2) * 0.09;
      const walkAlong = (r, p, rev) => { cwAt(r, rev ? 1 - p : p, P); x = P.x + wob; y = P.y + wob * 0.6; mode = 'walk'; step = ((now / 140 + s) | 0) % 2; bob = step; st.walking++ };
      if (site && t >= CW_DAY.leave && t < CW_DAY.finish) {
        if (t < CW_DAY.arrive) {                                   // out to work
          const r = cwRoute(w, h, site); if (!r) continue; walkAlong(r, (t - CW_DAY.leave) / (CW_DAY.arrive - CW_DAY.leave), false);
        } else {                                                   // at work
          cwSpot(site, role, hh, Q); x = Q.x; y = Q.y; mode = 'work'; rolePlay = role; st.working++;
        }
      } else if (soc && going && t >= CW_DAY.finish && t < CW_DAY.home) {
        const from = site || h;
        if (t < CW_DAY.social) { const r = cwRoute(w, from, soc); if (!r) continue; walkAlong(r, (t - CW_DAY.finish) / (CW_DAY.social - CW_DAY.finish), false) }
        else { cwSpot(soc, 'serve', hh, Q); x = Q.x; y = Q.y; mode = 'chat' }
      } else if (site && t >= CW_DAY.finish && t < CW_DAY.social) {   // home again, the way they came
        const r = cwRoute(w, h, site); if (!r) continue; walkAlong(r, (t - CW_DAY.finish) / (CW_DAY.social - CW_DAY.finish), true);
      } else if (t >= CW_DAY.home) {
        if (soc && going) { const r = cwRoute(w, h, soc); if (!r) continue; walkAlong(r, (t - CW_DAY.home) / (CW_DAY.in - CW_DAY.home), true) }
      }
      const gx = Math.floor(x), gy = Math.floor(y); if (!inView(gx, gy, 1, 1)) continue;
      const ph = (now / 700) + s, still = mode === 'idle' || mode === 'chat' ? (Math.abs(Math.sin(ph)) < 0.35 ? 1 : 0) : 0, sw = mode === 'work' ? ((now / 220 + s) | 0) % 2 : 0;
      const ax = Math.round(x * T), ay = Math.round(y * T);
      cwFigure(g, ax, ay, s, small, mode === 'work' ? (rolePlay === 'food' ? 0 : sw) : mode === 'walk' ? bob : still, mode === 'walk' ? step : 0);
      if (rolePlay) cwTool(g, rolePlay, ax, ay, sw);
      st.figures++;
    }
  }
}
/* a house just off the screen may still have a worker on screen: only the houses within a few tiles of the view are counted in */
function cwNear(h, inView) { return inView(h.x - 14, h.y - 14, h.w + 28, h.h + 28) }
