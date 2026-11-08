const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;for(let t=0;t<1200*110;t++){w.step();if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24}
    const hs=w.houses();const a=hs[0],c=hs[1];a.hp=a.maxHp*0.3;c.hp=c.maxHp*0.55;const R=__sim.R;R.cam.x=(a.x+3)*16;R.cam.y=(a.y+1)*16;R.cam.z=3.4;__sim.select(a)});
  await p.waitForTimeout(700); await p.screenshot({path:'tests/ui_bld1.png'});
  await p.evaluate(()=>{const w=__sim.world;const t=w.of('plaza')[0]||w.of('store')[0];__sim.select(t);const R=__sim.R;R.cam.x=(t.x+t.w/2)*16;R.cam.y=(t.y+t.h/2)*16});
  await p.waitForTimeout(500); await p.screenshot({path:'tests/ui_bld2.png',clip:{x:1160,y:0,width:340,height:600}});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
