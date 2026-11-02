const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r = await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;
    for(let t=0;t<1200*130;t++){w.step(); if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24; if(Object.keys(w.proj.done).length>=3&&w.proj.active)break}
    const R=__sim.R,m=w.of('house')[0]; return {day:w.day,done:Object.keys(w.proj.done),active:w.proj.active&&w.proj.active.type}});
  console.log(JSON.stringify(r));
  for(const id of ['hall','library','bastion','monument']){
    const ok=await p.evaluate(id=>{const w=__sim.world,R=__sim.R;let b=w.of(id)[0];if(!b){const pl=placeBuilding(w,id);if(!pl)return false;pl.have={wood:999,stone:999};pl.prog=pl.time;w.complete(pl);b=w.of(id)[0]}
      R.cam.x=(b.x+b.w/2)*16;R.cam.y=(b.y+b.h/2)*16;R.cam.z=4;return true},id);
    await p.waitForTimeout(400); await p.screenshot({path:`tests/art_${id}.png`,clip:{x:200,y:200,width:700,height:500}});
  }
  await p.evaluate(()=>{const s=document.getElementById('side');const c=document.getElementById('projCard');s.scrollTop=c.getBoundingClientRect().top+s.scrollTop-70});
  await p.waitForTimeout(300); await p.screenshot({path:'tests/art_projcard.png'});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total));
  await b.close();
})();
