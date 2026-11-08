const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r=await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;for(let t=0;t<1200*100;t++){w.step();if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24}
    return {day:w.day,found:w.neigh.map(n=>n.found),dims:[CFG.W,CFG.H]}});
  console.log(JSON.stringify(r));
  await p.evaluate(()=>{const w=__sim.world,R=__sim.R;R.cam.z=0.5;R.cam.x=CFG.W*8;R.cam.y=CFG.H*8;__sim.setSpeed(0)}); await p.waitForTimeout(600); await p.screenshot({path:'tests/art_fog_overview.png'});
  for (const i of [0,1]) { await p.evaluate(i=>{const w=__sim.world,R=__sim.R,n=w.neigh[i];R.cam.x=n.x*16;R.cam.y=n.y*16;R.cam.z=2.6},i); await p.waitForTimeout(500); await p.screenshot({path:`tests/art_neigh${i}.png`,clip:{x:100,y:80,width:900,height:700}}) }
  await p.evaluate(()=>{const s=document.getElementById('side'),c=document.getElementById('neighCard');s.scrollTop=c.getBoundingClientRect().top+s.scrollTop-70}); await p.waitForTimeout(300); await p.screenshot({path:'tests/ui_neigh.png',clip:{x:1160,y:0,width:340,height:950}});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
