const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;for(let d=1;d<=70;d++){for(let t=0;t<1200;t++){w.step();if(d===24&&t===0)for(const id of Object.keys(TECHS))w.tech.known[id]=24}}
    for(const n of w.neigh){n.found=true;n.met=true;n.rel=30;n.pact=1}w.stock.wood=400;w.stock.stone=200;w.econ.treasury=120;
    for(let d=0;d<40;d++){w.stock.wood=Math.max(w.stock.wood,300);for(let t=0;t<1200;t++)w.step()}
    const dk=w.of('dock')[0];dk.tier=3;const R=__sim.R;R.cam.x=(dk.x+1)*16;R.cam.y=(dk.y+1)*16;R.cam.z=3;
    const T=w.trade2;T.yard.push({kind:'cargo',dock:dk.id,at:w.day});yardDay(w,T);__sim.select(dk)});
  await p.waitForTimeout(600); await p.screenshot({path:'tests/art_harbour.png',clip:{x:150,y:100,width:860,height:620}});
  await p.click('#tabbar [data-tab="progress"]'); await p.waitForTimeout(400); await p.evaluate(()=>{document.getElementById('side').scrollTop=document.getElementById('harbourBox').offsetTop-80}); await p.waitForTimeout(300);
  await p.screenshot({path:'tests/ui_harbour.png',clip:{x:1160,y:0,width:340,height:950}});
  await p.click('#tabbar [data-tab="society"]'); await p.waitForTimeout(400); await p.evaluate(()=>{document.getElementById('side').scrollTop=document.getElementById('councilCard').offsetTop-60}); await p.waitForTimeout(300);
  await p.screenshot({path:'tests/ui_council2.png',clip:{x:1160,y:0,width:340,height:950}});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
