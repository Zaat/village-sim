const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  const seed = +process.argv[2] || 0, season = +process.argv[3] || 1, out = process.argv[4] || '/tmp/track.wav';
  const r = await p.evaluate(async ([seed, season]) => {
    const SR = 44100, LEN = SR * 60; window.AudioContext = function () { return new OfflineAudioContext(2, LEN, SR) };
    sndGraph(); SND.on = true; SND.track = sndTrack(seed || 1234); const tr = SND.track; SND.rr = sndRng(seed + 1); SND.mood.season = season; SND.mood.night = false;
    const spb = 60 / tr.bpm / (season === 3 ? 1.12 : 1), dt = spb / 2; let t = 0.2, step = 0; while (t < 52) { sndStep(tr, step, t, SND.rr); step++; t += dt }
    sndPlaySwell({ kind: 'dawn', at: 24 }); SND.swellUntil = 0;
    const buf = await SND.ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1); let peak = 0, sum = 0; for (let i = 0; i < L.length; i++) { const a = Math.abs(L[i]); if (a > peak) peak = a; sum += L[i] * L[i] }
    const n = L.length, ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }; w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    const g = 0.9 / Math.max(peak, 0.01); for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * g)) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * g)) * 32767, true) }
    let bin = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return { name: tr.name, mode: tr.mode, bpm: tr.bpm, peak, rms: Math.sqrt(sum / n), b64: btoa(bin) };
  }, [seed, season]);
  fs.writeFileSync(out, Buffer.from(r.b64, 'base64')); console.log(r.name, r.mode, r.bpm, 'peak', r.peak.toFixed(3), 'rms', r.rms.toFixed(4), fs.statSync(out).size); await b.close();
})();
