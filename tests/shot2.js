const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(2024);});
  await p.evaluate(()=>{const w=__sim.world; for(let i=0;i<130*1200;i++){ w.step(); if(w.tick>75*1200 && w.festival && w.tod>0.6 && w.tod<0.66) break; }});
  await p.evaluate(()=>{const w=__sim.world,R=__sim.R;R.cam.z=2.2;R.cam.x=(w.cx+1)*16;R.cam.y=(w.cy+1)*16;});
  await p.waitForTimeout(500);
  await p.evaluate(()=>{document.getElementById('side').scrollTop=document.getElementById('councilCard').getBoundingClientRect().top-80+document.getElementById('side').scrollTop});
  await p.waitForTimeout(300);
  await p.screenshot({path:'tests/p3_society.png'});
  console.log('holiday:',await p.evaluate(()=>__sim.world.holiday+' day '+__sim.world.day+' groups '+__sim.world.groups.length+' council '+__sim.world.gov.council.length),'errors',errs);
  await b.close();
})();
