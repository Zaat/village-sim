const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(175);const w=__sim.world;for(let t=0;t<1200*200;t++){w.step()}
    const c=w.vills.find(v=>w.gov.council.some(x=>x.id===v.id&&x.title==='Chief'));__sim.select(c);const R=__sim.R;R.cam.x=c.x*16;R.cam.y=c.y*16;R.cam.z=3});
  await p.waitForTimeout(600); await p.screenshot({path:'tests/ui_char.png',clip:{x:1160,y:0,width:340,height:950}});
  await p.click('#tabbar [data-tab="society"]'); await p.waitForTimeout(500); await p.screenshot({path:'tests/ui_regime.png',clip:{x:1160,y:0,width:340,height:950}});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
