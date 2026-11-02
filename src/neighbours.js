'use strict';
/* ==========================================================================
   neighbours.js — the wider sea. New (wider) maps hold other islands, each
   with a settlement of its own, hidden under fog of war. Boats reveal the map
   as they sail; a voyage to an island discovers it and its people.
   (Diplomacy and trade with neighbours come next; this is exploration.)
   ========================================================================== */
const NEIGH_KINDS = {
  traders: { label: 'merchants', blurb: 'A harbor town of merchants and ship-owners.' },
  scholars: { label: 'scholars', blurb: 'A hill town of scribes, astronomers and tinkerers.' },
  farmers: { label: 'farmers', blurb: 'A green island of orchards and wide fields.' },
  raiders: { label: 'clansfolk', blurb: 'A palisaded clan hold; proud, armed and watchful.' }
};
const NEIGH_NAMES = ['Brask', 'Tolm', 'Vael', 'Orrin', 'Sunn', 'Kess', 'Ilm', 'Dorn', 'Maren', 'Hest', 'Quill', 'Arden'], NEIGH_TAIL = ['haven', 'ford', 'stead', 'holm', 'wick', 'mouth'];

function genNeighbours(w) {
  const { W, H } = CFG, nrng = mulberry32((w.seed ^ 0x51ED270B) >>> 0), nz = makeNoise(nrng, W, H), n1 = nz(9), n2 = nz(4), OX = w.ox, OY = w.oy, R = () => nrng();
  const slots = [{ x: OX * 0.5, y: H * (0.35 + 0.3 * R()), r: 14 + 5 * R() }, { x: W - OX * 0.5, y: H * (0.35 + 0.3 * R()), r: 14 + 5 * R() },
    { x: W * (0.3 + 0.4 * R()), y: OY * 0.5, r: 10 + 4 * R() }, { x: W * (0.3 + 0.4 * R()), y: H - OY * 0.5, r: 10 + 4 * R() }];
  const kinds = Object.keys(NEIGH_KINDS); for (let i = kinds.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [kinds[i], kinds[j]] = [kinds[j], kinds[i]] }
  const inWin = (x, y) => x >= OX && x < OX + 160 && y >= OY && y < OY + 112;
  for (let i = 0; i < W * H; i++) if (!inWin(i % W, (i / W) | 0)) w.shade[i] = (R() * 5) | 0;
  const out = [], used = new Set();
  slots.forEach((s, k) => {
    const cx = Math.round(s.x), cy = Math.round(s.y), r = s.r;
    for (let y = Math.max(1, Math.floor(cy - r - 4)); y <= Math.min(H - 2, Math.ceil(cy + r + 4)); y++) for (let x = Math.max(1, Math.floor(cx - r - 4)); x <= Math.min(W - 2, Math.ceil(cx + r + 4)); x++) {
      if (inWin(x, y)) continue;
      const d = Math.hypot(x - cx, y - cy) / r; if (d > 1.25) continue;
      const e = 0.72 - 0.62 * d * d + 0.3 * (n1(x, y) - 0.5) + 0.1 * (n2(x, y) - 0.5), i = y * W + x;
      const t = e < 0.28 ? TERR.DEEP : e < 0.34 ? TERR.SHALLOW : e < 0.37 ? TERR.SAND : e > 0.80 ? TERR.PEAK : e > 0.66 ? TERR.ROCK : TERR.GRASS;
      w.terr[i] = t;
      if (t === TERR.GRASS) { if (R() < 0.3) { w.feat[i] = R() < 0.5 ? FEAT.OAK : FEAT.PINE; w.res[i] = 4 } else if (R() < 0.02) { w.feat[i] = FEAT.BUSH; w.res[i] = 4 } }
      else if (t === TERR.ROCK && R() < 0.4) { w.feat[i] = FEAT.STONE; w.res[i] = 8 }
    }
    // the settlement stands on the grass nearest the island's heart; clear a patch for it
    let site = null, bd = 1e9;
    for (let y = cy - Math.ceil(r); y <= cy + Math.ceil(r); y++) for (let x = cx - Math.ceil(r); x <= cx + Math.ceil(r); x++) {
      if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4 || inWin(x, y) || w.terr[y * W + x] !== TERR.GRASS) continue;
      let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (w.terr[(y + dy) * W + x + dx] !== TERR.GRASS) { ok = false; break }
      const dd = Math.hypot(x - cx, y - cy); if (ok && dd < bd) { bd = dd; site = { x, y } }
    }
    if (!site) site = { x: cx, y: cy };
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const i = (site.y + dy) * W + site.x + dx; if (Math.hypot(dx, dy) < 3.4 && w.terr[i] >= TERR.SAND) { w.feat[i] = 0; w.res[i] = 0; if (w.terr[i] === TERR.SAND || w.terr[i] === TERR.ROCK) w.terr[i] = TERR.GRASS } }
    let name = '', g = 0; do name = NEIGH_NAMES[(R() * NEIGH_NAMES.length) | 0] + NEIGH_TAIL[(R() * NEIGH_TAIL.length) | 0]; while (used.has(name) && g++ < 20); used.add(name);
    const dist = Math.hypot(site.x - w.cx, site.y - w.cy);
    out.push({ id: k + 1, name, kind: kinds[k], x: site.x, y: site.y, cx, cy, r, pop: 10 + ((R() * 18) | 0), found: false, foundDay: 0, dist: Math.round(dist), reach: 'boats' });
  });
  out.sort((a, b) => a.dist - b.dist); out.forEach((n, i) => { n.reach = i < 2 ? 'boats' : 'navigation' });       // the nearer pair can be reached with plain boats
  for (const nb of out) initNeighbour(w, nb, R);
  w.neigh = out; w.fog = true; w.seen = new Uint8Array(W * H); revealCircle(w, w.cx, w.cy, 55);
}
/* ----- fog of war ----- */
function revealCircle(w, x, y, r) {
  if (!w.seen) return; const { W, H } = CFG, r2 = r * r, seen = w.seen; let n = 0;
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.ceil(y + r)), x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.ceil(x + r));
  for (let yy = y0; yy <= y1; yy++) { const dy = yy - y, rem = r2 - dy * dy; if (rem < 0) continue; const hw = Math.sqrt(rem), a = Math.max(x0, Math.ceil(x - hw)), b = Math.min(x1, Math.floor(x + hw)), row = yy * W; for (let xx = a; xx <= b; xx++) if (!seen[row + xx]) { seen[row + xx] = 1; n++ } }
  if (n) w.seenVer++;
}
/* only villagers who have moved since their last look reveal anything new */
function revealTick(w) {
  for (const v of w.vills) { if (v._fx !== undefined && Math.abs(v.x - v._fx) < 2.5 && Math.abs(v.y - v._fy) < 2.5) continue; v._fx = v.x; v._fy = v.y; revealCircle(w, v.x, v.y, 7) }
  for (const b of w.boats) if (b.state === 'out') revealCircle(w, b.x, b.y, 13);
}
/* ----- sailing ----- */
function seaPath(w, boat, tgt) {
  const { W, H } = CFG, N = W * H, water = i => w.terr[i] <= TERR.SHALLOW, start = Math.floor(boat.my) * W + Math.floor(boat.mx);
  if (!water(start)) return null;
  const prev = new Int32Array(N).fill(-1), q = new Int32Array(N); let h = 0, t = 0; q[t++] = start; prev[start] = start;
  const near = i => { const x = i % W, y = (i / W) | 0; if (Math.hypot(x - tgt.cx, y - tgt.cy) > tgt.r + 5) return false; for (const [dx, dy] of NB) { const j = (y + dy) * W + x + dx; if (j >= 0 && j < N && w.terr[j] >= TERR.SAND) return true } return false };
  const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (h < t) {
    const u = q[h++], ux = u % W, uy = (u / W) | 0;
    if (near(u)) { const path = []; for (let c = u; c !== start; c = prev[c]) path.push(c); path.push(start); path.reverse(); return path }
    for (const [dx, dy] of D) {
      const x = ux + dx, y = uy + dy; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const v = y * W + x; if (prev[v] >= 0 || !water(v)) continue;
      if (dx && dy && (!water(uy * W + x) || !water(y * W + ux))) continue; prev[v] = u; q[t++] = v;
    }
  }
  return null;
}
const compass = (w, x, y) => { const a = Math.atan2(y - w.cy, x - w.cx) * 180 / Math.PI; return Math.abs(a) < 45 ? 'east' : Math.abs(a) > 135 ? 'west' : a > 0 ? 'south' : 'north' };
function discoverNeighbour(w, n, sailor) {
  if (n.found) return; n.found = true; n.foundDay = w.day; revealCircle(w, n.x, n.y, n.r + 9);
  const land = n.reach === 'land'; w.emit('voyage', land ? `${sailor ? sailor.name : 'Hunters'} ${sailor ? 'has' : 'have'} found a settlement to the ${compass(w, n.x, n.y)} on foot: ${n.name}, home to ${NEIGH_KINDS[n.kind].label}. ${NEIGH_KINDS[n.kind].blurb}` : `${sailor ? sailor.name : 'Sailors'} ${sailor ? 'has' : 'have'} found land to the ${compass(w, n.x, n.y)}: ${n.name}, a settlement of ${NEIGH_KINDS[n.kind].label}. ${NEIGH_KINDS[n.kind].blurb}`, { n });
  if (sailor) { sailor.story(`${land ? 'Walked' : 'Sailed'} to ${n.name} and returned with news of another people.`); sailor.reputation = Math.min(100, sailor.reputation + 8); sailor.mood = Math.min(100, sailor.mood + 12) }
  for (const v of w.vills) v.mood = Math.min(100, v.mood + 2);
  contactNeighbour(w, n);
}

/* water connected to the map edge: the open sea (cached) */
function seaMask(w) {
  if (w._sea) return w._sea; const { W, H } = CFG, N = W * H, m = new Uint8Array(N), q = new Int32Array(N); let h = 0, t = 0;
  const push = i => { if (!m[i] && w.terr[i] <= TERR.SHALLOW) { m[i] = 1; q[t++] = i } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x) } for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1) }
  while (h < t) { const u = q[h++], x = u % W, y = (u / W) | 0; if (x > 0) push(u - 1); if (x < W - 1) push(u + 1); if (y > 0) push(u - W); if (y < H - 1) push(u + W) }
  return (w._sea = m);
}
