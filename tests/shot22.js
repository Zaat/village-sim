const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs=[];
  for (const [w,h] of [[1500,900],[900,760],[600,700]]) {
    const p = await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(700);
    await p.evaluate(()=>{localStorage.clear();__sim.newWorld(5);__sim.setSpeed(10)}); await p.waitForTimeout(800);
    if (w===1500) { await p.click('#spUp'); await p.waitForTimeout(200); await p.click('#playBtn'); await p.click('#stepBtn'); await p.waitForTimeout(1500);
      console.log(await p.evaluate(()=>({speed:document.getElementById('spLabel').textContent,day:__sim.world.day,play:document.getElementById('playBtn').textContent}))); }
    await p.screenshot({path:`tests/ui_ctl_${w}.png`,clip:{x:0,y:0,width:Math.min(w,1200),height:120}});
    console.log(w, await p.evaluate(()=>{const r=document.getElementById('ctl').getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}));
    await p.close(); }
  console.log('errors',errs); await b.close() })();
