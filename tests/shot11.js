const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r=await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;let seen=false;for(let t=0;t<1200*130;t++){w.step();if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24;if(w.visit&&w.visit.type!=='aid'&&w.tod>0.1&&w.tod<0.5&&t>1200*60){seen=true;break}}
    return {day:w.day,visit:w.visit&&w.visit.type,seen,rel:w.neigh.map(n=>Math.round(n.rel))}});
  console.log(JSON.stringify(r));
  await p.evaluate(()=>{const w=__sim.world,R=__sim.R,d=w.of('dock')[0],bt=w.boats.find(x=>x.dock===d.id);R.cam.x=(bt.mx+d.dir[0]*2)*16;R.cam.y=(bt.my+d.dir[1]*2)*16;R.cam.z=3.2;__sim.setSpeed(1)});
  await p.waitForTimeout(1500); await p.screenshot({path:'tests/art_visit.png',clip:{x:100,y:100,width:900,height:650}});
  await p.evaluate(()=>{const s=document.getElementById('side'),c=document.getElementById('neighCard');s.scrollTop=c.getBoundingClientRect().top+s.scrollTop-70}); await p.waitForTimeout(300); await p.screenshot({path:'tests/ui_neigh2.png',clip:{x:1160,y:0,width:340,height:950}});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
