const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate((s)=>{localStorage.clear();__sim.newWorld(s);__sim.setSpeed(1)}, 132475851);
  for(let k=1;k<=12;k++){const r=await p.evaluate((t)=>{const w=__sim.world;const t0=performance.now(),n=w.tick;while(w.day<t)w.step();return {day:w.day,ms:(performance.now()-t0)/(w.tick-n),pop:w.vills.length,settings:JSON.stringify(w.settings).slice(0,200)}},k*16);console.log(JSON.stringify(r))}
  await b.close();
})();
