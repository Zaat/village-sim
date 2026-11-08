const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const found=await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;let landDay=-1,seaDay=-1;
    for(let t=0;t<1200*220;t++){w.step(); if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24;
      const c=w.econ.caravan; if(c&&!c.sea&&landDay<0&&w.of('market').length&&w.tod>0.2){landDay=w.day;window.__land=true; break} }
    return {landDay,day:w.day,markets:w.of('market').length,pop:w.vills.length}});
  console.log('land caravan:',JSON.stringify(found));
  await p.evaluate(()=>{const w=__sim.world,R=__sim.R,m=w.of('market')[0];R.cam.x=(m.x+1.5)*16;R.cam.y=(m.y+1)*16;R.cam.z=4});
  await p.waitForTimeout(500); await p.screenshot({path:'tests/art_market.png'});
  await p.evaluate(()=>{const s=document.getElementById('side');const c=document.getElementById('econCard');s.scrollTop=c.getBoundingClientRect().top+s.scrollTop-70});
  await p.waitForTimeout(300); await p.screenshot({path:'tests/art_econ.png'});
  const sea=await p.evaluate(()=>{const w=__sim.world;for(let t=0;t<1200*140;t++){w.step(); const c=w.econ.caravan; if(c&&c.sea&&w.tod>0.2&&w.tod<0.5)return {day:w.day}} return null});
  console.log('sea caravan:',JSON.stringify(sea));
  if(sea){await p.evaluate(()=>{const w=__sim.world,R=__sim.R,d=w.of('dock')[0],bt=w.boats.find(x=>x.dock===d.id);R.cam.x=(bt.mx+d.dir[0]*2)*16;R.cam.y=(bt.my+d.dir[1]*2)*16;R.cam.z=3.5});await p.waitForTimeout(500);await p.screenshot({path:'tests/art_ship.png'})}
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total));
  await b.close();
})();
