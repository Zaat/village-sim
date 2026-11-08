const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push('PAGE: '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text())});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);__sim.run(1200*20+300)});   // autumn, day 21
  // spawn wolves near camp to see the reaction
  await p.evaluate(()=>{const w=__sim.world;for(let k=0;k<3;k++){const a=new Animal(w,'wolf',w.cx+12+k,w.cy+6);w.animals.push(a)}__sim.run(160);
    const R=__sim.R;R.cam.z=3;R.cam.x=(w.cx+6)*16;R.cam.y=(w.cy+3)*16});
  await p.waitForTimeout(300);
  // click on a villager
  const pos = await p.evaluate(()=>{const w=__sim.world,R=__sim.R,c=R.cam,z=c.z;const r=document.getElementById('cv').getBoundingClientRect();
    const v=w.vills.filter(v=>Math.abs(v.x*16-c.x)<R.vw/(2*z)-40&&Math.abs(v.y*16-c.y)<R.vh/(2*z)-40)[0]; if(!v)return null;
    return {x:r.left+(v.x*16-(c.x-R.vw/(2*z)))*z, y:r.top+(v.y*16-6-(c.y-R.vh/(2*z)))*z, name:v.name}});
  console.log('click target',pos);
  if(pos){await p.mouse.click(pos.x,pos.y);} await p.waitForTimeout(500);
  await p.screenshot({path:'tests/u1_selected.png'});
  console.log('inspector:',(await p.innerText('#sel')).replace(/\n/g,' | ').slice(0,300));
  // frame-rate check at 10x and 30x with current population
  for(const sp of [10,30]){
    const r=await p.evaluate(async sp=>{__sim.setSpeed(sp);const w=__sim.world;const t0=w.tick;let f=0;const s=performance.now();await new Promise(res=>{function tick(){f++;if(performance.now()-s>3000)res();else requestAnimationFrame(tick)}tick()});return {fps:f/3,ticksPerSec:(w.tick-t0)/3,pop:w.vills.length}},sp);
    console.log('speed',sp,JSON.stringify(r));
  }
  // zoomed out whole-map view
  await p.evaluate(()=>{__sim.setSpeed(0);const R=__sim.R;R.cam.z=0.5;R.cam.x=80*16;R.cam.y=56*16});
  await p.waitForTimeout(300); await p.screenshot({path:'tests/u2_overview.png'});
  console.log('errors:',errs);
  await b.close();
})();
