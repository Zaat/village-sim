const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push('PAGE: '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text())});
  await p.goto('file:///home/claude/village-sim/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(12345);__sim.run(1200*14+700)});   // day 15, late afternoon summer
  await p.waitForTimeout(400);
  await p.screenshot({path:'tests/s1_summer.png'});
  await p.evaluate(()=>{__sim.run(1200*10+100)});   // autumn-ish
  await p.evaluate(()=>{const w=__sim.world;__sim.R.cam.z=4;__sim.R.cam.x=(w.cx+1)*16;__sim.R.cam.y=(w.cy+2)*16});
  await p.waitForTimeout(300); await p.screenshot({path:'tests/s2_autumn_zoom.png'});
  await p.evaluate(()=>{__sim.run(1200*8-200)});   // winter
  await p.evaluate(()=>{const w=__sim.world;__sim.R.cam.z=2;__sim.R.cam.x=(w.cx+1)*16;__sim.R.cam.y=(w.cy+2)*16; const v=w.vills[1]; document.getElementById('cv').dispatchEvent(new Event('x'))});
  await p.waitForTimeout(300); await p.screenshot({path:'tests/s3_winter.png'});
  console.log('errors:',errs);
  console.log(await p.evaluate(()=>{const w=__sim.world;return JSON.stringify({day:w.day,pop:w.vills.length,season:w.season,stock:w.stock,fps:0})}));
  await b.close();
})();
