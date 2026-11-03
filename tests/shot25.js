const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate(()=>{localStorage.clear();__sim.newWorld(31);__sim.setSpeed(0)});
  await p.evaluate(()=>{const w=__sim.world;for(let t=0;t<1200*60;t++)w.step();
    const ids=Object.keys(TECHS).filter(i=>TECHS[i].age<=5);for(const id of ids)w.tech.known[id]=w.day;
    const hs=w.houses();hs.forEach((h,i)=>{h.style=[3,4,5,2,3,4,5,1][i%8];restyle(w,h)});
    for(let i=0;i<w.road.length;i++)if(w.road[i]){w.road[i]=[1,2,3,4][(i>>3)%4]}
    R.terrKey='';__sim.select(null);R.cam.z=3;const h=hs[0];R.cam.x=(h.x+4)*CFG.T;R.cam.y=(h.y+2)*CFG.T});
  await p.waitForTimeout(700); await p.screenshot({path:'tests/art_ages.png'});
  await p.click('#tabbar button[data-tab=progress]'); await p.waitForTimeout(400); await p.click('[data-br=mind]'); await p.waitForTimeout(300); await p.screenshot({path:'tests/art_ages_panel.png',clip:{x:1160,y:0,width:340,height:1000}});
  console.log('errors',errs,'world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
