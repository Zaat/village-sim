'use strict';
/* ==========================================================================
   animals.js — wildlife: deer and rabbits (prey, huntable), wolves (predators).
   ========================================================================== */
class Animal {
  constructor(w, kind, x, y) {
    this.w = w; this.id = w.nextId++; this.kind = kind; this.x = x + 0.5; this.y = y + 0.5; this.alive = true;
    this.hp = kind === 'wolf' ? 40 : kind === 'deer' ? 20 : 5; this.tx = this.x; this.ty = this.y; this.wait = 0;
    this.life = kind === 'wolf' ? CFG.TPD * 4 : Infinity; this.hunger = 60; this.dir = 1; this.sex = w.r() < 0.5 ? 'm' : 'f'; this.target = null; this.moving = false;
  }
  get tx_() { return Math.floor(this.x) }
  canStep(x, y) { const i = Math.floor(y) * CFG.W + Math.floor(x); return x > 1 && y > 1 && x < CFG.W - 1 && y < CFG.H - 1 && this.w.walkable(i) }
  stepTo(tx, ty, speed) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy); if (d < 0.05) { this.moving = false; return true }
    const s = Math.min(speed, d), nx = this.x + dx / d * s, ny = this.y + dy / d * s; this.moving = true;
    if (Math.abs(dx) > 0.02) this.dir = dx > 0 ? 1 : -1;
    if (this.canStep(nx, ny)) { this.x = nx; this.y = ny } else if (this.canStep(nx, this.y)) this.x = nx; else if (this.canStep(this.x, ny)) this.y = ny; else { this.moving = false; return true }
    return false;
  }
  wander(speed, r) {
    if (this.wait > 0) { this.wait--; this.moving = false; return }
    if (this.stepTo(this.tx, this.ty, speed)) {
      this.wait = 20 + ((this.w.r() * 80) | 0);
      for (let k = 0; k < 6; k++) { const nx = this.x + (this.w.r() * 2 - 1) * r, ny = this.y + (this.w.r() * 2 - 1) * r; if (this.canStep(nx, ny)) { this.tx = nx; this.ty = ny; break } }
    }
  }
  update() {
    const w = this.w; if (this.kind === 'wolf') return this.wolf();
    const fr = this.kind === 'deer' ? 4.6 : 3.2;
    if ((w.tick + this.id) % 4 === 0) {
      let tx = null, ty = null, bd = fr;
      const gw = Math.ceil(CFG.W / 6), gx = (this.x / 6) | 0, gy = (this.y / 6) | 0;
      for (let cy = gy - 1; cy <= gy + 1; cy++) for (let cx = gx - 1; cx <= gx + 1; cx++) { const cell = w.grid[cy * gw + cx]; if (!cell || cx < 0 || cx >= gw) continue; for (const v of cell) { const d = Math.hypot(v.x - this.x, v.y - this.y); if (d < bd) { bd = d; tx = this.x + (this.x - v.x) * 3; ty = this.y + (this.y - v.y) * 3 } } }
      for (const a of w.wolfList) if (a.alive) { const d = Math.hypot(a.x - this.x, a.y - this.y); if (d < 8 && d < bd + 4) { bd = d; tx = this.x + (this.x - a.x) * 3; ty = this.y + (this.y - a.y) * 3 } }
      if (tx !== null) { this.fleeing = 12; this.tx = clamp(tx, 2, CFG.W - 2); this.ty = clamp(ty, 2, CFG.H - 2); this.wait = 0 }
    }
    if (this.fleeing > 0) { this.fleeing--; this.stepTo(this.tx, this.ty, this.kind === 'deer' ? 0.13 : 0.12) }
    else this.wander(this.kind === 'deer' ? 0.04 : 0.05, this.kind === 'deer' ? 7 : 4);
  }
  wolf() {
    const w = this.w; this.life--; this.hunger += 0.02;
    if (this.life <= 0) { this.alive = false; return }
    // nearby villagers who are fighting hurt it
    for (const v of w.vills) if (v.fighting && Math.hypot(v.x - this.x, v.y - this.y) < 2.6) this.hp -= (0.1 + 0.15 * v.skill.hunt + (v.role === 'hunter' ? 0.1 : 0)) * (w.has('ironwork') ? 1.25 : 1);
    if (this.hp <= 0) {
      this.alive = false; const h = w.vills.filter(v => v.fighting && Math.hypot(v.x - this.x, v.y - this.y) < 4);
      w.emit('wolfslain', h.length ? `${h.map(v => v.name).slice(0, 2).join(' and ')} drove off a wolf for good.` : 'A wolf was killed.', { h }); for (const v of h) v.skill.hunt = Math.min(1, v.skill.hunt + 0.05); return;
    }
    if (this.hp < 12) { let n = null, nd = 1e9; for (const v of w.vills) { const d = Math.hypot(v.x - this.x, v.y - this.y); if (d < nd) { nd = d; n = v } } if (n) this.stepTo(this.x + (this.x - n.x) * 4, this.y + (this.y - n.y) * 4, 0.12); this.life -= 3; return }
    if ((w.tick + this.id) % 5 === 0) {
      let best = null, bd = 1e9;
      for (const v of w.vills) {
        if (v.sleeping && v.home != null) continue; const d = Math.hypot(v.x - this.x, v.y - this.y);
        const alone = !w.vills.some(o => o !== v && !o.isChild() && Math.hypot(o.x - v.x, o.y - v.y) < 4);
        if (d < 9 && (v.isChild() || alone || w.season === 3 || this.hunger > 90) && d < bd) { bd = d; best = v }
      }
      for (const a of w.animals) if (a.alive && (a.kind === 'deer' || a.kind === 'rabbit')) { const d = Math.hypot(a.x - this.x, a.y - this.y); if (d < 12 && d * 0.7 < bd) { bd = d * 0.7; best = a } }
      this.target = best;
    }
    const t = this.target;
    if (t && t.alive !== false) {
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < 1.3) {
        if (t instanceof Villager) { t.health -= 0.35; t.cause = 'wolf'; if (w.tick % 40 === 0) { w.say(`A wolf is attacking ${t.name}!`); nudge(w, 'defense', 0.012) } }
        else if (this.w.tick % 6 === 0) { t.alive = false; this.hunger = 0 }
      } else this.stepTo(t.x, t.y, 0.1);
    } else this.wander(0.05, 9);
  }
}

function spawnWildlife(w) {
  const { W, H } = CFG, far = (x, y) => Math.hypot(x - w.cx, y - w.cy) > 22;
  const put = (kind, n, cx, cy, spread) => { for (let k = 0; k < n; k++) for (let g = 0; g < 8; g++) { const x = Math.round(cx + (w.r() * 2 - 1) * spread), y = Math.round(cy + (w.r() * 2 - 1) * spread); if (x > 2 && y > 2 && x < W - 2 && y < H - 2 && w.walkable(y * W + x)) { w.animals.push(new Animal(w, kind, x, y)); break } } };
  for (let h = 0; h < 9; h++) { const x = 8 + ((w.r() * (W - 16)) | 0), y = 8 + ((w.r() * (H - 16)) | 0); if (far(x, y)) put('deer', 3 + ((w.r() * 3) | 0), x, y, 5) }
  for (let k = 0; k < 28; k++) { const x = 8 + ((w.r() * (W - 16)) | 0), y = 8 + ((w.r() * (H - 16)) | 0); if (w.r() < 0.5 || far(x, y)) put('rabbit', 1, x, y, 2) }
  for (let k = 0; k < 4; k++) { const a = w.r() * 6.28, d = 14 + w.r() * 8; put('deer', 2, w.cx + Math.cos(a) * d, w.cy + Math.sin(a) * d, 3) }   // a few within hunting range
}
function animalsNewDay(w) {
  const count = k => w.animals.filter(a => a.alive && a.kind === k).length;
  if (w.season < 2) {
    const dc = count('deer'), rc = count('rabbit');
    if (dc < 40) for (const a of w.animals.slice()) if (a.kind === 'deer' && a.alive && a.sex === 'f' && w.r() < 0.06) { const n = new Animal(w, 'deer', a.x | 0, a.y | 0); n.x = a.x; n.y = a.y; w.animals.push(n) }
    if (rc < 90) for (const a of w.animals.slice()) if (a.kind === 'rabbit' && a.alive && w.r() < 0.12) { const n = new Animal(w, 'rabbit', a.x | 0, a.y | 0); n.x = a.x; n.y = a.y; w.animals.push(n) }
  }
  if (count('deer') < 8) { for (let g = 0; g < 20; g++) { const x = 8 + ((w.r() * (CFG.W - 16)) | 0), y = 8 + ((w.r() * (CFG.H - 16)) | 0); if (Math.hypot(x - w.cx, y - w.cy) > 24 && w.walkable(y * CFG.W + x)) { for (let k = 0; k < 3; k++)w.animals.push(new Animal(w, 'deer', x, y)); break } } }
}
