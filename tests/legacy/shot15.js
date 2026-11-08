const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r = await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;for(let t=0;t<1200*110;t++){w.step();if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24;if(w.of('plaza').length&&w.of('tavern').length&&w.tod>0.55&&w.tod<0.6&&w.day>100)break}
    const pl=w.of('plaza')[0],R=__sim.R;R.cam.x=(pl.x+2.5)*16;R.cam.y=(pl.y+2.5)*16;R.cam.z=4;return {day:w.day,tod:w.tod,pop:w.vills.length,nearPlaza:w.vills.filter(v=>Math.hypot(v.x-pl.x,v.y-pl.y)<6).length}});
  console.log(JSON.stringify(r)); await p.evaluate(()=>__sim.setSpeed(1)); await p.waitForTimeout(2500);
  await p.screenshot({path:'tests/art_crowd.png',clip:{x:150,y:100,width:860,height:620}});
  // key 5 runs flat out
  const t0=await p.evaluate(()=>__sim.world.tick); await p.keyboard.press('5'); await p.waitForTimeout(3000); const t1=await p.evaluate(()=>__sim.world.tick);
  console.log('ticks in 3s at key 5:',t1-t0,'(= '+((t1-t0)/3/20).toFixed(0)+'x)');
  await p.keyboard.press('3'); await p.waitForTimeout(1500);
  console.log('render ms',await p.evaluate(()=>DBG.renderMs.toFixed(2)),'frame ms',await p.evaluate(()=>DBG.frameMs.toFixed(2)));
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
