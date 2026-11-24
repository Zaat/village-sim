// README time-lapse: node tools/make-gif.js [seed] [map] [out.gif]
// Grows one village for five years, takes a frame every four days at a fixed camera, and builds a looping GIF with ffmpeg.
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const seed = +process.argv[2] || 777, map = process.argv[3] || 'lakeland', out = process.argv[4] || 'docs/village-timelapse.gif';
(async () => {
  const dir = '/tmp/gif-frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
  await p.goto('file://' + path.resolve('index.html')); await p.evaluate(() => { localStorage.clear() }); await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(([s, m]) => { newWorld(s, { type: m, size: 'standard' }); __sim.setSpeed(0) }, [seed, map]);
  const N = 44;
  for (let f = 0; f < N; f++) {
    await p.evaluate(() => { for (let i = 0; i < 1200 * 4; i++) world.step(); R.cam.x = world.cx * CFG.T; R.cam.y = world.cy * CFG.T; R.cam.z = 1.25; updateUI() });
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${dir}/f${String(f).padStart(3, '0')}.png` });
  }
  await b.close();
  execSync(`ffmpeg -y -loglevel error -framerate 6 -i ${dir}/f%03d.png -vf "scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" -loop 0 ${out}`);
  console.log(out, (fs.statSync(out).size / 1024 | 0) + ' KB');
})();
