const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate(()=>{localStorage.clear();__sim.newWorld(777);__sim.setSpeed(1)});
  await p.evaluate(()=>{const w=__sim.world;while(w.day<75)w.step();const pl=planOutpost(w);sendSettlers(w,pl);w.out.nextPlan=1e9});
  await p.evaluate(()=>{const w=__sim.world;const o=w.out.list[0];const T=CFG.T;R.cam.x=(w.cx+o.x)/2*T;R.cam.y=(w.cy+o.y)/2*T;R.cam.z=2});
  await p.waitForTimeout(800); await p.screenshot({path:'tests/art_out_travel.png'});
  await p.evaluate(()=>{const w=__sim.world;while(w.day<190)w.step();const o=w.out.list[0];const T=CFG.T;__sim.select&&0;R.cam.x=o.x*T+8;R.cam.y=o.y*T+8;R.cam.z=3});
  await p.evaluate(()=>{const w=__sim.world;__sim.select(w.out.list[0])});
  await p.click('#tabbar button[data-tab=world]'); await p.waitForTimeout(800); await p.screenshot({path:'tests/art_out_town.png'});
  console.log('outposts',await p.evaluate(()=>JSON.stringify(__sim.world.out.list.map(o=>[o.name,o.role,o.state,o.stage,o.pop]))),'errors',errs,'world errors',await p.evaluate(()=>__sim.world.dbg.total));
  await b.close();
})();
