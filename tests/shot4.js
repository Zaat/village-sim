const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>{ localStorage.clear(); });
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;for(let t=0;t<1200*100;t++){w.step(); if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24;}});
  const look=async(name,sel,z)=>{ const ok=await p.evaluate(([sel,z])=>{const w=__sim.world,R=__sim.R;let b;
      if(sel==='boat'){const bt=w.boats.find(x=>x.state==='out')||w.boats[0];if(!bt)return false;R.cam.x=bt.x*16;R.cam.y=bt.y*16;}
      else {b=w.of(sel)[0]; if(!b)return false; R.cam.x=(b.x+1)*16;R.cam.y=(b.y+1)*16;} R.cam.z=z; return true},[sel,z]);
    if(!ok){console.log(name,'none built');return} await p.waitForTimeout(350); await p.screenshot({path:`tests/art_${name}.png`}); console.log(name,'captured'); };
  await look('dock','dock',3.5); await look('logcamp','logcamp',3.5); await look('minecamp','minecamp',3.5); await look('lodge','lodge',3.5);
  await p.evaluate(()=>{const w=__sim.world,R=__sim.R;R.cam.x=(w.cx+3)*16;R.cam.y=(w.cy+4)*16;R.cam.z=2.6}); await p.waitForTimeout(400);
  await p.evaluate(()=>{const s=document.getElementById('side');s.scrollTop=document.getElementById('techCard').getBoundingClientRect().top+s.scrollTop-60});
  await p.waitForTimeout(300); await p.screenshot({path:'tests/art_town.png'});
  console.log('errors:',errs, '| world errors:', await p.evaluate(()=>__sim.world.dbg.total));
  await b.close();
})();
