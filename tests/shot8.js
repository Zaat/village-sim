const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r=await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;for(let t=0;t<1200*170;t++){w.step();if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24}return {day:w.day,pop:w.vills.length,ruling:w.gov.ruling&&w.gov.ruling.name}});
  console.log(JSON.stringify(r));
  for (const id of ['chronCard','councilCard','groupCard']) { await p.evaluate(id=>{const s=document.getElementById('side'),c=document.getElementById(id);s.scrollTop=c.getBoundingClientRect().top+s.scrollTop-60},id); await p.waitForTimeout(300); await p.screenshot({path:`tests/ui_${id}.png`,clip:{x:1160,y:0,width:340,height:950}}) }
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
