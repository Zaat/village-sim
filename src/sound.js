/* Village Sim sound (v0.36). Everything is made in code with Web Audio: no files, no downloads. Off until the player turns it on.
   A track is only a seed: the same seed always gives the same key, tune and name, so a rating means something and can be shared.
   The bed is pastoral (plucked strings, a flute-like voice, a soft pad); big moments in the village add a cinematic swell on top. */
const SND = { on: false, ctx: null, vol: 0.6, track: null, mood: { season: 0, night: false, seasonAt: 0, nightAt: 0 }, d: { t: 0, g: 0.5 }, lastSwell: -1e9, q: [], seed: 0, step: 0, nextT: 0, timer: null, swellUntil: 0, ratings: {}, listening: null };
const SND_KEY = 'villagesim.tracks', SND_VOL = 'villagesim.vol', SND_SEND = 'villagesim.sendratings';
const SND_ENDPOINT = '';                          // set when the ratings server exists (server/); empty means ratings never leave this browser
const sndRng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
const SND_MODES = { bright: [0, 2, 4, 7, 9, 12, 14], warm: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], soft: [0, 2, 3, 5, 7, 8, 10] };
const SND_PROG = [[0, 5, 3, 4], [0, 3, 4, 0], [0, 4, 5, 3], [0, 2, 3, 4], [5, 3, 0, 4], [0, 5, 4, 3]];
const SND_ADJ = ['Meadow', 'Willow', 'Quiet', 'Golden', 'Hearth', 'Misty', 'Harvest', 'Evening', 'River', 'Stone', 'Lantern', 'Wild', 'Amber', 'Slow', 'Fallow', 'Green'];
const SND_NOUN = ['morning', 'path', 'smoke', 'fields', 'bells', 'ford', 'orchard', 'lullaby', 'gate', 'weather', 'market', 'song', 'hollow', 'rest', 'road', 'dusk'];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* a track from a seed: key, mode, tempo, chord loop and a name */
function sndTrack(seed) {
  const r = sndRng(seed * 7919 + 13), modes = Object.keys(SND_MODES), root = 50 + ((r() * 8) | 0), mode = modes[(r() * modes.length) | 0], prog = SND_PROG[(r() * SND_PROG.length) | 0];
  return { seed, root, mode, scale: SND_MODES[mode], prog, bpm: 54 + ((r() * 20) | 0), pluck: 0.35 + r() * 0.35, lead: 0.3 + r() * 0.4, name: SND_ADJ[(r() * SND_ADJ.length) | 0] + ' ' + SND_NOUN[(r() * SND_NOUN.length) | 0] };
}
const sndLoad = () => { try { SND.ratings = JSON.parse(localStorage.getItem(SND_KEY) || '{}') } catch (e) { SND.ratings = {} } };
const sndSave = () => { try { localStorage.setItem(SND_KEY, JSON.stringify(SND.ratings)) } catch (e) { } };
const sndRec = seed => SND.ratings[seed] || (SND.ratings[seed] = { r: 0, skips: 0, plays: 0 });

/* the audio graph: voices -> bus -> (dry + reverb) -> soft compressor -> master -> speakers */
function sndGraph() {
  const c = SND.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' });
  const master = c.createGain(); master.gain.value = SND.vol * 0.8; const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
  const bus = c.createGain(), wet = c.createGain(), conv = c.createConvolver(); wet.gain.value = 0.34;
  const len = c.sampleRate * 3.4, ir = c.createBuffer(2, len, c.sampleRate), rr = sndRng(99);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const k = i / len; lp += ((rr() * 2 - 1) - lp) * (0.55 - 0.4 * k); d[i] = lp * Math.pow(1 - k, 2.6) * 1.6 } }
  conv.buffer = ir; bus.connect(master); bus.connect(conv); conv.connect(wet); wet.connect(master); master.connect(comp); comp.connect(c.destination);
  SND.master = master; SND.bus = bus; SND.noise = (() => { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0), q = sndRng(5); for (let i = 0; i < d.length; i++) d[i] = q() * 2 - 1; return b })();
}
function sndOut(pan, gain) { const c = SND.ctx, g = c.createGain(); g.gain.value = gain; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(SND.bus) } else g.connect(SND.bus); return g }
function sndOsc(type, f, t, d, out, det) { const c = SND.ctx, o = c.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.connect(out); o.start(t); o.stop(t + d); return o }

/* voices */
function vPluck(t, m, v, pan) {
  const c = SND.ctx, f = mtof(m), lp = c.createBiquadFilter(), g = sndOut(pan, 0); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3400, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.7); lp.connect(g);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.5, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  sndOsc('triangle', f, t, 2.3, lp); sndOsc('sine', f * 2, t, 1.2, lp, 4);
}
function vBell(t, m, v, pan) {
  const c = SND.ctx, f = mtof(m), g = sndOut(pan, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.34, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  const mod = c.createGain(); mod.gain.setValueAtTime(f * 1.6, t); mod.gain.exponentialRampToValueAtTime(1, t + 1.2); const o = sndOsc('sine', f, t, 3.3, g), mo = c.createOscillator(); mo.frequency.value = f * 3.5; mo.connect(mod); mod.connect(o.frequency); mo.start(t); mo.stop(t + 3.3);
}
function vFlute(t, m, dur, v, pan) {
  const c = SND.ctx, f = mtof(m), g = sndOut(pan, 0), o = sndOsc('sine', f, t, dur + 0.5, g), o2 = sndOsc('sine', f * 2, t, dur + 0.5, g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.22, t + 0.14); g.gain.setValueAtTime(v * 0.2, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.4);
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 4.8; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(7, t + Math.min(dur, 0.9)); lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune); lfo.start(t); lfo.stop(t + dur + 0.5);
  const n = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain(); n.buffer = SND.noise; bp.type = 'bandpass'; bp.frequency.value = f * 2.1; bp.Q.value = 3; ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * 0.05, t + 0.05); ng.gain.linearRampToValueAtTime(0, t + dur + 0.3); n.connect(bp); bp.connect(ng); ng.connect(g); n.start(t, 0, dur + 0.5);
}
function vPad(t, ms, dur, v) {
  const c = SND.ctx; ms.forEach((m, i) => { const f = mtof(m), lp = c.createBiquadFilter(), g = sndOut(i % 2 ? 0.45 : -0.45, 0); lp.type = 'lowpass'; lp.frequency.value = (SND.mood.night ? 520 : 900) + 600 * (SND.d.g - 0.5); lp.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.09, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 1.2); sndOsc('sawtooth', f, t, dur + 1.3, lp, -7); sndOsc('sawtooth', f, t, dur + 1.3, lp, 7) });
}
function vBass(t, m, dur, v) { const g = sndOut(0, 0), lp = SND.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280; lp.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.3, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); sndOsc('sine', mtof(m), t, dur + 0.1, lp); sndOsc('triangle', mtof(m), t, dur + 0.1, lp) }
function vStrings(t, ms, dur, v) {                                          // the cinematic swell: a slow ensemble that opens up and fades
  const c = SND.ctx; ms.forEach((m, i) => { for (const det of [-14, 0, 14]) { const lp = c.createBiquadFilter(), g = sndOut(((i * 0.37) % 1.4) - 0.7, 0); lp.type = 'lowpass'; lp.frequency.setValueAtTime(380, t); lp.frequency.linearRampToValueAtTime(2600, t + dur * 0.55); lp.frequency.linearRampToValueAtTime(900, t + dur + 1.5); lp.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.05, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur + 1.8); sndOsc('sawtooth', mtof(m), t, dur + 2, lp, det) } });
}
function vBrass(t, ms, dur, v) { const c = SND.ctx; ms.forEach(m => { const lp = c.createBiquadFilter(), g = sndOut(0, 0); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1800, t + 0.7); lp.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.06, t + 0.45); g.gain.setValueAtTime(v * 0.05, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 1.6); sndOsc('sawtooth', mtof(m), t, dur + 1.8, lp, -5); sndOsc('square', mtof(m), t, dur + 1.8, lp, 5) }) }
function vTimp(t, v) { const c = SND.ctx, g = sndOut(0, 0), o = sndOsc('sine', 95, t, 1.6, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.35); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 0.7, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  const n = c.createBufferSource(), lp = c.createBiquadFilter(), ng = c.createGain(); n.buffer = SND.noise; lp.type = 'lowpass'; lp.frequency.value = 400; ng.gain.setValueAtTime(v * 0.3, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); n.connect(lp); lp.connect(ng); ng.connect(SND.bus); n.start(t, 0, 0.3) }

/* the bed: scheduled a little ahead of the clock, step by step (eighth notes) */
function sndChord(tr, bar, sc) { const deg = tr.prog[bar % tr.prog.length]; sc = sc || tr.scale; const at = i => { const k = deg + i, oct = Math.floor(k / 7); return tr.root + sc[((k % 7) + 7) % 7] + 12 * oct }; return [at(0), at(2), at(4)] }
function sndSpb(tr) { const D = SND.d; return 60 / tr.bpm / (SND.mood.season === 3 ? 1.12 : 1) / (1 + 0.12 * (D.t - (D.g - 0.5)) ) }     // worry quickens the pulse a little, contentment relaxes it; always eased, never a jump
function sndStep(tr, step, t, rr) {
  const bar = (step / 8) | 0, s8 = step % 8, D = SND.d; if (s8 === 0) SND.sc = D.t > 0.55 ? SND_MODES.soft : tr.scale;       // a worried village leans minor, at a bar line only
  const ch = sndChord(tr, bar, SND.sc), M = SND.mood, spb = sndSpb(tr), calm = M.night ? 0.45 : 1, spring = M.season === 0, summer = M.season === 1, autumn = M.season === 2, winter = M.season === 3, big = SND.swellUntil > SND.ctx.currentTime ? 0.55 : 1;
  if (s8 === 0) { vPad(t, ch.map(m => m + 12), spb * 8, big * (M.night ? 0.7 : 1)); vBass(t, ch[0] - 12, spb * 3.5, big); if (D.t > 0.7) vTimp(t, 0.22 * big); if (SND.pop >= 60 && bar % 4 === 2) vStrings(t, ch.map(m => m + 12), spb * 7, 0.3 * big) }
  if (s8 === 4 && rr() < 0.5 * calm) vBass(t, ch[2] - 12, spb * 2, big * 0.7);
  const p = tr.pluck * calm * (spring ? 1.15 : winter ? 0.5 : 0.9) * big * (0.8 + 0.5 * D.g);
  if (rr() < p * (s8 % 2 === 0 ? 0.9 : 0.45)) { const m = ch[(rr() * 3) | 0] + 12 + (rr() < 0.3 ? 12 : 0); vPluck(t, m, 0.55 + rr() * 0.4, (rr() * 2 - 1) * 0.6) }
  if (winter && s8 % 4 === 2 && rr() < 0.35) vBell(t, ch[(rr() * 3) | 0] + 24, 0.5 + rr() * 0.4, (rr() * 2 - 1) * 0.7);
  if (s8 === 0 && bar % 2 === 1 && !M.night && rr() < tr.lead * (summer ? 1.2 : autumn ? 0.9 : spring ? 0.8 : 0.45) * big * (0.7 + 0.6 * D.g)) {                       // a short phrase, mostly stepwise, long notes
    let k = ((rr() * 5) | 0) + 2, tt = t; const n = 3 + ((rr() * 3) | 0);
    for (let i = 0; i < n; i++) { const m = tr.root + 12 + tr.scale[((k % 7) + 7) % 7] + 12 * Math.floor(k / 7), d = spb * (rr() < 0.4 ? 1 : 2); vFlute(tt, m, d * 0.95, 0.7 + rr() * 0.3, -0.25 + rr() * 0.5); tt += d; k += rr() < 0.5 ? (rr() < 0.5 ? 1 : -1) : (rr() < 0.5 ? 2 : -2) }
  }
}
function sndPump() {
  if (!SND.on || !SND.ctx || !SND.track) return; const c = SND.ctx, tr = SND.track, rr = SND.rr, dt = sndSpb(tr) / 2;
  if (SND.nextT < c.currentTime) SND.nextT = c.currentTime + 0.1;
  while (SND.nextT < c.currentTime + 0.6) { sndStep(tr, SND.step, SND.nextT, rr); SND.step++; SND.nextT += dt }
  while (SND.q.length && SND.q[0].at <= c.currentTime + 0.5) sndPlaySwell(SND.q.shift());
  if (SND.step > tr.len) sndNext(false);
}
function sndPlaySwell(s) {
  const c = SND.ctx, tr = SND.track, t = Math.max(c.currentTime + 0.05, s.at), ch = sndChord(tr, 0), up = ch.map(m => m + 12), minor = s.kind === 'disaster' || s.kind === 'over' || s.kind === 'battle', root = ch[0] + (minor ? 0 : 0);
  const tri = minor ? [root, root + 3, root + 7] : [root, root + 4, root + 7];
  SND.swellUntil = t + (s.kind === 'over' ? 14 : 9);
  if (s.kind === 'founding') { vTimp(t, 0.7); vStrings(t, [...tri.map(m => m + 12), root + 19], 7, 1); vBrass(t + 2.5, [root + 7, root + 12], 3.5, 0.8) }
  else if (s.kind === 'dawn') { vStrings(t, [...tri.map(m => m + 12), root + 24], 8, 1); vBrass(t + 3, [root + 12, root + 19], 4, 0.9); vTimp(t + 3, 0.6) }
  else if (s.kind === 'festival') { vStrings(t, tri.map(m => m + 12), 5.5, 0.85); vBrass(t + 1.8, [root + 12, root + 16], 2.5, 0.7); vTimp(t, 0.35) }
  else if (s.kind === 'relief') { vStrings(t, [...tri.map(m => m + 12), root + 19], 7.5, 0.9); vBell(t + 4, root + 36, 0.7, 0) }
  else if (s.kind === 'disaster') { vTimp(t, 0.9); vStrings(t, tri.map(m => m), 6.5, 0.9); vTimp(t + 2.6, 0.5) }
  else if (s.kind === 'battle') { vTimp(t, 0.85); vTimp(t + 0.5, 0.6); vStrings(t, [root - 12, root, root + 3, root + 7], 6, 0.9); vBrass(t + 1.2, [root + 3, root + 10], 2.5, 0.6) }
  else if (s.kind === 'over') { vTimp(t, 0.8); vStrings(t, [root - 12, root, root + 3, root + 10], 11, 1); vBell(t + 6, root + 24, 0.6, 0) }
}

/* control */
function sndNext(skip) {
  const old = SND.track; if (old && skip) { sndRec(old.seed).skips++; sndSend() } let seed = ((old ? old.seed : (Math.random() * 1e6) | 0) * 2654435761 + 12345 + (skip ? 0 : 7)) >>> 0; seed %= 1000000;
  const tr = SND.track = sndTrack(seed); tr.len = 8 * 4 * (7 + ((sndRng(seed)() * 5) | 0)); SND.step = 0; SND.rr = sndRng(seed + 1); sndRec(seed).plays++; sndSave(); sndUi();
}
function sndSet(on) {
  if (on) { try { if (!SND.ctx) sndGraph(); SND.ctx.resume() } catch (e) { SND.on = false; sndUi(); return } SND.on = true; if (!SND.track) sndNext(false); if (!SND.timer) SND.timer = setInterval(sndPump, 120); SND.nextT = 0; SND.master.gain.cancelScheduledValues(0); SND.master.gain.setTargetAtTime(SND.vol * 0.8, SND.ctx.currentTime, 0.4) }
  else { SND.on = false; if (SND.ctx && SND.master) { SND.master.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.25); setTimeout(() => { if (!SND.on && SND.ctx) SND.ctx.suspend() }, 900) } SND.q = [] }
  try { localStorage.setItem('villagesim.sound', on ? '1' : '0') } catch (e) { } sndUi();
}
function sndVol(v) { SND.vol = v; try { localStorage.setItem(SND_VOL, String(v)) } catch (e) { } if (SND.master && SND.on) SND.master.gain.setTargetAtTime(v * 0.8, SND.ctx.currentTime, 0.1) }
function sndRate(r) { if (!SND.track) return; const x = sndRec(SND.track.seed); x.r = x.r === r ? 0 : r; sndSave(); sndUi(); sndSend() }
function sndSend() {                                                           // opt in only; sends the change since the last time (so counts stay honest without any id); nothing happens unless the player asked and a server is set
  try {
    if (!SND_ENDPOINT || localStorage.getItem(SND_SEND) !== '1' || !SND.track) return; const x = sndRec(SND.track.seed), s = x.s || { r: 0, skips: 0, plays: 0 };
    const up = (x.r === 1 ? 1 : 0) - (s.r === 1 ? 1 : 0), down = (x.r === -1 ? 1 : 0) - (s.r === -1 ? 1 : 0), skips = x.skips - s.skips, plays = Math.min(1, x.plays - (s.plays || 0)); if (!up && !down && !skips && !plays) return;
    fetch(SND_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed: SND.track.seed, up, down, skips, plays }), keepalive: true }).then(r => { if (r.ok) { x.s = { r: x.r, skips: x.skips, plays: x.plays }; sndSave() } }).catch(() => { })
  } catch (e) { }
}
/* Pace rules (Albert): at 30x and 100x the village changes far faster than music can follow, so the mood is held steady and only real trouble (a battle, a disaster, the end) or a new age gets a swell; no swell sooner than a minute after the last one when fast. */
const sndFast = () => typeof speed !== 'undefined' && speed >= 30, sndQuick = () => typeof speed !== 'undefined' && speed >= 10;
const SND_FAST_OK = { disaster: 1, battle: 1, over: 1, dawn: 1 };
function sndSwell(kind, delay) {
  if (!SND.on || !SND.ctx) return; const now = performance.now(), fast = sndFast();
  if (fast && !SND_FAST_OK[kind]) return; if (now - SND.lastSwell < (fast ? 60000 : 20000) && kind !== 'over') return;
  if (SND.q.length > 2 || (SND.swellUntil > SND.ctx.currentTime && kind !== 'over')) return; SND.lastSwell = now; SND.q.push({ kind, at: SND.ctx.currentTime + (delay || 0.2) });
}
function sndMood(w) {                                                          // season and night follow the world slowly, and are simply held when time runs fast
  if (!w) return; const M = SND.mood, now = performance.now(), fast = sndFast(), quick = sndQuick();
  if (w.season !== M.season && (!fast || now - M.seasonAt > 90000) && now - M.seasonAt > (quick ? 30000 : 8000)) { M.season = w.season; M.seasonAt = now }
  const night = quick ? false : w.isNight(); if (night !== M.night && now - M.nightAt > 15000) { M.night = night; M.nightAt = now }
}
function sndDrift(w) {                                                         // the village's state eases the sound: worry (alerts, threats, concerns, hunger) and contentment (mood) move it slowly, over about half a minute
  if (!w) return; let worry = 0; try { worry += Math.min(0.45, ((w.concerns && w.concerns.list) ? w.concerns.list.length : 0) * 0.08); worry += (typeof threatLevel === 'function' ? Math.min(0.4, threatLevel(w) * 0.5) : 0); if (w.war && w.war.alertUntil > w.tick) worry += 0.3; if (w.stock.food < w.pop * 1.2) worry += 0.25 } catch (e) { }
  let m = 0, n = 0; for (const v of w.vills) if (v.alive) { m += v.mood; n++ } const glow = n ? Math.max(0, Math.min(1, m / n / 100)) : 0.5, D = SND.d, k = sndFast() ? 0.02 : 0.05;
  D.t += (Math.min(1, worry) - D.t) * k; D.g += (glow - D.g) * k; SND.pop = w.pop;
}
/* what the village is doing: called with every event of the world, and once a second with the world itself */
function sndEvent(type, text) {
  if (!SND.on) return; if (type === 'era') sndSwell('dawn'); else if (type === 'holiday') sndSwell('festival'); else if (type === 'war') sndSwell('battle'); else if (type === 'regime') sndSwell('disaster');
  else if (type === 'event' && /fire|storm|famine|fever|drought|wolves|collapse/i.test(text || '')) sndSwell('disaster');
  else if (type === 'season' && SND.world && SND.world.season === 0 && SND.world.year === 1 && !SND.relief) { SND.relief = true; sndSwell('relief') }
}
function sndWatch(w) { sndMood(w); sndDrift(w); if (!SND.on) return; if (w.over && !SND.overDone) { SND.overDone = true; sndSwell('over') } if (!w.over) SND.overDone = false }
function sndWorld(w) { SND.world = w; SND.relief = false; SND.overDone = false; w.listeners.push(sndEvent); if (SND.on) sndSwell('founding', 0.8) }

/* the small panel */
function sndUi() {
  const b = document.getElementById('sndBtn'); if (!b) return; b.classList.toggle('on', SND.on); b.title = SND.on ? 'Music is on (M). Click for the track.' : 'Music is off (M)';
  const p = document.getElementById('sndPanel'); if (!p) return; const tr = SND.track, x = tr ? sndRec(tr.seed) : null;
  p.querySelector('#sndName').textContent = tr ? tr.name : 'No track yet'; p.querySelector('#sndOnOff').textContent = SND.on ? 'Turn off' : 'Turn on'; p.querySelector('#sndSub').textContent = tr ? 'track ' + tr.seed + ' · ' + tr.mode + ' · ' + tr.bpm + ' bpm' : 'Music is made as you play';
  p.querySelector('#sndUp').classList.toggle('on', !!x && x.r === 1); p.querySelector('#sndDown').classList.toggle('on', !!x && x.r === -1); p.querySelector('#sndVol').value = Math.round(SND.vol * 100);
}
function sndInit() {
  sndLoad(); try { const v = parseFloat(localStorage.getItem(SND_VOL)); if (v >= 0 && v <= 1) SND.vol = v } catch (e) { }
  const $ = id => document.getElementById(id), b = $('sndBtn'), p = $('sndPanel'); if (!b || !p) return;
  b.onclick = e => { e.stopPropagation(); p.style.display = p.style.display === 'block' ? 'none' : 'block'; sndUi() };
  p.onclick = e => e.stopPropagation(); document.addEventListener('click', () => { p.style.display = 'none' });
  $('sndOnOff').onclick = () => sndSet(!SND.on); $('sndSkip').onclick = () => { if (!SND.on) sndSet(true); else sndNext(true) }; $('sndUp').onclick = () => sndRate(1); $('sndDown').onclick = () => sndRate(-1); $('sndVol').oninput = e => sndVol(e.target.value / 100);
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return; if (e.key.toLowerCase() === 'm') sndSet(!SND.on) });
  if (SND_ENDPOINT) { const s = $('sndShareRow'); if (s) { s.style.display = 'flex'; const cb = $('sndShare'); try { cb.checked = localStorage.getItem(SND_SEND) === '1' } catch (e) { } cb.onchange = () => { try { localStorage.setItem(SND_SEND, cb.checked ? '1' : '0') } catch (e) { } } } }
  setInterval(() => { if (typeof world !== 'undefined' && world) sndWatch(world) }, 1000); sndUi();
}
