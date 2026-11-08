const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r=await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;for(let t=0;t<1200*150;t++){w.step();if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24;if(w.of('plaza').length&&w.of('tavern').length&&w.tod>0.57&&w.tod<0.6&&t>1200*60)break}
    return {day:w.day,tod:w.tod,plaza:w.of('plaza').length,tavern:w.of('tavern').length,labels:w.vills.filter(v=>v.jobKind==='fire').map(v=>v.label).slice(0,8)}});
  console.log(JSON.stringify(r));
  await p.evaluate(()=>{const w=__sim.world,R=__sim.R,b=w.of('plaza')[0],t=w.of('tavern')[0];R.cam.x=(b.x+(t?t.x+1.5:b.x+2.5))*8;R.cam.y=(b.y+2.5)*16;R.cam.z=3.2;__sim.setSpeed(1)});
  await p.waitForTimeout(2500); await p.screenshot({path:'tests/art_plaza.png',clip:{x:150,y:100,width:860,height:620}});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
